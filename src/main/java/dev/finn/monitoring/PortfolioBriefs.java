
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
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
import tools.jackson.databind.json.JsonMapper;

@Service
public class PortfolioBriefs {
    record Settings(String scheduledLocal, String timeZone, String cadence, boolean enabled, boolean includeAlerts,
                    boolean includeReminders, boolean includeCompany, boolean includeValuations) {}
    record Schedule(int revision, Settings settings, String nextAt) {}
    record Run(UUID runId, int scheduleRevision, String windowStart, String windowEnd, String createdAt) {}
    record Index(Schedule schedule, List<Run> runs) {}
    record ActivityItem(UUID activityId, String kind, String title, String createdAt) {}
    record SnapshotItem(UUID snapshotId, UUID portfolioId, UUID accountId, String accountName, LocalDate sessionDate,
                        String holdingsValue, String recordedValue, String status) {}
    record Brief(String windowStart, String windowEnd, String timeZone, List<ActivityItem> items,
                 List<SnapshotItem> snapshots, boolean truncated) {}
    record Window(Instant start, Instant end, LocalDate startDate, LocalDate endDate) {}
    private record Stored(UUID owner, LocalDateTime anchor, ZoneId zone, int interval, Schedule view) {}

    private static final DateTimeFormatter LOCAL = DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm");
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ActivityWriter activity;
    private final JsonMapper json;

    PortfolioBriefs(JdbcTemplate jdbc, CurrentUser users, ActivityWriter activity, JsonMapper json) {
        this.jdbc = jdbc;
        this.users = users;
        this.activity = activity;
        this.json = json;
    }

    @Transactional public Index index() {
        UUID owner = users.requireId();
        var stored = load(owner, false);
        var runs = jdbc.query("""
                SELECT * FROM finn.brief_run WHERE owner_id=? ORDER BY window_end DESC,run_id LIMIT 30
                """, (row, i) -> new Run(row.getObject("run_id",UUID.class), row.getInt("schedule_revision"),
                PriceEvaluationReport.instant(row,"window_start"), PriceEvaluationReport.instant(row,"window_end"),
                PriceEvaluationReport.instant(row,"created_at")), owner);
        return new Index(stored == null ? null : stored.view(), runs);
    }

    @Transactional public Schedule save(int revision, Settings input) {
        UUID owner = users.requireId();
        if (!ZoneId.getAvailableZoneIds().contains(input.timeZone())) throw ApiFailure.invalid();
        var old = load(owner, true);
        if ((old == null ? 0 : old.view().revision()) != revision) throw ApiFailure.conflict();
        if (revision >= 1000000) throw new ApiFailure(429,"BRIEF_VERSION_LIMIT");
        var zone = ZoneId.of(input.timeZone());
        LocalDateTime anchor;
        try { anchor = LocalDateTime.parse(input.scheduledLocal()); }
        catch (DateTimeException invalid) { throw ApiFailure.invalid(); }
        var now = Instant.now();
        var first = CalendarTiming.resolve(anchor,zone);
        boolean sameClock = old != null && old.anchor().equals(anchor) && old.zone().equals(zone);
        if ((!sameClock && !first.isAfter(now)) || first.isAfter(now.plus(Duration.ofDays(3650)))) throw ApiFailure.invalid();
        Instant next = input.enabled() ? CalendarTiming.next(anchor,zone,interval(input.cadence()),now) : null;
        jdbc.update("""
                INSERT INTO finn.brief_schedule(owner_id,scheduled_local,time_zone,cadence,include_alerts,include_reminders,
                    include_company,include_valuations,enabled,revision,next_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(owner_id) DO UPDATE SET scheduled_local=excluded.scheduled_local,time_zone=excluded.time_zone,
                    cadence=excluded.cadence,include_alerts=excluded.include_alerts,include_reminders=excluded.include_reminders,
                    include_company=excluded.include_company,include_valuations=excluded.include_valuations,
                    enabled=excluded.enabled,revision=excluded.revision,next_at=excluded.next_at
                """, owner, anchor, zone.getId(), input.cadence(), input.includeAlerts(), input.includeReminders(),
                input.includeCompany(), input.includeValuations(), input.enabled(), revision+1, ReviewReminders.utc(next));
        activity.suppressPending(owner, ActivityWriter.Kind.PORTFOLIO_BRIEF, owner);
        return load(owner,false).view();
    }

    @Transactional public Brief preview(LocalDate ending) {
        UUID owner = users.requireId();
        var schedule = load(owner,false);
        if (schedule == null) throw ApiFailure.notFound();
        var today = LocalDate.now(schedule.zone());
        var date = ending == null ? today : ending;
        if (date.isAfter(today) || date.isBefore(today.minusDays(366))) throw ApiFailure.invalid();
        return build(schedule, date);
    }

    @Transactional public Brief read(UUID id) {
        return evidence(users.requireId(),id);
    }

    Brief evidence(UUID owner, UUID id) {
        return jdbc.query("SELECT payload FROM finn.brief_run WHERE owner_id=? AND run_id=?",
                (row, i) -> json.readValue(row.getString(1), Brief.class), owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    @Transactional public boolean processNext() {
        var due = jdbc.query("""
                SELECT * FROM finn.brief_schedule WHERE enabled AND next_at<=clock_timestamp()
                ORDER BY next_at,owner_id FOR UPDATE SKIP LOCKED LIMIT 1
                """, PortfolioBriefs::row).stream().findFirst().orElse(null);
        if (due == null) return false;
        Instant slot = Instant.parse(due.view().nextAt());
        LocalDate end = slot.atZone(due.zone()).toLocalDate();
        Brief brief = build(due,end);
        UUID run = UUID.randomUUID();
        int written = jdbc.update("""
                INSERT INTO finn.brief_run(run_id,owner_id,schedule_revision,window_start,window_end,payload)
                VALUES (?,?,?,?,?,CAST(? AS jsonb)) ON CONFLICT(owner_id,window_start,window_end) DO NOTHING
                """, run,due.owner(),due.view().revision(),ReviewReminders.utc(Instant.parse(brief.windowStart())),
                ReviewReminders.utc(Instant.parse(brief.windowEnd())),json.writeValueAsString(brief));
        if (written == 1) {
            activity.add(due.owner(),ActivityWriter.Kind.PORTFOLIO_BRIEF,due.owner(),brief.windowStart()+"/"+brief.windowEnd(),
                    due.interval()==1 ? "Daily portfolio brief" : "Weekly portfolio brief",run,OffsetDateTime.now(ZoneOffset.UTC));
        }
        Instant now = Instant.now();
        var next = CalendarTiming.next(due.anchor(),due.zone(),due.interval(),now.isBefore(slot) ? slot : now);
        jdbc.update("UPDATE finn.brief_schedule SET next_at=? WHERE owner_id=?",ReviewReminders.utc(next),due.owner());
        return true;
    }

    private Brief build(Stored stored,LocalDate end) {
        var period = window(end,stored.zone(),stored.interval());
        var settings = stored.view().settings();
        var items = jdbc.query("""
                SELECT activity_id,kind,title,created_at FROM finn.activity
                WHERE owner_id=? AND created_at>=? AND created_at<? AND (
                    (? AND kind IN ('PRICE_RULE','VOLUME_RULE','ALLOCATION_RULE'))
                    OR (? AND kind='REVIEW_REMINDER') OR (? AND kind='COMPANY_EVENT'))
                ORDER BY created_at DESC,activity_id LIMIT 51
                """, (row,i) -> new ActivityItem(row.getObject("activity_id",UUID.class),row.getString("kind"),
                row.getString("title"),PriceEvaluationReport.instant(row,"created_at")), stored.owner(),ReviewReminders.utc(period.start()),
                ReviewReminders.utc(period.end()),settings.includeAlerts(),settings.includeReminders(),settings.includeCompany());
        List<SnapshotItem> snapshots = settings.includeValuations() ? jdbc.query("""
                SELECT DISTINCT ON(s.account_id) s.*,a.portfolio_id,a.name
                FROM finn.valuation_snapshot s JOIN finn.investment_account a USING(owner_id,account_id)
                WHERE s.owner_id=? AND s.session_date>=? AND s.session_date<?
                ORDER BY s.account_id,s.session_date DESC,s.receipt_order DESC LIMIT 51
                """, (row,i) -> new SnapshotItem(row.getObject("snapshot_id",UUID.class),row.getObject("portfolio_id",UUID.class),
                row.getObject("account_id",UUID.class),row.getString("name"),row.getObject("session_date",LocalDate.class),
                decimal(row,"holdings_value"),decimal(row,"recorded_value"),row.getString("status")),
                stored.owner(),period.startDate(),period.endDate()) : List.of();
        return new Brief(period.start().toString(),period.end().toString(),stored.zone().getId(),
                items.stream().limit(50).toList(),snapshots.stream().limit(50).toList(),items.size()>50||snapshots.size()>50);
    }

    static Window window(LocalDate ending,ZoneId zone,int days) {
        LocalDate start = ending.minusDays(days);
        return new Window(start.atStartOfDay(zone).toInstant(),ending.atStartOfDay(zone).toInstant(),start,ending);
    }

    private Stored load(UUID owner,boolean lock) {
        return jdbc.query("SELECT * FROM finn.brief_schedule WHERE owner_id=?"+(lock ? " FOR UPDATE" : ""),
                PortfolioBriefs::row,owner).stream().findFirst().orElse(null);
    }

    private static Stored row(ResultSet row,int ignored) throws SQLException {
        var anchor = row.getObject("scheduled_local",LocalDateTime.class);
        var zone = ZoneId.of(row.getString("time_zone"));
        String cadence = row.getString("cadence");
        var settings = new Settings(anchor.format(LOCAL),zone.getId(),cadence,row.getBoolean("enabled"),row.getBoolean("include_alerts"),
                row.getBoolean("include_reminders"),row.getBoolean("include_company"),row.getBoolean("include_valuations"));
        return new Stored(row.getObject("owner_id",UUID.class),anchor,zone,interval(cadence),
                new Schedule(row.getInt("revision"),settings,PriceEvaluationReport.instant(row,"next_at")));
    }

    private static int interval(String cadence) { return cadence.equals("DAILY") ? 1 : 7; }

    private static String decimal(ResultSet row,String column) throws SQLException {
        var amount = row.getBigDecimal(column);
        return amount == null ? null : amount.stripTrailingZeros().toPlainString();
    }
}
