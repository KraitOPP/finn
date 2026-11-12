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
        if(target.periodEnd().isAfter(cutoff))return new Match("PERIOD_OPEN",null);
        var fact=facts.byDimensions(owner,company,target);
        if(fact==null){
            boolean similar=Boolean.TRUE.equals(jdbc.queryForObject("""
                    SELECT EXISTS(SELECT 1 FROM finn.financial_fact WHERE owner_id=? AND company_id=? AND metric=?
                       AND period_end=?)
                    """,Boolean.class,owner,company,target.metric(),target.periodEnd()));
            return new Match(similar?"DIMENSIONS_MISMATCH":"FACT_MISSING",null);
        }
        String reason=usable(owner,fact,cutoff);
        return new Match(reason,fact);
    }

    private String usable(UUID owner,FinancialFacts.Fact fact,LocalDate cutoff) {
        if(fact.publishedAt()==null)return "PUBLICATION_UNKNOWN";
        var published=OffsetDateTime.parse(fact.publishedAt()).atZoneSameInstant(FactPolicy.INDIA).toLocalDate();
        if(published.isAfter(cutoff))return "PUBLISHED_AFTER_CUTOFF";
        if(published.isBefore(fact.dimensions().periodEnd()))return "PERIOD_PUBLICATION_INVALID";
        boolean current=Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT d.revision=x.document_revision FROM finn.research_anchor a
                JOIN finn.research_extraction x USING(owner_id,extraction_id)
                JOIN finn.source_document d USING(owner_id,document_id)
                WHERE a.owner_id=? AND a.anchor_id=?
                """,Boolean.class,owner,fact.anchorId()));
        if(!current)return "SOURCE_REVISED";
        for(var operand:fact.operands()){
            var latest=facts.require(owner,operand.factId(),null);
            if(latest.revision()!=operand.revision()||!usable(owner,latest,cutoff).equals("COMPARABLE_FACT"))
                return "DERIVATION_REVIEW_REQUIRED";
        }
        return "COMPARABLE_FACT";
    }
}
