CREATE TABLE finn.app_job (
    job_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id), resource_id UUID NOT NULL,
    kind VARCHAR(40) NOT NULL CHECK(kind IN ('GROWW_HOLDINGS_PREVIEW')),
    state VARCHAR(24) NOT NULL DEFAULT 'QUEUED' CHECK(state IN ('QUEUED','RUNNING','SUCCEEDED','PARTIALLY_SUCCEEDED','FAILED','CANCELLED')),
    revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0), attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
    available_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, lease_token UUID, lease_until TIMESTAMPTZ,
    started_at TIMESTAMPTZ, finished_at TIMESTAMPTZ, failure_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,job_id),
    CHECK((state='RUNNING')=(lease_token IS NOT NULL AND lease_until IS NOT NULL)),
    CHECK((lease_token IS NULL)=(lease_until IS NULL)),
    CHECK((state IN ('QUEUED','RUNNING'))=(finished_at IS NULL)),
    CHECK(state<>'QUEUED' OR started_at IS NULL),
    CHECK(state NOT IN ('RUNNING','SUCCEEDED','PARTIALLY_SUCCEEDED') OR started_at IS NOT NULL),
    CHECK((state IN ('FAILED','PARTIALLY_SUCCEEDED'))=(failure_code IS NOT NULL))
);
CREATE INDEX job_available ON finn.app_job(kind,state,available_at,created_at);
CREATE INDEX job_expiring ON finn.app_job(kind,lease_until) WHERE state='RUNNING';
GRANT SELECT,INSERT ON finn.app_job TO finn_app;
GRANT UPDATE(state,revision,attempts,available_at,lease_token,lease_until,started_at,finished_at,failure_code,updated_at) ON finn.app_job TO finn_app;

CREATE TABLE finn.import_source (
    import_id UUID PRIMARY KEY, owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL,
    current_job_id UUID NOT NULL, source_sha256 CHAR(64) NOT NULL,
    byte_size INTEGER NOT NULL CHECK(byte_size>0 AND byte_size<=5242880), contents BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK(octet_length(contents)=byte_size),
    UNIQUE(owner_id,import_id), UNIQUE(owner_id,account_id,source_sha256),
    FOREIGN KEY(owner_id,portfolio_id,account_id) REFERENCES finn.investment_account(owner_id,portfolio_id,account_id),
    FOREIGN KEY(owner_id,current_job_id) REFERENCES finn.app_job(owner_id,job_id)
);
CREATE INDEX import_source_account ON finn.import_source(owner_id,portfolio_id,account_id,created_at);
CREATE TABLE finn.import_preview (
    owner_id UUID NOT NULL, import_id UUID NOT NULL,
    job_id UUID NOT NULL, ledger_revision BIGINT NOT NULL CHECK(ledger_revision>=0),
    metadata JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(owner_id,import_id),
    FOREIGN KEY(owner_id,import_id) REFERENCES finn.import_source(owner_id,import_id),
    FOREIGN KEY(owner_id,job_id) REFERENCES finn.app_job(owner_id,job_id)
);
CREATE TABLE finn.import_preview_row (
    owner_id UUID NOT NULL, import_id UUID NOT NULL,
    row_number INTEGER NOT NULL CHECK(row_number BETWEEN 12 AND 1024), row_payload JSONB NOT NULL,
    PRIMARY KEY(owner_id,import_id,row_number),
    FOREIGN KEY(owner_id,import_id) REFERENCES finn.import_preview(owner_id,import_id)
);
GRANT SELECT,INSERT ON finn.import_source,finn.import_preview,finn.import_preview_row TO finn_app;
GRANT UPDATE(current_job_id) ON finn.import_source TO finn_app;
