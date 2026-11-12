
CREATE TABLE finn.source_document (
    document_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    company_id UUID NOT NULL,
    source_type VARCHAR(12) NOT NULL CHECK(source_type IN ('PRIMARY','NEWS')),
    initial_checksum CHAR(64) NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    UNIQUE(owner_id,document_id),
    UNIQUE(owner_id,company_id,source_type,initial_checksum),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX source_document_owner ON finn.source_document(owner_id,source_type,company_id);
CREATE TABLE finn.source_document_version (
    owner_id UUID NOT NULL,
    document_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    title VARCHAR(120) NOT NULL,
    source_name VARCHAR(120) NOT NULL,
    url VARCHAR(1000),
    attachment TEXT,
    checksum CHAR(64) NOT NULL,
    published_at TIMESTAMPTZ,
    ingested_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,document_id,revision),
    FOREIGN KEY(owner_id,document_id) REFERENCES finn.source_document(owner_id,document_id),
    CHECK (url IS NOT NULL OR attachment IS NOT NULL),
    CHECK (attachment IS NULL OR octet_length(attachment)<=49152)
);
GRANT SELECT,INSERT ON finn.source_document,finn.source_document_version TO finn_app;
GRANT UPDATE(revision) ON finn.source_document TO finn_app;
