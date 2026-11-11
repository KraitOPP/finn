package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.jobs.JobQueue;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ResearchReports {
    private static final String POLICY="lexical-excerpts-v1";
    record Report(UUID reportId,UUID companyId,String question,String asOf,String state,String modelName,String policyVersion,
                  List<ResearchEvidence.Location> citations,List<FinancialFacts.Fact> facts,Feedback feedback) {}
    record Feedback(String note,UUID anchorId,String recordedAt) {}
    record Root(UUID id,UUID owner,UUID company,String question,String asOf,String state,String model,String policy,String jobState) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final FinancialFacts facts;
    private final ResearchEvidence evidence;
    private final EvidenceSearch search;
    private final LocalEvidenceModel model;
    private final JobQueue jobs;

    ResearchReports(JdbcTemplate jdbc,CurrentUser users,FinancialFacts facts,ResearchEvidence evidence,
                    EvidenceSearch search,LocalEvidenceModel model,JobQueue jobs){
        this.jdbc=jdbc;this.users=users;this.facts=facts;this.evidence=evidence;this.search=search;this.model=model;this.jobs=jobs;
    }

    @Transactional public Report create(UUID company,String question,boolean rankLocally){
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.research_report WHERE owner_id=?",Integer.class,owner)>=500)
            throw ApiFailure.conflict();
        UUID id=UUID.randomUUID();
        var candidates=search.find(owner,company,question,6);
        var reviewed=candidates.stream().flatMap(location->facts.reviewedAt(owner,company,location.anchorId()).stream()).limit(12).toList();
        String state=candidates.isEmpty()?"INSUFFICIENT":conflicting(reviewed)?"CONFLICTING_CONTEXT":"EVIDENCE";
        String selectedModel=rankLocally?model.name():null;
        UUID job=null;
        if(rankLocally&&state.equals("EVIDENCE")){
            state="MODEL_FALLBACK";
            if(selectedModel!=null){
                int recent=jdbc.queryForObject("""
                        SELECT count(*) FROM finn.research_report WHERE owner_id=? AND job_id IS NOT NULL
                        AND as_of>clock_timestamp()-interval '1 hour'
                        """,Integer.class,owner);
                int active=jdbc.queryForObject("""
                        SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='RESEARCH_ANSWER' AND state IN ('QUEUED','RUNNING')
                        """,Integer.class,owner);
                if(recent<5&&active<2){
                    job=jobs.enqueue(owner,JobQueue.Kind.RESEARCH_ANSWER,id);
                    state="PENDING";
                }
            }
        }
        jdbc.update("""
                INSERT INTO finn.research_report(report_id,owner_id,company_id,question,policy_version,model_name,job_id,state)
                VALUES (?,?,?,?,?,?,?,?)
                """,id,owner,company,question.strip(),POLICY,selectedModel,job,state);
        for(int i=0;i<candidates.size();i++){
            jdbc.update("INSERT INTO finn.research_report_candidate(owner_id,report_id,anchor_id,candidate_order,selected_order) VALUES (?,?,?,?,?)",
                    owner,id,candidates.get(i).anchorId(),i+1,i<3?i+1:null);
        }
        for(int i=0;i<reviewed.size();i++){
            var fact=reviewed.get(i);
            jdbc.update("INSERT INTO finn.research_report_fact(owner_id,report_id,position,fact_id,revision) VALUES (?,?,?,?,?)",
                    owner,id,i+1,fact.factId(),fact.revision());
        }
        return view(root(owner,id));
    }

    @Transactional public Report read(UUID id){return view(root(users.requireId(),id));}

    @Transactional public Feedback feedback(UUID id,String note,UUID anchor){
        UUID owner=users.requireId();
        Root report=root(owner,id);
        if(report.state().equals("PENDING")&&!"FAILED".equals(report.jobState()))throw ApiFailure.conflict();
        if(anchor!=null&&!evidence.require(owner,anchor).companyId().equals(report.company()))throw ApiFailure.notFound();
        if(jdbc.update("""
                INSERT INTO finn.research_report_feedback(owner_id,report_id,note,anchor_id) VALUES (?,?,?,?) ON CONFLICT DO NOTHING
                """,owner,id,note.strip(),anchor)!=1)throw ApiFailure.conflict();
        return readFeedback(owner,id);
    }

    Root root(UUID owner,UUID id){
        return jdbc.query("""
                SELECT r.*,j.state AS job_state FROM finn.research_report r LEFT JOIN finn.app_job j ON j.owner_id=r.owner_id AND j.job_id=r.job_id
                WHERE r.owner_id=? AND r.report_id=?
                """,(row,i)->new Root(id,owner,row.getObject("company_id",UUID.class),row.getString("question"),
                instant(row,"as_of"),row.getString("state"),row.getString("model_name"),row.getString("policy_version"),
                row.getString("job_state")),owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    List<ResearchEvidence.Location> candidates(Root report){return locations(report,false);}

    @Transactional public void complete(JobQueue.Claim claim,List<UUID> selected){
        if(!jobs.succeed(claim))return;
        if(!selected.isEmpty()){
            jdbc.update("UPDATE finn.research_report_candidate SET selected_order=NULL WHERE owner_id=? AND report_id=?",claim.ownerId(),claim.resourceId());
            for(int i=0;i<selected.size();i++){
                if(jdbc.update("UPDATE finn.research_report_candidate SET selected_order=? WHERE owner_id=? AND report_id=? AND anchor_id=?",
                        i+1,claim.ownerId(),claim.resourceId(),selected.get(i))!=1)throw new IllegalStateException("Citation outside report scope.");
            }
        }
        jdbc.update("UPDATE finn.research_report SET state=? WHERE owner_id=? AND report_id=? AND state='PENDING'",
                selected.isEmpty()?"MODEL_FALLBACK":"LOCAL_RANKED",claim.ownerId(),claim.resourceId());
    }

    private Report view(Root report){
        String state=report.state();
        if(state.equals("PENDING")&&"FAILED".equals(report.jobState()))state="MODEL_FALLBACK";
        var citations=state.equals("PENDING")?List.<ResearchEvidence.Location>of():locations(report,true);
        var reviewed=jdbc.query("""
                SELECT fact_id,revision FROM finn.research_report_fact WHERE owner_id=? AND report_id=? ORDER BY position
                """,(row,i)->new FinancialFacts.Operand(row.getObject("fact_id",UUID.class),row.getInt("revision")),report.owner(),report.id());
        return new Report(report.id(),report.company(),report.question(),report.asOf(),state,report.model(),report.policy(),citations,
                reviewed.stream().map(ref->facts.require(report.owner(),ref.factId(),ref.revision())).toList(),readFeedback(report.owner(),report.id()));
    }

    private List<ResearchEvidence.Location> locations(Root report,boolean selected){
        String order=selected?" AND c.selected_order IS NOT NULL ORDER BY c.selected_order":" ORDER BY c.candidate_order";
        return jdbc.query(ResearchEvidence.SELECT_LOCATION+"""
                JOIN finn.research_report_candidate c ON c.owner_id=a.owner_id AND c.anchor_id=a.anchor_id
                WHERE c.owner_id=? AND c.report_id=?
                """+order,evidence::row,report.owner(),report.id());
    }

    private Feedback readFeedback(UUID owner,UUID id){
        return jdbc.query("SELECT * FROM finn.research_report_feedback WHERE owner_id=? AND report_id=?",
                (row,i)->new Feedback(row.getString("note"),row.getObject("anchor_id",UUID.class),instant(row,"recorded_at")),owner,id)
                .stream().findFirst().orElse(null);
    }

    static boolean conflicting(List<FinancialFacts.Fact> reviewed){
        for(var first:reviewed)for(var second:reviewed){
            var a=first.dimensions();
            var b=second.dimensions();
            if(a.metric().equals(b.metric())&&!a.periodEnd().isBefore(b.periodStart())&&!b.periodEnd().isBefore(a.periodStart())
                    &&(!a.basis().equals(b.basis())||!a.periodKind().equals(b.periodKind())||!a.unit().equals(b.unit())
                       ||!Objects.equals(a.currency(),b.currency())))return true;
        }
        return false;
    }

    private static String instant(ResultSet row,String column)throws SQLException{
        return row.getObject(column,OffsetDateTime.class).toInstant().toString();
    }
}
