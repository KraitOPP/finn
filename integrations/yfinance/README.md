# Yahoo history acquisition

This is a small production acquisition library for the planned Java integration. It is not a running service, public API, portfolio calculator, or verified live feed. Java will own scheduling, validation against the canonical provider contract, persistence, source selection, and financial calculations.

The library requires Python 3.13 and the pinned `requirements.txt`. Install dependencies in an external virtual environment. Configure the caller's `PYTHONPATH` to include this directory's `src` until application packaging is introduced. Use `python -B -m unittest discover -s integrations/yfinance/tests` from the backend root, with `TEMP`/`TMP` pointing outside the checkout. Unit tests use fictional observations and make no network calls.

## Current scope

- Explicit `PRIVATE_PERSONAL` mode is required; public synthetic or unknown modes fail before any source request or cache creation.
- A request contains one to five already mapped NSE/BSE listings and a positive date window of at most 31 calendar days.
- Daily history uses inclusive start and exclusive end and excludes the current session. Intraday and streaming remain separate feasibility work.
- Adjustment and repair defaults are explicit. Close and Adjusted Close remain separate; both retain `PROVIDER_DEFINED` basis until source semantics are independently validated.
- Decimal and volume values become strings. Invalid/NaN values, impossible OHLC, missing timezone, duplicate dates, and out-of-range rows reject the listing result.
- Empty results remain unknown; provider failure remains unavailable. Neither becomes a zero price, unsupported-symbol declaration, or live quote.
- A daily bar's source index is retained; it is not claimed to be a last-trade/publication instant. Delay remains unknown.
- INR is the mapped-listing currency assumption, explicitly labelled. Full Java acceptance must validate source/currency and coverage rather than treating the adapter as authority.
- Cache storage must be outside Git checkouts. Logs, downloads, reports, and temporary files belong under the configurable external workspace.

Each listing is requested once by this wrapper. The provider timeout is per underlying request, not a guaranteed whole-process deadline; later process supervision must enforce job deadlines. The library does not implement its own retry loop or a second job system.

The return envelope is the internal acquisition-candidate format, version `0.1.0`, not the public market-data API contract. Its source policy is `RESTRICTED_UNVERIFIED`, with public display and external AI processing disabled. The private mode is a runtime boundary, not a claim that every intended data use has been licensed.

Actual provider observations and feasibility evidence are kept outside Git. Indian-symbol live streaming must be tested during an open market session. [yfinance documentation](https://ranaroussi.github.io/yfinance/), [history parameters](https://ranaroussi.github.io/yfinance/reference/api/yfinance.download.html).
