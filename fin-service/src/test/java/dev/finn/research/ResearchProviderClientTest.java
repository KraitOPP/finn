package dev.finn.research;

import static org.junit.jupiter.api.Assertions.*;

import com.sun.net.httpserver.HttpServer;
import dev.finn.platform.ApiFailure;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.json.JsonMapper;

class ResearchProviderClientTest {
    private final ResearchProviderClient client = new ResearchProviderClient(JsonMapper.builder().build());

    @Test
    void honorsRetryAfterAcrossRequestsToTheSameProvider() throws Exception {
        var requests = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        try {
            server.createContext("/",exchange -> {
                try (exchange) {
                    requests.incrementAndGet();
                    exchange.getResponseHeaders().add("Retry-After","60");
                    exchange.sendResponseHeaders(429,-1);
                }
            });
            server.start();
            var first = assertThrows(ApiFailure.class,() -> post(server,"GROQ"));
            assertEquals("GROQ_QUOTA",first.code());
            assertEquals(60,first.retryAfterSeconds());
            var blocked = assertThrows(ApiFailure.class,() -> post(server,"GROQ"));
            assertEquals("GROQ_QUOTA",blocked.code());
            assertTrue(blocked.retryAfterSeconds() > 0 && blocked.retryAfterSeconds() <= 60);
            assertEquals(1,requests.get());
        } finally {
            server.stop(0);
        }
    }

    @Test
    void identifiesGroqBrowserToolFailuresWithoutExposingProviderText() throws Exception {
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1",0),0);
        try {
            server.createContext("/",exchange -> {
                try (exchange) {
                    byte[] body = "{\"error\":{\"code\":\"tool_use_failed\",\"message\":\"internal diagnostics\"}}"
                            .getBytes(StandardCharsets.UTF_8);
                    exchange.sendResponseHeaders(400,body.length);
                    exchange.getResponseBody().write(body);
                }
            });
            server.start();
            var failure = assertThrows(ApiFailure.class,() -> post(server,"GROQ"));
            assertEquals("GROQ_SEARCH_FAILED",failure.getMessage());
        } finally {
            server.stop(0);
        }
    }

    private void post(HttpServer server, String provider) {
        var endpoint = URI.create("http://127.0.0.1:"+server.getAddress().getPort());
        client.post(UUID.randomUUID(),endpoint,"Authorization","fixture",Map.of("request","fixture"),provider,
                Duration.ofSeconds(5));
    }
}
