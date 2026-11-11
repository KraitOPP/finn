
package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research")
class FilingRulesController {
    record Input(UUID companyId,@NotBlank @Size(max=80) String title,
                 @NotNull @Pattern(regexp="ANY|EARNINGS|CAPITAL|GOVERNANCE|CORPORATE_ACTION|OTHER") String category,
                 @NotNull @Pattern(regexp="ANY|MEDIUM|HIGH") String minimumMateriality,
                 @NotNull Boolean arrivals,@NotNull Boolean dates,@NotNull Boolean tentative) {}
    record Change(@NotNull @Min(1) Integer expectedRevision,@NotNull Boolean enabled) {}
    private final FilingRules rules;
    FilingRulesController(FilingRules rules) { this.rules=rules; }

    @GetMapping("/filing-rules") FilingRules.RuleList list() { return rules.list(); }
    @PostMapping("/filing-rules") FilingRules.Rule create(@Valid @RequestBody Input input) {
        return rules.create(new FilingRules.Settings(input.companyId(),input.title(),input.category(),input.minimumMateriality(),
                input.arrivals(),input.dates(),input.tentative()));
    }
    @PostMapping("/filing-rules/{id}") FilingRules.Rule enable(@PathVariable UUID id,@Valid @RequestBody Change input) {
        return rules.enable(id,input.expectedRevision(),input.enabled());
    }
    @GetMapping("/calendar") FilingRules.CalendarPage calendar(@RequestParam(required=false) LocalDate start,
            @RequestParam(required=false) LocalDate endExclusive,@RequestParam(defaultValue="0") @Min(0) @Max(1500) int offset) {
        return rules.calendar(start,endExclusive,offset);
    }
}
