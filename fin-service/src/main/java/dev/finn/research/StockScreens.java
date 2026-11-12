package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class StockScreens {
    static final String METHOD="absolute-thresholds-v1";
    record Filter(DiscoveryUniverse.Metric metric,String comparator,String amount,String scale) {
        BigDecimal normalized(){return FactPolicy.Scale.valueOf(scale).normalize(new BigDecimal(amount));}
    }
    record Definition(String name,DiscoveryUniverse.Sector sector,DiscoveryUniverse.Period period,List<Filter> filters) {}
    record Version(UUID screenId,int revision,Definition definition,String savedAt) {}
    record Index(List<Version> items) {}
    record Summary(UUID runId,int revision,String createdAt) {}
    record History(List<Summary> items) {}
    record Check(Filter filter,String state,String reason,FinancialFacts.Fact fact) {}
    record Result(DiscoveryUniverse.Member member,String state,List<Check> checks) {}
    record Run(UUID runId,Version screen,String methodology,DiscoveryUniverse.Snapshot inputs,List<Result> results,String createdAt) {}
    record Stored(UUID id,UUID screen,int revision,String method,DiscoveryUniverse.Snapshot inputs,String createdAt) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final DiscoveryUniverse universe;
    private final JsonMapper json;

    StockScreens(JdbcTemplate jdbc,CurrentUser users,DiscoveryUniverse universe,JsonMapper json){
        this.jdbc=jdbc;this.users=users;this.universe=universe;this.json=json;
    }

    @Transactional public Index index(){
        UUID owner=users.requireId();
        return new Index(jdbc.query("""
                SELECT v.* FROM finn.discovery_screen s JOIN finn.discovery_screen_version v USING(owner_id,screen_id,revision)
                WHERE s.owner_id=? ORDER BY v.saved_at DESC,s.screen_id
                """,this::version,owner));
    }

    @Transactional public Index versions(UUID id){
        UUID owner=users.requireId();
        current(owner,id);
        return new Index(jdbc.query("SELECT * FROM finn.discovery_screen_version WHERE owner_id=? AND screen_id=? ORDER BY revision DESC",
                this::version,owner,id));
    }

    @Transactional public Version save(UUID id,Integer expected,StockScreenController.Input input){
        UUID owner=users.requireId();
        var definition=validate(input);
        int next=1;
        if(id==null){
            if(jdbc.queryForObject("SELECT count(*) FROM finn.discovery_screen WHERE owner_id=?",Integer.class,owner)>=30)
                throw new ApiFailure(429,"SCREEN_LIMIT");
            id=UUID.randomUUID();
            jdbc.update("INSERT INTO finn.discovery_screen(screen_id,owner_id,revision) VALUES (?,?,1)",id,owner);
        }else{
            int revision=current(owner,id);
            if(!Integer.valueOf(revision).equals(expected)||revision>=100)throw ApiFailure.conflict();
            next=revision+1;
            jdbc.update("UPDATE finn.discovery_screen SET revision=? WHERE owner_id=? AND screen_id=?",next,owner,id);
        }
        return jdbc.queryForObject("""
                INSERT INTO finn.discovery_screen_version(owner_id,screen_id,revision,definition) VALUES (?,?,?,?::jsonb) RETURNING *
                """,this::version,owner,id,next,json.writeValueAsString(definition));
    }

    @Transactional public Run run(UUID id,int revision,UUID key){
        UUID owner=users.requireId();
        var version=version(owner,id,revision);
        var old=jdbc.query("SELECT * FROM finn.discovery_screen_run WHERE owner_id=? AND request_id=?",this::stored,owner,key)
                .stream().findFirst().orElse(null);
        if(old!=null){
            if(!old.screen().equals(id)||old.revision()!=revision)throw ApiFailure.conflict();
            return view(version,old);
        }
        if(jdbc.queryForObject("SELECT count(*) FROM finn.discovery_screen_run WHERE owner_id=?",Integer.class,owner)>=100)
            throw new ApiFailure(429,"SCREEN_RUN_LIMIT");
        var snapshot=universe.capture(owner,version.definition().period());
        var stored=jdbc.queryForObject("""
                INSERT INTO finn.discovery_screen_run(run_id,owner_id,screen_id,revision,request_id,methodology,inputs)
                VALUES (?,?,?,?,?,?,?::jsonb) RETURNING *
                """,this::stored,UUID.randomUUID(),owner,id,revision,key,METHOD,json.writeValueAsString(snapshot));
        return view(version,stored);
    }

    @Transactional public Run read(UUID run){
        UUID owner=users.requireId();
        var stored=requireRun(owner,run);
        return view(version(owner,stored.screen(),stored.revision()),stored);
    }

    @Transactional public History history(UUID id){
        UUID owner=users.requireId();
        current(owner,id);
        return new History(jdbc.query("""
                SELECT run_id,revision,created_at FROM finn.discovery_screen_run WHERE owner_id=? AND screen_id=?
                ORDER BY created_at DESC,run_id
                """,(row,i)->new Summary(row.getObject("run_id",UUID.class),row.getInt("revision"),
                SourceDocuments.instant(row,"created_at")),owner,id));
    }

    Stored requireRun(UUID owner,UUID run){
        return jdbc.query("SELECT * FROM finn.discovery_screen_run WHERE owner_id=? AND run_id=?",this::stored,owner,run)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    Version version(UUID owner,UUID id,int revision){
        return jdbc.query("SELECT * FROM finn.discovery_screen_version WHERE owner_id=? AND screen_id=? AND revision=?",
                this::version,owner,id,revision).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private int current(UUID owner,UUID id){
        return jdbc.query("SELECT revision FROM finn.discovery_screen WHERE owner_id=? AND screen_id=?",
                (row,i)->row.getInt(1),owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private Run view(Version version,Stored stored){
        if(!stored.method().equals(METHOD))throw new IllegalStateException("Unsupported stored screen method");
        var results=stored.inputs().companies().stream().map(company->evaluate(version.definition(),company)).toList();
        return new Run(stored.id(),version,stored.method(),stored.inputs(),results,stored.createdAt());
    }

    private static Result evaluate(Definition definition,DiscoveryUniverse.Company company){
        if(definition.sector()!=company.member().sector())return new Result(company.member(),"OUTSIDE_SECTOR",List.of());
        var checks=definition.filters().stream().map(filter->check(company,filter)).toList();
        String state=checks.stream().anyMatch(check->check.state().equals("FAIL"))?"EXCLUDED":
                checks.stream().anyMatch(check->check.state().equals("UNKNOWN"))?"UNKNOWN":"MATCH";
        return new Result(company.member(),state,checks);
    }

    private static Check check(DiscoveryUniverse.Company company,Filter filter){
        var reading=company.readings().stream().filter(item->item.metric()==filter.metric()).findFirst().orElseThrow();
        if(reading.fact()==null)return new Check(filter,"UNKNOWN",reading.reason(),null);
        int order=new BigDecimal(reading.fact().normalizedAmount()).compareTo(filter.normalized());
        boolean passed=filter.comparator().equals("GTE")?order>=0:order<=0;
        return new Check(filter,passed?"PASS":"FAIL",reading.reason(),reading.fact());
    }

    private static Definition validate(StockScreenController.Input input){
        input.period().validate();
        var seen=new HashSet<String>();
        var filters=input.filters().stream().map(filter->{
            if(!filter.metric().eligible(input.sector())||!seen.add(filter.metric().name()+":"+filter.comparator()))
                throw new ApiFailure(422,"SCREEN_FILTER_INELIGIBLE");
            var scale=FactPolicy.Scale.valueOf(filter.scale());
            FactPolicy.validate(input.period().dimensions(filter.metric()),scale);
            return new Filter(filter.metric(),filter.comparator(),FactPolicy.decimal(FactPolicy.parseAmount(filter.amount())),scale.name());
        }).toList();
        return new Definition(Catalogue.cleanName(input.name()),input.sector(),input.period(),filters);
    }

    private Version version(ResultSet row,int ignored)throws SQLException{
        return new Version(row.getObject("screen_id",UUID.class),row.getInt("revision"),
                json.readValue(row.getString("definition"),Definition.class),SourceDocuments.instant(row,"saved_at"));
    }

    private Stored stored(ResultSet row,int ignored)throws SQLException{
        return new Stored(row.getObject("run_id",UUID.class),row.getObject("screen_id",UUID.class),row.getInt("revision"),
                row.getString("methodology"),json.readValue(row.getString("inputs"),DiscoveryUniverse.Snapshot.class),
                SourceDocuments.instant(row,"created_at"));
    }
}
