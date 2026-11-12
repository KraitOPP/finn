
package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.ledger.Journal;
import dev.finn.platform.ApiFailure;
import dev.finn.portfolio.Portfolios;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Valuations {
    static final String CALCULATION="finn-valuation-1";
    public record Holding(UUID securityId,String securityName,String quantity,String recordedCost,UUID listingId,
                          boolean allowProviderEstimate,MarketPrices.Observation observation,String value,String unrealisedPnl,String priceStatus) {}
    public record Totals(int positions,int priced,int stalePrices,int providerEstimates,String knownHoldingsValue,
                         String holdingsValue,String knownUnrealisedPnl,String unrealisedPnl,String cashBalance,
                         String portfolioValue,String realisedPnl,String recordedFees,boolean recordedFeesComplete,
                         String recordedDividends,String netContributions) {}
    public record AccountValue(UUID accountId,LocalDate asOf,long ledgerRevision,String calculationVersion,String currency,
                               LocalDate coverageStart,String historyStatus,List<Holding> holdings,Totals totals) {}
    public record AccountTotal(UUID accountId,String name,long ledgerRevision,Totals totals) {}
    public record PortfolioValue(UUID portfolioId,LocalDate asOf,String currency,List<AccountTotal> accounts,Totals totals) {}
    public record Choice(UUID securityId,UUID listingId,boolean allowProviderEstimate) {}
    public record Exposure(LocalDate sessionDate,BigDecimal holdingValue,BigDecimal equityValue,List<UUID> observations) {}
    private record PriceChoice(UUID listingId,boolean allowProviderEstimate,MarketPrices.Observation observation) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Portfolios portfolios;
    private final Catalogue catalogue;
    private final Journal journal;

    Valuations(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Catalogue catalogue,Journal journal){
        this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.catalogue=catalogue;this.journal=journal;
    }

    @Transactional
    public Choice choose(UUID portfolio,UUID account,UUID security,UUID listing,boolean estimate){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,true);catalogue.security(owner,security);
        if(listing==null){
            if(estimate)throw ApiFailure.invalid();
            jdbc.update("DELETE FROM finn.valuation_listing WHERE owner_id=? AND account_id=? AND security_id=?",owner,account,security);
        }else{
            if(!catalogue.listing(owner,listing).securityId().equals(security))throw ApiFailure.invalid();
            if(journal.project(owner,account).positions().stream().noneMatch(row->row.securityId().equals(security)))
                throw new ApiFailure(422,"VALUATION_HOLDING_REQUIRED");
            jdbc.update("""
                    INSERT INTO finn.valuation_listing(owner_id,account_id,security_id,listing_id,allow_provider_estimate)
                    VALUES(?,?,?,?,?) ON CONFLICT(owner_id,account_id,security_id)
                    DO UPDATE SET listing_id=EXCLUDED.listing_id,allow_provider_estimate=EXCLUDED.allow_provider_estimate
                    """,owner,account,security,listing,estimate);
        }
        return new Choice(security,listing,estimate);
    }

    @Transactional
    public AccountValue account(UUID portfolio,UUID account){
        var owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        return calculate(owner,account,MarketPrices.today(),journal.currentRevision(owner,account),false);
    }

    @Transactional
    public PortfolioValue portfolio(UUID id){
        var owner=users.requireId();var detail=portfolios.detail(owner,id);
        if(!withinBudget(owner,id))throw new ApiFailure(422,"PORTFOLIO_VALUATION_BUDGET");
        var today=MarketPrices.today();
        var accounts=detail.accounts().stream().map(a->new AccountTotal(a.accountId(),a.name(),journal.currentRevision(owner,a.accountId()),
                calculate(owner,a.accountId(),today,journal.currentRevision(owner,a.accountId()),false).totals())).toList();
        return new PortfolioValue(id,today,"INR",accounts,combine(accounts.stream().map(AccountTotal::totals).toList()));
    }

    public Exposure exposure(UUID owner,UUID portfolio,UUID security,LocalDate date){
        var detail=portfolios.detail(owner,portfolio);
        if(detail.portfolio().archived() || !withinBudget(owner,portfolio))return null;
        BigDecimal holding=BigDecimal.ZERO, equity=BigDecimal.ZERO;
        LocalDate session=null;
        var observations=new LinkedHashSet<UUID>();
        int positions=0;
        for(var account:detail.accounts()){
            UUID id=account.accountId();
            var current=calculate(owner,id,date,journal.currentRevision(owner,id),false);
            if(current.totals().holdingsValue()==null || positions+current.holdings().size()>500)return null;
            positions+=current.holdings().size();
            for(var row:current.holdings()){
                var quote=row.observation();
                if(quote==null || quote.freshness().equals("STALE"))return null;
                if(session==null)session=quote.sessionDate();
                if(!session.equals(quote.sessionDate()))return null;
                BigDecimal amount=new BigDecimal(row.value());
                equity=equity.add(amount);
                if(row.securityId().equals(security))holding=holding.add(amount);
                observations.add(quote.observationId());
            }
        }
        return equity.signum()>0 ? new Exposure(session,holding,equity,List.copyOf(observations)) : null;
    }

    boolean withinBudget(UUID owner,UUID id){
        int events=Objects.requireNonNull(jdbc.queryForObject("""
                SELECT count(*) FROM (
                    SELECT 1 FROM finn.investment_account a JOIN finn.ledger_event e USING(owner_id,account_id)
                    WHERE a.owner_id=? AND a.portfolio_id=? LIMIT 50001
                ) event_budget
                """,Integer.class,owner,id));
        return events<=50000;
    }

    AccountValue calculate(UUID owner,UUID account,LocalDate date,long revision,boolean exactReviewedClose){
        var ledger=journal.projectAt(owner,account,date,revision);
        Map<UUID,PriceChoice> prices=new HashMap<>();
        // A prior-session price cannot be multiplied by units after a recorded split or bonus.
        jdbc.query("""
                SELECT v.security_id,v.listing_id AS selected_listing,v.allow_provider_estimate,p.*
                FROM finn.valuation_listing v
                LEFT JOIN LATERAL (
                    SELECT max(e.effective_date) AS cutoff FROM finn.ledger_event e
                    WHERE e.owner_id=v.owner_id AND e.account_id=v.account_id AND e.security_id=v.security_id
                    AND e.event_type IN ('SPLIT','BONUS') AND e.effective_date<=? AND e.sequence<=?
                    AND NOT EXISTS(SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=e.owner_id AND r.account_id=e.account_id
                        AND r.reversal_of=e.event_id AND r.sequence<=? AND r.effective_date<=?)
                ) adjustment ON NOT ?
                LEFT JOIN LATERAL (
                    SELECT %s FROM finn.market_observation m
                    WHERE m.owner_id=v.owner_id AND m.listing_id=v.listing_id AND m.session_date<=?
                      AND (adjustment.cutoff IS NULL OR m.session_date>=adjustment.cutoff)
                      AND (NOT ? OR m.session_date=?)
                      AND (m.source='MANUAL_REVIEWED' OR (NOT ? AND v.allow_provider_estimate AND m.session_date>=?))
                    ORDER BY m.session_date DESC,m.source,m.receipt_order DESC LIMIT 1
                ) p ON TRUE WHERE v.owner_id=? AND v.account_id=?
                """.formatted(MarketPrices.SELECT_COLUMNS),row->{
                    var price=row.getObject("observation_id",UUID.class)==null?null:MarketPrices.observationAt(row,date);
                    prices.put(row.getObject("security_id",UUID.class),new PriceChoice(row.getObject("selected_listing",UUID.class),row.getBoolean("allow_provider_estimate"),price));
                },date,revision,revision,date,exactReviewedClose,date,exactReviewedClose,date,exactReviewedClose,MarketPrices.today().minusDays(90),owner,account);
        var holdings=ledger.positions().stream().map(position->holding(position,prices.get(position.securityId()))).toList();
        var totals=totals(ledger,holdings);
        return new AccountValue(account,date,revision,CALCULATION,"INR",ledger.coverageStart(),ledger.historyStatus(),holdings,totals);
    }

    private static Holding holding(Journal.PositionView position,PriceChoice selection){
        var price=selection==null?null:selection.observation();
        BigDecimal value=price==null?null:new BigDecimal(position.quantity()).multiply(new BigDecimal(price.close()));
        BigDecimal pnl=value==null||position.recordedCost()==null?null:value.subtract(new BigDecimal(position.recordedCost()));
        return new Holding(position.securityId(),position.securityName(),position.quantity(),position.recordedCost(),
                selection==null?null:selection.listingId(),selection!=null&&selection.allowProviderEstimate(),
                price,decimal(value),decimal(pnl),selection==null?"LISTING_REQUIRED":price==null?"PRICE_UNAVAILABLE":price.freshness());
    }

    private static Totals totals(Journal.View ledger,List<Holding> holdings){
        int priced=(int)holdings.stream().filter(h->h.value()!=null).count();
        int stale=(int)holdings.stream().filter(h->h.priceStatus().equals("STALE")).count();
        int estimates=(int)holdings.stream().filter(h->h.observation()!=null&&h.observation().source().equals("YAHOO_YFINANCE")).count();
        boolean covered=ledger.coverageStart()!=null;
        String knownValue=sum(holdings,Holding::value,covered), knownGain=sum(holdings,Holding::unrealisedPnl,covered);
        String value=covered&&priced==holdings.size()?knownValue:null;
        String gains=covered&&holdings.stream().allMatch(h->h.unrealisedPnl()!=null)?knownGain:null;
        String cash=ledger.cashBalance();
        return new Totals(holdings.size(),priced,stale,estimates,knownValue,value,knownGain,gains,cash,add(value,cash),
                covered?ledger.realisedPnl():null,covered?ledger.recordedFees():null,covered&&ledger.recordedFeesComplete(),
                covered?ledger.recordedDividends():null,covered?ledger.netContributions():null);
    }

    private static Totals combine(List<Totals> values){
        int positions=values.stream().mapToInt(Totals::positions).sum(), priced=values.stream().mapToInt(Totals::priced).sum();
        int stale=values.stream().mapToInt(Totals::stalePrices).sum(), estimates=values.stream().mapToInt(Totals::providerEstimates).sum();
        return new Totals(positions,priced,stale,estimates,sum(values,Totals::knownHoldingsValue,false),
                complete(values,Totals::holdingsValue),sum(values,Totals::knownUnrealisedPnl,false),complete(values,Totals::unrealisedPnl),
                complete(values,Totals::cashBalance),complete(values,Totals::portfolioValue),complete(values,Totals::realisedPnl),
                sum(values,Totals::recordedFees,false),!values.isEmpty()&&values.stream().allMatch(Totals::recordedFeesComplete),
                complete(values,Totals::recordedDividends),complete(values,Totals::netContributions));
    }

    private static <T> String complete(List<T> rows,Function<T,String> item){
        return rows.isEmpty()||rows.stream().anyMatch(row->item.apply(row)==null)?null:sum(rows,item,false);
    }
    private static <T> String sum(List<T> rows,Function<T,String> item,boolean emptyIsZero){
        var numbers=rows.stream().map(item).filter(Objects::nonNull).map(BigDecimal::new).toList();
        return numbers.isEmpty()&&!(emptyIsZero&&rows.isEmpty())?null:decimal(numbers.stream().reduce(BigDecimal.ZERO,BigDecimal::add));
    }
    private static String add(String a,String b){return a==null||b==null?null:decimal(new BigDecimal(a).add(new BigDecimal(b)));}
    private static String decimal(BigDecimal amount){return amount==null?null:amount.stripTrailingZeros().toPlainString();}
}
