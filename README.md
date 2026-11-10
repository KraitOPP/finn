# FINN frontend

React 19 and TypeScript frontend for an India-first portfolio intelligence and investment research platform.

## Repository status

The application displays a fictional stock snapshot and provides OIDC sign-in/out through the Java backend. It includes checked API types, source/freshness labels, loading/error states, retry and session-expiry feedback. No real portfolio is imported by this demo. Portfolio workflows are later feature slices.

## Run locally

Use Node.js 24.22.1 (also pinned in `.nvmrc`) and npm 11.19.1. From this repository, set an existing external working directory and install the reviewed lockfile:

```powershell
$env:FINN_WORKSPACE_ROOT = 'C:/path/to/private/finn-workspace'
New-Item -ItemType Directory -Force -Path $env:FINN_WORKSPACE_ROOT | Out-Null
node scripts/install.mjs
npm run dev
```

On Linux/macOS export the same variable, create that directory and run the same Node/npm commands. Open exactly `http://127.0.0.1:5173`. Start the backend and local identity provider using the backend README. The development server proxies `/api`, `/oauth2` and `/login/oauth2` to `http://127.0.0.1:8080`; configure server-side `FINN_BACKEND_ORIGIN` for another backend origin. Use the same paths behind a production same-origin HTTPS reverse proxy. No secret or provider credential belongs in a `VITE_` variable or browser storage.

The browser receives only a session profile and CSRF token, held in memory. Sign-out posts a native CSRF-protected form. Session status refreshes on focus and during recent activity; idle tabs stop polling, and expiry clears the account controls. Private feature views must additionally clear their own data when the authenticated identity changes. The backend remains authoritative for session expiry and resource access.

Keyboard-accessible workspace navigation links Overview, Portfolio, Watchlists, Inbox, Research and Settings. Private pages require a valid session and unmount when identity changes. Features awaiting later phases show explicit availability messages. Unknown links offer a route back to Overview.

Settings save account-specific IANA time zone and notification choices, defaulting to Asia/Kolkata and INR. Source timestamps remain unchanged; display formatting uses the saved zone. A stale revision asks the user to reload and review instead of overwriting another change. Notification choices do not enable delivery by themselves. Private responses are validated, bounded and held in memory; error details from the server are not rendered.

Securities searches the signed-in user's saved manual catalogue. Record companies and securities, inspect distinct NSE/BSE listings, and explicitly confirm exchange/series/symbol and optional Yahoo mapping. Search never selects the first ambiguous result. Missing mappings stay visible and block unsupported price assumptions. The catalogue does not claim all-market coverage. Names and source text render as plain React text.

The working-directory guard rejects missing, relative and Git-internal locations. npm caches, Vite/Vitest caches, builds and reports stay under the external directory; only installed dependencies live in untracked `node_modules`. A production build is under `FINN_WORKSPACE_ROOT/build/frontend`. Deploy it with a same-origin `/api` reverse proxy; the development server is not a production host.

## Verification

`npm run check` runs Biome lint, strict TypeScript, contract checks, component interaction tests and a production build. `node contracts/generate.mjs --check` verifies the pinned contract artifacts. Tests exercise loading, keyboard retry, safe errors, sign-in/out controls, CSRF form fields, expired-session clearing and rejection of private/incompatible demo responses.

The GitHub workflow uses the same checks, pinned official actions and production dependency auditing. The immutable canonical OpenAPI copy permits a standalone frontend checkout to verify its reviewed snapshot. When the sibling backend exists, generation/checking uses that authority and detects drift. Pair frontend/backend releases by contract version and manifest SHA; an independent frontend check cannot discover an unpublished upstream contract change.

## Available component

See [the contract boundary](contracts/README.md) for generation, compatibility checks, synthetic fixtures and verification instructions. Types are generated from the backend's versioned OpenAPI contract and committed with a source checksum so this checkout can be consumed independently. Planned API routes are not running services.

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
