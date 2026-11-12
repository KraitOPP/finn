package dev.finn.market;

import dev.finn.jobs.JobQueue;
import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ReleaseRecoveryChecks {
    private ReleaseRecoveryChecks() {}

    public static void recoversAnInterruptedMarketJobAndEnforcesQuota(MockMvc mvc,JdbcTemplate jdbc,JobQueue queue,
                                                                     MarketPrices prices,YahooProcess provider)throws Exception {
        var equity=catalogue(mvc,"release-fictional-recovery");
        var today=MarketPrices.today();
        String route=equity.market()+"/refresh",owner=equity.owner();
        String request="{\"start\":\""+today.minusDays(4)+"\",\"endExclusive\":\""+today+"\"}";
        doReturn("PRIVATE_DAILY").when(provider).capability();
        var job=JSON.readTree(submit(mvc,route,owner,request).andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString()).path("jobId").asText();
        var abandoned=queue.claim(JobQueue.Kind.YAHOO_DAILY_HISTORY);
        assertThat(abandoned.jobId()).isEqualTo(UUID.fromString(job));
        jdbc.update("UPDATE finn.app_job SET lease_until=clock_timestamp()-interval '1 second' WHERE job_id=?",abandoned.jobId());
        doThrow(new IOException("Simulated timeout.")).when(provider).fetch(any());
        new MarketWorker(prices,queue,provider).tick();
        read(mvc,"/api/v1/jobs/"+job,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("QUEUED"));
        assertThat(queue.succeed(abandoned)).isFalse();
        jdbc.update("UPDATE finn.app_job SET available_at=clock_timestamp()-interval '1 second' WHERE job_id=?",abandoned.jobId());
        doReturn(candidate(equity,row(today.minusDays(1),"104"))).when(provider).fetch(any());
        var restored=new MarketWorker(prices,queue,provider);
        restored.tick();
        read(mvc,"/api/v1/jobs/"+job,owner).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SUCCEEDED"));
        for(int i=0;i<7;i++){
            submit(mvc,route,owner,request).andExpect(status().isAccepted());
            restored.tick();
        }
        submit(mvc,route,owner,request).andExpect(status().isTooManyRequests());
        read(mvc,equity.market(),owner).andExpect(status().isOk()).andExpect(jsonPath("$.latest.close").value("104"))
                .andExpect(jsonPath("$.latest.freshness").value("DELAY_UNKNOWN"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.market_observation WHERE listing_id=?",Integer.class,
                UUID.fromString(equity.listing()))).isEqualTo(1);
        var account=ValuationDatabaseChecks.account(mvc,owner);
        ValuationDatabaseChecks.event(mvc,account,LocalDate.now().minusDays(1),"BUY",equity.security(),"1","100",null,"0");
        read(mvc,account.base()+"/ledger",owner).andExpect(status().isOk()).andExpect(jsonPath("$.positions[0].quantity").value("1"));
    }
}
