# FINN backend

Java and Spring Boot backend for an India-first portfolio intelligence and investment research platform.

## Repository status

Phase 1 includes maintained market-data/API contracts, synthetic acceptance fixtures, a bounded Python Yahoo history client, and a normalized Excel import-preview contract. The Java application, database, upload parser and API endpoints have not been implemented yet. Delivery follows the phased plan maintained separately from this repository.

## Available components

- [Market-data and API contracts](contracts/README.md): exact decimals, listing identity, provenance, missing/stale states, planned routes and background-job states.
- [Yahoo history client](integrations/yfinance/README.md): bounded daily acquisition for explicitly mapped NSE/BSE listings in private mode. Streaming and universal coverage are unverified.
- [Portfolio import contract](contracts/imports/README.md): distinguishes executed trades, orders, holdings and cash movements. Groww Excel (`.xlsx`) is the selected input; actual workbook mapping awaits a redacted sample.
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
