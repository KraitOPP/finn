
CREATE INDEX market_fetch_owner_recent ON finn.market_fetch(owner_id,created_at DESC,job_id);
CREATE INDEX market_fetch_owner_success ON finn.market_fetch(owner_id,created_at DESC,job_id) WHERE result_count IS NOT NULL;
CREATE INDEX market_job_owner_pending ON finn.app_job(owner_id) WHERE kind='YAHOO_DAILY_HISTORY' AND state IN ('QUEUED','RUNNING');
CREATE INDEX market_job_owner_finished ON finn.app_job(owner_id,finished_at DESC) WHERE kind='YAHOO_DAILY_HISTORY' AND finished_at IS NOT NULL;
