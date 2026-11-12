
package dev.finn.monitoring;

import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
class PriceEvaluationController {
    private final PriceEvaluationReport reports;
    PriceEvaluationController(PriceEvaluationReport reports) { this.reports = reports; }

    @GetMapping("/api/v1/monitoring/rules/{id}/evaluations")
    PriceEvaluationReport.Report report(@PathVariable UUID id) { return reports.report(id); }
}
