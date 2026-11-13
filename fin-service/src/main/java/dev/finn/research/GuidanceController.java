package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/research")
class GuidanceController {
    record Input(@NotBlank @Size(max=120) String title,@NotNull @Pattern(regexp="QUALITATIVE|AT_LEAST|AT_MOST|RANGE") String kind,
                 @NotNull @Pattern(regexp="DRAFT|CONFIRMED|WITHDRAWN") String stage,LocalDate statementDate,LocalDate targetDate,
                 @Valid FinancialFactsController.Dimensions dimensions,JsonNode lower,JsonNode upper,
                 @NotNull @Pattern(regexp="ONES|THOUSAND|LAKH|MILLION|CRORE|BILLION") String scale,
                 @NotNull @Size(max=1200) String caveats,@NotNull UUID anchorId) {}
    record Edit(@NotNull @Min(1) @Max(50) Integer expectedRevision,@NotNull @Valid Input guidance) {}
    private final ManagementGuidance guidance;
    GuidanceController(ManagementGuidance guidance){this.guidance=guidance;}

    @GetMapping("/companies/{company}/guidance") ManagementGuidance.Versions list(@PathVariable UUID company){return guidance.list(company);}
    @PostMapping("/companies/{company}/guidance") ManagementGuidance.Version create(@PathVariable UUID company,@Valid @RequestBody Input input){
        return guidance.create(company,input);
    }
    @PostMapping("/guidance/{id}") ManagementGuidance.Version revise(@PathVariable UUID id,@Valid @RequestBody Edit edit){
        return guidance.revise(id,edit.expectedRevision(),edit.guidance());
    }
    @GetMapping("/guidance/{id}/versions") ManagementGuidance.Versions versions(@PathVariable UUID id){return guidance.versions(id);}
    @GetMapping("/guidance/candidates/{anchor}") ManagementGuidance.Candidates candidates(@PathVariable UUID anchor){return guidance.candidates(anchor);}
}
