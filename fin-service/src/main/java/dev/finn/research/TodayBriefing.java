package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@Service
public class TodayBriefing {
    record Question(UUID noteId,UUID companyId,String companyName,String title) {}
    public record Brief(String from,String through,String lastReviewedThrough,List<MarketRadar.Entry> holdings,
                 List<MarketRadar.Entry> watchlist,List<MarketRadar.Entry> candidates,List<MarketRadar.CalendarEntry> upcoming,
                 List<Question> questions,int recentPrices,int checkedListings,String holdingsCoverage) {}
    record Receipt(String reviewedThrough) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final MarketRadar radar;

    TodayBriefing(JdbcTemplate jdbc,CurrentUser users,MarketRadar radar){this.jdbc=jdbc;this.users=users;this.radar=radar;}

    @Transactional public Brief read(){
        var through=Instant.now().truncatedTo(ChronoUnit.MICROS);
        return context(users.requireId(),null,through);
    }

    public Brief forScheduledBrief(UUID owner,Instant windowStart){
        return context(owner,windowStart,Instant.now().truncatedTo(ChronoUnit.MICROS));
    }

    private Brief context(UUID owner,Instant windowStart,Instant through){
        var last=jdbc.query("SELECT reviewed_through FROM finn.research_brief_seen WHERE owner_id=?",
                (row,i)->row.getObject(1,OffsetDateTime.class).toInstant(),owner).stream().findFirst().orElse(null);
        var from=last==null?windowStart:last;
        if(from==null)from=through.minus(7,ChronoUnit.DAYS);
        if(windowStart!=null&&from.isBefore(windowStart))from=windowStart;
        if(from.isAfter(through))from=through;
        var snapshot=radar.snapshot(owner,new MarketRadar.Filter(30,MarketRadar.Scope.ALL,MarketRadar.Kind.ALL,
                null,null,MarketRadar.Liquidity.ALL,MarketRadar.Size.ALL,null),through,from);
        var newItems=snapshot.ranked();
        var questions=jdbc.query("""
                SELECT n.note_id,n.company_id,c.name,n.title FROM finn.company_research_note n JOIN finn.company c USING(owner_id,company_id)
                WHERE n.owner_id=? AND n.kind='QUESTION' AND NOT n.resolved ORDER BY lower(c.name),n.note_id LIMIT 6
                """,(row,i)->new Question(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getString(3),row.getString(4)),owner);
        return new Brief(from.toString(),through.toString(),last==null?null:last.toString(),
                newItems.stream().filter(item->item.stock().held()).limit(5).toList(),
                newItems.stream().filter(item->!item.stock().held()&&item.stock().watched()).limit(5).toList(),
                newItems.stream().filter(item->!item.stock().held()&&!item.stock().watched()).limit(4).toList(),
                snapshot.calendar().items().stream().limit(6).toList(),
                questions,snapshot.radar().listingsWithRecentPrices(),snapshot.radar().listingsChecked(),snapshot.radar().holdingsCoverage());
    }

    @Transactional public Receipt mark(Instant through){
        var now=Instant.now();
        if(through.isAfter(now)||through.isBefore(now.minus(1,ChronoUnit.DAYS)))throw ApiFailure.invalid();
        var stored=jdbc.queryForObject("""
                INSERT INTO finn.research_brief_seen(owner_id,reviewed_through) VALUES (?,?)
                ON CONFLICT(owner_id) DO UPDATE SET reviewed_through=greatest(finn.research_brief_seen.reviewed_through,excluded.reviewed_through)
                RETURNING reviewed_through
                """,OffsetDateTime.class,users.requireId(),through.atOffset(ZoneOffset.UTC));
        return new Receipt(stored.toInstant().toString());
    }
}

@RestController
@RequestMapping("/api/v1/briefing")
class TodayBriefingController {
    record Read(@NotNull Instant through) {}
    private final TodayBriefing briefing;
    TodayBriefingController(TodayBriefing briefing){this.briefing=briefing;}
    @GetMapping TodayBriefing.Brief read(){return briefing.read();}
    @PostMapping("/reviewed") TodayBriefing.Receipt reviewed(@Valid @RequestBody Read input){return briefing.mark(input.through());}
}
