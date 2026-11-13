package dev.finn.market;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class HoldingContribution {
    record Holding(UUID securityId,String name,String openingValue,String closingValue,String netTradeCash,
                   String dividends,String contribution) {}
    record Breakdown(String state,List<Holding> holdings,String standaloneFees) {}
    private static final int LIMIT=500;

    private static final class Row {
        private final String name;
        private BigDecimal opening=BigDecimal.ZERO, closing=BigDecimal.ZERO, trades=BigDecimal.ZERO, dividends=BigDecimal.ZERO;

        Row(String name){this.name=name;}
        BigDecimal contribution(){return closing.subtract(opening).add(trades).add(dividends);}
        Holding result(UUID security){
            return new Holding(security,name,decimal(opening),decimal(closing),decimal(trades),decimal(dividends),decimal(contribution()));
        }
    }

    private final JdbcTemplate jdbc;
    private final ValuationSnapshots snapshots;

    HoldingContribution(JdbcTemplate jdbc,ValuationSnapshots snapshots){this.jdbc=jdbc;this.snapshots=snapshots;}

    Breakdown calculate(UUID owner,PortfolioPerformance.Point opening,PortfolioPerformance.Point closing,BigDecimal expected){
        var closeByAccount=closing.snapshots().stream().collect(Collectors.toMap(PortfolioPerformance.SnapshotRef::accountId,Function.identity()));
        var rows=new HashMap<UUID,Row>();
        var fees=BigDecimal.ZERO;
        for(var first:opening.snapshots()){
            var last=closeByAccount.get(first.accountId());
            if(last==null||first.ledgerRevision()!=last.ledgerRevision())return unavailable("INPUT_MISMATCH");
            var before=snapshots.detailForAccount(owner,first.accountId(),first.snapshotId()).valuation();
            var after=snapshots.detailForAccount(owner,last.accountId(),last.snapshotId()).valuation();
            if(before==null||after==null)return unavailable("INPUT_MISMATCH");
            if(!addValues(rows,before.holdings(),after.holdings()))return unavailable("LISTING_CHANGED");
            fees=fees.add(addCash(owner,first,opening.date(),closing.date(),rows));
            if(rows.size()>LIMIT)return unavailable("HOLDING_LIMIT");
        }
        var total=rows.values().stream().map(Row::contribution).reduce(BigDecimal.ZERO,BigDecimal::add).subtract(fees);
        if(total.compareTo(expected)!=0)return unavailable("INPUT_MISMATCH");
        var items=rows.entrySet().stream()
                .sorted(Comparator.comparing((Map.Entry<UUID,Row> entry)->entry.getValue().contribution().abs()).reversed()
                        .thenComparing(Map.Entry::getKey))
                .map(entry->entry.getValue().result(entry.getKey())).toList();
        return new Breakdown("AVAILABLE",items,decimal(fees));
    }

    private static boolean addValues(Map<UUID,Row> rows,List<Valuations.Holding> before,List<Valuations.Holding> after){
        var openListings=new HashMap<UUID,UUID>();
        for(var holding:before){
            openListings.put(holding.securityId(),holding.listingId());
            var row=rows.computeIfAbsent(holding.securityId(),id->new Row(holding.securityName()));
            row.opening=row.opening.add(new BigDecimal(holding.value()));
        }
        for(var holding:after){
            var listing=openListings.get(holding.securityId());
            if(listing!=null&&!listing.equals(holding.listingId()))return false;
            var row=rows.computeIfAbsent(holding.securityId(),id->new Row(holding.securityName()));
            row.closing=row.closing.add(new BigDecimal(holding.value()));
        }
        return true;
    }

    private BigDecimal addCash(UUID owner,PortfolioPerformance.SnapshotRef account,LocalDate start,LocalDate end,Map<UUID,Row> rows){
        return jdbc.query("""
                SELECT e.security_id,s.name,
                    coalesce(sum(CASE e.event_type WHEN 'BUY' THEN -e.quantity*e.price-e.fees
                        WHEN 'SELL' THEN e.quantity*e.price-e.fees END),0) AS trade_cash,
                    coalesce(sum(e.amount) FILTER(WHERE e.event_type='DIVIDEND'),0) AS dividends,
                    coalesce(sum(e.amount) FILTER(WHERE e.event_type='FEE'),0) AS standalone_fees
                FROM finn.ledger_event e LEFT JOIN finn.security s USING(owner_id,security_id)
                WHERE e.owner_id=? AND e.account_id=? AND e.sequence<=? AND e.effective_date>? AND e.effective_date<=?
                    AND e.event_type IN ('BUY','SELL','DIVIDEND','FEE') AND NOT EXISTS(
                        SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=e.owner_id AND r.account_id=e.account_id
                            AND r.reversal_of=e.event_id AND r.sequence<=?)
                GROUP BY e.security_id,s.name
                """,result->{
            var fees=BigDecimal.ZERO;
            while(result.next()){
                var security=result.getObject("security_id",UUID.class);
                if(security==null){
                    fees=fees.add(result.getBigDecimal("standalone_fees"));
                }else{
                    var name=result.getString("name");
                    var row=rows.computeIfAbsent(security,id->new Row(name));
                    row.trades=row.trades.add(result.getBigDecimal("trade_cash"));
                    row.dividends=row.dividends.add(result.getBigDecimal("dividends"));
                }
            }
            return fees;
        },owner,account.accountId(),account.ledgerRevision(),start,end,account.ledgerRevision());
    }

    private static Breakdown unavailable(String state){return new Breakdown(state,List.of(),null);}
    private static String decimal(BigDecimal amount){return PortfolioReturnMath.decimal(amount);}
}
