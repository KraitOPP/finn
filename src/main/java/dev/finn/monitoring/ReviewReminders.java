
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReviewReminders {
    enum Recurrence {
        ONCE(0), DAILY(1), WEEKLY(7);
        final int days;
        Recurrence(int days) { this.days = days; }
    }
    record Settings(String title, String scheduledLocal, String timeZone, String recurrence, String quietStart, String quietEnd) {}
    record View(UUID reminderId, int revision, String state, Settings settings, String nextAt) {}
    record ReminderList(List<View> items) {}
    private record Values(Settings settings, LocalDateTime anchor, ZoneId zone, Recurrence recurrence, LocalTime start, LocalTime end) {}
    private record Stored(UUID owner, UUID id, int revision, String state, Values values, Instant nextAt) {}
    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm");

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ActivityWriter activity;
    ReviewReminders(JdbcTemplate jdbc, CurrentUser users, ActivityWriter activity) {
        this.jdbc = jdbc;
        this.users = users;
        this.activity = activity;
    }

    @Transactional
    public ReminderList list() {
        return new ReminderList(jdbc.query("""
                SELECT * FROM finn.review_reminder WHERE owner_id=? ORDER BY next_at NULLS LAST,reminder_id LIMIT 50
                """, (row, i) -> view(stored(row, i)), users.requireId()));
    }

    @Transactional
    public View save(UUID id, Integer expected, Settings input) {
        UUID owner = users.requireId();
        Values values = validate(input);
        if (id == null) {
            Instant next = future(values.anchor(), values.zone());
            int count = jdbc.queryForObject("SELECT count(*) FROM finn.review_reminder WHERE owner_id=?", Integer.class, owner);
            if (count >= 50) throw new ApiFailure(429, "REMINDER_LIMIT");
            id = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO finn.review_reminder(owner_id,reminder_id,title,scheduled_local,time_zone,recurrence,quiet_start,quiet_end,state,next_at)
                    VALUES (?,?,?,?,?,?,?,?,'ACTIVE',?)
                    """, owner, id, values.settings().title(), values.anchor(), values.zone().getId(),
                    values.recurrence().name(), values.start(), values.end(), utc(next));
        } else {
            Stored current = checkRevision(owner, id, expected);
            Values previous = current.values();
            boolean keepSchedule = current.nextAt() != null && previous.anchor().equals(values.anchor())
                    && previous.zone().equals(values.zone()) && previous.recurrence() == values.recurrence();
            Instant next = keepSchedule ? current.nextAt() : future(values.anchor(), values.zone());
            jdbc.update("""
                    UPDATE finn.review_reminder SET revision=revision+1,title=?,scheduled_local=?,time_zone=?,recurrence=?,
                        quiet_start=?,quiet_end=?,state='ACTIVE',next_at=? WHERE owner_id=? AND reminder_id=?
                    """, values.settings().title(), values.anchor(), values.zone().getId(), values.recurrence().name(),
                    values.start(), values.end(), utc(next), owner, id);
            activity.suppressPending(owner, ActivityWriter.Kind.REVIEW_REMINDER, id);
        }
        return view(require(owner, id, false));
    }

    @Transactional
    public View change(UUID id, int expected, String snoozeUntil) {
        UUID owner = users.requireId();
        Stored old = checkRevision(owner, id, expected);
        if (old.state().equals("CANCELLED") && snoozeUntil == null) return view(old);
        if (old.state().equals("CANCELLED")) throw ApiFailure.conflict();
        Instant next = snoozeUntil == null ? null : future(LocalDateTime.parse(snoozeUntil), old.values().zone());
        jdbc.update("""
                UPDATE finn.review_reminder SET revision=revision+1,state=?,next_at=? WHERE owner_id=? AND reminder_id=?
                """, next == null ? "CANCELLED" : "ACTIVE", utc(next), owner, id);
        activity.suppressPending(owner, ActivityWriter.Kind.REVIEW_REMINDER, id);
        return view(require(owner, id, false));
    }

    @Transactional
    public UUID syncThesisReview(UUID id,String title,String scheduledLocal,String zone) {
        var existing=id==null?null:require(users.requireId(),id,true);
        if(scheduledLocal==null) {
            if(existing!=null&&!existing.state().equals("CANCELLED"))change(id,existing.revision(),null);
            return null;
        }
        var settings=new Settings(title,scheduledLocal,zone,"ONCE",
                existing==null?null:existing.values().settings().quietStart(),
                existing==null?null:existing.values().settings().quietEnd());
        if(existing!=null&&!existing.state().equals("ACTIVE")&&existing.values().settings().scheduledLocal().equals(scheduledLocal)
                &&existing.values().zone().getId().equals(zone))return id;
        return save(id,existing==null?null:existing.revision(),settings).reminderId();
    }

    @Transactional
    public boolean processNext() {
        var due = jdbc.query("""
                SELECT * FROM finn.review_reminder WHERE state='ACTIVE' AND next_at<=clock_timestamp()
                ORDER BY next_at,reminder_id FOR UPDATE SKIP LOCKED LIMIT 1
                """, ReviewReminders::stored).stream().findFirst().orElse(null);
        if (due == null) return false;
        Instant now = Instant.now();
        Values values = due.values();
        Instant ready = CalendarTiming.outsideQuietHours(now.isBefore(due.nextAt()) ? due.nextAt() : now,
                values.zone(), values.start(), values.end());
        UUID occurrence = UUID.randomUUID();
        int added = jdbc.update("""
                INSERT INTO finn.review_occurrence(occurrence_id,owner_id,reminder_id,revision,due_at,deliver_at)
                VALUES (?,?,?,?,?,?) ON CONFLICT (owner_id,reminder_id,revision,due_at) DO NOTHING
                """, occurrence, due.owner(), due.id(), due.revision(), utc(due.nextAt()), utc(ready));
        if (added == 1) {
            activity.add(due.owner(), ActivityWriter.Kind.REVIEW_REMINDER, due.id(), due.id() + ":" + due.revision() + ":" + due.nextAt(),
                    values.settings().title(), occurrence, utc(ready));
        }
        Instant next = values.recurrence() == Recurrence.ONCE ? null : CalendarTiming.next(values.anchor(), values.zone(),
                values.recurrence().days, now.isBefore(due.nextAt()) ? due.nextAt() : now);
        jdbc.update("UPDATE finn.review_reminder SET state=?,next_at=? WHERE reminder_id=?",
                next == null ? "COMPLETED" : "ACTIVE", utc(next), due.id());
        return true;
    }

    private Stored checkRevision(UUID owner, UUID id, int expected) {
        var old = require(owner, id, true);
        if (old.revision() != expected) throw ApiFailure.conflict();
        if (expected >= 1000000) throw new ApiFailure(429, "REMINDER_VERSION_LIMIT");
        return old;
    }

    private Stored require(UUID owner, UUID id, boolean lock) {
        return jdbc.query("SELECT * FROM finn.review_reminder WHERE owner_id=? AND reminder_id=?" + (lock ? " FOR UPDATE" : ""),
                ReviewReminders::stored, owner, id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Values validate(Settings input) {
        if (!ZoneId.getAvailableZoneIds().contains(input.timeZone())) throw ApiFailure.invalid();
        try {
            var settings = new Settings(Catalogue.cleanName(input.title()), input.scheduledLocal(), input.timeZone(),
                    input.recurrence(), input.quietStart(), input.quietEnd());
            var start = input.quietStart() == null ? null : LocalTime.parse(input.quietStart());
            var end = input.quietEnd() == null ? null : LocalTime.parse(input.quietEnd());
            if ((start == null) != (end == null) || start != null && start.equals(end)) throw ApiFailure.invalid();
            return new Values(settings, LocalDateTime.parse(input.scheduledLocal()), ZoneId.of(input.timeZone()),
                    Recurrence.valueOf(input.recurrence()), start, end);
        } catch (DateTimeException invalid) {
            throw ApiFailure.invalid();
        }
    }

    private static Instant future(LocalDateTime local, ZoneId zone) {
        Instant instant = CalendarTiming.resolve(local, zone);
        Instant now = Instant.now();
        if (!instant.isAfter(now) || instant.isAfter(now.plus(Duration.ofDays(3650)))) throw ApiFailure.invalid();
        return instant;
    }

    private static Stored stored(ResultSet row, int ignored) throws SQLException {
        var anchor = row.getObject("scheduled_local", LocalDateTime.class);
        var zone = ZoneId.of(row.getString("time_zone"));
        var recurrence = Recurrence.valueOf(row.getString("recurrence"));
        var start = row.getObject("quiet_start", LocalTime.class);
        var end = row.getObject("quiet_end", LocalTime.class);
        var settings = new Settings(row.getString("title"), anchor.format(LOCAL), zone.getId(), recurrence.name(),
                start == null ? null : start.toString(), end == null ? null : end.toString());
        var next = row.getObject("next_at", OffsetDateTime.class);
        return new Stored(row.getObject("owner_id", UUID.class), row.getObject("reminder_id", UUID.class), row.getInt("revision"),
                row.getString("state"), new Values(settings, anchor, zone, recurrence, start, end), next == null ? null : next.toInstant());
    }

    private static View view(Stored row) {
        return new View(row.id(), row.revision(), row.state(), row.values().settings(), row.nextAt() == null ? null : row.nextAt().toString());
    }

    static OffsetDateTime utc(Instant value) {
        return value == null ? null : OffsetDateTime.ofInstant(value, ZoneOffset.UTC);
    }
}
