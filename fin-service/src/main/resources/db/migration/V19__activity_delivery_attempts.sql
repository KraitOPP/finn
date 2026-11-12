
ALTER TABLE finn.activity ADD COLUMN read_at TIMESTAMPTZ;
GRANT UPDATE(read_at) ON finn.activity TO finn_app;

CREATE TABLE finn.activity_delivery_attempt (
    owner_id UUID NOT NULL,
    activity_id UUID NOT NULL,
    channel VARCHAR(24) NOT NULL,
    attempt INTEGER NOT NULL CHECK (attempt BETWEEN 1 AND 3),
    outcome VARCHAR(24) NOT NULL CHECK (outcome IN ('DELIVERED','SUPPRESSED','PREVIEWED','RETRY','FAILED')),
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id, activity_id, channel, attempt),
    FOREIGN KEY(owner_id, activity_id, channel) REFERENCES finn.activity_delivery(owner_id, activity_id, channel)
);
CREATE TABLE finn.email_preview (
    owner_id UUID NOT NULL,
    activity_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id, activity_id),
    FOREIGN KEY(owner_id, activity_id) REFERENCES finn.activity(owner_id, activity_id)
);
GRANT SELECT, INSERT ON finn.activity_delivery_attempt, finn.email_preview TO finn_app;
