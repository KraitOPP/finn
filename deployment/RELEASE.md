# Deploy and recover FINN

## Private installation

Use matching frontend and backend contract versions. Run `node scripts/maven.mjs release` in a dedicated release workspace to clear previous classes and migrations before verification and packaging. Build the frontend with `npm run build`. Keep each release's jar and static assets in a dedicated immutable directory. Record their commit IDs, contract version, and digests. The private reverse proxy configuration is in the frontend checkout under `deployment/Caddyfile`.

Use a PostgreSQL 18 database with separate bootstrap, migration, application, and identity-provider roles. The local bootstrap example is in `deployment/postgres`. For an external database configure TLS verification and grant the same restricted application permissions. Provision the database and roles before starting the application. Use a production OIDC provider over HTTPS with client ID `finn-web`, authorization code and PKCE, the exact `/login/oauth2/code/finn` callback, and the configured site as the logout return. Control provider enrolment in the identity service.

Configure the backend process with an absolute external `FINN_WORKSPACE_ROOT`, `FINN_PUBLIC_ORIGIN`, `FINN_OIDC_ISSUER`, and `FINN_DB_URL`. Provide `finn.oidc.client-secret`, `spring.datasource.password`, and the deployment-time `spring.flyway.password` as private mounted files in `FINN_WORKSPACE_ROOT/secrets/backend`. The server binds to loopback. Optional providers are disabled unless explicitly configured. Launch the packaged jar with Java 25. Use a supervisor with a dedicated service account. The local profile and development identity services are for the loopback rehearsal.

During migration, keep the previous release and its backup. Start the new jar with Flyway validation enabled and the migration secret mounted. Verify `/actuator/health/readiness` on the backend's loopback port and confirm the public contract endpoint has the frontend's expected version. For a separate normal runtime start, disable Flyway with `SPRING_FLYWAY_ENABLED=false` after migration and remove the migration secret from that process. Confirm readiness, a fresh login, one owner-scoped read, and a synthetic test where possible before opening traffic. Configure availability monitoring from a trusted network.

## Encrypted archive and recovery

For the supported PostgreSQL container, `scripts/database-archive.mjs` uses the bootstrap operator's local socket access. Use a dedicated backup operator and a secret manager for a 32-byte archive key. Create a temporary private key file inside the external working directory with restricted filesystem permissions when the operator runs the command. Keep the managed copy separate from the database archive. Keep archives outside Git and outside the static root.

```powershell
node scripts/database-archive.mjs backup $PostgresContainer finn $EncryptedAppArchive $ArchiveKeyFile
node scripts/database-archive.mjs backup $PostgresContainer finn_identity $EncryptedIdentityArchive $ArchiveKeyFile
```

Each logical database dump is encrypted and authenticated with AES-256-GCM. The application archive excludes Spring session rows. This helper handles logical dumps up to 256 MiB because restore authenticates the complete payload in memory before invoking PostgreSQL. For larger databases, use managed encrypted backups with a tested point-in-time recovery process. Keep role provisioning, provider configuration, and secret recovery separate from database archives. Take coordinated backups for migrations that affect both identity and application data.

Restore into a new empty database in a cluster with the same role names and grants available. Use trusted archives made by the operator. The helper verifies the authentication tag before sending plaintext to PostgreSQL, checks the target is empty, and restores in one transaction. Restore each database separately.

```powershell
docker exec $PostgresContainer createdb -U finn_bootstrap finn_restore
node scripts/database-archive.mjs restore $PostgresContainer finn_restore $EncryptedAppArchive $ArchiveKeyFile
```

For a separate local identity recovery, create its target database with owner `finn_identity`, restore the identity archive and set `FINN_LOCAL_IDENTITY_DATABASE` to that target before recreating the isolated identity service. Reapply deployment-specific database connection grants and schema privileges before making a restored database reachable.

Reconcile known opening units and journal revisions, document versions and citations, review decisions, and delivered activity counts. Require a fresh login after restore and invalidate restored provider sessions according to the identity provider's runbook. Validate data and identities before assigning traffic.

For rollback, stop new writes and preserve the failed environment for investigation. If the schema changed, restore the backup taken before the upgrade into a new database and point the previous jar at it. Deploy the matching previous frontend assets. Verify the previous migration and contract versions, readiness, sign-in and reconciliation. The restore point excludes later writes. Reconcile any accepted transactions after the backup before restoring write access. Test the rollback with fictional data and document the measured recovery time for the deployment.

Set a deployment-specific backup expiry and a procedure for disposing of retired datasets. Retained uploads and evidence require tenant-aware retention decisions. An isolated single-owner installation can be retired by decommissioning its dedicated database, private files and managed backup copies after export and retention requirements are met. Hosted multi-user onboarding requires a verified tenant erasure procedure.

[PostgreSQL pg_dump](https://www.postgresql.org/docs/18/app-pgdump.html) · [PostgreSQL pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)
