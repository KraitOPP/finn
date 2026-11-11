package dev.finn;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
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

@SpringBootTest(properties="finn.jobs.enabled=false")
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
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean dev.finn.market.YahooProcess yahoo;
    @Autowired dev.finn.market.MarketPrices prices;

    @Test void watchlistsDeduplicateAndStayOwnerScoped() throws Exception { dev.finn.market.WatchlistDatabaseChecks.separatesListsAndDuplicateListings(mvc); }
    @Test void datedSnapshotsRetainExactInputsAndGaps() throws Exception { dev.finn.market.SnapshotDatabaseChecks.snapshotsKeepGapsAndImmutableInputs(mvc,prices,jobs,yahoo); }
    @Test void currentValuationKeepsMissingPricesAndFlowsSeparate() throws Exception { dev.finn.market.ValuationDatabaseChecks.valuesAreScopedAndKeepFlowsSeparate(mvc); }
    @Test void privateObservationsAreDurableAcrossProviderFailures() throws Exception {
        dev.finn.market.MarketDatabaseChecks.observationsAreScopedAndDurable(mvc,jdbc,jobs,prices,yahoo);
    }
    @Autowired dev.finn.jobs.JobQueue jobs;
    @Autowired dev.finn.imports.HoldingsImports imports;
    @Autowired dev.finn.imports.HoldingsImportWorker importWorker;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;

    @Test void holdingsPreviewIsPrivateAndSurvivesAnExpiredLease() throws Exception {ImportDatabaseChecks.previewOwnershipAndRecovery(mvc,jdbc,jobs,imports,importWorker);}
    @Test void unsafeHoldingsPackagesNeverBecomeDownloadableOrPost() throws Exception {ImportDatabaseChecks.rejectsUnsafeUploads(mvc,importWorker);}
    @Test void exhaustedImportCanBeRetriedWithoutChangingTheOriginalJob() throws Exception {ImportDatabaseChecks.exhaustedLeaseCanBeRetriedAsANewJob(mvc,jdbc,jobs,importWorker);}
    @Test void reviewedHoldingsAcceptanceIsAtomicAndIdempotent() throws Exception {ImportDatabaseChecks.atomicReviewedOpening(mvc,importWorker,transactions);}
    @Test void overlappingExportsAreDeduplicatedOrFlaggedForReview() throws Exception {ImportDatabaseChecks.overlappingReportsNeverPostAgain(mvc,importWorker);}
    @Test void reconciliationUsesReportDateAndRetainsReviewRevision() throws Exception {ImportDatabaseChecks.reconcileByReportDateWithoutRewritingTheLedger(mvc,importWorker);}

    @Test void ledgerCommandsAreIdempotentAndCorrectionsAreAtomic() throws Exception {LedgerDatabaseChecks.recordCorrectAndReplay(mvc,jdbc);}
    @Test void competingLedgerWritesCannotOversell() throws Exception {LedgerDatabaseChecks.concurrentSales(mvc);}
    @Test void reviewedCorporateActionsConserveCostAndDeduplicateCash() throws Exception {LedgerDatabaseChecks.reviewedCorporateActions(mvc);}
    @Test void journalExportPreservesHistoryAndNeutralizesFormulas() throws Exception {LedgerDatabaseChecks.exportsAreScopedAndSpreadsheetSafe(mvc);}

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
                .andExpect(jsonPath("$.contractVersion").value("0.17.0"))
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

    @Test void preferencesAreOwnedValidatedAndProtectedAgainstLostUpdates() throws Exception {
        var first=oidcLogin().idToken(token -> token.claim("iss", "http://127.0.0.1:1/test-issuer").subject("fictional-preference-one"));
        var second=oidcLogin().idToken(token -> token.claim("iss", "http://127.0.0.1:1/test-issuer").subject("fictional-preference-two"));
        mvc.perform(get("/api/v1/preferences")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/preferences").with(first)).andExpect(status().isOk())
                .andExpect(jsonPath("$.timeZone").value("Asia/Kolkata")).andExpect(jsonPath("$.revision").value(0));
        String changed="""
                {"timeZone":"Europe/London","currency":"INR","inAppNotifications":false,"emailNotifications":true,"revision":0}
                """;
        mvc.perform(put("/api/v1/preferences").with(first).contentType("application/json").content(changed)).andExpect(status().isForbidden());
        mvc.perform(put("/api/v1/preferences").with(first).with(csrf()).contentType("application/json").content(changed))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(1)).andExpect(jsonPath("$.deliveryAvailable").value(false));
        mvc.perform(get("/api/v1/preferences").with(second).param("owner", "fictional-preference-one"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.timeZone").value("Asia/Kolkata"));
        mvc.perform(put("/api/v1/preferences").with(first).with(csrf()).contentType("application/json").content(changed))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("REVIEW_REQUIRED"));
        mvc.perform(put("/api/v1/preferences").with(first).with(csrf()).contentType("application/json").content(changed.replace("Europe/London", "Secret/Invalid")))
                .andExpect(status().isUnprocessableContent()).andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("Secret/Invalid"))));
        mvc.perform(put("/api/v1/preferences").with(second).with(csrf()).contentType("application/json").content(changed.replace("\"revision\":0", "\"revision\":0,\"ownerId\":\"untrusted\"")))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/preferences").with(first)).andExpect(jsonPath("$.timeZone").value("Europe/London"));
    }

    @Test void catalogueKeepsVenuesAndHistoryDistinctAndDeniesGuessedNestedIds() throws Exception {
        var first=oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject("fictional-catalogue-one"));
        var second=oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject("fictional-catalogue-two"));
        var json=tools.jackson.databind.json.JsonMapper.builder().build();
        var company=json.readTree(mvc.perform(post("/api/v1/catalog/companies").with(first).with(csrf()).contentType("application/json").content("{\"name\":\"Fictional Company\"}"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String input="""
                {"companyId":"%s","name":"Fictional Equity","isin":"%s","confirmed":true}
                """.formatted(company.get("companyId").asText(),dev.finn.instruments.CatalogueTest.fictionalIsin());
        mvc.perform(post("/api/v1/catalog/securities").with(second).with(csrf()).contentType("application/json").content(input)).andExpect(status().isNotFound());
        var security=json.readTree(mvc.perform(post("/api/v1/catalog/securities").with(first).with(csrf()).contentType("application/json").content(input)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String id=security.get("securityId").asText(),path="/api/v1/catalog/securities/"+id;
        mvc.perform(post("/api/v1/catalog/securities").with(first).with(csrf()).contentType("application/json").content(input)).andExpect(status().isConflict());
        mvc.perform(get(path).with(first)).andExpect(jsonPath("$.listings.length()").value(0));
        String listing="""
                {"exchange":"NSE","series":"EQ","symbol":"DEMOOLD","providerSymbol":"DEMOOLD.NS","validFrom":"2020-01-01","confirmed":true}
                """;
        var nse=json.readTree(mvc.perform(post(path+"/listings").with(first).with(csrf()).contentType("application/json").content(listing)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var bse=json.readTree(mvc.perform(post(path+"/listings").with(first).with(csrf()).contentType("application/json").content(listing.replace("NSE","BSE").replace(".NS", ".BO")))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(nse.get("listingId").asText()).isNotEqualTo(bse.get("listingId").asText());
        assertThat(nse.get("securityId")).isEqualTo(bse.get("securityId"));
        mvc.perform(get(path).with(second)).andExpect(status().isNotFound());
        mvc.perform(post(path+"/listings").with(second).with(csrf()).contentType("application/json").content(listing)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/catalog/securities").with(second)).andExpect(jsonPath("$.items.length()").value(0));
        String symbols="/api/v1/catalog/listings/"+nse.get("listingId").asText()+"/symbols";
        mvc.perform(get(symbols).with(second)).andExpect(status().isNotFound());
        String rename="{\"symbol\":\"DEMONEW\",\"providerSymbol\":\"DEMONEW.NS\",\"effectiveDate\":\"2021-01-01\",\"confirmed\":true}";
        mvc.perform(post(symbols).with(first).with(csrf()).contentType("application/json").content(rename))
                .andExpect(status().isOk()).andExpect(jsonPath("$.listingId").value(nse.get("listingId").asText())).andExpect(jsonPath("$.securityId").value(id));
        mvc.perform(get(symbols).with(first)).andExpect(jsonPath("$[0].symbol").value("DEMOOLD")).andExpect(jsonPath("$[0].validTo").value("2021-01-01")).andExpect(jsonPath("$[1].symbol").value("DEMONEW"));
        mvc.perform(post(symbols).with(first).with(csrf()).contentType("application/json").content(rename)).andExpect(status().isConflict());
        mvc.perform(get(path).with(first)).andExpect(jsonPath("$.listings.length()").value(2)).andExpect(jsonPath("$.listings[0].symbol").value("DEMOOLD"));
        mvc.perform(post(symbols).with(first).with(csrf()).contentType("application/json").content(rename.replace(".NS",".BO"))).andExpect(status().isUnprocessableContent());
    }

    @Test void portfolioAccountsStayOwnedAndArchivePreservesHistory() throws Exception {
        var first=oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject("fictional-portfolio-one"));
        var second=oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject("fictional-portfolio-two"));
        var json=tools.jackson.databind.json.JsonMapper.builder().build();
        String create="{\"name\":\"Fictional long-term portfolio\"}";
        var portfolio=json.readTree(mvc.perform(post("/api/v1/portfolios").with(first).with(csrf()).contentType("application/json").content(create)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        var another=json.readTree(mvc.perform(post("/api/v1/portfolios").with(first).with(csrf()).contentType("application/json").content(create)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        String path="/api/v1/portfolios/"+portfolio.get("portfolioId").asText();
        String accountInput="{\"name\":\"Fictional Groww source\",\"source\":\"GROWW\",\"currency\":\"INR\"}";
        var account=json.readTree(mvc.perform(post(path+"/accounts").with(first).with(csrf()).contentType("application/json").content(accountInput))
                .andExpect(status().isOk()).andExpect(jsonPath("$.historyStatus").value("UNKNOWN")).andExpect(jsonPath("$.historyStartDate").isEmpty()).andReturn().getResponse().getContentAsString());
        String accountPath=path+"/accounts/"+account.get("accountId").asText();
        mvc.perform(get(path).with(second)).andExpect(status().isNotFound());
        mvc.perform(get(accountPath).with(second)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/portfolios/"+another.get("portfolioId").asText()+"/accounts/"+account.get("accountId").asText()).with(first)).andExpect(status().isNotFound());
        mvc.perform(post(path+"/accounts").with(second).with(csrf()).contentType("application/json").content(accountInput)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/portfolios").with(second)).andExpect(jsonPath("$.items.length()").value(0));
        mvc.perform(post(path+"/archive").with(first).with(csrf()).contentType("application/json").content("{\"archived\":true,\"revision\":0}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(true)).andExpect(jsonPath("$.revision").value(1));
        mvc.perform(post(path+"/accounts").with(first).with(csrf()).contentType("application/json").content(accountInput)).andExpect(status().isConflict());
        mvc.perform(get(accountPath).with(first)).andExpect(status().isOk()).andExpect(jsonPath("$.accountId").value(account.get("accountId").asText()));
        mvc.perform(post(path+"/archive").with(first).with(csrf()).contentType("application/json").content("{\"archived\":false,\"revision\":0}"))
                .andExpect(status().isConflict());
        mvc.perform(post(path+"/archive").with(first).with(csrf()).contentType("application/json").content("{\"archived\":false,\"revision\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.archived").value(false));
        mvc.perform(get(path).with(first)).andExpect(jsonPath("$.accounts.length()").value(1));
        mvc.perform(post(path+"/accounts").with(first).with(csrf()).contentType("application/json").content(accountInput.replace("INR","USD"))).andExpect(status().isUnprocessableContent());
    }
}
