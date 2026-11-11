
package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.ledger.Journal;
import dev.finn.platform.ApiFailure;
import dev.finn.portfolio.Portfolios;
import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class ValuationSnapshots {
    public record Point(UUID snapshotId,LocalDate sessionDate,long ledgerRevision,String calculationVersion,
                        String priceBasis,String status,String holdingsValue,String cashBalance,String recordedValue,String recordedAt) {}
    public record Series(LocalDate start,LocalDate endExclusive,List<Point> points) {}
    public record Detail(Point snapshot,Valuations.AccountValue valuation) {}
    private record Saved(Point point,String hash) {}
    private static final String COLUMNS="snapshot_id,session_date,ledger_revision,calculation_version,price_basis,status,holdings_value,cash_balance,recorded_value,recorded_at";
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Portfolios portfolios;
    private final Journal journal;
    private final Valuations values;
    private final JsonMapper json;

    ValuationSnapshots(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Journal journal,Valuations values,JsonMapper json){
        this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.journal=journal;this.values=values;this.json=json;
    }

    @Transactional
    public Series build(UUID portfolio,UUID account,LocalDate start,LocalDate end){
        var owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,true);
        MarketPrices.range(start,end,14);
        if(end.isAfter(MarketPrices.today()))throw ApiFailure.invalid();
        long revision=journal.currentRevision(owner,account);
        var boundary=journal.projectAt(owner,account,MarketPrices.today(),revision).coverageStart();
        int remaining=5000-Objects.requireNonNull(jdbc.queryForObject("SELECT count(*) FROM finn.valuation_snapshot WHERE owner_id=? AND account_id=?",Integer.class,owner,account));
        var output=new ArrayList<Point>();
        for(var date=start;date.isBefore(end);date=date.plusDays(1)){
            var value=boundary==null||date.isBefore(boundary)?null:values.calculate(owner,account,date,revision,true);
            var totals=value==null?null:value.totals();
            var state=totals==null?"BEFORE_COVERAGE":totals.holdingsValue()==null?"PRICES_MISSING":
                    totals.portfolioValue()==null?"CASH_UNKNOWN":"RECORDED_VALUE";
            String data=value==null?null:json.writeValueAsString(value);
            String hash=MarketPrices.fingerprint(Valuations.CALCULATION+"|"+revision+"|"+state+"|"+data);
            var prior=jdbc.query("SELECT "+COLUMNS+",fingerprint FROM finn.valuation_snapshot WHERE owner_id=? AND account_id=? AND session_date=? ORDER BY receipt_order DESC LIMIT 1",
                    (row,index)->new Saved(point(row,index),row.getString("fingerprint")),owner,account,date).stream().findFirst().orElse(null);
            if(prior!=null&&prior.hash().equals(hash)){output.add(prior.point());continue;}
            if(remaining--<=0)throw new ApiFailure(429,"VALUATION_SNAPSHOT_LIMIT");
            UUID id=UUID.randomUUID();
            output.add(jdbc.queryForObject("""
                    INSERT INTO finn.valuation_snapshot(snapshot_id,owner_id,account_id,session_date,ledger_revision,calculation_version,
                        price_basis,status,valuation,fingerprint,holdings_value,cash_balance,recorded_value)
                    VALUES (?,?,?,?,?,?,'AS_REPORTED_EXCHANGE',?,CAST(? AS jsonb),?,?,?,?) RETURNING %s
                    """.formatted(COLUMNS),ValuationSnapshots::point,id,owner,account,date,revision,Valuations.CALCULATION,state,data,hash,
                    totals==null?null:number(totals.holdingsValue()),totals==null?null:number(totals.cashBalance()),
                    totals==null?null:number(totals.portfolioValue())));
        }
        return new Series(start,end,List.copyOf(output));
    }

    @Transactional
    public Series history(UUID portfolio,UUID account,LocalDate start,LocalDate end){
        var owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);MarketPrices.range(start,end,90);
        var points=jdbc.query("SELECT DISTINCT ON(session_date) "+COLUMNS+"""
                 FROM finn.valuation_snapshot WHERE owner_id=? AND account_id=? AND session_date>=? AND session_date<?
                 ORDER BY session_date,receipt_order DESC
                """,ValuationSnapshots::point,owner,account,start,end);
        return new Series(start,end,points);
    }

    @Transactional
    public Detail detail(UUID portfolio,UUID account,UUID id){
        var owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        return jdbc.query("SELECT "+COLUMNS+",valuation FROM finn.valuation_snapshot WHERE owner_id=? AND account_id=? AND snapshot_id=?",
                (row,index)->{String value=row.getString("valuation");return new Detail(point(row,index),value==null?null:json.readValue(value,Valuations.AccountValue.class));},
                owner,account,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Point point(ResultSet row,int index)throws SQLException{
        return new Point(row.getObject("snapshot_id",UUID.class),row.getObject("session_date",LocalDate.class),row.getLong("ledger_revision"),
                row.getString("calculation_version"),row.getString("price_basis"),row.getString("status"),
                text(row.getBigDecimal("holdings_value")),text(row.getBigDecimal("cash_balance")),text(row.getBigDecimal("recorded_value")),
                row.getObject("recorded_at",OffsetDateTime.class).toInstant().toString());
    }
    private static String text(BigDecimal value){return value==null?null:value.stripTrailingZeros().toPlainString();}
    private static BigDecimal number(String value){return value==null?null:new BigDecimal(value);}
}
