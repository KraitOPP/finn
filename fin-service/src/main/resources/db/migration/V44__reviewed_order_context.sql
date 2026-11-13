CREATE TABLE finn.event_order_context (
    owner_id UUID NOT NULL,
    event_version_id UUID NOT NULL,
    amount_inr NUMERIC(40,8) NOT NULL CHECK(amount_inr>0),
    execution VARCHAR(160) NOT NULL,
    anchor_id UUID NOT NULL,
    revenue_fact_id UUID NOT NULL,
    revenue_revision INTEGER NOT NULL,
    PRIMARY KEY(owner_id,event_version_id),
    FOREIGN KEY(owner_id,event_version_id) REFERENCES finn.company_event_version(owner_id,event_version_id),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id),
    FOREIGN KEY(owner_id,revenue_fact_id,revenue_revision) REFERENCES finn.financial_fact_version(owner_id,fact_id,revision)
);
GRANT SELECT,INSERT ON finn.event_order_context TO finn_app;
