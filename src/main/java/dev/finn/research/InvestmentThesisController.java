package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research")
class InvestmentThesisController {
    record Schedule(@NotNull @Pattern(regexp="[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}") String scheduledLocal,
                    @NotBlank @Size(max=64) String timeZone) {}
    record Input(@NotBlank @Size(max=100) String title,@NotBlank @Size(max=2400) String rationale,
                 @NotNull @Size(max=1600) String risks,@NotNull @Size(max=1600) String milestones,
                 @NotBlank @Pattern(regexp="MONITOR|REAFFIRM|REVISE|PAUSE|CLOSE") String decision,
                 @NotNull @Size(max=1200) String decisionNote,@Valid Schedule review,
                 @NotNull @Size(max=5) List<@NotNull UUID> anchorIds) {}
    record Edit(@NotNull @Min(1) @Max(100) Integer expectedRevision,@NotNull @Valid Input thesis) {}

    private final InvestmentTheses theses;
    InvestmentThesisController(InvestmentTheses theses){this.theses=theses;}

    @GetMapping("/companies/{company}/theses") InvestmentTheses.Versions list(@PathVariable UUID company){return theses.list(company);}
    @PostMapping("/companies/{company}/theses") InvestmentTheses.Version create(@PathVariable UUID company,@Valid @RequestBody Input input){
        return theses.create(company,input);
    }
    @PostMapping("/theses/{id}") InvestmentTheses.Version revise(@PathVariable UUID id,@Valid @RequestBody Edit input){
        return theses.revise(id,input.expectedRevision(),input.thesis());
    }
    @GetMapping("/theses/{id}/versions") InvestmentTheses.Versions versions(@PathVariable UUID id){return theses.history(id);}
}
