package dev.finn.research;

import static dev.finn.research.StockResearch.*;

import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.net.URI;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
class GroqResearch {
    static final String MODEL = "openai/gpt-oss-120b";
    private static final URI ENDPOINT = URI.create("https://api.groq.com/openai/v1/chat/completions");
    private static final Set<String> BROWSER_TOOLS = Set.of("browser_search","browser.search","browser.open","browser.find");
    private final ResearchProviderClient client;
    private final JsonMapper json;
    private final String apiKey;

    GroqResearch(ResearchProviderClient client, JsonMapper json,
                 @Value("${finn.groq.api-key:${GROQ_API_KEY:}}") String apiKey) {
        this.client = client;
        this.json = json;
        this.apiKey = apiKey.strip();
    }

    boolean configured() { return apiKey.matches("gsk_[A-Za-z0-9_-]{8,200}"); }

    Report run(UUID owner, Catalogue.Listing listing, Preset preset) {
        if (!configured()) throw new ApiFailure(503,"GROQ_NOT_CONFIGURED");
        validateListing(listing);
        var today = LocalDate.now(INDIA);
        var response = client.post(owner,ENDPOINT,"Authorization","Bearer "+apiKey,
                request(listing.exchange(),listing.symbol(),preset,today),"GROQ");
        return decode(response,preset,today);
    }

    static Map<String,Object> request(String exchange, String symbol, Preset preset, LocalDate today) {
        String prompt = prompt(exchange,symbol,preset,today,"Browser Search") + """
            Start with up to four targeted searches. Use a search result when it contains enough evidence.
            Respond with a single JSON object in this shape:
            {"items":[{"title":"Short heading","detail":"Plain-text evidence and context","publishedOn":null,"sourceUrls":["https://exact-url-from-the-browser-tool"]}]}
            Use at most eight items. Use null for publishedOn in analysis, and the article date (YYYY-MM-DD) for news.
            Use two to four concise sentences per item. Copy exact HTTPS URLs returned in Browser Search results
            that support each item. Never invent or rewrite a URL. Omit items without sources. If no news meets
            the requirements, use {"items":[]}. Do not use Markdown, code fences or inline citation markers.
            """;
        return Map.of("model",MODEL,"messages",List.of(Map.of("role","user","content",prompt)),
                "tools",List.of(Map.of("type","browser_search")),"reasoning_effort","low","max_completion_tokens",4096);
    }

    Report decode(JsonNode response, Preset preset, LocalDate today) {
        var choice = response.path("choices").path(0);
        if (!"stop".equals(choice.path("finish_reason").asText())) throw new ApiFailure(502,"GROQ_NO_RESULT");
        var message = choice.path("message");
        var tools = message.path("executed_tools");
        var sources = browserSources(tools);
        var rows = readItems(text(message.path("content"),32000));
        if (sources.isEmpty() && !(preset == Preset.NEWS && rows.isEmpty() && searched(tools)))
            throw new ApiFailure(502,"GROQ_NO_SOURCES");

        var items = new ArrayList<Item>();
        var usedSources = new LinkedHashMap<Integer,Source>();
        var titles = new HashSet<String>();
        for (var row : rows) {
            String title = text(row.path("title"),180);
            String detail = text(row.path("detail"),2400);
            if (title == null || detail == null || !row.path("sourceUrls").isArray()) continue;
            LocalDate published = null;
            if (preset == Preset.NEWS) {
                try {
                    published = LocalDate.parse(row.path("publishedOn").asText());
                } catch (DateTimeException ignored) {
                    continue;
                }
                if (published.isBefore(today.minusDays(29)) || published.isAfter(today)) continue;
            }
            var cited = new LinkedHashMap<Integer,Source>();
            for (var url : row.path("sourceUrls")) {
                var source = sources.get(url.asText());
                if (source != null) cited.put(source.id(),source);
            }
            if (cited.isEmpty() || !titles.add(title.strip().toLowerCase(Locale.ROOT))) continue;
            usedSources.putAll(cited);
            items.add(new Item(title,detail,published,List.copyOf(cited.keySet())));
        }
        if (preset == Preset.NEWS) items.sort(Comparator.comparing(Item::publishedOn).reversed());
        else if (items.isEmpty()) throw new ApiFailure(502,"GROQ_NO_SOURCES");
        return new Report(preset,MODEL,today,List.copyOf(items),List.copyOf(usedSources.values()),null);
    }

    private JsonNode readItems(String raw) {
        if (raw != null) {
            String value = raw.strip();
            if (value.startsWith("```json\n") && value.endsWith("\n```"))
                value = value.substring(8,value.length()-4);
            try {
                var items = json.reader().with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readTree(value).path("items");
                if (items.isArray() && items.size() <= 8) return items;
            } catch (RuntimeException ignored) {
                // Provider output is excluded from errors and logs.
            }
        }
        throw new ApiFailure(502,"GROQ_NO_RESULT");
    }

    private static Map<String,Source> browserSources(JsonNode tools) {
        var sources = new LinkedHashMap<String,Source>();
        if (!tools.isArray()) return sources;
        for (var tool : tools) {
            if (!BROWSER_TOOLS.contains(tool.path("type").asText())) continue;
            for (var result : tool.path("search_results").path("results")) {
                if (sources.size() >= MAX_SOURCES) return sources;
                String url = text(result.path("url"),4000);
                if (!validLink(url) || sources.containsKey(url)) continue;
                String title = text(result.path("title"),240);
                sources.put(url,new Source(sources.size(),title == null ? URI.create(url).getHost() : title,url));
            }
        }
        return sources;
    }

    private static boolean searched(JsonNode tools) {
        for (var tool : tools)
            if (BROWSER_TOOLS.contains(tool.path("type").asText()) && tool.path("search_results").isObject()) return true;
        return false;
    }
}
