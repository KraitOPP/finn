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
    static final String ROOT="/api/v1/research";
    static final String THESIS="""
            {"title":"Fictional growth thesis","rationale":"Compare reviewed results with guidance",
             "risks":"Cyclicality","milestones":"Reviewed results","decision":"MONITOR","decisionNote":"","review":null,"anchorIds":[]}
            """;
    static final String QUARTER="""
            {"metric":"REVENUE","basis":"CONSOLIDATED","periodKind":"QUARTER","periodStart":"2025-04-01",
             "periodEnd":"2025-06-30","unit":"MONEY","currency":"INR"}
            """;

    static String filing(String company,String title,String text,String published){
        return SourceDocumentChecks.source(company,title,null,text).replace("\"publishedAt\":null","\"publishedAt\":\""+published+"\"");
    }

    static String index(MockMvc mvc,ResearchExtractionWorker worker,String owner,String document,int revision)throws Exception {
        String path=document+"/versions/"+revision;
        ok(submit(mvc,path+"/extraction",owner,"{}"));
        worker.processNext();
        return ok(read(mvc,path+"/anchors",owner)).path("items").get(0).path("anchorId").asText();
    }

    static String amount(String dimensions,String anchor,String amount,String scale) {
        return """
                {"dimensions":%s,"anchorId":"%s","amount":"%s","scale":"%s","reviewed":true}
                """.formatted(dimensions,anchor,amount,scale);
    }

    public static void evaluatesComparableEvidenceOnce(MockMvc mvc,ResearchExtractionWorker worker)throws Exception {
        String owner="fictional-condition-owner",other="fictional-condition-other",company=company(mvc,owner);
        String base=ROOT+"/companies/"+company;
        String id=ok(submit(mvc,base+"/theses",owner,THESIS)).path("thesisId").asText();
        String path=ROOT+"/theses/"+id+"/conditions";
        String definition="""
                {"expectedRevision":1,"label":"Revenue threshold","dimensions":%s,"comparator":"GTE",
                 "threshold":"120","scale":"CRORE"}
                """.formatted(QUARTER);
        ok(submit(mvc,path,owner,definition));
        submit(mvc,path+"/check",other,"{}").andExpect(status().isNotFound());
        submit(mvc,path+"/check",owner,"{}").andExpect(status().isOk()).andExpect(jsonPath("$.items[0].lastCheck.state").value("UNKNOWN"));
        String original=filing(company,"Fictional quarter results","Reported revenue 125","2025-07-21T10:00:00Z");
        String document=ROOT+"/sources/"+ok(submit(mvc,ROOT+"/sources",owner,original)).path("documentId").asText();
        String anchor=index(mvc,worker,owner,document,1);
        ok(submit(mvc,base+"/facts",owner,amount(QUARTER.replace("CONSOLIDATED","STANDALONE"),anchor,"125","CRORE")));
        submit(mvc,path+"/check",owner,"{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].lastCheck.state").value("REVIEW_NEEDED"))
                .andExpect(jsonPath("$.items[0].lastCheck.reason").value("DIMENSIONS_MISMATCH"));
        String fact=ok(submit(mvc,base+"/facts",owner,amount(QUARTER,anchor,"125","MILLION")))
                .path("factId").asText();
        String updated="{\"companyId\":\""+company+"\",\"expectedRevision\":1,\"fact\":"+amount(QUARTER,anchor,"125","CRORE")+"}";
        ok(submit(mvc,ROOT+"/facts/"+fact,owner,updated));
        var first=ok(submit(mvc,path+"/check",owner,"{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].lastCheck.state").value("MATCHED")));
        assertThat(ok(submit(mvc,path+"/check",owner,"{}"))).isEqualTo(first);
        String revised=filing(company,"Fictional revised results","Corrected revenue 90","2025-07-23T10:00:00Z");
        ok(submit(mvc,document,owner,"{\"expectedRevision\":1,\"source\":"+revised+"}"));
        submit(mvc,path+"/check",owner,"{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].lastCheck.reason").value("SOURCE_REVISED"));
        String corrected=index(mvc,worker,owner,document,2);
        ok(submit(mvc,ROOT+"/facts/"+fact,owner,"{\"companyId\":\""+company+"\",\"expectedRevision\":2,\"fact\":"
                +amount(QUARTER,corrected,"90","CRORE")+"}"));
        submit(mvc,path+"/check",owner,"{}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].lastCheck.state").value("VIOLATED"))
                .andExpect(jsonPath("$.items[0].lastCheck.fact.revision").value(3));
    }

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
