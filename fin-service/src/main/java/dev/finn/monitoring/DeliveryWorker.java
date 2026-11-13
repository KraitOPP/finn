
package dev.finn.monitoring;

import java.util.UUID;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;

@Service
public class DeliveryWorker {
    private record Work(UUID owner, UUID activity, String channel, int attempts) {}
    private final JdbcTemplate jdbc;
    private final EmailPreviewSink preview;
    private final Timer filingToInbox;

    DeliveryWorker(JdbcTemplate jdbc, EmailPreviewSink preview,MeterRegistry meters) {
        this.jdbc = jdbc;
        this.preview = preview;
        filingToInbox=Timer.builder("finn.filings.inbox.latency").publishPercentileHistogram()
                .maximumExpectedValue(Duration.ofMinutes(15)).description("Time from review to in-app delivery for immediate filing alerts").register(meters);
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
        if(outcome.equals("DELIVERED"))recordFilingLatency(work);
        return true;
    }

    private void recordFilingLatency(Work work){
        var reviewedAt=jdbc.query("""
                SELECT v.reviewed_at FROM finn.activity a
                LEFT JOIN finn.research_alert_match m ON m.owner_id=a.owner_id AND m.match_id=a.evidence_id
                LEFT JOIN finn.research_alert_rule r ON r.owner_id=m.owner_id AND r.rule_id=m.rule_id
                JOIN finn.company_event_version v ON v.owner_id=a.owner_id AND v.event_version_id=CASE
                    WHEN a.kind='COMPANY_EVENT' THEN a.evidence_id ELSE m.event_version_id END
                WHERE a.owner_id=? AND a.activity_id=? AND
                    (a.kind='COMPANY_EVENT' AND a.dedupe_key LIKE 'ARRIVAL:%' OR a.kind='RESEARCH_ALERT' AND r.cadence='IMMEDIATE')
                """,(row,index)->row.getObject(1,OffsetDateTime.class).toInstant(),work.owner(),work.activity()).stream().findFirst();
        reviewedAt.ifPresent(reviewed->TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){
            @Override public void afterCommit(){filingToInbox.record(Duration.between(reviewed,Instant.now()));}
        }));
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
