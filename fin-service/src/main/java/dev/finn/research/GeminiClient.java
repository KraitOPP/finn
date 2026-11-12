package dev.finn.research;

import dev.finn.platform.ApiFailure;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
class GeminiClient {
    private static final int MAX_RESPONSE_BYTES = 512 * 1024;
    private static final long WINDOW = TimeUnit.MINUTES.toNanos(1);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    private final Semaphore slots = new Semaphore(3);
    private final Map<UUID,ArrayDeque<Long>> attempts = new HashMap<>();
    private final JsonMapper json;
    private final String apiKey;
    private final String model;

    GeminiClient(JsonMapper json, @Value("${finn.gemini.api-key:${GEMINI_API_KEY:}}") String apiKey,
                 @Value("${finn.gemini.model:${GEMINI_MODEL:gemini-3.8-flash}}") String model) {
        this.json=json; this.apiKey=apiKey.strip(); this.model=model.strip();
    }

    boolean configured() {
        return !apiKey.isBlank() && apiKey.matches("[A-Za-z0-9_-]{1,256}") &&
                model.matches("gemini-[a-z0-9.-]{1,70}");
    }

    String model() { return model; }

    JsonNode generate(UUID owner, Object body) {
        if (!configured()) throw new ApiFailure(503,"GEMINI_NOT_CONFIGURED");
        if (!slots.tryAcquire()) throw new ApiFailure(429,"GEMINI_RATE_LIMIT");
        try {
            admit(owner);
            var request = HttpRequest.newBuilder(URI.create(
                    "https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent"))
                    .header("x-goog-api-key",apiKey).header("Content-Type","application/json")
                    .timeout(Duration.ofSeconds(50))
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            var task = new FutureTask<>(() -> exchange(request));
            Thread.startVirtualThread(task);
            try {
                return task.get(52,TimeUnit.SECONDS);
            } catch (ExecutionException error) {
                if (error.getCause() instanceof ApiFailure failure) throw failure;
                throw new ApiFailure(502,"GEMINI_UNAVAILABLE");
            } catch (TimeoutException error) {
                throw new ApiFailure(504,"GEMINI_TIMEOUT");
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new ApiFailure(503,"GEMINI_UNAVAILABLE");
            } finally {
                task.cancel(true);
            }
        } finally {
            slots.release();
        }
    }

    private JsonNode exchange(HttpRequest request) throws IOException, InterruptedException {
        var response = http.send(request,HttpResponse.BodyHandlers.ofInputStream());
        try (var body = response.body()) {
            switch (response.statusCode()) {
                case 200 -> {
                    byte[] bytes = body.readNBytes(MAX_RESPONSE_BYTES+1);
                    if (bytes.length > MAX_RESPONSE_BYTES) throw new IOException("Response exceeds limit");
                    return json.readTree(bytes);
                }
                case 401, 403 -> throw new ApiFailure(502,"GEMINI_ACCESS_REJECTED");
                case 429 -> throw new ApiFailure(429,"GEMINI_QUOTA");
                case 400, 404 -> throw new ApiFailure(502,"GEMINI_REQUEST_REJECTED");
                default -> throw new ApiFailure(502,"GEMINI_UNAVAILABLE");
            }
        }
    }

    private synchronized void admit(UUID owner) {
        long now = System.nanoTime();
        attempts.values().removeIf(times -> {
            times.removeIf(time -> now-time >= WINDOW);
            return times.isEmpty();
        });
        var times = attempts.get(owner);
        if ((times != null && times.size() >= 5) || attempts.values().stream().mapToInt(ArrayDeque::size).sum() >= 15)
            throw new ApiFailure(429,"GEMINI_RATE_LIMIT");
        attempts.computeIfAbsent(owner,ignored -> new ArrayDeque<>()).add(now);
    }
}
