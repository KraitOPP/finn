package dev.finn.research;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/guidance/{id}/versions/{revision}/delivery")
class GuidanceDeliveryController {
    private final GuidanceDelivery delivery;
    GuidanceDeliveryController(GuidanceDelivery delivery){this.delivery=delivery;}

    @GetMapping GuidanceDelivery.Outcome compare(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision,
                                                 @RequestParam(required=false) LocalDate asOf){
        return delivery.compare(id,revision,asOf);
    }
}
