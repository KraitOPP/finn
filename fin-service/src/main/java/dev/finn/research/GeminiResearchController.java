package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/gemini")
class GeminiResearchController {
    record Input(@NotNull UUID listingId, @NotNull GeminiResearch.Preset preset) {}
    record Listings(List<Catalogue.Listing> items) {}
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final GeminiResearch research;

    GeminiResearchController(CurrentUser users, Catalogue catalogue, GeminiResearch research) {
        this.users=users; this.catalogue=catalogue; this.research=research;
    }

    @GetMapping("/capability") GeminiResearch.Capability capability() { return research.capability(); }

    @GetMapping("/listings") Listings listings(@RequestParam UUID company) {
        return new Listings(catalogue.companyListings(users.requireId(),company));
    }

    @PostMapping GeminiResearch.Report run(@RequestBody @Valid Input input) {
        UUID owner = users.requireId();
        return research.run(owner,catalogue.listing(owner,input.listingId()),input.preset());
    }
}
