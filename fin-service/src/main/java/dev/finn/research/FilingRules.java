
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.monitoring.ActivityWriter;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FilingRules {
    record Settings(UUID companyId,String title,String category,String minimumMateriality,boolean arrivals,boolean dates,boolean tentative) {}
    record Rule(UUID ruleId,int revision,boolean enabled,Settings settings) {}
    record RuleList(List<Rule> items) {}
    record CalendarItem(UUID eventId,UUID versionId,int revision,String title,String companyName,
                        UUID documentId,int documentRevision,CompanyEvents.AnnouncedDate date) {}
    record CalendarPage(List<CalendarItem> items,boolean hasMore) {}
    private record Notice(UUID eventId,UUID ruleId,String type,LocalDate date,String certainty,UUID activity) {}

    private static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ActivityWriter activities;

    FilingRules(JdbcTemplate jdbc,CurrentUser users,ActivityWriter activities) {
        this.jdbc=jdbc;
        this.users=users;
        this.activities=activities;
    }

    @Transactional public RuleList list() { return new RuleList(rules(users.requireId())); }

    @Transactional public Rule create(Settings input) { return createFor(users.requireId(),input); }

    Rule createFor(UUID owner,Settings input) {
        if (!input.arrivals()&&!input.dates()) throw ApiFailure.invalid();
        if (input.companyId()!=null&&!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.company WHERE owner_id=? AND company_id=?)
                """,Boolean.class,owner,input.companyId()))) throw ApiFailure.notFound();
        if (jdbc.queryForObject("SELECT count(*) FROM finn.filing_rule WHERE owner_id=?",Integer.class,owner)>=20)
            throw new ApiFailure(429,"FILING_RULE_LIMIT");
        UUID id=UUID.randomUUID();
        jdbc.update("""
                INSERT INTO finn.filing_rule(owner_id,rule_id,company_id,title,category,minimum_materiality,arrivals,dates,tentative)
                VALUES (?,?,?,?,?,?,?,?,?)
                """,owner,id,input.companyId(),Catalogue.cleanName(input.title()),input.category(),input.minimumMateriality(),
                input.arrivals(),input.dates(),input.tentative());
        Rule rule=require(owner,id);
        seedDates(owner,rule);
        return rule;
    }

    @Transactional public Rule enable(UUID id,int revision,boolean enabled) {
        UUID owner=users.requireId();
        Rule before=require(owner,id);
        if (before.revision()!=revision) throw ApiFailure.conflict();
        if (before.enabled()==enabled) return before;
        if (revision>=1000000) throw new ApiFailure(429,"FILING_RULE_VERSION_LIMIT");
        if(jdbc.update("UPDATE finn.filing_rule SET enabled=?,revision=revision+1 WHERE owner_id=? AND rule_id=? AND revision=?",
                enabled,owner,id,revision)!=1) throw ApiFailure.conflict();
        Rule changed=require(owner,id);
        if (enabled) {
            seedDates(owner,changed);
        } else {
            for(var notice:jdbc.query("SELECT * FROM finn.event_date_notice WHERE owner_id=? AND rule_id=?",FilingRules::notice,owner,id))
                remove(owner,notice);
            jdbc.update("""
                    UPDATE finn.activity_delivery d SET status='SUPPRESSED',completed_at=clock_timestamp(),failure_code='SCHEDULE_CHANGED'
                    FROM finn.activity a WHERE a.owner_id=d.owner_id AND a.activity_id=d.activity_id AND a.owner_id=?
                      AND a.kind='COMPANY_EVENT' AND a.dedupe_key LIKE ? AND d.status='PENDING'
                    """,owner,"ARRIVAL:%:"+id+":%");
        }
        return changed;
    }

    @Transactional public CalendarPage calendar(LocalDate start,LocalDate end,int offset) {
        var today=LocalDate.now(INDIA);
        LocalDate from=start==null?today:start;
        LocalDate through=end==null?from.plusDays(90):end;
        if(!through.isAfter(from)||through.isAfter(from.plusDays(366))||from.isBefore(today.minusYears(2))||from.isAfter(today.plusYears(10)))
            throw ApiFailure.invalid();
        var items=current(users.requireId()).stream().filter(event->!event.stage().equals("CANCELLED"))
                .flatMap(event->event.dates().stream().filter(date->!date.certainty().equals("CANCELLED"))
                        .map(date->new CalendarItem(event.eventId(),event.versionId(),event.revision(),event.title(),
                                event.companyName(),event.documentId(),event.documentRevision(),date)))
                .filter(item->!item.date().date().isBefore(from)&&item.date().date().isBefore(through))
                .sorted(Comparator.comparing((CalendarItem item)->item.date().date())
                        .thenComparing(item->item.date().type()).thenComparing(CalendarItem::eventId))
                .skip(offset).limit(41).toList();
        return new CalendarPage(items.stream().limit(40).toList(),items.size()>40);
    }

    void onEvent(UUID owner,CompanyEvents.Version event) {
        onEvent(owner,event,true);
    }

    void onEvent(UUID owner,CompanyEvents.Version event,boolean currentRevision) {
        for(Rule rule:rules(owner)){
            if (!rule.enabled()) continue;
            if(currentRevision)syncDates(owner,rule,event);
            if (!rule.settings().arrivals()||!matches(rule,event)) continue;
            String semantic=event.category()+"|"+event.subtype()+"|"+event.stage()+"|"+event.materiality()+"|"+event.dates();
            boolean correction=event.novelty().equals("CORRECTION")||event.stage().equals("CANCELLED");
            if(correction)semantic+="|CORRECTION|"+event.versionId();
            String key="ARRIVAL:"+event.eventId()+":"+rule.ruleId()+":"+SourceDocuments.checksum(semantic);
            activities.add(owner,ActivityWriter.Kind.COMPANY_EVENT,event.eventId(),key,correction?"Correction · "+event.title():event.title(),
                    event.versionId(),OffsetDateTime.now(ZoneOffset.UTC));
        }
    }

    private void seedDates(UUID owner,Rule rule) {
        if (!rule.settings().dates()) return;
        for(var event:current(owner)) syncDates(owner,rule,event);
    }

    private void syncDates(UUID owner,Rule rule,CompanyEvents.Version event) {
        Map<String,CompanyEvents.AnnouncedDate> desired=new LinkedHashMap<>();
        if (rule.settings().dates()&&matches(rule,event)&&!event.stage().equals("CANCELLED")) {
            var today=LocalDate.now(INDIA);
            event.dates().stream().filter(date->!date.date().isBefore(today)
                    && (date.certainty().equals("CONFIRMED")||date.certainty().equals("TENTATIVE")&&rule.settings().tentative()))
                    .forEach(date->desired.put(date.type(),date));
        }
        var existing=jdbc.query("""
                SELECT * FROM finn.event_date_notice WHERE owner_id=? AND event_id=? AND rule_id=?
                """,FilingRules::notice,owner,event.eventId(),rule.ruleId());
        for(var previous:existing){
            var date=desired.get(previous.type());
            if(date!=null&&date.date().equals(previous.date())&&date.certainty().equals(previous.certainty())){
                desired.remove(previous.type());
            }else{
                remove(owner,previous);
            }
        }
        for(var date:desired.values()){
            String key="DATE:"+event.eventId()+":"+rule.ruleId()+":"+rule.revision()+":"+event.revision()+":"+date.type();
            String title=date.certainty().equals("TENTATIVE") ? "Tentative company date: "+event.title() : "Company date: "+event.title();
            OffsetDateTime when=date.date().atTime(9,0).atZone(INDIA).toOffsetDateTime();
            UUID activity=activities.add(owner,ActivityWriter.Kind.COMPANY_EVENT,event.eventId(),key,title,event.versionId(),when);
            if(activity!=null)jdbc.update("""
                    INSERT INTO finn.event_date_notice(owner_id,event_id,rule_id,date_type,scheduled_date,certainty,activity_id)
                    VALUES (?,?,?,?,?,?,?)
                    """,owner,event.eventId(),rule.ruleId(),date.type(),date.date(),date.certainty(),activity);
        }
    }

    private void remove(UUID owner,Notice notice) {
        activities.suppressPendingActivity(owner,notice.activity());
        jdbc.update("DELETE FROM finn.event_date_notice WHERE owner_id=? AND event_id=? AND rule_id=? AND date_type=?",
                owner,notice.eventId(),notice.ruleId(),notice.type());
    }

    private static boolean matches(Rule rule,CompanyEvents.Version event) {
        var settings=rule.settings();
        if (settings.companyId()!=null&&!settings.companyId().equals(event.companyId())) return false;
        if (!settings.category().equals("ANY")&&!settings.category().equals(event.category())) return false;
        return switch(settings.minimumMateriality()){
            case "HIGH" -> event.materiality().equals("HIGH");
            case "MEDIUM" -> event.materiality().equals("HIGH")||event.materiality().equals("MEDIUM");
            default -> true;
        };
    }

    private List<CompanyEvents.Version> current(UUID owner) {
        return jdbc.query(CompanyEvents.SELECT+" WHERE e.owner_id=? AND v.revision=e.revision ORDER BY e.event_id LIMIT 300",
                CompanyEvents::version,owner);
    }

    private List<Rule> rules(UUID owner) {
        return jdbc.query("SELECT * FROM finn.filing_rule WHERE owner_id=? ORDER BY rule_id LIMIT 20",FilingRules::row,owner);
    }

    private Rule require(UUID owner,UUID id) {
        return jdbc.query("SELECT * FROM finn.filing_rule WHERE owner_id=? AND rule_id=?",FilingRules::row,owner,id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Rule row(ResultSet row,int ignored)throws SQLException {
        return new Rule(row.getObject("rule_id",UUID.class),row.getInt("revision"),row.getBoolean("enabled"),
                new Settings(row.getObject("company_id",UUID.class),row.getString("title"),row.getString("category"),
                        row.getString("minimum_materiality"),row.getBoolean("arrivals"),row.getBoolean("dates"),row.getBoolean("tentative")));
    }

    private static Notice notice(ResultSet row,int ignored)throws SQLException {
        return new Notice(row.getObject("event_id",UUID.class),row.getObject("rule_id",UUID.class),row.getString("date_type"),
                row.getObject("scheduled_date",LocalDate.class),row.getString("certainty"),row.getObject("activity_id",UUID.class));
    }
}
