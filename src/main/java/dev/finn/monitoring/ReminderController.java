
package dev.finn.monitoring;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.DateTimeException;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/monitoring/reminders")
class ReminderController {
    private static final String LOCAL = "[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}";
    private static final String TIME = "[0-9]{2}:[0-9]{2}";

    record Input(@NotBlank @Size(max=120) String title, @NotNull @Pattern(regexp=LOCAL) String scheduledLocal,
                 @NotBlank @Size(max=64) String timeZone, @NotNull @Pattern(regexp="ONCE|DAILY|WEEKLY") String recurrence,
                 @Pattern(regexp=TIME) String quietStart, @Pattern(regexp=TIME) String quietEnd) {
        ReviewReminders.Settings settings() {
            return new ReviewReminders.Settings(title, scheduledLocal, timeZone, recurrence, quietStart, quietEnd);
        }
    }
    record Edit(@NotNull @Min(1) Integer expectedRevision, @NotNull @Valid Input settings) {}
    record Change(@NotNull @Min(1) Integer expectedRevision, @Pattern(regexp=LOCAL) String snoozeUntil) {}

    private final ReviewReminders reminders;
    ReminderController(ReviewReminders reminders) { this.reminders = reminders; }

    @GetMapping ReviewReminders.ReminderList list() { return reminders.list(); }
    @PostMapping ReviewReminders.View create(@Valid @RequestBody Input input) { return reminders.save(null, null, input.settings()); }
    @PostMapping("/{id}") ReviewReminders.View edit(@PathVariable UUID id, @Valid @RequestBody Edit input) {
        return reminders.save(id, input.expectedRevision(), input.settings().settings());
    }
    @PostMapping("/{id}/schedule") ReviewReminders.View change(@PathVariable UUID id, @Valid @RequestBody Change input) {
        try {
            return reminders.change(id, input.expectedRevision(), input.snoozeUntil());
        } catch (DateTimeException invalid) {
            throw ApiFailure.invalid();
        }
    }
}
