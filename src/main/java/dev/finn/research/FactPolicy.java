
package dev.finn.research;

import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.Set;
import java.util.regex.Pattern;
import tools.jackson.databind.JsonNode;

final class FactPolicy {
    static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    enum Metric {
        REVENUE, EBITDA, PROFIT_AFTER_TAX, CASH_FROM_OPERATIONS, CAPITAL_EXPENDITURE, FREE_CASH_FLOW,
        TOTAL_DEBT, TOTAL_EQUITY, EPS_BASIC, OPERATING_MARGIN;

        String unit() {
            return switch(this){
                case EPS_BASIC -> "PER_SHARE";
                case OPERATING_MARGIN -> "PERCENT";
                default -> "MONEY";
            };
        }

        boolean stock() { return this==TOTAL_DEBT||this==TOTAL_EQUITY; }
    }

    enum Scale {
        ONES(0), THOUSAND(3), LAKH(5), MILLION(6), CRORE(7), BILLION(9);
        private final int power;
        Scale(int power){this.power=power;}
        BigDecimal normalize(BigDecimal value){return value.scaleByPowerOfTen(power);}
    }

    private static final Pattern NUMBER=Pattern.compile("(?<![\\p{L}\\p{N}.,])(?:\\([0-9][0-9,.]*\\)|[+\\-−]?[0-9][0-9,]*(?:\\.[0-9]+)?)(?![\\p{L}\\p{N}.,])");
    private static final Set<String> CURRENCIES=Set.of("INR","USD","EUR","GBP","JPY");

    private FactPolicy(){}

    static void validate(FinancialFacts.Dimensions dimensions,Scale scale) {
        validateTarget(dimensions,scale);
        if(dimensions.periodEnd().isAfter(LocalDate.now(INDIA)))throw ApiFailure.invalid();
    }

    static void validateTarget(FinancialFacts.Dimensions dimensions,Scale scale) {
        var metric=Metric.valueOf(dimensions.metric());
        if(!metric.unit().equals(dimensions.unit()) || !dimensions.unit().equals("MONEY")&&scale!=Scale.ONES)
            throw ApiFailure.invalid();
        String currency=dimensions.currency();
        if(metric.unit().equals("PERCENT")?currency!=null:currency==null||!CURRENCIES.contains(currency))throw ApiFailure.invalid();
        var start=dimensions.periodStart();
        var end=dimensions.periodEnd();
        long days=ChronoUnit.DAYS.between(start,end)+1;
        if(start.isBefore(LocalDate.of(1900,1,1))||end.isAfter(LocalDate.now(INDIA).plusYears(10))||days<1||days>400)
            throw ApiFailure.invalid();
        if(metric.stock()!=dimensions.periodKind().equals("AS_OF"))throw ApiFailure.invalid();
        boolean valid=switch(dimensions.periodKind()){
            case "QUARTER" -> days>=75&&days<=105;
            case "FULL_YEAR" -> days>=350&&days<=380;
            case "YTD" -> days>1;
            case "AS_OF" -> days==1;
            default -> false;
        };
        if(!valid)throw ApiFailure.invalid();
    }

    static BigDecimal parseAmount(JsonNode value) {
        if(!value.isString()||!value.asText().matches("-?(0|[1-9][0-9]{0,21})(\\.[0-9]{1,8})?"))throw ApiFailure.invalid();
        return new BigDecimal(value.asText());
    }

    static boolean containsAmount(String source,BigDecimal amount) {
        var matches=NUMBER.matcher(source);
        while(matches.find()){
            String token=matches.group().replace(",","").replace('−','-');
            if(token.startsWith("("))token="-"+token.substring(1,token.length()-1);
            try {
                if(new BigDecimal(token).compareTo(amount)==0)return true;
            }catch(NumberFormatException ignored){/* Unrecognized printed form. */}
        }
        return false;
    }


    static boolean sameSeries(FinancialFacts.Dimensions left,FinancialFacts.Dimensions right) {
        return left.metric().equals(right.metric())&&compatible(left,right);
    }

    static boolean compatible(FinancialFacts.Dimensions left,FinancialFacts.Dimensions right) {
        return left.basis().equals(right.basis())&&left.periodKind().equals(right.periodKind())&&left.unit().equals(right.unit())
                &&java.util.Objects.equals(left.currency(),right.currency());
    }

    static boolean comparablePeriods(FinancialFacts.Dimensions later,FinancialFacts.Dimensions earlier) {
        if(!later.periodStart().isAfter(earlier.periodEnd()))return false;
        long laterDays=ChronoUnit.DAYS.between(later.periodStart(),later.periodEnd());
        long earlierDays=ChronoUnit.DAYS.between(earlier.periodStart(),earlier.periodEnd());
        return Math.abs(laterDays-earlierDays)<=7;
    }

    static String decimal(BigDecimal value){return value.stripTrailingZeros().toPlainString();}
}
