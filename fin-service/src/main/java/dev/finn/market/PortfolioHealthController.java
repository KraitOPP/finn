package dev.finn.market;

import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}")
class PortfolioHealthController {
    record ScenarioInput(@NotNull UUID listingId,@NotNull JsonNode cashAllocation,@NotNull JsonNode shockPercent) {}
    private final PortfolioHealth health;
    private final PortfolioRisk risk;

    PortfolioHealthController(PortfolioHealth health,PortfolioRisk risk){this.health=health;this.risk=risk;}

    @GetMapping("/health") PortfolioHealth.Current health(@PathVariable UUID portfolio){return health.health(portfolio);}
    @PostMapping("/health/scenario") PortfolioHealth.Scenario simulate(@PathVariable UUID portfolio,@Valid @RequestBody ScenarioInput input){
        var allocation=decimal(input.cashAllocation());
        var shock=decimal(input.shockPercent());
        if(allocation.signum()<0||shock.compareTo(BigDecimal.valueOf(-100))<0||shock.compareTo(BigDecimal.valueOf(500))>0)
            throw ApiFailure.invalid();
        return health.simulate(portfolio,new PortfolioHealth.Assumptions(input.listingId(),allocation,shock));
    }
    @PostMapping("/health/risk") PortfolioRisk.Result risk(@PathVariable UUID portfolio,@Valid @RequestBody PortfolioPerformanceController.Input input){
        return risk.report(portfolio,new PortfolioPerformance.Window(input.start(),input.end(),input.reviewed()));
    }

    private static BigDecimal decimal(JsonNode value){
        if(!value.isString()||!value.asText().matches("-?(0|[1-9][0-9]{0,21})(\\.[0-9]{1,8})?"))throw ApiFailure.invalid();
        return new BigDecimal(value.asText());
    }
}
