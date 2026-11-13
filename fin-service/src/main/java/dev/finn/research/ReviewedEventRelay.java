package dev.finn.research;

import java.util.ArrayList;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.json.JsonMapper;

@Component
@ConditionalOnProperty(name="finn.filings.kafka.enabled",havingValue="true")
class ReviewedEventRelay {
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ReviewedEventOutbox outbox;
    private final KafkaTemplate<String,String> kafka;
    private final JsonMapper json;
    private final String topic;
    private final FilingStreamMetrics metrics;

    ReviewedEventRelay(JdbcTemplate jdbc,TransactionTemplate transaction,ReviewedEventOutbox outbox,KafkaTemplate<String,String> kafka,
                       JsonMapper json,@Value("${finn.filings.kafka.topic}") String topic,FilingStreamMetrics metrics){
        this.jdbc=jdbc;
        this.transaction=transaction;
        this.outbox=outbox;
        this.kafka=kafka;
        this.json=json;
        this.topic=topic;
        this.metrics=metrics;
    }

    @Scheduled(fixedDelayString="${finn.filings.kafka.relay-delay-ms:250}",scheduler="ingestionScheduler")
    void publish(){
        try{
            var count=transaction.execute(status->publishBatch());
            if(count!=null&&count>0)metrics.published(count);
        }catch(RuntimeException failure){
            metrics.publishFailed();
        }
    }

    private int publishBatch(){
        // Only one relay may send a batch at a time, including across replicas.
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT pg_try_advisory_xact_lock(46004901)",Boolean.class)))return 0;
        var batch=outbox.pending(200);
        if(batch.isEmpty())return 0;
        var acks=new ArrayList<CompletableFuture<?>>();
        for(var event:batch){
            var payload=json.writeValueAsString(new ReviewedEventOutbox.Message(1,event.id()));
            acks.add(kafka.send(topic,event.partitionKey(),payload));
        }
        try{
            CompletableFuture.allOf(acks.toArray(CompletableFuture[]::new)).get(12,TimeUnit.SECONDS);
        }catch(InterruptedException stopped){
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Filing publication interrupted",stopped);
        }catch(ExecutionException|TimeoutException unavailable){
            throw new IllegalStateException("Filing publication unavailable",unavailable);
        }
        // A crash between broker acknowledgement and commit can repeat the batch.
        outbox.markPublished(batch);
        return batch.size();
    }
}
