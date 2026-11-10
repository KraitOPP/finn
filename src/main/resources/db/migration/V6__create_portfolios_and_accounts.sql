CREATE TABLE finn.portfolio (
    portfolio_id UUID PRIMARY KEY, owner_id UUID NOT NULL REFERENCES finn.app_user(user_id),
    name VARCHAR(120) NOT NULL, currency CHAR(3) NOT NULL CHECK(currency='INR'),
    archived BOOLEAN NOT NULL DEFAULT FALSE, revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,portfolio_id)
);
CREATE TABLE finn.investment_account (
    account_id UUID PRIMARY KEY, owner_id UUID NOT NULL, portfolio_id UUID NOT NULL,
    name VARCHAR(120) NOT NULL, source VARCHAR(16) NOT NULL CHECK(source IN ('GROWW','MANUAL','OTHER')),
    currency CHAR(3) NOT NULL CHECK(currency='INR'),
    history_status VARCHAR(32) NOT NULL DEFAULT 'UNKNOWN' CHECK(history_status IN ('UNKNOWN','HOLDINGS_ONLY','PARTIAL_TRADES')),
    history_start_date DATE, lock_version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(owner_id,account_id), UNIQUE(owner_id,portfolio_id,account_id),
    FOREIGN KEY(owner_id,portfolio_id) REFERENCES finn.portfolio(owner_id,portfolio_id),
    CHECK ((history_status='UNKNOWN' AND history_start_date IS NULL) OR (history_status<>'UNKNOWN' AND history_start_date IS NOT NULL))
);
CREATE INDEX investment_account_portfolio ON finn.investment_account(owner_id,portfolio_id);
GRANT SELECT,INSERT ON finn.portfolio,finn.investment_account TO finn_app;
GRANT UPDATE(archived,revision) ON finn.portfolio TO finn_app;
GRANT UPDATE(history_status,history_start_date,lock_version) ON finn.investment_account TO finn_app;
