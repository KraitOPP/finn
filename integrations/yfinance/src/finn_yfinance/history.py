"""Private research acquisition primitives, not a public server or valuation engine."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, Callable
from zoneinfo import ZoneInfo

SYMBOL_PATTERN = re.compile(r"^[A-Z0-9][A-Z0-9&_.^-]{0,35}\.(NS|BO)$")
MAX_LISTINGS = 5
MAX_HISTORY_DAYS = 31
MAX_BARS = 31


@dataclass(frozen=True)
class Listing:
    listing_id: str
    exchange: str
    provider_symbol: str

    def validate(self) -> None:
        if not self.listing_id or not re.fullmatch(r"[A-Za-z0-9_-]{1,80}", self.listing_id):
            raise ValueError("A stable internal listing identifier is required.")
        suffix = {"NSE": ".NS", "BSE": ".BO"}.get(self.exchange)
        if suffix is None or not SYMBOL_PATTERN.fullmatch(self.provider_symbol):
            raise ValueError("Only mapped NSE/BSE equity symbols are supported.")
        if not self.provider_symbol.endswith(suffix):
            raise ValueError("Provider symbol and listing exchange disagree.")


@dataclass(frozen=True)
class HistoryQuery:
    listings: tuple[Listing, ...]
    start: date
    end_exclusive: date

    def validate(self) -> None:
        if not 1 <= len(self.listings) <= MAX_LISTINGS:
            raise ValueError("Request between one and five listings.")
        if type(self.start) is not date or type(self.end_exclusive) is not date:
            raise ValueError("History uses session dates, not timestamps.")
        if not 1 <= (self.end_exclusive - self.start).days <= MAX_HISTORY_DAYS:
            raise ValueError("History range must be positive and at most 31 calendar days.")
        if len({item.listing_id for item in self.listings}) != len(self.listings):
            raise ValueError("Duplicate listing identifiers are not accepted.")
        if len({item.provider_symbol for item in self.listings}) != len(self.listings):
            raise ValueError("Duplicate provider symbols are not accepted.")
        for listing in self.listings:
            listing.validate()


class InvalidProviderData(ValueError):
    """Source values do not satisfy the acquisition contract."""


def _decimal(value: Any, field: str, *, positive: bool = False) -> str:
    if isinstance(value, bool):
        raise InvalidProviderData(f"Invalid {field}.")
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise InvalidProviderData(f"Invalid {field}.") from None
    if not number.is_finite() or number < 0 or (positive and number == 0):
        raise InvalidProviderData(f"Invalid {field}.")
    return format(number, "f")


def _normalise(frame: Any, query: HistoryQuery) -> list[dict[str, Any]]:
    if len(frame) > MAX_BARS:
        raise InvalidProviderData("Provider returned too many bars.")
    required = {"Open", "High", "Low", "Close", "Volume"}
    if not required.issubset(frame.columns):
        raise InvalidProviderData("Required source columns are missing.")
    bars: list[dict[str, Any]] = []
    seen: set[date] = set()
    for index, row in frame.iterrows():
        if getattr(index, "tzinfo", None) is None:
            raise InvalidProviderData("Source timezone is missing.")
        session = index.to_pydatetime().astimezone(ZoneInfo("Asia/Kolkata")).date()
        if not query.start <= session < query.end_exclusive or session in seen:
            raise InvalidProviderData("Duplicate or out-of-range source session.")
        seen.add(session)
        values = {name.lower(): _decimal(row[name], name, positive=True)
                  for name in ("Open", "High", "Low", "Close")}
        low, high = Decimal(values["low"]), Decimal(values["high"])
        if not low <= min(Decimal(values["open"]), Decimal(values["close"])):
            raise InvalidProviderData("Source low is inconsistent.")
        if not max(Decimal(values["open"]), Decimal(values["close"])) <= high:
            raise InvalidProviderData("Source high is inconsistent.")
        volume = Decimal(_decimal(row["Volume"], "Volume"))
        if volume != volume.to_integral_value():
            raise InvalidProviderData("Share volume must be integral.")
        adjusted = None
        if "Adj Close" in frame.columns:
            adjusted = _decimal(row["Adj Close"], "Adj Close", positive=True)
        bars.append({
            "sessionDate": session.isoformat(),
            "sourceIndex": index.isoformat(),
            # A daily bar index is not a last-trade or publication timestamp.
            "observedAt": None,
            "interval": "1d",
            **values,
            "adjustedClose": adjusted,
            "volume": str(int(volume)),
            "priceBasis": "PROVIDER_DEFINED",
        })
    return sorted(bars, key=lambda bar: bar["sessionDate"])


class YahooHistoryClient:
    """Fetch a bounded EOD window for reviewed mappings in private research mode.

    This returns acquisition candidates. Java must apply the canonical provider
    contract, rights/quality gates and source selection before valuation use.
    The network timeout is per provider request, not a whole-process deadline.
    Durable scheduling, retries, a private HTTP boundary and streaming are later work.
    """

    def __init__(self, workspace_root: Path, *, timeout_seconds: float = 10,
                 fetcher: Callable[..., Any] | None = None,
                 clock: Callable[[], datetime] | None = None) -> None:
        if not 1 <= timeout_seconds <= 15:
            raise ValueError("Provider request timeout must be between 1 and 15 seconds.")
        root = workspace_root.expanduser().resolve()
        if any((parent / ".git").exists() for parent in (root, *root.parents)):
            raise ValueError("The workspace must be outside Git checkouts.")
        self.root = root
        self.timeout = timeout_seconds
        self._fetcher = fetcher
        self._clock = clock or (lambda: datetime.now(timezone.utc))

    def _fetch(self, symbol: str, **options: Any) -> Any:
        if self._fetcher is not None:
            return self._fetcher(symbol, **options)
        import yfinance as yf

        cache = self.root / "cache" / "yfinance"
        cache.mkdir(parents=True, exist_ok=True)
        yf.set_tz_cache_location(str(cache))
        return yf.Ticker(symbol).history(**options)

    def fetch_history(self, query: HistoryQuery, *, data_mode: str = "PUBLIC_SYNTHETIC") -> dict[str, Any]:
        # Check the mode before imports, cache creation, or any provider call.
        if data_mode != "PRIVATE_PERSONAL":
            raise PermissionError("Yahoo acquisition is restricted to explicit private research mode.")
        query.validate()
        now = self._clock()
        if now.tzinfo is None:
            raise ValueError("The acquisition clock must include a timezone.")
        if query.end_exclusive > now.astimezone(ZoneInfo("Asia/Kolkata")).date():
            raise ValueError("Completed-day acquisition excludes the current or future session.")
        items: list[dict[str, Any]] = []
        for listing in query.listings:
            item: dict[str, Any] = {
                "listingId": listing.listing_id, "exchange": listing.exchange,
                "providerSymbol": listing.provider_symbol, "availability": "UNKNOWN",
                "candles": [], "currency": "INR", "currencyBasis": "MAPPED_LISTING",
                "knownDelaySeconds": None,
            }
            try:
                frame = self._fetch(
                    listing.provider_symbol, start=query.start.isoformat(),
                    end=query.end_exclusive.isoformat(), interval="1d",
                    auto_adjust=False, back_adjust=False, repair=False,
                    actions=True, timeout=self.timeout, raise_errors=True,
                )
                if frame is None or frame.empty:
                    item["reason"] = "NO_ROWS_RETURNED"
                else:
                    item["candles"] = _normalise(frame, query)
                    item["availability"] = "AVAILABLE"
            except InvalidProviderData:
                item["availability"] = "INVALID_DATA"
                item["reason"] = "SOURCE_VALIDATION_FAILED"
            except Exception:
                # Provider exceptions can include URLs and credentials; never forward them.
                item["availability"] = "TEMPORARILY_UNAVAILABLE"
                item["reason"] = "PROVIDER_REQUEST_FAILED"
            items.append(item)
        return {
            "adapterContractVersion": "0.1.0",
            "provider": "YAHOO_YFINANCE",
            "startedAt": now.astimezone(timezone.utc).isoformat(),
            "completedAt": self._clock().astimezone(timezone.utc).isoformat(),
            "rights": {"mode": "RESTRICTED_UNVERIFIED", "publicDisplayAllowed": False,
                       "externalAiAllowed": False},
            "items": items,
        }
