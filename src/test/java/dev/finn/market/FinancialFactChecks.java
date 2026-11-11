
package dev.finn.market;

import dev.finn.research.ResearchExtractionWorker;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class FinancialFactChecks {
    private FinancialFactChecks(){}

    public static void comparisonsPreserveUnitsRevisionsAndSign(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-fact-owner",other="fictional-fact-other";
        String company=company(mvc,owner),root="/api/v1/research",facts=root+"/companies/"+company+"/facts";
        var anchors=anchors(mvc,worker,owner,company);
        String research=root+"/companies/"+company;
        read(mvc,research+"/overview",owner).andExpect(status().isOk()).andExpect(jsonPath("$.indexedSources").value(1));
        read(mvc,research+"/overview",other).andExpect(status().isNotFound());
        submit(mvc,research+"/notes",owner,"{\"kind\":\"GOVERNANCE\",\"title\":\"Needs evidence\"}")
                .andExpect(status().isUnprocessableContent());
        String question=ok(submit(mvc,research+"/notes",owner,"{\"kind\":\"QUESTION\",\"title\":\"What changed?\"}"))
                .get("noteId").asText();
        submit(mvc,research+"/notes/"+question,owner,"{\"resolved\":true}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.resolved").value(true));
        String current=body("REVENUE","CONSOLIDATED","2025-04-01","2025-06-30",anchors.get(1).get("anchorId").asText(),"125","LAKH");
        String earlier=body("REVENUE","CONSOLIDATED","2025-01-01","2025-03-31",anchors.get(2).get("anchorId").asText(),"-50","LAKH");
        submit(mvc,facts,owner,current.replace("\"125\"","\"126\"")).andExpect(status().isUnprocessableContent());
        String id=ok(submit(mvc,facts,owner,current)).get("factId").asText();
        String prior=ok(submit(mvc,facts,owner,earlier)).get("factId").asText();
        String standalone=ok(submit(mvc,facts,owner,earlier.replace("CONSOLIDATED","STANDALONE"))).get("factId").asText();
        String comparison=root+"/facts/"+id+"/comparison?previous=";
        read(mvc,comparison+prior,owner).andExpect(status().isOk()).andExpect(jsonPath("$.change").value("17500000"))
                .andExpect(jsonPath("$.percentChange").isEmpty()).andExpect(jsonPath("$.reason").value("NON_POSITIVE_BASE"));
        read(mvc,comparison+standalone,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("INCOMPARABLE"));
        read(mvc,root+"/facts/"+id+"/comparables",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1));
        String revised=current.replace(anchors.get(1).get("anchorId").asText(),anchors.get(5).get("anchorId").asText()).replace("\"125\"","\"150\"");
        submit(mvc,facts,owner,revised).andExpect(status().isConflict());
        ok(submit(mvc,root+"/facts/"+id,owner,"{\"companyId\":\""+company+"\",\"expectedRevision\":1,\"fact\":"+revised+"}"));
        read(mvc,root+"/facts/"+id+"/versions",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[1].amount").value("125"));
        read(mvc,root+"/facts/"+id+"/versions",other).andExpect(status().isNotFound());
        String cash=ok(submit(mvc,facts,owner,body("CASH_FROM_OPERATIONS","CONSOLIDATED","2025-04-01","2025-06-30",
                anchors.get(3).get("anchorId").asText(),"200","CRORE"))).get("factId").asText();
        String capex=ok(submit(mvc,facts,owner,body("CAPITAL_EXPENDITURE","CONSOLIDATED","2025-04-01","2025-06-30",
                anchors.get(4).get("anchorId").asText(),"30","MILLION"))).get("factId").asText();
        submit(mvc,facts+"/derive",owner,"""
                {"existingFactId":null,"expectedRevision":null,"operatingCash":{"factId":"%s","revision":1},
                 "capitalExpenditure":{"factId":"%s","revision":1},"reviewed":true}
                """.formatted(cash,capex)).andExpect(status().isOk()).andExpect(jsonPath("$.normalizedAmount").value("1970000000"))
                .andExpect(jsonPath("$.origin").value("DERIVED")).andExpect(jsonPath("$.operands.length()").value(2));
    }

    static tools.jackson.databind.JsonNode anchors(MockMvc mvc,ResearchExtractionWorker worker,String owner,String company)throws Exception{
        String root="/api/v1/research/sources";
        String text="Metric\tValue\nRevenue\t125\nPrevious\t(50)\nOperating cash\t200\nCapex\t30\nRestated revenue\t150";
        var doc=ok(submit(mvc,root,owner,source(company,"Fictional facts",null,text))).get("documentId").asText();
        String version=root+"/"+doc+"/versions/1";
        ok(submit(mvc,version+"/extraction",owner,"{}"));
        worker.processNext();
        return ok(read(mvc,version+"/anchors",owner)).get("items");
    }

    private static String body(String metric,String basis,String start,String end,String anchor,String amount,String scale){
        return """
                {"dimensions":{"metric":"%s","basis":"%s","periodKind":"QUARTER","periodStart":"%s","periodEnd":"%s","unit":"MONEY","currency":"INR"},
                 "anchorId":"%s","amount":"%s","scale":"%s","reviewed":true}
                """.formatted(metric,basis,start,end,anchor,amount,scale);
    }
}
