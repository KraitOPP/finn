package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/discovery")
class PeerRankingController {
    record Factor(@NotNull DiscoveryUniverse.Metric metric,@NotNull @Pattern(regexp="HIGHER|LOWER") String direction,
                  @NotNull @Min(1) @Max(100) Integer weight) {}
    record Input(@NotNull UUID requestId,@NotNull @Size(min=2,max=30) List<@NotNull UUID> companyIds,
                 @NotNull @Size(min=1,max=6) List<@NotNull @Valid Factor> factors) {}

    private final PeerRankings rankings;
    PeerRankingController(PeerRankings rankings){this.rankings=rankings;}

    @GetMapping("/screen-runs/{id}/rankings") PeerRankings.Index list(@PathVariable UUID id){return rankings.list(id);}
    @PostMapping("/screen-runs/{id}/rankings") PeerRankings.View create(@PathVariable UUID id,@Valid @RequestBody Input input){return rankings.rank(id,input);}
    @GetMapping("/rankings/{id}") PeerRankings.View read(@PathVariable UUID id){return rankings.read(id);}
}
