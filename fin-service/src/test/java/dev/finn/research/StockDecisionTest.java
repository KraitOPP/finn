package dev.finn.research;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import dev.finn.instruments.Catalogue;
import dev.finn.market.MarketCharts;
import dev.finn.platform.ApiFailure;
import java.time.Duration;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

class StockDecisionTest {
    private static final String FILING = "https://exchange.example/filing";
    private static final String ARTICLE = "https://news.example/story";
    private static final String UNSOURCED = "https://invalid.example/unsupported";
    private static final LocalDate TODAY = LocalDate.now(StockResearch.INDIA);
    private final JsonMapper json = JsonMapper.builder().build();
    private final UUID owner = UUID.randomUUID();
    private final Catalogue.Listing listing = new Catalogue.Listing(UUID.randomUUID(),UUID.randomUUID(),
            UUID.randomUUID(),"NSE","CASH_EQUITY","EQ","FICT","INR",null,"FICT.NS",
            "REVIEWED","NSE_DIRECTORY",TODAY.minusYears(3));
    private final ResearchProviderClient client = mock(ResearchProviderClient.class);
    private final MarketCharts charts = mock(MarketCharts.class);
    private final GroqResearch research = new GroqResearch(client,mock(Catalogue.class),charts,json,"gsk_test_fixture");

    @Test
    void runsEvidenceAnalystAndCriticWithMarketContext() {
        var market = new MarketCharts.ResearchSnapshot(TODAY.minusDays(25),TODAY.minusDays(1),"203.10","1.80");
        when(charts.researchSnapshot(eq(listing),any())).thenReturn(market);
        var stages = new ArrayList<String>();
        when(client.post(eq(owner),any(),eq("Authorization"),anyString(),any(),eq("GROQ"),any(Duration.class)))
                .thenAnswer(call -> {
                    JsonNode body = json.valueToTree(call.getArgument(4));
                    if (body.has("tools")) {
                        stages.add("search");
                        assertFalse(body.has("response_format"));
                        return collection();
                    }
                    assertTrue(body.at("/response_format/json_schema/strict").asBoolean());
                    assertFalse(body.has("tools"));
                    var data = json.readTree(body.at("/messages/1/content").asText());
                    assertFalse(data.toString().contains(owner.toString()));
                    assertFalse(data.toString().contains(listing.listingId().toString()));
                    assertFalse(data.toString().contains(UNSOURCED));
                    if (data.has("draft")) {
                        stages.add("critic");
                        assertEquals(5,data.path("draft").size());
                        assertFalse(data.path("evidence").has("market"));
                        return completion(checks("CHALLENGED"));
                    }
                    stages.add("analyst");
                    assertFalse(data.has("market"));
                    assertEquals("Underlying results excerpt.",data.at("/excerpts/0/text").asText());
                    assertEquals(1,data.path("news").size());
                    assertEquals(5,data.path("items").size());
                    return completion(assessments());
                });
        var report = research.run(owner,listing,StockResearch.Preset.DEEP_DIVE);
        assertEquals(List.of("search","analyst","critic"),stages);
        assertEquals(StockDecision.Status.REVIEWED,report.decision().status());
        assertEquals(StockDecision.Stance.WATCH,report.decision().stance());
        assertEquals(market,report.decision().market());
        assertEquals(1,report.decision().news().size());
        assertEquals(StockDecision.Verdict.CHALLENGED,report.decision().checks().get(2).verdict());
        var serialized = json.valueToTree(report);
        assertEquals("WATCH",serialized.at("/decision/stance").asText());
        assertEquals("VALUATION",serialized.at("/items/2/factor").asText());
    }

    @Test
    void keepsEvidenceAndWithholdsRecommendationIfCriticTimesOut() {
        when(client.post(eq(owner),any(),anyString(),anyString(),any(),eq("GROQ"),any(Duration.class)))
                .thenReturn(collection()).thenReturn(completion(assessments()))
                .thenThrow(new ApiFailure(504,"GROQ_TIMEOUT"));
        var report = research.run(owner,listing,StockResearch.Preset.DEEP_DIVE);
        assertEquals(StockDecision.Stance.INSUFFICIENT_EVIDENCE,report.decision().stance());
        assertEquals(StockDecision.Status.REVIEW_INCOMPLETE,report.decision().status());
        assertEquals(5,report.decision().assessments().size());
        assertEquals(5,report.items().size());
        assertEquals(1,report.decision().news().size());
        assertEquals(new StockDecision.Issue(StockDecision.Stage.CRITIC,StockDecision.Reason.TIMEOUT,null),
                report.decision().issue());
    }

    @Test
    void returnsMarketContextAndSkipsRetriesWhenSearchQuotaIsReached() {
        var market = new MarketCharts.ResearchSnapshot(TODAY.minusDays(25),TODAY.minusDays(1),"203.10","1.80");
        when(charts.researchSnapshot(eq(listing),any())).thenReturn(market);
        when(client.post(eq(owner),any(),anyString(),anyString(),any(),eq("GROQ"),any(Duration.class)))
                .thenThrow(new ApiFailure(429,"GROQ_QUOTA",61));

        var report = research.run(owner,listing,StockResearch.Preset.DEEP_DIVE);

        assertEquals(market,report.decision().market());
        assertEquals(StockDecision.Stance.INSUFFICIENT_EVIDENCE,report.decision().stance());
        assertEquals(new StockDecision.Issue(StockDecision.Stage.SEARCH,StockDecision.Reason.QUOTA,61),
                report.decision().issue());
        assertTrue(report.items().isEmpty());
        assertTrue(report.sources().isEmpty());
        verify(client).post(eq(owner),any(),anyString(),anyString(),any(),eq("GROQ"),any(Duration.class));
    }

    @Test
    void retriesASearchFailureOnceThenPreservesEvidenceIfAnalysisIsRateLimited() {
        var stages = new ArrayList<String>();
        when(client.post(eq(owner),any(),anyString(),anyString(),any(),eq("GROQ"),any(Duration.class)))
                .thenAnswer(call -> {
                    JsonNode body = json.valueToTree(call.getArgument(4));
                    if (body.has("tools")) {
                        var prompt = body.at("/messages/0/content").asText();
                        if (stages.isEmpty()) {
                            assertTrue(prompt.contains("Use up to two searches"));
                            stages.add("search");
                            throw new ApiFailure(502,"GROQ_SEARCH_FAILED");
                        }
                        assertTrue(prompt.contains("Use one search"));
                        stages.add("fallback");
                        return collection();
                    }
                    stages.add("analyst");
                    throw new ApiFailure(429,"GROQ_QUOTA",15);
                });

        var report = research.run(owner,listing,StockResearch.Preset.DEEP_DIVE);

        assertEquals(List.of("search","fallback","analyst"),stages);
        assertEquals(new StockDecision.Issue(StockDecision.Stage.ANALYST,StockDecision.Reason.QUOTA,15),
                report.decision().issue());
        assertEquals(5,report.items().size());
        assertEquals(1,report.decision().news().size());
    }

    @Test
    void requiresReviewedCoreFactorsAndOnlyAcceptsKnownItemIndices() {
        var collected = research.decode(collection(),StockResearch.Preset.DEEP_DIVE,TODAY);
        var report = collected.report();
        var evidence = new StockDecision.Evidence("FICT",TODAY,report.items(),report.sources(),
                collected.excerpts(),report.decision().news());
        var assessed = StockDecision.assessments(json.valueToTree(assessments()),evidence.items());
        assertEquals(5,assessed.size(), "the extra fabricated item index must be rejected");
        assertEquals(StockDecision.Stance.RESEARCH_FURTHER,StockDecision.finish(evidence,assessed,
                StockDecision.checks(json.valueToTree(checks("SUPPORTED")),assessed)).stance());
        var missingExcerpt = new StockDecision.Evidence(evidence.listing(),TODAY,evidence.items(),evidence.sources(),
                List.of(evidence.excerpts().getFirst()),evidence.news());
        assertEquals(StockDecision.Stance.WATCH,StockDecision.finish(missingExcerpt,assessed,
                StockDecision.checks(json.valueToTree(checks("SUPPORTED")),assessed)).stance());
        assertEquals(StockDecision.Stance.INSUFFICIENT_EVIDENCE,StockDecision.finish(evidence,assessed,
                StockDecision.checks(json.valueToTree(checks("UNSUPPORTED")),assessed)).stance());
        var adverse = new ArrayList<>(assessed);
        adverse.set(2,new StockDecision.Assessment(2,StockDecision.Signal.ADVERSE,"High relative price.","Compare peers."));
        assertEquals(StockDecision.Stance.CAUTION,StockDecision.finish(evidence,adverse,
                StockDecision.checks(json.valueToTree(checks("SUPPORTED")),adverse)).stance());
    }

    private Map<String,Object> assessments() {
        var rows = new ArrayList<Map<String,Object>>();
        for (int i = 0; i < 5; i++) rows.add(Map.of("itemIndex",i,"signal",i < 3 ? "SUPPORTIVE" : "MIXED",
                "rationale","A reason from the test evidence.","watchFor","Review the next filing."));
        rows.add(Map.of("itemIndex",99,"signal","SUPPORTIVE","rationale","Fabricated.","watchFor","No check."));
        return Map.of("assessments",rows);
    }

    private static Map<String,Object> checks(String valuation) {
        var rows = new ArrayList<Map<String,Object>>();
        for (int i = 0; i < 5; i++) rows.add(Map.of("itemIndex",i,"verdict",i == 2 ? valuation : "SUPPORTED",
                "concern","Possible period mismatch.","verify","Check the dates in the filing."));
        return Map.of("checks",rows);
    }

    private JsonNode collection() {
        var items = Arrays.stream(StockDecision.Factor.values()).map(factor -> Map.of("title",factor.name(),
                "factor",factor.name(),"detail","Public fictional evidence.", "sourceUrls",
                List.of(factor == StockDecision.Factor.VALUATION ? ARTICLE : FILING))).toList();
        var result = Map.of("items",items,"news",List.of(news("Future item",TODAY.plusDays(1),FILING),
                news("Too old",TODAY.minusDays(30),FILING),news("Recent result",TODAY,ARTICLE),
                news("Unconfirmed link",TODAY,UNSOURCED),news("Repeat article",TODAY,ARTICLE)));
        var sources = List.of(Map.of("title","Exchange filing","url",FILING,"content","Underlying results excerpt."),
                Map.of("title","Media article","url",ARTICLE,"content","Underlying peer multiples excerpt."));
        return json.valueToTree(Map.of("choices",List.of(Map.of("finish_reason","stop","message",Map.of(
                "content",json.writeValueAsString(result),"executed_tools",List.of(Map.of("type","browser_search",
                        "search_results",Map.of("results",sources))))))));
    }

    private static Map<String,Object> news(String title, LocalDate publishedOn, String url) {
        return Map.of("title",title,"detail","What happened.","impact","Why it matters.",
                "publishedOn",publishedOn.toString(),"sourceUrls",List.of(url));
    }

    private JsonNode completion(Map<String,Object> value) {
        return json.valueToTree(Map.of("choices",List.of(Map.of("finish_reason","stop","message",
                Map.of("content",json.writeValueAsString(value))))));
    }
}
