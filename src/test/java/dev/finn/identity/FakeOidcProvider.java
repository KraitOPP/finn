package dev.finn.identity;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import tools.jackson.databind.json.JsonMapper;

/** Deterministic local protocol boundary, not a replacement identity implementation. */
final class FakeOidcProvider {
    private final HttpServer server;
    private final com.nimbusds.jose.jwk.RSAKey key;
    private final JsonMapper json = JsonMapper.builder().build();
    final AtomicInteger tokenRequests = new AtomicInteger();
    volatile String nonce;
    volatile String challenge;
    volatile boolean badNonce;
    volatile boolean proofKeyValid;

    FakeOidcProvider() {
        try {
            key = new RSAKeyGenerator(2048).keyID("synthetic-test-key").generate();
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.createContext("/jwks", exchange -> send(exchange, Map.of("keys", java.util.List.of(key.toPublicJWK().toJSONObject()))));
            server.createContext("/userinfo", exchange -> send(exchange, Map.of("sub", "synthetic-protocol-user", "preferred_username", "Synthetic investor")));
            server.createContext("/token", exchange -> {
                try {
                    tokenRequests.incrementAndGet();
                    var parameters = parameters(new String(exchange.getRequestBody().readNBytes(16384), StandardCharsets.UTF_8));
                    String verifier = parameters.get("code_verifier");
                    proofKeyValid = verifier != null && Base64.getUrlEncoder().withoutPadding()
                            .encodeToString(MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII))).equals(challenge);
                    var claims = new JWTClaimsSet.Builder().issuer(issuer()).subject("synthetic-protocol-user")
                            .audience("finn-web").issueTime(Date.from(Instant.now())).expirationTime(Date.from(Instant.now().plusSeconds(120)))
                            .claim("nonce", badNonce ? "not-the-requested-nonce" : nonce).claim("preferred_username", "Synthetic investor").build();
                    var token = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
                    token.sign(new RSASSASigner(key));
                    send(exchange, Map.of("access_token", UUID.randomUUID().toString(), "token_type", "Bearer", "expires_in", 120,
                            "scope", "openid profile", "id_token", token.serialize()));
                } catch (Exception exception) {
                    exchange.sendResponseHeaders(500, -1);
                    exchange.close();
                }
            });
            server.start();
        } catch (Exception exception) { throw new IllegalStateException("Synthetic identity server could not start."); }
    }

    String base() { return "http://127.0.0.1:" + server.getAddress().getPort(); }
    String issuer() { return base() + "/issuer"; }
    void close() { server.stop(0); }
    void observeAuthorization(URI uri) {
        var fields = parameters(uri.getRawQuery());
        nonce = fields.get("nonce");
        challenge = fields.get("code_challenge");
        proofKeyValid = false;
    }

    static Map<String, String> parameters(String query) {
        var result = new LinkedHashMap<String, String>();
        for (String field : query.split("&")) {
            String[] parts = field.split("=", 2);
            if (parts.length == 2) result.put(URLDecoder.decode(parts[0], StandardCharsets.UTF_8), URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        return result;
    }

    private void send(com.sun.net.httpserver.HttpExchange exchange, Object body) throws IOException {
        byte[] bytes = json.writeValueAsBytes(body);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
