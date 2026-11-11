
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.market.Valuations;
import dev.finn.platform.ApiFailure;
import dev.finn.portfolio.Portfolios;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class Indicators {
    record Rule(UUID ruleId, UUID listingId, UUID portfolioId, String kind, String title, String threshold,
                int revision, boolean enabled, String result, LocalDate lastSession, String symbol, String exchange) {}
    record RuleList(List<Rule> items) {}
    record Evaluation(UUID evaluationId, int revision, LocalDate sessionDate, String threshold, String metric,
                      LocalDate baselineStart, String holdingValue, String equityValue, boolean triggered, String evaluatedAt) {}
    record Evaluations(List<Evaluation> items) {}
    private record Work(UUID owner, UUID rule, UUID listing, UUID portfolio, UUID security, String kind,
                        String title, BigDecimal threshold, int revision, boolean latched, LocalDate last) {}
    private record VolumeBar(UUID id, LocalDate date, BigDecimal volume) {}
    private record Sample(LocalDate session, BigDecimal numerator, BigDecimal denominator, LocalDate start, List<UUID> inputs,
                          String holdingValue, String equityValue) {
        BigDecimal display() { return numerator.divide(denominator, 8, RoundingMode.HALF_EVEN); }
        boolean matches(BigDecimal cutoff) { return numerator.compareTo(denominator.multiply(cutoff)) >= 0; }
    }
    private static final int BASELINE = 10;
    private static final String RULES = """
            SELECT r.*,l.exchange,h.symbol FROM finn.indicator_rule r JOIN finn.listing l USING(owner_id,listing_id)
            JOIN finn.listing_symbol h ON h.owner_id=l.owner_id AND h.listing_id=l.listing_id AND h.valid_to IS NULL
            """;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final Portfolios portfolios;
    private final Valuations valuations;
    private final ActivityWriter activity;
    private final JsonMapper json;

    Indicators(JdbcTemplate jdbc, CurrentUser users, Catalogue catalogue, Portfolios portfolios, Valuations valuations,
               ActivityWriter activity, JsonMapper json) {
        this.jdbc = jdbc;
        this.users = users;
        this.catalogue = catalogue;
        this.portfolios = portfolios;
        this.valuations = valuations;
        this.activity = activity;
        this.json = json;
    }

    @Transactional public RuleList list() {
        return new RuleList(jdbc.query(RULES + " WHERE r.owner_id=? ORDER BY r.rule_id LIMIT 50", Indicators::rule, users.requireId()));
    }

    @Transactional public Rule create(UUID listing, UUID portfolio, String kind, String title, String rawThreshold) {
        UUID owner = users.requireId();
        catalogue.listing(owner, listing);
        if (kind.equals("ALLOCATION") != (portfolio != null)) throw ApiFailure.invalid();
        if (portfolio != null) portfolios.require(owner, portfolio, true, false);
        if (jdbc.queryForObject("SELECT count(*) FROM finn.indicator_rule WHERE owner_id=?", Integer.class, owner) >= 50)
            throw new ApiFailure(429, "INDICATOR_RULE_LIMIT");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO finn.indicator_rule(rule_id,owner_id,listing_id,portfolio_id,kind,title,threshold) VALUES (?,?,?,?,?,?,?)
                """, id, owner, listing, portfolio, kind, Catalogue.cleanName(title), threshold(kind, rawThreshold));
        return require(owner, id);
    }

    @Transactional public Rule edit(UUID id, int revision, String rawThreshold, boolean enabled) {
        UUID owner = users.requireId();
        var old = require(owner, id);
        if (old.revision() != revision) throw ApiFailure.conflict();
        var threshold = threshold(old.kind(), rawThreshold);
        if (old.enabled() == enabled && new BigDecimal(old.threshold()).compareTo(threshold) == 0) return old;
        if (revision >= 1000000) throw new ApiFailure(429, "INDICATOR_VERSION_LIMIT");
        int updated = jdbc.update("""
                UPDATE finn.indicator_rule SET threshold=?,enabled=?,revision=revision+1,latched=false,
                    last_session=NULL,result='WAITING',next_check_at=clock_timestamp() WHERE owner_id=? AND rule_id=? AND revision=?
                """, threshold, enabled, owner, id, revision);
        if (updated != 1) throw ApiFailure.conflict();
        return require(owner, id);
    }

    @Transactional public Evaluations history(UUID id) {
        UUID owner = users.requireId();
        require(owner, id);
        return new Evaluations(jdbc.query("""
                SELECT * FROM finn.indicator_evaluation WHERE owner_id=? AND rule_id=? ORDER BY evaluated_at DESC,evaluation_id LIMIT 40
                """, Indicators::evaluation, owner, id));
    }

    Evaluation evidence(UUID owner, UUID id) {
        return jdbc.query("SELECT * FROM finn.indicator_evaluation WHERE owner_id=? AND evaluation_id=?",
                Indicators::evaluation, owner, id).stream().findFirst().orElse(null);
    }

    @Transactional public boolean processNext() {
        Work work = jdbc.query("""
                SELECT r.*,l.security_id FROM finn.indicator_rule r JOIN finn.listing l USING(owner_id,listing_id)
                WHERE r.enabled AND r.next_check_at<=clock_timestamp() ORDER BY r.next_check_at,r.rule_id
                FOR UPDATE OF r SKIP LOCKED LIMIT 1
                """, (row, i) -> new Work(row.getObject("owner_id",UUID.class), row.getObject("rule_id",UUID.class),
                row.getObject("listing_id",UUID.class), row.getObject("portfolio_id",UUID.class), row.getObject("security_id",UUID.class),
                row.getString("kind"), row.getString("title"), row.getBigDecimal("threshold"), row.getInt("revision"),
                row.getBoolean("latched"), row.getObject("last_session",LocalDate.class))).stream().findFirst().orElse(null);
        if (work == null) return false;
        jdbc.update("UPDATE finn.indicator_rule SET next_check_at=clock_timestamp()+interval '2 minutes' WHERE rule_id=?", work.rule());
        var today = LocalDate.now(PriceRules.EXCHANGE_ZONE);
        Sample sample = work.kind().equals("VOLUME") ? volume(work, today) : allocation(work, today);
        if (sample == null) {
            jdbc.update("UPDATE finn.indicator_rule SET result='INSUFFICIENT_COVERAGE' WHERE rule_id=?", work.rule());
            return true;
        }
        if (work.last() != null && !sample.session().isAfter(work.last())) return true;
        boolean matches = sample.matches(work.threshold());
        boolean triggered = matches && !work.latched();
        UUID id = UUID.randomUUID();
        int inserted = jdbc.update("""
                INSERT INTO finn.indicator_evaluation(evaluation_id,owner_id,rule_id,revision,session_date,threshold,metric,
                    baseline_start,input_ids,holding_value,equity_value,triggered) VALUES (?,?,?,?,?,?,?,?,CAST(? AS jsonb),?,?,?)
                ON CONFLICT(owner_id,rule_id,revision,session_date) DO NOTHING
                """, id, work.owner(), work.rule(), work.revision(), sample.session(), work.threshold(), text(sample.display()),
                sample.start(), json.writeValueAsString(sample.inputs()), sample.holdingValue(), sample.equityValue(), triggered);
        if (inserted == 1 && triggered) {
            var kind = work.kind().equals("VOLUME") ? ActivityWriter.Kind.VOLUME_RULE : ActivityWriter.Kind.ALLOCATION_RULE;
            activity.add(work.owner(), kind, work.rule(), work.rule()+":"+work.revision()+":"+sample.session(), work.title(), id, OffsetDateTime.now(ZoneOffset.UTC));
        }
        jdbc.update("UPDATE finn.indicator_rule SET result='EVALUATED',latched=?,last_session=? WHERE rule_id=?",
                matches, sample.session(), work.rule());
        return true;
    }

    private Sample volume(Work work, LocalDate today) {
        var bars = jdbc.query("""
                SELECT DISTINCT ON(session_date) observation_id,session_date,(provider_bar->>'volume')::numeric AS volume
                FROM finn.market_observation WHERE owner_id=? AND listing_id=? AND source='YAHOO_YFINANCE'
                    AND session_date>=? AND session_date<?
                ORDER BY session_date DESC,receipt_order DESC LIMIT 11
                """, (row, i) -> new VolumeBar(row.getObject(1,UUID.class), row.getObject(2,LocalDate.class), row.getBigDecimal(3)),
                work.owner(), work.listing(), today.minusDays(28), today);
        if (bars.size() != BASELINE+1 || bars.getFirst().date().isBefore(today.minusDays(4))) return null;
        BigDecimal baseline = bars.subList(1, bars.size()).stream().map(VolumeBar::volume).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (baseline.signum() <= 0) return null;
        var latest = bars.getFirst();
        return new Sample(latest.date(), latest.volume().multiply(BigDecimal.valueOf(BASELINE)), baseline,
                bars.getLast().date(), bars.stream().map(VolumeBar::id).toList(), null, null);
    }

    private Sample allocation(Work work, LocalDate today) {
        var exposure = valuations.exposure(work.owner(), work.portfolio(), work.security(), today);
        if (exposure == null) return null;
        return new Sample(exposure.sessionDate(), exposure.holdingValue().movePointRight(2), exposure.equityValue(), null,
                exposure.observations(), text(exposure.holdingValue()), text(exposure.equityValue()));
    }

    private Rule require(UUID owner, UUID id) {
        return jdbc.query(RULES + " WHERE r.owner_id=? AND r.rule_id=?", Indicators::rule, owner, id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static BigDecimal threshold(String kind, String raw) {
        var value = new BigDecimal(raw);
        if (value.signum() <= 0 || value.compareTo(BigDecimal.valueOf(kind.equals("VOLUME") ? 1000 : 100)) > 0)
            throw ApiFailure.invalid();
        return value;
    }

    private static Rule rule(ResultSet row,int index) throws SQLException {
        return new Rule(row.getObject("rule_id",UUID.class), row.getObject("listing_id",UUID.class), row.getObject("portfolio_id",UUID.class),
                row.getString("kind"), row.getString("title"), text(row.getBigDecimal("threshold")), row.getInt("revision"),
                row.getBoolean("enabled"), row.getString("result"), row.getObject("last_session",LocalDate.class), row.getString("symbol"), row.getString("exchange"));
    }

    private static Evaluation evaluation(ResultSet row,int index) throws SQLException {
        return new Evaluation(row.getObject("evaluation_id",UUID.class), row.getInt("revision"), row.getObject("session_date",LocalDate.class),
                text(row.getBigDecimal("threshold")), row.getString("metric"), row.getObject("baseline_start",LocalDate.class),
                row.getString("holding_value"), row.getString("equity_value"), row.getBoolean("triggered"), PriceEvaluationReport.instant(row,"evaluated_at"));
    }

    private static String text(BigDecimal amount) { return amount.stripTrailingZeros().toPlainString(); }
}
