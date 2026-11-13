package dev.finn.research;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import java.time.Duration;
import java.time.Instant;
import java.util.EnumMap;
import java.util.Locale;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name="finn.filings.kafka.enabled",havingValue="true")
class FilingStreamMetrics {
    private final Counter published;
    private final Counter publishFailures;
    private final EnumMap<ReviewedEventProcessor.Consumer,Timer> latency=new EnumMap<>(ReviewedEventProcessor.Consumer.class);
    private final MeterRegistry meters;

    FilingStreamMetrics(MeterRegistry meters,ReviewedEventOutbox outbox){
        this.meters=meters;
        published=meters.counter("finn.filings.published");
        publishFailures=meters.counter("finn.filings.publish.failures");
        Gauge.builder("finn.filings.outbox.pending",outbox,ReviewedEventOutbox::pendingPublications)
                .description("Reviewed event records waiting for broker acknowledgement").register(meters);
        for(var consumer:ReviewedEventProcessor.Consumer.values()){
            Gauge.builder("finn.filings.consumer.pending",outbox,value->value.pendingConsumer(consumer.label()))
                    .tag("consumer",consumer.label()).description("Published events without a durable consumer receipt").register(meters);
            latency.put(consumer,Timer.builder("finn.filings.processing.latency").tag("consumer",consumer.label())
                    .description("Time from filing or financial fact review to committed processing")
                    .publishPercentileHistogram().maximumExpectedValue(Duration.ofMinutes(15)).register(meters));
        }
    }

    void published(int count){published.increment(count);}
    void publishFailed(){publishFailures.increment();}

    void result(ReviewedEventProcessor.Consumer consumer,ReviewedEventProcessor.Outcome outcome,Instant occurred){
        if(outcome==ReviewedEventProcessor.Outcome.SKIPPED)return;
        meters.counter("finn.filings.consumer.events","consumer",consumer.label(),"outcome",outcome.name().toLowerCase(Locale.ROOT)).increment();
        if(outcome==ReviewedEventProcessor.Outcome.PROCESSED)latency.get(consumer).record(Duration.between(occurred,Instant.now()));
    }

    void deadLetter(ReviewedEventProcessor.Consumer consumer){
        meters.counter("finn.filings.dead.letters","consumer",consumer.label()).increment();
    }
}
