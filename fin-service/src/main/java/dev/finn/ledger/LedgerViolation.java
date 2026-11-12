package dev.finn.ledger;

public final class LedgerViolation extends RuntimeException {
    public enum Code { INVALID_EVENT, AMOUNT_OUT_OF_RANGE, UNSUPPORTED_SHORT_POSITION, DUPLICATE_OPENING_POSITION,
        SNAPSHOT_BOUNDARY_CONFLICT, CASH_BASELINE_CONFLICT, INVALID_REVERSAL, LEDGER_CAPACITY_REACHED, FRACTIONAL_ACTION_UNSUPPORTED, NO_ELIGIBLE_UNITS }
    private final Code code;
    public LedgerViolation(Code code){super(code.name());this.code=code;}
    public Code code(){return code;}
}
