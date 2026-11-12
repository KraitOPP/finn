
package dev.finn.research;

import dev.finn.jobs.JobQueue;
import java.io.IOException;
import java.util.List;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ResearchExtractionWorker {
    private final ResearchEvidence evidence;
    private final ResearchPdfProcess pdf;
    private final JobQueue jobs;
    ResearchExtractionWorker(ResearchEvidence evidence,ResearchPdfProcess pdf,JobQueue jobs) {
        this.evidence=evidence;this.pdf=pdf;this.jobs=jobs;
    }

    public boolean processNext() {
        var claim=jobs.claim(JobQueue.Kind.RESEARCH_EXTRACT);
        if(claim==null)return false;
        try {
            var input=evidence.input(claim);
            EvidenceText.Result result;
            if(input.text()!=null)result=EvidenceText.text(input.text());
            else if(!pdf.configured())result=new EvidenceText.Result("UNSUPPORTED","PDF_EXTRACTOR_UNCONFIGURED",0,List.of());
            else result=EvidenceText.pdf(pdf.extract(input.pdf()));
            evidence.finish(claim,result);
        } catch(InterruptedException interrupted) {
            Thread.currentThread().interrupt();
        } catch(IOException|RuntimeException failed) {
            jobs.retry(claim);
        }
        return true;
    }

    @Component
    @ConditionalOnProperty(name="finn.jobs.enabled",havingValue="true",matchIfMissing=true)
    static class Schedule {
        private final ResearchExtractionWorker worker;
        Schedule(ResearchExtractionWorker worker){this.worker=worker;}
        @Scheduled(fixedDelay=3000,scheduler="ingestionScheduler")
        void run() {
            try {worker.processNext();}
            catch(RuntimeException failure){LoggerFactory.getLogger(Schedule.class).warn("Document extraction temporarily unavailable");}
        }
    }
}
