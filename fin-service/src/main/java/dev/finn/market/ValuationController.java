
package dev.finn.market;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}")
class ValuationController {
    record Selection(@NotNull UUID securityId,UUID listingId,@NotNull Boolean allowProviderEstimate) {}
    private final Valuations values;
    ValuationController(Valuations values){this.values=values;}

    @GetMapping("/valuation") Valuations.PortfolioValue portfolio(@PathVariable UUID portfolio){return values.portfolio(portfolio);}
    @GetMapping("/accounts/{account}/valuation")
    Valuations.AccountValue account(@PathVariable UUID portfolio,@PathVariable UUID account){return values.account(portfolio,account);}
    @PostMapping("/accounts/{account}/valuation/listing")
    Valuations.Choice listing(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody Selection input){
        return values.choose(portfolio,account,input.securityId(),input.listingId(),input.allowProviderEstimate());
    }
}
