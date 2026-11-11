
package dev.finn.market;

import dev.finn.identity.CurrentUser;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MarketDiagnostics {
    public record Coverage(int trackedListings,int withClose,int recentClose) {}
    public record Quota(int requestsLastHour,int hourlyLimit,int remaining,int pending,int pendingLimit,String status) {}
    public record Run(UUID jobId,UUID listingId,String symbol,String exchange,String state,String failureCode,
                      String updatedAt,Integer rowsReturned) {}
    public record View(String yahooCapability,String officialFiles,String streaming,String providerDelay,String providerQuota,
                       String lastSuccessfulAcquisition,int sourceValidationFailuresLastDay,int failedRunsLastDay,
                       Coverage coverage,Quota quota,List<Run> recentRuns) {}
    private record Counters(int hourly,int pending,int invalid,int failures) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final YahooProcess yahoo;
    MarketDiagnostics(JdbcTemplate jdbc,CurrentUser users,YahooProcess yahoo){this.jdbc=jdbc;this.users=users;this.yahoo=yahoo;}

    @Transactional public View report(){
        var owner=users.requireId();
        var coverage=jdbc.queryForObject("""
                WITH tracked AS (SELECT DISTINCT listing_id FROM finn.watchlist_item WHERE owner_id=?)
                SELECT count(*),count(latest.session_date),count(*) FILTER(WHERE latest.session_date>=?)
                FROM tracked LEFT JOIN LATERAL (
                    SELECT session_date FROM finn.market_observation WHERE owner_id=? AND listing_id=tracked.listing_id
                        AND (source='MANUAL_REVIEWED' OR session_date>=?)
                    ORDER BY session_date DESC LIMIT 1
                ) latest ON TRUE
                """,(row,i)->new Coverage(row.getInt(1),row.getInt(2),row.getInt(3)),
                owner,MarketPrices.today().minusDays(4),owner,MarketPrices.today().minusDays(90));
        var counts=jdbc.queryForObject("""
                SELECT
                  (SELECT count(*) FROM finn.market_fetch f WHERE f.owner_id=? AND f.created_at>clock_timestamp()-interval '1 hour'),
                  (SELECT count(*) FROM finn.app_job j WHERE j.owner_id=? AND j.kind='YAHOO_DAILY_HISTORY' AND j.state IN ('QUEUED','RUNNING')),
                  count(*) FILTER(WHERE j.failure_code='SOURCE_VALIDATION_FAILED'),
                  count(*) FILTER(WHERE j.state='FAILED')
                FROM finn.app_job j WHERE j.owner_id=? AND j.kind='YAHOO_DAILY_HISTORY'
                  AND j.finished_at>clock_timestamp()-interval '24 hours'
                """,(row,i)->new Counters(row.getInt(1),row.getInt(2),row.getInt(3),row.getInt(4)),owner,owner,owner);
        var success=jdbc.queryForObject("""
                SELECT max(j.finished_at) FROM finn.market_fetch f JOIN finn.app_job j USING(owner_id,job_id)
                WHERE f.owner_id=? AND f.result_count IS NOT NULL AND j.state='SUCCEEDED'
                """,(row,i)->instant(row,1),owner);
        var recent=jdbc.query("""
                SELECT f.job_id,f.listing_id,f.provider_symbol,f.exchange,j.state,j.failure_code,j.updated_at,f.result_count
                FROM finn.market_fetch f JOIN finn.app_job j USING(owner_id,job_id)
                WHERE f.owner_id=? ORDER BY f.created_at DESC,f.job_id DESC LIMIT 15
                """,(row,i)->new Run(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getString(3),row.getString(4),
                row.getString(5),row.getString(6),instant(row,7),row.getObject(8,Integer.class)),owner);
        int remaining=Math.max(0,MarketPrices.OWNER_HOURLY-counts.hourly());
        var quota=new Quota(counts.hourly(),MarketPrices.OWNER_HOURLY,remaining,counts.pending(),MarketPrices.OWNER_PENDING,
                remaining==0?"HOURLY_LIMIT_REACHED":counts.pending()>=MarketPrices.OWNER_PENDING?"PENDING_LIMIT_REACHED":"AVAILABLE");
        return new View(yahoo.capability(),"UNVERIFIED","UNVERIFIED","UNKNOWN","UNKNOWN",success,counts.invalid(),counts.failures(),coverage,quota,recent);
    }

    private static String instant(ResultSet row,int index)throws SQLException{
        var value=row.getObject(index,OffsetDateTime.class);return value==null?null:value.toInstant().toString();
    }
}
