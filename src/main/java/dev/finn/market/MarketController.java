
package dev.finn.market;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/market/listings/{listing}")
class MarketController {
    record ReviewClose(@NotNull LocalDate sessionDate,@NotNull JsonNode close,@NotBlank @Size(max=240) String sourceReference,@AssertTrue boolean reviewed){}
    record FetchWindow(@NotNull LocalDate start,@NotNull LocalDate endExclusive){}
    private final MarketPrices prices;
    MarketController(MarketPrices prices){this.prices=prices;}
    @GetMapping MarketPrices.Feed feed(@PathVariable UUID listing){return prices.feed(listing);}
    @GetMapping("/history") MarketPrices.PriceHistory history(@PathVariable UUID listing,@RequestParam LocalDate start,@RequestParam LocalDate endExclusive){
        return prices.history(listing,start,endExclusive);
    }
    @PostMapping("/reviewed-close") MarketPrices.Observation review(@PathVariable UUID listing,@Valid @RequestBody ReviewClose input){
        if(!input.close().isString())throw ApiFailure.invalid();
        return prices.record(listing,input.sessionDate(),input.close().asText(),input.sourceReference(),input.reviewed());
    }
    @ResponseStatus(HttpStatus.ACCEPTED) @PostMapping("/refresh")
    MarketPrices.Queued refresh(@PathVariable UUID listing,@Valid @RequestBody FetchWindow input){
        return prices.queue(listing,input.start(),input.endExclusive());
    }
}
