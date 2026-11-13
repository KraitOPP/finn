CREATE TABLE finn.research_brief_seen (
    owner_id UUID PRIMARY KEY REFERENCES finn.app_user(user_id),
    reviewed_through TIMESTAMPTZ NOT NULL
);
GRANT SELECT,INSERT ON finn.research_brief_seen TO finn_app;
GRANT UPDATE(reviewed_through) ON finn.research_brief_seen TO finn_app;

ALTER TABLE finn.company_research_note DROP CONSTRAINT company_research_note_kind_check;
ALTER TABLE finn.company_research_note ADD CHECK(kind IN ('BUSINESS','GOVERNANCE','QUESTION','EXPOSURE'));
