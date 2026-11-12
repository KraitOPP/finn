package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DiscoveryUniverse {
    static final int CAPACITY=30;
    enum Sector { BANKING, FINANCIAL_SERVICES, MANUFACTURING, TECHNOLOGY, CONSUMER, ENERGY, OTHER }
    enum Metric {
        REVENUE(false,false), PROFIT_AFTER_TAX(false,true), EPS_BASIC(false,true),
        OPERATING_MARGIN(false,false), FREE_CASH_FLOW(false,false), TOTAL_EQUITY(true,true);

        final boolean balance;
        final boolean financial;
        Metric(boolean balance,boolean financial){this.balance=balance;this.financial=financial;}
        String unit(){return FactPolicy.Metric.valueOf(name()).unit();}
        boolean eligible(Sector sector){
            return financial||sector!=Sector.BANKING&&sector!=Sector.FINANCIAL_SERVICES;
        }
    }

    record Period(String kind,LocalDate start,LocalDate end) {
        FinancialFacts.Dimensions dimensions(Metric metric){
            String unit=metric.unit();
            return new FinancialFacts.Dimensions(metric.name(),"CONSOLIDATED",metric.balance?"AS_OF":kind,
                    metric.balance?end:start,end,unit,unit.equals("PERCENT")?null:"INR");
        }
        void validate(){
            if(!List.of("QUARTER","FULL_YEAR").contains(kind)||start==null||end==null)throw ApiFailure.invalid();
            FactPolicy.validate(dimensions(Metric.REVENUE),FactPolicy.Scale.ONES);
        }
    }
    record Member(UUID companyId,String name,UUID listingId,String exchange,String symbol,Sector sector,boolean active,int revision,
                  String registeredAt,String reviewedAt) {}
    record MetricSupport(Metric metric,String unit,List<Sector> sectors) {}
    record Directory(String source,List<Member> members,List<MetricSupport> metrics) {}
    record Reading(Metric metric,String reason,FinancialFacts.Fact fact) {}
    record Company(Member member,List<Reading> readings) {}
    record Snapshot(String source,String capturedAt,Period period,List<Company> companies) {}

    private static final String SOURCE="MANUAL_CURRENT";
    private static final String MEMBERS="""
            SELECT m.*,c.name,l.exchange,h.symbol FROM finn.discovery_member m
            JOIN finn.company c USING(owner_id,company_id)
            JOIN finn.listing l USING(owner_id,listing_id)
            JOIN finn.listing_symbol h ON h.owner_id=l.owner_id AND h.listing_id=l.listing_id AND h.valid_to IS NULL
            WHERE m.owner_id=?
            """;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Catalogue catalogue;
    private final FactEvaluation facts;

    DiscoveryUniverse(JdbcTemplate jdbc,CurrentUser users,Catalogue catalogue,FactEvaluation facts){
        this.jdbc=jdbc;this.users=users;this.catalogue=catalogue;this.facts=facts;
    }

    @Transactional public Directory directory(){
        return new Directory(SOURCE,members(users.requireId()),Arrays.stream(Metric.values())
                .map(metric->new MetricSupport(metric,metric.unit(),Arrays.stream(Sector.values()).filter(metric::eligible).toList())).toList());
    }

    @Transactional public Member save(DiscoveryUniverseController.Input input){
        UUID owner=users.requireId();
        var listing=catalogue.listing(owner,input.listingId());
        if(!catalogue.security(owner,listing.securityId()).reviewStatus().equals("USER_CONFIRMED"))
            throw ApiFailure.invalid();
        UUID company=listing.companyId();
        var current=jdbc.query(MEMBERS+" AND m.company_id=?",DiscoveryUniverse::member,owner,company).stream().findFirst().orElse(null);
        if(current==null){
            if(input.expectedRevision()!=null)throw ApiFailure.conflict();
            if(jdbc.queryForObject("SELECT count(*) FROM finn.discovery_member WHERE owner_id=?",Integer.class,owner)>=CAPACITY)
                throw new ApiFailure(429,"DISCOVERY_UNIVERSE_LIMIT");
            jdbc.update("INSERT INTO finn.discovery_member(owner_id,company_id,listing_id,sector,active) VALUES (?,?,?,?,?)",
                    owner,company,input.listingId(),input.sector().name(),input.active());
        }else{
            if(!Integer.valueOf(current.revision()).equals(input.expectedRevision())||current.revision()>=100)throw ApiFailure.conflict();
            jdbc.update("""
                    UPDATE finn.discovery_member SET listing_id=?,sector=?,active=?,revision=revision+1,reviewed_at=clock_timestamp()
                    WHERE owner_id=? AND company_id=?
                    """,input.listingId(),input.sector().name(),input.active(),owner,company);
        }
        return jdbc.queryForObject(MEMBERS+" AND m.company_id=?",DiscoveryUniverse::member,owner,company);
    }

    @Transactional public Snapshot inspect(Period period){return capture(users.requireId(),period);}

    Snapshot capture(UUID owner,Period period){
        period.validate();
        var today=LocalDate.now(FactPolicy.INDIA);
        var now=java.time.Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MICROS).toString();
        var coverage=members(owner).stream().filter(Member::active).map(member->new Company(member,Arrays.stream(Metric.values())
                .map(metric->reading(owner,period,member,metric,today)).toList())).toList();
        return new Snapshot(SOURCE,now,period,coverage);
    }

    private Reading reading(UUID owner,Period period,Member member,Metric metric,LocalDate today){
        if(!metric.eligible(member.sector()))return new Reading(metric,"SECTOR_INELIGIBLE",null);
        var match=facts.match(owner,member.companyId(),period.dimensions(metric),today);
        return new Reading(metric,match.reason(),match.ready()?match.fact():null);
    }

    private List<Member> members(UUID owner){
        return jdbc.query(MEMBERS+" ORDER BY lower(c.name),m.company_id",DiscoveryUniverse::member,owner);
    }

    private static Member member(ResultSet row,int ignored)throws SQLException{
        return new Member(row.getObject("company_id",UUID.class),row.getString("name"),row.getObject("listing_id",UUID.class),
                row.getString("exchange"),row.getString("symbol"),Sector.valueOf(row.getString("sector")),row.getBoolean("active"),
                row.getInt("revision"),instant(row,"registered_at"),instant(row,"reviewed_at"));
    }

    private static String instant(ResultSet row,String column)throws SQLException{
        return row.getObject(column,OffsetDateTime.class).toInstant().toString();
    }
}
