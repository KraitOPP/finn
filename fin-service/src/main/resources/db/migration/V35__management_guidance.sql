CREATE TABLE finn.management_guidance (
    guidance_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    UNIQUE(owner_id,guidance_id),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX management_guidance_company ON finn.management_guidance(owner_id,company_id,guidance_id);
CREATE TABLE finn.management_guidance_version (
    owner_id UUID NOT NULL,
    guidance_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    title VARCHAR(120) NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('QUALITATIVE','AT_LEAST','AT_MOST','RANGE')),
    stage VARCHAR(12) NOT NULL CHECK(stage IN ('DRAFT','CONFIRMED','WITHDRAWN')),
    statement_date DATE,
    published_at TIMESTAMPTZ,
    dimensions JSONB,
    lower_bound NUMERIC(40,8),
    upper_bound NUMERIC(40,8),
    scale VARCHAR(12) NOT NULL CHECK(scale IN ('ONES','THOUSAND','LAKH','MILLION','CRORE','BILLION')),
    caveats VARCHAR(1200) NOT NULL,
    anchor_id UUID NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,guidance_id,revision),
    CHECK(stage='DRAFT' OR (statement_date IS NOT NULL AND published_at IS NOT NULL)),
    CHECK(lower_bound IS NULL OR upper_bound IS NULL OR lower_bound<=upper_bound),
    FOREIGN KEY(owner_id,guidance_id) REFERENCES finn.management_guidance(owner_id,guidance_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
GRANT SELECT,INSERT ON finn.management_guidance,finn.management_guidance_version TO finn_app;
GRANT UPDATE(revision) ON finn.management_guidance TO finn_app;
