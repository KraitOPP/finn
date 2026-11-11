
package dev.finn.monitoring;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/monitoring/indicators")
class IndicatorsController {
    record Create(@NotNull UUID listingId, UUID portfolioId, @NotNull @Pattern(regexp="VOLUME|ALLOCATION") String kind,
                  @NotBlank @Size(max=80) String title, @NotNull JsonNode threshold) {}
    record Edit(@NotNull @Min(1) Integer expectedRevision, @NotNull JsonNode threshold, @NotNull Boolean enabled) {}
    private final Indicators indicators;
    IndicatorsController(Indicators indicators) { this.indicators = indicators; }

    @GetMapping Indicators.RuleList list() { return indicators.list(); }
    @PostMapping Indicators.Rule create(@Valid @RequestBody Create input) {
        return indicators.create(input.listingId(), input.portfolioId(), input.kind(), input.title(), decimal(input.threshold()));
    }
    @PostMapping("/{id}") Indicators.Rule edit(@PathVariable UUID id,@Valid @RequestBody Edit input) {
        return indicators.edit(id,input.expectedRevision(),decimal(input.threshold()),input.enabled());
    }
    @GetMapping("/{id}/evaluations") Indicators.Evaluations history(@PathVariable UUID id) { return indicators.history(id); }

    private static String decimal(JsonNode value) {
        if (!value.isString() || !value.asText().matches("(0|[1-9][0-9]{0,3})(\\.[0-9]{1,8})?")) throw ApiFailure.invalid();
        return value.asText();
    }
}
