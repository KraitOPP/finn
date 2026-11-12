
ALTER TABLE finn.monitor_rule ADD COLUMN next_check_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp();
CREATE INDEX monitor_rules_due ON finn.monitor_rule(next_check_at, rule_id);
GRANT UPDATE(next_check_at) ON finn.monitor_rule TO finn_app;

CREATE TABLE finn.monitor_rule_progress (
    owner_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    last_session DATE,
    last_trigger_at TIMESTAMPTZ,
    latched BOOLEAN NOT NULL,
    status VARCHAR(24) NOT NULL CHECK (status IN ('WAITING_FOR_PRICE','STALE','EVALUATED','INSUFFICIENT_HISTORY')),
    PRIMARY KEY (owner_id, rule_id, revision),
    FOREIGN KEY (owner_id, rule_id, revision) REFERENCES finn.monitor_rule_version(owner_id, rule_id, revision)
);
GRANT SELECT, INSERT ON finn.monitor_rule_progress TO finn_app;
GRANT UPDATE(last_session,last_trigger_at,latched,status) ON finn.monitor_rule_progress TO finn_app;

CREATE TABLE finn.monitor_evaluation (
    evaluation_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    rule_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    session_date DATE NOT NULL,
    observation_id UUID NOT NULL,
    previous_observation_id UUID,
    outcome VARCHAR(26) NOT NULL CHECK (outcome IN ('TRIGGERED','BELOW_OR_ABOVE_RESET','NO_MATCH','INSUFFICIENT_HISTORY','COOLDOWN','ALREADY_LATCHED')),
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (owner_id, rule_id, revision, session_date),
    FOREIGN KEY (owner_id, rule_id, revision) REFERENCES finn.monitor_rule_version(owner_id, rule_id, revision)
);
CREATE INDEX monitor_evaluation_recent ON finn.monitor_evaluation(owner_id, evaluated_at DESC, evaluation_id);
GRANT SELECT, INSERT ON finn.monitor_evaluation TO finn_app;

CREATE TABLE finn.activity (
    activity_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    kind VARCHAR(32) NOT NULL CHECK (kind IN ('PRICE_RULE','REVIEW_REMINDER','PORTFOLIO_BRIEF','VOLUME_RULE','ALLOCATION_RULE','COMPANY_EVENT')),
    subject_id UUID NOT NULL,
    dedupe_key VARCHAR(160) NOT NULL,
    title VARCHAR(160) NOT NULL,
    evidence_id UUID,
    available_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE (owner_id, activity_id),
    UNIQUE (owner_id, kind, dedupe_key)
);
CREATE INDEX activity_owner_recent ON finn.activity(owner_id,created_at DESC,activity_id);
GRANT SELECT, INSERT ON finn.activity TO finn_app;

CREATE TABLE finn.activity_delivery (
    owner_id UUID NOT NULL,
    activity_id UUID NOT NULL,
    channel VARCHAR(24) NOT NULL CHECK (channel IN ('IN_APP','EMAIL_PREVIEW')),
    status VARCHAR(24) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DELIVERED','SUPPRESSED','PREVIEWED','FAILED')),
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 3),
    next_attempt_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    failure_code VARCHAR(48),
    PRIMARY KEY (owner_id, activity_id, channel),
    FOREIGN KEY (owner_id, activity_id) REFERENCES finn.activity(owner_id, activity_id),
    CHECK ((status='PENDING')=(completed_at IS NULL))
);
CREATE INDEX activity_delivery_due ON finn.activity_delivery(next_attempt_at,activity_id,channel) WHERE status='PENDING';
GRANT SELECT, INSERT ON finn.activity_delivery TO finn_app;
GRANT UPDATE(status,attempts,next_attempt_at,completed_at,failure_code) ON finn.activity_delivery TO finn_app;
