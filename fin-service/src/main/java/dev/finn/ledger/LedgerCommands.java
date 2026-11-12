package dev.finn.ledger;

import java.time.LocalDate;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import tools.jackson.databind.JsonNode;

public final class LedgerCommands {
    private LedgerCommands(){}
    public record Input(@NotNull JsonNode kind,@NotNull LocalDate effectiveDate,UUID securityId,UUID listingId,
                        JsonNode quantity,JsonNode price,JsonNode amount,JsonNode fees,@Size(max=120) String reference){}
    public record Record(@NotNull UUID idempotencyKey,@NotNull @Valid Input event){}
    public record Reverse(@NotNull UUID idempotencyKey,@Size(max=120) String reference){}
    public record Correct(@NotNull UUID idempotencyKey,@NotNull @Valid Input replacement,@Size(max=120) String reference){}
}
