ALTER TABLE finn.activity DROP CONSTRAINT activity_kind_check;
ALTER TABLE finn.activity ADD CHECK(kind IN ('PRICE_RULE','REVIEW_REMINDER','PORTFOLIO_BRIEF','VOLUME_RULE',
    'ALLOCATION_RULE','COMPANY_EVENT','THESIS_REVIEW','RESEARCH_ALERT'));

CREATE TABLE finn.research_alert_rule (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    sentence VARCHAR(240) NOT NULL,
    rule_kind VARCHAR(24) NOT NULL CHECK(rule_kind IN ('EVENT','REVENUE_MARGIN')),
    scope VARCHAR(12) NOT NULL CHECK(scope IN ('ALL','HOLDINGS','WATCHLIST')),
    event_type VARCHAR(32),
    growth_percent NUMERIC(8,4),
    cadence VARCHAR(12) NOT NULL CHECK(cadence IN ('IMMEDIATE','DAILY','WEEKLY')),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    fingerprint CHAR(64) NOT NULL,
    UNIQUE(owner_id,rule_id),
    UNIQUE(owner_id,fingerprint),
    CHECK((rule_kind='EVENT' AND growth_percent IS NULL AND event_type IS NOT NULL) OR
          (rule_kind='REVENUE_MARGIN' AND growth_percent IS NOT NULL AND event_type IS NULL))
);

CREATE TABLE finn.research_alert_match (
    match_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    company_id UUID NOT NULL,
    title VARCHAR(160) NOT NULL,
    reason VARCHAR(450) NOT NULL,
    event_version_id UUID,
    revenue_fact_id UUID,
    revenue_revision INTEGER,
    revenue_prior_id UUID,
    revenue_prior_revision INTEGER,
    margin_fact_id UUID,
    margin_revision INTEGER,
    margin_prior_id UUID,
    margin_prior_revision INTEGER,
    due_at TIMESTAMPTZ NOT NULL,
    activity_id UUID,
    fingerprint CHAR(64) NOT NULL,
    UNIQUE(owner_id,rule_id,fingerprint),
    CHECK((event_version_id IS NULL)=(revenue_fact_id IS NOT NULL)),
    FOREIGN KEY(owner_id,rule_id) REFERENCES finn.research_alert_rule(owner_id,rule_id),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY(owner_id,event_version_id) REFERENCES finn.company_event_version(owner_id,event_version_id),
    FOREIGN KEY(owner_id,revenue_fact_id,revenue_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,revenue_prior_id,revenue_prior_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,margin_fact_id,margin_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,margin_prior_id,margin_prior_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,activity_id) REFERENCES finn.activity(owner_id,activity_id)
);
CREATE INDEX research_alert_due ON finn.research_alert_match(due_at,owner_id) WHERE activity_id IS NULL;
CREATE INDEX research_alert_activity ON finn.research_alert_match(owner_id,activity_id);
GRANT SELECT,INSERT ON finn.research_alert_rule,finn.research_alert_match TO finn_app;
GRANT UPDATE(enabled) ON finn.research_alert_rule TO finn_app;
GRANT UPDATE(activity_id,reason,title,event_version_id,revenue_fact_id,revenue_revision,revenue_prior_id,
    revenue_prior_revision,margin_fact_id,margin_revision,margin_prior_id,margin_prior_revision),DELETE
    ON finn.research_alert_match TO finn_app;
