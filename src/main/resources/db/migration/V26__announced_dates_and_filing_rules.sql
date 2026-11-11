
ALTER TABLE finn.company_event_version
    ADD COLUMN event_version_id UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN announced_dates JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD UNIQUE(owner_id,event_version_id),
    ADD CHECK(jsonb_typeof(announced_dates)='array' AND jsonb_array_length(announced_dates)<=5);

CREATE TABLE finn.filing_rule (
    rule_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    company_id UUID,
    title VARCHAR(80) NOT NULL,
    category VARCHAR(24) NOT NULL CHECK(category IN ('ANY','EARNINGS','CAPITAL','GOVERNANCE','CORPORATE_ACTION','OTHER')),
    minimum_materiality VARCHAR(12) NOT NULL CHECK(minimum_materiality IN ('ANY','MEDIUM','HIGH')),
    arrivals BOOLEAN NOT NULL,
    dates BOOLEAN NOT NULL,
    tentative BOOLEAN NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    revision INTEGER NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 1000000),
    UNIQUE(owner_id,rule_id),
    CHECK(arrivals OR dates),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX filing_rule_owner ON finn.filing_rule(owner_id,rule_id);
GRANT SELECT,INSERT ON finn.filing_rule TO finn_app;
GRANT UPDATE(enabled,revision) ON finn.filing_rule TO finn_app;

CREATE TABLE finn.event_date_notice (
    owner_id UUID NOT NULL,
    event_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    date_type VARCHAR(16) NOT NULL,
    scheduled_date DATE NOT NULL,
    certainty VARCHAR(12) NOT NULL,
    activity_id UUID NOT NULL,
    PRIMARY KEY(owner_id,event_id,rule_id,date_type),
    FOREIGN KEY(owner_id,event_id) REFERENCES finn.company_event(owner_id,event_id),
    FOREIGN KEY(owner_id,rule_id) REFERENCES finn.filing_rule(owner_id,rule_id),
    FOREIGN KEY(owner_id,activity_id) REFERENCES finn.activity(owner_id,activity_id)
);
CREATE INDEX event_date_notice_rule ON finn.event_date_notice(owner_id,rule_id);
GRANT SELECT,INSERT,DELETE ON finn.event_date_notice TO finn_app;
