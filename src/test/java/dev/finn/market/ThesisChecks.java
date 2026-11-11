package dev.finn.market;

import dev.finn.research.ResearchExtractionWorker;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ThesisChecks {
    private ThesisChecks() {}

    public static void keepsOriginalThesisAndSchedulesReview(MockMvc mvc,ResearchExtractionWorker worker)throws Exception {
        String owner="fictional-thesis-owner",other="fictional-thesis-other";
        String company=company(mvc,owner),wrongCompany=company(mvc,other);
        String anchor=FinancialFactChecks.anchors(mvc,worker,owner,company).get(1).get("anchorId").asText();
        String local=LocalDateTime.now(ZoneId.of("Asia/Kolkata")).plusDays(1).format(DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm"));
        String input="""
                {"title":"Fictional revenue thesis","rationale":"Original rationale","risks":"Customer concentration",
                 "milestones":"Next reviewed results","decision":"MONITOR","decisionNote":"",
                 "review":{"scheduledLocal":"%s","timeZone":"Asia/Kolkata"},"anchorIds":["%s"]}
                """.formatted(local,anchor);
        String root="/api/v1/research",companies=root+"/companies/";
        submit(mvc,companies+wrongCompany+"/theses",other,input).andExpect(status().isNotFound());
        var original=ok(submit(mvc,companies+company+"/theses",owner,input));
        var reminder=original.path("reminderId").asText();
        assertThat(reminder).isNotBlank();
        read(mvc,"/api/v1/monitoring/reminders",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].reminderId").value(reminder))
                .andExpect(jsonPath("$.items[0].settings.scheduledLocal").value(local));
        String thesis=root+"/theses/"+original.path("thesisId").asText();
        String revision="{\"expectedRevision\":1,\"thesis\":"+input.replace("Original rationale","Updated rationale")+"}";
        ok(submit(mvc,thesis,owner,revision));
        submit(mvc,thesis,owner,revision).andExpect(status().isConflict());
        read(mvc,thesis+"/versions",other).andExpect(status().isNotFound());
        read(mvc,thesis+"/versions",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].rationale").value("Updated rationale"))
                .andExpect(jsonPath("$.items[0].reminderId").value(reminder))
                .andExpect(jsonPath("$.items[1].rationale").value("Original rationale"))
                .andExpect(jsonPath("$.items[1].anchorIds[0]").value(anchor));
        String closed=input.replace("\"MONITOR\"","\"CLOSE\"").replace("\"decisionNote\":\"\"","\"decisionNote\":\"Test closed\"")
                .replace("{\"scheduledLocal\":\""+local+"\",\"timeZone\":\"Asia/Kolkata\"}","null");
        submit(mvc,thesis,owner,"{\"expectedRevision\":2,\"thesis\":"+closed+"}").andExpect(status().isOk());
        read(mvc,"/api/v1/monitoring/reminders",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].state").value("CANCELLED"));
    }
}
