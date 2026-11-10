# FINN frontend

React and TypeScript frontend for an India-first portfolio intelligence and investment research platform.

## Repository status

Repository initialized. The application has not been scaffolded or implemented yet. Delivery follows the phased plan maintained separately from this repository.

## Planned experience

- Responsive personal attention inbox and portfolio dashboard.
- Transaction import review, holdings, cash, performance, and watchlists.
- Prices with source, timestamp, freshness, and missing-data states.
- Configurable alerts, reminders, and daily or weekly briefs.
- Company research with evidence navigation, financial comparisons, and document access.
- Investment thesis notebook, guidance tracking, saved screens, and portfolio scenarios.

The frontend calls the Java backend. Broker credentials, data-provider credentials, AI credentials, and private source retrieval do not belong in browser code. Core financial calculations are authoritative on the backend.

## Repository boundaries

This repository contains application source, intentional tests and synthetic fixtures, configuration templates, and maintained developer documentation. Plans, memory, findings, raw data, scratch work, screenshots, recordings, caches, logs, build output, and generated test reports belong in the sibling `../project-workspace/` directory.

Use an external `FINN_WORKSPACE_ROOT` when running development tools. On a standalone checkout, configure that location outside the checkout. Dependency installation directories must remain untracked.

Never commit private portfolios, import files, credentials, downloaded market datasets, or AI transcripts. Public demos use synthetic data unless reuse rights are established.

## Development workflow

Implement one reviewed backlog feature at a time. Include accessible loading, empty, error, and stale-data states. Run checks appropriate to the change, inspect the staged files, and commit a coherent completed change using a simple one-line message such as `Add portfolio overview`.

Frontend and backend changes have separate commits. Keep their shared API contract versions compatible. Phase progress and decisions are maintained outside both repositories.
