package dev.finn.jobs;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class WorkerSchedulersTest {
    @Test void deliveryExecutorRemainsAvailableWhenAllIngestionThreadsAreBusy() throws Exception {
        var configuration=new WorkerSchedulers();
        var ingestion=configuration.ingestionScheduler();
        var maintenance=configuration.taskScheduler();
        ingestion.initialize();
        maintenance.initialize();
        var started=new CountDownLatch(4);
        var finish=new CountDownLatch(1);
        try {
            for(int i=0;i<4;i++){
                ingestion.execute(()->{
                    started.countDown();
                    try {finish.await();}
                    catch(InterruptedException interrupted){Thread.currentThread().interrupt();}
                });
            }
            assertTrue(started.await(4,TimeUnit.SECONDS));
            assertTrue(maintenance.submit(()->Thread.currentThread().getName()).get(4,TimeUnit.SECONDS).startsWith("finn-maintenance-"));
        }finally{
            finish.countDown();
            ingestion.destroy();
            maintenance.destroy();
        }
    }
}
