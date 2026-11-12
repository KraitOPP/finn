package dev.finn.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import static dev.finn.ledger.LedgerViolation.Code.*;

public final class LedgerRules {
    public static final BigDecimal MAX_MONEY=new BigDecimal("10000000000000000000000");
    public static final BigDecimal MAX_QUANTITY=new BigDecimal("1000000000000");
    private LedgerRules(){}
    public static BigDecimal decimal(String value) {
        if(value==null)return null;
        if(!value.matches("(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?"))throw new LedgerViolation(INVALID_EVENT);
        return bounded(new BigDecimal(value));
    }
    public static String text(BigDecimal value){return value==null?null:value.stripTrailingZeros().toPlainString();}
    public static BigDecimal bounded(BigDecimal value) {
        if(value!=null && (value.abs().compareTo(MAX_MONEY)>=0 || value.stripTrailingZeros().scale()>8))throw new LedgerViolation(AMOUNT_OUT_OF_RANGE);
        return value;
    }
    private static void positive(BigDecimal value){if(value==null||value.signum()<=0)throw new LedgerViolation(INVALID_EVENT);bounded(value);}
    private static void nonnegative(BigDecimal value){if(value==null||value.signum()<0)throw new LedgerViolation(INVALID_EVENT);bounded(value);}
    private static void absent(Object... values){for(Object value:values)if(value!=null)throw new LedgerViolation(INVALID_EVENT);}
    private static void quantity(BigDecimal value){positive(value);if(value.stripTrailingZeros().scale()>0||value.compareTo(MAX_QUANTITY)>0)throw new LedgerViolation(INVALID_EVENT);}
    public static void validate(LedgerEvent event){
        if(event==null||event.eventId()==null||event.sequence()<1||event.kind()==null||event.effectiveDate()==null||event.source()==null)throw new LedgerViolation(INVALID_EVENT);
        if(event.effectiveDate().isBefore(LocalDate.of(1900,1,1))||event.effectiveDate().isAfter(LocalDate.now(ZoneId.of("Asia/Kolkata"))))throw new LedgerViolation(INVALID_EVENT);
        if(event.reference()!=null&&(event.reference().length()>120||event.reference().codePoints().anyMatch(Character::isISOControl)))throw new LedgerViolation(INVALID_EVENT);
        if(event.listingId()!=null&&event.securityId()==null)throw new LedgerViolation(INVALID_EVENT);
        if(event.source()==LedgerEvent.Source.GROWW_HOLDINGS&&event.kind()!=LedgerEvent.Kind.OPENING_POSITION)throw new LedgerViolation(INVALID_EVENT);
        boolean unitAction=event.kind()==LedgerEvent.Kind.SPLIT||event.kind()==LedgerEvent.Kind.BONUS;
        boolean corporate=unitAction||event.kind()==LedgerEvent.Kind.DIVIDEND;
        if(corporate!=(event.source()==LedgerEvent.Source.REVIEWED_CORPORATE_ACTION))throw new LedgerViolation(INVALID_EVENT);
        if(!unitAction)absent(event.ratioNumerator(),event.ratioDenominator());
        switch(event.kind()){
            case BUY,SELL->{
                if(event.securityId()==null)throw new LedgerViolation(INVALID_EVENT);
                quantity(event.quantity());positive(event.price());
                if(event.fees()!=null)nonnegative(event.fees());
                absent(event.amount(),event.reversalOf());
                bounded(event.quantity().multiply(event.price()).add(event.fees()==null?BigDecimal.ZERO:event.fees()));
            }
            case OPENING_POSITION->{
                if(event.securityId()==null)throw new LedgerViolation(INVALID_EVENT);
                quantity(event.quantity());if(event.amount()!=null)nonnegative(event.amount());
                absent(event.price(),event.fees(),event.reversalOf());
            }
            case OPENING_CASH->{nonnegative(event.amount());absent(event.securityId(),event.listingId(),event.quantity(),event.price(),event.fees(),event.reversalOf());}
            case DEPOSIT,WITHDRAWAL,FEE->{positive(event.amount());absent(event.securityId(),event.listingId(),event.quantity(),event.price(),event.fees(),event.reversalOf());}
            case SPLIT,BONUS->{
                if(event.securityId()==null||event.ratioNumerator()==null||event.ratioDenominator()==null||event.ratioNumerator()<1||event.ratioDenominator()<1||event.ratioNumerator()>1000000||event.ratioDenominator()>1000000)throw new LedgerViolation(INVALID_EVENT);
                absent(event.quantity(),event.price(),event.amount(),event.fees(),event.reversalOf());
            }
            case DIVIDEND->{if(event.securityId()==null)throw new LedgerViolation(INVALID_EVENT);positive(event.amount());absent(event.quantity(),event.price(),event.fees(),event.reversalOf());}
            case REVERSAL->{if(event.reversalOf()==null)throw new LedgerViolation(INVALID_REVERSAL);absent(event.securityId(),event.listingId(),event.quantity(),event.price(),event.amount(),event.fees());}
        }
    }
}
