package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class GuidanceDelivery {
    record Outcome(UUID guidanceId,int guidanceRevision,LocalDate asOf,String state,String reason,
                   FinancialFacts.Fact actual,ManagementGuidance.Version successor) {}

    private final CurrentUser users;
    private final ManagementGuidance guidance;
    private final FactEvaluation evaluation;

    GuidanceDelivery(CurrentUser users,ManagementGuidance guidance,FactEvaluation evaluation){
        this.users=users;this.guidance=guidance;this.evaluation=evaluation;
    }

    @Transactional public Outcome compare(UUID id,int revision,LocalDate cutoff){
        UUID owner=users.requireId();
        var statement=guidance.version(owner,id,revision);
        LocalDate today=LocalDate.now(FactPolicy.INDIA);
        if(cutoff==null)cutoff=today;
        if(cutoff.isBefore(LocalDate.of(1900,1,1))||cutoff.isAfter(today))throw ApiFailure.invalid();
        return compare(owner,statement,cutoff);
    }

    Outcome compare(UUID owner,ManagementGuidance.Version statement,LocalDate cutoff){
        if(statement.stage().equals("DRAFT"))return outcome(statement,cutoff,"INSUFFICIENT_EVIDENCE","GUIDANCE_UNCONFIRMED",null,null);
        if(!publishedBy(statement,cutoff))return outcome(statement,cutoff,"INSUFFICIENT_EVIDENCE","GUIDANCE_NOT_PUBLISHED",null,null);

        var successor=guidance.confirmedAfter(owner,statement.guidanceId(),statement.revision()).stream()
                .filter(candidate->publishedBy(candidate,cutoff)).findFirst().orElse(null);
        if(successor!=null){
            boolean withdrawn=successor.stage().equals("WITHDRAWN");
            return outcome(statement,cutoff,withdrawn?"WITHDRAWN":"REVISED",withdrawn?"WITHDRAWAL_PUBLISHED":"REVISION_PUBLISHED",null,successor);
        }
        if(statement.stage().equals("WITHDRAWN"))return outcome(statement,cutoff,"WITHDRAWN","WITHDRAWAL_PUBLISHED",null,null);
        if(statement.kind().equals("QUALITATIVE"))return outcome(statement,cutoff,"INSUFFICIENT_EVIDENCE","QUALITATIVE_STATEMENT",null,null);

        var match=evaluation.matchAsPublished(owner,statement.companyId(),statement.dimensions(),cutoff);
        if(match.ready()){
            var actual=match.fact();
            if(OffsetDateTime.parse(actual.publishedAt()).isBefore(OffsetDateTime.parse(statement.publishedAt())))
                return outcome(statement,cutoff,"INSUFFICIENT_EVIDENCE","OUTCOME_PREDATES_GUIDANCE",null,null);
            boolean met=meets(statement,new BigDecimal(actual.normalizedAmount()));
            return outcome(statement,cutoff,met?"MET":"MISSED","COMPARABLE_FACT",actual,null);
        }
        var interim=evaluation.interim(owner,statement.companyId(),statement.dimensions(),cutoff);
        if(interim!=null&&!OffsetDateTime.parse(interim.publishedAt()).isBefore(OffsetDateTime.parse(statement.publishedAt())))
            return outcome(statement,cutoff,"PARTIAL","INTERIM_YTD_ONLY",interim,null);
        return outcome(statement,cutoff,match.reason().equals("PERIOD_OPEN")?"NOT_DUE":"INSUFFICIENT_EVIDENCE",match.reason(),null,null);
    }

    private static boolean meets(ManagementGuidance.Version statement,BigDecimal amount){
        var scale=FactPolicy.Scale.valueOf(statement.scale());
        return (statement.lower()==null||amount.compareTo(scale.normalize(new BigDecimal(statement.lower())))>=0)
                &&(statement.upper()==null||amount.compareTo(scale.normalize(new BigDecimal(statement.upper())))<=0);
    }

    private static boolean publishedBy(ManagementGuidance.Version value,LocalDate cutoff){
        return value.statementDate()!=null&&!value.statementDate().isAfter(cutoff)&&value.publishedAt()!=null
                &&!OffsetDateTime.parse(value.publishedAt()).atZoneSameInstant(FactPolicy.INDIA).toLocalDate().isAfter(cutoff);
    }

    private static Outcome outcome(ManagementGuidance.Version statement,LocalDate cutoff,String state,String reason,
                                   FinancialFacts.Fact actual,ManagementGuidance.Version successor){
        return new Outcome(statement.guidanceId(),statement.revision(),cutoff,state,reason,actual,successor);
    }
}
