
"""Bounded internal worker entrypoint; invoked by Java with a reviewed mapping."""
import contextlib
import json
from datetime import date
from pathlib import Path
import sys

from .history import HistoryQuery, Listing, YahooHistoryClient
from .chart import fetch_chart


def lookup(query, workspace):
    import re
    import yfinance as yf

    text = query["query"]
    exchange = query["exchange"]
    venues = {"NSE": ("NSI", ".NS"), "BSE": ("BSE", ".BO")}
    if exchange not in venues or not isinstance(text, str) or not 2 <= len(text) <= 80:
        raise ValueError("Unsupported lookup")
    venue, suffix = venues[exchange]
    cache = workspace / "cache" / "yfinance"
    cache.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(cache))
    quotes = yf.Search(text, max_results=24, news_count=0, lists_count=0,
                       include_cb=False, recommended=0, enable_fuzzy_query=True, timeout=5).quotes
    results = []
    for quote in quotes:
        symbol = quote.get("symbol", "")
        name = quote.get("longname") or quote.get("shortname") or ""
        if (quote.get("quoteType") == "EQUITY" and quote.get("exchange") == venue
                and isinstance(symbol, str) and symbol.endswith(suffix)
                and re.fullmatch(r"[A-Z0-9][A-Z0-9&._-]{0,63}", symbol[:-3])
                and isinstance(name, str) and 0 < len(name.strip()) <= 120):
            results.append({"symbol": symbol[:-3], "name": name.strip()})
    return {"items": results[:10]}


def main() -> int:
    try:
        raw = sys.stdin.buffer.read(4097)
        if len(raw) > 4096 or len(sys.argv) not in (2, 3):
            return 2
        request = json.loads(raw)
        if len(sys.argv) == 3 and sys.argv[2] in ("lookup", "chart"):
            operation = lookup if sys.argv[2] == "lookup" else fetch_chart
            with contextlib.redirect_stdout(sys.stderr):
                result = operation(request, Path(sys.argv[1]))
            print(json.dumps(result, ensure_ascii=True, allow_nan=False, separators=(",", ":")))
            return 0
        if len(sys.argv) != 2:
            return 2
        query = HistoryQuery(
            (Listing(request["listingId"], request["exchange"], request["providerSymbol"]),),
            date.fromisoformat(request["start"]),
            date.fromisoformat(request["endExclusive"]),
        )
        # Libraries can emit raw diagnostics, including request details.
        with contextlib.redirect_stdout(sys.stderr):
            result = YahooHistoryClient(Path(sys.argv[1]), timeout_seconds=7).fetch_history(
                query, data_mode="PRIVATE_PERSONAL"
            )
        print(json.dumps(result, ensure_ascii=True, allow_nan=False, separators=(",", ":")))
        return 0
    except Exception:
        return 2


if __name__ == "__main__":
    sys.exit(main())
