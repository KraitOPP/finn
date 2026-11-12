package dev.finn.market;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;

class PortfolioReturnMathTest {
    private static final LocalDate START=LocalDate.of(2025,1,1);

    @Test void xirrUsesActualDaysAndInvestorCashFlowSigns(){
        var annual=PortfolioReturnMath.xirr(START,n("1000"),START.plusDays(365),n("1100"),List.of());
        assertEquals("10",annual.percent());
        var withWithdrawal=PortfolioReturnMath.xirr(START,n("1000"),START.plusDays(365),n("900"),
                List.of(new PortfolioPerformance.CashFlow(START.plusDays(365),n("0"),n("100"))));
        assertEquals("0",withWithdrawal.percent());
    }

    @Test void xirrWithholdsUndefinedAndPotentiallyAmbiguousPatterns(){
        assertEquals("CASH_FLOW_SIGNS",PortfolioReturnMath.xirr(START,n("0"),START.plusDays(2),n("100"),List.of()).reason());
        var alternating=List.of(new PortfolioPerformance.CashFlow(START.plusDays(1),n("0"),n("230")),
                new PortfolioPerformance.CashFlow(START.plusDays(2),n("150"),n("0")));
        assertEquals("AMBIGUOUS_CASH_FLOWS",PortfolioReturnMath.xirr(START,n("100"),START.plusDays(2),n("18"),alternating).reason());
    }

    @Test void timeWeightedLinksTwoIndependentlyCalculatedSubperiods(){
        var first=new PortfolioReturnMath.Value(START,n("1000"),n("0"));
        var deposit=new PortfolioReturnMath.Value(START.plusDays(1),n("2100"),n("1000"));
        var withdrawal=new PortfolioReturnMath.Value(START.plusDays(2),n("2210"),n("-100"));
        assertEquals("21",PortfolioReturnMath.timeWeighted(List.of(first,deposit,withdrawal)).percent());
        assertEquals("NON_POSITIVE_BASE",PortfolioReturnMath.timeWeighted(List.of(
                new PortfolioReturnMath.Value(START,n("0"),n("0")),deposit)).reason());
    }

    private static BigDecimal n(String text){return new BigDecimal(text);}
}
