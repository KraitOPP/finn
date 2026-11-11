# Frontend contract boundary

This folder is maintained application contract source, consumed by the React application. It contains no market data credentials, real prices, or personal portfolio records. Public contract 0.26.0 implements the fixed synthetic demo, identity/session, preferences, manual instrument catalogue, owner-scoped portfolios/accounts, immutable ledger, private holdings preview jobs and reviewed opening acceptance. Other market operations remain planned.

The backend's `contracts/public-api/openapi.json` is the public DTO authority. `generate.mjs` derives TypeScript types, the runtime schema snapshot, a byte-for-byte canonical OpenAPI copy and a version/SHA-256 manifest. Generated files are committed so a standalone frontend checkout can consume a reviewed snapshot; they are not a second handwritten schema authority. The sibling backend is authoritative when present; otherwise the generator verifies against the committed canonical copy. Explicit `--source` paths never fall back silently.

Use a Node.js runtime supporting erasable TypeScript to run the contract checks before the application tooling is introduced. Commands below assume the repository root and a sibling backend checkout:

```text
node contracts/generate.mjs
node contracts/generate.mjs --check
node --test contracts/checks/*.test.mjs
```

Set `FINN_WORKSPACE_ROOT` to an external working directory before the checks to run their temporary-file cases. A TypeScript compiler supplied by the development environment can additionally check `contracts/decode.ts`, `contracts/presentation.ts`, and `contracts/checks/typecheck.ts` with `--noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --allowImportingTsExtensions`. The compile-only cases detect widened generated money, availability, and delay types. No package installation in this repository is needed for this phase.

For another backend location, supply `--source=/absolute/path/to/openapi.json`. Review the generated diff and manifest when the backend contract changes. `--check` rejects drift, including documentation or metadata changes in the canonical file. It does not contact a server or imply that the planned API routes are implemented.

`decodeContract` validates untrusted JSON against the shipped schema before returning the corresponding generated TypeScript type. The deliberately bounded validator implements the schema subset accepted by the generator; unsupported validation keywords fail generation instead of being ignored. This is shape validation, not a replacement for backend financial, identity, cross-record, or source-rights invariants.

Timestamp decoding checks hour/minute/second ranges before parsing, preventing JavaScript's `24:00:00` normalisation. Leap-second timestamps are conservatively rejected because JavaScript cannot represent them consistently; the backend must normalise or explicitly handle such a source value before publishing it through this client contract.

Display mappings preserve unknown delay, source, observation time, session date, unavailable fields, and stale state. An ingestion timestamp is not a market observation timestamp. No mapping should substitute zero for a missing monetary value or infer a live feed from a recent receipt time. Financial calculation authority stays on the backend.

Background-job types distinguish queued/running snapshots from success, partial success, failure and cancellation. Runtime checks enforce state-dependent timestamp/code presence. The backend must additionally validate timestamp order, ownership, increasing revisions and legal transitions; client shape checks do not implement a worker.

Quote presentation defaults to public-demo restrictions. Private observations require the explicit `private` display mode; unexpected runtime modes remain restricted. This client guard supplements backend ownership/permission enforcement.

Tests use clearly fictional contract fixtures. Test scratch space, compiler caches, generated reports, and dependencies belong outside this repository under `FINN_WORKSPACE_ROOT`. The separate implementation workspace records phase progress; this README only documents maintained contract source.
