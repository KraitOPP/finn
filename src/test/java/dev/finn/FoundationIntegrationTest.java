package dev.finn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.images.builder.Transferable;
import org.testcontainers.utility.MountableFile;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class FoundationIntegrationTest {
    private static final String APP_PASSWORD = UUID.randomUUID().toString();
    private static final String MIGRATION_PASSWORD = UUID.randomUUID().toString();

    @Container
    static final PostgreSQLContainer DATABASE = new PostgreSQLContainer(DockerImageName.parse(
            "postgres:18.6-bookworm@sha256:f1ea2a1a4fb7b68d4836be1fdcb8a6466a89b072158bf9d97663600538c294c5").asCompatibleSubstituteFor("postgres"))
            .withDatabaseName("finn").withUsername("finn_bootstrap").withPassword(UUID.randomUUID().toString())
            .withCopyToContainer(Transferable.of(APP_PASSWORD.getBytes(StandardCharsets.UTF_8)), "/run/secrets/finn_app_password")
            .withCopyToContainer(Transferable.of(MIGRATION_PASSWORD.getBytes(StandardCharsets.UTF_8)), "/run/secrets/finn_migration_password")
            .withCopyFileToContainer(MountableFile.forHostPath(Path.of("deployment/postgres/10-create-roles.sh").toAbsolutePath()),
                    "/docker-entrypoint-initdb.d/10-create-roles.sh");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry properties) {
        properties.add("spring.datasource.url", DATABASE::getJdbcUrl);
        properties.add("spring.datasource.username", () -> "finn_app");
        properties.add("spring.datasource.password", () -> APP_PASSWORD);
        properties.add("spring.flyway.url", DATABASE::getJdbcUrl);
        properties.add("spring.flyway.user", () -> "finn_migrator");
        properties.add("spring.flyway.password", () -> MIGRATION_PASSWORD);
        properties.add("finn.public-origin", () -> "http://127.0.0.1:5173");
        properties.add("finn.oidc.issuer", () -> "http://127.0.0.1:1/test-issuer");
        properties.add("finn.oidc.client-secret", () -> UUID.randomUUID().toString());
        properties.add("finn.oidc.authorization-uri", () -> "http://127.0.0.1:1/authorize");
        properties.add("finn.oidc.token-uri", () -> "http://127.0.0.1:1/token");
        properties.add("finn.oidc.jwk-set-uri", () -> "http://127.0.0.1:1/jwks");
        properties.add("finn.oidc.user-info-uri", () -> "http://127.0.0.1:1/userinfo");
    }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired Flyway flyway;

    @Test void migrationsRunOnceAndRuntimeRoleHasOnlyRequiredAccess() throws Exception {
        assertThat(jdbc.queryForObject("SELECT metadata_value FROM finn.application_metadata WHERE metadata_key='data_mode'", String.class))
                .isEqualTo("PUBLIC_SYNTHETIC");
        assertThat(jdbc.queryForObject("SELECT current_user", String.class)).isEqualTo("finn_app");
        assertThatThrownBy(() -> jdbc.execute("CREATE TABLE finn.forbidden_probe (id integer)"))
                .rootCause().hasMessageContaining("permission denied");
        assertThatThrownBy(() -> jdbc.queryForList("SELECT * FROM finn.flyway_schema_history"))
                .rootCause().hasMessageContaining("permission denied");
        assertThat(flyway.migrate().migrationsExecuted).isZero();
        try (var connection = DriverManager.getConnection(DATABASE.getJdbcUrl(), "finn_migrator", MIGRATION_PASSWORD);
             var statement = connection.createStatement();
             var rows = statement.executeQuery("SELECT rolsuper OR rolcreaterole OR rolcreatedb FROM pg_roles WHERE rolname=current_user")) {
            assertThat(rows.next()).isTrue();
            assertThat(rows.getBoolean(1)).isFalse();
        }
    }

    @Test void demoIsSyntheticAndPrivateRoutesStayClosed() throws Exception {
        mvc.perform(get("/api/v1/demo/quote")).andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.contractVersion").value("0.3.0"))
                .andExpect(jsonPath("$.observation.provenance.provider").value("SYNTHETIC"))
                .andExpect(jsonPath("$.observation.provenance.rights.mode").value("SYNTHETIC_PUBLIC_DEMO"));
        mvc.perform(get("/api/v1/portfolios/guessed-id")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"));
        mvc.perform(post("/api/v1/demo/quote")).andExpect(status().isForbidden());
        mvc.perform(get("/actuator/health/readiness")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
    }
}
