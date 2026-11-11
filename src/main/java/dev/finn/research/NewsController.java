
package dev.finn.research;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.util.UUID;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/research/news")
class NewsController {
    record Input(@NotNull UUID companyId,@NotBlank @Size(max=120) String headline,@NotBlank @Size(max=120) String publisher,
                 @NotBlank @Size(max=1000) String url,@Size(max=32) String publishedAt,@NotNull @AssertTrue Boolean rightsConfirmed) {}
    private final NewsContext news;
    NewsController(NewsContext news) { this.news=news; }

    @GetMapping NewsContext.Page list(@RequestParam(defaultValue="0") @Min(0) @Max(200) int offset) { return news.list(offset); }
    @PostMapping SourceDocuments.Entry add(@Valid @RequestBody Input input) {
        return news.save(input.companyId(),input.headline(),input.publisher(),input.url(),input.publishedAt());
    }
}
