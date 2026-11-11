
package dev.finn.market;

import dev.finn.monitoring.ReviewReminders;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ReminderChecks {
    private ReminderChecks() {}
    public static void quietOccurrencesCanBeCancelledWithoutRaces(MockMvc mvc, JdbcTemplate jdbc, ReviewReminders scheduler) throws Exception {
        String owner = "fictional-reminder-owner";
        var now = LocalDateTime.now(ZoneOffset.UTC).truncatedTo(ChronoUnit.MINUTES);
        String path = "/api/v1/monitoring/reminders";
        var result = ok(submit(mvc, path, owner, """
                {"title":"Fictional review","scheduledLocal":"%s","timeZone":"UTC","recurrence":"WEEKLY","quietStart":"%s","quietEnd":"%s"}
                """.formatted(now.plusDays(1), now.minusMinutes(1).toLocalTime(), now.plusMinutes(10).toLocalTime())));
        UUID id = UUID.fromString(result.get("reminderId").asText());
        String schedule = path + "/" + id + "/schedule";
        submit(mvc, schedule, "fictional-reminder-other", "{\"expectedRevision\":1,\"snoozeUntil\":null}").andExpect(status().isNotFound());
        var snoozed = ok(submit(mvc, schedule, owner, """
                {"expectedRevision":1,"snoozeUntil":"%s"}
                """.formatted(now.plusDays(2))));
        assertThat(snoozed.get("revision").asInt()).isEqualTo(2);
        jdbc.update("UPDATE finn.review_reminder SET next_at=clock_timestamp()-interval '1 second' WHERE reminder_id=?", id);
        try (var workers = Executors.newFixedThreadPool(2)) {
            var one = workers.submit(scheduler::processNext);
            var two = workers.submit(scheduler::processNext);
            one.get();
            two.get();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.review_occurrence WHERE reminder_id=?", Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT (deliver_at>clock_timestamp()) FROM finn.review_occurrence WHERE reminder_id=?", Boolean.class, id)).isTrue();
        submit(mvc, schedule, owner, "{\"expectedRevision\":1,\"snoozeUntil\":null}").andExpect(status().isConflict());
        submit(mvc, schedule, owner, "{\"expectedRevision\":2,\"snoozeUntil\":null}").andExpect(status().isOk()).andExpect(jsonPath("$.state").value("CANCELLED"));
        assertThat(jdbc.queryForObject("""
                SELECT d.status FROM finn.activity_delivery d JOIN finn.activity a USING(owner_id,activity_id) WHERE a.subject_id=?
                """, String.class, id)).isEqualTo("SUPPRESSED");
    }
}
