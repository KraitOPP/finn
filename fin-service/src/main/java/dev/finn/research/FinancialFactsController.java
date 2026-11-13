
package dev.finn.research;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/research")
class FinancialFactsController {
    record Dimensions(
            @NotNull FactPolicy.Metric metric,
            @NotNull @Pattern(regexp="STANDALONE|CONSOLIDATED") String basis,@NotNull @Pattern(regexp="QUARTER|YTD|FULL_YEAR|AS_OF") String periodKind,
            @NotNull LocalDate periodStart,@NotNull LocalDate periodEnd,@NotNull @Pattern(regexp="MONEY|PER_SHARE|PERCENT") String unit,
            @Pattern(regexp="INR|USD|EUR|GBP|JPY") String currency) {
        FinancialFacts.Dimensions value(){return new FinancialFacts.Dimensions(metric.name(),basis,periodKind,periodStart,periodEnd,unit,currency);}
    }
    record Reported(@NotNull @Valid Dimensions dimensions,@NotNull UUID anchorId,@NotNull JsonNode amount,
                    @NotNull @Pattern(regexp="ONES|THOUSAND|LAKH|MILLION|CRORE|BILLION") String scale,
                    @NotNull @AssertTrue Boolean reviewed) {
        String decimal(){
            if(!amount.isString()||!amount.asText().matches("-?(0|[1-9][0-9]{0,21})(\\.[0-9]{1,8})?"))throw ApiFailure.invalid();
            return amount.asText();
        }
    }
    record Edit(@NotNull UUID companyId,@NotNull @Min(1) @Max(50) Integer expectedRevision,@NotNull @Valid Reported fact){}
    record Operand(@NotNull UUID factId,@NotNull @Min(1) @Max(50) Integer revision){
        FinancialFacts.Operand value(){return new FinancialFacts.Operand(factId,revision);}
    }
    record Derive(UUID existingFactId,@Min(1) @Max(50) Integer expectedRevision,@NotNull @Valid Operand operatingCash,
                  @NotNull @Valid Operand capitalExpenditure,@NotNull @AssertTrue Boolean reviewed){}

    private final FinancialFacts facts;
    FinancialFactsController(FinancialFacts facts){this.facts=facts;}

    @GetMapping("/companies/{company}/facts")
    FinancialFacts.Page list(@PathVariable UUID company,@RequestParam(defaultValue="0") @Min(0) @Max(1500) int offset){return facts.list(company,offset);}

    @PostMapping("/companies/{company}/facts")
    FinancialFacts.Fact create(@PathVariable UUID company,@Valid @RequestBody Reported input){
        return facts.reported(company,null,null,input.dimensions().value(),input.anchorId(),input.decimal(),input.scale());
    }

    @PostMapping("/facts/{id}")
    FinancialFacts.Fact edit(@PathVariable UUID id,@Valid @RequestBody Edit input){
        var value=input.fact();
        return facts.reported(input.companyId(),id,input.expectedRevision(),value.dimensions().value(),value.anchorId(),value.decimal(),value.scale());
    }

    @PostMapping("/companies/{company}/facts/derive")
    FinancialFacts.Fact derive(@PathVariable UUID company,@Valid @RequestBody Derive input){
        return facts.derive(company,input.existingFactId(),input.expectedRevision(),input.operatingCash().value(),input.capitalExpenditure().value());
    }

    @GetMapping("/facts/{id}/versions")
    FinancialFacts.History versions(@PathVariable UUID id){return facts.versions(id);}

    @GetMapping("/facts/{id}/comparison")
    FinancialFacts.Comparison compare(@PathVariable UUID id,@RequestParam UUID previous){return facts.compare(id,previous);}

    @GetMapping("/facts/{id}/comparables")
    FinancialFacts.History comparables(@PathVariable UUID id){return facts.comparables(id);}
}
