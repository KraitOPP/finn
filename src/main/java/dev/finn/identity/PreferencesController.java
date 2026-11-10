package dev.finn.identity;

import java.time.ZoneId;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;

@RestController
@RequestMapping("/api/v1/preferences")
public class PreferencesController {
    public record Preferences(String timeZone, String currency, boolean inAppNotifications,
                              boolean emailNotifications, long revision, boolean deliveryAvailable) {}
    public record Update(@NotBlank @Size(max=64) String timeZone, @Pattern(regexp="INR") @NotNull String currency,
                         @NotNull Boolean inAppNotifications, @NotNull Boolean emailNotifications,
                         @NotNull @Min(0) @Max(9007199254740991L) Long revision) {}
    private final CurrentUser users;
    private final JdbcTemplate jdbc;
    private final AuditTrail audit;
    PreferencesController(CurrentUser users, JdbcTemplate jdbc, AuditTrail audit) {
        this.users=users; this.jdbc=jdbc; this.audit=audit;
    }
    private Preferences read(UUID owner) {
        return jdbc.queryForObject("SELECT * FROM finn.user_preferences WHERE owner_id=?", (row, index) ->
                new Preferences(row.getString("time_zone"), row.getString("currency"), row.getBoolean("in_app_notifications"),
                        row.getBoolean("email_notifications"), row.getLong("revision"), false), owner);
    }
    private UUID initialize() {
        UUID owner=users.requireId();
        jdbc.update("INSERT INTO finn.user_preferences(owner_id) VALUES (?) ON CONFLICT DO NOTHING", owner);
        return owner;
    }
    @GetMapping @Transactional
    public Preferences get() { return read(initialize()); }
    @PutMapping @Transactional
    public Preferences update(@Valid @RequestBody Update input) {
        if (!ZoneId.getAvailableZoneIds().contains(input.timeZone())) throw ApiFailure.invalid();
        UUID owner=initialize();
        int changed=jdbc.update("""
                UPDATE finn.user_preferences SET time_zone=?,in_app_notifications=?,email_notifications=?,revision=revision+1
                WHERE owner_id=? AND revision=?
                """, input.timeZone(), input.inAppNotifications(), input.emailNotifications(), owner, input.revision());
        if (changed != 1) throw ApiFailure.conflict();
        audit.record(AuditTrail.Action.PREFERENCES_CHANGED, owner, owner);
        return read(owner);
    }
}
