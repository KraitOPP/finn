package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/gemini")
class GeminiResearchController {
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final GeminiResearch research;

    GeminiResearchController(CurrentUser users, Catalogue catalogue, GeminiResearch research) {
        this.users=users; this.catalogue=catalogue; this.research=research;
    }

    @GetMapping("/capability") GeminiResearch.Capability capability() { return research.capability(); }

    @GetMapping("/listings") StockResearch.Listings listings(@RequestParam UUID company) {
        return new StockResearch.Listings(catalogue.companyListings(users.requireId(),company));
    }

    @PostMapping StockResearch.Report run(@RequestBody @Valid StockResearch.Input input) {
        UUID owner = users.requireId();
        return research.run(owner,catalogue.listing(owner,input.listingId()),input.preset());
    }
}
