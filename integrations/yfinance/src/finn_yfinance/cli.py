
"""Bounded internal worker entrypoint; invoked by Java with a reviewed mapping."""
import contextlib
import json
from datetime import date
from pathlib import Path
import sys

from .history import HistoryQuery, Listing, YahooHistoryClient


def main() -> int:
    try:
        raw = sys.stdin.buffer.read(4097)
        if len(raw) > 4096 or len(sys.argv) != 2:
            return 2
        request = json.loads(raw)
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
