# Official EOD file integration boundary

Phase 1 status: supported-file design and manual acquisition route identified; **no NSE/BSE CSV parser or automatic downloader is implemented**. Current schema/sample validation is pending because normal requests for the official NSE XLSX/sample ZIP timed out and the BSE report page rejected access. Do not substitute guessed headers or third-party schemas for that validation.

## Manual route

1. Use the official [NSE reports page](https://www.nseindia.com/all-reports). Select the intended completed trading date and `CM-UDiFF Common Bhavcopy Final (zip)`. The page states that legacy CM bhavcopy formats were discontinued from 8 July 2024.
2. Obtain the corresponding current format and sample from [NSE Forms and Formats](https://www.nseindia.com/static/resources/forms-formats-members), then compare the actual daily file with that schema. The page reviewed in November 2026 links an updated format workbook dated 30 June 2026.
3. For BSE, use its official [Bhav Copy page](https://www.bseindia.com/markets/MarketInfo/BhavCopy.aspx) and independently validate the current cash-equity file/specification. BSE is not enabled by an NSE parser profile.
4. Keep downloaded originals under `FINN_WORKSPACE_ROOT/data/phase1` during validation and later the configured private raw-downloads area. Do not copy actual exchange files into source fixtures. Upload/manual-file support is a fallback, not permission to bypass access restrictions.
5. Review the applicable storage/display/redistribution conditions before accepting data for its intended mode. The [NSE data policy](https://www.nseindia.com/static/market-data/nse-data-policy) makes rights agreement-dependent. Public demonstration defaults to synthetic data.

## Future parser acceptance boundary

The parser accepts bytes from a permitted downloaded file; it has no network access and never writes directly to the ledger/database. Java supplies a reviewed listing mapping and owns batch acceptance and selection. Use a versioned source profile validated against a retained specification and a current sample. Record which schema version and samples were actually checked.

- Restrict compressed input size, number of entries, expanded bytes, compression ratio, and allowed member names/types. Reject encrypted entries, symlinks, nested archives, traversal/absolute paths, multiple unexpected CSVs, invalid CRCs, and malformed encodings. Never extract untrusted paths.
- Require the source/segment/session date declared in the filename to agree with the profile and row content; reject provisional files when only final EOD is supported. A date string does not prove the exchange traded that day: a calendar or verified published report supplies the completed-session evidence.
- Validate required/duplicate headers, unknown-schema policy, row widths, exact decimal prices, integer share volumes, missing sentinels, exchange/series identity, and applicable OHLC relationships. No-trade rows need explicit source semantics before they can become valuations.
- Preserve source close definitions, finality, corporate-action basis, checksum, parser version, source revision, and original report locator. Never create an exact market observation/publication timestamp from a session date or file modification time.
- Use `contracts/market-data.schema.json` when mapping accepted records into the canonical acquisition envelope. Emit decimal strings and `AS_REPORTED_EXCHANGE` only for definitions established by the source. Unknown/unreviewed mapping or rights cannot be marked validated.
- File idempotency includes source/report/session, bytes hash, and revision. Changed bytes under an identical filename are a possible correction. Listing/session/basis/revision identity prevents duplicate observations across reprocessing; retain corrections rather than overwriting them silently.
- Batch acceptance is all-or-review according to an explicit policy, with accepted/rejected counts. This directory currently makes no ingestion, coverage, or current-date availability guarantee.

## Entry gate before adding parser source

Inspect a current official cash-market specification and file; create only synthetic fixtures matching the verified structure; implement targeted archive/schema/date/decimal/identity/revision checks; compare normalized records against the canonical market-data contract. Real private/exchange files and generated test outputs remain outside the repository. Until then, document the blocked data gate and continue independent contract work.
