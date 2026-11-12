CREATE TABLE finn.discovery_peer_rank (
    rank_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    run_id UUID NOT NULL,
    request_id UUID NOT NULL,
    methodology VARCHAR(32) NOT NULL,
    specification JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,request_id),
    FOREIGN KEY(owner_id,run_id) REFERENCES finn.discovery_screen_run(owner_id,run_id)
);
CREATE INDEX discovery_rankings_scope ON finn.discovery_peer_rank(owner_id,run_id,created_at DESC,rank_id);
GRANT SELECT,INSERT ON finn.discovery_peer_rank TO finn_app;
