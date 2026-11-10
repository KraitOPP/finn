package dev.finn.identity;

import static org.assertj.core.api.Assertions.assertThat;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Duration;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
@Testcontainers
class SessionIntegrationTest {
    private static final String APP_PASSWORD = UUID.randomUUID().toString();
    private static final String MIGRATION_PASSWORD = UUID.randomUUID().toString();
    private static final FakeOidcProvider IDENTITY = new FakeOidcProvider();
    @Container static final PostgreSQLContainer DATABASE = new PostgreSQLContainer(DockerImageName.parse(
            "postgres:18.6-bookworm@sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("finn").withUsername("finn_bootstrap").withPassword(UUID.randomUUID().toString())
            .withCopyToContainer(Transferable.of(APP_PASSWORD.getBytes(StandardCharsets.UTF_8)), "/run/secrets/finn_app_password")
            .withCopyToContainer(Transferable.of(MIGRATION_PASSWORD.getBytes(StandardCharsets.UTF_8)), "/run/secrets/finn_migration_password")
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("deployment/postgres/10-create-roles.sh").toAbsolutePath()), "/docker-entrypoint-initdb.d/10-create-roles.sh");

    @DynamicPropertySource static void properties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", DATABASE::getJdbcUrl);
        properties.add("spring.datasource.password", () -> APP_PASSWORD);
        properties.add("spring.flyway.url", DATABASE::getJdbcUrl);
        properties.add("spring.flyway.password", () -> MIGRATION_PASSWORD);
        properties.add("finn.public-origin", () -> "http://127.0.0.1:5173");
        properties.add("finn.oidc.issuer", IDENTITY::issuer);
        properties.add("finn.oidc.client-secret", () -> UUID.randomUUID().toString());
        properties.add("finn.oidc.authorization-uri", () -> IDENTITY.base() + "/authorize");
        properties.add("finn.oidc.token-uri", () -> IDENTITY.base() + "/token");
        properties.add("finn.oidc.jwk-set-uri", () -> IDENTITY.base() + "/jwks");
        properties.add("finn.oidc.user-info-uri", () -> IDENTITY.base() + "/userinfo");
    }

    @Autowired Environment environment;
    @Autowired JdbcTemplate jdbc;
    private CookieManager cookies;
    private HttpClient browser;
    private final JsonMapper json = JsonMapper.builder().build();

    @BeforeEach void browser() {
        cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        browser = HttpClient.newBuilder().cookieHandler(cookies).followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(5)).build();
        IDENTITY.badNonce = false;
    }
    @AfterAll static void closeProvider() { IDENTITY.close(); }
    private URI url(String path) { return URI.create("http://127.0.0.1:" + environment.getRequiredProperty("local.server.port") + path); }
    private HttpResponse<String> get(String path) throws Exception {
        return browser.send(HttpRequest.newBuilder(url(path)).timeout(Duration.ofSeconds(10)).GET().build(), HttpResponse.BodyHandlers.ofString());
    }
    private JsonNode session() throws Exception { return json.readTree(get("/api/v1/session").body()); }
    private String cookie() { return cookies.getCookieStore().getCookies().stream().filter(cookie -> cookie.getName().equals("FINN_SESSION")).findFirst().orElseThrow().getValue(); }
    private HttpResponse<String> login() throws Exception {
        var authorization = get("/oauth2/authorization/finn");
        assertThat(authorization.statusCode()).isEqualTo(302);
        URI target = URI.create(authorization.headers().firstValue("Location").orElseThrow());
        IDENTITY.observeAuthorization(target);
        assertThat(IDENTITY.nonce).isNotBlank();
        assertThat(IDENTITY.challenge).isNotBlank();
        String state = FakeOidcProvider.parameters(target.getRawQuery()).get("state");
        return get("/login/oauth2/code/finn?code=" + UUID.randomUUID() + "&state=" + URLEncoder.encode(state, StandardCharsets.UTF_8));
    }

    @Test void signedCallbackRotatesSessionAndLogoutRequiresCsrf() throws Exception {
        assertThat(session().get("authenticated").asBoolean()).isFalse();
        String before = cookie();
        assertThat(login().statusCode()).isEqualTo(302);
        JsonNode authenticated = session();
        assertThat(authenticated.get("authenticated").asBoolean()).isTrue();
        assertThat(IDENTITY.proofKeyValid).isTrue();
        assertThat(cookie()).isNotEqualTo(before);
        assertThat(get("/api/v1/me").statusCode()).isEqualTo(200);
        var denied = browser.send(HttpRequest.newBuilder(url("/api/v1/logout")).POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(denied.statusCode()).isEqualTo(403);
        assertThat(session().get("authenticated").asBoolean()).isTrue();
        var logout = browser.send(HttpRequest.newBuilder(url("/api/v1/logout"))
                .header(authenticated.get("csrf").get("headerName").asText(), authenticated.get("csrf").get("token").asText())
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(logout.statusCode()).isEqualTo(302);
        assertThat(session().get("authenticated").asBoolean()).isFalse();
        assertThat(get("/api/v1/me").statusCode()).isEqualTo(401);
    }

    @Test void invalidStateNeverExchangesACodeAndInvalidNonceNeverLogsIn() throws Exception {
        session();
        get("/oauth2/authorization/finn");
        int requests = IDENTITY.tokenRequests.get();
        var rejected = get("/login/oauth2/code/finn?code=" + UUID.randomUUID() + "&state=unrelated-state");
        assertThat(rejected.headers().firstValue("Location").orElseThrow()).endsWith("/?signin=failed");
        assertThat(IDENTITY.tokenRequests.get()).isEqualTo(requests);
        IDENTITY.badNonce = true;
        assertThat(login().headers().firstValue("Location").orElseThrow()).endsWith("/?signin=failed");
        assertThat(session().get("authenticated").asBoolean()).isFalse();
    }

    @Test void expiredDatabaseSessionCannotAccessPrivateRoutes() throws Exception {
        session();
        login();
        assertThat(session().get("authenticated").asBoolean()).isTrue();
        jdbc.update("UPDATE finn.spring_session SET last_access_time=0, max_inactive_interval=1, expiry_time=1 WHERE session_id=?", cookie());
        assertThat(session().get("authenticated").asBoolean()).isFalse();
        assertThat(get("/api/v1/me").statusCode()).isEqualTo(401);
    }

    @Test void activeSessionsStillHaveAnAbsoluteLifetime() throws Exception {
        session();
        login();
        assertThat(session().get("authenticated").asBoolean()).isTrue();
        jdbc.update("UPDATE finn.spring_session SET creation_time=1 WHERE session_id=?", cookie());
        var denied = get("/api/v1/me");
        assertThat(denied.statusCode()).isEqualTo(401);
        assertThat(denied.body()).contains(denied.headers().firstValue("X-Request-ID").orElseThrow());
    }
}
