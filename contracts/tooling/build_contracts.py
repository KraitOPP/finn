"""Build deterministic FINN contracts; no framework, network, or runtime files.

The definitions below are the maintained contract source. The JSON Schema and
OpenAPI projections are committed interchange artifacts. Run with --check in CI.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


CONTRACT_ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.1.0"
DIALECT = "https://json-schema.org/draft/2020-12/schema"
PROVIDERS = ["SYNTHETIC", "YAHOO_YFINANCE", "NSE_EOD_FILE", "BSE_EOD_FILE"]
UNAVAILABLE = [
    "NOT_YET_PUBLISHED", "NO_TRADE", "NOT_COVERED", "TEMPORARILY_UNAVAILABLE",
    "INVALID_DATA", "UNKNOWN",
]
BASES = [
    "AS_REPORTED_EXCHANGE", "SPLIT_ADJUSTED", "TOTAL_RETURN_ADJUSTED",
    "PROVIDER_DEFINED", "UNKNOWN",
]


def ref(name: str) -> dict:
    return {"$ref": f"#/$defs/{name}"}


def nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def text(description: str = "", **kwargs) -> dict:
    return {"type": "string", "minLength": 1, "maxLength": 256,
            **({"description": description} if description else {}), **kwargs}


def enum(values: list[str], description: str = "") -> dict:
    return {"type": "string", "enum": values,
            **({"description": description} if description else {})}


def obj(properties: dict, description: str = "", optional: tuple = ()) -> dict:
    return {"type": "object", "properties": properties,
            "required": [key for key in properties if key not in optional],
            "additionalProperties": False,
            **({"description": description} if description else {})}


def array(items: dict, **kwargs) -> dict:
    return {"type": "array", "items": items, "maxItems": 1000, **kwargs}


def definitions() -> dict:
    d = {
        "ContractVersion": {"type": "string", "const": VERSION},
        "OpaqueId": text(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$", maxLength=128),
        "DecimalString": text(
            "Exact base-10 decimal; no exponent, separators, or financial JSON numbers.",
            pattern=r"^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$", maxLength=80),
        "NonNegativeDecimalString": text(
            pattern=r"^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$", maxLength=80),
        "PositiveDecimalString": text(
            "A present traded price must be positive. Missing price is not zero.",
            pattern=r"^(?:[1-9][0-9]*(?:\.[0-9]+)?|0\.[0-9]*[1-9][0-9]*)$", maxLength=80),
        "IntegerString": text(pattern=r"^(?:0|[1-9][0-9]*)$", maxLength=32),
        "SessionDate": text(format="date", pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$", maxLength=10),
        "UtcInstant": text(
            "UTC RFC3339 instant. A session date must not be expanded into a fabricated observation time.",
            format="date-time", pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$", maxLength=27),
        "Provider": enum(PROVIDERS),
        "AdjustmentBasis": enum(BASES),
        "Warning": obj({"code": ref("OpaqueId"), "message": text(maxLength=512)}),
    }
    d["ListingIdentity"] = obj({
        "listingId": ref("OpaqueId"), "securityId": ref("OpaqueId"),
        "companyId": ref("OpaqueId"), "exchange": enum(["NSE", "BSE"]),
        "segment": {"type": "string", "const": "CASH_EQUITY"},
        "series": text(maxLength=16), "symbol": text(maxLength=64),
        "currency": {"type": "string", "const": "INR"},
        "isin": nullable(text(pattern=r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$", maxLength=12)),
    }, "Stable listing identity. NSE and BSE listings remain distinct even for one security. ISIN may be unknown; ticker is not a permanent identifier.")
    d["Delay"] = {"description": "Delay is source-declared or unknown; FINN receipt time is not evidence of zero upstream delay.", "oneOf": [
        obj({"kind": {"type": "string", "const": "EOD"}, "seconds": {"type": "null"},
             "basis": enum(["SOURCE_DECLARED", "UNKNOWN"])}),
        obj({"kind": {"type": "string", "const": "UNKNOWN"}, "seconds": {"type": "null"},
             "basis": {"type": "string", "const": "UNKNOWN"}}),
        obj({"kind": {"type": "string", "const": "DELAYED"},
             "seconds": {"type": "integer", "minimum": 1},
             "basis": {"type": "string", "const": "SOURCE_DECLARED"}}),
    ]}
    rights_common = {
        "policyId": ref("OpaqueId"), "reviewedAt": nullable(ref("UtcInstant")),
        "retentionUntil": nullable(ref("UtcInstant")),
        "attribution": nullable(text(maxLength=512)),
    }
    d["Rights"] = {"description": "A routing restriction, not a legal entitlement. Public real-data distribution is outside this contract's validated modes.", "oneOf": [
        obj({**rights_common,
             "mode": {"type": "string", "const": "SYNTHETIC_PUBLIC_DEMO"},
             "reviewStatus": {"type": "string", "const": "VERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": True},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
        obj({**rights_common,
             "mode": {"type": "string", "const": "PRIVATE_PERSONAL"},
             "reviewStatus": {"type": "string", "const": "VERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": False},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
        obj({**rights_common,
             "mode": {"type": "string", "const": "RESTRICTED_UNVERIFIED"},
             "reviewStatus": {"type": "string", "const": "UNVERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": False},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
    ]}
    d["SourceTimes"] = obj({
        "observedAt": nullable(ref("UtcInstant")),
        "publishedAt": nullable(ref("UtcInstant")),
        "providerAvailableAt": nullable(ref("UtcInstant")),
        "firstSeenAt": ref("UtcInstant"),
        "ingestedAt": nullable(ref("UtcInstant")),
        "acceptedAt": nullable(ref("UtcInstant")),
        "unknownTimeReasons": array(enum([
            "OBSERVATION_TIME_NOT_PROVIDED", "PUBLICATION_TIME_NOT_PROVIDED",
            "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED", "NOT_YET_INGESTED", "NOT_YET_ACCEPTED",
        ]), maxItems=5),
    }, "Source and FINN processing times are distinct. Null timestamps require matching unknownTimeReasons; checked by semantic validation.")
    d["Provenance"] = obj({
        "provider": ref("Provider"), "providerInstrumentId": text(maxLength=128),
        "mappingVersion": ref("OpaqueId"), "adapterVersion": text(maxLength=64),
        "sourceName": text(maxLength=128), "sourceLocator": nullable(text(format="uri", maxLength=2048)),
        "artifactSha256": nullable(text(pattern=r"^[a-f0-9]{64}$", maxLength=64)),
        "sourceRevision": ref("OpaqueId"), "parserVersion": text(maxLength=64),
        "sourceTimezone": {"type": "string", "const": "Asia/Kolkata"},
        "times": ref("SourceTimes"), "delay": ref("Delay"),
        "rights": ref("Rights"),
        "quality": enum(["VALIDATED", "REVIEW_REQUIRED"]),
        "qualityFlags": array(ref("OpaqueId"), maxItems=32),
    }, "No personal local paths, credentials, cookies, private object URLs, or source payloads in public provenance.")
    d["PriceBasis"] = obj({
        "ohlcPrice": ref("AdjustmentBasis"),
        "adjustedClose": nullable(ref("AdjustmentBasis")),
        "volume": enum(["AS_REPORTED", "SPLIT_ADJUSTED", "PROVIDER_DEFINED", "UNKNOWN"]),
        "adjustmentAsOf": nullable(ref("SessionDate")),
    })
    d["PriceObservation"] = obj({
        "observationId": ref("OpaqueId"), "listing": ref("ListingIdentity"),
        "sessionDate": ref("SessionDate"),
        "interval": {"type": "string", "const": "ONE_DAY"},
        "open": nullable(ref("PositiveDecimalString")),
        "high": nullable(ref("PositiveDecimalString")),
        "low": nullable(ref("PositiveDecimalString")),
        "close": ref("PositiveDecimalString"),
        "adjustedClose": nullable(ref("PositiveDecimalString")),
        "volume": nullable(ref("IntegerString")),
        "turnover": nullable(ref("NonNegativeDecimalString")),
        "basis": ref("PriceBasis"),
        "finality": enum(["FINAL", "PROVISIONAL", "UNKNOWN"]),
        "provenance": ref("Provenance"),
    }, "One present EOD observation. A missing close is represented by unavailable result and no observation. Partial OHLC/volume stay null. As-traded and adjusted series are never interchangeable.")
    result_common = {"listing": ref("ListingIdentity"), "reasonCode": ref("OpaqueId"),
                     "warnings": array(ref("Warning"), maxItems=32)}
    d["InstrumentResult"] = {"oneOf": [
        obj({**result_common, "availability": {"type": "string", "const": "AVAILABLE"},
             "observations": array(ref("PriceObservation"), minItems=1)}),
        obj({**result_common, "availability": enum(UNAVAILABLE),
             "observations": array(ref("PriceObservation"), maxItems=0)}),
    ]}
    d["AcquisitionEnvelope"] = obj({
        "contractVersion": ref("ContractVersion"), "requestId": ref("OpaqueId"),
        "provider": ref("Provider"), "adapterVersion": text(maxLength=64),
        "requestedAt": ref("UtcInstant"), "completedAt": ref("UtcInstant"),
        "outcome": enum(["COMPLETE", "PARTIAL", "UNAVAILABLE"]),
        "results": array(ref("InstrumentResult"), minItems=1, maxItems=100),
        "warnings": array(ref("Warning"), maxItems=32),
    }, "Internal acquisition response: per-listing partial success is explicit. COMPLETE means every requested listing has observations; it does not prove complete date-range coverage.")
    d["Freshness"] = obj({
        "state": enum(["FRESH", "STALE", "UNKNOWN", "NOT_APPLICABLE"]),
        "evaluatedAt": ref("UtcInstant"),
        "expectedSessionDate": nullable(ref("SessionDate")),
        "latestSessionDate": nullable(ref("SessionDate")),
        "reasonCode": ref("OpaqueId"),
    }, "Calendar-aware age/eligibility assessment. A weekend does not make the newest expected completed session stale. FRESH requires equal known latest/expected sessions.")
    capabilities = ["QUOTE", "DAILY_HISTORY", "INTRADAY_HISTORY", "STREAMING",
                    "CORPORATE_ACTIONS", "FILINGS", "NEWS", "FUNDAMENTALS"]
    d["Capability"] = obj({
        "capability": enum(capabilities),
        "status": enum(["VALIDATED", "DOCUMENTED_UNVERIFIED", "UNSUPPORTED", "TEMPORARILY_UNAVAILABLE"]),
        "coverage": text(maxLength=512),
        "evidence": text(maxLength=512),
    }, "A documented library interface does not establish validated Indian listing coverage, timing, or rights.")
    d["ProviderCapabilities"] = obj({
        "contractVersion": ref("ContractVersion"), "provider": ref("Provider"),
        "adapterVersion": text(maxLength=64), "evaluatedAt": ref("UtcInstant"),
        "capabilities": array(ref("Capability"), minItems=8, maxItems=8),
        "rights": ref("Rights"),
    }, "Exactly one entry per declared capability; uniqueness/completeness are semantic checks.")
    d["ProviderStatus"] = obj({
        "provider": ref("Provider"), "health": enum(["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNTESTED"]),
        "checkedAt": ref("UtcInstant"),
        "lastSuccessfulAcquisitionAt": nullable(ref("UtcInstant")),
        "reasonCode": ref("OpaqueId"), "capabilities": ref("ProviderCapabilities"),
    }, "Operational status is distinct from market-data freshness. No service SLA or live exchange certification is implied.")
    d["ProblemField"] = obj({"field": text(maxLength=128), "code": ref("OpaqueId")})
    d["Problem"] = obj({
        "type": text(format="uri", maxLength=256), "title": text(maxLength=128),
        "status": {"type": "integer", "minimum": 400, "maximum": 599},
        "detail": text(maxLength=512), "instance": text(maxLength=512),
        "code": enum(["MALFORMED_REQUEST", "VALIDATION_FAILED", "AUTHENTICATION_REQUIRED",
                      "RESOURCE_NOT_FOUND", "OPERATION_FORBIDDEN", "CONFLICT", "RATE_LIMITED",
                      "DATA_SOURCE_UNAVAILABLE", "INTERNAL_ERROR"]),
        "traceId": ref("OpaqueId"), "errors": array(ref("ProblemField"), maxItems=100),
    }, "RFC9457 problem response. Do not expose stack traces, private rows, tokens, or upstream cookies.", optional=("errors",))
    page_common = {"contractVersion": ref("ContractVersion"), "requestId": ref("OpaqueId")}
    d["InstrumentPage"] = obj({**page_common, "items": array(ref("ListingIdentity"), maxItems=100),
                               "nextCursor": nullable(text(maxLength=512))})
    quote_common = {**page_common, "listing": ref("ListingIdentity"), "freshness": ref("Freshness"),
                    "selectionReason": ref("OpaqueId"), "warnings": array(ref("Warning"), maxItems=32)}
    d["QuoteResponse"] = {"description": "Latest eligible stored EOD observation, not a tick or a promised live quote. Unavailability is a normal domain result; service/auth failures use Problem.", "oneOf": [
        obj({**quote_common, "availability": {"type": "string", "const": "AVAILABLE"},
             "observation": ref("PriceObservation")}),
        obj({**quote_common, "availability": enum(UNAVAILABLE), "observation": {"type": "null"}}),
    ]}
    d["HistoryCoverage"] = obj({
        "state": enum(["COMPLETE", "PARTIAL", "UNKNOWN", "NONE"]),
        "expectedSessions": nullable({"type": "integer", "minimum": 0}),
        "availableSessions": {"type": "integer", "minimum": 0},
        "missingSessions": array(ref("SessionDate")), "reasonCode": ref("OpaqueId"),
    }, "Coverage describes the entire requested range at selectionSnapshotId, not this page. COMPLETE requires a verified calendar, equal expected/available counts, and no missing sessions. availableSessions may exceed the current page length.")
    d["HistoryResponse"] = obj({
        **page_common, "listing": ref("ListingIdentity"),
        "from": ref("SessionDate"), "toExclusive": ref("SessionDate"),
        "requestedBasis": ref("AdjustmentBasis"), "selectionSnapshotId": ref("OpaqueId"),
        "availability": enum(["AVAILABLE", *UNAVAILABLE]),
        "items": array(ref("PriceObservation")),
        "nextCursor": nullable(text(maxLength=512)),
        "coverage": ref("HistoryCoverage"), "freshness": ref("Freshness"),
        "warnings": array(ref("Warning"), maxItems=32),
    }, "Ascending sessionDate/observationId order. ONE_DAY only. Never fill gaps with zero or a silent previous close. Cursors bind listing, range, basis and source-selection snapshot.")
    d["ProviderStatusPage"] = obj({**page_common, "items": array(ref("ProviderStatus"), maxItems=4)})
    job_common = {
        **page_common, "jobId": ref("OpaqueId"),
        "revision": {"type": "integer", "minimum": 1, "maximum": 9007199254740991},
        "createdAt": ref("UtcInstant"), "updatedAt": ref("UtcInstant"),
    }
    job_states = [
        ("QUEUED", {"type": "null"}, {"type": "null"}, {"type": "null"}),
        ("RUNNING", ref("UtcInstant"), {"type": "null"}, {"type": "null"}),
        ("SUCCEEDED", ref("UtcInstant"), ref("UtcInstant"), {"type": "null"}),
        ("PARTIALLY_SUCCEEDED", ref("UtcInstant"), ref("UtcInstant"),
         {"type": "string", "const": "PARTIAL_RESULT"}),
        ("FAILED", nullable(ref("UtcInstant")), ref("UtcInstant"),
         text(pattern=r"^[A-Z][A-Z0-9_]{0,63}$", maxLength=64)),
        ("CANCELLED", nullable(ref("UtcInstant")), ref("UtcInstant"), {"type": "null"}),
    ]
    d["AsyncJobStatus"] = {
        "description": "Owner-scoped status snapshot, not a queue implementation. Revision is server-assigned and increases on committed changes. Terminal states are immutable; retry creates a new job. Failure codes are safe application codes, never raw exceptions or source values.",
        "oneOf": [obj({**job_common, "state": {"type": "string", "const": state},
                       "startedAt": started, "finishedAt": finished, "failureCode": failure})
                  for state, started, finished, failure in job_states],
    }
    return d


def schema_document() -> dict:
    return {"$schema": DIALECT, "$id": f"urn:finn:contracts:market-data:{VERSION}",
            "title": "FINN market data contract", "description": "Versioned synthetic/private EOD data boundary. Schemas describe intended behavior, not deployed APIs or provider entitlements.",
            "$ref": "#/$defs/AcquisitionEnvelope", "$defs": definitions()}


def openapi_refs(value):
    if isinstance(value, dict):
        return {key: (item.replace("#/$defs/", "#/components/schemas/") if key == "$ref"
                      else openapi_refs(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [openapi_refs(item) for item in value]
    return value


def public_api_document() -> dict:
    def parameter(name, location, schema, required=False, description=""):
        return {"name": name, "in": location, "required": required,
                "schema": schema, **({"description": description} if description else {})}

    def response(description, name, media="application/json"):
        return {"description": description,
                "content": {media: {"schema": {"$ref": f"#/components/schemas/{name}"}}}}

    def operation(operation_id, description, result_name, params):
        return {"operationId": operation_id, "summary": description,
                "description": "PLANNED CONTRACT ONLY: endpoint not yet implemented. Authentication/ownership is enforced by the future Java service; no browser provider access.",
                "x-finn-implementation-status": "PLANNED", "parameters": params,
                "responses": {"200": response("Stored result; inspect availability, coverage and freshness.", result_name),
                              "400": response("Malformed request.", "Problem", "application/problem+json"),
                              "401": response("Authentication required.", "Problem", "application/problem+json"),
                              "404": response("Resource unavailable to this user.", "Problem", "application/problem+json"),
                              "422": response("Invalid date range, listing, or query.", "Problem", "application/problem+json"),
                              "429": response("Bounded query budget exceeded; Retry-After when known.", "Problem", "application/problem+json"),
                              "503": response("Service unable to serve stored results.", "Problem", "application/problem+json")}}

    listing = parameter("listingId", "path", ref("OpaqueId"), True,
                        "Exact exchange listing identity. Do not substitute NSE/BSE listings.")
    page = [parameter("limit", "query", {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}),
            parameter("cursor", "query", text(maxLength=512))]
    paths = {
        "/api/v1/instruments": {"get": operation("searchInstruments", "Search supported cash-equity listings", "InstrumentPage", [
            parameter("query", "query", text(maxLength=100)),
            parameter("exchange", "query", enum(["NSE", "BSE"])), *page])},
        "/api/v1/instruments/{listingId}/quote": {"get": operation("getLatestEodQuote", "Get latest stored EOD observation", "QuoteResponse", [listing])},
        "/api/v1/instruments/{listingId}/history": {"get": operation("getDailyHistory", "Get stored daily history", "HistoryResponse", [
            listing, parameter("from", "query", ref("SessionDate"), True, "Inclusive session date."),
            parameter("toExclusive", "query", ref("SessionDate"), True, "Exclusive session date; range must be positive and bounded."),
            parameter("basis", "query", ref("AdjustmentBasis"), True, "Requested price basis; do not silently change it."), *page])},
        "/api/v1/data/providers": {"get": operation("getProviderStatuses", "Get source capabilities and acquisition status", "ProviderStatusPage", [])},
        "/api/v1/jobs/{jobId}": {"get": operation("getJobStatus", "Get an owned background job status", "AsyncJobStatus", [
            parameter("jobId", "path", ref("OpaqueId"), True,
                      "Owner-scoped job ID. Unknown and inaccessible jobs both return 404.")])},
    }
    return openapi_refs({
        "openapi": "3.1.1", "jsonSchemaDialect": DIALECT,
        "info": {"title": "FINN initial market data API", "version": VERSION,
                 "description": "Design contract for a future Java service; no endpoints currently deployed. EOD valuation, explicit missing/stale data and synthetic/private modes only. No trading, broker onboarding, news or investment-performance promises."},
        "servers": [{"url": "/", "description": "Same-origin Java API; no running service implied."}],
        "security": [{"sessionCookie": []}],
        "x-finn-status": "CONTRACT_ONLY_NOT_IMPLEMENTED",
        "x-finn-versioning": "Immutable semantic-versioned contract artifact; independent frontend/backend releases record tested contract SHA. Even 0.x breaking changes require compatibility review.",
        "paths": paths,
        "components": {"securitySchemes": {"sessionCookie": {"type": "apiKey", "in": "cookie", "name": "FINN_SESSION",
                         "description": "Planned secure HttpOnly session. State-changing endpoints added later require CSRF protection."}},
                       "schemas": definitions()},
    })


def render(value) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = {CONTRACT_ROOT / "market-data.schema.json": schema_document(),
               CONTRACT_ROOT / "public-api" / "openapi.json": public_api_document()}
    failed = []
    for path, document in outputs.items():
        expected = render(document)
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, encoding="utf-8", newline="\n")
        elif not path.exists() or path.read_text(encoding="utf-8") != expected:
            failed.append(path.relative_to(CONTRACT_ROOT).as_posix())
    if failed:
        raise SystemExit("Generated contract drift: " + ", ".join(failed))
    print("Contract artifacts " + ("written" if args.write else "match maintained definitions") + f" ({VERSION}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
