# Run the fictional FINN replay

The React walkthrough is a standalone static build in the frontend checkout. The replay below runs the same story through the real API and PostgreSQL workers. It uses an isolated local database, generated sign-in credentials, and a generated Groww-format workbook with two fictional holdings.

Use Java 25, Node 24, Docker Compose, PowerShell 7 and matching backend/frontend revisions. From the backend checkout, choose a fresh external directory and an unused Compose project name. These examples use loopback ports 5174, 8081, 8181 and 55433.

```powershell
$env:FINN_WORKSPACE_ROOT = 'C:/path/to/fresh/finn-replay'
New-Item -ItemType Directory -Path $env:FINN_WORKSPACE_ROOT | Out-Null
$env:FINN_LOCAL_WEB_PORT = '5174'
$env:FINN_LOCAL_IDENTITY_PORT = '8181'
$env:FINN_LOCAL_DB_PORT = '55433'
$env:FINN_DB_URL = 'jdbc:postgresql://127.0.0.1:55433/finn?currentSchema=finn'
$env:SERVER_PORT = '8081'
node scripts/setup.mjs
docker compose -p finn-demo up -d --wait
node scripts/maven.mjs release
$classpath = @('build/backend/test-classes','build/backend/classes') |
    ForEach-Object { Join-Path $env:FINN_WORKSPACE_ROOT $_ }
& (Join-Path $env:JAVA_HOME 'bin/java') -cp ($classpath -join [IO.Path]::PathSeparator) dev.finn.imports.SyntheticWorkbook
node scripts/maven.mjs run
```

In another terminal, from the frontend checkout, install the locked dependencies with `node scripts/install.mjs` using the same external directory. Set `FINN_BACKEND_ORIGIN=http://127.0.0.1:8081` and start `npm run dev -- --port 5174`. Keep provider and model integrations disabled for the replay.

In a third terminal, from the backend checkout, point the replay at that exact workspace and those loopback services:

```powershell
./scripts/Replay-SyntheticDemo.ps1 -Workspace 'C:/path/to/fresh/finn-replay'
```

The receipt should show two accepted rows, journal revision 2, missed guidance, a violated condition, one delivered alert and a revise decision. To explore the saved records, open the frontend and sign in with the `demo-two` entry in the isolated workspace's `secrets/identity/demo-users.json`. Keep generated credentials private.

Stop the two app processes and run `docker compose -p finn-demo stop` with the replay settings when finished. To replay from scratch, use another fresh directory and a unique Compose project. The script checks for an empty demo portfolio list before writing.
