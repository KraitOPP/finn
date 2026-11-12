CREATE TABLE finn.investment_thesis (
    thesis_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    UNIQUE(owner_id,thesis_id),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX investment_thesis_company ON finn.investment_thesis(owner_id,company_id,thesis_id);

CREATE TABLE finn.investment_thesis_version (
    owner_id UUID NOT NULL,
    thesis_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 100),
    title VARCHAR(100) NOT NULL,
    rationale VARCHAR(2400) NOT NULL,
    risks VARCHAR(1600) NOT NULL,
    milestones VARCHAR(1600) NOT NULL,
    decision VARCHAR(16) NOT NULL CHECK(decision IN ('MONITOR','REAFFIRM','REVISE','PAUSE','CLOSE')),
    decision_note VARCHAR(1200) NOT NULL,
    review_local VARCHAR(16),
    review_zone VARCHAR(64),
    reminder_id UUID,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,thesis_id,revision),
    CHECK((review_local IS NULL)=(review_zone IS NULL) AND (review_zone IS NULL)=(reminder_id IS NULL)),
    FOREIGN KEY(owner_id,thesis_id) REFERENCES finn.investment_thesis(owner_id,thesis_id),
    FOREIGN KEY(owner_id,reminder_id) REFERENCES finn.review_reminder(owner_id,reminder_id)
);

CREATE TABLE finn.investment_thesis_evidence (
    owner_id UUID NOT NULL,
    thesis_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    anchor_id UUID NOT NULL,
    position INTEGER NOT NULL CHECK(position BETWEEN 1 AND 5),
    PRIMARY KEY(owner_id,thesis_id,revision,position),
    UNIQUE(owner_id,thesis_id,revision,anchor_id),
    FOREIGN KEY(owner_id,thesis_id,revision) REFERENCES finn.investment_thesis_version(owner_id,thesis_id,revision),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);

GRANT SELECT,INSERT ON finn.investment_thesis,finn.investment_thesis_version,finn.investment_thesis_evidence TO finn_app;
GRANT UPDATE(revision) ON finn.investment_thesis TO finn_app;
