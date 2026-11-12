package dev.finn.portfolio;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios")
public class PortfolioController {
    public record Create(@NotBlank @Size(max=120) String name){}
    public record CreateAccount(@NotBlank @Size(max=120) String name,@NotNull @Pattern(regexp="GROWW|MANUAL|OTHER") String source,@NotNull @Pattern(regexp="INR") String currency){}
    public record Archive(@NotNull Boolean archived,@NotNull @Min(0) @Max(9007199254740991L) Long revision){}
    private final Portfolios portfolios;
    PortfolioController(Portfolios portfolios){this.portfolios=portfolios;}
    @GetMapping Portfolios.PortfolioList list(){return portfolios.list();}
    @PostMapping Portfolios.Portfolio create(@Valid @RequestBody Create input){return portfolios.create(input.name());}
    @GetMapping("/{id}") Portfolios.Detail detail(@PathVariable UUID id){return portfolios.detail(id);}
    @PostMapping("/{id}/archive") Portfolios.Portfolio archive(@PathVariable UUID id,@Valid @RequestBody Archive input){return portfolios.archive(id,input.archived(),input.revision());}
    @PostMapping("/{id}/accounts") Portfolios.Account createAccount(@PathVariable UUID id,@Valid @RequestBody CreateAccount input){return portfolios.createAccount(id,input.name(),input.source(),input.currency());}
    @GetMapping("/{id}/accounts/{accountId}") Portfolios.Account account(@PathVariable UUID id,@PathVariable UUID accountId){return portfolios.account(id,accountId);}
}
