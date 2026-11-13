
package dev.finn.monitoring;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityWriter {
    public enum Kind { PRICE_RULE, REVIEW_REMINDER, PORTFOLIO_BRIEF, VOLUME_RULE, ALLOCATION_RULE, COMPANY_EVENT, THESIS_REVIEW, RESEARCH_ALERT }

    private final JdbcTemplate jdbc;
    private final EmailPreviewSink preview;
    ActivityWriter(JdbcTemplate jdbc, EmailPreviewSink preview) {
        this.jdbc = jdbc;
        this.preview = preview;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public UUID add(UUID owner, Kind kind, UUID subject, String key, String title, UUID evidence, OffsetDateTime availableAt) {
        UUID id = UUID.randomUUID();
        int added = jdbc.update("""
                INSERT INTO finn.activity(activity_id,owner_id,kind,subject_id,dedupe_key,title,evidence_id,available_at)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (owner_id,kind,dedupe_key) DO NOTHING
                """, id, owner, kind.name(), subject, key, title, evidence, availableAt);
        if (added == 0) return null;
        jdbc.update("""
                INSERT INTO finn.activity_delivery(owner_id,activity_id,channel,next_attempt_at)
                VALUES (?,?,'IN_APP',?)
                """, owner, id, availableAt);
        if (preview.enabled()) {
            jdbc.update("""
                    INSERT INTO finn.activity_delivery(owner_id,activity_id,channel,next_attempt_at)
                    SELECT owner_id,?,'EMAIL_PREVIEW',? FROM finn.user_preferences WHERE owner_id=? AND email_notifications
                    """, id, availableAt, owner);
        }
        return id;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void suppressPendingActivity(UUID owner, UUID activity) {
        jdbc.update("""
                UPDATE finn.activity_delivery SET status='SUPPRESSED',completed_at=clock_timestamp(),failure_code='SCHEDULE_CHANGED'
                WHERE owner_id=? AND activity_id=? AND status='PENDING'
                """,owner,activity);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void suppressPending(UUID owner, Kind kind, UUID subject) {
        jdbc.update("""
                UPDATE finn.activity_delivery d SET status='SUPPRESSED',completed_at=clock_timestamp(),
                    failure_code='SCHEDULE_CHANGED'
                FROM finn.activity a WHERE a.owner_id=d.owner_id AND a.activity_id=d.activity_id
                    AND a.owner_id=? AND a.kind=? AND a.subject_id=? AND d.status='PENDING'
                """, owner, kind.name(), subject);
    }
}
