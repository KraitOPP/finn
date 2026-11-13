
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.ledger.Journal;
import dev.finn.platform.ApiFailure;
import com.fasterxml.jackson.annotation.JsonInclude;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class AttentionInbox {
    record Holding(UUID securityId,String name,String quantity) {}
    record Reason(String label,int points) {}
    record State(boolean read,boolean muted,String snoozedUntil,@JsonInclude(JsonInclude.Include.NON_NULL) String reaction) {}
    record Item(CompanyEvents.Version event,int score,List<Reason> reasons,List<Holding> holdings,State state,
                @JsonInclude(JsonInclude.Include.NON_NULL) Boolean watched) {}
    record Page(String coverage,String rankedAt,List<Item> items,boolean hasMore) {}

    private record Feedback(Integer readRevision,boolean muted,OffsetDateTime snoozed,String reaction) {
        State state(int revision,Instant now) {
            return new State(readRevision!=null&&readRevision==revision,muted,
                    snoozed!=null&&snoozed.toInstant().isAfter(now) ? snoozed.toInstant().toString() : null,reaction);
        }
    }
    private record Security(UUID id,UUID company,String name) {}
    record Exposure(String coverage,Map<UUID,List<Holding>> byCompany) {}
    private static final Feedback DEFAULT = new Feedback(null,false,null,null);
    private static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    private static final int PAGE=25;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Journal journal;
    private final CompanyEvents events;

    AttentionInbox(JdbcTemplate jdbc,CurrentUser users,Journal journal,CompanyEvents events) {
        this.jdbc=jdbc;
        this.users=users;
        this.journal=journal;
        this.events=events;
    }

    @Transactional public Page list(String view,int offset) { return rank(users.requireId(),view,offset,Instant.now()); }

    Page rank(UUID owner,String view,int offset,Instant now) {
        var current=jdbc.query(CompanyEvents.SELECT+" WHERE e.owner_id=? AND v.revision=e.revision LIMIT 300",CompanyEvents::version,owner);
        Map<UUID,Feedback> feedback=new HashMap<>();
        jdbc.query("""
                SELECT * FROM finn.company_event_attention WHERE owner_id=?
                """, row->{
                    feedback.put(row.getObject("event_id",UUID.class),new Feedback(row.getObject("read_revision",Integer.class),
                            row.getBoolean("muted"),row.getObject("snoozed_until",OffsetDateTime.class),row.getString("reaction")));
                },owner);
        var exposure=current.isEmpty()?new Exposure("NO_RECORDS",Map.of()):exposure(owner,now.atZone(INDIA).toLocalDate(),null);
        var watched=current.isEmpty()?Set.<UUID>of():watchedCompanies(owner);
        List<Item> ordered=current.stream()
                .map(event->item(event,exposure.byCompany().getOrDefault(event.companyId(),List.of()),
                        feedback.getOrDefault(event.eventId(),DEFAULT).state(event.revision(),now),watched.contains(event.companyId())))
                .filter(item->visible(item.state(),view))
                .sorted(Comparator.comparingInt(Item::score).reversed()
                        .thenComparing(item->Instant.parse(item.event().reviewedAt()),Comparator.reverseOrder())
                        .thenComparing(item->item.event().eventId()))
                .skip(offset).limit(PAGE+1L).toList();
        return new Page(exposure.coverage(),now.truncatedTo(java.time.temporal.ChronoUnit.MICROS).toString(),
                ordered.stream().limit(PAGE).toList(),ordered.size()>PAGE);
    }

    @Transactional public State change(UUID id,int revision,String action,String snoozeUntil) {
        UUID owner=users.requireId();
        var current=events.current(owner,id);
        if (current.revision()!=revision) throw ApiFailure.conflict();
        var old=jdbc.query("""
                SELECT read_revision,muted,snoozed_until,reaction FROM finn.company_event_attention WHERE owner_id=? AND event_id=?
                """,(row,i)->new Feedback(row.getObject(1,Integer.class),row.getBoolean(2),row.getObject(3,OffsetDateTime.class),row.getString(4)),
                owner,id).stream().findFirst().orElse(DEFAULT);
        if (action.equals("SNOOZE")!=(snoozeUntil!=null)) throw ApiFailure.invalid();
        var now=Instant.now();
        Feedback next=switch(action){
            case "READ" -> new Feedback(revision,old.muted(),old.snoozed(),old.reaction());
            case "UNREAD" -> new Feedback(null,old.muted(),old.snoozed(),old.reaction());
            case "MUTE" -> new Feedback(old.readRevision(),true,old.snoozed(),old.reaction());
            case "UNMUTE" -> new Feedback(old.readRevision(),false,old.snoozed(),old.reaction());
            case "SNOOZE" -> new Feedback(old.readRevision(),old.muted(),future(snoozeUntil,now),old.reaction());
            case "UNSNOOZE" -> new Feedback(old.readRevision(),old.muted(),null,old.reaction());
            case "USEFUL","ALREADY_KNEW","TOO_MANY" -> new Feedback(revision,old.muted(),old.snoozed(),action);
            case "CLEAR_REACTION" -> new Feedback(old.readRevision(),old.muted(),old.snoozed(),null);
            default -> throw ApiFailure.invalid();
        };
        jdbc.update("""
                INSERT INTO finn.company_event_attention(owner_id,event_id,read_revision,muted,snoozed_until,reaction) VALUES (?,?,?,?,?,?)
                ON CONFLICT(owner_id,event_id) DO UPDATE SET read_revision=excluded.read_revision,muted=excluded.muted,
                    snoozed_until=excluded.snoozed_until,reaction=excluded.reaction
                """,owner,id,next.readRevision(),next.muted(),next.snoozed(),next.reaction());
        return next.state(revision,now);
    }

    Exposure exposure(UUID owner,LocalDate today,UUID portfolio) {
        var accounts=jdbc.query("""
                SELECT a.account_id FROM finn.investment_account a JOIN finn.portfolio p USING(owner_id,portfolio_id)
                WHERE a.owner_id=? AND NOT p.archived AND (?::uuid IS NULL OR p.portfolio_id=?)
                ORDER BY a.created_at,a.account_id LIMIT 21
                """,(row,i)->row.getObject(1,UUID.class),owner,portfolio,portfolio);
        if (accounts.isEmpty()) return new Exposure("NO_RECORDS",Map.of());
        int events=jdbc.queryForObject("SELECT count(*) FROM (SELECT 1 FROM finn.ledger_event WHERE owner_id=? LIMIT 30001) n",Integer.class,owner);
        if (events>30000) return new Exposure("PARTIAL",Map.of());
        var securities=jdbc.query("""
                SELECT s.security_id,s.company_id,s.name FROM finn.security s WHERE s.owner_id=?
                ORDER BY s.security_id LIMIT 5001
                """,(row,i)->new Security(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getString(3)),owner);
        var wanted=new HashMap<UUID,Security>();
        for(var security:securities) wanted.put(security.id(),security);
        boolean partial=accounts.size()>20||securities.size()>5000;
        Map<UUID,BigDecimal> quantities=new HashMap<>();
        for(var account:accounts.stream().limit(20).toList()){
            var view=journal.projectAt(owner,account,today,journal.currentRevision(owner,account));
            if (view.coverageStart()==null) partial=true;
            for(var position:view.positions()){
                if(wanted.containsKey(position.securityId()))
                    quantities.merge(position.securityId(),new BigDecimal(position.quantity()),BigDecimal::add);
            }
        }
        Map<UUID,List<Holding>> grouped=new HashMap<>();
        quantities.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry->{
            var security=wanted.get(entry.getKey());
            var list=grouped.computeIfAbsent(security.company(),key->new ArrayList<>());
            if(list.size()<100) list.add(new Holding(security.id(),security.name(),entry.getValue().stripTrailingZeros().toPlainString()));
        });
        boolean truncated=grouped.values().stream().mapToInt(List::size).sum()<quantities.size();
        return new Exposure(partial||truncated?"PARTIAL":"RECORDED_ACCOUNTS",grouped);
    }

    Set<UUID> watchedCompanies(UUID owner) {
        return new HashSet<>(jdbc.query("""
                SELECT DISTINCT s.company_id FROM finn.watchlist_item w JOIN finn.listing l USING(owner_id,listing_id)
                JOIN finn.security s USING(owner_id,security_id) WHERE w.owner_id=?
                """,(row,i)->row.getObject(1,UUID.class),owner));
    }

    private static Item item(CompanyEvents.Version event,List<Holding> holdings,State state,boolean watched) {
        var reasons=new ArrayList<Reason>();
        switch(event.materiality()){
            case "HIGH" -> reasons.add(new Reason("Reviewed high materiality",40));
            case "MEDIUM" -> reasons.add(new Reason("Reviewed medium materiality",20));
            case "LOW" -> reasons.add(new Reason("Reviewed low materiality",5));
            default -> reasons.add(new Reason("Materiality unknown",0));
        }
        if (!holdings.isEmpty()) reasons.add(new Reason("Company has recorded holdings",25));
        if (watched) reasons.add(new Reason("Company is on a watchlist",10));
        if (event.novelty().equals("CORRECTION")||event.stage().equals("CANCELLED")) reasons.add(new Reason("Correction or cancellation",10));
        if("TOO_MANY".equals(state.reaction()))reasons.add(new Reason("Lower priority from your feedback",-15));
        int score=reasons.stream().mapToInt(Reason::points).sum();
        return new Item(event,Math.max(0,score),List.copyOf(reasons),holdings,state,watched);
    }

    private static boolean visible(State state,String view) {
        boolean active=!state.muted()&&state.snoozedUntil()==null;
        return switch(view){
            case "UNREAD" -> active&&!state.read();
            case "HIDDEN" -> !active;
            default -> active;
        };
    }

    private static OffsetDateTime future(String value,Instant now) {
        try {
            var date=Instant.parse(value);
            if (!date.isAfter(now)||date.isAfter(now.plus(Duration.ofDays(30)))) throw ApiFailure.invalid();
            return OffsetDateTime.ofInstant(date.truncatedTo(java.time.temporal.ChronoUnit.MICROS),ZoneOffset.UTC);
        } catch(DateTimeException invalid){throw ApiFailure.invalid();}
    }
}
