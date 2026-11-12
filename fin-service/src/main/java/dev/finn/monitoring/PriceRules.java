
package dev.finn.monitoring;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PriceRules {
    static final ZoneId EXCHANGE_ZONE = ZoneId.of("Asia/Kolkata");

    record Settings(UUID listingId, String name, String source, String comparison, String threshold,
                    int maxAgeDays, int cooldownMinutes, boolean rearm, boolean enabled, LocalDate expiresOn) {}

    record Rule(UUID ruleId, int revision, Settings settings, String exchange, String symbol, String createdAt) {}
    record RuleList(List<Rule> items) {}

    private static final String SELECT = """
            SELECT v.*, l.exchange, h.symbol
            FROM finn.monitor_rule_version v
            JOIN finn.listing l USING (owner_id, listing_id)
            JOIN finn.listing_symbol h ON h.owner_id=l.owner_id AND h.listing_id=l.listing_id AND h.valid_to IS NULL
            """;
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final JdbcTemplate jdbc;

    PriceRules(CurrentUser users, Catalogue catalogue, JdbcTemplate jdbc) {
        this.users = users;
        this.catalogue = catalogue;
        this.jdbc = jdbc;
    }

    @Transactional
    public RuleList list() {
        return new RuleList(jdbc.query(SELECT + """
                JOIN finn.monitor_rule r ON r.owner_id=v.owner_id AND r.rule_id=v.rule_id AND r.revision=v.revision
                WHERE v.owner_id=? ORDER BY r.created_at DESC, r.rule_id LIMIT 50
                """, PriceRules::row, users.requireId()));
    }

    @Transactional
    public RuleList history(UUID id) {
        UUID owner = users.requireId();
        require(owner, id);
        return new RuleList(jdbc.query(SELECT + """
                WHERE v.owner_id=? AND v.rule_id=? ORDER BY v.revision DESC LIMIT 100
                """, PriceRules::row, owner, id));
    }

    @Transactional
    public Rule create(Settings input) {
        UUID owner = users.requireId();
        Settings settings = validate(owner, input);
        int size = jdbc.queryForObject("SELECT count(*) FROM finn.monitor_rule WHERE owner_id=?", Integer.class, owner);
        if (size >= 50) throw new ApiFailure(429, "PRICE_RULE_LIMIT");
        UUID id = UUID.randomUUID();
        jdbc.update("INSERT INTO finn.monitor_rule(owner_id, rule_id, revision) VALUES (?,?,1)", owner, id);
        insert(owner, id, 1, settings);
        return require(owner, id);
    }

    @Transactional
    public Rule replace(UUID id, int expected, Settings input) {
        UUID owner = users.requireId();
        Rule current = require(owner, id);
        if (current.revision() != expected) throw ApiFailure.conflict();
        Settings settings = validate(owner, input);
        if (current.settings().equals(settings)) return current;
        if (expected >= 100) throw new ApiFailure(429, "PRICE_RULE_VERSION_LIMIT");
        int revision = expected + 1;
        int updated = jdbc.update("UPDATE finn.monitor_rule SET revision=?,next_check_at=clock_timestamp() WHERE owner_id=? AND rule_id=? AND revision=?",
                revision, owner, id, expected);
        if (updated != 1) throw ApiFailure.conflict();
        insert(owner, id, revision, settings);
        return require(owner, id);
    }

    private Settings validate(UUID owner, Settings input) {
        catalogue.listing(owner, input.listingId());
        var threshold = new BigDecimal(input.threshold());
        var comparison = PriceRulePolicy.Comparison.valueOf(input.comparison());
        if (threshold.signum() <= 0 || (comparison.name().startsWith("MOVE_") && threshold.compareTo(new BigDecimal("10000")) > 0))
            throw ApiFailure.invalid();
        var date = input.expiresOn();
        if (date != null && (date.isBefore(LocalDate.of(1900, 1, 1)) || date.isAfter(LocalDate.now(EXCHANGE_ZONE).plusYears(10))))
            throw ApiFailure.invalid();
        return new Settings(input.listingId(), Catalogue.cleanName(input.name()), input.source(), input.comparison(),
                threshold.stripTrailingZeros().toPlainString(), input.maxAgeDays(), input.cooldownMinutes(),
                input.rearm(), input.enabled(), date);
    }

    private Rule require(UUID owner, UUID id) {
        return jdbc.query(SELECT + """
                JOIN finn.monitor_rule r ON r.owner_id=v.owner_id AND r.rule_id=v.rule_id AND r.revision=v.revision
                WHERE v.owner_id=? AND v.rule_id=?
                """, PriceRules::row, owner, id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private void insert(UUID owner, UUID id, int revision, Settings value) {
        jdbc.update("""
                INSERT INTO finn.monitor_rule_version(owner_id,rule_id,revision,listing_id,name,source,comparison,threshold,
                    max_age_days,cooldown_minutes,rearm,enabled,expires_on) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """, owner, id, revision, value.listingId(), value.name(), value.source(), value.comparison(),
                new BigDecimal(value.threshold()), value.maxAgeDays(), value.cooldownMinutes(), value.rearm(), value.enabled(), value.expiresOn());
    }

    static Rule row(ResultSet row, int ignored) throws SQLException {
        var settings = new Settings(row.getObject("listing_id", UUID.class), row.getString("name"), row.getString("source"),
                row.getString("comparison"), row.getBigDecimal("threshold").stripTrailingZeros().toPlainString(),
                row.getInt("max_age_days"), row.getInt("cooldown_minutes"), row.getBoolean("rearm"),
                row.getBoolean("enabled"), row.getObject("expires_on", LocalDate.class));
        return new Rule(row.getObject("rule_id", UUID.class), row.getInt("revision"), settings, row.getString("exchange"),
                row.getString("symbol"), row.getObject("created_at", OffsetDateTime.class).toInstant().toString());
    }
}
