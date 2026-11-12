package dev.finn.instruments;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog")
public class CatalogueController {
    public record CompanyInput(@NotBlank @Size(max=120) String name) {}
    public record SecurityInput(@NotNull UUID companyId,@NotBlank @Size(max=120) String name,@Size(min=12,max=12) String isin,@NotNull Boolean confirmed) {}
    public record ListingInput(@NotBlank String exchange,@NotBlank @Size(max=16) String series,@NotBlank @Size(max=64) String symbol,@Size(max=72) String providerSymbol,@NotNull LocalDate validFrom,@NotNull Boolean confirmed) {}
    public record SymbolInput(@NotBlank @Size(max=64) String symbol,@Size(max=72) String providerSymbol,@NotNull LocalDate effectiveDate,@NotNull Boolean confirmed) {}
    private final Catalogue catalogue;
    CatalogueController(Catalogue catalogue){this.catalogue=catalogue;}
    @GetMapping("/companies") List<Catalogue.Company> companies(){return catalogue.companies();}
    @PostMapping("/companies") Catalogue.Company company(@Valid @RequestBody CompanyInput input){return catalogue.createCompany(input.name());}
    @GetMapping("/securities") Catalogue.SecurityPage search(@RequestParam(defaultValue="") String query,@RequestParam(defaultValue="50") int limit,@RequestParam(defaultValue="0") int offset){return catalogue.search(query,limit,offset);}
    @PostMapping("/securities") Catalogue.Security security(@Valid @RequestBody SecurityInput input){return catalogue.createSecurity(input.companyId(),input.name(),input.isin(),input.confirmed());}
    @GetMapping("/securities/{id}") Catalogue.SecurityDetail detail(@PathVariable UUID id){return catalogue.detail(id);}
    @PostMapping("/securities/{id}/listings") Catalogue.Listing listing(@PathVariable UUID id,@Valid @RequestBody ListingInput input){return catalogue.addListing(id,input.exchange(),input.series(),input.symbol(),input.providerSymbol(),input.validFrom(),input.confirmed());}
    @PostMapping("/listings/{id}/symbols") Catalogue.Listing symbol(@PathVariable UUID id,@Valid @RequestBody SymbolInput input){return catalogue.changeSymbol(id,input.symbol(),input.providerSymbol(),input.effectiveDate(),input.confirmed());}
    @GetMapping("/listings/{id}/symbols") List<Catalogue.SymbolHistory> history(@PathVariable UUID id){return catalogue.history(id);}
}
