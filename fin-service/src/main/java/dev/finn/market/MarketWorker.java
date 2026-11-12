
package dev.finn.market;

import dev.finn.jobs.JobQueue;
import java.io.IOException;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Scheduled;

@Component
@ConditionalOnProperty(name="finn.jobs.enabled",havingValue="true",matchIfMissing=true)
class MarketWorker {
    private final MarketPrices prices;
    private final JobQueue jobs;
    private final YahooProcess provider;
    MarketWorker(MarketPrices prices,JobQueue jobs,YahooProcess provider){this.prices=prices;this.jobs=jobs;this.provider=provider;}

    @Scheduled(fixedDelay=1500,scheduler="ingestionScheduler")
    void tick(){
        var claim=jobs.claim(JobQueue.Kind.YAHOO_DAILY_HISTORY);
        if(claim==null)return;
        try {
            var request=prices.input(claim);
            if(!provider.capability().equals("PRIVATE_DAILY")){jobs.reject(claim,"YAHOO_NOT_CONFIGURED");return;}
            if(!prices.mappingValid(claim.ownerId(),request)){jobs.reject(claim,"REVIEWED_MAPPING_CHANGED");return;}
            if(request.start().isBefore(MarketPrices.today().minusDays(90))){jobs.reject(claim,"PRICE_WINDOW_EXPIRED");return;}
            var result=YahooCandidate.parse(provider.fetch(request),request);
            switch(result.status()){
                case "AVAILABLE" -> prices.accept(claim,request,result);
                case "UNKNOWN" -> jobs.reject(claim,"NO_ROWS_RETURNED");
                case "INVALID_DATA" -> jobs.reject(claim,"SOURCE_VALIDATION_FAILED");
                default -> retry(claim);
            }
        } catch(InterruptedException interrupted){Thread.currentThread().interrupt();}
        catch(IOException unavailable){retry(claim);}
        catch(RuntimeException failure){
            LoggerFactory.getLogger(MarketWorker.class).warn("Market job temporarily failed job={}",claim.jobId());
            jobs.retry(claim);
        }
    }

    private void retry(JobQueue.Claim claim){
        if(claim.attempts()>=3)jobs.reject(claim,"PROVIDER_REQUEST_FAILED");
        else jobs.retry(claim);
    }

    @Scheduled(fixedDelay=3600000)
    void expire(){prices.expireYahoo();}
}
