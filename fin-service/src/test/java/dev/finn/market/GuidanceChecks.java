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
        read(mvc,update+"/versions/1/delivery?asOf=2025-06-13",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("WITHDRAWN")).andExpect(jsonPath("$.successor.revision").value(2));
    }

    public static void comparesOnlyEvidenceAvailableByTheCutoff(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-delivery-owner",other="fictional-delivery-other",company=company(mvc,owner);
        String base=ROOT+"/companies/"+company;
        String outlook=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional target","Revenue forecast 120 to 130 crore","2025-05-10T10:00:00Z")),1);
        String numeric=numeric(outlook,"2025-05-10","CONFIRMED");
        String id=ok(submit(mvc,base+"/guidance",owner,numeric)).path("guidanceId").asText();
        String delivery=ROOT+"/guidance/"+id+"/versions/1/delivery?asOf=";
        read(mvc,delivery+"2025-05-09",owner).andExpect(status().isOk()).andExpect(jsonPath("$.reason").value("GUIDANCE_NOT_PUBLISHED"));
        read(mvc,delivery+"2025-06-11",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("NOT_DUE"));
        String actualDocument=document(mvc,owner,filing(company,"Fictional outcome","Reported revenue 1250 million","2025-07-21T10:00:00Z"));
        String actual=index(mvc,worker,owner,actualDocument,1);
        ok(submit(mvc,base+"/facts",owner,amount(QUARTER.replace("CONSOLIDATED","STANDALONE"),actual,"1250","MILLION")));
        read(mvc,delivery+"2025-07-23",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("INSUFFICIENT_EVIDENCE")).andExpect(jsonPath("$.reason").value("DIMENSIONS_MISMATCH"));
        String fact=ok(submit(mvc,base+"/facts",owner,amount(QUARTER,actual,"1250","MILLION"))).path("factId").asText();
        read(mvc,delivery+"2025-07-20",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").value("PUBLISHED_AFTER_CUTOFF")).andExpect(jsonPath("$.actual").isEmpty());
        read(mvc,delivery+"2025-07-22",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("MET"))
                .andExpect(jsonPath("$.actual.anchorId").value(actual));
        String revised=filing(company,"Fictional outcome revision","Corrected revenue 1150 million","2025-07-25T10:00:00Z");
        ok(submit(mvc,actualDocument,owner,"{\"expectedRevision\":1,\"source\":"+revised+"}"));
        String revisedAnchor=index(mvc,worker,owner,actualDocument,2);
        ok(submit(mvc,ROOT+"/facts/"+fact,owner,"{\"companyId\":\""+company+"\",\"expectedRevision\":1,\"fact\":"
                +amount(QUARTER,revisedAnchor,"1150","MILLION")+"}"));
        read(mvc,delivery+"2025-07-22",owner).andExpect(status().isOk()).andExpect(jsonPath("$.actual.revision").value(1));
        read(mvc,delivery+"2025-07-26",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("MISSED"))
                .andExpect(jsonPath("$.actual.revision").value(2));
        read(mvc,delivery+"2025-07-26",other).andExpect(status().isNotFound());

        String fullYear=numeric.replace("QUARTER","FULL_YEAR").replace("2025-06-30","2026-03-31");
        String annual=ok(submit(mvc,base+"/guidance",owner,fullYear)).path("guidanceId").asText();
        ok(submit(mvc,base+"/facts",owner,amount(QUARTER.replace("QUARTER","YTD"),revisedAnchor,"1150","MILLION")));
        read(mvc,ROOT+"/guidance/"+annual+"/versions/1/delivery?asOf=2025-07-26",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("PARTIAL")).andExpect(jsonPath("$.actual.dimensions.periodKind").value("YTD"));
        String newGuidance=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional revised target","Updated forecast 110 to 120 crore","2025-06-20T10:00:00Z")),1);
        String revision=numeric(newGuidance,"2025-06-20","CONFIRMED").replace("\"120\"","\"110\"").replace("\"130\"","\"120\"");
        ok(submit(mvc,ROOT+"/guidance/"+id,owner,"{\"expectedRevision\":1,\"guidance\":"+revision+"}"));
        read(mvc,delivery+"2025-06-19",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("NOT_DUE"));
        read(mvc,delivery+"2025-06-21",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("REVISED"));
    }

    public static void showsOriginalMilestoneUpdatedTimelineAndActualCompletion(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-milestone-owner",other="fictional-milestone-other",company=company(mvc,owner);
        String path=ROOT+"/companies/"+company+"/guidance";
        String initial=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional capex announcement",
                "The new facility is expected to start production by 30 June 2025.","2025-04-15T10:00:00Z")),1);
        String confirmed=milestone(initial,"2025-04-15","2025-06-30");
        String id=ok(submit(mvc,path,owner,confirmed)).path("guidanceId").asText();
        String base=ROOT+"/guidance/"+id;
        read(mvc,base+"/versions/1/delivery?asOf=2025-05-20",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("NOT_DUE"));
        String revision=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional capex update",
                "The new commissioning deadline is 30 September 2025.","2025-06-12T10:00:00Z")),1);
        ok(submit(mvc,base,owner,"{\"expectedRevision\":1,\"guidance\":"+milestone(revision,"2025-06-12","2025-09-30")+"}"));
        read(mvc,base+"/versions/1/delivery?asOf=2025-07-01",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("REVISED")).andExpect(jsonPath("$.successor.targetDate").value("2025-09-30"));
        String completion=index(mvc,worker,owner,document(mvc,owner,filing(company,"Fictional commissioning confirmation",
                "The facility started commercial production on 8 October 2025.","2025-10-09T10:00:00Z")),1);
        String actual=base+"/versions/2/delivery";
        String input="{\"actualDate\":\"2025-10-08\",\"anchorId\":\""+completion+"\",\"reviewed\":true}";
        submit(mvc,actual,owner,input.replace("2025-10-08","2025-10-10")).andExpect(status().isUnprocessableContent());
        submit(mvc,actual,other,input).andExpect(status().isNotFound());
        String delivery=ok(submit(mvc,actual,owner,input)).path("deliveryId").asText();
        submit(mvc,actual,owner,input).andExpect(status().isOk()).andExpect(jsonPath("$.deliveryId").value(delivery));
        read(mvc,actual+"?asOf=2025-10-08",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.reason").value("MILESTONE_UNVERIFIED"));
        read(mvc,actual+"?asOf=2025-10-10",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("MISSED")).andExpect(jsonPath("$.reason").value("MILESTONE_LATE"))
                .andExpect(jsonPath("$.milestone.anchorId").value(completion));
    }

    private static String milestone(String anchor,String statement,String target){
        return """
                {"title":"Fictional plant commissioning","kind":"QUALITATIVE","stage":"CONFIRMED","statementDate":"%s",
                 "targetDate":"%s","dimensions":null,"lower":null,"upper":null,"scale":"ONES","caveats":"","anchorId":"%s"}
                """.formatted(statement,target,anchor);
    }
}
