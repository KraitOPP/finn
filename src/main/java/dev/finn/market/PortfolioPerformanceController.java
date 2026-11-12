package dev.finn.market;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}/performance")
class PortfolioPerformanceController {
    record Input(@NotNull LocalDate start,@NotNull LocalDate end,@NotNull Boolean reviewed) {}
    private final PortfolioPerformance performance;
    PortfolioPerformanceController(PortfolioPerformance performance){this.performance=performance;}

    @PostMapping PortfolioPerformance.Result report(@PathVariable UUID portfolio,@Valid @RequestBody Input input){
        return performance.report(portfolio,new PortfolioPerformance.Window(input.start(),input.end(),input.reviewed()));
    }
}
