CREATE TABLE finn.audit_event (
    event_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    action VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX audit_owner_time ON finn.audit_event(owner_id, recorded_at);
GRANT INSERT ON finn.audit_event TO finn_app;
