
package dev.finn.market;

import dev.finn.monitoring.PriceEvaluationWorker;
import java.time.LocalDate;
import java.util.UUID;
import java.util.concurrent.Executors;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class PriceEvaluationChecks {
    private PriceEvaluationChecks() {}

    public static void persistsOnlyNewSessionsAndSurvivesRollback(MockMvc mvc, JdbcTemplate jdbc,
            PlatformTransactionManager transactions, PriceEvaluationWorker worker) throws Exception {
        var equity = catalogue(mvc, "fictional-evaluation-owner");
        String rules = "/api/v1/monitoring/rules";
        var created = ok(submit(mvc, rules, equity.owner(), PriceRuleApiChecks.settings(equity.listing())));
        UUID rule = UUID.fromString(created.get("ruleId").asText());
        String history = rules + "/" + rule + "/evaluations";
        var today = LocalDate.now(java.time.ZoneId.of("Asia/Kolkata"));
        close(mvc, equity, today.minusDays(10), "200");
        makeDue(jdbc, rule);
        drain(worker);
        read(mvc, history, equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("STALE"));
        close(mvc, equity, today.minusDays(3), "125");
        makeDue(jdbc, rule);
        new TransactionTemplate(transactions).executeWithoutResult(status -> {
            assertThat(worker.processNext()).isTrue();
            status.setRollbackOnly();
        });
        assertThat(activities(jdbc, rule)).isZero();
        try (var workers = Executors.newFixedThreadPool(2)) {
            var first = workers.submit(worker::processNext);
            var second = workers.submit(worker::processNext);
            first.get();
            second.get();
        }
        assertThat(activities(jdbc, rule)).isEqualTo(1);
        close(mvc, equity, today.minusDays(4), "80");
        close(mvc, equity, today.minusDays(3), "126");
        makeDue(jdbc, rule);
        drain(worker);
        assertThat(activities(jdbc, rule)).isEqualTo(1);
        close(mvc, equity, today.minusDays(2), "90");
        makeDue(jdbc, rule);
        drain(worker);
        close(mvc, equity, today.minusDays(1), "130");
        makeDue(jdbc, rule);
        drain(worker);
        assertThat(activities(jdbc, rule)).isEqualTo(2);
        read(mvc, history, equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].outcome").value("TRIGGERED"))
                .andExpect(jsonPath("$.items[2].observation.close").value("125"));
        read(mvc, history, "fictional-evaluation-other").andExpect(status().isNotFound());
    }

    private static void drain(PriceEvaluationWorker worker) {
        for (int i = 0; i < 16 && worker.processNext(); i++) { /* bounded synthetic work */ }
    }

    private static void makeDue(JdbcTemplate jdbc, UUID rule) {
        jdbc.update("UPDATE finn.monitor_rule SET next_check_at=clock_timestamp()-interval '1 day' WHERE rule_id=?", rule);
    }

    private static int activities(JdbcTemplate jdbc, UUID rule) {
        return jdbc.queryForObject("SELECT count(*) FROM finn.activity WHERE subject_id=?", Integer.class, rule);
    }
}
