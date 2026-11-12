package dev.finn.research;

import dev.finn.platform.ApiFailure;
import java.net.URI;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;

@Component
class GeminiClient {
    private final ResearchProviderClient client;
    private final String apiKey;
    private final String model;

    GeminiClient(ResearchProviderClient client, @Value("${finn.gemini.api-key:${GEMINI_API_KEY:}}") String apiKey,
                 @Value("${finn.gemini.model:${GEMINI_MODEL:gemini-3.8-flash}}") String model) {
        this.client=client; this.apiKey=apiKey.strip(); this.model=model.strip();
    }

    boolean configured() {
        return !apiKey.isBlank() && apiKey.matches("[A-Za-z0-9_-]{1,256}") &&
                model.matches("gemini-[a-z0-9.-]{1,70}");
    }

    String model() { return model; }

    JsonNode generate(UUID owner, Object body) {
        if (!configured()) throw new ApiFailure(503,"GEMINI_NOT_CONFIGURED");
        URI endpoint = URI.create("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent");
        return client.post(owner,endpoint,"x-goog-api-key",apiKey,body,"GEMINI");
    }
}
