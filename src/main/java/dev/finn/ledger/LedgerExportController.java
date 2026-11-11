package dev.finn.ledger;

import java.util.UUID;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
public class LedgerExportController {
    public record Request(@NotNull @Min(0) @Max(10000) Long expectedLedgerRevision){}
    private final LedgerExports exports;
    LedgerExportController(LedgerExports exports){this.exports=exports;}
    @PostMapping("/api/v1/portfolios/{portfolio}/accounts/{account}/transactions/export")
    ResponseEntity<byte[]> csv(@PathVariable UUID portfolio,@PathVariable UUID account,@Valid @RequestBody Request request){
        byte[] file=exports.export(portfolio,account,request.expectedLedgerRevision());
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType("text/csv;charset=UTF-8"))
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("finn-ledger.csv").build().toString()).contentLength(file.length).body(file);
    }
}
