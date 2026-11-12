
package dev.finn.market;

import dev.finn.monitoring.PortfolioBriefs;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class BriefChecks {
    private BriefChecks() {}
    public static void schedulesAClosedWindowWithoutDuplicateRuns(MockMvc mvc,JdbcTemplate jdbc,PortfolioBriefs briefs) throws Exception {
        String subject = "fictional-brief-owner";
        String path = "/api/v1/monitoring/briefs";
        var today = LocalDate.now(ZoneOffset.UTC);
        var first = LocalDateTime.now(ZoneOffset.UTC).plusDays(1).truncatedTo(ChronoUnit.MINUTES);
        var body = """
                {"expectedRevision":0,"settings":{"scheduledLocal":"%s","timeZone":"UTC","cadence":"DAILY","enabled":true,
                "includeAlerts":true,"includeReminders":false,"includeCompany":true,"includeValuations":true}}
                """.formatted(first);
        ok(submit(mvc,path+"/schedule",subject,body));
        read(mvc,path+"/preview",subject).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.windowEnd").value(today.atStartOfDay(ZoneOffset.UTC).toInstant().toString()));
        var owner = jdbc.queryForObject("SELECT user_id FROM finn.app_user WHERE subject=?",UUID.class,subject);
        var before = today.minusDays(1).atTime(12,0).atOffset(ZoneOffset.UTC);
        jdbc.update("""
                INSERT INTO finn.activity(activity_id,owner_id,kind,subject_id,dedupe_key,title,available_at,created_at)
                VALUES (?,?,'PRICE_RULE',?,'example','Fictional prior alert',?,?)
                """,UUID.randomUUID(),owner,UUID.randomUUID(),before,before);
        for(int i=0;i<2;i++){
            jdbc.update("UPDATE finn.brief_schedule SET next_at=? WHERE owner_id=?",today.atStartOfDay().atOffset(ZoneOffset.UTC),owner);
            assertThat(briefs.processNext()).isTrue();
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.brief_run WHERE owner_id=?",Integer.class,owner)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.activity WHERE owner_id=? AND kind='PORTFOLIO_BRIEF'",Integer.class,owner)).isEqualTo(1);
        var index = ok(read(mvc,path,subject));
        String id = index.get("runs").get(0).get("runId").asText();
        read(mvc,path+"/"+id,subject).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].title").value("Fictional prior alert"));
        read(mvc,path+"/"+id,"fictional-brief-other").andExpect(status().isNotFound());
    }
}
