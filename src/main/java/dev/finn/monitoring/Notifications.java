
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class Notifications {
    record Item(UUID activityId, String kind, UUID subjectId, String title, String createdAt, String readAt) {}
    record Page(List<Item> items, UUID nextBefore) {}
    record Attempt(String channel, int attempt, String outcome, String attemptedAt) {}
    record Delivery(String channel, String status, int attempts, String nextAttemptAt, String completedAt, String failureCode) {}
    record ReminderEvidence(int revision, String dueAt, String deliverAt) {}
    record Detail(Item notification, PriceEvaluationReport.Evaluation price, ReminderEvidence reminder,
                  List<Delivery> deliveries, List<Attempt> attempts) {}
    record DeliveryItem(UUID activityId, String title, String kind, Delivery delivery) {}
    record DeliveryPage(boolean emailPreviewEnabled, List<DeliveryItem> items) {}

    private static final String OWNED_INBOX = """
            FROM finn.activity a JOIN finn.activity_delivery d USING(owner_id,activity_id)
            WHERE a.owner_id=? AND d.channel='IN_APP' AND d.status='DELIVERED'
            """;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final PriceEvaluationReport prices;
    private final EmailPreviewSink preview;

    Notifications(JdbcTemplate jdbc, CurrentUser users, PriceEvaluationReport prices, EmailPreviewSink preview) {
        this.jdbc = jdbc;
        this.users = users;
        this.prices = prices;
        this.preview = preview;
    }

    @Transactional
    public Page list(UUID before) {
        UUID owner = users.requireId();
        List<Item> rows;
        String order = " ORDER BY a.created_at DESC,a.activity_id DESC LIMIT 41";
        if (before == null) {
            rows = jdbc.query("SELECT a.* " + OWNED_INBOX + order, Notifications::item, owner);
        } else {
            find(owner, before);
            rows = jdbc.query("SELECT a.* " + OWNED_INBOX + """
                    AND (a.created_at,a.activity_id)<(SELECT created_at,activity_id FROM finn.activity WHERE owner_id=? AND activity_id=?)
                    """ + order, Notifications::item, owner, owner, before);
        }
        if (rows.size() <= 40) return new Page(rows, null);
        return new Page(rows.subList(0, 40), rows.get(39).activityId());
    }

    @Transactional
    public Detail detail(UUID id) {
        UUID owner = users.requireId();
        Item item = find(owner, id);
        UUID evidence = jdbc.queryForObject("SELECT evidence_id FROM finn.activity WHERE owner_id=? AND activity_id=?", UUID.class, owner, id);
        var evaluation = item.kind().equals("PRICE_RULE") ? prices.read(owner, evidence) : null;
        var reminder = item.kind().equals("REVIEW_REMINDER") ? jdbc.query("""
                SELECT revision,due_at,deliver_at FROM finn.review_occurrence WHERE owner_id=? AND occurrence_id=?
                """, (row, i) -> new ReminderEvidence(row.getInt("revision"), PriceEvaluationReport.instant(row, "due_at"),
                PriceEvaluationReport.instant(row, "deliver_at")), owner, evidence).stream().findFirst().orElse(null) : null;
        var deliveries = jdbc.query("SELECT * FROM finn.activity_delivery WHERE owner_id=? AND activity_id=? ORDER BY channel",
                Notifications::delivery, owner, id);
        var attempts = jdbc.query("""
                SELECT * FROM finn.activity_delivery_attempt WHERE owner_id=? AND activity_id=? ORDER BY attempted_at,channel,attempt
                """, (row, i) -> new Attempt(row.getString("channel"), row.getInt("attempt"), row.getString("outcome"),
                PriceEvaluationReport.instant(row, "attempted_at")), owner, id);
        return new Detail(item, evaluation, reminder, deliveries, attempts);
    }

    @Transactional
    public Item read(UUID id, boolean read) {
        UUID owner = users.requireId();
        find(owner, id);
        jdbc.update("""
                UPDATE finn.activity SET read_at=CASE WHEN ? THEN coalesce(read_at,clock_timestamp()) ELSE NULL END
                WHERE owner_id=? AND activity_id=?
                """, read, owner, id);
        return find(owner, id);
    }

    @Transactional
    public DeliveryPage deliveries() {
        UUID owner = users.requireId();
        return new DeliveryPage(preview.enabled(), jdbc.query("""
                SELECT a.title,a.kind,d.* FROM finn.activity a JOIN finn.activity_delivery d USING(owner_id,activity_id)
                WHERE a.owner_id=? ORDER BY a.created_at DESC,a.activity_id DESC,d.channel LIMIT 50
                """, (row, i) -> new DeliveryItem(row.getObject("activity_id", UUID.class), row.getString("title"),
                row.getString("kind"), delivery(row, i)), owner));
    }

    private Item find(UUID owner, UUID id) {
        return jdbc.query("SELECT a.* " + OWNED_INBOX + " AND a.activity_id=?", Notifications::item, owner, id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Item item(ResultSet row, int ignored) throws SQLException {
        return new Item(row.getObject("activity_id", UUID.class), row.getString("kind"), row.getObject("subject_id", UUID.class),
                row.getString("title"), PriceEvaluationReport.instant(row, "created_at"), PriceEvaluationReport.instant(row, "read_at"));
    }

    private static Delivery delivery(ResultSet row, int ignored) throws SQLException {
        return new Delivery(row.getString("channel"), row.getString("status"), row.getInt("attempts"),
                PriceEvaluationReport.instant(row, "next_attempt_at"), PriceEvaluationReport.instant(row, "completed_at"), row.getString("failure_code"));
    }
}
