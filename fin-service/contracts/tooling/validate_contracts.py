"""Validate FINN schemas, OpenAPI, and independent synthetic boundary cases.

No network calls, cache files, applications, provider credentials, or real prices.
The CLI prints summaries only. Import validate_instance for adapter contract tests.
"""

from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import date, datetime
from decimal import Decimal
import json
from pathlib import Path
import re
import sys
from urllib.parse import parse_qsl, urlsplit

sys.dont_write_bytecode = True

from jsonschema import Draft202012Validator, FormatChecker
from openapi_spec_validator import validate as validate_openapi
from rfc3986_validator import validate_rfc3986

from build_contracts import CONTRACT_ROOT, definitions, openapi_refs, public_api_document, schema_document


FORMATS = FormatChecker()


@FORMATS.checks("uri")
def valid_uri(value):
    return not isinstance(value, str) or bool(validate_rfc3986(value, rule="URI"))


@FORMATS.checks("date", raises=(ValueError, TypeError))
def valid_date(value):
    return not isinstance(value, str) or (len(value) == 10 and date.fromisoformat(value) is not None)


@FORMATS.checks("date-time", raises=(ValueError, TypeError))
def valid_instant(value):
    if not isinstance(value, str):
        return True
    return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?Z", value)) and datetime.fromisoformat(value).tzinfo is not None


def instant(value):
    return datetime.fromisoformat(value) if value is not None else None


def semantic_errors(definition: str, value: dict) -> list[str]:
    """Cross-field/domain checks JSON Schema intentionally cannot express alone."""
    errors = []
    identities = {}

    def fail(code):
        if code not in errors:
            errors.append(code)

    def walk(node):
        if isinstance(node, list):
            for child in node:
                walk(child)
            return
        if not isinstance(node, dict):
            return
        if {"listingId", "securityId", "exchange", "symbol"} <= node.keys():
            previous = identities.setdefault(node["listingId"], node)
            if previous != node:
                fail("LISTING_IDENTITY_COLLISION")
        if {"state", "evaluatedAt", "expectedSessionDate", "latestSessionDate"} <= node.keys():
            expected, latest = node["expectedSessionDate"], node["latestSessionDate"]
            if node["state"] == "FRESH" and (expected is None or expected != latest):
                fail("FRESHNESS_NOT_ESTABLISHED")
            if node["state"] == "STALE" and (expected is None or latest is None or latest >= expected):
                fail("STALE_SESSION_MISMATCH")
        if {"observedAt", "firstSeenAt", "unknownTimeReasons"} <= node.keys():
            reasons = {
                "observedAt": "OBSERVATION_TIME_NOT_PROVIDED",
                "publishedAt": "PUBLICATION_TIME_NOT_PROVIDED",
                "providerAvailableAt": "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED",
                "ingestedAt": "NOT_YET_INGESTED", "acceptedAt": "NOT_YET_ACCEPTED",
            }
            wanted = {reason for field, reason in reasons.items() if node[field] is None}
            if len(node["unknownTimeReasons"]) != len(set(node["unknownTimeReasons"])) or set(node["unknownTimeReasons"]) != wanted:
                fail("UNKNOWN_TIME_REASON_MISMATCH")
            seen = instant(node["firstSeenAt"])
            for field in ("observedAt", "publishedAt", "providerAvailableAt"):
                if node[field] is not None and instant(node[field]) > seen:
                    fail("SOURCE_TIME_AFTER_FIRST_SEEN")
            ingested, accepted = instant(node["ingestedAt"]), instant(node["acceptedAt"])
            if ingested is not None and ingested < seen:
                fail("PROCESSING_TIME_ORDER")
            if accepted is not None and (ingested is None or accepted < ingested):
                fail("PROCESSING_TIME_ORDER")
        if {"mode", "reviewStatus", "reviewedAt", "publicDisplayAllowed"} <= node.keys():
            if node["reviewStatus"] == "VERIFIED" and node["reviewedAt"] is None:
                fail("RIGHTS_REVIEW_TIME_MISSING")
        if {"observationId", "close", "basis", "provenance"} <= node.keys():
            low = Decimal(node["low"]) if node["low"] is not None else None
            high = Decimal(node["high"]) if node["high"] is not None else None
            if low is not None and high is not None and low > high:
                fail("OHLC_ORDER")
            for field in ("open", "close"):
                price = Decimal(node[field]) if node[field] is not None else None
                if price is not None and ((low is not None and price < low) or (high is not None and price > high)):
                    fail("OHLC_RANGE")
            if (node["adjustedClose"] is None) != (node["basis"]["adjustedClose"] is None):
                fail("ADJUSTED_PRICE_BASIS_MISMATCH")
            provenance = node["provenance"]
            if provenance["rights"]["mode"] == "SYNTHETIC_PUBLIC_DEMO" and provenance["provider"] != "SYNTHETIC":
                fail("REAL_SOURCE_IN_SYNTHETIC_MODE")
            if provenance["provider"] in ("NSE_EOD_FILE", "BSE_EOD_FILE"):
                required_exchange = "NSE" if provenance["provider"] == "NSE_EOD_FILE" else "BSE"
                if node["listing"]["exchange"] != required_exchange:
                    fail("SOURCE_EXCHANGE_MISMATCH")
                if provenance["artifactSha256"] is None:
                    fail("FILE_CHECKSUM_MISSING")
            locator = provenance["sourceLocator"]
            if locator is not None:
                parts = urlsplit(locator)
                if parts.scheme not in ("https", "urn") or parts.username or parts.password:
                    fail("UNSAFE_SOURCE_LOCATOR")
                if any(any(secret in key.lower() for secret in ("token", "secret", "signature", "credential", "password"))
                       for key, _ in parse_qsl(parts.query)):
                    fail("UNSAFE_SOURCE_LOCATOR")
        if {"capabilities", "adapterVersion", "rights", "evaluatedAt"} <= node.keys():
            names = [item["capability"] for item in node["capabilities"]]
            expected = set(definitions()["Capability"]["properties"]["capability"]["enum"])
            if len(names) != len(set(names)) or set(names) != expected:
                fail("CAPABILITY_SET_MISMATCH")
            if node["rights"]["mode"] == "SYNTHETIC_PUBLIC_DEMO" and node["provider"] != "SYNTHETIC":
                fail("REAL_SOURCE_IN_SYNTHETIC_MODE")
        if {"health", "checkedAt", "lastSuccessfulAcquisitionAt", "capabilities"} <= node.keys():
            if node["provider"] != node["capabilities"]["provider"]:
                fail("PROVIDER_IDENTITY_MISMATCH")
            success = instant(node["lastSuccessfulAcquisitionAt"])
            if success is not None and success > instant(node["checkedAt"]):
                fail("HEALTH_TIME_ORDER")
            if node["health"] == "HEALTHY" and success is None:
                fail("HEALTH_WITHOUT_SUCCESS")
        for child in node.values():
            walk(child)

    walk(value)

    def check_observations(items, listing):
        keys = set()
        for item in items:
            if item["listing"] != listing:
                fail("LISTING_IDENTITY_MISMATCH")
            key = (item["listing"]["listingId"], item["sessionDate"], item["interval"], item["basis"]["ohlcPrice"])
            if key in keys:
                fail("DUPLICATE_OBSERVATION")
            keys.add(key)

    if definition == "AcquisitionEnvelope":
        if instant(value["completedAt"]) < instant(value["requestedAt"]):
            fail("ACQUISITION_TIME_ORDER")
        success = sum(item["availability"] == "AVAILABLE" for item in value["results"])
        expected = "COMPLETE" if success == len(value["results"]) else "UNAVAILABLE" if success == 0 else "PARTIAL"
        if value["outcome"] != expected:
            fail("ENVELOPE_OUTCOME_MISMATCH")
        ids = [item["listing"]["listingId"] for item in value["results"]]
        if len(ids) != len(set(ids)):
            fail("DUPLICATE_LISTING_RESULT")
        for result in value["results"]:
            check_observations(result["observations"], result["listing"])
            for observation in result["observations"]:
                if observation["provenance"]["provider"] != value["provider"]:
                    fail("PROVIDER_IDENTITY_MISMATCH")
                if observation["provenance"]["adapterVersion"] != value["adapterVersion"]:
                    fail("ADAPTER_VERSION_MISMATCH")
                if instant(observation["provenance"]["times"]["firstSeenAt"]) > instant(value["completedAt"]):
                    fail("ACQUISITION_TIME_ORDER")
    elif definition == "QuoteResponse":
        observation = value["observation"]
        if observation is not None:
            check_observations([observation], value["listing"])
            if value["freshness"]["latestSessionDate"] != observation["sessionDate"]:
                fail("FRESHNESS_OBSERVATION_MISMATCH")
        elif value["freshness"]["latestSessionDate"] is not None or value["freshness"]["state"] not in ("UNKNOWN", "NOT_APPLICABLE"):
            fail("UNAVAILABLE_QUOTE_HAS_FRESHNESS")
    elif definition == "HistoryResponse":
        items, coverage = value["items"], value["coverage"]
        if value["from"] >= value["toExclusive"]:
            fail("INVALID_DATE_RANGE")
        if bool(items) != (value["availability"] == "AVAILABLE"):
            fail("HISTORY_AVAILABILITY_MISMATCH")
        check_observations(items, value["listing"])
        dates = [item["sessionDate"] for item in items]
        if dates != sorted(dates):
            fail("HISTORY_ORDER")
        if any(not value["from"] <= day < value["toExclusive"] for day in dates + coverage["missingSessions"]):
            fail("HISTORY_DATE_OUT_OF_RANGE")
        if any(item["basis"]["ohlcPrice"] != value["requestedBasis"] for item in items):
            fail("HISTORY_BASIS_MISMATCH")
        if coverage["availableSessions"] < len(items):
            fail("HISTORY_COVERAGE_COUNT")
        if len(set(coverage["missingSessions"])) != len(coverage["missingSessions"]) or set(dates) & set(coverage["missingSessions"]):
            fail("HISTORY_MISSING_SESSION_MISMATCH")
        if coverage["state"] == "COMPLETE" and (coverage["expectedSessions"] is None or coverage["expectedSessions"] != coverage["availableSessions"] or coverage["missingSessions"]):
            fail("HISTORY_COVERAGE_NOT_ESTABLISHED")
        if coverage["state"] == "NONE" and (coverage["availableSessions"] != 0 or items):
            fail("HISTORY_COVERAGE_COUNT")
    elif definition == "AsyncJobStatus":
        created, updated = instant(value["createdAt"]), instant(value["updatedAt"])
        started, finished = instant(value["startedAt"]), instant(value["finishedAt"])
        if updated < created or (started is not None and not created <= started <= updated) or (finished is not None and not created <= finished <= updated) or (started is not None and finished is not None and finished < started):
            fail("JOB_TIME_ORDER")
    elif definition == "Problem":
        expected = {"MALFORMED_REQUEST": 400, "AUTHENTICATION_REQUIRED": 401,
                    "RESOURCE_NOT_FOUND": 404, "OPERATION_FORBIDDEN": 403,
                    "VALIDATION_FAILED": 422, "CONFLICT": 409, "RATE_LIMITED": 429,
                    "DATA_SOURCE_UNAVAILABLE": 503, "INTERNAL_ERROR": 500}
        if value["status"] != expected[value["code"]]:
            fail("PROBLEM_STATUS_CODE_MISMATCH")
        if value["code"] == "VALIDATION_FAILED" and not value.get("errors"):
            fail("VALIDATION_FIELDS_MISSING")
    return errors


def validate_instance(definition: str, value: dict, schema: dict | None = None) -> list[str]:
    schema = schema or schema_document()
    if definition not in schema["$defs"]:
        raise ValueError(f"Unknown definition: {definition}")
    selection = {"$schema": schema["$schema"], "$ref": f"#/$defs/{definition}", "$defs": schema["$defs"]}
    issues = list(Draft202012Validator(selection, format_checker=FORMATS).iter_errors(value))
    if issues:
        return ["SCHEMA_INVALID"]
    return semantic_errors(definition, value)


def apply_mutations(value, changes):
    value = deepcopy(value)
    for change in changes:
        target = value
        for segment in change["path"][:-1]:
            target = target[segment]
        key = change["path"][-1]
        if change.get("remove"):
            del target[key]
        else:
            target[key] = deepcopy(change["value"])
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--instance", type=Path, help="Validate an external local JSON instance without printing its content.")
    parser.add_argument("--definition", default="AcquisitionEnvelope")
    args = parser.parse_args()
    schema = json.loads((CONTRACT_ROOT / "market-data.schema.json").read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    if args.instance:
        issues = validate_instance(args.definition, json.loads(args.instance.read_text(encoding="utf-8")), schema)
        print("Instance: " + (", ".join(issues) if issues else "valid"))
        return int(bool(issues))
    actual_openapi = json.loads((CONTRACT_ROOT / "public-api/openapi.json").read_text(encoding="utf-8"))
    if schema != schema_document() or actual_openapi != public_api_document():
        raise SystemExit("Contract projection drift; run build_contracts.py --write and review the diff.")
    validate_openapi(actual_openapi)
    if actual_openapi["components"]["schemas"] != openapi_refs(schema["$defs"]):
        raise SystemExit("OpenAPI schema projection drift.")
    valid_cases = json.loads((CONTRACT_ROOT / "fixtures/valid/cases.json").read_text(encoding="utf-8"))
    invalid_cases = json.loads((CONTRACT_ROOT / "fixtures/invalid/cases.json").read_text(encoding="utf-8"))
    indexed = {item["caseId"]: item for item in valid_cases}
    failures = []
    for case in valid_cases:
        issues = validate_instance(case["definition"], case["value"], schema)
        if issues:
            failures.append(f"{case['caseId']}: unexpectedly invalid ({','.join(issues)})")
    for case in invalid_cases:
        base = indexed[case["baseCaseId"]]
        value = apply_mutations(base["value"], case["changes"])
        issues = validate_instance(base["definition"], value, schema)
        if case["expectedError"] not in issues:
            failures.append(f"{case['caseId']}: expected {case['expectedError']}, got {issues or 'valid'}")
    if failures:
        raise SystemExit("\n".join(failures))
    print(f"PASS: Draft2020-12, OpenAPI3.1.1, shared schema projection, {len(valid_cases)} valid fixtures, {len(invalid_cases)} rejected mutations.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
