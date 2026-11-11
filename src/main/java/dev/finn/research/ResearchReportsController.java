package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research")
class ResearchReportsController {
    record Input(@NotBlank @Size(max=320) String question,@NotNull Boolean rankLocally) {}
    record FeedbackInput(@NotBlank @Size(max=500) String note,UUID anchorId) {}
    record Capabilities(boolean localRanking) {}

    private final ResearchReports reports;
    private final LocalEvidenceModel model;
    private final EvidenceSearch search;
    ResearchReportsController(ResearchReports reports,LocalEvidenceModel model,EvidenceSearch search){
        this.reports=reports;this.model=model;this.search=search;
    }

    @GetMapping("/report-capabilities") Capabilities capabilities(){return new Capabilities(model.name()!=null);}
    @PostMapping("/companies/{company}/reports") ResearchReports.Report create(@PathVariable UUID company,@Valid @RequestBody Input input){
        return reports.create(company,input.question(),input.rankLocally());
    }
    @GetMapping("/companies/{company}/reports") ResearchReports.History history(@PathVariable UUID company,
            @RequestParam(defaultValue="0") @Min(0) @Max(500) int offset){
        return reports.history(company,offset);
    }
    @GetMapping("/companies/{company}/search") EvidenceSearch.Result search(@PathVariable UUID company,
            @RequestParam @NotBlank @Size(max=160) String query,
            @RequestParam(defaultValue="ALL") @Pattern(regexp="ALL|PRIMARY|NEWS") String kind,
            @RequestParam(required=false) LocalDate from,@RequestParam(required=false) LocalDate through,
            @RequestParam(defaultValue="false") boolean earlier,@RequestParam(defaultValue="0") @Min(0) @Max(1200) int offset){
        return search.search(company,query,kind,from,through,earlier,offset);
    }
    @GetMapping("/reports/{id}") ResearchReports.Report read(@PathVariable UUID id){return reports.read(id);}
    @PostMapping("/reports/{id}/refresh") ResearchReports.Report refresh(@PathVariable UUID id){return reports.refresh(id);}
    @PostMapping("/reports/{id}/feedback") ResearchReports.Feedback feedback(@PathVariable UUID id,@Valid @RequestBody FeedbackInput input){
        return reports.feedback(id,input.note(),input.anchorId());
    }
}
