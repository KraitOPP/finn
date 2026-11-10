#!/usr/bin/env bash
set -euo pipefail

export FINN_APP_PASSWORD="$(cat /run/secrets/finn_app_password)"
export FINN_MIGRATION_PASSWORD="$(cat /run/secrets/finn_migration_password)"

psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv app_password FINN_APP_PASSWORD
\getenv migration_password FINN_MIGRATION_PASSWORD
CREATE ROLE finn_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'app_password';
CREATE ROLE finn_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD :'migration_password';
REVOKE ALL ON DATABASE finn FROM PUBLIC;
GRANT CONNECT ON DATABASE finn TO finn_app, finn_migrator;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA finn AUTHORIZATION finn_migrator;
GRANT USAGE ON SCHEMA finn TO finn_app;
SQL

unset FINN_APP_PASSWORD FINN_MIGRATION_PASSWORD
