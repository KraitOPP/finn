package dev.finn.jobs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration(proxyBeanMethods=false)
class WorkerSchedulers {
    @Bean
    ThreadPoolTaskScheduler taskScheduler(){return scheduler(3,"finn-maintenance-");}

    @Bean
    ThreadPoolTaskScheduler ingestionScheduler(){return scheduler(4,"finn-ingestion-");}

    private static ThreadPoolTaskScheduler scheduler(int size,String prefix){
        var scheduler=new ThreadPoolTaskScheduler();
        scheduler.setPoolSize(size);
        scheduler.setThreadNamePrefix(prefix);
        scheduler.setRemoveOnCancelPolicy(true);
        scheduler.setAwaitTerminationSeconds(3);
        return scheduler;
    }
}
