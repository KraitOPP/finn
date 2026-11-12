package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/research/theses/{thesis}/conditions")
class ThesisConditionsController {
    record Input(@NotNull @Min(1) @Max(100) Integer expectedRevision,@NotBlank @Size(max=100) String label,
                 @NotNull @Valid FinancialFactsController.Dimensions dimensions,
                 @NotNull @Pattern(regexp="GTE|LTE") String comparator,@NotNull JsonNode threshold,
                 @NotNull @Pattern(regexp="ONES|THOUSAND|LAKH|MILLION|CRORE|BILLION") String scale) {}

    private final ThesisConditions conditions;
    ThesisConditionsController(ThesisConditions conditions){this.conditions=conditions;}

    @GetMapping ThesisConditions.ListView list(@PathVariable UUID thesis){return conditions.list(thesis);}
    @PostMapping ThesisConditions.Condition add(@PathVariable UUID thesis,@Valid @RequestBody Input input){return conditions.add(thesis,input);}
    @PostMapping("/check") ThesisConditions.ListView check(@PathVariable UUID thesis){return conditions.check(thesis);}
    @PostMapping("/{condition}/retire") ThesisConditions.Condition retire(@PathVariable UUID thesis,@PathVariable UUID condition){
        return conditions.retire(thesis,condition);
    }
}
