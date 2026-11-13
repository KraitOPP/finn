ALTER TABLE finn.financial_fact DROP CONSTRAINT financial_fact_metric_check;
ALTER TABLE finn.financial_fact ADD CHECK(metric IN ('REVENUE','EBITDA','PROFIT_AFTER_TAX','CASH_FROM_OPERATIONS',
    'CAPITAL_EXPENDITURE','FREE_CASH_FLOW','TOTAL_DEBT','TOTAL_EQUITY','EPS_BASIC','OPERATING_MARGIN',
    'OPERATING_PROFIT','EXCEPTIONAL_ITEMS','OTHER_INCOME','TAX_EXPENSE','MARKET_CAP'));

CREATE TABLE finn.earnings_input (
    input_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    basis VARCHAR(16) NOT NULL CHECK(basis IN ('STANDALONE','CONSOLIDATED')),
    period_kind VARCHAR(12) NOT NULL CHECK(period_kind IN ('QUARTER','FULL_YEAR')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    kind VARCHAR(16) NOT NULL CHECK(kind IN ('SEGMENT','CONSENSUS')),
    label VARCHAR(100) NOT NULL,
    metric VARCHAR(32) NOT NULL CHECK(metric IN ('REVENUE','OPERATING_PROFIT','PROFIT_AFTER_TAX','EPS_BASIC')),
    currency CHAR(3) NOT NULL CHECK(currency IN ('INR','USD','EUR','GBP','JPY')),
    normalized_amount NUMERIC(40,8) NOT NULL,
    reported_amount NUMERIC(30,8) NOT NULL,
    amount_scale VARCHAR(12) NOT NULL CHECK(amount_scale IN ('ONES','THOUSAND','LAKH','MILLION','CRORE','BILLION')),
    anchor_id UUID,
    source_url VARCHAR(1000),
    published_at TIMESTAMPTZ NOT NULL,
    CHECK((kind='SEGMENT' AND metric IN ('REVENUE','OPERATING_PROFIT') AND anchor_id IS NOT NULL AND source_url IS NULL)
       OR (kind='CONSENSUS' AND anchor_id IS NULL AND source_url IS NOT NULL)),
    CHECK(period_start<=period_end),
    UNIQUE(owner_id,company_id,basis,period_kind,period_start,period_end,kind,label,metric,currency,published_at),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
CREATE INDEX earnings_input_company ON finn.earnings_input(owner_id,company_id,period_end DESC);
GRANT SELECT,INSERT ON finn.earnings_input TO finn_app;
