# FINN frontend

React 19 and TypeScript frontend for an India-first portfolio intelligence and investment research platform.

## Repository status

The application provides OIDC sign-in, private portfolios, Groww holdings review, journal corrections and export, valuation and risk analysis, watchlists, alerts and reminders, source-linked company research, thesis reviews, and stock screening. The public overview uses fictional data.

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

Portfolio creates and selects INR tracking portfolios and friendly source accounts. History begins as unknown and becomes dated only when accepted records establish coverage. Archive/restore preserves accounts and readable history; archived portfolios cannot receive new financial writes. No broker login or account number is requested.

Open a source account to enter and review a prior transaction or closing opening balance. Financial values remain exact decimal text. A retry from the review screen resends the same command and reference. Corrections preserve the original journal record and append a reversal or replacement. Cash, cost, realised gains and fees visibly retain coverage gaps. Exchange selection is optional and explicit; holdings aggregate by security. No buy/sell record places an order.

On a Groww source account, choose the supported holdings `.xlsx` for a private preview. The upload sends bytes only, up to 5 MiB, and displays durable job status. Completed previews show reported versus calculated detail totals, source rows, missing mapping/currency information and row-level issues. A validated original is downloadable only by its owner. Preview/retry does not change holdings or post transactions.

An eligible first opening requires explicit INR and mapping confirmations and review of any discrepancies. Keep opening cost unknown or use the exact reported row buy values. The saved receipt distinguishes accepted holdings, skipped zero units and a matching duplicate. Changed rows or later reports do not overwrite holdings. Exchange listings can be confirmed separately in Securities.

Compare a later report with recorded holdings on its report date. Missing coverage, unknown cost, unmatched rows and differences remain visible. Acknowledging a comparison saves only a review for the current ledger revision, so later corrections cannot silently inherit an earlier review.

Corporate actions preview recorded units, cost, cash or symbol effects before confirmation. Source references and corrections stay attached. Splits/bonuses preserve total recorded cost, dividends use actual net credits, and fractional or complex actions are saved for manual review without changing holdings.

The working-directory guard rejects missing, relative and Git-internal locations. npm caches, Vite/Vitest caches, builds and reports stay under the external directory; only installed dependencies live in untracked `node_modules`. A production build is under `FINN_WORKSPACE_ROOT/build/frontend`. Deploy it with a same-origin `/api` reverse proxy; the development server is not a production host.


In Securities, open a reviewed NSE or BSE listing to enter a source-backed exchange close or request Yahoo daily history when the private worker is configured. In Portfolio, choose the listing to value each holding. Current totals show which positions are priced and which prices are stale. Build historical snapshots from same-date reviewed closes; gaps stay visible in the chart and table. Watchlists show prices without requiring ownership, and Market data status shows your acquisition history, coverage, and application limits.
Use Inbox for saved-close price rules, in-app notifications and delivery attempts, reminders, volume and concentration rules, and scheduled portfolio briefs. The company attention list shows the reviewed materiality and recorded holdings behind each event's rank.

Use Research to save and version primary sources, review and group company events, monitor announced dates, and record secondary news links. Run the fictional replay to see a separate scenario move through ranking, delivery, and a brief.

In Company workspace, choose a company to review business and governance highlights, financial statements, cash flow, and open questions. Extract evidence from a saved PDF or text source, then use the cited lines when reviewing a figure. Search by keyword, publication date, source type, and version. Saved research reports retain their citations and reviewed values across source updates. Local model ranking appears when enabled by the backend.

Use **Investment theses** to save a rationale, risks, milestones, and a review reminder. Check thresholds against reviewed figures. Use **Management guidance** to confirm a source statement and compare it with reported results as of a selected date. Create a review task from a reviewed event to link the evidence to the original thesis and record your decision.

Use **Discover** to register reviewed listings, inspect fundamental coverage, run saved screens, save matches to watchlists, and compare peers with adjustable weights. Open company research or model the candidate in a portfolio. **Portfolio** shows conditional XIRR, time-weighted return, concentration, weekly drawdown and volatility, and hypothetical allocation or price shocks.

## Verification

### Standalone fictional walkthrough

Run `npm run build:demo` with an external `FINN_WORKSPACE_ROOT`. Preview it locally with `npm run preview:demo` at `http://127.0.0.1:5180`. For static hosting, publish the contents of `FINN_WORKSPACE_ROOT/build/public-demo`. The walkthrough bundles only the fictional import, guidance, results, and thesis decision. Its browser makes no API or sign-in requests. The backend's `deployment/DEMO.md` explains how to replay the scenario through the actual application and database.

For a private release, serve the production build using `deployment/Caddyfile`. Set `FINN_WEB_ORIGIN` to the site's exact HTTPS origin, `FINN_WEB_BIND` to the intended listening interface, `FINN_BACKEND_UPSTREAM` to the loopback backend address, `FINN_IDENTITY_ORIGIN` to the sign-in provider's HTTPS origin, `FINN_STATIC_ROOT` to the immutable frontend build directory, and `FINN_CADDY_STORAGE` to a private directory for the proxy. Use forward slashes in Windows paths. Start Caddy with `caddy run --config deployment/Caddyfile --adapter caddyfile`. API and sign-in routes proxy to the backend. Only the frontend build directory is served as static content. [Caddy reverse proxy documentation](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)

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
