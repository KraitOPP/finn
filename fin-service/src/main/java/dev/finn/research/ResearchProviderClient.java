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
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
class ResearchProviderClient {
    private static final int MAX_RESPONSE_BYTES = 512 * 1024;
    private static final long WINDOW = TimeUnit.MINUTES.toNanos(1);
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    private final Semaphore slots = new Semaphore(3);
    private final Map<UUID,ArrayDeque<Long>> attempts = new HashMap<>();
    private final JsonMapper json;
    ResearchProviderClient(JsonMapper json) { this.json = json; }

    JsonNode post(UUID owner, URI endpoint, String header, String credential, Object body, String provider) {
        if (!slots.tryAcquire()) throw new ApiFailure(429,provider+"_RATE_LIMIT");
        try {
            admit(owner,provider);
            var request = HttpRequest.newBuilder(endpoint)
                    .header(header,credential).header("Content-Type","application/json")
                    .timeout(Duration.ofSeconds(50))
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            var task = new FutureTask<>(() -> exchange(request,provider));
            Thread.startVirtualThread(task);
            try {
                return task.get(52,TimeUnit.SECONDS);
            } catch (ExecutionException error) {
                if (error.getCause() instanceof ApiFailure failure) throw failure;
                throw new ApiFailure(502,provider+"_UNAVAILABLE");
            } catch (TimeoutException error) {
                throw new ApiFailure(504,provider+"_TIMEOUT");
            } catch (InterruptedException error) {
                Thread.currentThread().interrupt();
                throw new ApiFailure(503,provider+"_UNAVAILABLE");
            } finally {
                task.cancel(true);
            }
        } finally {
            slots.release();
        }
    }

    private JsonNode exchange(HttpRequest request,String provider) throws IOException, InterruptedException {
        var response = http.send(request,HttpResponse.BodyHandlers.ofInputStream());
        try (var body = response.body()) {
            switch (response.statusCode()) {
                case 200 -> {
                    byte[] bytes = body.readNBytes(MAX_RESPONSE_BYTES+1);
                    if (bytes.length > MAX_RESPONSE_BYTES) throw new IOException("Response exceeds limit");
                    return json.readTree(bytes);
                }
                case 401, 403 -> throw new ApiFailure(502,provider+"_ACCESS_REJECTED");
                case 429 -> throw new ApiFailure(429,provider+"_QUOTA");
                case 400, 404 -> throw new ApiFailure(502,provider+"_REQUEST_REJECTED");
                default -> throw new ApiFailure(502,provider+"_UNAVAILABLE");
            }
        }
    }

    private synchronized void admit(UUID owner,String provider) {
        long now = System.nanoTime();
        attempts.values().removeIf(times -> {
            times.removeIf(time -> now-time >= WINDOW);
            return times.isEmpty();
        });
        var times = attempts.get(owner);
        if ((times != null && times.size() >= 5) || attempts.values().stream().mapToInt(ArrayDeque::size).sum() >= 15)
            throw new ApiFailure(429,provider+"_RATE_LIMIT");
        attempts.computeIfAbsent(owner,ignored -> new ArrayDeque<>()).add(now);
    }
}
