package dev.finn.demo;

import java.io.IOException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
final class DemoQuoteController {
    private final byte[] syntheticQuote;

    DemoQuoteController() throws IOException {
        // Curated classpath fixture only. No provider, portfolio, file upload or user-selected path.
        syntheticQuote = new ClassPathResource("demo/quote.json").getContentAsByteArray();
    }

    @GetMapping(value = "/api/v1/demo/quote", produces = MediaType.APPLICATION_JSON_VALUE)
    ResponseEntity<byte[]> quote() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(syntheticQuote.clone());
    }
}
