
CREATE TABLE finn.valuation_snapshot (
    snapshot_id UUID PRIMARY KEY, owner_id UUID NOT NULL, account_id UUID NOT NULL,
    session_date DATE NOT NULL, ledger_revision BIGINT NOT NULL CHECK(ledger_revision BETWEEN 0 AND 10000),
    calculation_version VARCHAR(40) NOT NULL,
    price_basis VARCHAR(32) NOT NULL CHECK(price_basis='AS_REPORTED_EXCHANGE'),
    status VARCHAR(32) NOT NULL CHECK(status IN ('BEFORE_COVERAGE','PRICES_MISSING','CASH_UNKNOWN','RECORDED_VALUE')),
    valuation JSONB, fingerprint CHAR(64) NOT NULL,
    holdings_value NUMERIC(60,8), cash_balance NUMERIC(60,8), recorded_value NUMERIC(60,8),
    receipt_order BIGINT GENERATED ALWAYS AS IDENTITY, recorded_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    CHECK((status='BEFORE_COVERAGE')=(valuation IS NULL)),
    CHECK((status='RECORDED_VALUE')=(recorded_value IS NOT NULL)),
    FOREIGN KEY(owner_id,account_id) REFERENCES finn.investment_account(owner_id,account_id)
);
CREATE INDEX valuation_snapshot_series ON finn.valuation_snapshot(owner_id,account_id,session_date,receipt_order DESC);
CREATE INDEX valuation_snapshot_account ON finn.valuation_snapshot(owner_id,account_id);
GRANT SELECT,INSERT ON finn.valuation_snapshot TO finn_app;
