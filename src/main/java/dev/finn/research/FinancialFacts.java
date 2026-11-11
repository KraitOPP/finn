
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FinancialFacts {
    record Dimensions(String metric,String basis,String periodKind,LocalDate periodStart,LocalDate periodEnd,String unit,String currency) {}
    record Operand(UUID factId,int revision) {}
    record Fact(UUID factId,UUID companyId,int revision,Dimensions dimensions,String amount,String scale,String normalizedAmount,
                String origin,UUID anchorId,String sourceTitle,int documentRevision,String publishedAt,String reviewedAt,List<Operand> operands) {}
    record Page(List<Fact> items,boolean hasMore) {}
    record History(List<Fact> items) {}
    record Comparison(String state,String reason,Fact current,Fact previous,String change,String percentChange) {}
    private record Value(UUID anchor,String amount,FactPolicy.Scale scale,String normalized,String origin,Operand a,Operand b,String publishedAt) {}

    private static final String SELECT="""
            SELECT f.company_id,f.metric,f.basis,f.period_kind,f.period_start,f.period_end,f.unit,f.currency,
                v.*,s.title AS source_title,x.document_revision
            FROM finn.financial_fact f JOIN finn.financial_fact_version v USING(owner_id,fact_id)
            JOIN finn.research_anchor a ON a.owner_id=v.owner_id AND a.anchor_id=v.anchor_id
            JOIN finn.research_extraction x ON x.owner_id=a.owner_id AND x.extraction_id=a.extraction_id
            JOIN finn.source_document_version s ON s.owner_id=x.owner_id AND s.document_id=x.document_id AND s.revision=x.document_revision
            """;

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ResearchEvidence evidence;

    FinancialFacts(JdbcTemplate jdbc,CurrentUser users,ResearchEvidence evidence){this.jdbc=jdbc;this.users=users;this.evidence=evidence;}

    @Transactional public Page list(UUID company,int offset){return listFor(users.requireId(),company,offset);}

    Page listFor(UUID owner,UUID company,int offset){
        requireCompany(owner,company);
        var rows=jdbc.query(SELECT+"""
                WHERE f.owner_id=? AND f.company_id=? AND v.revision=f.revision
                ORDER BY f.period_end DESC,f.metric,f.fact_id LIMIT 51 OFFSET ?
                """,FinancialFacts::row,owner,company,offset);
        return new Page(rows.stream().limit(50).toList(),rows.size()>50);
    }

    List<Fact> reviewedAt(UUID owner,UUID company,UUID anchor){
        return jdbc.query(SELECT+"""
                WHERE f.owner_id=? AND f.company_id=? AND v.revision=f.revision AND v.anchor_id=?
                ORDER BY f.period_end DESC,f.metric,f.fact_id LIMIT 12
                """,FinancialFacts::row,owner,company,anchor);
    }

    @Transactional public History versions(UUID id){
        UUID owner=users.requireId();
        require(owner,id,null);
        return new History(jdbc.query(SELECT+" WHERE f.owner_id=? AND f.fact_id=? ORDER BY v.revision DESC LIMIT 50",FinancialFacts::row,owner,id));
    }

    @Transactional public Fact reported(UUID company,UUID id,Integer revision,Dimensions dimensions,UUID anchor,String amount,String scale){
        UUID owner=users.requireId();
        var location=evidence.require(owner,anchor);
        if(!location.companyId().equals(company))throw ApiFailure.notFound();
        var multiplier=FactPolicy.Scale.valueOf(scale);
        FactPolicy.validate(dimensions,multiplier);
        var number=new BigDecimal(amount);
        if(!FactPolicy.containsAmount(location.quote(),number))throw new ApiFailure(422,"EVIDENCE_VALUE_MISMATCH");
        var value=new Value(anchor,FactPolicy.decimal(number),multiplier,FactPolicy.decimal(multiplier.normalize(number)),"REPORTED",null,null,location.publishedAt());
        return save(owner,company,id,revision,dimensions,value);
    }

    @Transactional public Fact derive(UUID company,UUID existing,Integer expected,Operand cashFlow,Operand capex){
        UUID owner=users.requireId();
        var incoming=require(owner,cashFlow.factId(),cashFlow.revision());
        var outgoing=require(owner,capex.factId(),capex.revision());
        var a=incoming.dimensions();var b=outgoing.dimensions();
        if(!incoming.companyId().equals(company)||!outgoing.companyId().equals(company))throw ApiFailure.notFound();
        var expense=new BigDecimal(outgoing.normalizedAmount());
        if(!a.metric().equals("CASH_FROM_OPERATIONS")||!b.metric().equals("CAPITAL_EXPENDITURE")||!FactPolicy.compatible(a,b)
                ||!a.periodStart().equals(b.periodStart())||!a.periodEnd().equals(b.periodEnd())||expense.signum()<0)
            throw new ApiFailure(422,"INCOMPATIBLE_FACT_INPUTS");
        var dimensions=new Dimensions("FREE_CASH_FLOW",a.basis(),a.periodKind(),a.periodStart(),a.periodEnd(),a.unit(),a.currency());
        String amount=FactPolicy.decimal(new BigDecimal(incoming.normalizedAmount()).subtract(expense));
        String published=latestPublication(incoming.publishedAt(),outgoing.publishedAt());
        return save(owner,company,existing,expected,dimensions,new Value(incoming.anchorId(),amount,FactPolicy.Scale.ONES,amount,"DERIVED",cashFlow,capex,published));
    }

    @Transactional public Comparison compare(UUID id,UUID previous){
        UUID owner=users.requireId();
        var current=require(owner,id,null);
        var prior=require(owner,previous,null);
        var a=current.dimensions();var b=prior.dimensions();
        if(!current.companyId().equals(prior.companyId())||!FactPolicy.sameSeries(a,b))
            return new Comparison("INCOMPARABLE","DIFFERENT_REPORTING_BASIS",current,prior,null,null);
        if(!FactPolicy.comparablePeriods(a,b))
            return new Comparison("INCOMPARABLE","DIFFERENT_OR_OVERLAPPING_PERIODS",current,prior,null,null);
        var baseline=new BigDecimal(prior.normalizedAmount());
        var change=new BigDecimal(current.normalizedAmount()).subtract(baseline);
        String percent=baseline.signum()>0&& !a.unit().equals("PERCENT")
                ? FactPolicy.decimal(change.movePointRight(2).divide(baseline,6,RoundingMode.HALF_EVEN)) : null;
        String reason=a.unit().equals("PERCENT")?"PERCENTAGE_POINTS":baseline.signum()<=0?"NON_POSITIVE_BASE":null;
        return new Comparison("COMPARABLE",reason,current,prior,FactPolicy.decimal(change),percent);
    }

    @Transactional public History comparables(UUID id){
        UUID owner=users.requireId();
        var current=require(owner,id,null);
        var d=current.dimensions();
        var prior=jdbc.query(SELECT+"""
                WHERE f.owner_id=? AND f.company_id=? AND f.metric=? AND f.basis=? AND f.period_kind=? AND f.unit=?
                  AND f.currency IS NOT DISTINCT FROM CAST(? AS char(3)) AND f.period_end<? AND v.revision=f.revision
                ORDER BY f.period_end DESC,f.fact_id LIMIT 50
                """,FinancialFacts::row,owner,current.companyId(),d.metric(),d.basis(),d.periodKind(),d.unit(),d.currency(),d.periodStart());
        return new History(prior.stream().filter(candidate->FactPolicy.comparablePeriods(d,candidate.dimensions())).toList());
    }

    Fact require(UUID owner,UUID id,Integer revision){
        return jdbc.query(SELECT+" WHERE f.owner_id=? AND f.fact_id=? AND v.revision="+(revision==null?"f.revision":"?"),
                FinancialFacts::row,revision==null?new Object[]{owner,id}:new Object[]{owner,id,revision})
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    void requireCompany(UUID owner,UUID company){
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM finn.company WHERE owner_id=? AND company_id=?)",
                Boolean.class,owner,company)))throw ApiFailure.notFound();
    }

    private Fact save(UUID owner,UUID company,UUID id,Integer expected,Dimensions dimensions,Value value){
        if((id==null)!=(expected==null))throw ApiFailure.invalid();
        Fact current=id==null?byDimensions(owner,company,dimensions):require(owner,id,null);
        int next;
        if(current==null){
            if(jdbc.queryForObject("SELECT count(*) FROM finn.financial_fact WHERE owner_id=?",Integer.class,owner)>=1500)
                throw new ApiFailure(429,"FINANCIAL_FACT_LIMIT");
            id=UUID.randomUUID();next=1;
            jdbc.update("""
                    INSERT INTO finn.financial_fact(owner_id,fact_id,company_id,metric,basis,period_kind,period_start,period_end,unit,currency,revision)
                    VALUES (?,?,?,?,?,?,?,?,?,?,1)
                    """,owner,id,company,dimensions.metric(),dimensions.basis(),dimensions.periodKind(),dimensions.periodStart(),dimensions.periodEnd(),dimensions.unit(),dimensions.currency());
        }else{
            if(!current.companyId().equals(company)||!current.dimensions().equals(dimensions))throw ApiFailure.conflict();
            boolean identical=current.anchorId().equals(value.anchor())&&current.amount().equals(value.amount())&&current.scale().equals(value.scale().name())
                    &&current.origin().equals(value.origin())&&current.operands().equals(value.a()==null?List.of():List.of(value.a(),value.b()));
            if(identical)return current;
            if(expected==null||current.revision()!=expected)throw new ApiFailure(409,"FINANCIAL_FACT_REVISION_REQUIRED");
            if(expected>=50)throw new ApiFailure(429,"FINANCIAL_FACT_VERSION_LIMIT");
            next=expected+1;
            if(jdbc.update("UPDATE finn.financial_fact SET revision=? WHERE owner_id=? AND fact_id=? AND revision=?",next,owner,id,expected)!=1)
                throw ApiFailure.conflict();
        }
        jdbc.update("""
                INSERT INTO finn.financial_fact_version(owner_id,fact_id,revision,anchor_id,amount,amount_scale,normalized_amount,origin,
                    operand_a,operand_a_revision,operand_b,operand_b_revision,published_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,owner,id,next,value.anchor(),new BigDecimal(value.amount()),value.scale().name(),new BigDecimal(value.normalized()),value.origin(),
                value.a()==null?null:value.a().factId(),value.a()==null?null:value.a().revision(),
                value.b()==null?null:value.b().factId(),value.b()==null?null:value.b().revision(),
                value.publishedAt()==null?null:OffsetDateTime.parse(value.publishedAt()));
        return require(owner,id,next);
    }

    private static String latestPublication(String left,String right) {
        if(left==null||right==null)return null;
        return OffsetDateTime.parse(left).isAfter(OffsetDateTime.parse(right))?left:right;
    }

    private Fact byDimensions(UUID owner,UUID company,Dimensions d){
        return jdbc.query(SELECT+"""
                WHERE f.owner_id=? AND f.company_id=? AND f.metric=? AND f.basis=? AND f.period_kind=?
                 AND f.period_start=? AND f.period_end=? AND f.unit=? AND f.currency IS NOT DISTINCT FROM CAST(? AS char(3))
                 AND v.revision=f.revision
                """,FinancialFacts::row,owner,company,d.metric(),d.basis(),d.periodKind(),d.periodStart(),d.periodEnd(),d.unit(),d.currency())
                .stream().findFirst().orElse(null);
    }

    private static Fact row(ResultSet row,int ignored)throws SQLException{
        var dimensions=new Dimensions(row.getString("metric"),row.getString("basis"),row.getString("period_kind"),
                row.getObject("period_start",LocalDate.class),row.getObject("period_end",LocalDate.class),row.getString("unit"),row.getString("currency"));
        var a=row.getObject("operand_a",UUID.class);
        List<Operand> operands=a==null?List.of():List.of(new Operand(a,row.getInt("operand_a_revision")),
                new Operand(row.getObject("operand_b",UUID.class),row.getInt("operand_b_revision")));
        return new Fact(row.getObject("fact_id",UUID.class),row.getObject("company_id",UUID.class),row.getInt("revision"),dimensions,
                FactPolicy.decimal(row.getBigDecimal("amount")),row.getString("amount_scale"),FactPolicy.decimal(row.getBigDecimal("normalized_amount")),
                row.getString("origin"),row.getObject("anchor_id",UUID.class),row.getString("source_title"),row.getInt("document_revision"),
                SourceDocuments.instant(row,"published_at"),SourceDocuments.instant(row,"reviewed_at"),operands);
    }
}
