
CREATE TABLE finn.company_event (
    event_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    company_id UUID NOT NULL,
    group_hash CHAR(64) NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    UNIQUE(owner_id,event_id),
    UNIQUE(owner_id,company_id,group_hash),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX company_event_owner ON finn.company_event(owner_id,company_id,event_id);
CREATE TABLE finn.company_event_version (
    owner_id UUID NOT NULL,
    event_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    document_id UUID NOT NULL,
    document_revision INTEGER NOT NULL,
    title VARCHAR(120) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK(category IN ('EARNINGS','CAPITAL','GOVERNANCE','CORPORATE_ACTION','OTHER')),
    subtype VARCHAR(32) NOT NULL CHECK(subtype IN ('RESULTS','RESULTS_MEETING','BUYBACK','CAPITAL_RAISE','AUDITOR','GOVERNANCE','DIVIDEND','SPLIT_BONUS','MERGER','OTHER')),
    stage VARCHAR(16) NOT NULL CHECK(stage IN ('ANNOUNCED','DECIDED','COMPLETED','CANCELLED','UNKNOWN')),
    materiality VARCHAR(12) NOT NULL CHECK(materiality IN ('HIGH','MEDIUM','LOW','UNKNOWN')),
    novelty VARCHAR(16) NOT NULL CHECK(novelty IN ('NEW','FOLLOW_UP','CORRECTION','ROUTINE','UNKNOWN')),
    fingerprint CHAR(64) NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,event_id,revision),
    UNIQUE(owner_id,event_id,fingerprint),
    FOREIGN KEY(owner_id,event_id) REFERENCES finn.company_event(owner_id,event_id),
    FOREIGN KEY(owner_id,document_id,document_revision) REFERENCES finn.source_document_version(owner_id,document_id,revision)
);
CREATE INDEX company_events_reviewed ON finn.company_event_version(owner_id,reviewed_at DESC,event_id);
GRANT SELECT,INSERT ON finn.company_event,finn.company_event_version TO finn_app;
GRANT UPDATE(revision) ON finn.company_event TO finn_app;
