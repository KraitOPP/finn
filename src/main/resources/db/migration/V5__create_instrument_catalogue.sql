CREATE TABLE finn.company (
    company_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    name VARCHAR(120) NOT NULL, source VARCHAR(32) NOT NULL CHECK (source='MANUAL_USER'),
    UNIQUE(owner_id, company_id)
);
CREATE TABLE finn.security (
    security_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    company_id UUID NOT NULL, name VARCHAR(120) NOT NULL, isin CHAR(12),
    review_status VARCHAR(32) NOT NULL CHECK (review_status IN ('USER_CONFIRMED','UNRESOLVED')),
    lock_version BIGINT NOT NULL DEFAULT 0,
    UNIQUE(owner_id, security_id), UNIQUE(owner_id, isin),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE TABLE finn.listing (
    listing_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id), security_id UUID NOT NULL,
    exchange VARCHAR(3) NOT NULL CHECK (exchange IN ('NSE','BSE')), series VARCHAR(16) NOT NULL,
    currency CHAR(3) NOT NULL CHECK (currency='INR'), lock_version BIGINT NOT NULL DEFAULT 0,
    UNIQUE(owner_id,listing_id), UNIQUE(owner_id,listing_id,exchange),
    FOREIGN KEY(owner_id,security_id) REFERENCES finn.security(owner_id,security_id)
);
CREATE TABLE finn.listing_symbol (
    symbol_id UUID PRIMARY KEY, owner_id UUID NOT NULL, listing_id UUID NOT NULL, exchange VARCHAR(3) NOT NULL,
    symbol VARCHAR(64) NOT NULL, valid_from DATE NOT NULL, valid_to DATE,
    source VARCHAR(32) NOT NULL CHECK (source='MANUAL_USER'), reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_to IS NULL OR valid_to>valid_from),
    FOREIGN KEY(owner_id,listing_id,exchange) REFERENCES finn.listing(owner_id,listing_id,exchange)
);
CREATE UNIQUE INDEX listing_current_symbol ON finn.listing_symbol(owner_id,exchange,symbol) WHERE valid_to IS NULL;
CREATE UNIQUE INDEX listing_one_current_symbol ON finn.listing_symbol(owner_id,listing_id) WHERE valid_to IS NULL;
CREATE TABLE finn.provider_symbol_history (
    mapping_id UUID PRIMARY KEY, owner_id UUID NOT NULL, listing_id UUID NOT NULL,
    provider VARCHAR(32) NOT NULL CHECK (provider='YAHOO_YFINANCE'), provider_symbol VARCHAR(72) NOT NULL,
    valid_from DATE NOT NULL, valid_to DATE,
    source VARCHAR(32) NOT NULL CHECK (source='MANUAL_USER'), reviewed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (valid_to IS NULL OR valid_to>valid_from),
    FOREIGN KEY(owner_id,listing_id) REFERENCES finn.listing(owner_id,listing_id)
);
CREATE UNIQUE INDEX provider_current_symbol ON finn.provider_symbol_history(owner_id,provider,provider_symbol) WHERE valid_to IS NULL;
CREATE UNIQUE INDEX provider_one_current_mapping ON finn.provider_symbol_history(owner_id,listing_id,provider) WHERE valid_to IS NULL;
GRANT SELECT,INSERT ON finn.company,finn.security,finn.listing,finn.listing_symbol,finn.provider_symbol_history TO finn_app;
GRANT UPDATE(valid_to) ON finn.listing_symbol,finn.provider_symbol_history TO finn_app;
-- PostgreSQL row locking requires UPDATE privilege on at least one column.
-- Grant only an operational lock column, never owner or identity columns.
GRANT UPDATE(lock_version) ON finn.security,finn.listing TO finn_app;
