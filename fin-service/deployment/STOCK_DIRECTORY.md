# Prepare stock search

Signed-in users can search stocks by company name or ticker. The Java service uses a local NSE equity snapshot when available. It also uses the opt-in Yahoo worker for BSE lookup and as a fallback for NSE when the snapshot is missing. Yahoo results identify the provider ticker and exchange. Their ISIN and exchange group are unavailable. Matching a Groww position requires an exact ISIN in the NSE snapshot.

For a private installation, download the NSE **Securities available for Equity segment** and **Changes in Symbols** CSV files to the external working directory. Keep source files and the derived index out of Git. [NSE published securities and symbol changes](https://www.nseindia.com/static/market-data/securities-available-for-trading)

```powershell
python.exe -B scripts/build-stock-directory.py $env:FINN_WORKSPACE_ROOT $NseEquitiesCsv $NseSymbolChangesCsv
```

The script writes `data/stock-directory.json` inside the external workspace. Restart the Java service to load an updated snapshot. The index uses the later of the listing date and the recorded symbol change. The current Yahoo mapping is derived from the selected symbol and supported exchange. A request uses a recent completed-session window and follows the normal Yahoo checks and quotas. Prices can remain unavailable if the provider has no rows.

Selection uses the authenticated owner's catalogue. Selecting the same exchange and symbol returns its saved listing. A selected exact ISIN can resolve the imported security in place. An existing incompatible ISIN needs review. The stock view shows a source and session date when a close is available.
