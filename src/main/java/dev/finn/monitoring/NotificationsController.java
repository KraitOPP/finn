
package dev.finn.monitoring;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/monitoring")
class NotificationsController {
    record ReadState(@NotNull Boolean read) {}
    private final Notifications notifications;
    NotificationsController(Notifications notifications) { this.notifications = notifications; }

    @GetMapping("/notifications") Notifications.Page list(@RequestParam(required=false) UUID before) { return notifications.list(before); }
    @GetMapping("/notifications/{id}") Notifications.Detail detail(@PathVariable UUID id) { return notifications.detail(id); }
    @PostMapping("/notifications/{id}/read") Notifications.Item read(@PathVariable UUID id, @Valid @RequestBody ReadState state) {
        return notifications.read(id, state.read());
    }
    @GetMapping("/deliveries") Notifications.DeliveryPage deliveries() { return notifications.deliveries(); }
}
