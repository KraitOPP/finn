package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.StockDirectory;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/discovery")
class MarketRadarController {
    record Search(@NotNull @Min(1) @Max(30) Integer days,EventClassifier.Subtype eventType) {}
    record Lead(String symbol,String companyName,EventClassifier.Subtype eventType,LocalDate publishedOn,
                String headline,String detail,String url) {}
    record Leads(List<Lead> items) {}
    private final MarketRadar radar;
    private final CurrentUser users;
    private final GroqResearch groq;
    private final StockDirectory directory;

    MarketRadarController(MarketRadar radar,CurrentUser users,GroqResearch groq,StockDirectory directory) {
        this.radar=radar;this.users=users;this.groq=groq;this.directory=directory;
    }

    @GetMapping("/radar") MarketRadar.Radar radar(@RequestParam(defaultValue="7") @Min(1) @Max(30) int days,
            @RequestParam(defaultValue="ALL") MarketRadar.Scope scope,@RequestParam(defaultValue="ALL") MarketRadar.Kind kind,
            @RequestParam(required=false) DiscoveryUniverse.Sector sector,@RequestParam(required=false) EventClassifier.Subtype eventType,
            @RequestParam(defaultValue="ALL") MarketRadar.Liquidity liquidity,@RequestParam(required=false) UUID portfolioId) {
        return radar.radar(new MarketRadar.Filter(days,scope,kind,sector,eventType,liquidity,portfolioId));
    }

    @GetMapping("/portfolio-calendar") MarketRadar.Calendar calendar(@RequestParam(required=false) UUID portfolioId) {
        return radar.calendar(portfolioId);
    }

    @PostMapping("/radar/leads") Leads leads(@Valid @RequestBody Search input) {
        var found=groq.leads(users.requireId(),input.days(),input.eventType());
        return new Leads(found.stream().flatMap(item->{
            String name=directory.knownNseName(item.symbol());
            return name==null?java.util.stream.Stream.empty():java.util.stream.Stream.of(
                    new Lead(item.symbol(),name,item.type(),item.date(),item.title(),item.detail(),item.url()));
        }).toList());
    }
}
