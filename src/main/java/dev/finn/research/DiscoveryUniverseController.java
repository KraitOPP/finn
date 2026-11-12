package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/discovery/universe")
class DiscoveryUniverseController {
    record Input(@NotNull UUID listingId,@NotNull DiscoveryUniverse.Sector sector,@NotNull Boolean active,
                 @Min(1) @Max(100) Integer expectedRevision) {}

    private final DiscoveryUniverse universe;
    DiscoveryUniverseController(DiscoveryUniverse universe){this.universe=universe;}

    @GetMapping DiscoveryUniverse.Directory list(){return universe.directory();}
    @PostMapping DiscoveryUniverse.Member save(@Valid @RequestBody Input input){return universe.save(input);}
    @GetMapping("/coverage") DiscoveryUniverse.Snapshot inspect(@RequestParam @Pattern(regexp="QUARTER|FULL_YEAR") String kind,
            @RequestParam LocalDate start,@RequestParam LocalDate end){
        return universe.inspect(new DiscoveryUniverse.Period(kind,start,end));
    }
}
