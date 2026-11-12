CREATE INDEX source_document_words ON finn.source_document_version
    USING gin(to_tsvector('simple',title || ' ' || source_name));

ALTER TABLE finn.research_report ADD COLUMN series_id UUID;
UPDATE finn.research_report SET series_id=report_id;
ALTER TABLE finn.research_report ALTER COLUMN series_id SET NOT NULL;
ALTER TABLE finn.research_report
    ADD COLUMN previous_report_id UUID,
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 500),
    ADD UNIQUE(owner_id,series_id,version),
    ADD CHECK((version=1 AND previous_report_id IS NULL AND series_id=report_id)
              OR (version>1 AND previous_report_id IS NOT NULL AND series_id<>report_id)),
    ADD FOREIGN KEY(owner_id,series_id) REFERENCES finn.research_report(owner_id,report_id),
    ADD FOREIGN KEY(owner_id,previous_report_id) REFERENCES finn.research_report(owner_id,report_id);
