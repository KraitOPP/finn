
package dev.finn.market;

import org.springframework.web.bind.annotation.*;

@RestController
class MarketDiagnosticsController {
    private final MarketDiagnostics diagnostics;
    MarketDiagnosticsController(MarketDiagnostics diagnostics){this.diagnostics=diagnostics;}
    @GetMapping("/api/v1/market/status") MarketDiagnostics.View status(){return diagnostics.report();}
}
