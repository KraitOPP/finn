
package dev.finn.monitoring;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

@Service
public class DeliveryWorker {
    private record Work(UUID owner, UUID activity, String channel, int attempts) {}
    private final JdbcTemplate jdbc;
    private final EmailPreviewSink preview;

    DeliveryWorker(JdbcTemplate jdbc, EmailPreviewSink preview) {
        this.jdbc = jdbc;
        this.preview = preview;
    }

    @Transactional
    public boolean processNext() {
        Work work = jdbc.query("""
                SELECT owner_id,activity_id,channel,attempts FROM finn.activity_delivery
                WHERE status='PENDING' AND next_attempt_at<=clock_timestamp()
                ORDER BY next_attempt_at,activity_id,channel FOR UPDATE SKIP LOCKED LIMIT 1
                """, (row, i) -> new Work(row.getObject(1, UUID.class), row.getObject(2, UUID.class),
                row.getString(3), row.getInt(4))).stream().findFirst().orElse(null);
        if (work == null) return false;

        int attempt = work.attempts() + 1;
        String outcome;
        var tx = TransactionAspectSupport.currentTransactionStatus();
        Object checkpoint = tx.createSavepoint();
        try {
            outcome = deliver(work);
        } catch (RuntimeException unavailable) {
            tx.rollbackToSavepoint(checkpoint);
            outcome = attempt < 3 ? "RETRY" : "FAILED";
        } finally {
            tx.releaseSavepoint(checkpoint);
        }

        String status = outcome.equals("RETRY") ? "PENDING" : outcome;
        String failure = switch (outcome) {
            case "RETRY", "FAILED" -> "CHANNEL_TEMPORARILY_UNAVAILABLE";
            default -> null;
        };
        jdbc.update("""
                UPDATE finn.activity_delivery SET attempts=?,status=?,failure_code=?,
                    next_attempt_at=clock_timestamp()+(? * interval '1 minute'),
                    completed_at=CASE WHEN ?='PENDING' THEN NULL ELSE clock_timestamp() END
                WHERE owner_id=? AND activity_id=? AND channel=?
                """, attempt, status, failure, 5 * attempt, status, work.owner(), work.activity(), work.channel());
        jdbc.update("""
                INSERT INTO finn.activity_delivery_attempt(owner_id,activity_id,channel,attempt,outcome) VALUES (?,?,?,?,?)
                """, work.owner(), work.activity(), work.channel(), attempt, outcome);
        return true;
    }

    private String deliver(Work work) {
        boolean inApp = work.channel().equals("IN_APP");
        boolean allowed = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT coalesce((SELECT CASE WHEN ? THEN in_app_notifications ELSE email_notifications END
                  FROM finn.user_preferences WHERE owner_id=?), ?)
                """, Boolean.class, inApp, work.owner(), inApp));
        if (!allowed) return "SUPPRESSED";
        if (inApp) return "DELIVERED";
        if (!preview.enabled()) return "SUPPRESSED";
        preview.save(work.owner(), work.activity());
        return "PREVIEWED";
    }
}
