package dev.finn.portfolio;

import java.util.UUID;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}/accounts/{account}/corporate-actions")
public class CorporateActionController {
    private final CorporateActions actions;
    CorporateActionController(CorporateActions actions){this.actions=actions;}
    @GetMapping CorporateActions.Page list(@PathVariable UUID portfolio,@PathVariable UUID account){return actions.list(portfolio,account);}
    @PostMapping("/preview") CorporateActions.Effect preview(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody CorporateActions.Input input){return actions.preview(portfolio,account,input);}
    @PostMapping CorporateActions.View apply(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody CorporateActions.Approve input){return actions.apply(portfolio,account,input);}
}
