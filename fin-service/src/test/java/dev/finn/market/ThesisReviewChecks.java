package dev.finn.market;

import dev.finn.monitoring.DeliveryWorker;
import dev.finn.research.ResearchExtractionWorker;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.GuidanceChecks.*;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static dev.finn.market.ThesisChecks.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ThesisReviewChecks {
    private ThesisReviewChecks() {}

    public static void replaysOneReviewWithAnOriginalThesisAndDurableNotification(
            MockMvc mvc,ResearchExtractionWorker extraction,DeliveryWorker delivery)throws Exception {
        String owner="fictional-review-owner",other="fictional-review-other",company=company(mvc,owner);
        String base=ROOT+"/companies/"+company;
        String outlook=index(mvc,extraction,owner,document(mvc,owner,filing(company,"Fictional outlook","Revenue forecast 120 to 130 crore","2025-05-10T10:00:00Z")),1);
        String guidance=ok(submit(mvc,base+"/guidance",owner,numeric(outlook,"2025-05-10","CONFIRMED"))).path("guidanceId").asText();
        String thesis=ok(submit(mvc,base+"/theses",owner,THESIS)).path("thesisId").asText();
        String thesisPath=ROOT+"/theses/"+thesis;
        String condition="""
                {"expectedRevision":1,"label":"Review if revenue falls below 120 crore","dimensions":%s,
                 "comparator":"GTE","threshold":"120","scale":"CRORE"}
                """.formatted(QUARTER);
        ok(submit(mvc,thesisPath+"/conditions",owner,condition));
        read(mvc,ROOT+"/guidance/"+guidance+"/versions/1/delivery",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("INSUFFICIENT_EVIDENCE"));

        String actualDoc=document(mvc,owner,filing(company,"Fictional quarter results","Reported revenue 110 crore","2025-07-22T10:00:00Z"));
        String actual=index(mvc,extraction,owner,actualDoc,1);
        String fact=ok(submit(mvc,base+"/facts",owner,amount(QUARTER,actual,"110","CRORE"))).path("factId").asText();
        String check=ok(submit(mvc,thesisPath+"/conditions/check",owner,"{}")).path("items").get(0).path("lastCheck").path("checkId").asText();
        String event=ok(submit(mvc,ROOT+"/events",owner,CompanyEventChecks.event(actualDoc.substring(actualDoc.lastIndexOf('/')+1),
                null,null,"Fictional quarter results","RESULTS","COMPLETED","NEW"))).path("versionId").asText();
        String tasks=thesisPath+"/reviews";
        read(mvc,tasks+"?event="+event,owner).andExpect(status().isOk()).andExpect(jsonPath("$.suggestions[0].versionId").value(event))
                .andExpect(jsonPath("$.items.length()").value(0));
        read(mvc,tasks,other).andExpect(status().isNotFound());
        String input="""
                {"expectedRevision":1,"eventVersionId":"%s","relation":"CHALLENGES","anchorId":"%s",
                 "conditionCheckId":"%s","guidance":{"id":"%s","revision":1}}
                """.formatted(event,actual,check,guidance);
        submit(mvc,tasks,owner,input.replace("\""+actual+"\"","null")).andExpect(status().isUnprocessableContent());
        var review=ok(submit(mvc,tasks,owner,input).andExpect(status().isOk())
                .andExpect(jsonPath("$.guidance.outcome.state").value("MISSED"))
                .andExpect(jsonPath("$.condition.state").value("VIOLATED"))
                .andExpect(jsonPath("$.guidance.statement.anchorId").value(outlook))
                .andExpect(jsonPath("$.guidance.outcome.actual.anchorId").value(actual)));
        assertThat(ok(submit(mvc,tasks,owner,input))).isEqualTo(review);
        String reviewId=review.path("reviewId").asText();
        String reviewPath=ROOT+"/thesis-reviews/"+reviewId;
        read(mvc,reviewPath,other).andExpect(status().isNotFound());

        for(int i=0;i<80&&delivery.processNext();i++) { /* Drain the integration test queue. */ }
        String inbox="/api/v1/monitoring/notifications";
        var notification=ok(read(mvc,inbox,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].kind").value("THESIS_REVIEW"))).path("items").get(0).path("activityId").asText();
        read(mvc,inbox+"/"+notification,owner).andExpect(status().isOk()).andExpect(jsonPath("$.thesisReview.reviewId").value(reviewId));

        String decision="{\"action\":\"REVISE\",\"note\":\"Review demand assumptions\",\"anchorId\":\""+actual+"\"}";
        var saved=ok(submit(mvc,reviewPath+"/decision",owner,decision));
        assertThat(ok(submit(mvc,reviewPath+"/decision",owner,decision))).isEqualTo(saved);
        submit(mvc,reviewPath+"/decision",owner,decision.replace("REVISE","CLOSE")).andExpect(status().isConflict());
        ok(submit(mvc,thesisPath,owner,"{\"expectedRevision\":1,\"thesis\":"+THESIS.replace("Compare reviewed results with guidance","New rationale")+"}"));
        String revised=filing(company,"Fictional corrected results","Corrected revenue 125 crore","2025-07-25T10:00:00Z");
        ok(submit(mvc,actualDoc,owner,"{\"expectedRevision\":1,\"source\":"+revised+"}"));
        String later=index(mvc,extraction,owner,actualDoc,2);
        ok(submit(mvc,ROOT+"/facts/"+fact,owner,"{\"companyId\":\""+company+"\",\"expectedRevision\":1,\"fact\":"+amount(QUARTER,later,"125","CRORE")+"}"));
        read(mvc,ROOT+"/guidance/"+guidance+"/versions/1/delivery",owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("MET"));
        read(mvc,reviewPath,owner).andExpect(status().isOk()).andExpect(jsonPath("$.thesis.revision").value(1))
                .andExpect(jsonPath("$.thesis.rationale").value("Compare reviewed results with guidance"))
                .andExpect(jsonPath("$.guidance.outcome.state").value("MISSED"))
                .andExpect(jsonPath("$.guidance.outcome.actual.revision").value(1))
                .andExpect(jsonPath("$.decision.note").value("Review demand assumptions"));
    }
}
