package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import jakarta.validation.Valid;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/stock-ai")
class StockAiController {
    enum Provider { GROQ, GEMINI }
    record Capability(Provider provider, boolean configured, String model) {}
    record Result(Provider provider, StockResearch.Report report) {}
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final GroqResearch groq;
    private final GeminiResearch gemini;
    private final Provider selected;

    StockAiController(CurrentUser users, Catalogue catalogue, GroqResearch groq, GeminiResearch gemini,
                      @Value("${finn.stock-ai.provider:${FINN_STOCK_AI_PROVIDER:AUTO}}") String choice) {
        this.users = users;
        this.catalogue = catalogue;
        this.groq = groq;
        this.gemini = gemini;
        this.selected = "AUTO".equalsIgnoreCase(choice.strip())
                ? (groq.configured() || !gemini.capability().configured() ? Provider.GROQ : Provider.GEMINI)
                : Provider.valueOf(choice.strip().toUpperCase(Locale.ROOT));
    }

    @GetMapping("/capability") Capability capability() {
        if (selected == Provider.GROQ)
            return new Capability(selected,groq.configured(),groq.configured() ? GroqResearch.MODEL : null);
        var capability = gemini.capability();
        return new Capability(selected,capability.configured(),capability.model());
    }

    @GetMapping("/listings") StockResearch.Listings listings(@RequestParam UUID company) {
        return new StockResearch.Listings(catalogue.companyListings(users.requireId(),company));
    }

    @PostMapping Result run(@Valid @RequestBody StockResearch.Input input) {
        UUID owner = users.requireId();
        var listing = catalogue.listing(owner,input.listingId());
        return new Result(selected, selected == Provider.GROQ ? groq.run(owner,listing,input.preset()) :
                gemini.run(owner,listing,input.preset()));
    }
}
