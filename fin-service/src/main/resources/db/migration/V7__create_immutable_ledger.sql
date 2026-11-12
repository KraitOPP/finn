ALTER TABLE finn.listing ADD UNIQUE(owner_id,listing_id,security_id);
CREATE TABLE finn.ledger_command (
    command_id UUID PRIMARY KEY, owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL,
    idempotency_key UUID NOT NULL, input_hash CHAR(64) NOT NULL, revision BIGINT NOT NULL CHECK(revision>0),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,account_id,command_id), UNIQUE(owner_id,account_id,idempotency_key),
    FOREIGN KEY(owner_id,portfolio_id,account_id) REFERENCES finn.investment_account(owner_id,portfolio_id,account_id)
);
CREATE TABLE finn.ledger_event (
    event_id UUID PRIMARY KEY, owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL,
    command_id UUID NOT NULL, sequence BIGINT NOT NULL CHECK(sequence>0), effective_date DATE NOT NULL,
    event_type VARCHAR(24) NOT NULL CHECK(event_type IN ('BUY','SELL','FEE','DEPOSIT','WITHDRAWAL','OPENING_POSITION','OPENING_CASH','REVERSAL')),
    security_id UUID, listing_id UUID, quantity NUMERIC(30,8), price NUMERIC(30,8), amount NUMERIC(30,8), fees NUMERIC(30,8),
    reversal_of UUID, replaces_event_id UUID, reference VARCHAR(120), source VARCHAR(32) NOT NULL CHECK(source IN ('MANUAL','GROWW_HOLDINGS','REVIEWED_CORPORATE_ACTION')),
    source_reference UUID, recorded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,account_id,event_id), UNIQUE(owner_id,account_id,sequence), UNIQUE(owner_id,account_id,reversal_of),
    FOREIGN KEY(owner_id,portfolio_id,account_id) REFERENCES finn.investment_account(owner_id,portfolio_id,account_id),
    FOREIGN KEY(owner_id,account_id,command_id) REFERENCES finn.ledger_command(owner_id,account_id,command_id),
    FOREIGN KEY(owner_id,security_id) REFERENCES finn.security(owner_id,security_id),
    FOREIGN KEY(owner_id,listing_id,security_id) REFERENCES finn.listing(owner_id,listing_id,security_id),
    FOREIGN KEY(owner_id,account_id,reversal_of) REFERENCES finn.ledger_event(owner_id,account_id,event_id),
    FOREIGN KEY(owner_id,account_id,replaces_event_id) REFERENCES finn.ledger_event(owner_id,account_id,event_id),
    CHECK(listing_id IS NULL OR security_id IS NOT NULL), CHECK((event_type='REVERSAL')=(reversal_of IS NOT NULL)),
    CHECK(source<>'GROWW_HOLDINGS' OR (event_type='OPENING_POSITION' AND source_reference IS NOT NULL)),
    CHECK(quantity IS NULL OR quantity>0), CHECK(price IS NULL OR price>0),
    CHECK(amount IS NULL OR amount>=0), CHECK(fees IS NULL OR fees>=0)
);
CREATE INDEX ledger_command_events ON finn.ledger_event(owner_id,account_id,command_id,sequence);
GRANT SELECT,INSERT ON finn.ledger_command,finn.ledger_event TO finn_app;
