
ALTER TABLE finn.app_job DROP CONSTRAINT app_job_kind_check;
ALTER TABLE finn.app_job ADD CONSTRAINT app_job_kind_check CHECK(kind IN ('GROWW_HOLDINGS_PREVIEW','YAHOO_DAILY_HISTORY'));

CREATE TABLE finn.market_fetch (
    owner_id UUID NOT NULL, job_id UUID NOT NULL, listing_id UUID NOT NULL,
    exchange VARCHAR(3) NOT NULL, provider_symbol VARCHAR(72) NOT NULL,
    start_date DATE NOT NULL, end_exclusive DATE NOT NULL,
    result_count INTEGER CHECK(result_count BETWEEN 0 AND 31),
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,job_id),
    CHECK(end_exclusive-start_date BETWEEN 1 AND 31),
    FOREIGN KEY(owner_id,job_id) REFERENCES finn.app_job(owner_id,job_id),
    FOREIGN KEY(owner_id,listing_id,exchange) REFERENCES finn.listing(owner_id,listing_id,exchange)
);
CREATE INDEX market_fetch_recent ON finn.market_fetch(created_at DESC);
CREATE INDEX market_fetch_listing ON finn.market_fetch(owner_id,listing_id,created_at DESC);
GRANT SELECT,INSERT ON finn.market_fetch TO finn_app;
GRANT UPDATE(result_count) ON finn.market_fetch TO finn_app;

CREATE TABLE finn.market_observation (
    observation_id UUID PRIMARY KEY, owner_id UUID NOT NULL, listing_id UUID NOT NULL,
    session_date DATE NOT NULL, source VARCHAR(32) NOT NULL,
    price_basis VARCHAR(32) NOT NULL, currency CHAR(3) NOT NULL CHECK(currency='INR'),
    close NUMERIC(25,8) NOT NULL CHECK(close>0),
    source_ref VARCHAR(240) NOT NULL, provider_bar JSONB,
    job_id UUID, fingerprint CHAR(64) NOT NULL,
    receipt_order BIGINT GENERATED ALWAYS AS IDENTITY,
    received_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,observation_id), UNIQUE(owner_id,listing_id,session_date,source,fingerprint),
    FOREIGN KEY(owner_id,listing_id) REFERENCES finn.listing(owner_id,listing_id),
    FOREIGN KEY(owner_id,job_id) REFERENCES finn.market_fetch(owner_id,job_id),
    CHECK((source='MANUAL_REVIEWED' AND price_basis='AS_REPORTED_EXCHANGE' AND job_id IS NULL AND provider_bar IS NULL)
       OR (source='YAHOO_YFINANCE' AND price_basis='PROVIDER_DEFINED' AND job_id IS NOT NULL AND provider_bar IS NOT NULL))
);
CREATE INDEX market_observation_history ON finn.market_observation(owner_id,listing_id,session_date DESC,source,receipt_order DESC);
CREATE INDEX market_yahoo_expiry ON finn.market_observation(session_date) WHERE source='YAHOO_YFINANCE';
GRANT SELECT,INSERT ON finn.market_observation TO finn_app;
-- Restrict retention deletion to expired Yahoo rows. Historical valuations only reference reviewed closes.
CREATE FUNCTION finn.expire_yahoo_observations() RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog
AS $$
    DELETE FROM finn.market_observation
    WHERE source='YAHOO_YFINANCE' AND session_date < (clock_timestamp() AT TIME ZONE 'Asia/Kolkata')::date-90;
$$;
REVOKE ALL ON FUNCTION finn.expire_yahoo_observations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION finn.expire_yahoo_observations() TO finn_app;
