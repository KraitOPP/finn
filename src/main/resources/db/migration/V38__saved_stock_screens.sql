CREATE TABLE finn.discovery_screen (
    screen_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    UNIQUE(owner_id,screen_id)
);
CREATE TABLE finn.discovery_screen_version (
    owner_id UUID NOT NULL,
    screen_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    definition JSONB NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,screen_id,revision),
    FOREIGN KEY(owner_id,screen_id) REFERENCES finn.discovery_screen(owner_id,screen_id)
);
CREATE TABLE finn.discovery_screen_run (
    run_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    screen_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    request_id UUID NOT NULL,
    methodology VARCHAR(32) NOT NULL,
    inputs JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,run_id),
    UNIQUE(owner_id,request_id),
    FOREIGN KEY(owner_id,screen_id,revision) REFERENCES finn.discovery_screen_version(owner_id,screen_id,revision)
);
CREATE INDEX discovery_screen_runs_scope ON finn.discovery_screen_run(owner_id,screen_id,created_at DESC,run_id);
GRANT SELECT,INSERT ON finn.discovery_screen,finn.discovery_screen_version,finn.discovery_screen_run TO finn_app;
GRANT UPDATE(revision) ON finn.discovery_screen TO finn_app;
