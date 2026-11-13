package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.monitoring.ActivityWriter;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ResearchAlerts {
    public record Match(String companyName,UUID companyId,String title,String reason,CompanyEvents.Version event,List<UUID> anchors) {}
    record Rule(UUID ruleId,boolean enabled,AlertLanguage.Preview preview) {}
    record Index(List<Rule> items) {}
    private record Due(UUID owner,UUID rule,AlertLanguage.Cadence cadence) {}
    private record Pending(UUID id,UUID company,UUID eventVersion,UUID revenue,int revenueRevision,UUID previousRevenue,
                           int previousRevenueRevision,UUID margin,int marginRevision,UUID previousMargin,int previousMarginRevision) {}
    private record Proof(UUID company,String title,String reason,CompanyEvents.Version event,FinancialFacts.Fact revenue,
                         FinancialFacts.Fact previousRevenue,FinancialFacts.Fact margin,FinancialFacts.Fact previousMargin,String fingerprint) {}

    private static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final AttentionInbox attention;
    private final ActivityWriter activity;
    private final FinancialFacts facts;
    private final FactEvaluation evaluation;
    private final CompanyEvents events;

    ResearchAlerts(JdbcTemplate jdbc,CurrentUser users,AttentionInbox attention,ActivityWriter activity,
                   FinancialFacts facts,FactEvaluation evaluation,CompanyEvents events){
        this.jdbc=jdbc;this.users=users;this.attention=attention;this.activity=activity;
        this.facts=facts;this.evaluation=evaluation;this.events=events;
    }

    @Transactional public Index index(){return new Index(rules(users.requireId(),false));}

    @Transactional public Rule activate(String sentence,AlertLanguage.Cadence cadence,AlertLanguage.Criteria confirmed){
        UUID owner=users.requireId();
        var preview=AlertLanguage.interpret(sentence,cadence);
        if(!preview.criteria().equals(confirmed))throw ApiFailure.conflict();
        var c=preview.criteria();
        var fingerprint=SourceDocuments.checksum(c.toString());
        var existing=jdbc.query("SELECT * FROM finn.research_alert_rule WHERE owner_id=? AND fingerprint=?",
                ResearchAlerts::rule,owner,fingerprint).stream().findFirst().orElse(null);
        if(existing!=null)return enable(owner,existing.ruleId(),true);
        if(rules(owner,false).size()>=20)throw new ApiFailure(429,"RESEARCH_ALERT_LIMIT");
        return jdbc.query("""
                INSERT INTO finn.research_alert_rule(owner_id,sentence,rule_kind,scope,event_type,growth_percent,cadence,fingerprint)
                VALUES (?,?,?,?,?,?,?,?) RETURNING *
                """,ResearchAlerts::rule,owner,preview.sentence(),c.kind().name(),c.scope().name(),
                c.eventType()==null?null:c.eventType().name(),c.growthPercent()==null?null:new BigDecimal(c.growthPercent()),
                c.cadence().name(),fingerprint).getFirst();
    }

    @Transactional public Rule enable(UUID id,boolean enabled){return enable(users.requireId(),id,enabled);}

    private Rule enable(UUID owner,UUID id,boolean enabled){
        var changed=jdbc.query("UPDATE finn.research_alert_rule SET enabled=? WHERE owner_id=? AND rule_id=? RETURNING *",
                ResearchAlerts::rule,enabled,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(!enabled){
            activity.suppressPending(owner,ActivityWriter.Kind.RESEARCH_ALERT,id);
            jdbc.update("DELETE FROM finn.research_alert_match WHERE owner_id=? AND rule_id=? AND activity_id IS NULL",owner,id);
        }
        return changed;
    }

    @EventListener void onEvent(CompanyEvents.Reviewed reviewed){
        UUID owner=reviewed.owner();
        var event=reviewed.event();
        boolean correction=event.novelty().equals("CORRECTION")||event.stage().equals("CANCELLED");
        var rules=rules(owner,true).stream().filter(rule->rule.preview().criteria().kind()==AlertLanguage.Kind.EVENT
                &&(correction||rule.preview().criteria().eventType().name().equals(event.subtype()))).toList();
        if(rules.isEmpty()||event.novelty().equals("ROUTINE")||muted(owner,event.eventId()))return;
        if(!correction&&event.subtype().equals("ORDER")&&!event.materiality().equals("HIGH"))return;
        var current=Instant.now();
        var scopes=relevance(owner,event.companyId(),rules,current.atZone(INDIA).toLocalDate());
        String semantic=semantic(event);
        for(var rule:rules){
            if(!scopes.contains(rule.preview().criteria().scope()))continue;
            if(correction&&!previousMatch(owner,rule.ruleId(),event.eventId()))continue;
            var key=SourceDocuments.checksum(correction?semantic+"|correction|"+event.versionId():semantic);
            String title=(correction?"Correction · ":"")+event.title();
            String reason=correction?"A previously matched company event was corrected or cancelled.":rule.preview().summary();
            save(owner,rule,new Proof(event.companyId(),title,reason,event,null,null,null,null,key),current);
        }
    }

    @EventListener void onResults(FinancialFacts.Reviewed reviewed){
        UUID owner=reviewed.owner();
        var changed=reviewed.fact();
        var changedPeriod=changed.dimensions();
        if(!Set.of("REVENUE","OPERATING_MARGIN").contains(changedPeriod.metric())||!changedPeriod.basis().equals("CONSOLIDATED")
                ||!changedPeriod.periodKind().equals("QUARTER")||changedPeriod.currency()!=null&&!changedPeriod.currency().equals("INR"))return;
        var enabled=rules(owner,true).stream().filter(rule->rule.preview().criteria().kind()==AlertLanguage.Kind.REVENUE_MARGIN).toList();
        if(enabled.isEmpty())return;
        var now=Instant.now();
        var today=now.atZone(INDIA).toLocalDate();
        var scopes=relevance(owner,changed.companyId(),enabled,today);
        // A late prior-year input can complete the latest quarterly comparison.
        var d=facts.forResults(owner,changed.companyId(),"CONSOLIDATED","QUARTER",today.minusYears(2),today).stream()
                .map(FinancialFacts.Fact::dimensions)
                .filter(period->period.metric().equals("REVENUE")&&"INR".equals(period.currency()))
                .findFirst().orElse(null);
        if(d==null)return;
        var revenue=fact(owner,changed.companyId(),d,"REVENUE",0,today);
        var prior=fact(owner,changed.companyId(),d,"REVENUE",1,today);
        var margin=fact(owner,changed.companyId(),d,"OPERATING_MARGIN",0,today);
        var priorMargin=fact(owner,changed.companyId(),d,"OPERATING_MARGIN",1,today);
        if(revenue==null||prior==null||margin==null||priorMargin==null)return;
        var growth=FinancialFacts.compare(revenue,prior);
        var marginChange=FinancialFacts.compare(margin,priorMargin);
        if(growth.percentChange()==null||marginChange.change()==null||new BigDecimal(marginChange.change()).signum()<=0)return;
        var base=new BigDecimal(prior.normalizedAmount());
        var increase=new BigDecimal(growth.change()).movePointRight(2);
        for(var rule:enabled){
            var criteria=rule.preview().criteria();
            if(!scopes.contains(criteria.scope())||increase.compareTo(base.multiply(new BigDecimal(criteria.growthPercent())))<=0)continue;
            String why="Consolidated INR quarter ended "+d.periodEnd()+": revenue rose "+growth.percentChange()
                    +"% year over year and operating margin increased "+marginChange.change()+" percentage points.";
            String key=SourceDocuments.checksum(changed.companyId()+"|"+d.periodStart()+"|"+d.periodEnd());
            save(owner,rule,new Proof(changed.companyId(),"Revenue and margin matched your rule",why,null,revenue,prior,margin,priorMargin,key),now);
        }
    }

    private FinancialFacts.Fact fact(UUID owner,UUID company,FinancialFacts.Dimensions source,String metric,int years,LocalDate today){
        boolean margin=metric.equals("OPERATING_MARGIN");
        var d=new FinancialFacts.Dimensions(metric,"CONSOLIDATED","QUARTER",source.periodStart().minusYears(years),
                source.periodEnd().minusYears(years),margin?"PERCENT":"MONEY",margin?null:"INR");
        var matched=evaluation.match(owner,company,d,today);
        return matched.ready()?matched.fact():null;
    }

    private boolean previousMatch(UUID owner,UUID rule,UUID event){
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.research_alert_match m JOIN finn.company_event_version v
                    ON v.owner_id=m.owner_id AND v.event_version_id=m.event_version_id
                    WHERE m.owner_id=? AND m.rule_id=? AND v.event_id=?)
                """,Boolean.class,owner,rule,event));
    }

    private static String semantic(CompanyEvents.Version event) {
        return event.eventId()+"|"+event.subtype()+"|"+event.stage()+"|"+event.materiality()+"|"+event.dates();
    }

    private boolean muted(UUID owner,UUID event){
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.company_event_attention WHERE owner_id=? AND event_id=?
                    AND (muted OR snoozed_until>clock_timestamp()))
                """,Boolean.class,owner,event));
    }

    private EnumSet<AlertLanguage.Scope> relevance(UUID owner,UUID company,List<Rule> rules,LocalDate today){
        var eligible=EnumSet.of(AlertLanguage.Scope.ALL);
        if(rules.stream().anyMatch(rule->rule.preview().criteria().scope()==AlertLanguage.Scope.HOLDINGS)
                &&attention.exposure(owner,today,null).byCompany().containsKey(company))eligible.add(AlertLanguage.Scope.HOLDINGS);
        if(rules.stream().anyMatch(rule->rule.preview().criteria().scope()==AlertLanguage.Scope.WATCHLIST)
                &&attention.watchedCompanies(owner).contains(company))eligible.add(AlertLanguage.Scope.WATCHLIST);
        return eligible;
    }

    private void save(UUID owner,Rule rule,Proof proof,Instant now){
        var cadence=rule.preview().criteria().cadence();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.research_alert_match WHERE owner_id=?",Integer.class,owner)>=5000)return;
        var inserted=jdbc.query("""
                INSERT INTO finn.research_alert_match(owner_id,rule_id,company_id,title,reason,event_version_id,revenue_fact_id,
                    revenue_revision,revenue_prior_id,revenue_prior_revision,margin_fact_id,margin_revision,margin_prior_id,
                    margin_prior_revision,due_at,fingerprint)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT DO NOTHING RETURNING match_id
                """,(row,i)->row.getObject(1,UUID.class),owner,rule.ruleId(),proof.company(),proof.title(),proof.reason(),
                proof.event()==null?null:proof.event().versionId(),id(proof.revenue()),revision(proof.revenue()),
                id(proof.previousRevenue()),revision(proof.previousRevenue()),id(proof.margin()),revision(proof.margin()),
                id(proof.previousMargin()),revision(proof.previousMargin()),utc(deliverAt(now,cadence)),proof.fingerprint());
        if(!inserted.isEmpty()&&cadence==AlertLanguage.Cadence.IMMEDIATE){
            var match=inserted.getFirst();
            var notice=activity.add(owner,ActivityWriter.Kind.RESEARCH_ALERT,rule.ruleId(),match.toString(),
                    proof.title(),match,utc(now));
            attach(owner,List.of(match),notice);
        }
        if(inserted.isEmpty()&&cadence!=AlertLanguage.Cadence.IMMEDIATE){
            jdbc.update("""
                    UPDATE finn.research_alert_match SET reason=?,title=?,event_version_id=?,
                        revenue_fact_id=?,revenue_revision=?,revenue_prior_id=?,revenue_prior_revision=?,
                        margin_fact_id=?,margin_revision=?,margin_prior_id=?,margin_prior_revision=?
                    WHERE owner_id=? AND rule_id=? AND fingerprint=? AND activity_id IS NULL
                    """,proof.reason(),proof.title(),proof.event()==null?null:proof.event().versionId(),
                    id(proof.revenue()),revision(proof.revenue()),id(proof.previousRevenue()),revision(proof.previousRevenue()),
                    id(proof.margin()),revision(proof.margin()),id(proof.previousMargin()),revision(proof.previousMargin()),
                    owner,rule.ruleId(),proof.fingerprint());
        }
    }

    static Instant deliverAt(Instant now,AlertLanguage.Cadence cadence){
        if(cadence==AlertLanguage.Cadence.IMMEDIATE)return now;
        var local=now.atZone(INDIA);
        var date=local.toLocalDate();
        if(cadence==AlertLanguage.Cadence.WEEKLY)date=date.with(TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        var slot=date.atTime(9,0).atZone(INDIA).toInstant();
        if(!slot.isAfter(now))slot=date.plusDays(cadence==AlertLanguage.Cadence.DAILY?1:7).atTime(9,0).atZone(INDIA).toInstant();
        return slot;
    }

    @Transactional public boolean processNext(){
        // Lock the rule before selecting its digest. Concurrent workers cannot deliver the same slot twice.
        var due=jdbc.query("""
                SELECT r.owner_id,r.rule_id,r.cadence FROM finn.research_alert_rule r WHERE r.enabled AND EXISTS(
                    SELECT 1 FROM finn.research_alert_match m WHERE m.owner_id=r.owner_id AND m.rule_id=r.rule_id
                    AND m.activity_id IS NULL AND m.due_at<=clock_timestamp())
                ORDER BY r.rule_id LIMIT 1 FOR UPDATE SKIP LOCKED
                """,(row,i)->new Due(row.getObject(1,UUID.class),row.getObject(2,UUID.class),
                AlertLanguage.Cadence.valueOf(row.getString(3)))).stream().findFirst().orElse(null);
        if(due==null)return false;
        Instant slot=jdbc.queryForObject("""
                SELECT min(due_at) FROM finn.research_alert_match
                WHERE owner_id=? AND rule_id=? AND activity_id IS NULL AND due_at<=clock_timestamp()
                """,OffsetDateTime.class,due.owner(),due.rule()).toInstant();
        var pending=jdbc.query("""
                SELECT * FROM finn.research_alert_match WHERE owner_id=? AND rule_id=? AND due_at=? AND activity_id IS NULL
                ORDER BY match_id LIMIT 100
                """,ResearchAlerts::pending,due.owner(),due.rule(),utc(slot));
        var current=new ArrayList<UUID>();
        var rule=jdbc.query("SELECT * FROM finn.research_alert_rule WHERE owner_id=? AND rule_id=?",
                ResearchAlerts::rule,due.owner(),due.rule()).getFirst();
        var now=Instant.now();
        var today=now.atZone(INDIA).toLocalDate();
        for(var row:pending){
            if(eligibleAtDelivery(due.owner(),rule,row,today))current.add(row.id());
            else jdbc.update("DELETE FROM finn.research_alert_match WHERE owner_id=? AND match_id=?",due.owner(),row.id());
        }
        if(!current.isEmpty()){
            var label=due.cadence()==AlertLanguage.Cadence.WEEKLY?"Weekly research digest":"Daily research digest";
            var notice=activity.add(due.owner(),ActivityWriter.Kind.RESEARCH_ALERT,due.rule(),
                    due.rule()+"|"+slot+"|"+current.getFirst(),label+" · "+current.size()+" matches",current.getFirst(),utc(now));
            attach(due.owner(),current,notice);
        }
        return true;
    }

    private boolean eligibleAtDelivery(UUID owner,Rule rule,Pending row,LocalDate today){
        if(!relevance(owner,row.company(),List.of(rule),today).contains(rule.preview().criteria().scope()))return false;
        if(row.eventVersion()!=null){
            var event=events.evidence(owner,row.eventVersion());
            if(event==null||muted(owner,event.eventId()))return false;
            var latest=events.current(owner,event.eventId());
            if(latest.revision()==event.revision())return true;
            return !latest.novelty().equals("CORRECTION")&&semantic(latest).equals(semantic(event));
        }
        return factCurrent(owner,row.revenue(),row.revenueRevision(),today)&&factCurrent(owner,row.previousRevenue(),row.previousRevenueRevision(),today)
                &&factCurrent(owner,row.margin(),row.marginRevision(),today)&&factCurrent(owner,row.previousMargin(),row.previousMarginRevision(),today);
    }

    private boolean factCurrent(UUID owner,UUID id,int revision,LocalDate today){
        var fact=facts.require(owner,id,null);
        return fact.revision()==revision&&evaluation.usable(owner,fact,today,false).equals("COMPARABLE_FACT");
    }

    private void attach(UUID owner,List<UUID> matches,UUID notice){
        if(notice==null)return;
        for(var match:matches)jdbc.update("UPDATE finn.research_alert_match SET activity_id=? WHERE owner_id=? AND match_id=?",notice,owner,match);
    }

    public List<Match> evidence(UUID owner,UUID notice){
        return jdbc.query("""
                SELECT m.*,c.name FROM finn.research_alert_match m JOIN finn.company c USING(owner_id,company_id)
                WHERE m.owner_id=? AND m.activity_id=? ORDER BY c.name,m.match_id LIMIT 100
                """,(row,i)->{
                    var item=pending(row,i);
                    var event=item.eventVersion()==null?null:events.evidence(owner,item.eventVersion());
                    var anchors=item.revenue()==null?List.<UUID>of():List.of(
                            facts.require(owner,item.revenue(),item.revenueRevision()).anchorId(),
                            facts.require(owner,item.previousRevenue(),item.previousRevenueRevision()).anchorId(),
                            facts.require(owner,item.margin(),item.marginRevision()).anchorId(),
                            facts.require(owner,item.previousMargin(),item.previousMarginRevision()).anchorId()).stream().distinct().toList();
                    return new Match(row.getString("name"),item.company(),row.getString("title"),row.getString("reason"),event,anchors);
                },owner,notice);
    }

    private List<Rule> rules(UUID owner,boolean enabledOnly){
        return jdbc.query("SELECT * FROM finn.research_alert_rule WHERE owner_id=?"+(enabledOnly?" AND enabled":"")
                +" ORDER BY rule_id LIMIT 20",ResearchAlerts::rule,owner);
    }
    private static Rule rule(ResultSet row,int i)throws SQLException{
        String subtype=row.getString("event_type");
        var c=new AlertLanguage.Criteria(AlertLanguage.Kind.valueOf(row.getString("rule_kind")),
                AlertLanguage.Scope.valueOf(row.getString("scope")),subtype==null?null:EventClassifier.Subtype.valueOf(subtype),
                row.getBigDecimal("growth_percent")==null?null:FactPolicy.decimal(row.getBigDecimal("growth_percent")),
                AlertLanguage.Cadence.valueOf(row.getString("cadence")));
        return new Rule(row.getObject("rule_id",UUID.class),row.getBoolean("enabled"),
                AlertLanguage.describe(row.getString("sentence"),c));
    }
    private static Pending pending(ResultSet row,int i)throws SQLException{
        return new Pending(row.getObject("match_id",UUID.class),row.getObject("company_id",UUID.class),row.getObject("event_version_id",UUID.class),
                row.getObject("revenue_fact_id",UUID.class),row.getInt("revenue_revision"),row.getObject("revenue_prior_id",UUID.class),
                row.getInt("revenue_prior_revision"),row.getObject("margin_fact_id",UUID.class),row.getInt("margin_revision"),
                row.getObject("margin_prior_id",UUID.class),row.getInt("margin_prior_revision"));
    }
    private static UUID id(FinancialFacts.Fact fact){return fact==null?null:fact.factId();}
    private static Integer revision(FinancialFacts.Fact fact){return fact==null?null:fact.revision();}
    private static OffsetDateTime utc(Instant time){return time.atOffset(ZoneOffset.UTC);}
}
