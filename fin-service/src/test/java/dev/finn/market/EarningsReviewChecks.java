package dev.finn.market;

import static dev.finn.market.GuidanceChecks.document;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static dev.finn.market.ThesisChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import dev.finn.research.ResearchExtractionWorker;
import org.springframework.test.web.servlet.MockMvc;

public final class EarningsReviewChecks {
    private EarningsReviewChecks(){}

    public static void comparesReviewedPeriodsAndOnlyPreResultEstimates(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-earnings-owner",other="fictional-earnings-other",company=company(mvc,owner);
        String path=ROOT+"/companies/"+company;
        String current=index(mvc,worker,owner,document(mvc,owner,
                filing(company,"Fictional latest results","Revenue 150; services revenue 80","2025-07-24T12:00:00Z")),1);
        String annual=index(mvc,worker,owner,document(mvc,owner,
                filing(company,"Fictional annual report","Annual revenue 500","2025-05-20T12:00:00Z")),1);
        String lastYear=index(mvc,worker,owner,document(mvc,owner,
                filing(company,"Fictional prior results","Revenue 120; services revenue 60","2024-07-24T12:00:00Z")),1);
        String previous=index(mvc,worker,owner,document(mvc,owner,
                filing(company,"Fictional sequential results","Revenue 125","2025-05-20T12:00:00Z")),1);
        var initial=ok(submit(mvc,path+"/facts",owner,amount(QUARTER,current,"150","CRORE")));
        ok(submit(mvc,path+"/facts",owner,amount(QUARTER.replace("2025","2024"),lastYear,"120","CRORE")));
        ok(submit(mvc,path+"/facts",owner,amount(QUARTER.replace("2025-04-01","2025-01-01").replace("2025-06-30","2025-03-31"),
                previous,"125","CRORE")));
        ok(submit(mvc,path+"/facts",owner,amount(QUARTER.replace("CONSOLIDATED","STANDALONE"),current,"80","CRORE")));
        var revenue=ok(submit(mvc,path+"/facts",owner,amount(QUARTER.replace("QUARTER","FULL_YEAR").replace("2025-04-01","2024-04-01")
                .replace("2025-06-30","2025-03-31"),annual,"500","CRORE")));
        String earnings=path+"/earnings";
        ok(submit(mvc,earnings+"/inputs",owner,segment(current,"2025","80")));
        ok(submit(mvc,earnings+"/inputs",owner,segment(lastYear,"2024","60")));
        ok(submit(mvc,earnings+"/inputs",owner,consensus("2025-07-23T12:00:00Z","140")));
        ok(submit(mvc,earnings+"/inputs",owner,consensus("2025-07-25T12:00:00Z","160")));
        read(mvc,earnings,owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics[0].yearOverYear.percent").value("25"))
                .andExpect(jsonPath("$.metrics[0].quarterOverQuarter.percent").value("20"))
                .andExpect(jsonPath("$.segments[0].difference").value("200000000"))
                .andExpect(jsonPath("$.expectations[0].estimate.amount").value("140"))
                .andExpect(jsonPath("$.expectations[0].result").value("ABOVE"));
        read(mvc,earnings+"?basis=STANDALONE",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.metrics[0].actual.amount").value("80"))
                .andExpect(jsonPath("$.metrics[0].yearOverYear").isEmpty())
                .andExpect(jsonPath("$.expectations.length()").value(0));
        read(mvc,earnings,other).andExpect(status().isNotFound());
        String restated=index(mvc,worker,owner,document(mvc,owner,
                filing(company,"Fictional restatement","Restated revenue 145","2025-07-28T12:00:00Z")),1);
        ok(submit(mvc,ROOT+"/facts/"+initial.path("factId").asText(),owner,
                "{\"companyId\":\""+company+"\",\"expectedRevision\":1,\"fact\":"+amount(QUARTER,restated,"145","CRORE")+"}"));
        read(mvc,earnings,owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.expectations[0].actual.amount").value("145"))
                .andExpect(jsonPath("$.expectations[0].estimate.amount").value("140"));

        String orderDoc=document(mvc,owner,filing(company,"Fictional order award","New contract INR 50 crore to execute over 18 months","2025-08-04T08:00:00Z"));
        String orderId=MarketRadarChecks.event(mvc,owner,orderDoc.substring(orderDoc.lastIndexOf('/')+1),"Fictional order");
        String eventPath=ROOT+"/events/"+orderId;
        String version=ok(read(mvc,eventPath+"/versions",owner)).path("items").get(0).path("versionId").asText();
        String order=index(mvc,worker,owner,orderDoc,1);
        String input="""
                {"versionId":"%s","anchorId":"%s","revenueFactId":"%s","revenueRevision":1,"amount":"50",
                 "scale":"CRORE","execution":"18 months","reviewed":true}
                """.formatted(version,order,revenue.path("factId").asText());
        submit(mvc,eventPath+"/order",owner,input).andExpect(status().isOk())
                .andExpect(jsonPath("$.order.percent").value("10")).andExpect(jsonPath("$.order.execution").value("18 months"));
        read(mvc,eventPath+"/order",other).andExpect(status().isNotFound());
    }

    private static String segment(String anchor,String year,String amount){
        return """
                {"basis":"CONSOLIDATED","periodKind":"QUARTER","periodStart":"%s-04-01","periodEnd":"%s-06-30","kind":"SEGMENT",
                 "label":"Services","metric":"REVENUE","currency":"INR","amount":"%s","scale":"CRORE","anchorId":"%s","reviewed":true}
                """.formatted(year,year,amount,anchor);
    }
    private static String consensus(String published,String amount){
        return """
                {"basis":"CONSOLIDATED","periodKind":"QUARTER","periodStart":"2025-04-01","periodEnd":"2025-06-30","kind":"CONSENSUS",
                 "label":"Fictional consensus","metric":"REVENUE","currency":"INR","amount":"%s","scale":"CRORE","sourceUrl":"https://consensus.example.com/report",
                 "publishedAt":"%s","reviewed":true}
                """.formatted(amount,published);
    }
}
