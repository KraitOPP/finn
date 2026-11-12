package dev.finn.market;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.TreeMap;

final class PortfolioReturnMath {
    static final MathContext PRECISION=MathContext.DECIMAL128;
    private static final BigDecimal HUNDRED=BigDecimal.valueOf(100);

    record Measure(String state,String reason,String percent) {
        static Measure unavailable(String reason){return new Measure("UNAVAILABLE",reason,null);}
        static Measure available(BigDecimal fraction){
            return new Measure("AVAILABLE","CALCULATED",decimal(fraction.multiply(HUNDRED).setScale(6,RoundingMode.HALF_EVEN)));
        }
    }

    record Value(LocalDate date,BigDecimal closing,BigDecimal externalFlow) {}

    private PortfolioReturnMath(){}

    static Measure timeWeighted(List<Value> values){
        BigDecimal growth=BigDecimal.ONE;
        for(int i=1;i<values.size();i++){
            var factor=growthFactor(values.get(i-1).closing(),values.get(i));
            if(factor==null)return Measure.unavailable("NON_POSITIVE_BASE");
            growth=growth.multiply(factor,PRECISION);
        }
        return Measure.available(growth.subtract(BigDecimal.ONE));
    }

    static BigDecimal growthFactor(BigDecimal prior,Value current){
        var adjusted=current.closing().subtract(current.externalFlow());
        if(prior.signum()<=0||adjusted.signum()<0)return null;
        return adjusted.divide(prior,PRECISION);
    }

    static Measure xirr(LocalDate start,BigDecimal opening,LocalDate end,BigDecimal ending,
                        List<PortfolioPerformance.CashFlow> flows){
        var signed=new TreeMap<LocalDate,BigDecimal>();
        signed.put(start,opening.negate());
        for(var flow:flows)signed.merge(flow.date(),flow.net().negate(),BigDecimal::add);
        signed.merge(end,ending,BigDecimal::add);
        var series=signed.entrySet().stream().filter(entry->entry.getValue().signum()!=0).toList();
        int changes=0;
        for(int i=1;i<series.size();i++){
            if(series.get(i-1).getValue().signum()!=series.get(i).getValue().signum())changes++;
        }
        if(changes==0)return Measure.unavailable("CASH_FLOW_SIGNS");
        // With a single sign change the discounted flow sum can cross zero at most once.
        if(changes>1)return Measure.unavailable("AMBIGUOUS_CASH_FLOWS");
        var largest=series.stream().map(entry->entry.getValue().abs()).max(BigDecimal::compareTo).orElseThrow();
        var coefficients=series.stream().mapToDouble(entry->entry.getValue().divide(largest,PRECISION).doubleValue()).toArray();
        var years=series.stream().mapToDouble(entry->ChronoUnit.DAYS.between(start,entry.getKey())/365.0).toArray();
        double low=-24,high=24;
        double atLow=discounted(coefficients,years,low),atHigh=discounted(coefficients,years,high);
        if(Math.signum(atLow)==Math.signum(atHigh))return Measure.unavailable("OUTSIDE_SOLVER_RANGE");
        for(int i=0;i<100;i++){
            double middle=(low+high)/2;
            double value=discounted(coefficients,years,middle);
            if(value==0)return Measure.available(BigDecimal.valueOf(Math.expm1(middle)));
            if(Math.signum(value)==Math.signum(atLow))low=middle;
            else high=middle;
        }
        return Measure.available(BigDecimal.valueOf(Math.expm1((low+high)/2)));
    }

    private static double discounted(double[] coefficients,double[] years,double logRate){
        double sum=0;
        for(int i=0;i<years.length;i++)sum+=coefficients[i]*Math.exp(-logRate*years[i]);
        return sum;
    }

    static String decimal(BigDecimal value){return value.stripTrailingZeros().toPlainString();}
}
