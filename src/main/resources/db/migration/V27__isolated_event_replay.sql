
CREATE TABLE finn.event_replay (
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    scenario INTEGER NOT NULL CHECK(scenario>0),
    run_id UUID NOT NULL UNIQUE,
    synthetic_owner_id UUID NOT NULL UNIQUE REFERENCES finn.app_user(user_id),
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,scenario),
    CHECK(owner_id<>synthetic_owner_id)
);
GRANT SELECT,INSERT ON finn.event_replay TO finn_app;
