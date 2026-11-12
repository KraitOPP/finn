package dev.finn.research;

import static org.junit.jupiter.api.Assertions.*;

import dev.finn.platform.ApiFailure;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GroqResearchTest {
    private static final String FILING = "https://exchange.example/filing";
    private static final String INVENTED = "https://example.org/unsupported";
    private final JsonMapper json = JsonMapper.builder().build();
    private final GroqResearch research = new GroqResearch(null,json,"");
    private final LocalDate today = LocalDate.of(2026,11,12);

    @Test
    void usesTheRequestedModelAndOnlyTheBrowserTool() {
        var body = json.valueToTree(GroqResearch.request("NSE","INFY",StockResearch.Preset.DEEP_DIVE,today));
        assertEquals("openai/gpt-oss-120b",body.path("model").asText());
        assertEquals("browser_search",body.at("/tools/0/type").asText());
        assertEquals(1,body.path("tools").size());
        assertTrue(body.at("/messages/0/content").asText().contains("INFY on NSE"));
        assertFalse(body.has("response_format"));
    }

    @Test
    void displaysOnlyRecentNewsWithAMatchingBrowserSource() {
        String raw = json.writeValueAsString(Map.of("items",List.of(
                item("Recent exchange filing","2026-11-11",List.of(FILING,INVENTED)),
                item("Made-up link","2026-11-10",List.of(INVENTED)),
                item("Old filing","2026-10-01",List.of(FILING)),
                item("Future filing","2026-11-14",List.of(FILING)))));
        var report = research.decode(response(raw),StockResearch.Preset.NEWS,today);
        assertEquals(1,report.items().size());
        assertEquals("Recent exchange filing",report.items().getFirst().title());
        assertEquals(List.of(0),report.items().getFirst().sourceIds());
        assertEquals(List.of(FILING),report.sources().stream().map(StockResearch.Source::url).toList());
        assertNull(report.searchSuggestions());
    }

    @Test
    void rejectsAnalysisWhenTheModelOnlyInventsLinks() {
        String raw = json.writeValueAsString(Map.of("items",List.of(item("Unsupported analysis","2026-11-10",List.of(INVENTED)))));
        var error = assertThrows(ApiFailure.class,() -> research.decode(response(raw),StockResearch.Preset.DEEP_DIVE,today));
        assertEquals("GROQ_NO_SOURCES",error.code());
    }

    private static Map<String,Object> item(String title,String date,List<String> urls) {
        return Map.of("title",title,"detail","Fictional announcement for testing.","publishedOn",date,"sourceUrls",urls);
    }

    private JsonNode response(String raw) {
        var browser = Map.of("type","browser_search","search_results",Map.of("results",List.of(
                Map.of("title","Exchange filing","url",FILING),
                Map.of("title","Unsafe link","url","javascript:alert(1)"))));
        var unrelated = Map.of("type","function","search_results",Map.of("results",List.of(
                Map.of("title","Invented link","url",INVENTED))));
        return json.valueToTree(Map.of("choices",List.of(Map.of("finish_reason","stop","message",Map.of(
                "content",raw,"executed_tools",List.of(browser,unrelated))))));
    }
}
