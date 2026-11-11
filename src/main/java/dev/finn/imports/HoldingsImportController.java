package dev.finn.imports;

import java.util.UUID;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/portfolios/{portfolio}/accounts/{account}/imports")
public class HoldingsImportController {
    public static final String XLSX="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    private final HoldingsImports imports;
    HoldingsImportController(HoldingsImports imports){this.imports=imports;}
    @PostMapping(consumes=XLSX)
    HoldingsImports.Ticket upload(@PathVariable UUID portfolio,@PathVariable UUID account,@RequestBody byte[] body){return imports.upload(portfolio,account,body);}
    @GetMapping HoldingsImports.ListView list(@PathVariable UUID portfolio,@PathVariable UUID account){return imports.list(portfolio,account);}
    @PostMapping("/{id}/retry") HoldingsImports.Ticket retry(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID id){return imports.retry(portfolio,account,id);}
    @GetMapping("/{id}/preview") HoldingsImports.PreviewPage preview(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID id,@RequestParam(defaultValue="50") int limit,@RequestParam(defaultValue="0") int offset){return imports.preview(portfolio,account,id,limit,offset);}
    @GetMapping("/{id}/original") ResponseEntity<byte[]> original(@PathVariable UUID portfolio,@PathVariable UUID account,@PathVariable UUID id){
        byte[] bytes=imports.original(portfolio,account,id);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename("groww-holdings.xlsx").build().toString()).contentLength(bytes.length).body(bytes);
    }
}
