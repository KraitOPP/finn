
CREATE TABLE finn.brief_schedule (
    owner_id UUID PRIMARY KEY REFERENCES finn.app_user(user_id),
    scheduled_local TIMESTAMP NOT NULL,
    time_zone VARCHAR(64) NOT NULL,
    cadence VARCHAR(12) NOT NULL CHECK(cadence IN ('DAILY','WEEKLY')),
    include_alerts BOOLEAN NOT NULL,
    include_reminders BOOLEAN NOT NULL,
    include_company BOOLEAN NOT NULL,
    include_valuations BOOLEAN NOT NULL,
    enabled BOOLEAN NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 1000000),
    next_at TIMESTAMPTZ,
    CHECK(enabled=(next_at IS NOT NULL))
);
CREATE INDEX brief_due ON finn.brief_schedule(next_at,owner_id) WHERE enabled;
GRANT SELECT,INSERT ON finn.brief_schedule TO finn_app;
GRANT UPDATE(scheduled_local,time_zone,cadence,include_alerts,include_reminders,include_company,include_valuations,enabled,revision,next_at) ON finn.brief_schedule TO finn_app;

CREATE TABLE finn.brief_run (
    run_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    schedule_revision INTEGER NOT NULL,
    window_start TIMESTAMPTZ NOT NULL,
    window_end TIMESTAMPTZ NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,window_start,window_end),
    CHECK(window_end>window_start)
);
CREATE INDEX brief_runs_recent ON finn.brief_run(owner_id,window_end DESC,run_id);
GRANT SELECT,INSERT ON finn.brief_run TO finn_app;
