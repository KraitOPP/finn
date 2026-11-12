package dev.finn.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static dev.finn.ledger.LedgerEvent.Kind.*;
import static dev.finn.ledger.LedgerViolation.Code.*;

class LedgerEngineTest {
    private static final UUID SECURITY=UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static BigDecimal money(String value){return LedgerRules.decimal(value);}
    private static LedgerEvent event(long sequence,LedgerEvent.Kind kind,int day,String quantity,String price,String amount,String fees){
        return new LedgerEvent(new UUID(0,sequence),sequence,LocalDate.of(2020,1,day),kind,
                Set.of(BUY,SELL,OPENING_POSITION).contains(kind)?SECURITY:null,null,money(quantity),money(price),money(amount),money(fees),null,null,LedgerEvent.Source.MANUAL);
    }
    private static LedgerEvent reversal(long sequence,LedgerEvent original){return new LedgerEvent(new UUID(0,sequence),sequence,original.effectiveDate(),REVERSAL,null,null,null,null,null,null,original.eventId(),"Reviewed correction",LedgerEvent.Source.MANUAL);}
    private static void violation(LedgerViolation.Code code,Runnable action){assertThatThrownBy(action::run).isInstanceOfSatisfying(LedgerViolation.class,error->assertThat(error.code()).isEqualTo(code));}

    @Test void weightedAverageUnitsCostCashAndRealisedGainReconcile(){
        var result=LedgerEngine.replay(List.of(event(1,OPENING_CASH,1,null,null,"1000",null),event(2,BUY,2,"10","100",null,"10"),event(3,SELL,3,"4","150",null,"6")));
        assertThat(result.positions()).hasSize(1);
        var held=result.positions().getFirst();
        assertThat(held.quantity()).isEqualByComparingTo("6");
        assertThat(held.recordedCost()).isEqualByComparingTo("606");
        assertThat(held.averageCost()).isEqualByComparingTo("101");
        assertThat(result.realisedPnl()).isEqualByComparingTo("190");
        assertThat(result.cashBalance()).isEqualByComparingTo("584");
        assertThat(result.recordedFees()).isEqualByComparingTo("16");
        assertThat(result.historyStatus()).isEqualTo("PARTIAL_TRADES");
    }
    @Test void multipleBuysUseWeightedCostAndDepositsNeverBecomeGain(){
        var result=LedgerEngine.replay(List.of(event(1,OPENING_CASH,1,null,null,"200",null),event(2,BUY,2,"3","10",null,"0"),event(3,BUY,3,"2","20",null,"0"),event(4,SELL,4,"2","30",null,"1"),event(5,DEPOSIT,5,null,null,"500",null),event(6,WITHDRAWAL,6,null,null,"100",null),event(7,FEE,7,null,null,"2",null)));
        assertThat(result.positions().getFirst().recordedCost()).isEqualByComparingTo("42");
        assertThat(result.positions().getFirst().averageCost()).isEqualByComparingTo("14");
        assertThat(result.realisedPnl()).isEqualByComparingTo("31");
        assertThat(result.netContributions()).isEqualByComparingTo("400");
        assertThat(result.cashBalance()).isEqualByComparingTo("587");
        assertThat(result.recordedFees()).isEqualByComparingTo("3");
        assertThat(result.standaloneFees()).isEqualByComparingTo("2");
    }
    @Test void unknownFeesAndStartingCashRemainUnknown(){
        var result=LedgerEngine.replay(List.of(event(1,BUY,2,"2","10",null,null),event(2,SELL,3,"1","12",null,"0")));
        assertThat(result.cashBalance()).isNull();assertThat(result.realisedPnl()).isNull();
        assertThat(result.positions().getFirst().recordedCost()).isNull();
        assertThat(result.recordedFeesComplete()).isFalse();assertThat(result.cashMovementsComplete()).isFalse();
        assertThat(result.recordedCashComponents()).isEqualByComparingTo("-8");
        assertThat(result.warnings()).contains("STARTING_CASH_UNKNOWN","REALISED_PNL_INCOMPLETE","RECORDED_TRADE_FEES_UNKNOWN");
    }
    @Test void reviewedOpeningCostDoesNotInventPurchasesOrPastCoverage(){
        var opening=event(1,OPENING_POSITION,2,"3",null,"90",null);
        var result=LedgerEngine.replay(List.of(opening,event(2,SELL,3,"1","40",null,"1")));
        assertThat(result.positions().getFirst().recordedCost()).isEqualByComparingTo("60");
        assertThat(result.positions().getFirst().costBasis()).isEqualTo("REPORTED_OPENING_COST");
        assertThat(result.realisedPnl()).isEqualByComparingTo("9");
        assertThat(result.coverageStart()).isEqualTo(opening.effectiveDate());
        assertThat(result.warnings()).contains("HOLDINGS_SNAPSHOT_IS_NOT_TRADE_HISTORY","HISTORICAL_FEES_UNKNOWN","COMPLETE_HISTORICAL_RETURNS_UNAVAILABLE");
        assertThat(LedgerEngine.replay(List.of(opening)).historyStatus()).isEqualTo("HOLDINGS_ONLY");
        violation(SNAPSHOT_BOUNDARY_CONFLICT,()->LedgerEngine.replay(List.of(opening,event(2,BUY,2,"1","30",null,"0"))));
    }
    @Test void unknownOpeningCostCanCloseWithoutContaminatingANewPosition(){
        var result=LedgerEngine.replay(List.of(event(1,OPENING_POSITION,1,"3",null,null,null),event(2,SELL,2,"3","10",null,"0"),event(3,BUY,3,"1","20",null,"0")));
        assertThat(result.realisedPnl()).isNull();
        assertThat(result.positions().getFirst().recordedCost()).isEqualByComparingTo("20");
        assertThat(result.positions().getFirst().costBasis()).isEqualTo("RECORDED_TRADES");
    }
    @Test void backdatedSalesAndInvalidReversalsCannotCreateShorts(){
        var buy=event(1,BUY,3,"10","100",null,"0");var sell=event(2,SELL,4,"4","150",null,"0");
        violation(UNSUPPORTED_SHORT_POSITION,()->LedgerEngine.replay(List.of(buy,event(2,SELL,2,"1","100",null,"0"))));
        violation(UNSUPPORTED_SHORT_POSITION,()->LedgerEngine.replay(List.of(buy,sell,reversal(3,buy))));
        var missing=reversal(2,event(1,BUY,2,"1","1",null,"0"));
        violation(INVALID_REVERSAL,()->LedgerEngine.replay(List.of(missing)));
        violation(INVALID_REVERSAL,()->LedgerEngine.replay(List.of(buy,reversal(2,buy),reversal(3,buy))));
    }
    @Test void linkedReplacementReplaysSubsequentTradesWithoutMutatingOriginal(){
        var buy=event(1,BUY,2,"10","100",null,"10");var sell=event(2,SELL,3,"4","150",null,"6");
        var corrected=LedgerEngine.replay(List.of(buy,sell,reversal(3,buy),event(4,BUY,2,"10","110",null,"10")));
        assertThat(buy.price()).isEqualByComparingTo("100");
        assertThat(corrected.realisedPnl()).isEqualByComparingTo("150");
        assertThat(corrected.positions().getFirst().recordedCost()).isEqualByComparingTo("666");
        violation(UNSUPPORTED_SHORT_POSITION,()->LedgerEngine.replay(List.of(buy,sell,reversal(3,buy),event(4,BUY,2,"3","110",null,"10"))));
    }
    @Test void fullClosureReconcilesRoundingAndNeverLosesResidualCost(){
        var result=LedgerEngine.replay(List.of(event(1,BUY,1,"3","0.33333333",null,"0"),event(2,SELL,2,"1","1",null,"0"),event(3,SELL,3,"1","1",null,"0"),event(4,SELL,4,"1","1",null,"0")));
        assertThat(result.positions()).isEmpty();
        assertThat(result.realisedPnl()).isEqualByComparingTo("2.00000001");
    }
    @Test void cashBaselinesAreExplicitClosingBoundaries(){
        var baseline=event(1,OPENING_CASH,2,null,null,"100",null);
        violation(CASH_BASELINE_CONFLICT,()->LedgerEngine.replay(List.of(baseline,event(2,DEPOSIT,2,null,null,"10",null))));
        violation(CASH_BASELINE_CONFLICT,()->LedgerEngine.replay(List.of(baseline,event(2,OPENING_CASH,3,null,null,"100",null))));
        var result=LedgerEngine.replay(List.of(event(1,DEPOSIT,2,null,null,"100",null)));
        assertThat(result.cashBalance()).isNull();assertThat(result.recordedCashComponents()).isEqualByComparingTo("100");
        assertThat(result.realisedPnl()).isEqualByComparingTo("0");
    }
    @Test void rejectsInvalidDecimalFormsFractionsRangesAndHoldingReportTrades(){
        for(String value:List.of("1e2","-1","01","1,000","NaN","0.000000001"))violation(INVALID_EVENT,()->LedgerRules.decimal(value));
        violation(INVALID_EVENT,()->LedgerEngine.replay(List.of(event(1,BUY,1,"0.5","10",null,"0"))));
        violation(INVALID_EVENT,()->LedgerEngine.replay(List.of(event(1,BUY,1,"1","0",null,"0"))));
        violation(AMOUNT_OUT_OF_RANGE,()->LedgerEngine.replay(List.of(event(1,BUY,1,"1000000000000","1000000000000",null,"0"))));
        var buy=event(1,BUY,1,"1","10",null,"0");
        var imported=new LedgerEvent(buy.eventId(),buy.sequence(),buy.effectiveDate(),BUY,buy.securityId(),null,buy.quantity(),buy.price(),null,buy.fees(),null,null,LedgerEvent.Source.GROWW_HOLDINGS);
        violation(INVALID_EVENT,()->LedgerEngine.replay(List.of(imported)));
        assertThat(LedgerRules.text(money("1.00000000"))).isEqualTo("1");
    }
}
