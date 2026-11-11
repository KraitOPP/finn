
package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/events")
class CompanyEventsController {
    record DateInput(@NotNull @Pattern(regexp="MEETING|RESULTS|EX_DATE|RECORD_DATE|OTHER") String type,@NotNull LocalDate date,
                     @NotNull @Pattern(regexp="CONFIRMED|TENTATIVE|CANCELLED") String certainty) {}
    record Input(@NotNull UUID documentId,@NotNull @Min(1) @Max(50) Integer documentRevision,UUID eventId,
                 @Min(1) @Max(100) Integer expectedRevision,@NotBlank @Size(max=120) String title,@Size(max=80) String groupingKey,
                 @NotNull @Pattern(regexp="RESULTS|RESULTS_MEETING|BUYBACK|CAPITAL_RAISE|AUDITOR|GOVERNANCE|DIVIDEND|SPLIT_BONUS|MERGER|OTHER") String subtype,
                 @NotNull @Pattern(regexp="ANNOUNCED|DECIDED|COMPLETED|CANCELLED|UNKNOWN") String stage,
                 @NotNull @Pattern(regexp="HIGH|MEDIUM|LOW|UNKNOWN") String materiality,
                 @NotNull @Pattern(regexp="NEW|FOLLOW_UP|CORRECTION|ROUTINE|UNKNOWN") String novelty,
                 @NotNull @AssertTrue Boolean reviewed,@Size(max=5) List<@NotNull @Valid DateInput> dates) {
        CompanyEvents.Input value() {
            return new CompanyEvents.Input(documentId,documentRevision,eventId,expectedRevision,title,groupingKey,subtype,stage,materiality,novelty,
                    dates==null?List.of():dates.stream().map(date->new CompanyEvents.AnnouncedDate(date.type(),date.date(),date.certainty())).toList());
        }
    }
    private final CompanyEvents events;
    CompanyEventsController(CompanyEvents events) { this.events=events; }

    @GetMapping CompanyEvents.Page list(@RequestParam(required=false) UUID companyId,@RequestParam(defaultValue="0") @Min(0) @Max(300) int offset) {
        return events.list(companyId,offset);
    }
    @GetMapping("/suggestion") EventClassifier.Hint suggestion(@RequestParam UUID documentId,@RequestParam @Min(1) @Max(50) int revision) {
        return events.suggestion(documentId,revision);
    }
    @PostMapping CompanyEvents.Version classify(@Valid @RequestBody Input input) { return events.classify(input.value()); }
    @GetMapping("/{id}/versions") CompanyEvents.History history(@PathVariable UUID id) { return events.history(id); }
}
