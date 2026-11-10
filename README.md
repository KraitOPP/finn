# FINN backend

Java and Spring Boot backend for an India-first portfolio intelligence and investment research platform.

## Repository status

Repository initialized. The application has not been scaffolded or implemented yet. Delivery follows the phased plan maintained separately from this repository.

## Planned responsibilities

- Portfolio transactions, cash movements, import reconciliation, and financial calculations.
- PostgreSQL persistence, identity and ownership checks, and auditable corrections.
- Market-data adapters for Yahoo Finance/yfinance and permitted official exchange end-of-day reports.
- Watchlists, reliable alerts, reminders, filings, news, and evidence-based research.
- Investment thesis tracking, management guidance comparisons, and explainable stock screening.

Java owns domain logic and database writes. A small Python yfinance adapter will be production source inside this repository when implemented; yfinance is a Python library. Its Indian-symbol coverage, freshness, and data-use conditions must be evaluated before live-data claims are made.

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
