package dev.finn.imports;

import dev.finn.jobs.JobQueue;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class HoldingsImportWorker {
    private final JobQueue queue;private final HoldingsImports imports;
    public HoldingsImportWorker(JobQueue queue,HoldingsImports imports){this.queue=queue;this.imports=imports;}
    public void runOne(){
        var claim=queue.claim(JobQueue.Kind.GROWW_HOLDINGS_PREVIEW);if(claim!=null)process(claim);
    }
    public void process(JobQueue.Claim claim){
        try{var preview=GrowwHoldingsReader.read(imports.readForWorker(claim));imports.stage(claim,preview);}
        catch(ImportRejected rejected){queue.reject(claim,rejected.code().name());}
        catch(RuntimeException failure){
            LoggerFactory.getLogger(HoldingsImportWorker.class).warn("Holdings preview temporarily failed job={}",claim.jobId());
            queue.retry(claim);
        }
    }
}
