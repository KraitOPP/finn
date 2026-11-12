"""Display-only price history for the selected Yahoo listing."""

from datetime import date, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

from .history import Listing, _decimal, InvalidProviderData


def fetch_chart(query, workspace: Path):
    import yfinance as yf

    listing = Listing("display-chart", query["exchange"], query["symbol"])
    listing.validate()
    cache = workspace / "cache" / "yfinance"
    cache.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(cache))
    intraday = query["range"] == "D1"
    if intraday:
        window = {"period": "5d", "interval": "5m"}
    elif query["range"] == "ALL" and query["start"] is None:
        window = {"period": "max", "interval": "1d"}
    else:
        window = {
            "start": date.fromisoformat(query["start"]).isoformat(),
            "end": date.fromisoformat(query["end"]).isoformat(),
            "interval": "1d",
        }
    ticker = yf.Ticker(listing.provider_symbol)
    frame = ticker.history(
        **window, auto_adjust=False, back_adjust=False, actions=False, prepost=False,
        repair=False, raise_errors=True, timeout=8,
    )
    if frame.empty:
        return {"items": []}
    if ticker.history_metadata.get("currency") != "INR" or len(frame) > 40_000:
        raise InvalidProviderData("Unsupported chart coverage or currency.")
    india = ZoneInfo("Asia/Kolkata")
    points = []
    for index, close in frame["Close"].items():
        timestamp = index.to_pydatetime()
        if timestamp.tzinfo is None:
            raise InvalidProviderData("Source timezone is missing.")
        if str(close).lower() in {"nan", "nat", "<na>"}:
            continue
        points.append({
            "date": timestamp.astimezone(india).date().isoformat(),
            "time": timestamp.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if intraday else None,
            "close": _decimal(close, "Close", positive=True),
        })
    return {"items": points}
