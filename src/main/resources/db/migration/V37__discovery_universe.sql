CREATE TABLE finn.discovery_member (
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    listing_id UUID NOT NULL,
    sector VARCHAR(20) NOT NULL CHECK(sector IN ('BANKING','FINANCIAL_SERVICES','MANUFACTURING','TECHNOLOGY','CONSUMER','ENERGY','OTHER')),
    active BOOLEAN NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 100),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,company_id),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY(owner_id,listing_id) REFERENCES finn.listing(owner_id,listing_id)
);
GRANT SELECT,INSERT ON finn.discovery_member TO finn_app;
GRANT UPDATE(listing_id,sector,active,revision,reviewed_at) ON finn.discovery_member TO finn_app;
