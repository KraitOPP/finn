package dev.finn.research;

import java.util.UUID;
import java.time.Instant;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@ConditionalOnProperty(name="finn.filings.kafka.enabled",havingValue="true")
class ReviewedEventProcessor {
    static final class InvalidMessage extends RuntimeException {}
    enum Consumer { ALERTS, RADAR, THESIS;
        String label(){return name().toLowerCase(java.util.Locale.ROOT);}
    }
    enum Outcome { PROCESSED, DUPLICATE, SKIPPED }
    record Result(Outcome outcome,Instant occurredAt) {}

    private final JdbcTemplate jdbc;
    private final ReviewedEventOutbox outbox;
    private final CompanyEvents events;
    private final FinancialFacts facts;
    private final FilingRules rules;
    private final ResearchAlerts alerts;
    private final ThesisConditions theses;
    private final RadarFilings radar;

    ReviewedEventProcessor(JdbcTemplate jdbc,ReviewedEventOutbox outbox,CompanyEvents events,FinancialFacts facts,
                           FilingRules rules,ResearchAlerts alerts,ThesisConditions theses,RadarFilings radar){
        this.jdbc=jdbc;
        this.outbox=outbox;
        this.events=events;
        this.facts=facts;
        this.rules=rules;
        this.alerts=alerts;
        this.theses=theses;
        this.radar=radar;
    }

    @Transactional public Result process(Consumer consumer,String key,UUID id){
        var message=outbox.find(id);
        if(message==null||!message.partitionKey().equals(key))throw new InvalidMessage();
        if((consumer==Consumer.RADAR&&message.filing()==null)||(consumer==Consumer.THESIS&&message.fact()==null))
            return new Result(Outcome.SKIPPED,message.occurredAt());
        // Serialize alert evaluation with the owner's rule and filing edits.
        if(consumer==Consumer.ALERTS)jdbc.query("SELECT 1 FROM finn.app_user WHERE user_id=? FOR NO KEY UPDATE",row->{},message.owner());
        boolean claimed=outbox.claim(consumer.label(),id);
        if(!claimed&&consumer!=Consumer.RADAR)return new Result(Outcome.DUPLICATE,message.occurredAt());

        if(message.filing()!=null){
            var filing=events.evidence(message.owner(),message.filing());
            if(filing==null||!message.company().equals(filing.companyId()))throw new InvalidMessage();
            if(consumer==Consumer.RADAR){
                radar.project(message.owner(),filing,outbox.processedAt(consumer.label(),id));
            }else{
                rules.onEvent(message.owner(),filing,events.current(message.owner(),filing.eventId()).revision()==filing.revision());
                alerts.onEvent(new CompanyEvents.Reviewed(message.owner(),filing));
            }
        }else{
            var fact=facts.require(message.owner(),message.fact(),message.factRevision());
            if(!message.company().equals(fact.companyId()))throw new InvalidMessage();
            var review=new FinancialFacts.Reviewed(message.owner(),fact);
            if(consumer==Consumer.THESIS)theses.onReviewedFact(review);
            else alerts.onResults(review);
        }
        return new Result(claimed?Outcome.PROCESSED:Outcome.DUPLICATE,message.occurredAt());
    }
}
