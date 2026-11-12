package dev.finn.market;

import dev.finn.imports.HoldingsImportController;
import dev.finn.imports.HoldingsImportWorker;
import dev.finn.imports.SyntheticWorkbook;
import dev.finn.monitoring.DeliveryWorker;
import dev.finn.research.ResearchExtractionWorker;
import java.nio.charset.StandardCharsets;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.*;
import static dev.finn.market.ThesisChecks.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ReleaseIsolationChecks {
    private ReleaseIsolationChecks() {}

    public static void isolatesTwoAuthenticatedWorkspaces(MockMvc mvc,HoldingsImportWorker imports,
            ResearchExtractionWorker extraction,DeliveryWorker delivery)throws Exception {
        String alice="release-fictional-alice",bob="release-fictional-bob";
        String portfolio=ok(submit(mvc,"/api/v1/portfolios",alice,"{\"name\":\"Fictional release portfolio\"}")).path("portfolioId").asText();
        String portfolioPath="/api/v1/portfolios/"+portfolio;
        String account=ok(submit(mvc,portfolioPath+"/accounts",alice,"{\"name\":\"Fictional Groww account\",\"currency\":\"INR\",\"source\":\"GROWW\"}"))
                .path("accountId").asText();
        String accountPath=portfolioPath+"/accounts/"+account;
        var workbook=mvc.perform(post(accountPath+"/imports").with(asUser(alice)).with(csrf()).contentType(HoldingsImportController.XLSX)
                .content(SyntheticWorkbook.holdings()));
        var ticket=ok(workbook);
        String importPath=accountPath+"/imports/"+ticket.path("importId").asText();
        String jobPath="/api/v1/jobs/"+ticket.path("jobId").asText();
        imports.runOne();
        read(mvc,importPath+"/original",alice).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("X-Content-Type-Options","nosniff"));
        read(mvc,jobPath,alice).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SUCCEEDED"));

        String company=company(mvc,alice),bobCompany=company(mvc,bob);
        String companyPath=ROOT+"/companies/"+company;
        String pdfPath=ROOT+"/pdf";
        byte[] pdf="%PDF-1.7\nfictional staging bytes".getBytes(StandardCharsets.US_ASCII);
        mvc.perform(post(pdfPath).with(asUser(alice)).contentType("application/pdf").content(pdf)).andExpect(status().isForbidden());
        var staged=ok(mvc.perform(post(pdfPath).with(asUser(alice)).with(csrf()).contentType("application/pdf").content(pdf)));
        var independent=ok(mvc.perform(post(pdfPath).with(asUser(bob)).with(csrf()).contentType("application/pdf").content(pdf)));
        String fileId=staged.path("fileId").asText(),bobFile=independent.path("fileId").asText();
        org.assertj.core.api.Assertions.assertThat(bobFile).isNotEqualTo(fileId);
        read(mvc,pdfPath+"/staged",bob).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].fileId").value(bobFile));
        submit(mvc,pdfPath+"/"+fileId+"/discard",bob,"{}").andExpect(status().isNotFound());
        mvc.perform(post(pdfPath+"/"+bobFile+"/discard").with(asUser(bob))).andExpect(status().isForbidden());
        submit(mvc,pdfPath+"/"+bobFile+"/discard",bob,"{}").andExpect(status().isOk()).andExpect(jsonPath("$.discarded").value(true));
        read(mvc,pdfPath+"/staged",bob).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        String attachment=ok(submit(mvc,ROOT+"/sources",alice,"""
                {"companyId":"%s","title":"Fictional PDF","sourceName":"Fictional issuer","pdfFileId":"%s","rightsConfirmed":true}
                """.formatted(company,fileId))).path("documentId").asText();
        submit(mvc,pdfPath+"/"+fileId+"/discard",alice,"{}").andExpect(status().isConflict());
        String pdfDownload=ROOT+"/sources/"+attachment+"/versions/1/pdf";
        read(mvc,pdfDownload,alice).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.containsString("attachment")));

        String original=ok(submit(mvc,ROOT+"/sources",alice,source(company,"Fictional release evidence",null,"releaseuniquefictional audited result")))
                .path("documentId").asText();
        String anchor=index(mvc,extraction,alice,ROOT+"/sources/"+original,1);
        var report=ok(submit(mvc,companyPath+"/reports",alice,"{\"question\":\"releaseuniquefictional\",\"rankLocally\":false}"));
        String reportPath=ROOT+"/reports/"+report.path("reportId").asText();
        read(mvc,reportPath,alice).andExpect(status().isOk()).andExpect(jsonPath("$.citations[0].anchorId").value(anchor));
        String search="/search?query=releaseuniquefictional";
        read(mvc,companyPath+search,alice).andExpect(status().isOk()).andExpect(jsonPath("$.passages[0].anchorId").value(anchor));
        read(mvc,ROOT+"/companies/"+bobCompany+search,bob).andExpect(status().isOk()).andExpect(jsonPath("$.passages.length()").value(0));

        String thesis=ok(submit(mvc,companyPath+"/theses",alice,THESIS)).path("thesisId").asText();
        String event=ok(submit(mvc,ROOT+"/events",alice,CompanyEventChecks.event(original,null,null,"Fictional release event","RESULTS","COMPLETED","NEW")))
                .path("versionId").asText();
        var task=ok(submit(mvc,ROOT+"/theses/"+thesis+"/reviews",alice,"""
                {"expectedRevision":1,"eventVersionId":"%s","relation":"SUPPORTS","anchorId":"%s"}
                """.formatted(event,anchor)));
        for(int i=0;i<80&&delivery.processNext();i++) { /* Drain the integration queue. */ }
        String inbox="/api/v1/monitoring/notifications";
        String notice=ok(read(mvc,inbox,alice)).path("items").get(0).path("activityId").asText();
        read(mvc,inbox,bob).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
        for(String path:new String[]{portfolioPath,accountPath+"/ledger",importPath+"/original",importPath+"/preview",jobPath,pdfDownload,
                ROOT+"/evidence/"+anchor,companyPath+search,reportPath,inbox+"/"+notice,ROOT+"/thesis-reviews/"+task.path("reviewId").asText()}){
            read(mvc,path,bob).andExpect(status().isNotFound()).andExpect(header().string("Cache-Control","no-store"))
                    .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("releaseuniquefictional"))));
        }
    }

    private static RequestPostProcessor asUser(String user){
        return oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(user));
    }
}
