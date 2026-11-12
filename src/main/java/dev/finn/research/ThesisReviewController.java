package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research")
class ThesisReviewController {
    record GuidanceRef(@NotNull UUID id,@NotNull @Min(1) @Max(50) Integer revision) {}
    record Input(@NotNull @Min(1) @Max(100) Integer expectedRevision,@NotNull UUID eventVersionId,
                 @NotNull @Pattern(regexp="CONTEXT|SUPPORTS|CHALLENGES") String relation,UUID anchorId,
                 UUID conditionCheckId,@Valid GuidanceRef guidance) {}
    record DecisionInput(@NotNull @Pattern(regexp="REAFFIRM|REVISE|PAUSE|CLOSE|DISMISS") String action,
                         @NotBlank @Size(max=1200) String note,UUID anchorId) {}

    private final ThesisReviews reviews;
    ThesisReviewController(ThesisReviews reviews){this.reviews=reviews;}

    @GetMapping("/theses/{thesis}/reviews") ThesisReviews.Index list(@PathVariable UUID thesis,
            @RequestParam(defaultValue="0") @Min(0) @Max(500) int offset,@RequestParam(required=false) UUID event){
        return reviews.list(thesis,offset,event);
    }
    @PostMapping("/theses/{thesis}/reviews") ThesisReviews.View create(@PathVariable UUID thesis,@Valid @RequestBody Input input){
        return reviews.create(thesis,input);
    }
    @GetMapping("/thesis-reviews/{id}") ThesisReviews.View read(@PathVariable UUID id){return reviews.read(id);}
    @PostMapping("/thesis-reviews/{id}/decision") ThesisReviews.View decide(@PathVariable UUID id,@Valid @RequestBody DecisionInput input){
        return reviews.decide(id,input);
    }
}
