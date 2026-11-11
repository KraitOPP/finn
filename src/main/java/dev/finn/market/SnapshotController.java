
package dev.finn.market;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}/accounts/{account}/valuation/snapshots")
class SnapshotController {
    record Window(@NotNull LocalDate start,@NotNull LocalDate endExclusive) {}
    private final ValuationSnapshots snapshots;
    SnapshotController(ValuationSnapshots snapshots){this.snapshots=snapshots;}
    @GetMapping ValuationSnapshots.Series history(@PathVariable UUID portfolio,@PathVariable UUID account,
                                                  @RequestParam LocalDate start,@RequestParam LocalDate endExclusive){
        return snapshots.history(portfolio,account,start,endExclusive);
    }
    @GetMapping("/{id}") ValuationSnapshots.Detail detail(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID id){
        return snapshots.detail(portfolio,account,id);
    }
    @PostMapping ValuationSnapshots.Series build(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody Window input){
        return snapshots.build(portfolio,account,input.start(),input.endExclusive());
    }
}
