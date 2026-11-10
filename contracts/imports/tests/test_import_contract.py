"""Contract checks use invented records; no actual Groww format is asserted."""

import copy
import json
from pathlib import Path
import unittest

from jsonschema import Draft202012Validator, FormatChecker


SCHEMA = json.loads((Path(__file__).parents[1] / "portfolio-import-preview.schema.json").read_text(encoding="utf-8"))
VALIDATOR = Draft202012Validator(SCHEMA, format_checker=FormatChecker())


def synthetic_preview():
    return {
        "contractVersion": "0.1.0", "previewOnly": True, "accountId": "synthetic-account",
        "sourceKind": "SYNTHETIC", "sourceFormat": "XLSX", "reportKind": "EXECUTED_TRADES",
        "sourceMappingStatus": "UNVERIFIED", "mappingVersion": None, "parserVersion": None,
        "batchStatus": "MAPPING_REQUIRED", "sourceArtifact": {
            "sha256": "a" * 64, "displayName": "synthetic-example.xlsx", "asOfDate": None,
            "periodStart": "2026-10-01", "periodEnd": "2026-10-31",
        },
        "rows": [{
            "rowId": "synthetic-row", "sourceRowNumber": 2, "sourceSheet": "Invented Example", "sourceFingerprint": "b" * 64,
            "status": "REVIEW_REQUIRED", "issues": ["MAPPING_UNVERIFIED"], "kind": "TRADE",
            "listing": {"listingId": None, "exchange": "NSE", "symbol": "SYNTHETIC", "isin": None},
            "side": "BUY", "tradeDate": "2026-10-08", "executedAt": None,
            "quantity": "2", "price": "123.45", "currency": "INR", "charges": None,
            "sourceExecutionId": None, "sourceOrderId": None,
        }],
        "warnings": ["SYNTHETIC_EXAMPLE_ONLY"],
    }


class ImportContractTests(unittest.TestCase):
    def assert_invalid(self, payload):
        self.assertTrue(list(VALIDATOR.iter_errors(payload)), "Expected contract rejection")

    def test_schema_is_valid(self):
        Draft202012Validator.check_schema(SCHEMA)

    def test_synthetic_unverified_preview(self):
        VALIDATOR.validate(synthetic_preview())

    def test_groww_report_declares_xlsx_without_claiming_a_verified_mapping(self):
        payload = synthetic_preview()
        payload["sourceKind"] = "GROWW_REPORT"
        VALIDATOR.validate(payload)
        payload["sourceFormat"] = "MANUAL"
        self.assert_invalid(payload)
        del payload["sourceFormat"]
        self.assert_invalid(payload)

    def test_optional_source_sheet_is_an_original_name_not_a_row_number(self):
        payload = synthetic_preview()
        payload["rows"][0]["sourceSheet"] = None
        VALIDATOR.validate(payload)
        del payload["rows"][0]["sourceSheet"]
        VALIDATOR.validate(payload)
        for value in [7, "", "x" * 32]:
            with self.subTest(value=value):
                payload["rows"][0]["sourceSheet"] = value
                self.assert_invalid(payload)

    def test_numeric_financial_values_are_rejected(self):
        payload = synthetic_preview()
        payload["rows"][0]["price"] = 123.45
        self.assert_invalid(payload)

    def test_invalid_dates_are_rejected(self):
        payload = synthetic_preview()
        payload["rows"][0]["tradeDate"] = "2026-02-30"
        self.assert_invalid(payload)

    def test_zero_negative_and_nonfinite_trade_values_are_rejected(self):
        for value in ["0", "0.00", "-1", "NaN", "Infinity", "1e3", "01.5"]:
            with self.subTest(value=value):
                payload = synthetic_preview()
                payload["rows"][0]["quantity"] = value
                self.assert_invalid(payload)

    def test_unverified_mapping_cannot_mark_rows_acceptable(self):
        payload = synthetic_preview()
        payload["sourceKind"] = "GROWW_REPORT"
        payload["rows"][0]["status"] = "ACCEPTABLE"
        self.assert_invalid(payload)

    def test_unknown_fields_and_file_paths_are_rejected(self):
        payload = synthetic_preview()
        payload["rows"][0]["ownerId"] = "another-user"
        self.assert_invalid(payload)
        payload = synthetic_preview()
        payload["sourceArtifact"]["displayName"] = "../private.csv"
        self.assert_invalid(payload)

    def test_validated_mapping_requires_versions(self):
        payload = synthetic_preview()
        payload["sourceMappingStatus"] = "VALIDATED"
        self.assert_invalid(payload)
        payload["mappingVersion"] = "synthetic-1"
        payload["parserVersion"] = "synthetic-1"
        payload["batchStatus"] = "READY_FOR_REVIEW"
        payload["rows"][0]["status"] = "ACCEPTABLE"
        VALIDATOR.validate(payload)

    def test_holdings_cannot_invent_trade_history(self):
        payload = synthetic_preview()
        payload["reportKind"] = "HOLDINGS_SNAPSHOT"
        self.assert_invalid(payload)
        base = {key: copy.deepcopy(payload["rows"][0][key]) for key in ["rowId", "sourceRowNumber", "sourceFingerprint", "status", "issues", "listing"]}
        payload["rows"] = [dict(base, kind="OPENING_HOLDING", asOfDate="2026-10-08", quantity="2", averageCost=None, currency="INR", historyCoverage="SNAPSHOT_ONLY")]
        VALIDATOR.validate(payload)
        payload["rows"][0]["tradeDate"] = "2020-01-01"
        self.assert_invalid(payload)

    def test_order_records_are_nonposting(self):
        payload = synthetic_preview()
        payload["reportKind"] = "ORDER_HISTORY"
        base = {key: copy.deepcopy(payload["rows"][0][key]) for key in ["rowId", "sourceRowNumber", "sourceFingerprint", "issues", "listing"]}
        payload["rows"] = [dict(base, kind="ORDER_RECORD", status="NON_POSTING", sourceOrderId="synthetic-order", orderStatus="CANCELLED", postingEligibility="NON_POSTING")]
        VALIDATOR.validate(payload)
        payload["rows"][0]["status"] = "ACCEPTABLE"
        self.assert_invalid(payload)

    def test_rejected_input_has_safe_locator_and_issue_codes_only(self):
        payload = synthetic_preview()
        payload["rows"] = [{"rowId": "bad-synthetic-row", "sourceRowNumber": 5, "sourceFingerprint": "c" * 64,
                            "kind": "REJECTED_INPUT", "status": "REJECTED", "issues": ["INVALID_PRICE"]}]
        VALIDATOR.validate(payload)
        payload["rows"][0]["rawPrice"] = "private malformed input"
        self.assert_invalid(payload)


if __name__ == "__main__":
    unittest.main()
