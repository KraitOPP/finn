package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/research/companies/{company}/earnings")
class EarningsReviewController {
    record Reviewed(@NotNull EarningsReview.Basis basis,@NotNull EarningsReview.Period periodKind,
                    @NotNull LocalDate periodStart,@NotNull LocalDate periodEnd,@NotNull EarningsReview.Kind kind,
                    @NotBlank @Size(max=100) String label,@NotNull FactPolicy.Metric metric,
                    @NotNull EarningsReview.Currency currency,@NotNull JsonNode amount,@NotNull FactPolicy.Scale scale,
                    UUID anchorId,@Size(max=1000) String sourceUrl,@Size(max=32) String publishedAt,
                    @NotNull @AssertTrue Boolean reviewed) {}

    private final EarningsReview earnings;
    EarningsReviewController(EarningsReview earnings){this.earnings=earnings;}

    @GetMapping EarningsReview.Report report(@PathVariable UUID company,
            @RequestParam(defaultValue="CONSOLIDATED") EarningsReview.Basis basis,
            @RequestParam(defaultValue="QUARTER") EarningsReview.Period kind,
            @RequestParam(defaultValue="INR") EarningsReview.Currency currency,
            @RequestParam(required=false) LocalDate periodEnd){
        return earnings.report(company,basis,kind,currency,periodEnd);
    }

    @PostMapping("/inputs") EarningsReview.Input add(@PathVariable UUID company,@Valid @RequestBody Reviewed input){
        return earnings.add(company,input);
    }
}
