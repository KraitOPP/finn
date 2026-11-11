ALTER TABLE finn.app_job DROP CONSTRAINT app_job_kind_check;
ALTER TABLE finn.app_job ADD CHECK (kind IN ('GROWW_HOLDINGS_PREVIEW','YAHOO_DAILY_HISTORY','RESEARCH_EXTRACT','RESEARCH_ANSWER'));

CREATE INDEX research_anchor_words ON finn.research_anchor USING gin(to_tsvector('simple',quote));
CREATE TABLE finn.research_report (
    report_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    question VARCHAR(320) NOT NULL,
    policy_version VARCHAR(30) NOT NULL,
    model_name VARCHAR(100),
    job_id UUID,
    state VARCHAR(24) NOT NULL CHECK(state IN ('PENDING','EVIDENCE','INSUFFICIENT','CONFLICTING_CONTEXT','LOCAL_RANKED','MODEL_FALLBACK')),
    as_of TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,report_id),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY(owner_id,job_id) REFERENCES finn.app_job(owner_id,job_id)
);
CREATE INDEX research_report_scope ON finn.research_report(owner_id,company_id,as_of DESC,report_id);
CREATE TABLE finn.research_report_candidate (
    owner_id UUID NOT NULL,
    report_id UUID NOT NULL,
    anchor_id UUID NOT NULL,
    candidate_order INTEGER NOT NULL CHECK(candidate_order BETWEEN 1 AND 6),
    selected_order INTEGER CHECK(selected_order BETWEEN 1 AND 3),
    PRIMARY KEY(owner_id,report_id,anchor_id),
    UNIQUE(owner_id,report_id,candidate_order),
    FOREIGN KEY(owner_id,report_id) REFERENCES finn.research_report(owner_id,report_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
CREATE TABLE finn.research_report_feedback (
    owner_id UUID NOT NULL,
    report_id UUID NOT NULL,
    note VARCHAR(500) NOT NULL,
    anchor_id UUID,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,report_id),
    FOREIGN KEY(owner_id,report_id) REFERENCES finn.research_report(owner_id,report_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
CREATE TABLE finn.research_report_fact (
    owner_id UUID NOT NULL,
    report_id UUID NOT NULL,
    position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 12),
    fact_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    PRIMARY KEY(owner_id,report_id,position),
    FOREIGN KEY(owner_id,report_id) REFERENCES finn.research_report(owner_id,report_id),
    FOREIGN KEY(owner_id,fact_id,revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision)
);
GRANT SELECT,INSERT ON finn.research_report,finn.research_report_candidate,finn.research_report_feedback TO finn_app;
GRANT SELECT,INSERT ON finn.research_report_fact TO finn_app;
GRANT UPDATE(state) ON finn.research_report TO finn_app;
GRANT UPDATE(selected_order) ON finn.research_report_candidate TO finn_app;
