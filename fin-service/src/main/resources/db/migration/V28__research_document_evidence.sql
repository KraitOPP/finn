
CREATE TABLE finn.research_pdf (
    file_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    checksum CHAR(64) NOT NULL,
    contents BYTEA NOT NULL CHECK(octet_length(contents) BETWEEN 12 AND 3145728),
    UNIQUE(owner_id,file_id),
    UNIQUE(owner_id,checksum)
);
GRANT SELECT,INSERT ON finn.research_pdf TO finn_app;

ALTER TABLE finn.source_document_version ADD COLUMN pdf_id UUID;
ALTER TABLE finn.source_document_version DROP CONSTRAINT source_document_version_check;
ALTER TABLE finn.source_document_version ADD CHECK (url IS NOT NULL OR attachment IS NOT NULL OR pdf_id IS NOT NULL);
ALTER TABLE finn.source_document_version ADD CHECK (attachment IS NULL OR pdf_id IS NULL);
ALTER TABLE finn.source_document_version ADD FOREIGN KEY(owner_id,pdf_id) REFERENCES finn.research_pdf(owner_id,file_id);

ALTER TABLE finn.app_job DROP CONSTRAINT app_job_kind_check;
ALTER TABLE finn.app_job ADD CHECK (kind IN ('GROWW_HOLDINGS_PREVIEW','YAHOO_DAILY_HISTORY','RESEARCH_EXTRACT'));

CREATE TABLE finn.research_extraction (
    extraction_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    document_id UUID NOT NULL,
    document_revision INTEGER NOT NULL,
    job_id UUID NOT NULL,
    requested INTEGER NOT NULL DEFAULT 1 CHECK(requested BETWEEN 1 AND 3),
    status VARCHAR(16) CHECK(status IN ('READY','PARTIAL','NO_TEXT','UNSUPPORTED','FAILED')),
    reason VARCHAR(48),
    total_pages INTEGER NOT NULL DEFAULT 0 CHECK(total_pages BETWEEN 0 AND 10000),
    UNIQUE(owner_id,extraction_id),
    UNIQUE(owner_id,document_id,document_revision),
    FOREIGN KEY(owner_id,document_id,document_revision) REFERENCES finn.source_document_version(owner_id,document_id,revision),
    FOREIGN KEY(owner_id,job_id) REFERENCES finn.app_job(owner_id,job_id)
);
GRANT SELECT,INSERT ON finn.research_extraction TO finn_app;
GRANT UPDATE(job_id,requested,status,reason,total_pages) ON finn.research_extraction TO finn_app;

CREATE TABLE finn.research_page (
    owner_id UUID NOT NULL,
    extraction_id UUID NOT NULL,
    page_number INTEGER NOT NULL CHECK(page_number BETWEEN 1 AND 20),
    state VARCHAR(16) NOT NULL CHECK(state IN ('TEXT','NO_TEXT','TRUNCATED','UNREADABLE')),
    content TEXT NOT NULL CHECK(char_length(content)<=60000),
    PRIMARY KEY(owner_id,extraction_id,page_number),
    FOREIGN KEY(owner_id,extraction_id) REFERENCES finn.research_extraction(owner_id,extraction_id)
);
CREATE TABLE finn.research_anchor (
    anchor_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    extraction_id UUID NOT NULL,
    page_number INTEGER NOT NULL,
    line_start INTEGER NOT NULL CHECK(line_start>0),
    line_end INTEGER NOT NULL CHECK(line_end>=line_start),
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('PASSAGE','TABLE_ROW')),
    quote TEXT NOT NULL CHECK(char_length(quote) BETWEEN 1 AND 4000),
    cells JSONB NOT NULL,
    UNIQUE(owner_id,anchor_id),
    FOREIGN KEY(owner_id,extraction_id,page_number) REFERENCES finn.research_page(owner_id,extraction_id,page_number)
);
CREATE INDEX research_anchor_location ON finn.research_anchor(owner_id,extraction_id,page_number,line_start);
GRANT SELECT,INSERT ON finn.research_page,finn.research_anchor TO finn_app;
