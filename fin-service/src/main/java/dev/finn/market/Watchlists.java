
package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Watchlists {
    public record Summary(UUID watchlistId,String name) {}
    public record Index(List<Summary> items) {}
    public record Item(UUID listingId,UUID securityId,String securityName,String exchange,String symbol,MarketPrices.Observation latest) {}
    public record Detail(Summary watchlist,List<Item> items) {}
    private final JdbcTemplate jdbc;
    private final Catalogue catalogue;
    private final CurrentUser users;
    Watchlists(JdbcTemplate jdbc,Catalogue catalogue,CurrentUser users){this.jdbc=jdbc;this.catalogue=catalogue;this.users=users;}

    @Transactional public Index index(){
        return new Index(jdbc.query("SELECT watchlist_id,name FROM finn.watchlist WHERE owner_id=? ORDER BY lower(name),watchlist_id LIMIT 20",
                (row,i)->new Summary(row.getObject(1,UUID.class),row.getString(2)),users.requireId()));
    }

    @Transactional public Summary create(String name){
        var owner=users.requireId();var normalized=Catalogue.cleanName(name);
        if(normalized.length()>80)throw ApiFailure.invalid();
        var previous=jdbc.query("SELECT watchlist_id,name FROM finn.watchlist WHERE owner_id=? AND lower(name)=lower(?)",
                (row,i)->new Summary(row.getObject(1,UUID.class),row.getString(2)),owner,normalized).stream().findFirst().orElse(null);
        if(previous!=null)return previous;
        if(Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM finn.watchlist WHERE owner_id=?",Integer.class,owner))>=20)
            throw new ApiFailure(429,"WATCHLIST_LIMIT");
        var id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.watchlist(watchlist_id,owner_id,name) VALUES (?,?,?)",id,owner,normalized);
        return new Summary(id,normalized);
    }

    @Transactional public Detail detail(UUID id){return detail(users.requireId(),id);}

    @Transactional public Detail setItem(UUID id,UUID listing,boolean tracked){
        var owner=users.requireId();require(owner,id);catalogue.listing(owner,listing);
        if(tracked){
            if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM finn.watchlist_item WHERE owner_id=? AND watchlist_id=? AND listing_id=?)",
                    Boolean.class,owner,id,listing))){
                if(Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM finn.watchlist_item WHERE owner_id=? AND watchlist_id=?",Integer.class,owner,id))>=100)
                    throw new ApiFailure(429,"WATCHLIST_ITEM_LIMIT");
                jdbc.update("INSERT INTO finn.watchlist_item(owner_id,watchlist_id,listing_id) VALUES (?,?,?)",owner,id,listing);
            }
        }else jdbc.update("DELETE FROM finn.watchlist_item WHERE owner_id=? AND watchlist_id=? AND listing_id=?",owner,id,listing);
        return detail(owner,id);
    }

    private Summary require(UUID owner,UUID id){
        return jdbc.query("SELECT watchlist_id,name FROM finn.watchlist WHERE owner_id=? AND watchlist_id=?",
                (row,i)->new Summary(row.getObject(1,UUID.class),row.getString(2)),owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    private Detail detail(UUID owner,UUID id){
        var watchlist=require(owner,id);
        var items=jdbc.query("""
                SELECT l.listing_id AS tracked_listing,l.security_id,l.exchange,s.name AS security_name,h.symbol,p.*
                FROM finn.watchlist_item w JOIN finn.listing l USING(owner_id,listing_id)
                JOIN finn.security s ON s.owner_id=l.owner_id AND s.security_id=l.security_id
                JOIN finn.listing_symbol h ON h.owner_id=l.owner_id AND h.listing_id=l.listing_id AND h.valid_to IS NULL
                LEFT JOIN LATERAL (
                    SELECT %s FROM finn.market_observation m WHERE m.owner_id=w.owner_id AND m.listing_id=w.listing_id
                        AND (m.source='MANUAL_REVIEWED' OR m.session_date>=?)
                    ORDER BY m.session_date DESC,m.source,m.receipt_order DESC LIMIT 1
                ) p ON TRUE
                WHERE w.owner_id=? AND w.watchlist_id=? ORDER BY w.added_at,w.listing_id LIMIT 100
                """.formatted(MarketPrices.SELECT_COLUMNS),(row,i)->new Item(row.getObject("tracked_listing",UUID.class),row.getObject("security_id",UUID.class),
                    row.getString("security_name"),row.getString("exchange"),row.getString("symbol"),
                    row.getObject("observation_id",UUID.class)==null?null:MarketPrices.observation(row,i)),MarketPrices.today().minusDays(90),owner,id);
        return new Detail(watchlist,items);
    }
}
