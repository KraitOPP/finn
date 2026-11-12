package dev.finn.research;

import static org.junit.jupiter.api.Assertions.*;
import dev.finn.platform.ApiFailure;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class GeminiResearchTest {
    private final JsonMapper json = JsonMapper.builder().build();
    private final GeminiResearch research = new GeminiResearch(null,json);
    private final LocalDate today = LocalDate.of(2026,11,12);

    @Test
    void exposesOnlyGroundedNewsWithinTheRequestedWindow() {
        String detail = "Revenue rose to ₹100 crore.";
        String raw = json.writeValueAsString(Map.of("items",List.of(
                Map.of("title","Results","detail",detail,"publishedOn","2026-11-01"),
                Map.of("title","Old results","detail","Last year","publishedOn","2025-11-01"),
                Map.of("title","Uncited","detail","Unknown source","publishedOn","2026-11-01")
        )));
        int start = raw.substring(0,raw.indexOf(detail)).getBytes(StandardCharsets.UTF_8).length;
        var support = Map.of("segment",Map.of("partIndex",1,"startIndex",start,
                "endIndex",start+detail.getBytes(StandardCharsets.UTF_8).length),
                "groundingChunkIndices",List.of(0,1));
        var result = research.decode(response(raw,List.of(support)),StockResearch.Preset.NEWS,"gemini-3.8-flash",today);
        assertEquals(1,result.items().size());
        assertEquals("Results",result.items().getFirst().title());
        assertEquals(List.of(0),result.items().getFirst().sourceIds());
        assertEquals("https://example.com/filing",result.sources().getFirst().url());
        assertNotNull(result.searchSuggestions());
    }

    @Test
    void requestsStructuredSearchAndRequiresProviderSourcesForAnalysis() {
        var body = json.valueToTree(GeminiResearch.request("NSE","INFY",StockResearch.Preset.VALUATION,today));
        assertTrue(body.at("/tools/0/googleSearch").isObject());
        assertEquals("APPLICATION_JSON",body.at("/generationConfig/responseFormat/text/mimeType").asText());
        assertTrue(body.at("/contents/0/parts/0/text").asText().contains("INFY on NSE"));
        var error = assertThrows(ApiFailure.class,() -> research.decode(
                json.readTree("{\"candidates\":[{\"finishReason\":\"STOP\"}]}"),
                StockResearch.Preset.VALUATION,"gemini-3.8-flash",today));
        assertEquals("GEMINI_NO_SOURCES",error.code());
    }

    private JsonNode response(String raw,List<?> supports) {
        var metadata = Map.of("groundingChunks",List.of(
                Map.of("web",Map.of("title","Exchange filing","uri","https://example.com/filing")),
                Map.of("web",Map.of("title","Invalid","uri","javascript:alert(1)"))),
                "groundingSupports",supports,
                "searchEntryPoint",Map.of("renderedContent","<a href=\"https://www.google.com/search?q=INFY\">INFY</a>"));
        return json.valueToTree(Map.of("candidates",List.of(Map.of("finishReason","STOP","groundingMetadata",metadata,
                "content",Map.of("parts",List.of(Map.of("thought",true,"text","thinking"),Map.of("text",raw)))))));
    }
}
