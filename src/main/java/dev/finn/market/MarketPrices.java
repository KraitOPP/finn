
package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.jobs.JobQueue;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketPrices {
    static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    static final String SELECT_COLUMNS="observation_id,listing_id,session_date,source,price_basis,close,source_ref,received_at";
    public record Observation(UUID observationId,UUID listingId,LocalDate sessionDate,String source,String priceBasis,
                              String currency,String close,String sourceReference,String receivedAt,String freshness) {}
    public record PriceHistory(UUID listingId,LocalDate start,LocalDate endExclusive,List<Observation> observations) {}
    public record Queued(UUID jobId,LocalDate start,LocalDate endExclusive) {}
    public record Fetch(UUID listingId,String exchange,String providerSymbol,LocalDate start,LocalDate endExclusive) {}
    public record Feed(UUID listingId,String yahoo,String officialFiles,String streaming,Observation latest,
                       UUID latestJobId,String latestJobState,String failureCode,String lastAttemptAt,
                       Integer acceptedRows,String lastSuccessAt,Integer knownDelaySeconds) {}

    private final JdbcTemplate jdbc;
    private final Catalogue catalogue;
    private final CurrentUser users;
    private final JobQueue jobs;
    private final YahooProcess yahoo;

    MarketPrices(JdbcTemplate jdbc,Catalogue catalogue,CurrentUser users,JobQueue jobs,YahooProcess yahoo){
        this.jdbc=jdbc;this.catalogue=catalogue;this.users=users;this.jobs=jobs;this.yahoo=yahoo;
    }

    static LocalDate today(){return LocalDate.now(INDIA);}

    @Transactional
    public Observation record(UUID listing,LocalDate date,String closeText,String reference,boolean reviewed){
        UUID owner=users.requireId();
        catalogue.listing(owner,listing);
        if(!reviewed || date==null || date.isBefore(LocalDate.of(1900,1,1)) || !date.isBefore(today())
                || closeText==null || !closeText.matches("(0|[1-9][0-9]{0,15})(\\.[0-9]{1,8})?")
                || reference==null || reference.isBlank() || reference.length()>240 || reference.matches("(?s).*[\\p{C}].*"))
            throw ApiFailure.invalid();
        var close=new BigDecimal(closeText).stripTrailingZeros();
        if(close.signum()<=0)throw ApiFailure.invalid();
        if(!Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.listing_symbol WHERE owner_id=? AND listing_id=? AND valid_from<=? AND (valid_to IS NULL OR valid_to>?))
                """,Boolean.class,owner,listing,date,date)))throw new ApiFailure(422,"LISTING_NOT_EFFECTIVE");
        if(count("SELECT count(*) FROM finn.market_observation WHERE owner_id=? AND source='MANUAL_REVIEWED'",owner)>=30000)
            throw new ApiFailure(429,"REVIEWED_PRICE_LIMIT");
        return store(owner,listing,date,"MANUAL_REVIEWED","AS_REPORTED_EXCHANGE",close,reference.strip(),null,null);
    }

    @Transactional
    public Queued queue(UUID listing,LocalDate start,LocalDate end){
        UUID owner=users.requireId();var info=catalogue.listing(owner,listing);
        if(!yahoo.capability().equals("PRIVATE_DAILY"))throw new ApiFailure(409,"YAHOO_NOT_CONFIGURED");
        var now=today();range(start,end,31);
        if(end.isAfter(now)||start.isBefore(now.minusDays(90)))throw ApiFailure.invalid();
        var request=new Fetch(listing,info.exchange(),info.providerSymbol(),start,end);
        if(!mappingValid(owner,request))throw new ApiFailure(422,"REVIEWED_MAPPING_REQUIRED");
        var pending=jdbc.query("""
                SELECT f.job_id,f.start_date,f.end_exclusive FROM finn.market_fetch f JOIN finn.app_job j USING(owner_id,job_id)
                WHERE f.owner_id=? AND f.listing_id=? AND j.state IN ('QUEUED','RUNNING')
                """,(row,index)->new Queued(row.getObject(1,UUID.class),row.getObject(2,LocalDate.class),row.getObject(3,LocalDate.class)),owner,listing);
        if(!pending.isEmpty()){
            var active=pending.getFirst();
            if(active.start().equals(start)&&active.endExclusive().equals(end))return active;
            throw new ApiFailure(409,"PRICE_REFRESH_ALREADY_PENDING");
        }
        // Serialize global admission across replicas; per-user admission already holds the user row.
        jdbc.query("SELECT pg_advisory_xact_lock(46004001)",row->{});
        if(count("SELECT count(*) FROM finn.market_fetch WHERE created_at>clock_timestamp()-interval '1 hour'")>=30
                || count("SELECT count(*) FROM finn.market_fetch WHERE owner_id=? AND created_at>clock_timestamp()-interval '1 hour'",owner)>=8)
            throw new ApiFailure(429,"PRICE_REFRESH_BUDGET");
        if(count("SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='YAHOO_DAILY_HISTORY' AND state IN ('QUEUED','RUNNING')",owner)>=3
                || count("SELECT count(*) FROM finn.app_job WHERE kind='YAHOO_DAILY_HISTORY' AND state IN ('QUEUED','RUNNING')")>=30)
            throw new ApiFailure(429,"PRICE_REFRESH_BACKLOG");
        var job=jobs.enqueue(owner,JobQueue.Kind.YAHOO_DAILY_HISTORY,listing);
        jdbc.update("""
                INSERT INTO finn.market_fetch(owner_id,job_id,listing_id,exchange,provider_symbol,start_date,end_exclusive)
                VALUES (?,?,?,?,?,?,?)
                """,owner,job,listing,info.exchange(),info.providerSymbol(),start,end);
        return new Queued(job,start,end);
    }

    Fetch input(JobQueue.Claim claim){
        return jdbc.query("""
                SELECT listing_id,exchange,provider_symbol,start_date,end_exclusive FROM finn.market_fetch
                WHERE owner_id=? AND job_id=? AND listing_id=?
                """,(row,index)->new Fetch(row.getObject(1,UUID.class),row.getString(2),row.getString(3),
                row.getObject(4,LocalDate.class),row.getObject(5,LocalDate.class)),claim.ownerId(),claim.jobId(),claim.resourceId())
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    boolean mappingValid(UUID owner,Fetch request){
        if(request.providerSymbol()==null)return false;
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.provider_symbol_history
                WHERE owner_id=? AND listing_id=? AND provider='YAHOO_YFINANCE' AND provider_symbol=?
                AND valid_to IS NULL AND valid_from<=?)
                """,Boolean.class,owner,request.listingId(),request.providerSymbol(),request.start()));
    }

    @Transactional
    public void accept(JobQueue.Claim claim,Fetch request,YahooCandidate.Result result){
        // Serialize with symbol changes before checking the current reviewed mapping again.
        jdbc.query("SELECT listing_id FROM finn.listing WHERE owner_id=? AND listing_id=? FOR SHARE",row->{},claim.ownerId(),request.listingId());
        if(!mappingValid(claim.ownerId(),request)){jobs.reject(claim,"REVIEWED_MAPPING_CHANGED");return;}
        if(!jobs.succeed(claim))return;
        for(var bar:result.bars())store(claim.ownerId(),request.listingId(),bar.date(),"YAHOO_YFINANCE","PROVIDER_DEFINED",
                bar.close(),request.providerSymbol(),bar.payload(),claim.jobId());
        jdbc.update("UPDATE finn.market_fetch SET result_count=? WHERE owner_id=? AND job_id=?",result.bars().size(),claim.ownerId(),claim.jobId());
    }

    private Observation store(UUID owner,UUID listing,LocalDate date,String source,String basis,BigDecimal close,String ref,String bar,UUID job){
        String hash=fingerprint(close.stripTrailingZeros().toPlainString()+"\n"+ref+"\n"+(bar==null?"":bar));
        jdbc.update("""
                INSERT INTO finn.market_observation(observation_id,owner_id,listing_id,session_date,source,price_basis,currency,close,source_ref,provider_bar,job_id,fingerprint)
                VALUES (?,?,?,?,?,?,'INR',?,?,CAST(? AS jsonb),?,?)
                ON CONFLICT(owner_id,listing_id,session_date,source,fingerprint) DO NOTHING
                """,UUID.randomUUID(),owner,listing,date,source,basis,close,ref,bar,job,hash);
        return jdbc.queryForObject("SELECT "+SELECT_COLUMNS+" FROM finn.market_observation WHERE owner_id=? AND listing_id=? AND session_date=? AND source=? AND fingerprint=?",
                MarketPrices::observation,owner,listing,date,source,hash);
    }

    @Transactional
    public PriceHistory history(UUID listing,LocalDate start,LocalDate end){
        UUID owner=users.requireId();catalogue.listing(owner,listing);range(start,end,90);
        return new PriceHistory(listing,start,end,jdbc.query("""
                SELECT DISTINCT ON(session_date,source) %s FROM finn.market_observation
                WHERE owner_id=? AND listing_id=? AND session_date>=? AND session_date<?
                  AND (source='MANUAL_REVIEWED' OR session_date>=?)
                ORDER BY session_date,source,receipt_order DESC
                """.formatted(SELECT_COLUMNS),MarketPrices::observation,owner,listing,start,end,today().minusDays(90)));
    }

    @Transactional
    public Feed feed(UUID listing){
        UUID owner=users.requireId();var info=catalogue.listing(owner,listing);
        String capability=yahoo.capability();
        if(capability.equals("PRIVATE_DAILY")&&info.providerSymbol()==null)capability="REVIEWED_MAPPING_REQUIRED";
        var latest=jdbc.query("""
                SELECT %s FROM finn.market_observation
                WHERE owner_id=? AND listing_id=? AND (source='MANUAL_REVIEWED' OR session_date>=?)
                ORDER BY session_date DESC,source,receipt_order DESC LIMIT 1
                """.formatted(SELECT_COLUMNS),MarketPrices::observation,owner,listing,today().minusDays(90)).stream().findFirst().orElse(null);
        var success=jdbc.queryForObject("""
                SELECT max(j.finished_at) FROM finn.market_fetch f JOIN finn.app_job j USING(owner_id,job_id)
                WHERE f.owner_id=? AND f.listing_id=? AND j.state='SUCCEEDED'
                """,(row,index)->instant(row,1),owner,listing);
        var current=capability;
        return jdbc.query("""
                SELECT j.job_id,j.state,j.failure_code,j.updated_at,f.result_count FROM finn.market_fetch f
                JOIN finn.app_job j USING(owner_id,job_id)
                WHERE f.owner_id=? AND f.listing_id=? ORDER BY f.created_at DESC,f.job_id DESC LIMIT 1
                """,(row,index)->new Feed(listing,current,"UNVERIFIED","UNVERIFIED",latest,row.getObject(1,UUID.class),row.getString(2),
                    row.getString(3),instant(row,4),row.getObject(5,Integer.class),success,null),owner,listing).stream().findFirst()
                .orElseGet(()->new Feed(listing,current,"UNVERIFIED","UNVERIFIED",latest,null,null,null,null,null,success,null));
    }

    static Observation observation(ResultSet row,int index)throws SQLException{
        return observationAt(row,today());
    }
    static Observation observationAt(ResultSet row,LocalDate freshnessReference)throws SQLException{
        LocalDate date=row.getObject("session_date",LocalDate.class);
        return new Observation(row.getObject("observation_id",UUID.class),row.getObject("listing_id",UUID.class),date,row.getString("source"),
                row.getString("price_basis"),"INR",row.getBigDecimal("close").stripTrailingZeros().toPlainString(),
                row.getString("source_ref"),row.getObject("received_at",OffsetDateTime.class).toInstant().toString(),
                date.isBefore(freshnessReference.minusDays(4))?"STALE":"DELAY_UNKNOWN");
    }

    void expireYahoo(){jdbc.execute("SELECT finn.expire_yahoo_observations()");}
    int count(String sql,Object... args){return Objects.requireNonNull(jdbc.queryForObject(sql,Integer.class,args));}
    private static String instant(ResultSet row,int index)throws SQLException{
        var value=row.getObject(index,OffsetDateTime.class);return value==null?null:value.toInstant().toString();
    }
    static void range(LocalDate start,LocalDate end,int maxDays){
        if(start==null||end==null||start.isBefore(LocalDate.of(1900,1,1))||end.isAfter(today().plusDays(1))
                ||end.isAfter(start.plusDays(maxDays))||!end.isAfter(start))throw ApiFailure.invalid();
    }
    static String fingerprint(String value){
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(java.security.NoSuchAlgorithmException failure){throw new IllegalStateException(failure);}
    }
}
