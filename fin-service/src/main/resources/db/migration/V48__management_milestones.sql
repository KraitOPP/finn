ALTER TABLE finn.management_guidance_version ADD COLUMN target_date DATE;
ALTER TABLE finn.management_guidance_version ADD CHECK(target_date IS NULL OR kind='QUALITATIVE');

CREATE TABLE finn.management_milestone_delivery (
    delivery_id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    guidance_id UUID NOT NULL,
    guidance_revision INTEGER NOT NULL,
    actual_date DATE NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    anchor_id UUID NOT NULL,
    saved_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    UNIQUE(owner_id,delivery_id),
    UNIQUE(owner_id,guidance_id,guidance_revision,anchor_id,actual_date),
    FOREIGN KEY(owner_id,guidance_id,guidance_revision) REFERENCES finn.management_guidance_version(owner_id,guidance_id,revision),
    FOREIGN KEY(owner_id,anchor_id) REFERENCES finn.research_anchor(owner_id,anchor_id)
);
CREATE INDEX management_milestone_latest ON finn.management_milestone_delivery
    (owner_id,guidance_id,guidance_revision,published_at DESC,saved_at DESC,delivery_id);
GRANT SELECT,INSERT ON finn.management_milestone_delivery TO finn_app;

ALTER TABLE finn.thesis_review_task ADD COLUMN milestone_delivery_id UUID,
    ADD FOREIGN KEY(owner_id,milestone_delivery_id) REFERENCES finn.management_milestone_delivery(owner_id,delivery_id);
