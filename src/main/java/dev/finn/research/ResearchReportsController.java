package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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
    ResearchReportsController(ResearchReports reports,LocalEvidenceModel model){this.reports=reports;this.model=model;}

    @GetMapping("/report-capabilities") Capabilities capabilities(){return new Capabilities(model.name()!=null);}
    @PostMapping("/companies/{company}/reports") ResearchReports.Report create(@PathVariable UUID company,@Valid @RequestBody Input input){
        return reports.create(company,input.question(),input.rankLocally());
    }
    @GetMapping("/reports/{id}") ResearchReports.Report read(@PathVariable UUID id){return reports.read(id);}
    @PostMapping("/reports/{id}/feedback") ResearchReports.Feedback feedback(@PathVariable UUID id,@Valid @RequestBody FeedbackInput input){
        return reports.feedback(id,input.note(),input.anchorId());
    }
}
