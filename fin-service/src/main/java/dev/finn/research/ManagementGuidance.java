package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class ManagementGuidance {
    record Version(UUID guidanceId,UUID companyId,int revision,String title,String kind,String stage,LocalDate statementDate,
                   String publishedAt,FinancialFacts.Dimensions dimensions,String lower,String upper,String scale,String caveats,
                   UUID anchorId,String savedAt) {}
    record Versions(List<Version> items) {}
    record Candidates(ResearchEvidence.Location evidence,List<String> printedNumbers) {}
    private static final String SELECT="""
            SELECT g.company_id,v.* FROM finn.management_guidance g JOIN finn.management_guidance_version v USING(owner_id,guidance_id)
            """;

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ResearchEvidence evidence;
    private final FinancialFacts facts;
    private final JsonMapper json;

    ManagementGuidance(JdbcTemplate jdbc,CurrentUser users,ResearchEvidence evidence,FinancialFacts facts,JsonMapper json) {
        this.jdbc=jdbc;this.users=users;this.evidence=evidence;this.facts=facts;this.json=json;
    }

    @Transactional public Candidates candidates(UUID anchor) {
        var location=evidence.require(users.requireId(),anchor);
        return new Candidates(location,FactPolicy.printedNumbers(location.quote()));
    }

    @Transactional public Versions list(UUID company){
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        return new Versions(jdbc.query(SELECT+"""
                WHERE g.owner_id=? AND g.company_id=? AND v.revision=g.revision ORDER BY v.statement_date DESC NULLS LAST,v.saved_at DESC,g.guidance_id
                """,this::row,owner,company));
    }

    List<Version> atPeriod(UUID owner,UUID company,String basis,LocalDate start,LocalDate end){
        return jdbc.query(SELECT+"""
                WHERE g.owner_id=? AND g.company_id=? AND v.revision=g.revision AND v.stage<>'DRAFT'
                    AND v.dimensions->>'basis'=? AND v.dimensions->>'periodStart'=? AND v.dimensions->>'periodEnd'=?
                ORDER BY v.statement_date DESC,g.guidance_id LIMIT 6
                """,this::row,owner,company,basis,start.toString(),end.toString());
    }

    @Transactional public Versions versions(UUID id){
        UUID owner=users.requireId();
        current(owner,id);
        return new Versions(jdbc.query(SELECT+" WHERE g.owner_id=? AND g.guidance_id=? ORDER BY v.revision DESC",this::row,owner,id));
    }

    @Transactional public Version create(UUID company,GuidanceController.Input input){
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.management_guidance WHERE owner_id=? AND company_id=?",Integer.class,owner,company)>=30
                ||jdbc.queryForObject("SELECT count(*) FROM finn.management_guidance WHERE owner_id=?",Integer.class,owner)>=200)
            throw new ApiFailure(429,"GUIDANCE_LIMIT");
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.management_guidance(guidance_id,owner_id,company_id,revision) VALUES (?,?,?,1)",id,owner,company);
        return append(owner,company,id,1,input,null);
    }

    @Transactional public Version revise(UUID id,int expected,GuidanceController.Input input){
        UUID owner=users.requireId();
        var previous=current(owner,id);
        if(previous.revision()!=expected||expected>=50)throw ApiFailure.conflict();
        jdbc.update("UPDATE finn.management_guidance SET revision=revision+1 WHERE owner_id=? AND guidance_id=?",owner,id);
        return append(owner,previous.companyId(),id,expected+1,input,previous);
    }

    Version current(UUID owner,UUID id){
        return jdbc.query(SELECT+" WHERE g.owner_id=? AND g.guidance_id=? AND v.revision=g.revision",this::row,owner,id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    Version version(UUID owner,UUID id,int revision){
        return jdbc.query(SELECT+" WHERE g.owner_id=? AND g.guidance_id=? AND v.revision=?",this::row,owner,id,revision)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    List<Version> confirmedAfter(UUID owner,UUID id,int revision){
        return jdbc.query(SELECT+" WHERE g.owner_id=? AND g.guidance_id=? AND v.revision>? AND v.stage<>'DRAFT' ORDER BY v.revision DESC",
                this::row,owner,id,revision);
    }

    private Version append(UUID owner,UUID company,UUID id,int revision,GuidanceController.Input input,Version previous) {
        var location=evidence.require(owner,input.anchorId());
        if(!location.companyId().equals(company))throw ApiFailure.notFound();
        var published=location.publishedAt()==null?null:OffsetDateTime.parse(location.publishedAt());
        var publishedDate=published==null?null:published.atZoneSameInstant(FactPolicy.INDIA).toLocalDate();
        var day=input.statementDate();
        var today=LocalDate.now(FactPolicy.INDIA);
        if(day!=null&&(day.isBefore(LocalDate.of(1900,1,1))||day.isAfter(today)||publishedDate!=null&&day.isAfter(publishedDate)))
            throw ApiFailure.invalid();
        var dimensions=input.dimensions()==null?null:input.dimensions().value();
        var scale=FactPolicy.Scale.valueOf(input.scale());
        BigDecimal low=input.lower()==null||input.lower().isNull()?null:FactPolicy.parseAmount(input.lower());
        BigDecimal high=input.upper()==null||input.upper().isNull()?null:FactPolicy.parseAmount(input.upper());
        if(dimensions!=null)FactPolicy.validateTarget(dimensions,scale);
        if(low!=null&&high!=null&&low.compareTo(high)>0)throw ApiFailure.invalid();
        boolean qualitative=input.kind().equals("QUALITATIVE");
        if(qualitative&&(dimensions!=null||low!=null||high!=null||scale!=FactPolicy.Scale.ONES))throw ApiFailure.invalid();
        if(!input.stage().equals("DRAFT")){
            if(day==null||publishedDate==null||publishedDate.isAfter(today))throw new ApiFailure(422,"GUIDANCE_DATE_UNVERIFIED");
            if(previous!=null&&previous.statementDate()!=null&&day.isBefore(previous.statementDate()))throw ApiFailure.invalid();
            if(input.stage().equals("WITHDRAWN")){
                if(previous==null||!previous.stage().equals("CONFIRMED")||input.caveats().isBlank()
                        ||location.anchorId().equals(previous.anchorId())||!sameTarget(previous,input,dimensions,low,high))
                    throw ApiFailure.invalid();
            }else if(!qualitative){
                boolean bounds=switch(input.kind()){
                    case "AT_LEAST" -> low!=null&&high==null;
                    case "AT_MOST" -> low==null&&high!=null;
                    case "RANGE" -> low!=null&&high!=null;
                    default -> false;
                };
                if(dimensions==null||day.isAfter(dimensions.periodEnd())||!bounds
                        ||low!=null&&!FactPolicy.containsAmount(location.quote(),low)
                        ||high!=null&&!FactPolicy.containsAmount(location.quote(),high))
                    throw new ApiFailure(422,"GUIDANCE_EVIDENCE_REQUIRED");
            }
        }
        jdbc.update("""
                INSERT INTO finn.management_guidance_version(owner_id,guidance_id,revision,title,kind,stage,statement_date,published_at,
                    dimensions,lower_bound,upper_bound,scale,caveats,anchor_id) VALUES (?,?,?,?,?,?,?,?,?::jsonb,?,?,?,?,?)
                """,owner,id,revision,input.title().strip(),input.kind(),input.stage(),day,published,
                dimensions==null?null:json.writeValueAsString(dimensions),low,high,input.scale(),input.caveats().strip(),input.anchorId());
        return version(owner,id,revision);
    }

    private static boolean sameTarget(Version previous,GuidanceController.Input input,FinancialFacts.Dimensions dimensions,BigDecimal low,BigDecimal high){
        return previous.kind().equals(input.kind())&&Objects.equals(previous.dimensions(),dimensions)&&previous.scale().equals(input.scale())
                &&Objects.equals(previous.lower(),decimal(low))&&Objects.equals(previous.upper(),decimal(high));
    }

    private Version row(ResultSet row,int index)throws SQLException{
        String dimensions=row.getString("dimensions");
        return new Version(row.getObject("guidance_id",UUID.class),row.getObject("company_id",UUID.class),row.getInt("revision"),
                row.getString("title"),row.getString("kind"),row.getString("stage"),row.getObject("statement_date",LocalDate.class),
                SourceDocuments.instant(row,"published_at"),dimensions==null?null:json.readValue(dimensions,FinancialFacts.Dimensions.class),
                decimal(row.getBigDecimal("lower_bound")),decimal(row.getBigDecimal("upper_bound")),row.getString("scale"),
                row.getString("caveats"),row.getObject("anchor_id",UUID.class),SourceDocuments.instant(row,"saved_at"));
    }

    private static String decimal(BigDecimal amount){return amount==null?null:FactPolicy.decimal(amount);}
}
