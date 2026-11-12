CREATE TABLE finn.company_research_note (
    note_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('BUSINESS','GOVERNANCE','QUESTION')),
    title VARCHAR(240) NOT NULL,
    anchor_id UUID,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    CHECK(kind='QUESTION' OR (anchor_id IS NOT NULL AND NOT resolved)),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
CREATE INDEX company_research_notes_scope ON finn.company_research_note(owner_id,company_id,kind);
GRANT SELECT,INSERT ON finn.company_research_note TO finn_app;
GRANT UPDATE(resolved) ON finn.company_research_note TO finn_app;
