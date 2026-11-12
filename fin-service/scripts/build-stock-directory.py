"""Build the private lookup index from separately downloaded NSE CSV files."""

import argparse
import csv
import json
import re
from datetime import date, datetime
from pathlib import Path


def rows(path):
    if path.stat().st_size > 2_000_000:
        raise ValueError("Unexpected stock directory file size")
    with path.open(encoding="utf-8-sig", newline="") as source:
        for row in csv.DictReader(source, skipinitialspace=True):
            yield {key.strip(): (value or "").strip() for key, value in row.items() if key}


def exchange_date(value):
    return datetime.strptime(value, "%d-%b-%Y").date()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("workspace", type=Path)
    parser.add_argument("equities", type=Path)
    parser.add_argument("symbol_changes", type=Path)
    args = parser.parse_args()
    workspace = args.workspace.resolve(strict=True)
    if not workspace.is_dir() or workspace == workspace.parent or any(
        (parent / ".git").exists() for parent in (workspace, *workspace.parents)
    ):
        raise ValueError("Use the external FINN workspace")

    recent_changes = {}
    for row in rows(args.symbol_changes):
        symbol = row["NEW SYMBOL"]
        effective = exchange_date(row["EFFECTIVE DATE"])
        recent_changes[symbol] = max(effective, recent_changes.get(symbol, date.min))

    listings = {}
    for row in rows(args.equities):
        symbol = row["SYMBOL"]
        name = row["NAME OF COMPANY"]
        series = row["SERIES"]
        isin = row["ISIN NUMBER"]
        if not (re.fullmatch(r"[A-Z0-9][A-Z0-9&._-]{0,63}", symbol)
                and re.fullmatch(r"[A-Z0-9_-]{1,16}", series)
                and re.fullmatch(r"IN[A-Z0-9]{9}[0-9]", isin)
                and 0 < len(name) <= 120):
            continue
        effective = max(exchange_date(row["DATE OF LISTING"]), recent_changes.get(symbol, date.min))
        if symbol not in listings or series == "EQ":
            listings[symbol] = {
                "exchange": "NSE", "symbol": symbol, "name": name, "series": series,
                "isin": isin, "validFrom": effective.isoformat(), "source": "NSE_DIRECTORY",
            }
    if not listings or len(listings) > 12_000:
        raise ValueError("Unexpected NSE directory coverage")
    folder = workspace / "data"
    folder.mkdir(exist_ok=True)
    if not folder.resolve().is_relative_to(workspace):
        raise ValueError("Keep the stock directory inside the external workspace")
    target = folder / "stock-directory.json"
    temporary = folder / ".stock-directory.building"
    with temporary.open("x", encoding="utf-8") as output:
        json.dump({"items": list(listings.values())}, output, ensure_ascii=False, separators=(",", ":"))
    temporary.replace(target)
    print(f"Prepared {len(listings)} NSE stock suggestions.")


if __name__ == "__main__":
    main()
