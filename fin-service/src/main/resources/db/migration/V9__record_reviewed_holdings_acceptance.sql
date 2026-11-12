ALTER TABLE finn.company DROP CONSTRAINT company_source_check;
ALTER TABLE finn.company ADD CONSTRAINT company_source_check CHECK(source IN ('MANUAL_USER','GROWW_HOLDINGS'));
ALTER TABLE finn.import_source ADD UNIQUE(owner_id,portfolio_id,account_id,import_id);
ALTER TABLE finn.ledger_event ADD COLUMN import_source_id UUID GENERATED ALWAYS AS
    (CASE WHEN source='GROWW_HOLDINGS' THEN source_reference END) STORED;
ALTER TABLE finn.ledger_event ADD FOREIGN KEY(owner_id,portfolio_id,account_id,import_source_id)
    REFERENCES finn.import_source(owner_id,portfolio_id,account_id,import_id);

CREATE TABLE finn.holdings_acceptance (
    owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL, import_id UUID NOT NULL,
    as_of_date DATE NOT NULL, outcome VARCHAR(16) NOT NULL CHECK(outcome IN ('APPLIED','DUPLICATE')),
    cost_mode VARCHAR(24) NOT NULL CHECK(cost_mode IN ('UNITS_ONLY','REPORTED_ROW_COST')),
    acknowledged_differences BOOLEAN NOT NULL, accepted_rows INTEGER NOT NULL CHECK(accepted_rows BETWEEN 0 AND 1000),
    skipped_rows INTEGER NOT NULL CHECK(skipped_rows BETWEEN 0 AND 1000), duplicate_rows INTEGER NOT NULL CHECK(duplicate_rows BETWEEN 0 AND 1000),
    original_import_id UUID, ledger_revision BIGINT NOT NULL CHECK(ledger_revision>=0),
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(owner_id,import_id),
    FOREIGN KEY(owner_id,portfolio_id,account_id,import_id) REFERENCES finn.import_source(owner_id,portfolio_id,account_id,import_id),
    FOREIGN KEY(owner_id,portfolio_id,account_id,original_import_id) REFERENCES finn.import_source(owner_id,portfolio_id,account_id,import_id),
    CHECK((outcome='APPLIED' AND accepted_rows>0 AND duplicate_rows=0 AND original_import_id IS NULL) OR
          (outcome='DUPLICATE' AND accepted_rows=0 AND duplicate_rows>0 AND original_import_id IS NOT NULL))
);
CREATE UNIQUE INDEX one_account_opening_snapshot ON finn.holdings_acceptance(owner_id,account_id) WHERE outcome='APPLIED';
GRANT SELECT,INSERT ON finn.holdings_acceptance TO finn_app;
