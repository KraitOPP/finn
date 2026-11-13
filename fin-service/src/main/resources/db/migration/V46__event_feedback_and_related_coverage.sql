ALTER TABLE finn.company_event_attention ADD COLUMN reaction VARCHAR(16)
    CHECK(reaction IN ('USEFUL','ALREADY_KNEW','TOO_MANY'));
GRANT UPDATE(reaction) ON finn.company_event_attention TO finn_app;

CREATE TABLE finn.event_related_news (
    owner_id UUID NOT NULL,
    event_id UUID NOT NULL,
    document_id UUID NOT NULL,
    document_revision INTEGER NOT NULL,
    PRIMARY KEY(owner_id,event_id,document_id,document_revision),
    UNIQUE(owner_id,document_id,document_revision),
    FOREIGN KEY(owner_id,event_id) REFERENCES finn.company_event(owner_id,event_id),
    FOREIGN KEY(owner_id,document_id,document_revision) REFERENCES finn.source_document_version(owner_id,document_id,revision)
);
GRANT SELECT,INSERT ON finn.event_related_news TO finn_app;
