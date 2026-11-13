CREATE TABLE finn.reviewed_event_outbox (
    sequence BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    message_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    filing_version_id UUID,
    fact_id UUID,
    fact_revision INTEGER,
    occurred_at TIMESTAMPTZ NOT NULL,
    published_at TIMESTAMPTZ,
    CHECK ((filing_version_id IS NOT NULL AND fact_id IS NULL AND fact_revision IS NULL)
        OR (filing_version_id IS NULL AND fact_id IS NOT NULL AND fact_revision IS NOT NULL)),
    FOREIGN KEY (owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY (owner_id,filing_version_id) REFERENCES finn.company_event_version(owner_id,event_version_id),
    FOREIGN KEY (owner_id,fact_id,fact_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision)
);
CREATE UNIQUE INDEX reviewed_event_one_filing ON finn.reviewed_event_outbox(owner_id,filing_version_id)
    WHERE filing_version_id IS NOT NULL;
CREATE UNIQUE INDEX reviewed_event_one_fact ON finn.reviewed_event_outbox(owner_id,fact_id,fact_revision)
    WHERE fact_id IS NOT NULL;
CREATE INDEX reviewed_event_unpublished ON finn.reviewed_event_outbox(sequence) WHERE published_at IS NULL;
GRANT SELECT,INSERT ON finn.reviewed_event_outbox TO finn_app;
GRANT UPDATE(published_at) ON finn.reviewed_event_outbox TO finn_app;
GRANT USAGE ON SEQUENCE finn.reviewed_event_outbox_sequence_seq TO finn_app;

CREATE TABLE finn.reviewed_event_receipt (
    consumer VARCHAR(10) NOT NULL CHECK (consumer IN ('alerts','radar','thesis')),
    message_id UUID NOT NULL REFERENCES finn.reviewed_event_outbox(message_id),
    processed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (consumer,message_id)
);
GRANT SELECT,INSERT ON finn.reviewed_event_receipt TO finn_app;

CREATE TABLE finn.radar_filing (
    owner_id UUID NOT NULL,
    event_id UUID NOT NULL,
    revision INTEGER NOT NULL,
    visible_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (owner_id,event_id),
    FOREIGN KEY (owner_id,event_id,revision) REFERENCES finn.company_event_version(owner_id,event_id,revision)
);
CREATE INDEX radar_filing_recent ON finn.radar_filing(owner_id,visible_at DESC,event_id);
INSERT INTO finn.radar_filing (owner_id,event_id,revision,visible_at)
SELECT e.owner_id,e.event_id,e.revision,v.reviewed_at FROM finn.company_event e
JOIN finn.company_event_version v USING(owner_id,event_id,revision);
GRANT SELECT,INSERT ON finn.radar_filing TO finn_app;
GRANT UPDATE(revision,visible_at) ON finn.radar_filing TO finn_app;
