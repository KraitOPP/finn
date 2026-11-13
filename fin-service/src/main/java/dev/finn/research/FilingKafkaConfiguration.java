package dev.finn.research;

import static org.springframework.kafka.listener.DeadLetterPublishingRecoverer.HeaderNames.HeadersToAdd.EX_MSG;
import static org.springframework.kafka.listener.DeadLetterPublishingRecoverer.HeaderNames.HeadersToAdd.EX_STACKTRACE;

import java.time.Duration;
import org.apache.kafka.clients.admin.NewTopic;
import org.apache.kafka.common.TopicPartition;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

@Configuration(proxyBeanMethods=false)
@ConditionalOnProperty(name="finn.filings.kafka.enabled",havingValue="true")
class FilingKafkaConfiguration {
    @Bean NewTopic reviewedCompanyEvents(@Value("${finn.filings.kafka.topic}") String name,
                                         @Value("${finn.filings.kafka.replication-factor}") int replicas){
        return TopicBuilder.name(name).partitions(6).replicas(replicas)
                .config("retention.ms",Long.toString(Duration.ofDays(30).toMillis())).build();
    }

    @Bean NewTopic reviewedCompanyEventFailures(@Value("${finn.filings.kafka.topic}") String name,
                                                @Value("${finn.filings.kafka.replication-factor}") int replicas){
        return TopicBuilder.name(name+".failed").partitions(6).replicas(replicas)
                .config("retention.ms",Long.toString(Duration.ofDays(7).toMillis())).build();
    }

    @Bean DefaultErrorHandler filingConsumerErrors(KafkaTemplate<String,String> kafka,FilingStreamMetrics metrics){
        var deadLetters=new DeadLetterPublishingRecoverer(kafka,(record,error)->new TopicPartition(record.topic()+".failed",record.partition()));
        deadLetters.setFailIfSendResultIsError(true);
        deadLetters.excludeHeader(EX_MSG,EX_STACKTRACE);
        var handler=new DefaultErrorHandler((record,error)->{
            deadLetters.accept(record,error);
            if(error instanceof org.springframework.kafka.listener.ListenerExecutionFailedException failed){
                String group=failed.getGroupId();
                if(group!=null)for(var consumer:ReviewedEventProcessor.Consumer.values()){
                    if(group.endsWith("-"+consumer.label()))metrics.deadLetter(consumer);
                }
            }
        },new FixedBackOff(1000,4));
        handler.addNotRetryableExceptions(ReviewedEventProcessor.InvalidMessage.class);
        return handler;
    }
}
