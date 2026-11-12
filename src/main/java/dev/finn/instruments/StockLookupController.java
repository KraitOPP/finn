package dev.finn.instruments;

import dev.finn.market.MarketPrices;
import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog/lookup")
class StockLookupController {
    record Selection(@NotBlank @Pattern(regexp="NSE|BSE") String exchange,
                     @NotBlank @Size(max=64) String symbol) {}
    record Opened(Catalogue.Listing listing,String refreshStatus) {}
    private final StockDirectory directory;
    private final Catalogue catalogue;
    private final MarketPrices prices;

    StockLookupController(StockDirectory directory,Catalogue catalogue,MarketPrices prices) {
        this.directory=directory;
        this.catalogue=catalogue;
        this.prices=prices;
    }

    @GetMapping StockDirectory.Results lookup(@RequestParam String query,@RequestParam(defaultValue="NSE") String exchange) {
        return directory.search(query,exchange);
    }

    @PostMapping Opened open(@Valid @RequestBody Selection input) {
        var candidate=directory.resolve(input.exchange(),input.symbol());
        var listing=catalogue.selectStock(candidate);
        var feed=prices.feed(listing.listingId());
        if(!"PRIVATE_DAILY".equals(feed.yahoo())) return new Opened(listing,"UNAVAILABLE");
        if("QUEUED".equals(feed.latestJobState())||"RUNNING".equals(feed.latestJobState()))
            return new Opened(listing,"QUEUED");
        if(feed.lastAttemptAt()!=null&&Instant.parse(feed.lastAttemptAt()).isAfter(Instant.now().minusSeconds(1800)))
            return new Opened(listing,"RECENT");
        var today=StockDirectory.today();
        var start=java.util.Collections.max(java.util.List.of(today.minusDays(14),listing.validFrom(),candidate.validFrom()));
        if(!start.isBefore(today)) return new Opened(listing,"UNAVAILABLE");
        try {
            prices.queue(listing.listingId(),start,today);
            return new Opened(listing,"QUEUED");
        } catch(ApiFailure unavailable) {
            return new Opened(listing,"UNAVAILABLE");
        }
    }
}
