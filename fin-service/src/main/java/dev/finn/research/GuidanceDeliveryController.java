package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/guidance/{id}/versions/{revision}/delivery")
class GuidanceDeliveryController {
    record Completion(@NotNull LocalDate actualDate,@NotNull UUID anchorId,@NotNull @AssertTrue Boolean reviewed) {}
    private final GuidanceDelivery delivery;
    GuidanceDeliveryController(GuidanceDelivery delivery){this.delivery=delivery;}

    @GetMapping GuidanceDelivery.Outcome compare(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision,
                                                 @RequestParam(required=false) LocalDate asOf){
        return delivery.compare(id,revision,asOf);
    }

    @PostMapping GuidanceDelivery.Milestone complete(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision,
                                                    @Valid @RequestBody Completion input){
        return delivery.recordCompletion(id,revision,input.actualDate(),input.anchorId());
    }
}
