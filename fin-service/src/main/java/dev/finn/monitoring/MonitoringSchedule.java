
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
    private final ReviewReminders reminders;
    private final Indicators indicators;
    private final PortfolioBriefs briefs;
    MonitoringSchedule(PriceEvaluationWorker prices, DeliveryWorker deliveries, ReviewReminders reminders, Indicators indicators,
                       PortfolioBriefs briefs) {
        this.prices = prices;
        this.deliveries = deliveries;
        this.reminders = reminders;
        this.indicators = indicators;
        this.briefs = briefs;
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

    @Scheduled(fixedDelay=10000)
    void reminders() {
        try {
            for (int i=0; i<16 && reminders.processNext(); i++) {
                // Separate transactions keep other reminders available.
            }
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(MonitoringSchedule.class).warn("Reminder scheduling temporarily unavailable");
        }
    }

    @Scheduled(fixedDelay=20000)
    void indicators() {
        try {
            for (int i=0; i<8 && indicators.processNext(); i++) {
                // Each coverage check is isolated from other rules.
            }
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(MonitoringSchedule.class).warn("Indicator monitoring temporarily unavailable");
        }
    }

    @Scheduled(fixedDelay=20000)
    void briefs() {
        try {
            for (int i=0; i<8 && briefs.processNext(); i++) {
                // Each closed reporting window has its own transaction.
            }
        } catch (RuntimeException failure) {
            LoggerFactory.getLogger(MonitoringSchedule.class).warn("Portfolio brief scheduling temporarily unavailable");
        }
    }
}
