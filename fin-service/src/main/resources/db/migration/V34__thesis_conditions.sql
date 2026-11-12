CREATE TABLE finn.thesis_condition (
    condition_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    thesis_id UUID NOT NULL,
    thesis_revision INTEGER NOT NULL,
    label VARCHAR(100) NOT NULL,
    dimensions JSONB NOT NULL,
    comparator VARCHAR(4) NOT NULL CHECK(comparator IN ('GTE','LTE')),
    threshold NUMERIC(40,8) NOT NULL,
    scale VARCHAR(12) NOT NULL CHECK(scale IN ('ONES','THOUSAND','LAKH','MILLION','CRORE','BILLION')),
    retired BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,condition_id),
    FOREIGN KEY(owner_id,thesis_id,thesis_revision) REFERENCES finn.investment_thesis_version(owner_id,thesis_id,revision)
);
CREATE INDEX thesis_condition_scope ON finn.thesis_condition(owner_id,thesis_id,created_at);
CREATE TABLE finn.thesis_condition_check (
    check_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    condition_id UUID NOT NULL,
    thesis_id UUID NOT NULL,
    thesis_revision INTEGER NOT NULL,
    input_key CHAR(64) NOT NULL,
    state VARCHAR(16) NOT NULL CHECK(state IN ('MATCHED','VIOLATED','UNKNOWN','REVIEW_NEEDED')),
    reason VARCHAR(32) NOT NULL,
    fact_id UUID,
    fact_revision INTEGER,
    evaluated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,condition_id,input_key),
    CHECK((fact_id IS NULL)=(fact_revision IS NULL)),
    FOREIGN KEY(owner_id,condition_id) REFERENCES finn.thesis_condition(owner_id,condition_id),
    FOREIGN KEY(owner_id,thesis_id,thesis_revision) REFERENCES finn.investment_thesis_version(owner_id,thesis_id,revision),
    FOREIGN KEY(owner_id,fact_id,fact_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision)
);
CREATE INDEX thesis_condition_checks ON finn.thesis_condition_check(owner_id,condition_id,evaluated_at DESC,check_id);
GRANT SELECT,INSERT ON finn.thesis_condition,finn.thesis_condition_check TO finn_app;
GRANT UPDATE(retired) ON finn.thesis_condition TO finn_app;
