
CREATE TABLE finn.monitor_rule (
    rule_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (owner_id, rule_id)
);
CREATE INDEX monitor_rules_owner ON finn.monitor_rule(owner_id, created_at DESC, rule_id);

CREATE TABLE finn.monitor_rule_version (
    owner_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK (revision BETWEEN 1 AND 100),
    listing_id UUID NOT NULL,
    name VARCHAR(80) NOT NULL,
    source VARCHAR(32) NOT NULL CHECK (source IN ('MANUAL_REVIEWED', 'YAHOO_YFINANCE')),
    comparison VARCHAR(20) NOT NULL CHECK (comparison IN ('ABOVE', 'BELOW', 'CROSS_ABOVE', 'CROSS_BELOW', 'MOVE_UP', 'MOVE_DOWN')),
    threshold NUMERIC(24,8) NOT NULL CHECK (threshold > 0),
    max_age_days INTEGER NOT NULL CHECK (max_age_days BETWEEN 1 AND 4),
    cooldown_minutes INTEGER NOT NULL CHECK (cooldown_minutes BETWEEN 0 AND 10080),
    rearm BOOLEAN NOT NULL,
    enabled BOOLEAN NOT NULL,
    expires_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (owner_id, rule_id, revision),
    FOREIGN KEY (owner_id, rule_id) REFERENCES finn.monitor_rule(owner_id, rule_id),
    FOREIGN KEY (owner_id, listing_id) REFERENCES finn.listing(owner_id, listing_id)
);
GRANT SELECT, INSERT ON finn.monitor_rule, finn.monitor_rule_version TO finn_app;
GRANT UPDATE(revision) ON finn.monitor_rule TO finn_app;
