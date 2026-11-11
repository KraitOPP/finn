
CREATE TABLE finn.valuation_listing (
    owner_id UUID NOT NULL, account_id UUID NOT NULL, security_id UUID NOT NULL, listing_id UUID NOT NULL,
    allow_provider_estimate BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(owner_id,account_id,security_id),
    FOREIGN KEY(owner_id,account_id) REFERENCES finn.investment_account(owner_id,account_id),
    FOREIGN KEY(owner_id,listing_id,security_id) REFERENCES finn.listing(owner_id,listing_id,security_id)
);
CREATE INDEX ledger_valuation_adjustments ON finn.ledger_event(owner_id,account_id,security_id,effective_date)
    WHERE event_type IN ('SPLIT','BONUS');
GRANT SELECT,INSERT,DELETE ON finn.valuation_listing TO finn_app;
GRANT UPDATE(listing_id,allow_provider_estimate) ON finn.valuation_listing TO finn_app;
