package dev.finn;

import java.util.UUID;
import dev.finn.imports.*;
import dev.finn.jobs.JobQueue;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
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
                .andExpect(jsonPath("$.requiresInrConfirmation").value(true)).andExpect(jsonPath("$.commitAvailable").value(false)).andExpect(jsonPath("$.nextOffset").value(1))
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
}
