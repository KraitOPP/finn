
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PriceEvaluationReport {
    record CloseEvidence(UUID observationId, LocalDate sessionDate, String source, String priceBasis,
                         String close, String sourceReference, String receivedAt) {}
    record Evaluation(UUID evaluationId, int revision, LocalDate sessionDate, String outcome, String evaluatedAt,
                      CloseEvidence observation, CloseEvidence previous) {}
    record Report(String status, List<Evaluation> items) {}

    private static final String EVIDENCE = """
            SELECT e.*,o.session_date AS o_date,o.source AS o_source,o.price_basis AS o_basis,o.close AS o_close,
                o.source_ref AS o_reference,o.received_at AS o_received,
                p.session_date AS p_date,p.source AS p_source,p.price_basis AS p_basis,p.close AS p_close,
                p.source_ref AS p_reference,p.received_at AS p_received
            FROM finn.monitor_evaluation e
            LEFT JOIN finn.market_observation o ON o.owner_id=e.owner_id AND o.observation_id=e.observation_id
            LEFT JOIN finn.market_observation p ON p.owner_id=e.owner_id AND p.observation_id=e.previous_observation_id
            """;
    private final CurrentUser users;
    private final JdbcTemplate jdbc;

    PriceEvaluationReport(CurrentUser users, JdbcTemplate jdbc) {
        this.users = users;
        this.jdbc = jdbc;
    }

    @Transactional
    public Report report(UUID rule) {
        UUID owner = users.requireId();
        String state = jdbc.query("""
                SELECT v.enabled,v.expires_on,p.status FROM finn.monitor_rule r JOIN finn.monitor_rule_version v USING(owner_id,rule_id,revision)
                LEFT JOIN finn.monitor_rule_progress p USING(owner_id,rule_id,revision) WHERE r.owner_id=? AND r.rule_id=?
                """, (row, i) -> {
                    if (!row.getBoolean("enabled")) return "PAUSED";
                    var expires = row.getObject("expires_on", LocalDate.class);
                    if (expires != null && expires.isBefore(LocalDate.now(PriceRules.EXCHANGE_ZONE))) return "EXPIRED";
                    var status = row.getString("status");
                    return status == null ? "WAITING_FOR_PRICE" : status;
                }, owner, rule).stream().findFirst().orElseThrow(ApiFailure::notFound);
        return new Report(state, jdbc.query(EVIDENCE + """
                WHERE e.owner_id=? AND e.rule_id=? ORDER BY e.evaluated_at DESC,e.evaluation_id LIMIT 50
                """, PriceEvaluationReport::row, owner, rule));
    }

    Evaluation read(UUID owner, UUID id) {
        return jdbc.query(EVIDENCE + " WHERE e.owner_id=? AND e.evaluation_id=?",
                PriceEvaluationReport::row, owner, id).stream().findFirst().orElse(null);
    }

    private static Evaluation row(ResultSet row, int ignored) throws SQLException {
        return new Evaluation(row.getObject("evaluation_id", UUID.class), row.getInt("revision"),
                row.getObject("session_date", LocalDate.class), row.getString("outcome"), instant(row, "evaluated_at"),
                close(row, "o_", "observation_id"), close(row, "p_", "previous_observation_id"));
    }

    private static CloseEvidence close(ResultSet row, String prefix, String idColumn) throws SQLException {
        var date = row.getObject(prefix + "date", LocalDate.class);
        if (date == null) return null;
        return new CloseEvidence(row.getObject(idColumn, UUID.class), date, row.getString(prefix + "source"),
                row.getString(prefix + "basis"), row.getBigDecimal(prefix + "close").stripTrailingZeros().toPlainString(),
                row.getString(prefix + "reference"), instant(row, prefix + "received"));
    }

    static String instant(ResultSet row, String column) throws SQLException {
        var value = row.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant().toString();
    }
}
