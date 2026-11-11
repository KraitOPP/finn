
CREATE TABLE finn.indicator_rule (
    rule_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    listing_id UUID NOT NULL,
    portfolio_id UUID,
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('VOLUME','ALLOCATION')),
    title VARCHAR(80) NOT NULL,
    threshold NUMERIC(16,8) NOT NULL CHECK(threshold>0),
    revision INTEGER NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 1000000),
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    latched BOOLEAN NOT NULL DEFAULT FALSE,
    last_session DATE,
    result VARCHAR(24) NOT NULL DEFAULT 'WAITING' CHECK(result IN ('WAITING','INSUFFICIENT_COVERAGE','EVALUATED')),
    next_check_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,rule_id),
    CHECK ((kind='ALLOCATION')=(portfolio_id IS NOT NULL)),
    FOREIGN KEY(owner_id,listing_id) REFERENCES finn.listing(owner_id,listing_id),
    FOREIGN KEY(owner_id,portfolio_id) REFERENCES finn.portfolio(owner_id,portfolio_id)
);
CREATE INDEX indicator_due ON finn.indicator_rule(next_check_at,rule_id) WHERE enabled;
CREATE INDEX indicator_owner ON finn.indicator_rule(owner_id,rule_id);
GRANT SELECT,INSERT ON finn.indicator_rule TO finn_app;
GRANT UPDATE(threshold,revision,enabled,latched,last_session,result,next_check_at) ON finn.indicator_rule TO finn_app;

CREATE TABLE finn.indicator_evaluation (
    evaluation_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    session_date DATE NOT NULL,
    threshold NUMERIC(16,8) NOT NULL,
    metric TEXT NOT NULL,
    baseline_start DATE,
    input_ids JSONB NOT NULL,
    holding_value TEXT,
    equity_value TEXT,
    triggered BOOLEAN NOT NULL,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,rule_id,revision,session_date),
    FOREIGN KEY(owner_id,rule_id) REFERENCES finn.indicator_rule(owner_id,rule_id)
);
GRANT SELECT,INSERT ON finn.indicator_evaluation TO finn_app;
