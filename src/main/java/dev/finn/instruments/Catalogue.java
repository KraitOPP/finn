package dev.finn.instruments;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Catalogue {
    public record Company(UUID companyId,String name,String source) {}
    public record Security(UUID securityId,UUID companyId,String companyName,String name,String isin,String reviewStatus) {}
    public record Listing(UUID listingId,UUID securityId,UUID companyId,String exchange,String segment,String series,
                          String symbol,String currency,String isin,String providerSymbol,String reviewStatus,String source,LocalDate validFrom) {}
    public record SecurityDetail(Security security,List<Listing> listings) {}
    public record SecurityPage(List<Security> items,int limit,int offset,boolean hasMore) {}
    public record SymbolHistory(String symbol,LocalDate validFrom,LocalDate validTo,String source) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    public Catalogue(JdbcTemplate jdbc, CurrentUser users) {this.jdbc=jdbc;this.users=users;}
    private static final String SECURITY_SQL="SELECT s.*,c.name company_name FROM finn.security s JOIN finn.company c ON c.company_id=s.company_id AND c.owner_id=s.owner_id ";
    private static final String LISTING_SQL="""
            SELECT l.*,s.company_id,s.isin,h.symbol,h.valid_from,p.provider_symbol
            FROM finn.listing l JOIN finn.security s ON s.security_id=l.security_id AND s.owner_id=l.owner_id
            JOIN finn.listing_symbol h ON h.listing_id=l.listing_id AND h.owner_id=l.owner_id AND h.valid_to IS NULL
            LEFT JOIN finn.provider_symbol_history p ON p.listing_id=l.listing_id AND p.owner_id=l.owner_id AND p.valid_to IS NULL
            """;
    private Security securityRow(ResultSet row,int index) throws SQLException {return new Security(row.getObject("security_id",UUID.class),row.getObject("company_id",UUID.class),row.getString("company_name"),row.getString("name"),row.getString("isin"),row.getString("review_status"));}
    private Listing listingRow(ResultSet row,int index) throws SQLException {return new Listing(row.getObject("listing_id",UUID.class),row.getObject("security_id",UUID.class),row.getObject("company_id",UUID.class),row.getString("exchange"),"CASH_EQUITY",row.getString("series"),row.getString("symbol"),row.getString("currency"),row.getString("isin"),row.getString("provider_symbol"),"USER_CONFIRMED","MANUAL_USER",row.getObject("valid_from",LocalDate.class));}
    public Security security(UUID owner,UUID id) {
        return jdbc.query(SECURITY_SQL+"WHERE s.owner_id=? AND s.security_id=?",this::securityRow,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    public Listing listing(UUID owner,UUID id) {
        return jdbc.query(LISTING_SQL+"WHERE l.owner_id=? AND l.listing_id=?",this::listingRow,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    @Transactional public SecurityPage search(String query,int limit,int offset) {
        UUID owner=users.requireId();
        if(query==null || query.length()>100 || limit<1 || limit>100 || offset<0 || offset>10000) throw ApiFailure.invalid();
        String match="%"+query.strip().replace("\\","\\\\").replace("%","\\%").replace("_","\\_")+"%";
        var rows=jdbc.query(SECURITY_SQL+"WHERE s.owner_id=? AND (s.name ILIKE ? OR s.isin ILIKE ? OR c.name ILIKE ?) ORDER BY lower(s.name),s.security_id LIMIT ? OFFSET ?",this::securityRow,owner,match,match,match,limit+1,offset);
        return new SecurityPage(rows.stream().limit(limit).toList(),limit,offset,rows.size()>limit);
    }
    @Transactional public List<Company> companies() {return jdbc.query("SELECT * FROM finn.company WHERE owner_id=? ORDER BY lower(name),company_id LIMIT 100",(row,index)->new Company(row.getObject("company_id",UUID.class),row.getString("name"),row.getString("source")),users.requireId());}
    @Transactional public Company createCompany(String name) {
        UUID owner=users.requireId(),id=UUID.randomUUID(); name=cleanName(name);
        jdbc.update("INSERT INTO finn.company(company_id,owner_id,name,source) VALUES (?,?,?,'MANUAL_USER')",id,owner,name);
        return new Company(id,name,"MANUAL_USER");
    }
    @Transactional public Security createSecurity(UUID company,String name,String isin,boolean confirmed) {
        UUID owner=users.requireId(),id=UUID.randomUUID();
        if(!confirmed || company==null) throw ApiFailure.invalid();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.company WHERE owner_id=? AND company_id=?",Integer.class,owner,company)!=1) throw ApiFailure.notFound();
        if(isin!=null && !validIsin(isin)) throw ApiFailure.invalid();
        jdbc.update("INSERT INTO finn.security(security_id,owner_id,company_id,name,isin,review_status) VALUES (?,?,?,?,?,'USER_CONFIRMED')",id,owner,company,cleanName(name),isin);
        return security(owner,id);
    }
    @Transactional public SecurityDetail detail(UUID securityId) {
        UUID owner=users.requireId();
        return new SecurityDetail(security(owner,securityId),jdbc.query(LISTING_SQL+"WHERE l.owner_id=? AND l.security_id=? ORDER BY l.exchange,h.symbol,l.listing_id",this::listingRow,owner,securityId));
    }
    @Transactional public Listing addListing(UUID securityId,String exchange,String series,String symbol,String providerSymbol,LocalDate from,boolean confirmed) {
        UUID owner=users.requireId(),id=UUID.randomUUID();
        if(jdbc.queryForList("SELECT security_id FROM finn.security WHERE owner_id=? AND security_id=? FOR UPDATE",owner,securityId).isEmpty()) throw ApiFailure.notFound();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.listing WHERE owner_id=? AND security_id=?",Integer.class,owner,securityId)>=100) throw new ApiFailure(409,"CATALOGUE_LIMIT_REACHED");
        validateSymbols(exchange,series,symbol,providerSymbol,from,confirmed);
        jdbc.update("INSERT INTO finn.listing(listing_id,owner_id,security_id,exchange,series,currency) VALUES (?,?,?,?,?,'INR')",id,owner,securityId,exchange,series);
        symbols(owner,id,exchange,symbol,providerSymbol,from);
        return listing(owner,id);
    }
    @Transactional public Listing changeSymbol(UUID listingId,String symbol,String providerSymbol,LocalDate effective,boolean confirmed) {
        UUID owner=users.requireId();
        if(jdbc.queryForList("SELECT listing_id FROM finn.listing WHERE owner_id=? AND listing_id=? FOR UPDATE",owner,listingId).isEmpty()) throw ApiFailure.notFound();
        Listing current=listing(owner,listingId);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.listing_symbol WHERE owner_id=? AND listing_id=?",Integer.class,owner,listingId)>=100) throw new ApiFailure(409,"CATALOGUE_LIMIT_REACHED");
        validateSymbols(current.exchange(),current.series(),symbol,providerSymbol,effective,confirmed);
        if(!effective.isAfter(current.validFrom())) throw ApiFailure.conflict();
        jdbc.update("UPDATE finn.listing_symbol SET valid_to=? WHERE owner_id=? AND listing_id=? AND valid_to IS NULL",effective,owner,listingId);
        jdbc.update("UPDATE finn.provider_symbol_history SET valid_to=? WHERE owner_id=? AND listing_id=? AND valid_to IS NULL",effective,owner,listingId);
        symbols(owner,listingId,current.exchange(),symbol,providerSymbol,effective);
        return listing(owner,listingId);
    }
    private void symbols(UUID owner,UUID listing,String exchange,String symbol,String providerSymbol,LocalDate from) {
        jdbc.update("INSERT INTO finn.listing_symbol(symbol_id,owner_id,listing_id,exchange,symbol,valid_from,source) VALUES (?,?,?,?,?,?,'MANUAL_USER')",UUID.randomUUID(),owner,listing,exchange,symbol,from);
        if(providerSymbol!=null) jdbc.update("INSERT INTO finn.provider_symbol_history(mapping_id,owner_id,listing_id,provider,provider_symbol,valid_from,source) VALUES (?,?,?,'YAHOO_YFINANCE',?,?,'MANUAL_USER')",UUID.randomUUID(),owner,listing,providerSymbol,from);
    }
    @Transactional public List<SymbolHistory> history(UUID id) {
        UUID owner=users.requireId();listing(owner,id);
        return jdbc.query("SELECT * FROM finn.listing_symbol WHERE owner_id=? AND listing_id=? ORDER BY valid_from LIMIT 100",(row,index)->new SymbolHistory(row.getString("symbol"),row.getObject("valid_from",LocalDate.class),row.getObject("valid_to",LocalDate.class),row.getString("source")),owner,id);
    }
    private static void validateSymbols(String exchange,String series,String symbol,String providerSymbol,LocalDate from,boolean confirmed) {
        if(!confirmed || !("NSE".equals(exchange)||"BSE".equals(exchange)) || series==null || !series.matches("[A-Z0-9_-]{1,16}") || symbol==null || !symbol.matches("[A-Z0-9][A-Z0-9&._-]{0,63}") || from==null || from.isAfter(LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"))) || from.isBefore(LocalDate.of(1900,1,1))) throw ApiFailure.invalid();
        if(providerSymbol!=null && (!providerSymbol.matches("[A-Z0-9][A-Z0-9&._-]{0,63}\\.(NS|BO)") || !providerSymbol.endsWith("NSE".equals(exchange)?".NS":".BO"))) throw ApiFailure.invalid();
    }
    public static String cleanName(String value) {
        if(value==null || value.isBlank() || value.length()>120 || value.codePoints().anyMatch(Character::isISOControl)) throw ApiFailure.invalid();
        return value.strip();
    }
    public static boolean validIsin(String value) {
        return Isin.valid(value);
    }
}
