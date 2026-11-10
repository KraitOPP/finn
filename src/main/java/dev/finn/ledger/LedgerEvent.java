package dev.finn.ledger;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record LedgerEvent(UUID eventId,long sequence,LocalDate effectiveDate,Kind kind,
                          UUID securityId,UUID listingId,BigDecimal quantity,BigDecimal price,
                          BigDecimal amount,BigDecimal fees,UUID reversalOf,String reference,Source source) {
    public enum Kind { BUY, SELL, FEE, DEPOSIT, WITHDRAWAL, OPENING_POSITION, OPENING_CASH, REVERSAL }
    public enum Source { MANUAL, GROWW_HOLDINGS, REVIEWED_CORPORATE_ACTION }
}
