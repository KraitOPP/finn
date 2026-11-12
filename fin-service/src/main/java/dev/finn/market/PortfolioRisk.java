package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static dev.finn.market.PortfolioReturnMath.PRECISION;

@Service
class PortfolioRisk {
    static final String METHOD="weekly-linked-risk-v1";
    record Observation(LocalDate date,String indexValue) {}
    record Result(UUID portfolioId,LocalDate start,LocalDate end,String methodology,String state,String reason,
                  String maxDrawdownPercent,String annualizedVolatilityPercent,List<Observation> observations) {}
    record Statistics(String drawdown,String volatility,List<Observation> observations) {}
    private final CurrentUser users;
    private final PortfolioPerformance performance;

    PortfolioRisk(CurrentUser users,PortfolioPerformance performance){this.users=users;this.performance=performance;}

    @Transactional public Result report(UUID portfolio,PortfolioPerformance.Window window){
        var owner=users.requireId();
        long days=ChronoUnit.DAYS.between(window.start(),window.end());
        if(days<56||days>364||days%7!=0)throw new ApiFailure(422,"WEEKLY_WINDOW_REQUIRED");
        var inputs=performance.inputs(owner,portfolio,window);
        if(!inputs.coverage().equals("REVIEWED_WINDOW"))return gap(portfolio,window,inputs.coverage());
        Set<LocalDate> weeks=window.start().datesUntil(window.end().plusDays(1),java.time.Period.ofWeeks(1)).collect(Collectors.toSet());
        if(!inputs.points().keySet().containsAll(weeks))return gap(portfolio,window,"WEEKLY_VALUATIONS_MISSING");
        if(inputs.flows().stream().filter(flow->flow.net().signum()!=0).anyMatch(flow->!inputs.points().containsKey(flow.date())))
            return gap(portfolio,window,"FLOW_DAY_VALUATION_MISSING");
        var stats=statistics(PortfolioPerformance.series(inputs,window,List.copyOf(weeks)),weeks);
        if(stats==null)return gap(portfolio,window,"NON_POSITIVE_BASE");
        return new Result(portfolio,window.start(),window.end(),METHOD,"AVAILABLE","CALCULATED",stats.drawdown(),stats.volatility(),stats.observations());
    }

    static Statistics statistics(List<PortfolioReturnMath.Value> values,Set<LocalDate> weeklyDates){
        var observations=new ArrayList<Observation>();
        var returns=new ArrayList<BigDecimal>();
        BigDecimal index=BigDecimal.valueOf(100),peak=index,drawdown=BigDecimal.ZERO,weekly=BigDecimal.ONE;
        observations.add(new Observation(values.getFirst().date(),"100"));
        for(int i=1;i<values.size();i++){
            var point=values.get(i);
            var factor=PortfolioReturnMath.growthFactor(values.get(i-1).closing(),point);
            if(factor==null)return null;
            weekly=weekly.multiply(factor,PRECISION);
            if(weeklyDates.contains(point.date())){
                index=index.multiply(weekly,PRECISION);
                peak=peak.max(index);
                drawdown=drawdown.max(peak.subtract(index).divide(peak,PRECISION));
                observations.add(new Observation(point.date(),PortfolioReturnMath.decimal(index.setScale(8,java.math.RoundingMode.HALF_EVEN))));
                returns.add(weekly.subtract(BigDecimal.ONE));
                weekly=BigDecimal.ONE;
            }
        }
        BigDecimal count=BigDecimal.valueOf(returns.size());
        var average=returns.stream().reduce(BigDecimal.ZERO,BigDecimal::add).divide(count,PRECISION);
        var variance=returns.stream().map(value->value.subtract(average).pow(2,PRECISION))
                .reduce(BigDecimal.ZERO,BigDecimal::add).divide(count.subtract(BigDecimal.ONE),PRECISION);
        var annualized=variance.multiply(BigDecimal.valueOf(52),PRECISION).sqrt(PRECISION);
        return new Statistics(PortfolioReturnMath.Measure.available(drawdown).percent(),PortfolioReturnMath.Measure.available(annualized).percent(),
                List.copyOf(observations));
    }

    private static Result gap(UUID portfolio,PortfolioPerformance.Window window,String reason){
        return new Result(portfolio,window.start(),window.end(),METHOD,"UNAVAILABLE",reason,null,null,List.of());
    }
}
