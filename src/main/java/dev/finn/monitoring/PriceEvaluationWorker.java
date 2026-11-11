
package dev.finn.monitoring;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PriceEvaluationWorker {
    private record Due(UUID owner, UUID rule, int revision, UUID listing, String name, String source,
                       PriceRulePolicy.Comparison comparison, BigDecimal threshold, int maximumAge,
                       int cooldownMinutes, boolean rearm, LocalDate lastSession, boolean latched,
                       OffsetDateTime lastTrigger) {}
    private record Observation(UUID id, PriceRulePolicy.Close close) {}

    private final JdbcTemplate jdbc;
    private final ActivityWriter activity;

    PriceEvaluationWorker(JdbcTemplate jdbc, ActivityWriter activity) {
        this.jdbc = jdbc;
        this.activity = activity;
    }

    @Transactional
    public boolean processNext() {
        var now = OffsetDateTime.now(ZoneOffset.UTC);
        var today = now.atZoneSameInstant(PriceRules.EXCHANGE_ZONE).toLocalDate();
        var due = claim(today);
        if (due == null) return false;
        jdbc.update("UPDATE finn.monitor_rule SET next_check_at=clock_timestamp()+interval '1 minute' WHERE rule_id=?", due.rule());
        List<Observation> history = closes(due, today);
        if (history.isEmpty()) {
            progress(due, due.lastSession(), due.latched(), due.lastTrigger(), "WAITING_FOR_PRICE");
            return true;
        }
        var current = history.getFirst();
        var session = current.close().date();
        if (session.isBefore(today.minusDays(due.maximumAge()))) {
            progress(due, due.lastSession(), due.latched(), due.lastTrigger(), "STALE");
            return true;
        }
        if (due.lastSession() != null && !session.isAfter(due.lastSession())) return true;

        Observation previous = history.size() < 2 ? null : history.get(1);
        if (due.comparison().name().startsWith("CROSS_")
                && (due.lastSession() == null || previous == null || previous.close().date().isBefore(due.lastSession()))) previous = null;
        if (previous != null && (due.comparison().name().startsWith("CROSS_") || due.comparison().name().startsWith("MOVE_"))
                && adjustedBetween(due, previous.close().date(), session)) previous = null;
        var result = PriceRulePolicy.evaluate(due.comparison(), due.threshold(), current.close(), previous == null ? null : previous.close());
        boolean latched = due.latched();
        if (result.resets() && due.rearm()) latched = false;
        boolean ready = due.lastTrigger() == null || !now.isBefore(due.lastTrigger().plusMinutes(due.cooldownMinutes()));
        boolean triggered = result.satisfied() && !latched && ready;
        String outcome = outcome(result, latched, ready);
        UUID evaluation = UUID.randomUUID();
        int inserted = jdbc.update("""
                INSERT INTO finn.monitor_evaluation(evaluation_id,owner_id,rule_id,revision,session_date,observation_id,
                    previous_observation_id,outcome) VALUES (?,?,?,?,?,?,?,?)
                ON CONFLICT (owner_id,rule_id,revision,session_date) DO NOTHING
                """, evaluation, due.owner(), due.rule(), due.revision(), session, current.id(), previous == null ? null : previous.id(), outcome);
        if (inserted == 1 && triggered) {
            activity.add(due.owner(), ActivityWriter.Kind.PRICE_RULE, due.rule(),
                    due.rule() + ":" + due.revision() + ":" + session, due.name(), evaluation, now);
        }
        progress(due, session, latched || triggered, triggered ? now : due.lastTrigger(),
                result.comparable() ? "EVALUATED" : "INSUFFICIENT_HISTORY");
        return true;
    }

    private Due claim(LocalDate today) {
        return jdbc.query("""
                SELECT r.owner_id,r.rule_id,r.revision,v.listing_id,v.name,v.source,v.comparison,v.threshold,v.max_age_days,
                    v.cooldown_minutes,v.rearm,p.last_session,coalesce(p.latched,false) AS latched,p.last_trigger_at
                FROM finn.monitor_rule r JOIN finn.monitor_rule_version v USING(owner_id,rule_id,revision)
                LEFT JOIN finn.monitor_rule_progress p USING(owner_id,rule_id,revision)
                WHERE r.next_check_at<=clock_timestamp() AND v.enabled AND (v.expires_on IS NULL OR v.expires_on>=?)
                ORDER BY r.next_check_at,r.rule_id FOR UPDATE OF r SKIP LOCKED LIMIT 1
                """, (row, i) -> new Due(row.getObject("owner_id", UUID.class), row.getObject("rule_id", UUID.class),
                row.getInt("revision"), row.getObject("listing_id", UUID.class), row.getString("name"), row.getString("source"),
                PriceRulePolicy.Comparison.valueOf(row.getString("comparison")), row.getBigDecimal("threshold"),
                row.getInt("max_age_days"), row.getInt("cooldown_minutes"), row.getBoolean("rearm"),
                row.getObject("last_session", LocalDate.class), row.getBoolean("latched"),
                row.getObject("last_trigger_at", OffsetDateTime.class)), today).stream().findFirst().orElse(null);
    }

    private List<Observation> closes(Due due, LocalDate today) {
        return jdbc.query("""
                SELECT DISTINCT ON (session_date) observation_id,session_date,close
                FROM finn.market_observation
                WHERE owner_id=? AND listing_id=? AND source=? AND session_date<?
                ORDER BY session_date DESC,receipt_order DESC LIMIT 2
                """, (row, i) -> new Observation(row.getObject(1, UUID.class),
                new PriceRulePolicy.Close(row.getObject(2, LocalDate.class), row.getBigDecimal(3))),
                due.owner(), due.listing(), due.source(), today);
    }

    private boolean adjustedBetween(Due due, LocalDate before, LocalDate current) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(
                    SELECT 1 FROM finn.ledger_event e JOIN finn.listing l USING(owner_id,security_id)
                    WHERE e.owner_id=? AND l.listing_id=? AND e.effective_date>? AND e.effective_date<=?
                    AND e.event_type IN ('SPLIT','BONUS')
                    AND NOT EXISTS(SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=e.owner_id AND r.account_id=e.account_id AND r.reversal_of=e.event_id)
                )
                """, Boolean.class, due.owner(), due.listing(), before, current));
    }

    private void progress(Due due, LocalDate session, boolean latched, OffsetDateTime lastTrigger, String status) {
        jdbc.update("""
                INSERT INTO finn.monitor_rule_progress(owner_id,rule_id,revision,last_session,last_trigger_at,latched,status)
                VALUES (?,?,?,?,?,?,?) ON CONFLICT (owner_id,rule_id,revision) DO UPDATE
                SET last_session=excluded.last_session,last_trigger_at=excluded.last_trigger_at,latched=excluded.latched,status=excluded.status
                """, due.owner(), due.rule(), due.revision(), session, lastTrigger, latched, status);
    }

    private static String outcome(PriceRulePolicy.Match match, boolean latched, boolean ready) {
        if (!match.comparable()) return "INSUFFICIENT_HISTORY";
        if (!match.satisfied()) return match.resets() ? "BELOW_OR_ABOVE_RESET" : "NO_MATCH";
        if (latched) return "ALREADY_LATCHED";
        return ready ? "TRIGGERED" : "COOLDOWN";
    }
}
