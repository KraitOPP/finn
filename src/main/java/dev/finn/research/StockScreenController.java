package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/discovery")
class StockScreenController {
    record Filter(@NotNull DiscoveryUniverse.Metric metric,@NotNull @Pattern(regexp="GTE|LTE") String comparator,
                  @NotNull JsonNode amount,@NotNull @Pattern(regexp="ONES|THOUSAND|LAKH|MILLION|CRORE|BILLION") String scale) {}
    record Input(@NotBlank @Size(max=80) String name,@NotNull DiscoveryUniverse.Sector sector,
                 @NotNull DiscoveryUniverse.Period period,@NotNull @Size(min=1,max=6) List<@NotNull @Valid Filter> filters) {}
    record Edit(@NotNull @Min(1) @Max(100) Integer expectedRevision,@NotNull @Valid Input screen) {}
    record RunInput(@NotNull @Min(1) @Max(100) Integer revision,@NotNull UUID requestId) {}

    private final StockScreens screens;
    StockScreenController(StockScreens screens){this.screens=screens;}

    @GetMapping("/screens") StockScreens.Index list(){return screens.index();}
    @PostMapping("/screens") StockScreens.Version create(@Valid @RequestBody Input input){return screens.save(null,null,input);}
    @PostMapping("/screens/{id}") StockScreens.Version edit(@PathVariable UUID id,@Valid @RequestBody Edit input){
        return screens.save(id,input.expectedRevision(),input.screen());
    }
    @GetMapping("/screens/{id}/versions") StockScreens.Index versions(@PathVariable UUID id){return screens.versions(id);}
    @GetMapping("/screens/{id}/runs") StockScreens.History history(@PathVariable UUID id){return screens.history(id);}
    @PostMapping("/screens/{id}/runs") StockScreens.Run run(@PathVariable UUID id,@Valid @RequestBody RunInput input){
        return screens.run(id,input.revision(),input.requestId());
    }
    @GetMapping("/screen-runs/{id}") StockScreens.Run read(@PathVariable UUID id){return screens.read(id);}
}
