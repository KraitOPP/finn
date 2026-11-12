package dev.finn.market;

import dev.finn.research.ResearchExtractionWorker;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static dev.finn.market.ThesisChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class GuidanceChecks {
    private GuidanceChecks() {}

    static String document(MockMvc mvc,String owner,String input)throws Exception{
        return ROOT+"/sources/"+ok(submit(mvc,ROOT+"/sources",owner,input)).path("documentId").asText();
    }

    static String numeric(String anchor,String day,String stage){
        return """
                {"title":"Fictional revenue guidance","kind":"RANGE","stage":"%s","statementDate":"%s",
                 "dimensions":%s,"lower":"120","upper":"130","scale":"CRORE","caveats":"Subject to demand","anchorId":"%s"}
                """.formatted(stage,day,QUARTER,anchor);
    }

    public static void preservesGuidanceAsPublished(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-guidance-owner",other="fictional-guidance-other",company=company(mvc,owner);
        String path=ROOT+"/companies/"+company+"/guidance";
        String original=document(mvc,owner,filing(company,"Fictional company outlook","Management expects revenue of 120 to 130 crore","2025-05-10T10:00:00Z"));
        String anchor=index(mvc,worker,owner,original,1);
        read(mvc,ROOT+"/guidance/candidates/"+anchor,owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.printedNumbers[0]").value("120")).andExpect(jsonPath("$.printedNumbers[1]").value("130"));
        read(mvc,ROOT+"/guidance/candidates/"+anchor,other).andExpect(status().isNotFound());
        String confirmed=numeric(anchor,"2025-05-10","CONFIRMED");
        submit(mvc,path,owner,confirmed.replace("2025-05-10","2025-05-11")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,owner,confirmed.replace("\"130\"","\"131\"")).andExpect(status().isUnprocessableContent());
        submit(mvc,path,owner,confirmed.replace("CONFIRMED","DRAFT").replace("\"130\"","null"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.stage").value("DRAFT"));
        String id=ok(submit(mvc,path,owner,confirmed)).path("guidanceId").asText();
        String update=ROOT+"/guidance/"+id;
        String withdrawal=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional withdrawal","Management withdrew its prior outlook","2025-06-12T10:00:00Z")),1);
        submit(mvc,update,owner,"{\"expectedRevision\":1,\"guidance\":"+numeric(withdrawal,"2025-06-12","WITHDRAWN")+"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.stage").value("WITHDRAWN"));
        read(mvc,update+"/versions",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[1].stage").value("CONFIRMED"))
                .andExpect(jsonPath("$.items[1].anchorId").value(anchor));
        read(mvc,update+"/versions",other).andExpect(status().isNotFound());
    }
}
