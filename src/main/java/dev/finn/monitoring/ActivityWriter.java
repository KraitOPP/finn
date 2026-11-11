
package dev.finn.monitoring;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ActivityWriter {
    public enum Kind { PRICE_RULE, REVIEW_REMINDER, PORTFOLIO_BRIEF, VOLUME_RULE, ALLOCATION_RULE, COMPANY_EVENT }

    private final JdbcTemplate jdbc;
    ActivityWriter(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    @Transactional(propagation = Propagation.MANDATORY)
    public void add(UUID owner, Kind kind, UUID subject, String key, String title, UUID evidence, OffsetDateTime availableAt) {
        UUID id = UUID.randomUUID();
        int added = jdbc.update("""
                INSERT INTO finn.activity(activity_id,owner_id,kind,subject_id,dedupe_key,title,evidence_id,available_at)
                VALUES (?,?,?,?,?,?,?,?) ON CONFLICT (owner_id,kind,dedupe_key) DO NOTHING
                """, id, owner, kind.name(), subject, key, title, evidence, availableAt);
        if (added == 0) return;
        jdbc.update("""
                INSERT INTO finn.activity_delivery(owner_id,activity_id,channel,next_attempt_at)
                VALUES (?,?,'IN_APP',?)
                """, owner, id, availableAt);
    }
}
