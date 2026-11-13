package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class GuidanceDelivery {
    record Outcome(UUID guidanceId,int guidanceRevision,LocalDate asOf,String state,String reason,
                   FinancialFacts.Fact actual,ManagementGuidance.Version successor,Milestone milestone) {}
    record Milestone(UUID deliveryId,LocalDate actualDate,String publishedAt,UUID anchorId) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ManagementGuidance guidance;
    private final FactEvaluation evaluation;
    private final ResearchEvidence evidence;
    private final SourceDocuments sources;

    GuidanceDelivery(JdbcTemplate jdbc,CurrentUser users,ManagementGuidance guidance,FactEvaluation evaluation,
                     ResearchEvidence evidence,SourceDocuments sources){
        this.jdbc=jdbc;this.users=users;this.guidance=guidance;this.evaluation=evaluation;
        this.evidence=evidence;this.sources=sources;
    }

    @Transactional public Outcome compare(UUID id,int revision,LocalDate cutoff){
        UUID owner=users.requireId();
        var statement=guidance.version(owner,id,revision);
        LocalDate today=LocalDate.now(FactPolicy.INDIA);
        if(cutoff==null)cutoff=today;
        if(cutoff.isBefore(LocalDate.of(1900,1,1))||cutoff.isAfter(today))throw ApiFailure.invalid();
        return compare(owner,statement,cutoff);
    }

    @Transactional public Milestone recordCompletion(UUID id,int revision,LocalDate actual,UUID anchor){
        UUID owner=users.requireId();
        var statement=guidance.version(owner,id,revision);
        if(!statement.stage().equals("CONFIRMED")||statement.targetDate()==null)throw ApiFailure.invalid();
        var location=evidence.require(owner,anchor);
        if(!statement.companyId().equals(location.companyId()))throw ApiFailure.notFound();
        var source=sources.evidence(owner,location.documentId(),location.documentRevision()).source();
        var published=location.publishedAt()==null?null:OffsetDateTime.parse(location.publishedAt());
        var today=LocalDate.now(FactPolicy.INDIA);
        if(!source.sourceType().equals("PRIMARY")||published==null
                ||published.isBefore(OffsetDateTime.parse(statement.publishedAt()))
                ||published.atZoneSameInstant(FactPolicy.INDIA).toLocalDate().isAfter(today)
                ||anchor.equals(statement.anchorId())||actual.isBefore(statement.statementDate())
                ||actual.isAfter(published.atZoneSameInstant(FactPolicy.INDIA).toLocalDate()))
            throw new ApiFailure(422,"MILESTONE_EVIDENCE_REQUIRED");
        jdbc.update("""
                INSERT INTO finn.management_milestone_delivery(delivery_id,owner_id,guidance_id,guidance_revision,actual_date,published_at,anchor_id)
                VALUES (?,?,?,?,?,?,?) ON CONFLICT(owner_id,guidance_id,guidance_revision,anchor_id,actual_date) DO NOTHING
                """,UUID.randomUUID(),owner,id,revision,actual,published,anchor);
        return jdbc.queryForObject("""
                SELECT * FROM finn.management_milestone_delivery
                WHERE owner_id=? AND guidance_id=? AND guidance_revision=? AND anchor_id=? AND actual_date=?
                """,GuidanceDelivery::milestone,owner,id,revision,anchor,actual);
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
        if(statement.targetDate()!=null)return milestoneOutcome(owner,statement,cutoff);
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

    private Outcome milestoneOutcome(UUID owner,ManagementGuidance.Version statement,LocalDate cutoff){
        var actual=jdbc.query("""
                SELECT * FROM finn.management_milestone_delivery
                WHERE owner_id=? AND guidance_id=? AND guidance_revision=? AND published_at<?
                ORDER BY published_at DESC,saved_at DESC,delivery_id LIMIT 1
                """,GuidanceDelivery::milestone,owner,statement.guidanceId(),statement.revision(),
                cutoff.plusDays(1).atStartOfDay(FactPolicy.INDIA).toOffsetDateTime()).stream().findFirst().orElse(null);
        if(actual==null)return outcome(statement,cutoff,cutoff.isBefore(statement.targetDate())?"NOT_DUE":"INSUFFICIENT_EVIDENCE",
                "MILESTONE_UNVERIFIED",null,null);
        boolean onTime=!actual.actualDate().isAfter(statement.targetDate());
        return new Outcome(statement.guidanceId(),statement.revision(),cutoff,onTime?"MET":"MISSED",
                onTime?"MILESTONE_ON_TIME":"MILESTONE_LATE",null,null,actual);
    }

    Milestone savedMilestone(UUID owner,UUID delivery){
        return jdbc.queryForObject("SELECT * FROM finn.management_milestone_delivery WHERE owner_id=? AND delivery_id=?",
                GuidanceDelivery::milestone,owner,delivery);
    }

    private static Milestone milestone(ResultSet row,int index)throws SQLException{
        return new Milestone(row.getObject("delivery_id",UUID.class),row.getObject("actual_date",LocalDate.class),
                SourceDocuments.instant(row,"published_at"),row.getObject("anchor_id",UUID.class));
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
        return new Outcome(statement.guidanceId(),statement.revision(),cutoff,state,reason,actual,successor,null);
    }
}
