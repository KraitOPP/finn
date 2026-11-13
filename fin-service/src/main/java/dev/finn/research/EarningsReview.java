package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EarningsReview {
    enum Basis { CONSOLIDATED, STANDALONE }
    enum Period { QUARTER, FULL_YEAR }
    enum Kind { SEGMENT, CONSENSUS }
    enum Currency { INR, USD, EUR, GBP, JPY }
    record PeriodDates(LocalDate start,LocalDate end) {}
    record Change(FinancialFacts.Fact previous,String difference,String percent,String unit) {}
    record Metric(FinancialFacts.Fact actual,Change yearOverYear,Change quarterOverQuarter) {}
    record Input(UUID inputId, Kind kind, String label, FactPolicy.Metric metric, Currency currency, String amount,
                 FactPolicy.Scale scale, String normalized, UUID anchorId, String sourceUrl, String publishedAt) {}
    record Segment(Input actual, Input previous, String difference, String percent) {}
    record Expectation(Input estimate, FinancialFacts.Fact actual, String difference, String percent, String result) {}
    record Report(Basis basis,Period kind,Currency currency,PeriodDates current,PeriodDates previousYear,PeriodDates previousQuarter,
                  List<Metric> metrics,List<Segment> segments,List<Expectation> expectations,List<ManagementGuidance.Version> guidance,
                  boolean truncated) {}
    private static final Set<String> SEGMENT_METRICS=Set.of("REVENUE","OPERATING_PROFIT");
    private static final Set<String> ESTIMATE_METRICS=Set.of("REVENUE","OPERATING_PROFIT","PROFIT_AFTER_TAX","EPS_BASIC");

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final FinancialFacts facts;
    private final FactEvaluation evaluation;
    private final ResearchEvidence evidence;
    private final ManagementGuidance guidance;

    EarningsReview(JdbcTemplate jdbc,CurrentUser users,FinancialFacts facts,FactEvaluation evaluation,ResearchEvidence evidence,
                   ManagementGuidance guidance) {
        this.jdbc=jdbc;this.users=users;this.facts=facts;this.evaluation=evaluation;this.evidence=evidence;
        this.guidance=guidance;
    }

    @Transactional
    public Report report(UUID company,Basis basis,Period kind,Currency currency,LocalDate periodEnd) {
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        var today=LocalDate.now(FactPolicy.INDIA);
        var through=periodEnd==null?today:periodEnd;
        if(through.isAfter(today)||through.isBefore(LocalDate.of(1900,1,1)))throw ApiFailure.invalid();
        var all=facts.forResults(owner,company,basis.name(),kind.name(),LocalDate.of(1900,1,1),through);
        var candidates=all.stream().limit(300)
                .filter(row->row.dimensions().unit().equals("PERCENT")||currency.name().equals(row.dimensions().currency())).toList();
        var periods=candidates.stream().filter(row->row.dimensions().periodKind().equals(kind.name()))
                .map(EarningsReview::dates).distinct().toList();
        var current=periods.stream().filter(period->periodEnd==null||period.end().equals(periodEnd)).findFirst().orElse(null);
        if(current==null)return new Report(basis,kind,currency,null,null,null,List.of(),List.of(),List.of(),List.of(),all.size()>300);
        // Find the same fiscal slot a year earlier. A week of drift accommodates week-based reports.
        var year=periods.stream().filter(period->near(period.start(),current.start().minusYears(1))
                &&near(period.end(),current.end().minusYears(1))&&period.end().isBefore(current.start())).findFirst().orElse(null);
        var quarter=kind==Period.QUARTER?periods.stream()
                .filter(period->period.end().plusDays(1).equals(current.start())).findFirst().orElse(null):null;
        var eligible=candidates.stream().filter(row->applies(row,current)||applies(row,year)||applies(row,quarter))
                .filter(row->evaluation.usable(owner,row,today,false).equals("COMPARABLE_FACT")).toList();
        Map<String,FinancialFacts.Fact> actuals=at(eligible,current);
        var yearFacts=at(eligible,year);
        var quarterFacts=at(eligible,quarter);
        var metrics=actuals.values().stream().map(row->new Metric(row,change(row,yearFacts.get(row.dimensions().metric())),
                change(row,quarterFacts.get(row.dimensions().metric())))).toList();

        var currentInputs=inputs(owner,company,basis,kind,currency,current);
        var priorInputs=inputs(owner,company,basis,kind,currency,year==null
                ? new PeriodDates(current.start().minusYears(1),current.end().minusYears(1)) : year);
        var segments=segments(currentInputs,priorInputs);
        var expectations=expectations(currentInputs,actuals);
        var statements=guidance.atPeriod(owner,company,basis.name(),current.start(),current.end()).stream()
                .filter(item->item.dimensions().currency()==null||item.dimensions().currency().equals(currency.name())).toList();
        return new Report(basis,kind,currency,current,year,quarter,metrics,segments,expectations,statements,
                all.size()>300||currentInputs.size()>50||priorInputs.size()>50);
    }

    @Transactional
    public Input add(UUID company,EarningsReviewController.Reviewed input){
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        var metric=input.metric();
        var kind=input.kind();
        if(!(kind==Kind.SEGMENT?SEGMENT_METRICS:ESTIMATE_METRICS).contains(metric.name()))throw ApiFailure.invalid();
        var dimensions=new FinancialFacts.Dimensions(metric.name(),input.basis().name(),input.periodKind().name(),
                input.periodStart(),input.periodEnd(),metric.unit(),input.currency().name());
        FactPolicy.validate(dimensions,input.scale());
        var amount=FactPolicy.parseAmount(input.amount());
        var label=Catalogue.cleanName(input.label());
        OffsetDateTime published;
        String url=null;
        if(kind==Kind.SEGMENT){
            if(input.anchorId()==null||input.sourceUrl()!=null||input.publishedAt()!=null)throw ApiFailure.invalid();
            var location=evidence.require(owner,input.anchorId());
            if(!company.equals(location.companyId()))throw ApiFailure.notFound();
            if(location.publishedAt()==null||!FactPolicy.containsAmount(location.quote(),amount))
                throw new ApiFailure(422,"EVIDENCE_VALUE_MISMATCH");
            published=OffsetDateTime.parse(location.publishedAt());
            if(published.atZoneSameInstant(FactPolicy.INDIA).toLocalDate().isBefore(input.periodEnd()))throw ApiFailure.invalid();
        }else{
            if(input.anchorId()!=null||input.sourceUrl()==null||input.publishedAt()==null)throw ApiFailure.invalid();
            url=SourceDocuments.publicLink(input.sourceUrl());
            try{published=OffsetDateTime.ofInstant(Instant.parse(input.publishedAt()),ZoneOffset.UTC);}
            catch(DateTimeException invalid){throw ApiFailure.invalid();}
            if(published.toInstant().isAfter(Instant.now())||published.toLocalDate().isBefore(input.periodStart()))throw ApiFailure.invalid();
        }
        var normalized=input.scale().normalize(amount);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.earnings_input WHERE owner_id=?",Integer.class,owner)>=500)
            throw new ApiFailure(429,"EARNINGS_INPUT_LIMIT");
        return jdbc.query("""
                INSERT INTO finn.earnings_input(owner_id,company_id,basis,period_kind,period_start,period_end,kind,label,
                    metric,currency,normalized_amount,reported_amount,amount_scale,anchor_id,source_url,published_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING *
                """,(row,i)->readInput(row),owner,company,input.basis().name(),input.periodKind().name(),input.periodStart(),
                input.periodEnd(),kind.name(),label,metric.name(),input.currency().name(),normalized,amount,input.scale().name(),
                input.anchorId(),url,published).stream().findFirst().orElseThrow(ApiFailure::conflict);
    }

    private List<Input> inputs(UUID owner,UUID company,Basis basis,Period kind,Currency currency,PeriodDates period){
        if(period==null)return List.of();
        return jdbc.query("""
                SELECT e.* FROM finn.earnings_input e
                WHERE e.owner_id=? AND e.company_id=? AND e.basis=? AND e.period_kind=? AND e.currency=?
                    AND e.period_start=? AND e.period_end=?
                    AND (e.kind='CONSENSUS' OR EXISTS (
                        SELECT 1 FROM finn.research_anchor a JOIN finn.research_extraction x USING(owner_id,extraction_id)
                        JOIN finn.source_document d USING(owner_id,document_id)
                        WHERE a.owner_id=e.owner_id AND a.anchor_id=e.anchor_id AND d.revision=x.document_revision))
                ORDER BY e.published_at DESC,e.input_id LIMIT 51
                """,(row,i)->readInput(row),owner,company,basis.name(),kind.name(),currency.name(),period.start(),period.end());
    }

    private static Input readInput(ResultSet row)throws SQLException{
        return new Input(row.getObject("input_id",UUID.class),Kind.valueOf(row.getString("kind")),row.getString("label"),
                FactPolicy.Metric.valueOf(row.getString("metric")),Currency.valueOf(row.getString("currency")),
                FactPolicy.decimal(row.getBigDecimal("reported_amount")),FactPolicy.Scale.valueOf(row.getString("amount_scale")),
                FactPolicy.decimal(row.getBigDecimal("normalized_amount")),row.getObject("anchor_id",UUID.class),
                row.getString("source_url"),SourceDocuments.instant(row,"published_at"));
    }

    private static List<Segment> segments(List<Input> current,List<Input> previous){
        var baseline=bySegment(previous);
        return bySegment(current).values().stream().map(input->{
            var earlier=baseline.get(segmentKey(input));
            if(earlier==null)return new Segment(input,null,null,null);
            var difference=new BigDecimal(input.normalized()).subtract(new BigDecimal(earlier.normalized()));
            return new Segment(input,earlier,FactPolicy.decimal(difference),percent(difference,new BigDecimal(earlier.normalized())));
        }).limit(40).toList();
    }

    private static Map<String,Input> bySegment(List<Input> extras){
        Map<String,Input> rows=new LinkedHashMap<>();
        for(var input:extras)if(input.kind()==Kind.SEGMENT)rows.putIfAbsent(segmentKey(input),input);
        return rows;
    }
    private static String segmentKey(Input row){return row.metric().name()+"|"+CompanyEvents.normalize(row.label());}

    private static List<Expectation> expectations(List<Input> extras,Map<String,FinancialFacts.Fact> actuals){
        var comparisons=new LinkedHashMap<FactPolicy.Metric,Expectation>();
        for(var input:extras){
            if(input.kind()!=Kind.CONSENSUS||comparisons.containsKey(input.metric()))continue;
            var actual=actuals.get(input.metric().name());
            if(actual==null||!Instant.parse(input.publishedAt()).isBefore(Instant.parse(actual.publishedAt())))continue;
            var estimate=new BigDecimal(input.normalized());
            var difference=new BigDecimal(actual.normalizedAmount()).subtract(estimate);
            comparisons.put(input.metric(),new Expectation(input,actual,FactPolicy.decimal(difference),percent(difference,estimate),
                    difference.signum()==0?"MET":difference.signum()>0?"ABOVE":"BELOW"));
        }
        return List.copyOf(comparisons.values());
    }

    private static Map<String,FinancialFacts.Fact> at(List<FinancialFacts.Fact> rows,PeriodDates period){
        Map<String,FinancialFacts.Fact> found=new LinkedHashMap<>();
        for(var row:rows)if(applies(row,period))found.putIfAbsent(row.dimensions().metric(),row);
        return found;
    }
    private static Change change(FinancialFacts.Fact actual,FinancialFacts.Fact previous){
        if(previous==null)return null;
        var compared=FinancialFacts.compare(actual,previous);
        return !"COMPARABLE".equals(compared.state())?null:new Change(previous,compared.change(),compared.percentChange(),actual.dimensions().unit());
    }
    private static String percent(BigDecimal difference,BigDecimal baseline){
        return baseline.signum()<=0?null:FactPolicy.decimal(difference.movePointRight(2).divide(baseline,6,RoundingMode.HALF_EVEN));
    }
    private static boolean applies(FinancialFacts.Fact row,PeriodDates period){
        return period!=null&&row.dimensions().periodEnd().equals(period.end())
                &&(row.dimensions().periodKind().equals("AS_OF")||row.dimensions().periodStart().equals(period.start()));
    }
    private static PeriodDates dates(FinancialFacts.Fact row){return new PeriodDates(row.dimensions().periodStart(),row.dimensions().periodEnd());}
    private static boolean near(LocalDate actual,LocalDate expected){return Math.abs(ChronoUnit.DAYS.between(actual,expected))<=7;}
}
