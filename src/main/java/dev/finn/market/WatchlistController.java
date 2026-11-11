
package dev.finn.market;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/watchlists")
class WatchlistController {
    record Create(@NotBlank @Size(max=80) String name){}
    record Track(@NotNull UUID listingId,@NotNull Boolean tracked){}
    private final Watchlists watchlists;
    WatchlistController(Watchlists watchlists){this.watchlists=watchlists;}

    @GetMapping Watchlists.Index index(){return watchlists.index();}
    @PostMapping Watchlists.Summary create(@Valid @RequestBody Create input){return watchlists.create(input.name());}
    @GetMapping("/{id}") Watchlists.Detail detail(@PathVariable UUID id){return watchlists.detail(id);}
    @PostMapping("/{id}/items") Watchlists.Detail track(@PathVariable UUID id,@Valid @RequestBody Track input){
        return watchlists.setItem(id,input.listingId(),input.tracked());
    }
}
