#!/usr/bin/env bash
set -euo pipefail
export FINN_IDENTITY_PASSWORD="$(cat /run/secrets/finn_identity_password)"
psql --set ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\getenv identity_password FINN_IDENTITY_PASSWORD
SELECT format('CREATE ROLE finn_identity LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L', :'identity_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='finn_identity') \gexec
SELECT 'CREATE DATABASE finn_identity OWNER finn_identity'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='finn_identity') \gexec
REVOKE ALL ON DATABASE finn_identity FROM PUBLIC;
GRANT CONNECT ON DATABASE finn_identity TO finn_identity;
SQL
unset FINN_IDENTITY_PASSWORD
