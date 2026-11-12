package dev.finn.ledger;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.*;
import static dev.finn.ledger.LedgerEvent.Kind.*;
import static dev.finn.ledger.LedgerViolation.Code.*;

public final class LedgerEngine {
    public static final String CALCULATION_VERSION="MOVING_AVERAGE_1";
    public static final int MAX_EVENTS=10000;
    public static final int MAX_POSITIONS=1000;
    public record Position(UUID securityId,BigDecimal quantity,BigDecimal recordedCost,BigDecimal averageCost,String costBasis){}
    public record Projection(List<Position> positions,BigDecimal cashBalance,BigDecimal recordedCashComponents,
                             boolean cashMovementsComplete,BigDecimal realisedPnl,BigDecimal knownRealisedPnl,
                             BigDecimal recordedFees,boolean recordedFeesComplete,BigDecimal standaloneFees,BigDecimal recordedDividends,
                             BigDecimal netContributions,LocalDate cashBaselineDate,LocalDate coverageStart,
                             String historyStatus,List<String> warnings){}
    private static final class Pool {
        BigDecimal quantity=BigDecimal.ZERO,cost=BigDecimal.ZERO;
        String basis="RECORDED_TRADES";
    }
    private LedgerEngine(){}
    public static Projection replay(List<LedgerEvent> input){
        if(input.size()>MAX_EVENTS)throw new LedgerViolation(LEDGER_CAPACITY_REACHED);
        var indexed=new HashMap<UUID,LedgerEvent>();var sequences=new HashSet<Long>();
        for(var event:input){LedgerRules.validate(event);if(indexed.putIfAbsent(event.eventId(),event)!=null||!sequences.add(event.sequence()))throw new LedgerViolation(INVALID_EVENT);}
        var reversed=new HashSet<UUID>();
        for(var event:input)if(event.kind()==REVERSAL){
            var original=indexed.get(event.reversalOf());
            if(original==null||original.kind()==REVERSAL||original.sequence()>=event.sequence()||!original.effectiveDate().equals(event.effectiveDate())||!reversed.add(original.eventId()))throw new LedgerViolation(INVALID_REVERSAL);
        }
        var events=input.stream().filter(event->event.kind()!=REVERSAL&&!reversed.contains(event.eventId()))
                .sorted(Comparator.comparing(LedgerEvent::effectiveDate).thenComparingInt(event->event.kind()==SPLIT||event.kind()==BONUS?0:1).thenComparingLong(LedgerEvent::sequence)).toList();
        var openings=new HashMap<UUID,LocalDate>();LocalDate cashDate=null;
        for(var event:events){
            if(event.kind()==OPENING_POSITION&&openings.putIfAbsent(event.securityId(),event.effectiveDate())!=null)throw new LedgerViolation(DUPLICATE_OPENING_POSITION);
            if(event.kind()==OPENING_CASH){if(cashDate!=null)throw new LedgerViolation(CASH_BASELINE_CONFLICT);cashDate=event.effectiveDate();}
        }
        Map<UUID,Pool> pools=new HashMap<>();
        BigDecimal cashComponents=BigDecimal.ZERO,baseline=BigDecimal.ZERO,realised=BigDecimal.ZERO,fees=BigDecimal.ZERO,standalone=BigDecimal.ZERO,contributions=BigDecimal.ZERO,dividends=BigDecimal.ZERO;
        boolean cashComplete=true,realisedComplete=true,feesComplete=true,trades=false;
        Set<String> warnings=new TreeSet<>();
        LocalDate start=null;
        for(var event:events){
            LocalDate date=event.effectiveDate();
            if(event.kind()==BUY||event.kind()==SELL){
                trades=true;if(start==null||date.isBefore(start))start=date;
                LocalDate openingDate=openings.get(event.securityId());
                if(openingDate!=null&&!date.isAfter(openingDate))throw new LedgerViolation(SNAPSHOT_BOUNDARY_CONFLICT);
            }
            if(event.kind()==SPLIT||event.kind()==BONUS){LocalDate opening=openings.get(event.securityId());if(opening!=null&&!date.isAfter(opening))throw new LedgerViolation(SNAPSHOT_BOUNDARY_CONFLICT);}
            boolean cashMovement=event.kind()==BUY||event.kind()==SELL||event.kind()==DEPOSIT||event.kind()==WITHDRAWAL||event.kind()==FEE||event.kind()==DIVIDEND;
            if(cashMovement&&cashDate!=null&&!date.isAfter(cashDate))throw new LedgerViolation(CASH_BASELINE_CONFLICT);
            BigDecimal recordedFee=event.fees()==null?BigDecimal.ZERO:event.fees();
            switch(event.kind()){
                case OPENING_POSITION->{
                    Pool pool=pools.computeIfAbsent(event.securityId(),key->new Pool());pool.quantity=event.quantity();pool.cost=event.amount();pool.basis=event.amount()==null?"UNKNOWN":"REPORTED_OPENING_COST";
                    if(start==null||date.isAfter(start))start=date;
                    warnings.add("HOLDINGS_SNAPSHOT_IS_NOT_TRADE_HISTORY");warnings.add("HISTORICAL_FEES_UNKNOWN");
                }
                case BUY->{
                    Pool pool=pools.computeIfAbsent(event.securityId(),key->new Pool());
                    if(pool.quantity.signum()==0){pool.cost=BigDecimal.ZERO;pool.basis="RECORDED_TRADES";}
                    BigDecimal gross=event.quantity().multiply(event.price());
                    pool.quantity=pool.quantity.add(event.quantity());
                    pool.cost=pool.cost==null||event.fees()==null?null:pool.cost.add(gross).add(recordedFee);
                    if(pool.cost==null)pool.basis="UNKNOWN";else if(!pool.basis.equals("RECORDED_TRADES"))pool.basis="MIXED_RECORDED_COST";
                    cashComponents=cashComponents.subtract(gross).subtract(recordedFee);
                }
                case SELL->{
                    Pool pool=pools.computeIfAbsent(event.securityId(),key->new Pool());
                    if(pool.quantity.compareTo(event.quantity())<0)throw new LedgerViolation(UNSUPPORTED_SHORT_POSITION);
                    BigDecimal gross=event.quantity().multiply(event.price());
                    BigDecimal allocated=pool.cost==null?null:pool.quantity.compareTo(event.quantity())==0?pool.cost:pool.cost.multiply(event.quantity()).divide(pool.quantity,8,RoundingMode.HALF_EVEN);
                    if(allocated==null||event.fees()==null)realisedComplete=false;else realised=LedgerRules.bounded(realised.add(gross).subtract(recordedFee).subtract(allocated));
                    pool.quantity=pool.quantity.subtract(event.quantity());
                    pool.cost=pool.quantity.signum()==0?BigDecimal.ZERO:pool.cost==null?null:pool.cost.subtract(allocated);
                    cashComponents=cashComponents.add(gross).subtract(recordedFee);
                }
                case DEPOSIT->{cashComponents=cashComponents.add(event.amount());contributions=contributions.add(event.amount());}
                case WITHDRAWAL->{cashComponents=cashComponents.subtract(event.amount());contributions=contributions.subtract(event.amount());}
                case FEE->{cashComponents=cashComponents.subtract(event.amount());fees=fees.add(event.amount());standalone=standalone.add(event.amount());}
                case SPLIT,BONUS->{Pool pool=pools.computeIfAbsent(event.securityId(),key->new Pool());pool.quantity=corporateUnits(pool.quantity,event.ratioNumerator(),event.ratioDenominator(),event.kind()==BONUS);}
                case DIVIDEND->{cashComponents=cashComponents.add(event.amount());dividends=LedgerRules.bounded(dividends.add(event.amount()));}
                case OPENING_CASH->baseline=event.amount();
                case REVERSAL->throw new LedgerViolation(INVALID_REVERSAL);
            }
            if(event.kind()==BUY||event.kind()==SELL){fees=fees.add(recordedFee);if(event.fees()==null){cashComplete=false;feesComplete=false;warnings.add("RECORDED_TRADE_FEES_UNKNOWN");}}
            LedgerRules.bounded(cashComponents);LedgerRules.bounded(fees);LedgerRules.bounded(contributions);
        }
        // An opening balance is an end-of-day boundary; retain the most conservative start for later valuations.
        LocalDate latestOpening=openings.values().stream().max(LocalDate::compareTo).orElse(null);
        if(latestOpening!=null&&(start==null||latestOpening.isAfter(start)))start=latestOpening;
        List<Position> positions=pools.entrySet().stream().filter(entry->entry.getValue().quantity.signum()>0).sorted(Map.Entry.comparingByKey()).map(entry->{
            Pool pool=entry.getValue();LedgerRules.bounded(pool.cost);LedgerRules.bounded(pool.quantity);
            return new Position(entry.getKey(),pool.quantity,pool.cost,pool.cost==null?null:pool.cost.divide(pool.quantity,8,RoundingMode.HALF_EVEN),pool.basis);
        }).toList();
        if(positions.size()>MAX_POSITIONS)throw new LedgerViolation(LEDGER_CAPACITY_REACHED);
        if(positions.stream().anyMatch(position->position.recordedCost()==null))warnings.add("RECORDED_COST_UNKNOWN");
        if(!realisedComplete)warnings.add("REALISED_PNL_INCOMPLETE");
        if(cashDate==null)warnings.add("STARTING_CASH_UNKNOWN");
        String history=trades?"PARTIAL_TRADES":openings.isEmpty()?"UNKNOWN":"HOLDINGS_ONLY";
        if(history.equals("UNKNOWN"))start=null;
        warnings.add("COMPLETE_HISTORICAL_RETURNS_UNAVAILABLE");
        BigDecimal cash=cashDate!=null&&cashComplete?LedgerRules.bounded(baseline.add(cashComponents)):null;
        if(cash!=null&&cash.signum()<0)warnings.add("RECORDED_CASH_NEGATIVE_REVIEW_REQUIRED");
        return new Projection(positions,cash,cashComponents,cashComplete,realisedComplete?realised:null,realised,fees,feesComplete,standalone,dividends,contributions,cashDate,start,history,List.copyOf(warnings));
    }
    public static BigDecimal corporateUnits(BigDecimal prior,int numerator,int denominator,boolean bonus){
        if(prior.signum()<=0)throw new LedgerViolation(NO_ELIGIBLE_UNITS);
        var result=prior.multiply(BigDecimal.valueOf(numerator)).divideAndRemainder(BigDecimal.valueOf(denominator));
        if(result[1].signum()!=0)throw new LedgerViolation(FRACTIONAL_ACTION_UNSUPPORTED);
        return LedgerRules.bounded(bonus?prior.add(result[0]):result[0]);
    }
}
