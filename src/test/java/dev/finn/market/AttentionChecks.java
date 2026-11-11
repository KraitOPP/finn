
package dev.finn.market;

import java.time.*;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.CompanyEventChecks.event;
import static dev.finn.market.SourceDocumentChecks.source;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class AttentionChecks {
    private AttentionChecks() {}
    public static void ranksHoldingsAndPreservesOwnerFeedback(MockMvc mvc)throws Exception {
        var equity=catalogue(mvc,"fictional-attention-owner");
        String owner=equity.owner();
        var account=account(mvc,owner);
        ValuationDatabaseChecks.event(mvc,account,LocalDate.now(ZoneOffset.UTC).minusDays(2),"BUY",equity.security(),"4","10",null,"0");
        String company=ok(read(mvc,"/api/v1/catalog/securities/"+equity.security(),owner)).get("security").get("companyId").asText();
        String doc=ok(submit(mvc,"/api/v1/research/sources",owner,source(company,"Fictional notice",null,"Fictional reviewed evidence"))).get("documentId").asText();
        String id=ok(submit(mvc,"/api/v1/research/events",owner,event(doc,null,null,"Fictional notice","AUDITOR","ANNOUNCED","NEW")
                .replace("\"materiality\":\"UNKNOWN\"","\"materiality\":\"HIGH\""))).get("eventId").asText();
        String path="/api/v1/research/attention";
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].score").value(65))
                .andExpect(jsonPath("$.items[0].holdings[0].quantity").value("4"));
        submit(mvc,path+"/"+id,"fictional-attention-other",feedback(1,"READ",null)).andExpect(status().isNotFound());
        ok(submit(mvc,path+"/"+id,owner,feedback(1,"READ",null)));
        read(mvc,path+"?view=UNREAD",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        ok(submit(mvc,path+"/"+id,owner,feedback(1,"SNOOZE",Instant.now().plus(Duration.ofHours(1)).toString())));
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        read(mvc,path+"?view=HIDDEN",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].event.eventId").value(id));
        ok(submit(mvc,path+"/"+id,owner,feedback(1,"UNSNOOZE",null)));
        ok(submit(mvc,"/api/v1/research/events",owner,event(doc,id,1,"Fictional corrected notice","AUDITOR","CANCELLED","CORRECTION")));
        read(mvc,path+"?view=UNREAD",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].event.revision").value(2));
        read(mvc,path,"fictional-attention-other").andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    private static String feedback(int revision,String action,String until){
        return "{\"eventRevision\":"+revision+",\"action\":\""+action+"\",\"snoozeUntil\":"+JSON.writeValueAsString(until)+"}";
    }
}
