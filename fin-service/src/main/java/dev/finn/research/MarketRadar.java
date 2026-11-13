package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.market.DailyMovement;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class MarketRadar {
    private static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final int LIMIT = 60;
    enum Scope { ALL, HELD, WATCHLIST }
    enum Kind { ALL, ANNOUNCEMENTS, MOVES }
    enum Liquidity { ALL, TURNOVER_1_CRORE, TURNOVER_10_CRORE }
    record Filter(int days, Scope scope, Kind kind, DiscoveryUniverse.Sector sector, EventClassifier.Subtype eventType,
                  Liquidity liquidity, UUID portfolioId) {}
    record Context(String companyName, UUID companyId, UUID listingId, String symbol, String exchange,
                   DiscoveryUniverse.Sector sector, boolean held, boolean watched) {}
    record Announcement(CompanyEvents.Version event, String publishedAt, String sourceUrl, String sourceName) {}
    record SectorMove(int peers, String medianChangePercent) {}
    record Reason(String label, int points) {}
    record Entry(Context stock, Announcement announcement, DailyMovement.Signal movement, SectorMove sectorMove,
                 int score, List<Reason> reasons) {}
    record Radar(LocalDate asOf, int listingsChecked, int listingsWithRecentPrices, boolean listingLimitReached,
                 String holdingsCoverage, List<Entry> items, boolean truncated) {}
    record CalendarEntry(Context stock, CompanyEvents.Version event, CompanyEvents.AnnouncedDate date) {}
    record Calendar(LocalDate asOf, String holdingsCoverage, List<CalendarEntry> items) {}
    record Snapshot(Radar radar, Calendar calendar) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final AttentionInbox attention;
    private final DailyMovement movement;

    MarketRadar(JdbcTemplate jdbc,CurrentUser users,AttentionInbox attention,DailyMovement movement) {
        this.jdbc=jdbc; this.users=users; this.attention=attention; this.movement=movement;
    }

    @Transactional
    public Radar radar(Filter filter) { return snapshot(users.requireId(),filter,Instant.now()).radar(); }

    @Transactional
    public Calendar calendar(UUID portfolio) {
        UUID owner=users.requireId();
        var today=LocalDate.now(INDIA);
        requirePortfolio(owner,portfolio);
        var exposure=attention.exposure(owner,today,portfolio);
        var stocks=contexts(owner,exposure.byCompany().keySet(),attention.watchedCompanies(owner));
        return upcoming(today,exposure.coverage(),stocks.stream().filter(Context::held).toList(),announcements(owner));
    }

    Snapshot snapshot(UUID owner,Filter filter,Instant now) {
        var today=now.atZone(INDIA).toLocalDate();
        requirePortfolio(owner,filter.portfolioId());
        var exposure=attention.exposure(owner,today,filter.portfolioId());
        var watched=attention.watchedCompanies(owner);
        var announcements=announcements(owner);
        var stocks=contexts(owner,exposure.byCompany().keySet(),watched);
        var eligible=stocks.stream().filter(stock->inScope(stock,filter.scope())&&sectorMatches(stock,filter)).toList();
        var eligibleIds=eligible.stream().map(Context::companyId).collect(Collectors.toSet());
        Map<UUID,Context> byCompany=stocks.stream().collect(Collectors.toMap(Context::companyId,stock->stock));
        var selected=eligible.stream().filter(stock->stock.listingId()!=null).limit(LIMIT+1L).toList();
        var signals=new LinkedHashMap<UUID,DailyMovement.Signal>();
        for(var stock:selected.stream().limit(LIMIT).toList()){
            var signal=movement.observed(owner,stock.listingId(),stock.exchange(),today);
            if(signal!=null)signals.put(stock.companyId(),signal);
        }
        var start=today.minusDays(filter.days()-1L).atStartOfDay(INDIA).toInstant();
        var entries=new ArrayList<Entry>();
        var withEvents=new HashSet<UUID>();
        for(var announcement:announcements){
            var event=announcement.event();
            var stock=byCompany.get(event.companyId());
            if(stock==null||!eligibleIds.contains(stock.companyId())
                    ||filter.kind()==Kind.MOVES||filter.eventType()!=null&&!event.subtype().equals(filter.eventType().name()))continue;
            if(!fresh(announcement,start,now))continue;
            var signal=signals.get(stock.companyId());
            if(!liquid(signal,filter.liquidity()))continue;
            entries.add(entry(stock,announcement,signal,benchmark(stock,signal,stocks,signals),today));
            withEvents.add(stock.companyId());
        }
        if(filter.kind()!=Kind.ANNOUNCEMENTS&&filter.eventType()==null) for(var stock:eligible){
            var signal=signals.get(stock.companyId());
            if(!withEvents.contains(stock.companyId())&&DailyMovement.recent(signal,stock.exchange(),today)
                    &&(signal.unusualPrice()||signal.unusualVolume())&&liquid(signal,filter.liquidity()))
                entries.add(entry(stock,null,signal,benchmark(stock,signal,stocks,signals),today));
        }
        entries.sort(Comparator.comparingInt(Entry::score).reversed().thenComparing(e->e.stock().companyName())
                .thenComparing(e->e.announcement()==null ? "" : e.announcement().event().eventId().toString()));
        int recent=(int)selected.stream().limit(LIMIT).filter(stock->DailyMovement.recent(signals.get(stock.companyId()),stock.exchange(),today)).count();
        return new Snapshot(new Radar(today,Math.min(selected.size(),LIMIT),recent,selected.size()>LIMIT,exposure.coverage(),
                entries.stream().limit(50).toList(),entries.size()>50),upcoming(today,exposure.coverage(),eligible,announcements));
    }

    private static Calendar upcoming(LocalDate today,String coverage,List<Context> stocks,List<Announcement> announcements) {
        var byCompany=stocks.stream().collect(Collectors.toMap(Context::companyId,stock->stock));
        var items=announcements.stream().filter(a->!a.event().stage().equals("CANCELLED")&&byCompany.containsKey(a.event().companyId()))
                .flatMap(a->a.event().dates().stream().filter(date->!date.certainty().equals("CANCELLED")
                        &&!date.date().isBefore(today)&&!date.date().isAfter(today.plusDays(60)))
                        .map(date->new CalendarEntry(byCompany.get(a.event().companyId()),a.event(),date)))
                .sorted(Comparator.comparing((CalendarEntry item)->item.date().date())
                        .thenComparing(item->item.event().eventId())).limit(20).toList();
        return new Calendar(today,coverage,items);
    }

    private void requirePortfolio(UUID owner,UUID portfolio) {
        if (portfolio!=null && !Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM finn.portfolio WHERE owner_id=? AND portfolio_id=?)",
                Boolean.class,owner,portfolio))) throw ApiFailure.notFound();
    }

    List<Announcement> announcements(UUID owner) {
        return jdbc.query(CompanyEvents.SELECT+" WHERE e.owner_id=? AND v.revision=e.revision ORDER BY v.reviewed_at DESC,e.event_id LIMIT 300",
                (row,i)->new Announcement(CompanyEvents.version(row,i),SourceDocuments.instant(row,"published_at"),
                        row.getString("url"),row.getString("source_name")),owner);
    }

    private List<Context> contexts(UUID owner,Set<UUID> held,Set<UUID> watched) {
        return jdbc.query("""
                SELECT c.company_id,c.name,picked.listing_id,picked.exchange,picked.symbol,m.sector
                FROM finn.company c LEFT JOIN finn.discovery_member m USING(owner_id,company_id)
                LEFT JOIN LATERAL (
                    SELECT l.listing_id,l.exchange,h.symbol
                    FROM finn.security s JOIN finn.listing l USING(owner_id,security_id)
                    JOIN finn.listing_symbol h ON h.owner_id=l.owner_id AND h.listing_id=l.listing_id AND h.valid_to IS NULL
                    WHERE s.owner_id=c.owner_id AND s.company_id=c.company_id
                    ORDER BY (l.listing_id=m.listing_id) DESC NULLS LAST,EXISTS(
                        SELECT 1 FROM finn.market_observation o WHERE o.owner_id=l.owner_id AND o.listing_id=l.listing_id
                        AND o.source='YAHOO_YFINANCE') DESC,(l.exchange='NSE') DESC,l.listing_id LIMIT 1
                ) picked ON TRUE
                WHERE c.owner_id=? AND (picked.listing_id IS NOT NULL OR EXISTS(
                    SELECT 1 FROM finn.company_event e WHERE e.owner_id=c.owner_id AND e.company_id=c.company_id))
                ORDER BY EXISTS (SELECT 1 FROM finn.market_observation o WHERE o.owner_id=c.owner_id
                    AND o.listing_id=picked.listing_id AND o.source='YAHOO_YFINANCE') DESC,lower(c.name),c.company_id
                LIMIT 6001
                """,(row,i)->{
                    var id=row.getObject(1,UUID.class);
                    String sector=row.getString("sector");
                    return new Context(row.getString(2),id,row.getObject(3,UUID.class),row.getString("symbol"),
                            row.getString("exchange"),sector==null?null:DiscoveryUniverse.Sector.valueOf(sector),
                            held.contains(id),watched.contains(id));
                },owner).stream().sorted(Comparator.comparingInt((Context stock)->stock.held()?0:stock.watched()?1:2)).toList();
    }

    static boolean fresh(Announcement announcement,Instant start,Instant now) {
        var event=announcement.event();
        String time=event.novelty().equals("CORRECTION")||event.stage().equals("CANCELLED") ? event.reviewedAt() : announcement.publishedAt();
        if(time==null)return false;
        var date=Instant.parse(time);
        return !date.isBefore(start)&&!date.isAfter(now);
    }

    private static boolean sectorMatches(Context stock,Filter filter) {return filter.sector()==null||stock.sector()==filter.sector();}
    private static boolean inScope(Context stock,Scope scope){
        return scope==Scope.ALL||scope==Scope.HELD&&stock.held()||scope==Scope.WATCHLIST&&stock.watched();
    }
    private static boolean liquid(DailyMovement.Signal signal,Liquidity liquidity) {
        if(liquidity==Liquidity.ALL)return true;
        var threshold=liquidity==Liquidity.TURNOVER_1_CRORE?new BigDecimal("10000000"):new BigDecimal("100000000");
        return signal!=null&&signal.medianTurnover()!=null&&new BigDecimal(signal.medianTurnover()).compareTo(threshold)>=0;
    }

    static Entry entry(Context stock,Announcement event,DailyMovement.Signal signal,SectorMove sector,LocalDate today){
        var reasons=new ArrayList<Reason>();
        if(event!=null){
            var version=event.event();
            int significance=switch(version.materiality()){case "HIGH"->40;case "MEDIUM"->24;case "LOW"->8;default->0;};
            if(significance>0)reasons.add(new Reason("Reviewed "+version.materiality().toLowerCase(Locale.ROOT)+" materiality",significance));
            reasons.add(new Reason("Reviewed primary source",12));
            if(version.novelty().equals("CORRECTION")||version.stage().equals("CANCELLED"))reasons.add(new Reason("Correction or cancellation",10));
            if(event.publishedAt()!=null){
                long days=ChronoUnit.DAYS.between(Instant.parse(event.publishedAt()).atZone(INDIA).toLocalDate(),today);
                if(days>=0&&days<=2)reasons.add(new Reason("Published in the last three calendar days",8));
            }
        }
        if(stock.held())reasons.add(new Reason("In your holdings",18));
        if(stock.watched())reasons.add(new Reason("On a watchlist",10));
        if(DailyMovement.recent(signal,stock.exchange(),today)){
            if(signal.unusualPrice())reasons.add(new Reason("Unusual adjusted price move",12));
            if(signal.unusualVolume())reasons.add(new Reason("Unusual trading volume",12));
            if(liquid(signal,Liquidity.TURNOVER_1_CRORE))reasons.add(new Reason("Median daily turnover above ₹1 crore",5));
        }
        return new Entry(stock,event,signal,sector,reasons.stream().mapToInt(Reason::points).sum(),List.copyOf(reasons));
    }

    static SectorMove benchmark(Context stock,DailyMovement.Signal signal,List<Context> stocks,Map<UUID,DailyMovement.Signal> signals) {
        if(stock.sector()==null||signal==null||signal.changePercent()==null)return null;
        var changes=stocks.stream().filter(peer->peer.sector()==stock.sector()&&!peer.companyId().equals(stock.companyId())
                &&Objects.equals(peer.exchange(),stock.exchange())).map(peer->signals.get(peer.companyId()))
                .filter(Objects::nonNull).filter(peer->peer.changePercent()!=null&&peer.session().equals(signal.session())
                        &&peer.previousSession().equals(signal.previousSession()))
                .map(peer->new BigDecimal(peer.changePercent())).toList();
        return changes.size()<3?null:new SectorMove(changes.size(),DailyMovement.median(changes).stripTrailingZeros().toPlainString());
    }
}
