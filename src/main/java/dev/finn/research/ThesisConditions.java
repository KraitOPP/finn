package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class ThesisConditions {
    record Definition(UUID conditionId,int thesisRevision,String label,FinancialFacts.Dimensions dimensions,
                      String comparator,String threshold,String scale,boolean retired) {}
    record Check(UUID checkId,int thesisRevision,String state,String reason,FinancialFacts.Fact fact,String evaluatedAt) {}
    record Condition(Definition definition,Check lastCheck) {}
    record ListView(List<Condition> items) {}
    private record StoredCheck(UUID id,int revision,String state,String reason,UUID factId,Integer factRevision,String evaluatedAt) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final InvestmentTheses theses;
    private final FinancialFacts facts;
    private final FactEvaluation evaluation;
    private final JsonMapper json;

    ThesisConditions(JdbcTemplate jdbc,CurrentUser users,InvestmentTheses theses,FinancialFacts facts,FactEvaluation evaluation,JsonMapper json){
        this.jdbc=jdbc;this.users=users;this.theses=theses;this.facts=facts;this.evaluation=evaluation;this.json=json;
    }

    @Transactional public ListView list(UUID thesis){
        UUID owner=users.requireId();
        theses.root(owner,thesis);
        return list(owner,thesis);
    }

    ListView list(UUID owner,UUID thesis){
        var definitions=jdbc.query("SELECT * FROM finn.thesis_condition WHERE owner_id=? AND thesis_id=? ORDER BY retired,created_at,condition_id",
                this::definition,owner,thesis);
        return new ListView(definitions.stream().map(definition->new Condition(definition,latest(owner,definition.conditionId()))).toList());
    }

    @Transactional public Condition add(UUID thesis,ThesisConditionsController.Input input){
        UUID owner=users.requireId();
        var root=theses.root(owner,thesis);
        if(root.revision()!=input.expectedRevision()||theses.version(owner,thesis,root.revision()).decision().equals("CLOSE"))throw ApiFailure.conflict();
        var dimensions=input.dimensions().value();
        FactPolicy.validateTarget(dimensions,FactPolicy.Scale.valueOf(input.scale()));
        int count=jdbc.queryForObject("SELECT count(*) FROM finn.thesis_condition WHERE owner_id=? AND thesis_id=?",Integer.class,owner,thesis);
        if(count>=20)throw new ApiFailure(429,"THESIS_CONDITION_LIMIT");
        UUID id=UUID.randomUUID();
        jdbc.update("""
                INSERT INTO finn.thesis_condition(condition_id,owner_id,thesis_id,thesis_revision,label,dimensions,comparator,threshold,scale)
                VALUES (?,?,?,?,?,?::jsonb,?,?,?)
                """,id,owner,thesis,root.revision(),input.label().strip(),json.writeValueAsString(dimensions),input.comparator(),
                FactPolicy.parseAmount(input.threshold()),input.scale());
        return new Condition(require(owner,thesis,id),null);
    }

    @Transactional public Condition retire(UUID thesis,UUID condition){
        UUID owner=users.requireId();
        require(owner,thesis,condition);
        jdbc.update("UPDATE finn.thesis_condition SET retired=true WHERE owner_id=? AND thesis_id=? AND condition_id=?",owner,thesis,condition);
        return new Condition(require(owner,thesis,condition),latest(owner,condition));
    }

    @Transactional public ListView check(UUID thesis){
        UUID owner=users.requireId();
        var root=theses.root(owner,thesis);
        if(theses.version(owner,thesis,root.revision()).decision().equals("CLOSE"))throw ApiFailure.conflict();
        var definitions=jdbc.query("""
                SELECT * FROM finn.thesis_condition WHERE owner_id=? AND thesis_id=? AND NOT retired ORDER BY created_at,condition_id
                """,this::definition,owner,thesis);
        var today=LocalDate.now(FactPolicy.INDIA);
        return new ListView(definitions.stream().map(definition->evaluate(owner,root,definition,today)).toList());
    }

    private Condition evaluate(UUID owner,InvestmentTheses.Root thesis,Definition definition,LocalDate today){
        var match=evaluation.match(owner,thesis.company(),definition.dimensions(),today);
        var fact=match.fact();
        String state=switch(match.reason()){
            case "COMPARABLE_FACT" -> matches(definition,fact)?"MATCHED":"VIOLATED";
            case "PERIOD_OPEN","FACT_MISSING" -> "UNKNOWN";
            default -> "REVIEW_NEEDED";
        };
        String input=thesis.revision()+"|"+state+"|"+match.reason()+"|"+(fact==null?"":fact.factId()+"|"+fact.revision());
        String key=SourceDocuments.checksum(input);
        var stored=jdbc.query("""
                INSERT INTO finn.thesis_condition_check(check_id,owner_id,condition_id,thesis_id,thesis_revision,input_key,state,reason,fact_id,fact_revision)
                VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(owner_id,condition_id,input_key) DO NOTHING RETURNING *
                """,ThesisConditions::row,UUID.randomUUID(),owner,definition.conditionId(),thesis.id(),thesis.revision(),key,state,match.reason(),
                fact==null?null:fact.factId(),fact==null?null:fact.revision()).stream().findFirst().orElseGet(()->jdbc.queryForObject("""
                SELECT * FROM finn.thesis_condition_check WHERE owner_id=? AND condition_id=? AND input_key=?
                """,ThesisConditions::row,owner,definition.conditionId(),key));
        return new Condition(definition,view(stored,fact));
    }

    private static boolean matches(Definition definition,FinancialFacts.Fact fact){
        var target=FactPolicy.Scale.valueOf(definition.scale()).normalize(new BigDecimal(definition.threshold()));
        int comparison=new BigDecimal(fact.normalizedAmount()).compareTo(target);
        return definition.comparator().equals("GTE")?comparison>=0:comparison<=0;
    }

    private Check latest(UUID owner,UUID condition){
        return jdbc.query("SELECT * FROM finn.thesis_condition_check WHERE owner_id=? AND condition_id=? ORDER BY evaluated_at DESC,check_id LIMIT 1",
                ThesisConditions::row,owner,condition).stream().findFirst()
                .map(check->view(check,check.factId()==null?null:facts.require(owner,check.factId(),check.factRevision()))).orElse(null);
    }

    private static Check view(StoredCheck check,FinancialFacts.Fact fact){
        return new Check(check.id(),check.revision(),check.state(),check.reason(),fact,check.evaluatedAt());
    }

    private Definition require(UUID owner,UUID thesis,UUID id){
        return jdbc.query("SELECT * FROM finn.thesis_condition WHERE owner_id=? AND thesis_id=? AND condition_id=?",
                this::definition,owner,thesis,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private Definition definition(ResultSet row,int index)throws SQLException{
        return new Definition(row.getObject("condition_id",UUID.class),row.getInt("thesis_revision"),row.getString("label"),
                json.readValue(row.getString("dimensions"),FinancialFacts.Dimensions.class),row.getString("comparator"),
                FactPolicy.decimal(row.getBigDecimal("threshold")),row.getString("scale"),row.getBoolean("retired"));
    }

    private static StoredCheck row(ResultSet row,int index)throws SQLException{
        return new StoredCheck(row.getObject("check_id",UUID.class),row.getInt("thesis_revision"),row.getString("state"),row.getString("reason"),
                row.getObject("fact_id",UUID.class),row.getObject("fact_revision",Integer.class),
                row.getObject("evaluated_at",OffsetDateTime.class).toInstant().toString());
    }
}
