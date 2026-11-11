
package dev.finn.monitoring;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="finn.jobs.enabled", havingValue="true", matchIfMissing=true)
class MonitoringSchedule {
    private final PriceEvaluationWorker prices;
    MonitoringSchedule(PriceEvaluationWorker prices) { this.prices = prices; }

    @Scheduled(fixedDelay=15000)
    void prices() {
        try {
            for (int i=0; i<16 && prices.processNext(); i++) {
                // Each rule runs in its own transaction.
            }
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(MonitoringSchedule.class).warn("Price evaluation temporarily unavailable");
        }
    }
}
