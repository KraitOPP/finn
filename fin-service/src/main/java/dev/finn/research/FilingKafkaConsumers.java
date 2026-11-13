package dev.finn.research;

import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.json.JsonMapper;

@Component
@ConditionalOnProperty(name="finn.filings.kafka.enabled",havingValue="true")
class FilingKafkaConsumers {
    private final ReviewedEventProcessor processor;
    private final JsonMapper json;
    private final FilingStreamMetrics metrics;

    FilingKafkaConsumers(ReviewedEventProcessor processor,JsonMapper json,FilingStreamMetrics metrics){
        this.processor=processor;
        this.json=json;
        this.metrics=metrics;
    }

    @KafkaListener(id="finn-filing-alerts",topics="${finn.filings.kafka.topic}",groupId="${finn.filings.kafka.group-prefix}-alerts",
            concurrency="${finn.filings.kafka.concurrency}")
    void alerts(ConsumerRecord<String,String> record){receive(ReviewedEventProcessor.Consumer.ALERTS,record);}

    @KafkaListener(id="finn-filing-radar",topics="${finn.filings.kafka.topic}",groupId="${finn.filings.kafka.group-prefix}-radar",
            concurrency="${finn.filings.kafka.concurrency}")
    void radar(ConsumerRecord<String,String> record){receive(ReviewedEventProcessor.Consumer.RADAR,record);}

    @KafkaListener(id="finn-filing-thesis",topics="${finn.filings.kafka.topic}",groupId="${finn.filings.kafka.group-prefix}-thesis",
            concurrency="${finn.filings.kafka.concurrency}")
    void thesis(ConsumerRecord<String,String> record){receive(ReviewedEventProcessor.Consumer.THESIS,record);}

    private void receive(ReviewedEventProcessor.Consumer consumer,ConsumerRecord<String,String> record){
        ReviewedEventOutbox.Message message;
        if(record.value()==null||record.value().length()>256)throw new ReviewedEventProcessor.InvalidMessage();
        try{
            message=json.readValue(record.value(),ReviewedEventOutbox.Message.class);
        }catch(JacksonException invalid){
            throw new ReviewedEventProcessor.InvalidMessage();
        }
        if(message==null||message.version()!=1||message.id()==null)throw new ReviewedEventProcessor.InvalidMessage();
        var result=processor.process(consumer,record.key(),message.id());
        metrics.result(consumer,result.outcome(),result.occurredAt());
    }
}
