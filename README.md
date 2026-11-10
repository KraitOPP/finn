# FINN backend

Java 25 and Spring Boot 4.1.2 backend for an India-first portfolio intelligence and investment research platform. PostgreSQL 18.6 stores application data; Java owns domain decisions and database writes.

## Repository status

The application foundation contains a fixed synthetic demo endpoint, a PostgreSQL migration, separate migration/runtime database roles, health/readiness checks and a default-deny API boundary. Identity and portfolio workflows are later feature slices. The existing Yahoo client returns unaccepted acquisition candidates; no live prices or user portfolios are served by the demo. Excel/EOD parsers are not implemented yet.

## Run locally

Use Node.js 24.22.1, a supported Java 25 LTS JDK (verified with Temurin 25.0.5+8), and Docker with Linux containers. The checksum-pinned Maven wrapper supplies Maven 3.9.16. No global Maven installation is required. Spring's [runtime requirements](https://docs.spring.io/spring-boot/system-requirements.html) describe compatibility.

From this repository in PowerShell, choose a private working directory outside every Git checkout:

```powershell
$env:FINN_WORKSPACE_ROOT = 'C:/path/to/private/finn-workspace'
$env:JAVA_HOME = 'C:/path/to/jdk-25'
New-Item -ItemType Directory -Force -Path $env:FINN_WORKSPACE_ROOT | Out-Null
node scripts/setup.mjs
docker compose up -d --wait postgres
node scripts/maven.mjs verify
node scripts/maven.mjs run
```

On Linux/macOS export the same variables and create the external directory, then use the same Node commands and Docker Compose command. The runner checks the working directory before starting Maven and keeps dependency downloads, wrapper files, JVM temporary files, compiled output and test reports under that directory. Use this runner rather than invoking Maven with arbitrary output paths.

Setup creates random development database passwords outside Git and preserves existing files. PostgreSQL bootstrap, migration and runtime identities are distinct: the runtime role cannot create tables or read migration history. Restore existing secrets if they are lost; setup does not reset passwords in an existing database. Stop only this project's services with `docker compose stop`; no data removal is part of startup or shutdown.

The API binds to `127.0.0.1:8080`. `GET /actuator/health/readiness` includes database availability but suppresses details. `GET /api/v1/demo/quote` serves a curated fictional quote using public contract 0.2.0. All other operations remain denied; there is no default account or generated login password. CSRF stays enabled, mutation endpoints are not public, and uploads are disabled.

Run the frontend separately and use its same-origin `/api` proxy. The packaged JAR is under `FINN_WORKSPACE_ROOT/build/backend`; running it needs Java and database configuration but does not need Node. Local development is not a production deployment or a completed authentication implementation.

## Verification

`node scripts/maven.mjs verify` compiles, tests and packages the application. Integration checks start a real PostgreSQL Testcontainer, apply migrations, verify replay/role restrictions, exercise the synthetic route and deny private requests. Docker must be available; missing Docker is a failure, not a silently skipped database test.

The GitHub workflow runs the application and existing Python contract/adapter checks without live providers or personal reports. Build actions and the PostgreSQL image are pinned to verified immutable identifiers. Python check tools must use external environments/caches; their component READMEs document standalone commands.

## Available components

- [Market-data and API contracts](contracts/README.md): exact decimals, listing identity, provenance, missing/stale states, planned routes and background-job states.
- [Yahoo history client](integrations/yfinance/README.md): bounded daily acquisition for explicitly mapped NSE/BSE listings in private mode. Streaming and universal coverage are unverified.
- [Portfolio import contract](contracts/imports/README.md): distinguishes executed trades, orders, holdings and cash movements. A Groww holdings `.xlsx` layout has been inspected and recorded as a review-gated profile; the secure reader and other report layouts remain pending.
- [Official EOD boundary](integrations/eod/README.md): acquisition references and parser acceptance requirements. Actual exchange-file schema validation remains pending; no EOD parser is shipped.

Each component documents its checks. Install dependencies and retain caches/output outside the checkout using `FINN_WORKSPACE_ROOT`.

## Planned responsibilities

- Portfolio transactions, cash movements, import reconciliation, and financial calculations.
- PostgreSQL persistence, identity and ownership checks, and auditable corrections.
- Market-data adapters for Yahoo Finance/yfinance and permitted official exchange end-of-day reports.
- Watchlists, reliable alerts, reminders, filings, news, and evidence-based research.
- Investment thesis tracking, management guidance comparisons, and explainable stock screening.

Java will own domain logic and database writes. The Python yfinance client is production source inside this repository because yfinance is a Python library; it currently returns acquisition candidates without Java mapping or persistence. Its Indian-symbol coverage, freshness, and data-use conditions require further evaluation before live-data claims are made.

## Repository boundaries

This repository contains production source, intentional tests and synthetic fixtures, configuration templates, API contracts, and maintained developer documentation. Planning and operational state live in the sibling `../project-workspace/` directory. That directory is local project material and is not uploaded with this repository.

Use an external `FINN_WORKSPACE_ROOT` for imports, provider downloads, caches, uploads, logs, temporary work, build output, and generated reports. On a standalone checkout, configure that location outside the checkout. Dependency installation directories must remain untracked.

Never store personal Groww reports, real portfolios, credentials, private company-document uploads, or copied market datasets in Git. Public demos use synthetic data unless reuse rights are established.

## Development workflow

Implement one reviewed backlog feature at a time. Run checks appropriate to the change, inspect the staged files, and commit a coherent completed change using a simple one-line message such as `Add transaction import validation`.

Frontend and backend changes have separate commits. Keep their shared API contract versions compatible. Operational requirements and phase progress are maintained outside both repositories.

## Data-source references

- [yfinance documentation](https://ranaroussi.github.io/yfinance/)
- [yfinance streaming reference](https://ranaroussi.github.io/yfinance/reference/yfinance.websocket.html)
- [NSE reports](https://www.nseindia.com/all-reports)

Market data can be missing, delayed, or unavailable. Source, observation time, and freshness must be visible in the application. Company research will retain primary-source evidence separately from news commentary.
