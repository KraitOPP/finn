package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.monitoring.ReviewReminders;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class InvestmentTheses {
    record ReviewSchedule(String scheduledLocal,String timeZone) {}
    record Version(UUID thesisId,UUID companyId,int revision,String title,String rationale,String risks,String milestones,
                   String decision,String decisionNote,ReviewSchedule review,UUID reminderId,List<UUID> anchorIds,String savedAt) {}
    record Versions(List<Version> items) {}
    record Root(UUID id,UUID company,int revision) {}

    private static final String SELECT="""
            SELECT t.company_id,v.*,ARRAY(SELECT e.anchor_id FROM finn.investment_thesis_evidence e
              WHERE e.owner_id=v.owner_id AND e.thesis_id=v.thesis_id AND e.revision=v.revision ORDER BY e.position) AS anchors
            FROM finn.investment_thesis t JOIN finn.investment_thesis_version v USING(owner_id,thesis_id)
            """;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ResearchEvidence evidence;
    private final FinancialFacts facts;
    private final ReviewReminders reminders;

    InvestmentTheses(JdbcTemplate jdbc,CurrentUser users,ResearchEvidence evidence,FinancialFacts facts,ReviewReminders reminders) {
        this.jdbc=jdbc;this.users=users;this.evidence=evidence;this.facts=facts;this.reminders=reminders;
    }

    @Transactional public Versions list(UUID company) {
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        return new Versions(jdbc.query(SELECT+"""
                WHERE t.owner_id=? AND t.company_id=? AND v.revision=t.revision ORDER BY v.saved_at DESC,t.thesis_id
                """,InvestmentTheses::row,owner,company));
    }

    @Transactional public Versions history(UUID id) {
        UUID owner=users.requireId();
        root(owner,id);
        return new Versions(jdbc.query(SELECT+" WHERE t.owner_id=? AND t.thesis_id=? ORDER BY v.revision DESC",
                InvestmentTheses::row,owner,id));
    }

    @Transactional public Version create(UUID company,InvestmentThesisController.Input input) {
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        int companyCount=jdbc.queryForObject("SELECT count(*) FROM finn.investment_thesis WHERE owner_id=? AND company_id=?",Integer.class,owner,company);
        int total=jdbc.queryForObject("SELECT count(*) FROM finn.investment_thesis WHERE owner_id=?",Integer.class,owner);
        if(companyCount>=12||total>=100)throw new ApiFailure(429,"THESIS_LIMIT");
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.investment_thesis(thesis_id,owner_id,company_id,revision) VALUES (?,?,?,1)",id,owner,company);
        return append(owner,company,id,1,input,null);
    }

    @Transactional public Version revise(UUID id,int expected,InvestmentThesisController.Input input) {
        UUID owner=users.requireId();
        var root=root(owner,id);
        if(root.revision()!=expected||expected>=100)throw ApiFailure.conflict();
        var previous=version(owner,id,expected);
        jdbc.update("UPDATE finn.investment_thesis SET revision=revision+1 WHERE owner_id=? AND thesis_id=?",owner,id);
        return append(owner,root.company(),id,expected+1,input,previous);
    }

    Root root(UUID owner,UUID id) {
        return jdbc.query("SELECT thesis_id,company_id,revision FROM finn.investment_thesis WHERE owner_id=? AND thesis_id=?",
                (r,i)->new Root(id,r.getObject("company_id",UUID.class),r.getInt("revision")),owner,id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    Version version(UUID owner,UUID id,int revision) {
        return jdbc.query(SELECT+" WHERE t.owner_id=? AND t.thesis_id=? AND v.revision=?",InvestmentTheses::row,owner,id,revision)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private Version append(UUID owner,UUID company,UUID id,int revision,InvestmentThesisController.Input input,Version previous) {
        List<UUID> anchors=input.anchorIds();
        if(anchors.stream().distinct().count()!=anchors.size())throw ApiFailure.invalid();
        for(UUID anchor:anchors)if(!company.equals(evidence.require(owner,anchor).companyId()))throw ApiFailure.notFound();
        if(!input.decision().equals("MONITOR")&&input.decisionNote().isBlank())throw ApiFailure.invalid();

        ReviewSchedule schedule=input.review()==null?null:new ReviewSchedule(input.review().scheduledLocal(),input.review().timeZone());
        if(input.decision().equals("CLOSE")&&schedule!=null)throw ApiFailure.invalid();
        UUID reminder=previous==null?null:previous.reminderId();
        if(previous==null||!Objects.equals(schedule,previous.review())||schedule!=null&&!input.title().strip().equals(previous.title())){
            reminder=reminders.syncThesisReview(reminder,"Review thesis: "+input.title().strip(),
                    schedule==null?null:schedule.scheduledLocal(),schedule==null?null:schedule.timeZone());
        }
        jdbc.update("""
                INSERT INTO finn.investment_thesis_version(owner_id,thesis_id,revision,title,rationale,risks,milestones,
                    decision,decision_note,review_local,review_zone,reminder_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                """,owner,id,revision,input.title().strip(),input.rationale().strip(),input.risks().strip(),input.milestones().strip(),
                input.decision(),input.decisionNote().strip(),schedule==null?null:schedule.scheduledLocal(),
                schedule==null?null:schedule.timeZone(),reminder);
        for(int index=0;index<anchors.size();index++){
            jdbc.update("INSERT INTO finn.investment_thesis_evidence(owner_id,thesis_id,revision,anchor_id,position) VALUES (?,?,?,?,?)",
                    owner,id,revision,anchors.get(index),index+1);
        }
        return version(owner,id,revision);
    }

    private static Version row(ResultSet row,int index)throws SQLException {
        String local=row.getString("review_local");
        var anchors=Arrays.asList((UUID[])row.getArray("anchors").getArray());
        return new Version(row.getObject("thesis_id",UUID.class),row.getObject("company_id",UUID.class),row.getInt("revision"),
                row.getString("title"),row.getString("rationale"),row.getString("risks"),row.getString("milestones"),
                row.getString("decision"),row.getString("decision_note"),local==null?null:new ReviewSchedule(local,row.getString("review_zone")),
                row.getObject("reminder_id",UUID.class),List.copyOf(anchors),row.getObject("saved_at",OffsetDateTime.class).toInstant().toString());
    }
}
