# FINN

FINN is a private workspace for portfolio tracking, stock research and alerts. Sign in, search for a company, and open its daily prices or research.

| Directory | Application |
| --- | --- |
| [finn-ui](finn-ui) | React and TypeScript |
| [fin-service](fin-service) | Java, Spring Boot and PostgreSQL |

## Run locally

Use Docker Compose for PostgreSQL and Keycloak, Java 25 for the service, and Node.js 24 for the UI. Set an absolute `FINN_WORKSPACE_ROOT` outside this checkout. Keep the same workspace across restarts to retain identities and records.

From `fin-service`, follow the [backend setup](fin-service/README.md), including `node scripts/setup.mjs`, `node scripts/dev-services.mjs` and `node scripts/maven.mjs run`. From `finn-ui`, run `node scripts/install.mjs` once and `npm run dev`. Open `http://127.0.0.1:5173`.

Set up [stock suggestions](fin-service/deployment/STOCK_DIRECTORY.md) and the [private Yahoo worker](fin-service/integrations/yfinance/README.md#run-private-daily-downloads) to use completed-session prices. The [research configuration](fin-service/README.md) includes optional local model ranking.

## Verify and deploy

GitHub Actions run both component suites. The backend OpenAPI contract in this checkout drives the reviewed frontend bindings. [Private deployment and recovery](fin-service/deployment/RELEASE.md) · [Fictional API replay](fin-service/deployment/DEMO.md)
