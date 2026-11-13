package dev.finn.research;

import dev.finn.identity.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/monitoring/research-alerts")
class ResearchAlertController {
    record Request(@NotBlank @Size(max=240) String sentence,@NotNull AlertLanguage.Cadence cadence) {}
    record Confirm(@NotBlank @Size(max=240) String sentence,@NotNull AlertLanguage.Cadence cadence,
                   @NotNull AlertLanguage.Criteria criteria) {}
    record Change(@NotNull Boolean enabled) {}

    private final CurrentUser users;
    private final ResearchAlerts alerts;
    ResearchAlertController(CurrentUser users,ResearchAlerts alerts){this.users=users;this.alerts=alerts;}

    @PostMapping("/preview") AlertLanguage.Preview preview(@Valid @RequestBody Request request){
        users.requireId();
        return AlertLanguage.interpret(request.sentence(),request.cadence());
    }
    @GetMapping ResearchAlerts.Index rules(){return alerts.index();}
    @PostMapping ResearchAlerts.Rule activate(@Valid @RequestBody Confirm input){
        return alerts.activate(input.sentence(),input.cadence(),input.criteria());
    }
    @PostMapping("/{id}") ResearchAlerts.Rule enable(@PathVariable UUID id,@Valid @RequestBody Change input){
        return alerts.enable(id,input.enabled());
    }
}
