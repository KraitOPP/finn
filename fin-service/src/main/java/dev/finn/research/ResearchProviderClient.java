package dev.finn.research;

import dev.finn.platform.ApiFailure;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpHeaders;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.http.HttpTimeoutException;
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
    private final Map<String,Long> quotaUntil = new HashMap<>();
    private final JsonMapper json;
    ResearchProviderClient(JsonMapper json) { this.json = json; }

    JsonNode post(UUID owner, URI endpoint, String header, String credential, Object body, String provider) {
        return post(owner,endpoint,header,credential,body,provider,Duration.ofSeconds(50));
    }

    JsonNode post(UUID owner, URI endpoint, String header, String credential, Object body, String provider, Duration budget) {
        if (!slots.tryAcquire()) throw new ApiFailure(429,provider+"_RATE_LIMIT");
        try {
            admit(owner,provider);
            var request = HttpRequest.newBuilder(endpoint)
                    .header(header,credential).header("Content-Type","application/json")
                    .timeout(budget)
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body))).build();
            var task = new FutureTask<>(() -> exchange(request,provider));
            Thread.startVirtualThread(task);
            try {
                return task.get(budget.toMillis()+1000,TimeUnit.MILLISECONDS);
            } catch (ExecutionException error) {
                if (error.getCause() instanceof ApiFailure failure) throw failure;
                if (error.getCause() instanceof HttpTimeoutException) throw new ApiFailure(504,provider+"_TIMEOUT");
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
                case 429 -> throw quota(provider,response.headers());
                case 400 -> {
                    if ("GROQ".equals(provider) && failedBrowserTool(body.readNBytes(32768)))
                        throw new ApiFailure(502,"GROQ_SEARCH_FAILED");
                    throw new ApiFailure(502,provider+"_REQUEST_REJECTED");
                }
                case 404 -> throw new ApiFailure(502,provider+"_REQUEST_REJECTED");
                case 424 -> throw new ApiFailure(502,"GROQ".equals(provider) ? "GROQ_SEARCH_FAILED" : provider+"_UNAVAILABLE");
                default -> throw new ApiFailure(502,provider+"_UNAVAILABLE");
            }
        }
    }

    private boolean failedBrowserTool(byte[] bytes) {
        try {
            var error = json.readTree(bytes);
            return error != null && "tool_use_failed".equals(error.path("error").path("code").asText());
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private synchronized ApiFailure quota(String provider,HttpHeaders headers) {
        String header = headers.firstValue("Retry-After").orElse("");
        int seconds = header.matches("[0-9]{1,5}") ? Integer.parseInt(header) : 0;
        if (seconds > 0 && seconds <= 86400) {
            quotaUntil.merge(provider,System.nanoTime()+TimeUnit.SECONDS.toNanos(seconds),Math::max);
            return new ApiFailure(429,provider+"_QUOTA",seconds);
        }
        return new ApiFailure(429,provider+"_QUOTA");
    }

    private synchronized void admit(UUID owner,String provider) {
        long now = System.nanoTime();
        var blockedUntil = quotaUntil.get(provider);
        if (blockedUntil != null) {
            long remaining = blockedUntil-now;
            if (remaining > 0) {
                int seconds = (int) TimeUnit.NANOSECONDS.toSeconds(remaining-1)+1;
                throw new ApiFailure(429,provider+"_QUOTA",seconds);
            }
            quotaUntil.remove(provider);
        }
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
