
CREATE TABLE finn.company_event_attention (
    owner_id UUID NOT NULL,
    event_id UUID NOT NULL,
    read_revision INTEGER CHECK(read_revision BETWEEN 1 AND 100),
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    snoozed_until TIMESTAMPTZ,
    PRIMARY KEY(owner_id,event_id),
    FOREIGN KEY(owner_id,event_id) REFERENCES finn.company_event(owner_id,event_id),
    FOREIGN KEY(owner_id,event_id,read_revision) REFERENCES finn.company_event_version(owner_id,event_id,revision)
);
GRANT SELECT,INSERT ON finn.company_event_attention TO finn_app;
GRANT UPDATE(read_revision,muted,snoozed_until) ON finn.company_event_attention TO finn_app;
