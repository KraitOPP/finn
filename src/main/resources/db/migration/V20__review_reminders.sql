
CREATE TABLE finn.review_reminder (
    reminder_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    title VARCHAR(120) NOT NULL,
    scheduled_local TIMESTAMP NOT NULL,
    time_zone VARCHAR(64) NOT NULL,
    recurrence VARCHAR(12) NOT NULL CHECK (recurrence IN ('ONCE','DAILY','WEEKLY')),
    quiet_start TIME,
    quiet_end TIME,
    revision INTEGER NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 1000000),
    state VARCHAR(12) NOT NULL CHECK (state IN ('ACTIVE','CANCELLED','COMPLETED')),
    next_at TIMESTAMPTZ,
    UNIQUE(owner_id,reminder_id),
    CHECK ((state='ACTIVE')=(next_at IS NOT NULL)),
    CHECK ((quiet_start IS NULL)=(quiet_end IS NULL)),
    CHECK (quiet_start IS NULL OR quiet_start<>quiet_end)
);
CREATE INDEX reminder_due ON finn.review_reminder(next_at,reminder_id) WHERE state='ACTIVE';
CREATE INDEX reminder_owner ON finn.review_reminder(owner_id,next_at,reminder_id);
GRANT SELECT,INSERT ON finn.review_reminder TO finn_app;
GRANT UPDATE(title,scheduled_local,time_zone,recurrence,quiet_start,quiet_end,revision,state,next_at) ON finn.review_reminder TO finn_app;

CREATE TABLE finn.review_occurrence (
    occurrence_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    reminder_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    due_at TIMESTAMPTZ NOT NULL,
    deliver_at TIMESTAMPTZ NOT NULL CHECK(deliver_at>=due_at),
    UNIQUE(owner_id,reminder_id,revision,due_at),
    FOREIGN KEY(owner_id,reminder_id) REFERENCES finn.review_reminder(owner_id,reminder_id)
);
GRANT SELECT,INSERT ON finn.review_occurrence TO finn_app;
