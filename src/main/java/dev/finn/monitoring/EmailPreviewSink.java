
package dev.finn.monitoring;

import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class EmailPreviewSink {
    private final JdbcTemplate jdbc;
    private final boolean enabled;

    EmailPreviewSink(JdbcTemplate jdbc, @Value("${finn.notifications.email-preview:false}") boolean enabled) {
        this.jdbc = jdbc;
        this.enabled = enabled;
    }

    public boolean enabled() { return enabled; }

    public void save(UUID owner, UUID activity) {
        jdbc.update("INSERT INTO finn.email_preview(owner_id,activity_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                owner, activity);
    }
}
