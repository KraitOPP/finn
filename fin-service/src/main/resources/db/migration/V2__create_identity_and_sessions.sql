CREATE TABLE finn.app_user (
    user_id UUID PRIMARY KEY,
    issuer VARCHAR(512) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    display_name VARCHAR(120) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(issuer, subject)
);

CREATE TABLE finn.spring_session (
    primary_id CHAR(36) PRIMARY KEY,
    session_id CHAR(36) NOT NULL UNIQUE,
    creation_time BIGINT NOT NULL,
    last_access_time BIGINT NOT NULL,
    max_inactive_interval INTEGER NOT NULL,
    expiry_time BIGINT NOT NULL,
    principal_name VARCHAR(255)
);
CREATE INDEX spring_session_expiry ON finn.spring_session(expiry_time);
CREATE INDEX spring_session_principal ON finn.spring_session(principal_name);
CREATE TABLE finn.spring_session_attributes (
    session_primary_id CHAR(36) NOT NULL REFERENCES finn.spring_session(primary_id) ON DELETE CASCADE,
    attribute_name VARCHAR(200) NOT NULL,
    attribute_bytes BYTEA NOT NULL,
    PRIMARY KEY(session_primary_id, attribute_name)
);

GRANT SELECT, INSERT ON finn.app_user TO finn_app;
GRANT UPDATE(display_name) ON finn.app_user TO finn_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON finn.spring_session, finn.spring_session_attributes TO finn_app;
