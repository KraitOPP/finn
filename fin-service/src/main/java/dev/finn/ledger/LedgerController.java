package dev.finn.ledger;

import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}/accounts/{account}")
public class LedgerController {
    private final Journal journal;
    LedgerController(Journal journal){this.journal=journal;}
    @GetMapping("/ledger") Journal.View view(@PathVariable UUID portfolio,@PathVariable UUID account){return journal.view(portfolio,account);}
    @GetMapping("/transactions") Journal.Page page(@PathVariable UUID portfolio,@PathVariable UUID account,@RequestParam(defaultValue="50") int limit,@RequestParam(required=false) Long before){return journal.page(portfolio,account,limit,before);}
    @PostMapping("/transactions") Journal.Receipt record(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody LedgerCommands.Record input){return journal.record(portfolio,account,input);}
    @PostMapping("/transactions/{event}/reverse") Journal.Receipt reverse(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID event,@Valid @RequestBody LedgerCommands.Reverse input){return journal.reverse(portfolio,account,event,input);}
    @PostMapping("/transactions/{event}/correct") Journal.Receipt correct(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID event,@Valid @RequestBody LedgerCommands.Correct input){return journal.correct(portfolio,account,event,input);}
}
