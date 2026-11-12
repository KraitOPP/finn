ALTER TABLE finn.activity DROP CONSTRAINT activity_kind_check;
ALTER TABLE finn.activity ADD CHECK(kind IN ('PRICE_RULE','REVIEW_REMINDER','PORTFOLIO_BRIEF','VOLUME_RULE',
    'ALLOCATION_RULE','COMPANY_EVENT','THESIS_REVIEW'));
ALTER TABLE finn.thesis_condition_check ADD UNIQUE(owner_id,check_id);

CREATE TABLE finn.thesis_review_task (
    review_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    thesis_id UUID NOT NULL,
    thesis_revision INTEGER NOT NULL,
    event_version_id UUID NOT NULL,
    fingerprint CHAR(64) NOT NULL,
    relation VARCHAR(12) NOT NULL CHECK(relation IN ('CONTEXT','SUPPORTS','CHALLENGES')),
    anchor_id UUID,
    condition_check_id UUID,
    guidance_id UUID,
    guidance_revision INTEGER,
    guidance_state VARCHAR(24) CHECK(guidance_state IN ('MET','MISSED','PARTIAL','WITHDRAWN','REVISED','NOT_DUE','INSUFFICIENT_EVIDENCE')),
    guidance_reason VARCHAR(40),
    guidance_as_of DATE,
    successor_revision INTEGER,
    actual_fact_id UUID,
    actual_fact_revision INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,review_id),
    UNIQUE(owner_id,thesis_id,thesis_revision,event_version_id),
    CHECK(relation='CONTEXT' OR anchor_id IS NOT NULL),
    CHECK((guidance_id IS NULL)=(guidance_revision IS NULL) AND (guidance_id IS NULL)=(guidance_state IS NULL)
       AND (guidance_id IS NULL)=(guidance_reason IS NULL) AND (guidance_id IS NULL)=(guidance_as_of IS NULL)),
    CHECK((actual_fact_id IS NULL)=(actual_fact_revision IS NULL)),
    FOREIGN KEY(owner_id,thesis_id,thesis_revision) REFERENCES finn.investment_thesis_version(owner_id,thesis_id,revision),
    FOREIGN KEY(owner_id,event_version_id) REFERENCES finn.company_event_version(owner_id,event_version_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id),
    FOREIGN KEY(owner_id,condition_check_id) REFERENCES finn.thesis_condition_check(owner_id,check_id),
    FOREIGN KEY(owner_id,guidance_id,guidance_revision) REFERENCES finn.management_guidance_version(owner_id,guidance_id,revision),
    FOREIGN KEY(owner_id,guidance_id,successor_revision) REFERENCES finn.management_guidance_version(owner_id,guidance_id,revision),
    FOREIGN KEY(owner_id,actual_fact_id,actual_fact_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision)
);
CREATE INDEX thesis_review_tasks_scope ON finn.thesis_review_task(owner_id,thesis_id,created_at DESC,review_id);
CREATE TABLE finn.thesis_review_decision (
    owner_id UUID NOT NULL,
    review_id UUID NOT NULL,
    action VARCHAR(12) NOT NULL CHECK(action IN ('REAFFIRM','REVISE','PAUSE','CLOSE','DISMISS')),
    note VARCHAR(1200) NOT NULL,
    anchor_id UUID,
    decided_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,review_id),
    FOREIGN KEY(owner_id,review_id) REFERENCES finn.thesis_review_task(owner_id,review_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
GRANT SELECT,INSERT ON finn.thesis_review_task,finn.thesis_review_decision TO finn_app;
