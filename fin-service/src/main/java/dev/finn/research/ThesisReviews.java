package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.monitoring.ActivityWriter;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ThesisReviews {
    record Summary(UUID reviewId,int thesisRevision,String eventTitle,String createdAt,boolean decided) {}
    record Index(List<CompanyEvents.Version> suggestions,List<Summary> items,boolean hasMore) {}
    record Decision(String action,String note,UUID anchorId,String decidedAt) {}
    record GuidanceLink(ManagementGuidance.Version statement,GuidanceDelivery.Outcome outcome) {}
    record View(UUID reviewId,InvestmentTheses.Version thesis,CompanyEvents.Version event,String relation,
                UUID anchorId,ThesisConditions.Check condition,GuidanceLink guidance,Decision decision,String createdAt) {}
    private record Stored(UUID id,UUID thesis,int revision,UUID event,String fingerprint,String relation,UUID anchor,
                          UUID check,UUID guidance,Integer guidanceRevision,String state,String reason,LocalDate asOf,
                          Integer successor,UUID fact,Integer factRevision,String createdAt) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final InvestmentTheses theses;
    private final CompanyEvents events;
    private final ResearchEvidence evidence;
    private final ThesisConditions conditions;
    private final ManagementGuidance guidance;
    private final GuidanceDelivery delivery;
    private final FinancialFacts facts;
    private final ActivityWriter activity;

    ThesisReviews(JdbcTemplate jdbc,CurrentUser users,InvestmentTheses theses,CompanyEvents events,ResearchEvidence evidence,
                  ThesisConditions conditions,ManagementGuidance guidance,GuidanceDelivery delivery,FinancialFacts facts,ActivityWriter activity){
        this.jdbc=jdbc;this.users=users;this.theses=theses;this.events=events;this.evidence=evidence;this.conditions=conditions;
        this.guidance=guidance;this.delivery=delivery;this.facts=facts;this.activity=activity;
    }

    @Transactional public Index list(UUID thesis,int offset,UUID selectedEvent){
        UUID owner=users.requireId();
        var root=theses.root(owner,thesis);
        var recent=events.listFor(owner,root.company(),0).items();
        var suggestions=new ArrayList<CompanyEvents.Version>();
        if(selectedEvent!=null){
            var event=events.evidence(owner,selectedEvent);
            if(event==null||!root.company().equals(event.companyId()))throw ApiFailure.notFound();
            suggestions.add(event);
        }
        recent.stream().filter(event->!event.versionId().equals(selectedEvent)).limit(10-suggestions.size()).forEach(suggestions::add);
        var rows=jdbc.query("""
                SELECT r.review_id,r.thesis_revision,r.created_at,e.title,d.review_id IS NOT NULL AS decided
                FROM finn.thesis_review_task r JOIN finn.company_event_version e USING(owner_id,event_version_id)
                LEFT JOIN finn.thesis_review_decision d USING(owner_id,review_id)
                WHERE r.owner_id=? AND r.thesis_id=?
                ORDER BY r.created_at DESC,r.review_id LIMIT 21 OFFSET ?
                """,(row,index)->new Summary(row.getObject("review_id",UUID.class),row.getInt("thesis_revision"),row.getString("title"),
                SourceDocuments.instant(row,"created_at"),row.getBoolean("decided")),owner,thesis,offset);
        return new Index(List.copyOf(suggestions),rows.stream().limit(20).toList(),rows.size()>20);
    }

    @Transactional public View create(UUID thesis,ThesisReviewController.Input input){
        UUID owner=users.requireId();
        var root=theses.root(owner,thesis);
        String fingerprint=SourceDocuments.checksum(input.toString());
        var prior=jdbc.query("""
                SELECT * FROM finn.thesis_review_task WHERE owner_id=? AND thesis_id=? AND thesis_revision=? AND event_version_id=?
                """,ThesisReviews::row,owner,thesis,input.expectedRevision(),input.eventVersionId()).stream().findFirst().orElse(null);
        if(prior!=null){
            if(!prior.fingerprint().equals(fingerprint))throw ApiFailure.conflict();
            return view(owner,prior);
        }
        if(root.revision()!=input.expectedRevision()||theses.version(owner,thesis,root.revision()).decision().equals("CLOSE"))
            throw ApiFailure.conflict();
        var event=events.evidence(owner,input.eventVersionId());
        if(event==null||!root.company().equals(event.companyId()))throw ApiFailure.notFound();
        if(input.anchorId()==null&&!input.relation().equals("CONTEXT"))throw ApiFailure.invalid();
        checkAnchor(owner,root.company(),input.anchorId());
        if(input.conditionCheckId()!=null&&conditions.checked(owner,thesis,input.conditionCheckId()).thesisRevision()!=root.revision())
            throw ApiFailure.conflict();
        var commitment=input.guidance()==null?null:guidance.version(owner,input.guidance().id(),input.guidance().revision());
        if(commitment!=null&&!root.company().equals(commitment.companyId()))throw ApiFailure.notFound();
        if(commitment!=null&&commitment.stage().equals("DRAFT"))throw ApiFailure.invalid();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.thesis_review_task WHERE owner_id=?",Integer.class,owner)>=500)
            throw new ApiFailure(429,"THESIS_REVIEW_LIMIT");

        var outcome=commitment==null?null:delivery.compare(owner,commitment,LocalDate.now(FactPolicy.INDIA));
        var actual=outcome==null?null:outcome.actual();
        UUID id=UUID.randomUUID();
        jdbc.update("""
                INSERT INTO finn.thesis_review_task(review_id,owner_id,thesis_id,thesis_revision,event_version_id,fingerprint,
                   relation,anchor_id,condition_check_id,guidance_id,guidance_revision,guidance_state,guidance_reason,guidance_as_of,
                   successor_revision,actual_fact_id,actual_fact_revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,id,owner,thesis,root.revision(),event.versionId(),fingerprint,input.relation(),input.anchorId(),input.conditionCheckId(),
                commitment==null?null:commitment.guidanceId(),commitment==null?null:commitment.revision(),outcome==null?null:outcome.state(),
                outcome==null?null:outcome.reason(),outcome==null?null:outcome.asOf(),outcome==null||outcome.successor()==null?null:outcome.successor().revision(),
                actual==null?null:actual.factId(),actual==null?null:actual.revision());
        activity.add(owner,ActivityWriter.Kind.THESIS_REVIEW,thesis,id.toString(),"Thesis review: "+event.title(),id,OffsetDateTime.now(ZoneOffset.UTC));
        return view(owner,require(owner,id));
    }

    @Transactional public View read(UUID id){
        UUID owner=users.requireId();
        return view(owner,require(owner,id));
    }

    @Transactional public View decide(UUID id,ThesisReviewController.DecisionInput input){
        UUID owner=users.requireId();
        var task=require(owner,id);
        var root=theses.root(owner,task.thesis());
        checkAnchor(owner,root.company(),input.anchorId());
        var previous=decision(owner,id);
        if(previous!=null){
            if(previous.action().equals(input.action())&&previous.note().equals(input.note().strip())
                    &&java.util.Objects.equals(previous.anchorId(),input.anchorId()))return view(owner,task);
            throw ApiFailure.conflict();
        }
        jdbc.update("INSERT INTO finn.thesis_review_decision(owner_id,review_id,action,note,anchor_id) VALUES (?,?,?,?,?)",
                owner,id,input.action(),input.note().strip(),input.anchorId());
        return view(owner,task);
    }

    private void checkAnchor(UUID owner,UUID company,UUID anchor){
        if(anchor!=null&&!evidence.require(owner,anchor).companyId().equals(company))throw ApiFailure.notFound();
    }

    private View view(UUID owner,Stored task){
        var checked=task.check()==null?null:conditions.checked(owner,task.thesis(),task.check());
        return new View(task.id(),theses.version(owner,task.thesis(),task.revision()),events.evidence(owner,task.event()),task.relation(),
                task.anchor(),checked,guidanceLink(owner,task),decision(owner,task.id()),task.createdAt());
    }

    private GuidanceLink guidanceLink(UUID owner,Stored task){
        if(task.guidance()==null)return null;
        var statement=guidance.version(owner,task.guidance(),task.guidanceRevision());
        var successor=task.successor()==null?null:guidance.version(owner,task.guidance(),task.successor());
        var actual=task.fact()==null?null:facts.require(owner,task.fact(),task.factRevision());
        return new GuidanceLink(statement,new GuidanceDelivery.Outcome(task.guidance(),task.guidanceRevision(),task.asOf(),
                task.state(),task.reason(),actual,successor));
    }

    private Decision decision(UUID owner,UUID id){
        return jdbc.query("SELECT * FROM finn.thesis_review_decision WHERE owner_id=? AND review_id=?",(row,index)->
                new Decision(row.getString("action"),row.getString("note"),row.getObject("anchor_id",UUID.class),SourceDocuments.instant(row,"decided_at")),
                owner,id).stream().findFirst().orElse(null);
    }

    private Stored require(UUID owner,UUID id){
        return jdbc.query("SELECT * FROM finn.thesis_review_task WHERE owner_id=? AND review_id=?",ThesisReviews::row,owner,id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Stored row(ResultSet row,int index)throws SQLException{
        return new Stored(row.getObject("review_id",UUID.class),row.getObject("thesis_id",UUID.class),row.getInt("thesis_revision"),
                row.getObject("event_version_id",UUID.class),row.getString("fingerprint"),row.getString("relation"),row.getObject("anchor_id",UUID.class),
                row.getObject("condition_check_id",UUID.class),row.getObject("guidance_id",UUID.class),row.getObject("guidance_revision",Integer.class),
                row.getString("guidance_state"),row.getString("guidance_reason"),row.getObject("guidance_as_of",LocalDate.class),
                row.getObject("successor_revision",Integer.class),row.getObject("actual_fact_id",UUID.class),row.getObject("actual_fact_revision",Integer.class),
                SourceDocuments.instant(row,"created_at"));
    }
}
