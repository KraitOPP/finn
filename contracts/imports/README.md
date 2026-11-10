# Portfolio import preview contract

Version: 0.1.0. This is an internal normalized preview contract, not a Groww spreadsheet parser or a public HTTP route.

`portfolio-import-preview.schema.json` defines the values an eventual parser must produce before the user reviews a batch. No ledger writes or broker access are implemented here. The user has selected **Groww Excel (`.xlsx`)** as the initial report input. Actual column names, worksheets, report variants, fill semantics, charges, encryption, and row identity remain **unverified until a user-provided redacted export has been inspected**. Synthetic fixtures are deliberately invented and are not representations of a Groww export.

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
