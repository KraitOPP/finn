ALTER TABLE finn.ledger_event DROP CONSTRAINT ledger_event_event_type_check;
ALTER TABLE finn.ledger_event ADD CONSTRAINT ledger_event_event_type_check
  CHECK(event_type IN ('BUY','SELL','FEE','DEPOSIT','WITHDRAWAL','OPENING_POSITION','OPENING_CASH','REVERSAL','SPLIT','BONUS','DIVIDEND'));
ALTER TABLE finn.ledger_event ADD COLUMN ratio_numerator INTEGER CHECK(ratio_numerator BETWEEN 1 AND 1000000),
    ADD COLUMN ratio_denominator INTEGER CHECK(ratio_denominator BETWEEN 1 AND 1000000),
    ADD CHECK((ratio_numerator IS NULL)=(ratio_denominator IS NULL)),
    ADD CHECK((event_type IN ('SPLIT','BONUS'))=(ratio_numerator IS NOT NULL));

CREATE TABLE finn.corporate_action (
    action_id UUID PRIMARY KEY, owner_id UUID NOT NULL, portfolio_id UUID NOT NULL, account_id UUID NOT NULL,
    security_id UUID NOT NULL, listing_id UUID, effective_date DATE NOT NULL,
    action_type VARCHAR(24) NOT NULL CHECK(action_type IN ('SPLIT','BONUS','DIVIDEND','SYMBOL_CHANGE','MERGER','DEMERGER','RIGHTS')),
    source_reference VARCHAR(64) NOT NULL, input_hash CHAR(64) NOT NULL, ledger_event_id UUID,
    corrects_action_id UUID, outcome VARCHAR(20) NOT NULL CHECK(outcome IN ('APPLIED','NEEDS_REVIEW')),
    payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,account_id,source_reference), UNIQUE(owner_id,portfolio_id,account_id,action_id),
    FOREIGN KEY(owner_id,portfolio_id,account_id) REFERENCES finn.investment_account(owner_id,portfolio_id,account_id),
    FOREIGN KEY(owner_id,security_id) REFERENCES finn.security(owner_id,security_id),
    FOREIGN KEY(owner_id,listing_id,security_id) REFERENCES finn.listing(owner_id,listing_id,security_id),
    FOREIGN KEY(owner_id,account_id,ledger_event_id) REFERENCES finn.ledger_event(owner_id,account_id,event_id),
    FOREIGN KEY(owner_id,portfolio_id,account_id,corrects_action_id) REFERENCES finn.corporate_action(owner_id,portfolio_id,account_id,action_id)
);
ALTER TABLE finn.ledger_event ADD COLUMN corporate_source_id UUID GENERATED ALWAYS AS
    (CASE WHEN source='REVIEWED_CORPORATE_ACTION' THEN source_reference END) STORED;
ALTER TABLE finn.ledger_event ADD FOREIGN KEY(owner_id,portfolio_id,account_id,corporate_source_id)
    REFERENCES finn.corporate_action(owner_id,portfolio_id,account_id,action_id) DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE finn.ledger_event ADD CHECK(source<>'REVIEWED_CORPORATE_ACTION' OR source_reference IS NOT NULL);
GRANT SELECT,INSERT ON finn.corporate_action TO finn_app;
