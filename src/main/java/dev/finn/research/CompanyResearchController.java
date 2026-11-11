package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/companies/{company}")
class CompanyResearchController {
    record NoteInput(@NotBlank @Pattern(regexp="BUSINESS|GOVERNANCE|QUESTION") String kind,
                     @NotBlank @Size(max=240) String title,UUID anchorId) {}
    record Resolution(@NotNull Boolean resolved) {}

    private final CompanyResearch research;
    CompanyResearchController(CompanyResearch research){this.research=research;}

    @GetMapping("/overview") CompanyResearch.Overview overview(@PathVariable UUID company){return research.overview(company);}
    @PostMapping("/notes") CompanyResearch.Note note(@PathVariable UUID company,@Valid @RequestBody NoteInput input){
        return research.add(company,input.kind(),input.title(),input.anchorId());
    }
    @PostMapping("/notes/{id}") CompanyResearch.Note resolve(@PathVariable UUID company,@PathVariable UUID id,
                                                            @Valid @RequestBody Resolution input){
        return research.resolve(company,id,input.resolved());
    }
}
