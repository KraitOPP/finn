
package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/sources")
class SourceDocumentController {
    record Input(@NotNull UUID companyId,@NotBlank @Size(max=120) String title,@NotBlank @Size(max=120) String sourceName,
                 @Size(max=1000) String url,@Size(max=49152) String attachment,@Size(max=32) String publishedAt,
                 @NotNull @AssertTrue Boolean rightsConfirmed) {
        SourceDocuments.Input value() { return new SourceDocuments.Input(companyId,title,sourceName,url,attachment,publishedAt); }
    }
    record Edit(@NotNull @Min(1) @Max(50) Integer expectedRevision,@NotNull @Valid Input source) {}

    private final SourceDocuments sources;
    SourceDocumentController(SourceDocuments sources) { this.sources=sources; }

    @GetMapping SourceDocuments.Page list(@RequestParam(defaultValue="0") @Min(0) @Max(200) int offset) { return sources.list(offset); }
    @PostMapping SourceDocuments.Entry create(@Valid @RequestBody Input input) { return sources.save(null,null,input.value()); }
    @PostMapping("/{id}") SourceDocuments.Entry edit(@PathVariable UUID id,@Valid @RequestBody Edit input) {
        return sources.save(id,input.expectedRevision(),input.source().value());
    }
    @GetMapping("/{id}/versions") SourceDocuments.Versions versions(@PathVariable UUID id) { return sources.versions(id); }
    @GetMapping("/{id}/versions/{revision}") SourceDocuments.Detail detail(@PathVariable UUID id,@PathVariable @Min(1) @Max(50) int revision) {
        return sources.detail(id,revision);
    }
}
