package dev.finn;

import java.util.UUID;
import dev.finn.imports.*;
import dev.finn.jobs.JobQueue;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

final class ImportDatabaseChecks {
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private record Fixture(String path,String subject){}
    private static ResultActions submit(MockMvc mvc,String path,String subject,String body)throws Exception{
        return mvc.perform(post(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject))).with(csrf()).contentType("application/json").content(body));
    }
    private static ResultActions read(MockMvc mvc,String path,String subject)throws Exception{
        return mvc.perform(get(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject))));
    }
    private static ResultActions upload(MockMvc mvc,Fixture fixture,byte[] bytes)throws Exception{
        return mvc.perform(post(fixture.path()+"/imports").with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(fixture.subject()))).with(csrf()).contentType(HoldingsImportController.XLSX).content(bytes));
    }
    private static JsonNode ok(ResultActions result)throws Exception{
        return JSON.readTree(result.andDo(response->{if(response.getResponse().getStatus()>=500)throw new AssertionError("Synthetic import request failed",response.getResolvedException());}).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private static Fixture fixture(MockMvc mvc,String subject)throws Exception{
        var p=ok(submit(mvc,"/api/v1/portfolios",subject,"{\"name\":\"Fictional import portfolio\"}"));
        String portfolio="/api/v1/portfolios/"+p.get("portfolioId").asText();
        var account=ok(submit(mvc,portfolio+"/accounts",subject,"{\"name\":\"Fictional import account\",\"source\":\"GROWW\",\"currency\":\"INR\"}"));
        return new Fixture(portfolio+"/accounts/"+account.get("accountId").asText(),subject);
    }
    private static void expire(JdbcTemplate jdbc,UUID job){assertThat(jdbc.update("UPDATE finn.app_job SET lease_until=clock_timestamp()-interval '1 second' WHERE job_id=?",job)).isEqualTo(1);}

    static void previewOwnershipAndRecovery(MockMvc mvc,JdbcTemplate jdbc,JobQueue queue,HoldingsImports imports,HoldingsImportWorker worker)throws Exception{
        var fixture=fixture(mvc,"fictional-import-preview-owner");String owner=fixture.subject(),outsider="fictional-import-outsider";
        byte[] bytes=SyntheticWorkbook.holdings();var ticket=ok(upload(mvc,fixture,bytes));String importId=ticket.get("importId").asText(),jobId=ticket.get("jobId").asText();
        String path=fixture.path()+"/imports/"+importId,jobPath="/api/v1/jobs/"+jobId;
        var duplicate=ok(upload(mvc,fixture,bytes));
        assertThat(duplicate.get("duplicate").asBoolean()).isTrue();assertThat(duplicate.get("importId").asText()).isEqualTo(importId);
        read(mvc,jobPath,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("QUEUED")).andExpect(jsonPath("$.revision").value(1));
        read(mvc,jobPath,outsider).andExpect(status().isNotFound());
        read(mvc,path+"/original",outsider).andExpect(status().isNotFound());
        read(mvc,path+"/preview",outsider).andExpect(status().isNotFound());
        read(mvc,path+"/preview",owner).andExpect(status().isConflict());
        read(mvc,path+"/original",owner).andExpect(status().isConflict());
        var first=queue.claim(JobQueue.Kind.GROWW_HOLDINGS_PREVIEW);
        assertThat(first.jobId()).isEqualTo(UUID.fromString(jobId));expire(jdbc,first.jobId());
        var recovered=queue.claim(JobQueue.Kind.GROWW_HOLDINGS_PREVIEW);
        assertThat(recovered.jobId()).isEqualTo(first.jobId());assertThat(recovered.leaseToken()).isNotEqualTo(first.leaseToken());assertThat(recovered.attempts()).isEqualTo(2);
        assertThat(imports.stage(first,GrowwHoldingsReader.read(bytes))).isFalse();
        read(mvc,path+"/preview",owner).andExpect(status().isConflict());
        worker.process(recovered);
        read(mvc,jobPath,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SUCCEEDED")).andExpect(jsonPath("$.revision").value(4));
        read(mvc,path+"/preview?limit=1",owner).andExpect(status().isOk()).andExpect(jsonPath("$.ledgerRevisionAtPreview").value(0))
                .andExpect(jsonPath("$.metadata.reportedSummary.buyValue").value("50.00")).andExpect(jsonPath("$.metadata.detailTotals.buyValue").value("48.75"))
                .andExpect(jsonPath("$.rows[0].source.rowNumber").value(12)).andExpect(jsonPath("$.rows[0].mappingStatus").value("UNRESOLVED_SECURITY"))
                .andExpect(jsonPath("$.requiresInrConfirmation").value(true)).andExpect(jsonPath("$.commitAvailable").value(true)).andExpect(jsonPath("$.nextOffset").value(1))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("FICTIONAL_METADATA_MUST_NOT_LEAK"))));
        read(mvc,path+"/preview?offset=1",owner).andExpect(jsonPath("$.rows[0].source.rowNumber").value(14)).andExpect(jsonPath("$.nextOffset").isEmpty());
        read(mvc,path+"/original",owner).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"))
                .andExpect(header().string("Content-Disposition",org.hamcrest.Matchers.containsString("attachment"))).andExpect(content().bytes(bytes));
        read(mvc,path+"/original",outsider).andExpect(status().isNotFound());
        var wrong=fixture(mvc,owner);
        read(mvc,wrong.path()+"/imports/"+importId+"/original",owner).andExpect(status().isNotFound());
        read(mvc,fixture.path()+"/ledger",owner).andExpect(jsonPath("$.revision").value(0)).andExpect(jsonPath("$.positions.length()").value(0));
    }
    static void rejectsUnsafeUploads(MockMvc mvc,HoldingsImportWorker worker)throws Exception{
        var fixture=fixture(mvc,"fictional-import-blocked-owner");
        upload(mvc,fixture,new byte[GrowwHoldingsReader.MAX_BYTES+1]).andExpect(status().isPayloadTooLarge());
        upload(mvc,fixture,new byte[128]).andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("INVALID_XLSX"));
        var parts=SyntheticWorkbook.parts();parts.put("xl/vbaProject.bin","Fictional active content");
        var bad=ok(upload(mvc,fixture,SyntheticWorkbook.zip(parts)));worker.runOne();
        String path=fixture.path()+"/imports/"+bad.get("importId").asText();
        read(mvc,"/api/v1/jobs/"+bad.get("jobId").asText(),fixture.subject()).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("FAILED"))
                .andExpect(jsonPath("$.failureCode").value("UNSUPPORTED_PACKAGE_CONTENT"));
        read(mvc,path+"/original",fixture.subject()).andExpect(status().isConflict());
        submit(mvc,path+"/retry",fixture.subject(),"{}").andExpect(status().isConflict());
        read(mvc,fixture.path()+"/ledger",fixture.subject()).andExpect(jsonPath("$.revision").value(0));
    }
    static void exhaustedLeaseCanBeRetriedAsANewJob(MockMvc mvc,JdbcTemplate jdbc,JobQueue queue,HoldingsImportWorker worker)throws Exception{
        var fixture=fixture(mvc,"fictional-import-retry-owner");var ticket=ok(upload(mvc,fixture,SyntheticWorkbook.holdings()));
        UUID old=UUID.fromString(ticket.get("jobId").asText());
        for(int attempt=1;attempt<=3;attempt++){
            var claim=queue.claim(JobQueue.Kind.GROWW_HOLDINGS_PREVIEW);assertThat(claim.jobId()).isEqualTo(old);assertThat(claim.attempts()).isEqualTo(attempt);expire(jdbc,old);
        }
        assertThat(queue.claim(JobQueue.Kind.GROWW_HOLDINGS_PREVIEW)).isNull();
        read(mvc,"/api/v1/jobs/"+old,fixture.subject()).andExpect(jsonPath("$.failureCode").value("LEASE_EXPIRED"));
        String path=fixture.path()+"/imports/"+ticket.get("importId").asText();
        var retry=ok(submit(mvc,path+"/retry",fixture.subject(),"{}"));
        assertThat(retry.get("jobId").asText()).isNotEqualTo(old.toString());
        worker.runOne();
        read(mvc,path+"/preview",fixture.subject()).andExpect(status().isOk()).andExpect(jsonPath("$.jobId").value(retry.get("jobId").asText()));
        read(mvc,"/api/v1/jobs/"+old,fixture.subject()).andExpect(jsonPath("$.state").value("FAILED"));
    }
    private static String stage(MockMvc mvc,Fixture fixture,HoldingsImportWorker worker,byte[] bytes)throws Exception{
        var ticket=ok(upload(mvc,fixture,bytes));worker.runOne();return fixture.path()+"/imports/"+ticket.get("importId").asText();
    }
    private static String approve(String mode,boolean acknowledge,long revision){return """
            {"confirmInr":true,"retainUnresolvedListings":true,"acknowledgeDifferences":%s,"costMode":"%s","expectedLedgerRevision":%d}
            """.formatted(acknowledge,mode,revision);}
    static void atomicReviewedOpening(MockMvc mvc,HoldingsImportWorker worker,PlatformTransactionManager transactions)throws Exception{
        var fixture=fixture(mvc,"fictional-reviewed-opening-owner");String owner=fixture.subject(),ledger=fixture.path()+"/ledger";
        String path=stage(mvc,fixture,worker,SyntheticWorkbook.holdings());
        read(mvc,path+"/preview",owner).andExpect(jsonPath("$.review.state").value("READY")).andExpect(jsonPath("$.review.eligibleRows").value(2));
        submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",false,0)).andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("IMPORT_DIFFERENCES_REQUIRE_REVIEW"));
        submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",true,0).replace("\"confirmInr\":true","\"confirmInr\":false")).andExpect(status().isUnprocessableContent());
        submit(mvc,path+"/accept","fictional-import-other-user",approve("UNITS_ONLY",true,0)).andExpect(status().isNotFound());
        ok(submit(mvc,fixture.path()+"/transactions",owner,"""
                {"idempotencyKey":"%s","event":{"kind":"OPENING_CASH","effectiveDate":"2020-11-08","amount":"500"}}
                """.formatted(UUID.randomUUID())));
        submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",true,0)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IMPORT_LEDGER_CHANGED"));
        read(mvc,path+"/preview",owner).andExpect(jsonPath("$.ledgerRevisionAtPreview").value(0)).andExpect(jsonPath("$.review.currentLedgerRevision").value(1));
        var tx=new TransactionTemplate(transactions);
        tx.executeWithoutResult(status->{
            try{ok(submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",true,1)));}
            catch(Exception error){throw new AssertionError("Synthetic acceptance could not be staged",error);}
            status.setRollbackOnly();
        });
        read(mvc,ledger,owner).andExpect(jsonPath("$.revision").value(1)).andExpect(jsonPath("$.positions.length()").value(0));
        read(mvc,"/api/v1/catalog/securities",owner).andExpect(jsonPath("$.items.length()").value(0));
        var receipt=ok(submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",true,1)));
        assertThat(receipt.get("acceptedRows").asInt()).isEqualTo(2);assertThat(receipt.get("ledgerRevision").asInt()).isEqualTo(3);
        read(mvc,ledger,owner).andExpect(jsonPath("$.positions.length()").value(2)).andExpect(jsonPath("$.positions[0].recordedCost").isEmpty())
                .andExpect(jsonPath("$.positions[1].recordedCost").isEmpty()).andExpect(jsonPath("$.historyStatus").value("HOLDINGS_ONLY"))
                .andExpect(jsonPath("$.coverageStart").value("2020-11-09")).andExpect(jsonPath("$.cashBalance").value("500"));
        read(mvc,fixture.path()+"/transactions",owner).andExpect(jsonPath("$.items[0].kind").value("OPENING_POSITION"))
                .andExpect(jsonPath("$.items[0].source").value("GROWW_HOLDINGS")).andExpect(jsonPath("$.items[0].listingId").isEmpty());
        assertThat(ok(submit(mvc,path+"/accept",owner,approve("UNITS_ONLY",true,1))).get("replayed").asBoolean()).isTrue();
        submit(mvc,path+"/accept",owner,approve("REPORTED_ROW_COST",true,3)).andExpect(status().isConflict());
        read(mvc,path+"/preview",owner).andExpect(jsonPath("$.review.state").value("ALREADY_ACCEPTED"));
    }
    static void overlappingReportsNeverPostAgain(MockMvc mvc,HoldingsImportWorker worker)throws Exception{
        var fixture=fixture(mvc,"fictional-opening-overlap-owner");String owner=fixture.subject(),ledger=fixture.path()+"/ledger";
        String opening=stage(mvc,fixture,worker,SyntheticWorkbook.holdings());
        ok(submit(mvc,opening+"/accept",owner,approve("REPORTED_ROW_COST",true,0)));
        var recorded=ok(read(mvc,ledger,owner));
        assertThat(java.util.List.of(recorded.get("positions").get(0).get("recordedCost").asText(),recorded.get("positions").get(1).get("recordedCost").asText())).containsExactlyInAnyOrder("30.75","18");
        var equivalent=SyntheticWorkbook.parts();equivalent.compute(SyntheticWorkbook.WORKSHEET,(key,sheet)->sheet.replace("30.75","30.7500").replaceAll("<row r=\"14\">.*?</row>",""));
        String duplicate=stage(mvc,fixture,worker,SyntheticWorkbook.zip(equivalent));
        read(mvc,duplicate+"/preview",owner).andExpect(jsonPath("$.review.state").value("DUPLICATE")).andExpect(jsonPath("$.review.duplicateRows").value(1));
        submit(mvc,duplicate+"/accept",owner,approve("REPORTED_ROW_COST",true,2)).andExpect(status().isOk()).andExpect(jsonPath("$.outcome").value("DUPLICATE")).andExpect(jsonPath("$.acceptedRows").value(0));
        var changed=SyntheticWorkbook.parts();changed.compute(SyntheticWorkbook.WORKSHEET,(key,sheet)->sheet.replace("30.75","31.00"));
        String conflict=stage(mvc,fixture,worker,SyntheticWorkbook.zip(changed));
        read(mvc,conflict+"/preview",owner).andExpect(jsonPath("$.review.state").value("SOURCE_CONFLICT")).andExpect(jsonPath("$.review.conflictRows").value(1));
        submit(mvc,conflict+"/accept",owner,approve("REPORTED_ROW_COST",true,2)).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IMPORT_SOURCE_CONFLICT"));
        var later=SyntheticWorkbook.parts();later.compute(SyntheticWorkbook.WORKSHEET,(key,sheet)->sheet.replace("09-11-2020","10-11-2020"));
        String reconciliation=stage(mvc,fixture,worker,SyntheticWorkbook.zip(later));
        read(mvc,reconciliation+"/preview",owner).andExpect(jsonPath("$.review.state").value("RECONCILIATION_ONLY")).andExpect(jsonPath("$.commitAvailable").value(false));
        submit(mvc,reconciliation+"/accept",owner,approve("UNITS_ONLY",true,2)).andExpect(status().isConflict());
        read(mvc,ledger,owner).andExpect(jsonPath("$.revision").value(2)).andExpect(jsonPath("$.positions.length()").value(2));
    }
    static void reconcileByReportDateWithoutRewritingTheLedger(MockMvc mvc,HoldingsImportWorker worker)throws Exception{
        var fixture=fixture(mvc,"fictional-reconciliation-owner");String owner=fixture.subject();
        String opening=stage(mvc,fixture,worker,SyntheticWorkbook.holdings());
        ok(submit(mvc,opening+"/accept",owner,approve("REPORTED_ROW_COST",true,0)));
        String security=ok(read(mvc,opening+"/preview",owner)).get("rows").get(0).get("matchedSecurityId").asText();
        ok(submit(mvc,fixture.path()+"/transactions",owner,"""
                {"idempotencyKey":"%s","event":{"kind":"SELL","effectiveDate":"2020-11-11","securityId":"%s","quantity":"1","price":"11","fees":"0"}}
                """.formatted(UUID.randomUUID(),security)));
        String beforeSale=reportDate(mvc,fixture,worker,"10-11-2020")+"/reconciliation";
        read(mvc,beforeSale,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("COMPARABLE"))
                .andExpect(jsonPath("$.rows[0].recordedUnits").value("3")).andExpect(jsonPath("$.issueCount").value(0));
        String afterSale=reportDate(mvc,fixture,worker,"12-11-2020")+"/reconciliation";
        read(mvc,afterSale,owner).andExpect(jsonPath("$.rows[0].reportedUnits").value("3")).andExpect(jsonPath("$.rows[0].recordedUnits").value("2"))
                .andExpect(jsonPath("$.rows[0].unitDifference").value("1")).andExpect(jsonPath("$.rows[0].costDifference").value("10.25"));
        String acknowledge="{\"reviewed\":true,\"expectedLedgerRevision\":3}";
        read(mvc,afterSale,"fictional-reconciliation-outsider").andExpect(status().isNotFound());
        submit(mvc,afterSale,"fictional-reconciliation-outsider",acknowledge).andExpect(status().isNotFound());
        submit(mvc,afterSale,owner,acknowledge).andExpect(status().isOk()).andExpect(jsonPath("$.ledgerRevision").value(3));
        read(mvc,afterSale,owner).andExpect(jsonPath("$.reviewedAt").isNotEmpty()).andExpect(jsonPath("$.issueCount").value(1));
        read(mvc,fixture.path()+"/ledger",owner).andExpect(jsonPath("$.revision").value(3));
        ok(submit(mvc,fixture.path()+"/transactions",owner,"""
                {"idempotencyKey":"%s","event":{"kind":"FEE","effectiveDate":"2020-11-13","amount":"1"}}
                """.formatted(UUID.randomUUID())));
        read(mvc,afterSale,owner).andExpect(jsonPath("$.ledgerRevision").value(4)).andExpect(jsonPath("$.reviewedAt").isEmpty());
        submit(mvc,afterSale,owner,acknowledge).andExpect(status().isConflict());
        String beforeCoverage=reportDate(mvc,fixture,worker,"08-11-2020")+"/reconciliation";
        read(mvc,beforeCoverage,owner).andExpect(jsonPath("$.state").value("HISTORY_UNAVAILABLE")).andExpect(jsonPath("$.rows.length()").value(0));
        submit(mvc,beforeCoverage,owner,acknowledge.replace("3","4")).andExpect(status().isUnprocessableContent());
    }
    private static String reportDate(MockMvc mvc,Fixture fixture,HoldingsImportWorker worker,String date)throws Exception{
        var later=SyntheticWorkbook.parts();later.compute(SyntheticWorkbook.WORKSHEET,(key,sheet)->sheet.replace("09-11-2020",date));
        return stage(mvc,fixture,worker,SyntheticWorkbook.zip(later));
    }
}
