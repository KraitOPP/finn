CREATE TABLE finn.holdings_reconciliation_review (
    owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL, import_id UUID NOT NULL,
    ledger_revision BIGINT NOT NULL CHECK(ledger_revision>=0), reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(owner_id,import_id,ledger_revision),
    FOREIGN KEY(owner_id,portfolio_id,account_id,import_id) REFERENCES finn.import_source(owner_id,portfolio_id,account_id,import_id)
);
GRANT SELECT,INSERT ON finn.holdings_reconciliation_review TO finn_app;
