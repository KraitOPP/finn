
package dev.finn.monitoring;

import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="finn.jobs.enabled", havingValue="true", matchIfMissing=true)
class MonitoringSchedule {
    private final PriceEvaluationWorker prices;
    private final DeliveryWorker deliveries;
    MonitoringSchedule(PriceEvaluationWorker prices, DeliveryWorker deliveries) {
        this.prices = prices;
        this.deliveries = deliveries;
    }

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

    @Scheduled(fixedDelay=5000)
    void deliver() {
        try {
            for (int i=0; i<24 && deliveries.processNext(); i++) {
                // Each delivery and its attempt share one transaction.
            }
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(MonitoringSchedule.class).warn("Notification delivery temporarily unavailable");
        }
    }
}
