package dev.finn.research;

import dev.finn.jobs.JobQueue;
import java.io.IOException;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
class ResearchReportWorker {
    private final JobQueue jobs;
    private final ResearchReports reports;
    private final LocalEvidenceModel model;

    ResearchReportWorker(JobQueue jobs,ResearchReports reports,LocalEvidenceModel model){
        this.jobs=jobs;this.reports=reports;this.model=model;
    }

    boolean processNext(){
        var claim=jobs.claim(JobQueue.Kind.RESEARCH_ANSWER);
        if(claim==null)return false;
        try{
            var report=reports.root(claim.ownerId(),claim.resourceId());
            List<UUID> selected=List.of();
            if(Objects.equals(model.name(),report.model())){
                try{selected=model.rank(report.question(),reports.candidates(report));}
                catch(IOException unavailable){/* The saved lexical results provide the fallback. */}
            }
            reports.complete(claim,selected);
        }catch(InterruptedException interrupted){
            Thread.currentThread().interrupt();
        }catch(RuntimeException unavailable){
            jobs.retry(claim);
        }
        return true;
    }

    @Component
    @ConditionalOnProperty(name="finn.jobs.enabled",havingValue="true",matchIfMissing=true)
    static class Schedule {
        private final ResearchReportWorker worker;
        Schedule(ResearchReportWorker worker){this.worker=worker;}
        @Scheduled(fixedDelay=3500)
        void run(){
            try{worker.processNext();}
            catch(RuntimeException unavailable){LoggerFactory.getLogger(Schedule.class).warn("Research ranking temporarily unavailable");}
        }
    }
}
