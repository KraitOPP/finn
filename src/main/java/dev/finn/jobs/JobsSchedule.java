package dev.finn.jobs;

import dev.finn.imports.HoldingsImportWorker;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;

@Configuration(proxyBeanMethods=false)
@EnableScheduling
@ConditionalOnProperty(name="finn.jobs.enabled",havingValue="true",matchIfMissing=true)
class JobsSchedule {
    private final HoldingsImportWorker imports;
    JobsSchedule(HoldingsImportWorker imports){this.imports=imports;}
    @Scheduled(fixedDelay=1000)
    void tick(){try{imports.runOne();}catch(RuntimeException failure){LoggerFactory.getLogger(JobsSchedule.class).warn("Job polling is temporarily unavailable");}}
}
