
package dev.finn.monitoring;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/monitoring/briefs")
class BriefsController {
    record Input(@NotNull @Pattern(regexp="[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}") String scheduledLocal,
                 @NotBlank @Size(max=64) String timeZone, @NotNull @Pattern(regexp="DAILY|WEEKLY") String cadence,
                 @NotNull Boolean enabled, @NotNull Boolean includeAlerts, @NotNull Boolean includeReminders,
                 @NotNull Boolean includeCompany, @NotNull Boolean includeValuations) {
        PortfolioBriefs.Settings settings() {
            return new PortfolioBriefs.Settings(scheduledLocal,timeZone,cadence,enabled,includeAlerts,includeReminders,includeCompany,includeValuations);
        }
    }
    record Save(@NotNull @Min(0) Integer expectedRevision,@NotNull @Valid Input settings) {}

    private final PortfolioBriefs briefs;
    BriefsController(PortfolioBriefs briefs) { this.briefs = briefs; }

    @GetMapping PortfolioBriefs.Index list() { return briefs.index(); }
    @PostMapping("/schedule") PortfolioBriefs.Schedule save(@Valid @RequestBody Save request) {
        return briefs.save(request.expectedRevision(),request.settings().settings());
    }
    @GetMapping("/preview") PortfolioBriefs.Brief preview(@RequestParam(required=false) LocalDate windowEnd) { return briefs.preview(windowEnd); }
    @GetMapping("/{id}") PortfolioBriefs.Brief read(@PathVariable UUID id) { return briefs.read(id); }
}
