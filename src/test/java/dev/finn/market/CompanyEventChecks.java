
package dev.finn.market;

import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class CompanyEventChecks {
    private CompanyEventChecks() {}
    public static void distinctTypesAndDuplicateEvidence(MockMvc mvc) throws Exception {
        String owner="fictional-event-owner", company=company(mvc,owner);
        String docs="/api/v1/research/sources", events="/api/v1/research/events";
        hint(mvc,owner,company,"Newspaper advertisement for quarterly results board meeting","RESULTS_MEETING");
        hint(mvc,owner,company,"Outcome of board meeting: quarterly financial results","RESULTS");
        hint(mvc,owner,company,"Share buyback by tender offer","BUYBACK");
        hint(mvc,owner,company,"Preferential issue for funding","CAPITAL_RAISE");
        hint(mvc,owner,company,"Resignation of statutory auditor","AUDITOR");
        hint(mvc,owner,company,"Unclear statement","OTHER");
        String first=ok(submit(mvc,docs,owner,source(company,"Fictional update","https://reports.example.com/one",null))).get("documentId").asText();
        String second=ok(submit(mvc,docs,owner,source(company,"Fictional update","https://reports.example.com/two",null))).get("documentId").asText();
        String input=event(first,null,null,"Fictional update","OTHER","UNKNOWN","UNKNOWN");
        var event=ok(submit(mvc,events,owner,input));
        assertThat(ok(submit(mvc,events,owner,input))).isEqualTo(event);
        var grouped=ok(submit(mvc,events,owner,event(second,null,null,"Fictional update","OTHER","UNKNOWN","FOLLOW_UP")));
        assertThat(grouped.get("eventId")).isEqualTo(event.get("eventId"));
        assertThat(grouped.get("revision").asInt()).isEqualTo(2);
        String id=event.get("eventId").asText();
        ok(submit(mvc,events,owner,event(first,id,2,"Fictional corrected update","OTHER","CANCELLED","CORRECTION")));
        read(mvc,events+"/"+id+"/versions",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(3))
                .andExpect(jsonPath("$.items[0].stage").value("CANCELLED")).andExpect(jsonPath("$.items[2].documentId").value(first));
        read(mvc,events+"/"+id+"/versions","fictional-event-other").andExpect(status().isNotFound());
    }

    private static void hint(MockMvc mvc,String owner,String company,String title,String subtype)throws Exception {
        String id=ok(submit(mvc,"/api/v1/research/sources",owner,source(company,title,null,"Fictional classification fixture"))).get("documentId").asText();
        read(mvc,"/api/v1/research/events/suggestion?documentId="+id+"&revision=1",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.subtype").value(subtype));
    }

    static String event(String document,String thread,Integer revision,String title,String subtype,String stage,String novelty) {
        return """
                {"documentId":"%s","documentRevision":1,"eventId":%s,"expectedRevision":%s,"title":"%s","groupingKey":null,
                 "subtype":"%s","stage":"%s","materiality":"UNKNOWN","novelty":"%s","reviewed":true}
                """.formatted(document,JSON.writeValueAsString(thread),revision,title,subtype,stage,novelty);
    }
}
