package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.ledger.Journal;
import dev.finn.platform.ApiFailure;
import dev.finn.portfolio.Portfolios;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PortfolioPerformance {
    static final String METHOD="cash-flow-returns-v1";
    record Window(LocalDate start,LocalDate end,boolean reviewed) {}
    record SnapshotRef(UUID accountId,UUID snapshotId,long ledgerRevision,String value) {}
    record Point(LocalDate date,String closingValue,List<SnapshotRef> snapshots) {
        BigDecimal closing(){return new BigDecimal(closingValue);}
    }
    record Flow(LocalDate date,String deposits,String withdrawals,String net) {}
    record CashFlow(LocalDate date,BigDecimal deposits,BigDecimal withdrawals) {
        BigDecimal net(){return deposits.subtract(withdrawals);}
        Flow view(){return new Flow(date,text(deposits),text(withdrawals),text(net()));}
        CashFlow plus(CashFlow flow){return new CashFlow(date,deposits.add(flow.deposits),withdrawals.add(flow.withdrawals));}
    }
    record Result(UUID portfolioId,LocalDate start,LocalDate end,String currency,String methodology,String coverage,
                  Point opening,Point closing,List<Point> flowValuations,List<Flow> externalFlows,String recordedDividends,
                  String investmentResult,PortfolioReturnMath.Measure xirr,PortfolioReturnMath.Measure timeWeighted,String benchmark) {}
    record Inputs(String coverage,Map<LocalDate,Point> points,List<CashFlow> flows,BigDecimal dividends) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Portfolios portfolios;
    private final Journal journal;
    private final ValuationSnapshots snapshots;
    private final Valuations values;

    PortfolioPerformance(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Journal journal,ValuationSnapshots snapshots,Valuations values){
        this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.journal=journal;this.snapshots=snapshots;this.values=values;
    }

    @Transactional public Result report(UUID portfolio,Window window){
        UUID owner=users.requireId();
        var inputs=inputs(owner,portfolio,window);
        var start=window.start();
        var end=window.end();
        var first=inputs.points().get(start);
        var last=inputs.points().get(end);
        var flows=inputs.flows();
        var required=flows.stream().filter(flow->flow.net().signum()!=0).toList();
        var valued=required.stream().map(flow->inputs.points().get(flow.date())).filter(java.util.Objects::nonNull).toList();
        var coverage=inputs.coverage();
        PortfolioReturnMath.Measure xirr,twr;
        String investmentResult=null;
        if(!coverage.equals("REVIEWED_WINDOW")||first==null||last==null){
            if(coverage.equals("REVIEWED_WINDOW"))coverage="ENDPOINT_VALUATIONS_MISSING";
            xirr=PortfolioReturnMath.Measure.unavailable(coverage);
            twr=xirr;
        }else{
            var net=flows.stream().map(CashFlow::net).reduce(BigDecimal.ZERO,BigDecimal::add);
            investmentResult=text(last.closing().subtract(first.closing()).subtract(net));
            xirr=PortfolioReturnMath.xirr(start,first.closing(),end,last.closing(),flows);
            if(valued.size()!=required.size()){
                twr=PortfolioReturnMath.Measure.unavailable("FLOW_DAY_VALUATION_MISSING");
            }else{
                twr=PortfolioReturnMath.timeWeighted(series(inputs,window,List.of(start,end)));
            }
        }
        return new Result(portfolio,start,end,"INR",METHOD,coverage,first,last,valued,flows.stream().map(CashFlow::view).toList(),
                inputs.dividends()==null?null:text(inputs.dividends()),investmentResult,xirr,twr,"NO_COMPATIBLE_BENCHMARK");
    }

    Inputs inputs(UUID owner,UUID portfolio,Window window){
        validate(window);
        var detail=portfolios.detail(owner,portfolio);
        if(!window.reviewed())return gap("HISTORY_UNREVIEWED");
        if(detail.accounts().isEmpty())return gap("NO_ACCOUNTS");
        if(!values.withinBudget(owner,portfolio))return gap("PORTFOLIO_BUDGET");
        var byDate=new TreeMap<LocalDate,List<SnapshotRef>>();
        var flows=new TreeMap<LocalDate,CashFlow>();
        var dividends=BigDecimal.ZERO;
        for(var account:detail.accounts()){
            UUID id=account.accountId();
            long revision=journal.currentRevision(owner,id);
            var before=journal.projectAt(owner,id,window.start(),revision);
            var after=journal.projectAt(owner,id,window.end(),revision);
            if(before.cashBaselineDate()==null||before.cashBalance()==null||after.cashBalance()==null)
                return gap("CASH_HISTORY_INCOMPLETE");
            if(new BigDecimal(before.cashBalance()).signum()<0||new BigDecimal(after.cashBalance()).signum()<0)
                return gap("NEGATIVE_CASH_BALANCE");
            if(hasNewOpening(owner,id,revision,window))return gap("NEW_OPENING_BALANCE");
            for(var point:snapshots.forPerformance(owner,id,window.start(),window.end(),revision)){
                if(point.recordedValue()==null||point.cashBalance()==null||new BigDecimal(point.cashBalance()).signum()<0)continue;
                byDate.computeIfAbsent(point.sessionDate(),date->new ArrayList<>())
                        .add(new SnapshotRef(id,point.snapshotId(),point.ledgerRevision(),point.recordedValue()));
            }
            for(var flow:cashFlows(owner,id,revision,window))flows.merge(flow.date(),flow,CashFlow::plus);
            dividends=dividends.add(new BigDecimal(after.recordedDividends()).subtract(new BigDecimal(before.recordedDividends())));
        }
        var points=new TreeMap<LocalDate,Point>();
        byDate.forEach((date,refs)->{
            if(refs.size()==detail.accounts().size()){
                BigDecimal sum=refs.stream().map(ref->new BigDecimal(ref.value())).reduce(BigDecimal.ZERO,BigDecimal::add);
                points.put(date,new Point(date,text(sum),List.copyOf(refs)));
            }
        });
        return new Inputs("REVIEWED_WINDOW",Map.copyOf(points),List.copyOf(flows.values()),dividends);
    }

    static List<PortfolioReturnMath.Value> series(Inputs inputs,Window window,List<LocalDate> required){
        var dates=new LinkedHashSet<>(required);
        var byDay=new TreeMap<LocalDate,BigDecimal>();
        for(var flow:inputs.flows()){
            if(flow.net().signum()==0)continue;
            dates.add(flow.date());
            byDay.put(flow.date(),flow.net());
        }
        return dates.stream().sorted().map(day->new PortfolioReturnMath.Value(day,inputs.points().get(day).closing(),
                day.equals(window.start())?BigDecimal.ZERO:byDay.getOrDefault(day,BigDecimal.ZERO))).toList();
    }

    private List<CashFlow> cashFlows(UUID owner,UUID account,long revision,Window window){
        return jdbc.query("""
                SELECT e.effective_date,
                   coalesce(sum(e.amount) FILTER(WHERE e.event_type='DEPOSIT'),0) AS deposits,
                   coalesce(sum(e.amount) FILTER(WHERE e.event_type='WITHDRAWAL'),0) AS withdrawals
                FROM finn.ledger_event e
                WHERE e.owner_id=? AND e.account_id=? AND e.sequence<=? AND e.effective_date>? AND e.effective_date<=?
                   AND e.event_type IN ('DEPOSIT','WITHDRAWAL') AND NOT EXISTS(
                    SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=e.owner_id AND r.account_id=e.account_id
                     AND r.reversal_of=e.event_id AND r.sequence<=?)
                GROUP BY e.effective_date ORDER BY e.effective_date
                """,(row,i)->new CashFlow(row.getObject("effective_date",LocalDate.class),row.getBigDecimal("deposits"),
                row.getBigDecimal("withdrawals")),owner,account,revision,window.start(),window.end(),revision);
    }

    private boolean hasNewOpening(UUID owner,UUID account,long revision,Window window){
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.ledger_event e WHERE e.owner_id=? AND e.account_id=? AND e.sequence<=?
                   AND e.effective_date>? AND e.effective_date<=? AND e.event_type IN ('OPENING_CASH','OPENING_POSITION')
                   AND NOT EXISTS(SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=e.owner_id AND r.account_id=e.account_id
                       AND r.reversal_of=e.event_id AND r.sequence<=?))
                """,Boolean.class,owner,account,revision,window.start(),window.end(),revision));
    }

    private static void validate(Window window){
        long days=ChronoUnit.DAYS.between(window.start(),window.end());
        if(days<1||days>366||window.start().isBefore(LocalDate.of(1900,1,1))||!window.end().isBefore(MarketPrices.today()))
            throw ApiFailure.invalid();
    }

    private static Inputs gap(String reason){return new Inputs(reason,Map.of(),List.of(),null);}
    private static String text(BigDecimal number){return PortfolioReturnMath.decimal(number);}
}
