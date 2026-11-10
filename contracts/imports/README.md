# Portfolio import preview contract

Version: 0.2.0. This is an internal normalized preview contract, not a Groww spreadsheet parser or a public HTTP route. It is versioned separately from the market-data public API, which remains 0.1.0.

`portfolio-import-preview.schema.json` defines the values an eventual parser must produce before the user reviews a batch. No ledger writes or broker access are implemented here. One user-supplied Groww stock-holdings `.xlsx` layout has been inspected read-only. The [holdings profile](profiles/groww-holdings-xlsx-v1.json) records its headers, date caption, summary locations and mapping requirements without any source filename, account identity, securities or financial values. It is observed layout evidence, not an enabled parser or proof of other Groww variants. Trade/order/cash layouts and execution/charge semantics remain unverified.

The entirely invented `fixtures/groww-holdings.synthetic.json` illustrates the normalized shape. It is not a copied/redacted real portfolio or a workbook fixture.

## Observed holdings profile

The observed worksheet is `Sheet1`, with date caption at `A4`, summary labels/values at `A7:B9`, headers at `A11:H11` and detail from row 12. The exact caption prefix is `Holdings statement for stocks as on ` followed by `dd-MM-uuuu`. Use strict date parsing and reject invalid dates; the filename is not the report-date authority. Validate header names, column order and summary labels before mapping; unsupported layouts must not be guessed. Preserve original row locations when skipping blank rows, and reject unexpected nonblank footer/data layouts until supported.

Map stock name as a source display label, ISIN as a security lookup hint, quantity as reported whole units and average buy price as reported cost information. The source does not provide an exchange or ticker: leave both unresolved until the instruments/review step identifies an appropriate listing. ISIN alone must not silently choose an NSE/BSE venue. A reported average is not purchase dates, FIFO lots, fees or a verified tax basis.

Version 0.2.0 adds optional `reportedName`, `reportedClosingPrice`, `reportedValues` and `reportedHoldingsSummary`. Existing snapshot fields remain; callers must explicitly adopt the new contract version. All reported amounts retain source precision as decimal strings, including negative unrealised P&L. Missing values stay null. A reported zero close may be retained as evidence and flagged for review; it is never a valid positive market-price observation or an automatic valuation. Source closing values belong to the report date, with no fabricated last-trade timestamp or live-feed claim.

No explicit currency code was present in the reviewed layout. The initial profile requires the account's INR context to be confirmed during review. Do not infer currency from a filename, the magnitude of numbers or a security's name.

The future Java reader must reconcile detail buy/closing/P&L amounts with the separately retained source summary and check row arithmetic with exact `BigDecimal` values. The profile's initial INR 0.01 comparison tolerance is a provisional review policy, not a verified Groww rounding guarantee. Preserve both sides of any mismatch, emit `SUMMARY_TOTAL_MISMATCH`, and block acceptance until reviewed; do not overwrite a source summary with a recomputed value, spread a difference across holdings or create fictitious transactions. One inspected sample showed that this reconciliation gate is necessary. Reconciliation, source-date equality, listing resolution, currency confirmation, duplicate-security checks and ownership are Java semantic checks not implemented by this JSON Schema.

The supported outcome is an opening snapshot with `historyCoverage: SNAPSHOT_ONLY`; no trade history, realised P&L, dividends, cash flows or XIRR can be established from this report alone. Observed layout evidence does not change `sourceMappingStatus` to `VALIDATED`: the future secure reader must establish a supported profile and complete its acceptance checks first.

## Boundaries

- Derive the owner/account authorization from the authenticated Java request; never accept a trusted owner ID from a file. `accountId` below is only an internal target that the application must authorize.
- `previewOnly` is always true. An eventual commit command is a separate operation with explicit user confirmation, reviewed mapping, batch revision, and scoped idempotency key.
- `sourceMappingStatus: UNVERIFIED` forces `batchStatus: MAPPING_REQUIRED`. Its rows cannot be marked acceptable or duplicate. This prevents a contract fixture from masquerading as a tested Groww mapping.
- `sourceFormat` records `XLSX`, `MANUAL`, or `SYNTHETIC`; Groww report previews currently require `XLSX`. This declaration does not prove the uploaded bytes are an Excel workbook or enable an unimplemented parser. Optional `sourceSheet` preserves the original worksheet name alongside the original one-based `sourceRowNumber`; it never names an output path or acts as a transaction ID.
- Executed trades, non-posting orders, opening holdings, and cash movements are different row types. A cancelled/open order never changes holdings. A holdings snapshot never manufactures purchase dates, sale history, or historic returns.
- Prices, quantities, and money are exact decimal strings; cash direction and trade side are explicit. Unknown charges are null, not zero. Dates are ISO session/report dates; optional execution instants require a supported timezone conversion rather than guessed midnight.
- Invalid source values become a `REJECTED_INPUT` row containing a locator, fingerprint, and issue codes only. Do not copy malformed raw financial text into a normalized field merely to display a parser error.
- Resolve security/listing identity through the instruments module. Ticker text alone is insufficient; `listingId` remains null until reviewed. NSE and BSE are distinct listings.
- Original files, passwords, raw rows, private identifiers, parser outputs, and validation reports stay under external `FINN_WORKSPACE_ROOT/data` or `artifacts`, never in a source fixture or log. An export password is not a schema field.

## File and row identity

The future file identity is scoped by authenticated owner, account, source, report type, declared period/as-of date, and SHA-256. An identical original can be recognised without accepting the same transactions twice. A filename alone is never an idempotency key.

Prefer stable source execution/fill IDs for trade identity. Order ID alone cannot identify multiple partial fills. If stable source IDs are absent, retain a canonical row fingerprint plus mapping/parser version and require a defined overlap-review policy. Two genuinely distinct identical-looking trades must not be silently merged. The same source ID with changed financial content becomes a conflict requiring review, not a duplicate.

`sourceRowNumber` and optional `sourceSheet` preserve an original workbook locator where available; they are not transaction identifiers. Row numbers must not be renumbered after skipping title/header/blank rows. Each normalized row carries issues and a source fingerprint, with no copied raw financial text. A future importer must validate fees, quantities, cash effects, source period, and identity semantics in Java in addition to this structural schema.

## Planned XLSX acceptance policy

No workbook reader is implemented in this phase. The later reader will treat XLSX as an untrusted OOXML ZIP package and apply the following policy before producing preview rows:

- Check file bytes, declared content types, workbook relationships, and the presence of expected workbook/worksheet parts. A `.xlsx` suffix is insufficient. Legacy `.xls`, macro-enabled `.xlsm`/`.xlsb`, renamed files, encrypted/password-protected packages, and unknown report layouts remain unsupported until separately reviewed.
- Enforce bounded upload size, compressed and expanded member sizes, aggregate expanded bytes, member count, compression ratio, worksheet count, row/column counts, cell/shared-string length, XML depth, and parse time. Initial proposed ceilings are 20 MiB upload, 100 MiB total expanded content, 512 package members, 100,000 data rows, and 256 columns per imported worksheet; these are design proposals to validate against the real export, not active limits in an existing parser.
- Reject ZIP traversal/absolute paths, symlinks, duplicate package member names, corrupt CRCs, nested archive payloads, and unexpected executable/embedded content. Read package members through bounded streams without extracting arbitrary paths. The workspace's single-CSV archive experiment is not an XLSX validator.
- Disable DTDs, entity expansion, XInclude, external resource resolution, and network access in XML processing. Resolve only allowed internal OOXML part relationships, enforcing package boundaries and expansion limits before parsing shared strings or sheets.
- Reject macros/VBA, ActiveX/OLE objects, embedded packages, external workbook links, external hyperlinks/relationships, data connections/query tables, DDE-style references, and formula cells including shared/array formulas. Never run Excel/LibreOffice, evaluate formulas, trust cached formula results, refresh connections, or follow supplied links. A real export containing formulas will require a separately reviewed static-values import workflow rather than weakening this policy implicitly.
- Inspect only selected recognized report sheets after layout validation. Preserve dates, decimal text, units, sheet names, and original row locators; reject unsupported date systems or ambiguous numeric/date conversions instead of guessing. No parser may transform an order into a fill without actual execution evidence.
- Return safe issue codes and locators for invalid rows, not raw sensitive content. Use a private, bounded local process for any future password-protected-report support; the project never requires a PAN/password in chat or source.

## Verification

Run `python -B -m unittest discover -s contracts/imports/tests` from the backend root in an environment with `jsonschema==4.26.0`. Tests validate the schema and deliberately synthetic examples, including exact-money values, dates, quantities, source format, worksheet locators, and unverified mappings that try to mark a row acceptable. No test downloads data, opens or validates an XLSX package, implements the planned reader restrictions, or creates an application.

The dependency is a contract-development tool, not an application runtime. Configure environment/dependency caches and generated output outside the checkout. Phase 2 will consolidate contract checks into the normal backend build.
