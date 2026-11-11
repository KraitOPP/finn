
package dev.finn.market;

import dev.finn.monitoring.ActivityWriter;
import dev.finn.monitoring.DeliveryWorker;
import dev.finn.monitoring.EmailPreviewSink;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class NotificationChecks {
    private NotificationChecks() {}

    public static void deliversInAppIndependentlyFromEmail(MockMvc mvc, JdbcTemplate jdbc, PlatformTransactionManager transactions,
            ActivityWriter writer, DeliveryWorker worker, EmailPreviewSink sink) throws Exception {
        String subject = "fictional-delivery-owner";
        catalogue(mvc, subject);
        UUID owner = jdbc.queryForObject("SELECT user_id FROM finn.app_user WHERE subject=?", UUID.class, subject);
        jdbc.update("INSERT INTO finn.user_preferences(owner_id,email_notifications) VALUES (?,true)", owner);
        doReturn(true).when(sink).enabled();
        doThrow(new IllegalStateException("synthetic preview failure")).doCallRealMethod().when(sink).save(eq(owner), any());
        UUID reminder = UUID.randomUUID();
        var tx = new TransactionTemplate(transactions);
        tx.executeWithoutResult(status -> writer.add(owner, ActivityWriter.Kind.REVIEW_REMINDER, reminder, "sample", "Fictional delivery", null, OffsetDateTime.now(ZoneOffset.UTC)));
        drain(worker);
        var list = ok(read(mvc, "/api/v1/monitoring/notifications", subject));
        String activity = list.get("items").get(0).get("activityId").asText();
        String path = "/api/v1/monitoring/notifications/" + activity;
        read(mvc, path, "fictional-delivery-other").andExpect(status().isNotFound());
        read(mvc, path, subject).andExpect(status().isOk()).andExpect(jsonPath("$.deliveries[0].status").value("PENDING"))
                .andExpect(jsonPath("$.deliveries[1].status").value("DELIVERED"));
        submit(mvc, path + "/read", subject, "{\"read\":true}").andExpect(status().isOk()).andExpect(jsonPath("$.readAt").isString());
        jdbc.update("UPDATE finn.activity_delivery SET next_attempt_at=clock_timestamp() WHERE owner_id=? AND channel='EMAIL_PREVIEW'", owner);
        drain(worker);
        read(mvc, path, subject).andExpect(status().isOk()).andExpect(jsonPath("$.deliveries[0].status").value("PREVIEWED"))
                .andExpect(jsonPath("$.attempts.length()").value(3));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.email_preview WHERE owner_id=?", Integer.class, owner)).isEqualTo(1);

        jdbc.update("UPDATE finn.user_preferences SET in_app_notifications=false,email_notifications=false WHERE owner_id=?", owner);
        tx.executeWithoutResult(status -> writer.add(owner, ActivityWriter.Kind.REVIEW_REMINDER, reminder, "second", "Disabled delivery", null, OffsetDateTime.now(ZoneOffset.UTC)));
        drain(worker);
        read(mvc, "/api/v1/monitoring/notifications", subject).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        read(mvc, "/api/v1/monitoring/deliveries", subject).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].delivery.status").value("SUPPRESSED"));
    }

    private static void drain(DeliveryWorker worker) {
        for (int i=0; i<25 && worker.processNext(); i++) { /* bounded synthetic work */ }
    }
}
