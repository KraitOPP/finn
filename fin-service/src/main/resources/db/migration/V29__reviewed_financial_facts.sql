
CREATE TABLE finn.financial_fact (
    fact_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    company_id UUID NOT NULL,
    metric VARCHAR(32) NOT NULL CHECK(metric IN ('REVENUE','EBITDA','PROFIT_AFTER_TAX','CASH_FROM_OPERATIONS',
        'CAPITAL_EXPENDITURE','FREE_CASH_FLOW','TOTAL_DEBT','TOTAL_EQUITY','EPS_BASIC','OPERATING_MARGIN')),
    basis VARCHAR(16) NOT NULL CHECK(basis IN ('STANDALONE','CONSOLIDATED')),
    period_kind VARCHAR(12) NOT NULL CHECK(period_kind IN ('QUARTER','YTD','FULL_YEAR','AS_OF')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    unit VARCHAR(12) NOT NULL CHECK(unit IN ('MONEY','PER_SHARE','PERCENT')),
    currency CHAR(3) CHECK(currency IN ('INR','USD','EUR','GBP','JPY')),
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    UNIQUE(owner_id,fact_id),
    UNIQUE NULLS NOT DISTINCT(owner_id,company_id,metric,basis,period_kind,period_start,period_end,unit,currency),
    CHECK(period_end>=period_start),
    CHECK((unit='PERCENT')=(currency IS NULL)),
    FOREIGN KEY(owner_id,company_id) REFERENCES finn.company(owner_id,company_id)
);
CREATE INDEX financial_fact_company ON finn.financial_fact(owner_id,company_id,period_end DESC,fact_id);
GRANT SELECT,INSERT ON finn.financial_fact TO finn_app;
GRANT UPDATE(revision) ON finn.financial_fact TO finn_app;

CREATE TABLE finn.financial_fact_version (
    owner_id UUID NOT NULL,
    fact_id UUID NOT NULL,
    revision INTEGER NOT NULL CHECK(revision BETWEEN 1 AND 50),
    anchor_id UUID NOT NULL,
    amount NUMERIC(40,8) NOT NULL,
    amount_scale VARCHAR(12) NOT NULL CHECK(amount_scale IN ('ONES','THOUSAND','LAKH','MILLION','CRORE','BILLION')),
    normalized_amount NUMERIC(40,8) NOT NULL,
    origin VARCHAR(12) NOT NULL CHECK(origin IN ('REPORTED','DERIVED')),
    operand_a UUID,
    operand_a_revision INTEGER,
    operand_b UUID,
    operand_b_revision INTEGER,
    published_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,fact_id) REFERENCES finn.financial_fact(owner_id,fact_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id),
    FOREIGN KEY(owner_id,operand_a,operand_a_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    FOREIGN KEY(owner_id,operand_b,operand_b_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision),
    CHECK((origin='DERIVED')=(operand_a IS NOT NULL AND operand_a_revision IS NOT NULL AND operand_b IS NOT NULL AND operand_b_revision IS NOT NULL)),
    CHECK(origin='DERIVED' OR (operand_a IS NULL AND operand_a_revision IS NULL AND operand_b IS NULL AND operand_b_revision IS NULL))
);
GRANT SELECT,INSERT ON finn.financial_fact_version TO finn_app;
