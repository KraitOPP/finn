package dev.finn.research;

import static dev.finn.research.StockResearch.*;

import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
class GeminiResearch {
    record Capability(boolean configured, String model) {}
    private record Support(int start, int end, List<Integer> ids) {}
    private final GeminiClient client;
    private final JsonMapper json;

    GeminiResearch(GeminiClient client, JsonMapper json) {
        this.client=client; this.json=json;
    }

    Capability capability() { return new Capability(client.configured(),client.configured() ? client.model() : null); }

    Report run(UUID owner, Catalogue.Listing listing, Preset preset) {
        validateListing(listing);
        var today = LocalDate.now(INDIA);
        return decode(client.generate(owner,request(listing.exchange(),listing.symbol(),preset,today)),preset,client.model(),today);
    }

    static Map<String,Object> request(String exchange, String symbol, Preset preset, LocalDate today) {
        boolean news = preset == Preset.NEWS;
        var properties = new LinkedHashMap<String,Object>();
        properties.put("title",Map.of("type","string","description","A short heading."));
        properties.put("detail",Map.of("type","string","description",news ?
                "Two concise sentences describing the event and its relevance." :
                "Two to five clear sentences with material facts, period labels, context and caveats."));
        if (news) properties.put("publishedOn",Map.of("type","string","format","date"));
        var item = Map.of("type","object","properties",properties,"required",List.copyOf(properties.keySet()));
        var schema = Map.of("type","object","properties",Map.of("items",
                Map.of("type","array","items",item,"maxItems",8)),"required",List.of("items"));
        String prompt = prompt(exchange,symbol,preset,today,"Google Search")+
                "Use plain text. Do not include URLs or citation markers in JSON.";
        return Map.of("contents",List.of(Map.of("parts",List.of(Map.of("text",prompt)))),
                "tools",List.of(Map.of("googleSearch",Map.of())),
                "generationConfig",Map.of("responseFormat",Map.of("text",Map.of("mimeType","APPLICATION_JSON","schema",schema)),
                        "maxOutputTokens",8192));
    }

    Report decode(JsonNode response, Preset preset, String model, LocalDate today) {
        var candidate = response.path("candidates").path(0);
        if (!"STOP".equals(candidate.path("finishReason").asText())) throw new ApiFailure(502,"GEMINI_NO_RESULT");
        var grounding = candidate.path("groundingMetadata");
        var sources = new LinkedHashMap<Integer,Source>();
        var chunks = grounding.path("groundingChunks");
        for (int i = 0; i < Math.min(MAX_SOURCES,chunks.size()); i++) {
            var web = chunks.path(i).path("web");
            String url = text(web.path("uri"),4000);
            if (!validLink(url)) continue;
            String title = text(web.path("title"),240);
            sources.put(i,new Source(i,title == null ? URI.create(url).getHost() : title,url));
        }
        String suggestions = text(grounding.path("searchEntryPoint").path("renderedContent"),64000);
        if (sources.isEmpty() || suggestions == null) {
            if (preset == Preset.NEWS && sources.isEmpty() && suggestions == null && emptyItems(candidate))
                return new Report(preset,model,today,List.of(),List.of(),null);
            throw new ApiFailure(502,"GEMINI_NO_SOURCES");
        }
        var output = output(candidate);
        var raw = output.getValue();
        var items = parse(raw);
        int bytes = raw.getBytes(StandardCharsets.UTF_8).length;
        List<Support> supports = supports(grounding,output.getKey(),bytes,sources.keySet());
        var result = new ArrayList<Item>();
        var titles = new HashSet<String>();
        for (var row : items) {
            String title = text(row.path("title"),180);
            String detail = text(row.path("detail"),2400);
            if (title == null || detail == null || !titles.add(title.strip().toLowerCase(Locale.ROOT))) continue;
            var ids = citations(raw,title,detail,supports);
            LocalDate published = null;
            if (preset == Preset.NEWS) {
                try {
                    published = LocalDate.parse(row.path("publishedOn").asText());
                } catch (DateTimeException ignored) {
                    continue;
                }
                if (published.isBefore(today.minusDays(29)) || published.isAfter(today) || ids.isEmpty()) continue;
            }
            result.add(new Item(title,detail,published,ids));
        }
        if (preset == Preset.NEWS) result.sort(Comparator.comparing(Item::publishedOn).reversed());
        else if (result.isEmpty()) throw new ApiFailure(502,"GEMINI_NO_RESULT");
        return new Report(preset,model,today,List.copyOf(result),List.copyOf(sources.values()),suggestions);
    }

    private boolean emptyItems(JsonNode candidate) {
        try { return parse(output(candidate).getValue()).isEmpty(); }
        catch (ApiFailure ignored) { return false; }
    }

    private static Map.Entry<Integer,String> output(JsonNode candidate) {
        var parts = candidate.path("content").path("parts");
        Map.Entry<Integer,String> found = null;
        for (int i = 0; i < parts.size(); i++) {
            var part = parts.path(i);
            if (part.path("thought").asBoolean(false) || !part.path("text").isString()) continue;
            if (found != null) throw new ApiFailure(502,"GEMINI_NO_RESULT");
            found = Map.entry(i,part.path("text").asText());
        }
        if (found == null) throw new ApiFailure(502,"GEMINI_NO_RESULT");
        return found;
    }

    private JsonNode parse(String raw) {
        try {
            var items = json.readTree(raw).path("items");
            if (items.isArray() && items.size() <= 8) return items;
        } catch (RuntimeException ignored) {
            // Provider content is never included in errors.
        }
        throw new ApiFailure(502,"GEMINI_NO_RESULT");
    }

    private static List<Support> supports(JsonNode metadata, int part, int length, Set<Integer> ids) {
        var result = new ArrayList<Support>();
        for (var row : metadata.path("groundingSupports")) {
            var segment = row.path("segment");
            int start = segment.path("startIndex").asInt(0), end = segment.path("endIndex").asInt(-1);
            if (segment.path("partIndex").asInt(part) != part || start < 0 || start >= end || end > length) continue;
            var sources = new ArrayList<Integer>();
            for (var index : row.path("groundingChunkIndices"))
                if (index.isIntegralNumber() && ids.contains(index.asInt())) sources.add(index.asInt());
            if (!sources.isEmpty()) result.add(new Support(start,end,sources));
        }
        return result;
    }

    private List<Integer> citations(String raw, String title, String detail, List<Support> supports) {
        var ids = new LinkedHashSet<Integer>();
        for (String value : List.of(title,detail)) {
            String encoded = json.writeValueAsString(value);
            int offset = raw.indexOf(encoded);
            if (offset < 0 || raw.indexOf(encoded,offset+encoded.length()) >= 0) continue;
            int start = raw.substring(0,offset+1).getBytes(StandardCharsets.UTF_8).length;
            int end = start+encoded.getBytes(StandardCharsets.UTF_8).length-2;
            for (var support : supports)
                if (support.start() < end && support.end() > start) ids.addAll(support.ids());
        }
        return List.copyOf(ids);
    }

}
