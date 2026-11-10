"""Synthetic invariants; these checks never contact Yahoo."""

from __future__ import annotations

import tempfile
import unittest
from datetime import date, datetime, timezone
from pathlib import Path
from unittest.mock import Mock

import pandas as pd

from finn_yfinance.history import HistoryQuery, Listing, YahooHistoryClient


class YahooHistoryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.now = datetime(2026, 11, 10, 7, 45, tzinfo=timezone.utc)
        self.listing = Listing("synthetic-nse", "NSE", "SYNTHETIC.NS")
        self.query = HistoryQuery((self.listing,), date(2026, 11, 1), date(2026, 11, 10))

    def frame(self, **changes):
        row = {"Open": 100.0, "High": 110.0, "Low": 95.0, "Close": 105.25,
               "Adj Close": 52.625, "Volume": 1000}
        row.update(changes)
        return pd.DataFrame([row], index=pd.DatetimeIndex(["2026-11-09"], tz="Asia/Kolkata"))

    def client(self, fetcher):
        return YahooHistoryClient(self.root, fetcher=fetcher, clock=lambda: self.now)

    def fetch(self, fetcher, query=None):
        return self.client(fetcher).fetch_history(query or self.query, data_mode="PRIVATE_PERSONAL")

    def test_public_and_unknown_modes_never_contact_source_or_create_cache(self):
        fetcher = Mock()
        for mode in ("PUBLIC_SYNTHETIC", "UNKNOWN", "", None):
            with self.assertRaises(PermissionError):
                self.client(fetcher).fetch_history(self.query, data_mode=mode)
        fetcher.assert_not_called()
        self.assertFalse((self.root / "cache").exists())

    def test_normalisation_preserves_basis_decimal_strings_and_unknown_delay(self):
        fetcher = Mock(return_value=self.frame())
        result = self.fetch(fetcher)
        item = result["items"][0]
        self.assertEqual(item["availability"], "AVAILABLE")
        self.assertEqual(item["candles"][0]["close"], "105.25")
        self.assertEqual(item["candles"][0]["adjustedClose"], "52.625")
        self.assertEqual(item["candles"][0]["volume"], "1000")
        self.assertEqual(item["candles"][0]["priceBasis"], "PROVIDER_DEFINED")
        self.assertIsNone(item["knownDelaySeconds"])
        self.assertIsNone(item["candles"][0]["observedAt"])
        self.assertFalse(result["rights"]["publicDisplayAllowed"])
        options = fetcher.call_args.kwargs
        self.assertFalse(options["auto_adjust"])
        self.assertFalse(options["back_adjust"])
        self.assertFalse(options["repair"])
        self.assertEqual(options["end"], "2026-11-10")

    def test_empty_result_is_unknown_not_zero_or_unsupported(self):
        item = self.fetch(Mock(return_value=pd.DataFrame()))["items"][0]
        self.assertEqual(item["availability"], "UNKNOWN")
        self.assertEqual(item["candles"], [])

    def test_invalid_values_are_rejected_without_fabricated_candles(self):
        for changes in ({"Close": float("nan")}, {"High": float("inf")},
                        {"Volume": -1}, {"Volume": 1.5}, {"Low": 106},
                        {"High": 99}, {"Close": 0}):
            with self.subTest(changes=changes):
                item = self.fetch(Mock(return_value=self.frame(**changes)))["items"][0]
                self.assertEqual(item["availability"], "INVALID_DATA")
                self.assertEqual(item["candles"], [])

    def test_missing_columns_and_timezone_are_invalid(self):
        frame = self.frame().drop(columns=["Close"])
        self.assertEqual(self.fetch(Mock(return_value=frame))["items"][0]["availability"], "INVALID_DATA")
        frame = self.frame()
        frame.index = frame.index.tz_localize(None)
        self.assertEqual(self.fetch(Mock(return_value=frame))["items"][0]["availability"], "INVALID_DATA")

    def test_duplicate_and_outside_sessions_are_invalid(self):
        frame = pd.concat([self.frame(), self.frame()])
        self.assertEqual(self.fetch(Mock(return_value=frame))["items"][0]["availability"], "INVALID_DATA")
        frame = self.frame()
        frame.index = pd.DatetimeIndex(["2026-11-10"], tz="Asia/Kolkata")
        self.assertEqual(self.fetch(Mock(return_value=frame))["items"][0]["availability"], "INVALID_DATA")

    def test_provider_exception_is_bounded_and_sanitised(self):
        fetcher = Mock(side_effect=RuntimeError("https://provider.invalid/?crumb=secret"))
        result = self.fetch(fetcher)
        self.assertEqual(result["items"][0]["availability"], "TEMPORARILY_UNAVAILABLE")
        self.assertNotIn("secret", str(result))
        self.assertEqual(fetcher.call_count, 1)

    def test_partial_failure_does_not_discard_other_listing(self):
        second = Listing("synthetic-bse", "BSE", "SYNTHETIC.BO")
        query = HistoryQuery((self.listing, second), self.query.start, self.query.end_exclusive)
        result = self.fetch(Mock(side_effect=[self.frame(), OSError("offline")]), query)
        self.assertEqual([item["availability"] for item in result["items"]],
                         ["AVAILABLE", "TEMPORARILY_UNAVAILABLE"])

    def test_bad_query_never_contacts_source(self):
        queries = [
            HistoryQuery((), self.query.start, self.query.end_exclusive),
            HistoryQuery((self.listing,) * 6, self.query.start, self.query.end_exclusive),
            HistoryQuery((self.listing, self.listing), self.query.start, self.query.end_exclusive),
            HistoryQuery((Listing("x", "BSE", "SYNTHETIC.NS"),), self.query.start, self.query.end_exclusive),
            HistoryQuery((Listing("x", "NSE", "https://bad.invalid"),), self.query.start, self.query.end_exclusive),
            HistoryQuery((self.listing,), date(2026, 9, 1), date(2026, 11, 10)),
            HistoryQuery((self.listing,), date(2026, 11, 10), date(2026, 11, 11)),
        ]
        for query in queries:
            fetcher = Mock()
            with self.subTest(query=query), self.assertRaises(ValueError):
                self.fetch(fetcher, query)
            fetcher.assert_not_called()

    def test_cache_root_cannot_be_a_git_checkout(self):
        (self.root / ".git").mkdir()
        with self.assertRaises(ValueError):
            self.client(Mock())


if __name__ == "__main__":
    unittest.main()
