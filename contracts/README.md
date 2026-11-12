# FINN contracts

These contracts describe application and provider boundaries. Public contract 0.38.0 implements the fixed synthetic demo, identity, preferences, manual instrument catalogue, portfolios/accounts, immutable ledger, private holdings preview jobs and reviewed opening acceptance. Other market operations remain planned. This is not proof of provider coverage or legal data entitlements.

## Files and ownership

- `tooling/build_contracts.py` maintains the market-data definitions and route contract.
- `market-data.schema.json` is the committed JSON Schema Draft 2020-12 interchange artifact. Its default instance is `AcquisitionEnvelope`; named definitions are available under `$defs`.
- `public-api/openapi.json` is the OpenAPI 3.1.1 projection, with the same definitions under `components.schemas` and local references for client generation.
- `fixtures/valid/cases.json` contains deliberately generated securities, values, timestamps and status examples. No example is a real price, current market state, or source entitlement.
- `fixtures/invalid/cases.json` contains small negative mutations of those valid fixtures, with the error each must cause. It tests rejection rather than storing repetitive full invalid payloads.
- `tooling/validate_contracts.py` validates the schema, OpenAPI, projection consistency, fixtures, and explicit cross-field invariants. Its `validate_instance` function is reusable by adapter acceptance tests.
- `tooling/requirements.txt` pins direct check-tool dependencies; `requirements-lock.txt` pins their resolved dependency versions. Neither file installs an application framework.
- `imports/`, when present, owns separate portfolio/manual-file contracts. Market data and imported transactions are distinct domains.

## Verification

Use Python 3.10 or later in a virtual environment outside the checkout. The evaluated tool environment is Python 3.13. Configure `FINN_WORKSPACE_ROOT` to an external writable directory before creating the environment. Keep pip downloads, interpreter caches and test output outside the repository. Dependency installation needs network access only once; the contract checks make no network/provider calls.

From this repository, a Windows example is:

```powershell
$contractEnvironment = Join-Path $env:FINN_WORKSPACE_ROOT 'cache/backend-contract-tools'
python -m venv $contractEnvironment
$contractPython = Join-Path $contractEnvironment 'Scripts/python.exe'
$env:PYTHONDONTWRITEBYTECODE = '1'
& $contractPython -m pip --isolated --cache-dir (Join-Path $env:FINN_WORKSPACE_ROOT 'cache/pip-contracts') install --index-url https://pypi.org/simple -r contracts/tooling/requirements-lock.txt
& $contractPython contracts/tooling/build_contracts.py --check
& $contractPython contracts/tooling/validate_contracts.py
```

On systems with a `bin/` virtual-environment layout, use that environment's `bin/python`. The tools resolve contract paths from their own location, so they do not require a particular checkout folder name or sibling workspace layout. They do not write reports or temporary output during validation.

After an intentional contract change, run `build_contracts.py --write`, inspect both generated artifacts, run the checks, and update the frontend's pinned artifact/hash and generated client types. Commit the maintained definitions, projections and relevant fixtures together. A test failure must not be solved by automatically approving whatever hash happens to be present.

For a local candidate instance kept outside Git:

```powershell
& $contractPython contracts/tooling/validate_contracts.py --definition AcquisitionEnvelope --instance $candidateFile
```

The instance command prints only validity/error codes, never the source contents. No provider data file is required for ordinary tests.

## Financial and temporal semantics

All exact financial decimals are strings without exponent notation or separators. `PositiveDecimalString` forbids a zero present price. Missing close means no `PriceObservation`, not a zero-valued row. Volume is an integer string and may be unknown (`null`). No browser floating-point calculation becomes an authoritative ledger value.

The contract currently covers INR cash equities and one-day observations only. Stable listing IDs retain exchange, series and mapping context. NSE and BSE listings cannot be substituted simply because they belong to one company. ISIN can be unknown; ticker text is not a permanent identity.

Session dates, source observation/publication/availability instants, first-seen time, ingestion and acceptance are separate. Unknown source instants remain null and require matching reason codes. UTC instants end in `Z`; a daily-bar index is not an invented last-trade timestamp. Unknown delay has null seconds and never means real time. Calendar-aware freshness states remain independent from provider health and source delay.

An acquisition result may be complete, partial, or unavailable per requested listing. `COMPLETE` at that boundary means every listing supplied observations, not that every session in a date range is present. History coverage states whether the full requested range is known complete at `selectionSnapshotId`; `availableSessions` may exceed the current page length. Cursors must bind the listing, range, requested basis and immutable selection snapshot. Unsupported capabilities and missing history stay explicit.

Raw/as-reported and adjusted series have distinct bases. `auto_adjust=False` is not proof of original exchange prices. A present adjusted close requires a matching basis. Source revisions, parser version, quality, checksum where a file is the source, and policy metadata remain attached to observations. A future Java mapping/selection layer must choose usable data before valuation or alert evaluation.

## Schema validation and domain validation

JSON Schema and generated TypeScript checks validate wire shape, required fields, decimal/date syntax, status branches and nullability. They do not alone prove accounting correctness, source legitimacy, complete coverage, a valid exchange calendar, or identity equality across records.

The backend reference validator additionally rejects mismatched listing/provider identities, duplicate observations/results, impossible OHLC relationships, inconsistent adjusted values, reversed processing times, missing unknown-time reasons, false fresh/complete states, source/rights contradictions, unsafe source locators, incomplete capability sets, and error-code/status mismatches. These checks are contract acceptance tooling, not a claim that the future Java API already enforces them. Java must implement and test the same boundary invariants when applications are built.

Private/unreviewed source policy defaults to no public display and no external AI processing. A synthetic-public rights mode requires a synthetic source. Runtime `PUBLIC_SYNTHETIC` mode is an application policy guard separate from source rights metadata; Yahoo must be denied before fetching in that mode. Actual data access/reuse permission still requires review. No credential, private local path or signed private document URL belongs in public provenance or errors.

## Public API and release compatibility

The initial route contract covers listing search, latest stored EOD observation, stored daily history, source status/capabilities and owner-scoped background-job status. GET routes use a planned secure session boundary. Authentication/ownership, CSRF for future mutations, data storage, workers, actual pagination and server response enforcement are later implementation work.

`AsyncJobStatus` distinguishes queued, running, succeeded, partially succeeded, failed and cancelled snapshots. Queued jobs cannot claim start/finish times; running jobs cannot claim completion. Terminal states require finish times and safe codes distinguish failure/partial outcomes from success. Source values, private file locators and raw exceptions are absent. Created/start/finish/update ordering is a backend semantic check. The future worker must enforce legal transitions, increasing server revisions and immutable terminal states transactionally; retries create new job identities. A snapshot schema cannot enforce those cross-request rules. No job creation, cancellation or queue is implemented by this contract.

Unavailable data is a normal `200` domain result with explicit availability/freshness. Authentication, malformed requests, invalid parameters, rate limits and service failure use RFC 9457 `application/problem+json` with stable `code`, `traceId`, and safe validation fields. A private resource unavailable to the user returns `404` without exposing another owner's existence.

The backend owns the canonical contract version. The frontend consumes an immutable copy and checksum and generates client types without a runtime dependency on a sibling checkout. Independently tagged frontend/backend releases record the tested contract version/SHA pair. Even during `0.x`, changes to meaning, decimal units, enum states, required input, pagination or errors require compatibility review; they are not silently treated as harmless additions.
