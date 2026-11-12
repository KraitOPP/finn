package dev.finn.research;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class FactEvaluation {
    record Match(String reason,FinancialFacts.Fact fact) {
        boolean ready(){return reason.equals("COMPARABLE_FACT");}
    }

    private final JdbcTemplate jdbc;
    private final FinancialFacts facts;

    FactEvaluation(JdbcTemplate jdbc,FinancialFacts facts){this.jdbc=jdbc;this.facts=facts;}

    Match match(UUID owner,UUID company,FinancialFacts.Dimensions target,LocalDate cutoff) {
        return match(owner,company,target,cutoff,false);
    }

    Match matchAsPublished(UUID owner,UUID company,FinancialFacts.Dimensions target,LocalDate cutoff) {
        return match(owner,company,target,cutoff,true);
    }

    private Match match(UUID owner,UUID company,FinancialFacts.Dimensions target,LocalDate cutoff,boolean historical) {
        if(target.periodEnd().isAfter(cutoff))return new Match("PERIOD_OPEN",null);
        var latest=facts.byDimensions(owner,company,target);
        var fact=historical?facts.byDimensionsAsOf(owner,company,target,endOf(cutoff)):latest;
        if(historical&&latest!=null&&(fact==null||latest.publishedAt()==null&&latest.revision()>fact.revision()))fact=latest;
        if(fact==null){
            boolean similar=Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM finn.financial_fact f JOIN finn.financial_fact_version v USING(owner_id,fact_id)
                       WHERE f.owner_id=? AND f.company_id=? AND f.metric=? AND f.period_end=?
                         AND (?::timestamptz IS NULL OR v.published_at<?))
                    """,Boolean.class,owner,company,target.metric(),target.periodEnd(),historical?endOf(cutoff):null,historical?endOf(cutoff):null));
            return new Match(similar?"DIMENSIONS_MISMATCH":"FACT_MISSING",null);
        }
        String reason=usable(owner,fact,cutoff,historical);
        return new Match(reason,fact);
    }

    FinancialFacts.Fact interim(UUID owner,UUID company,FinancialFacts.Dimensions target,LocalDate cutoff){
        if(!target.periodKind().equals("FULL_YEAR"))return null;
        var dates=jdbc.query("""
                SELECT period_end FROM finn.financial_fact WHERE owner_id=? AND company_id=? AND metric=? AND basis=?
                   AND unit=? AND currency IS NOT DISTINCT FROM CAST(? AS char(3)) AND period_kind='YTD'
                   AND period_start=? AND period_end<? AND period_end<=? ORDER BY period_end DESC LIMIT 12
                """,(row,i)->row.getObject("period_end",LocalDate.class),owner,company,target.metric(),target.basis(),target.unit(),
                target.currency(),target.periodStart(),target.periodEnd(),cutoff);
        for(LocalDate end:dates){
            var dimensions=new FinancialFacts.Dimensions(target.metric(),target.basis(),"YTD",target.periodStart(),end,target.unit(),target.currency());
            var match=matchAsPublished(owner,company,dimensions,cutoff);
            if(match.ready())return match.fact();
        }
        return null;
    }

    private String usable(UUID owner,FinancialFacts.Fact fact,LocalDate cutoff,boolean historical) {
        if(fact.publishedAt()==null)return "PUBLICATION_UNKNOWN";
        var published=OffsetDateTime.parse(fact.publishedAt()).atZoneSameInstant(FactPolicy.INDIA).toLocalDate();
        if(published.isAfter(cutoff))return "PUBLISHED_AFTER_CUTOFF";
        if(published.isBefore(fact.dimensions().periodEnd()))return "PERIOD_PUBLICATION_INVALID";
        boolean current=historical?sourceUnrevisedAsOf(owner,fact.anchorId(),endOf(cutoff)):Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT d.revision=x.document_revision FROM finn.research_anchor a
                JOIN finn.research_extraction x USING(owner_id,extraction_id)
                JOIN finn.source_document d USING(owner_id,document_id)
                WHERE a.owner_id=? AND a.anchor_id=?
                """,Boolean.class,owner,fact.anchorId()));
        if(!current)return "SOURCE_REVISED";
        for(var operand:fact.operands()){
            var saved=facts.require(owner,operand.factId(),operand.revision());
            var latest=historical?facts.byDimensionsAsOf(owner,saved.companyId(),saved.dimensions(),endOf(cutoff)):
                    facts.require(owner,operand.factId(),null);
            if(latest==null||latest.revision()!=operand.revision()||!usable(owner,saved,cutoff,historical).equals("COMPARABLE_FACT"))
                return "DERIVATION_REVIEW_REQUIRED";
        }
        return "COMPARABLE_FACT";
    }

    private boolean sourceUnrevisedAsOf(UUID owner,UUID anchor,OffsetDateTime until){
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT NOT EXISTS(SELECT 1 FROM finn.source_document_version later
                  WHERE later.owner_id=x.owner_id AND later.document_id=x.document_id AND later.revision>x.document_revision
                    AND (later.published_at IS NULL OR later.published_at<?))
                FROM finn.research_anchor a JOIN finn.research_extraction x USING(owner_id,extraction_id)
                WHERE a.owner_id=? AND a.anchor_id=?
                """,Boolean.class,until,owner,anchor));
    }

    private static OffsetDateTime endOf(LocalDate cutoff){
        return cutoff.plusDays(1).atStartOfDay(FactPolicy.INDIA).toOffsetDateTime();
    }
}
