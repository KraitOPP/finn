
package dev.finn.monitoring;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/monitoring/rules")
class PriceRuleController {
    record Input(@NotNull UUID listingId, @NotBlank @Size(max=80) String name,
                 @NotNull @Pattern(regexp="MANUAL_REVIEWED|YAHOO_YFINANCE") String source,
                 @NotNull @Pattern(regexp="ABOVE|BELOW|CROSS_ABOVE|CROSS_BELOW|MOVE_UP|MOVE_DOWN") String comparison,
                 @NotNull JsonNode threshold, @NotNull @Min(1) @Max(4) Integer maxAgeDays,
                 @NotNull @Min(0) @Max(10080) Integer cooldownMinutes, @NotNull Boolean rearm,
                 @NotNull Boolean enabled, LocalDate expiresOn) {
        PriceRules.Settings settings() {
            if (!threshold.isString() || !threshold.asText().matches("(0|[1-9][0-9]{0,15})(\\.[0-9]{1,8})?"))
                throw ApiFailure.invalid();
            return new PriceRules.Settings(listingId, name, source, comparison, threshold.asText(),
                    maxAgeDays, cooldownMinutes, rearm, enabled, expiresOn);
        }
    }
    record Edit(@NotNull @Min(1) @Max(100) Integer expectedRevision, @NotNull @Valid Input settings) {}

    private final PriceRules rules;
    PriceRuleController(PriceRules rules) { this.rules = rules; }

    @GetMapping PriceRules.RuleList list() { return rules.list(); }
    @GetMapping("/{id}/versions") PriceRules.RuleList history(@PathVariable UUID id) { return rules.history(id); }
    @PostMapping PriceRules.Rule create(@Valid @RequestBody Input input) { return rules.create(input.settings()); }
    @PostMapping("/{id}") PriceRules.Rule edit(@PathVariable UUID id, @Valid @RequestBody Edit input) {
        return rules.replace(id, input.expectedRevision(), input.settings().settings());
    }
}
