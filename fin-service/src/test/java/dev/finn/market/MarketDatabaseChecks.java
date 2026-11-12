
package dev.finn.market;

import dev.finn.jobs.JobQueue;
import java.io.IOException;
import java.time.LocalDate;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class MarketDatabaseChecks {
    static final JsonMapper JSON=JsonMapper.builder().build();
    record Security(String owner,String security,String listing){
        String market(){return "/api/v1/market/listings/"+listing;}
    }
    private static final LocalDate TODAY=MarketPrices.today();
    private MarketDatabaseChecks(){}

    static Security catalogue(MockMvc mvc,String owner)throws Exception {
        String company=ok(submit(mvc,"/api/v1/catalog/companies",owner,"{\"name\":\"Fictional price issuer\"}")).get("companyId").asText();
        String security=ok(submit(mvc,"/api/v1/catalog/securities",owner,
                """
                {"companyId":"%s","name":"Fictional price equity","isin":null,"confirmed":true}
                """.formatted(company))).get("securityId").asText();
        String listing=ok(submit(mvc,"/api/v1/catalog/securities/"+security+"/listings",owner,
                """
                {"exchange":"NSE","series":"EQ","symbol":"FINNTEST","providerSymbol":"FINNTEST.NS","validFrom":"2020-01-01","confirmed":true}
                """)).get("listingId").asText();
        return new Security(owner,security,listing);
    }
    static ResultActions submit(MockMvc mvc,String path,String subject,String body)throws Exception{
        return mvc.perform(post(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject)))
                .with(csrf()).contentType("application/json").content(body));
    }
    static ResultActions read(MockMvc mvc,String path,String subject)throws Exception{
        return mvc.perform(get(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject))));
    }
    static JsonNode ok(ResultActions result)throws Exception{
        return JSON.readTree(result.andDo(response->{if(response.getResponse().getStatus()>=500)throw new AssertionError("Synthetic market request failed",response.getResolvedException());})
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    static JsonNode close(MockMvc mvc,Security equity,LocalDate date,String price)throws Exception{
        return ok(submit(mvc,equity.market()+"/reviewed-close",equity.owner(),
                """
                {"sessionDate":"%s","close":"%s","sourceReference":"Synthetic reviewed close","reviewed":true}
                """.formatted(date,price)));
    }
    private static String window(){return """
            {"start":"%s","endExclusive":"%s"}
            """.formatted(TODAY.minusDays(8),TODAY);}
    static String row(LocalDate date,String close){return """
            {"sessionDate":"%s","sourceIndex":"%sT00:00:00+05:30","observedAt":null,"interval":"1d",
             "open":"90","high":"110","low":"85","close":"%s","adjustedClose":null,
             "unavailableFields":["adjustedClose"],"volume":"100","priceBasis":"PROVIDER_DEFINED"}
            """.formatted(date,date,close);}
    static JsonNode candidate(Security equity,String rows){
        return JSON.readTree("""
                {"adapterContractVersion":"0.1.0","provider":"YAHOO_YFINANCE","startedAt":"2020-01-01T00:00:00Z","completedAt":"2020-01-01T00:00:01Z",
                 "rights":{"mode":"RESTRICTED_UNVERIFIED","publicDisplayAllowed":false,"externalAiAllowed":false},
                 "items":[{"listingId":"%s","exchange":"NSE","providerSymbol":"FINNTEST.NS","currency":"INR","currencyBasis":"MAPPED_LISTING",
                 "availability":"AVAILABLE","knownDelaySeconds":null,"candles":[%s]}]}
                """.formatted(equity.listing(),rows));
    }

    public static void observationsAreScopedAndDurable(MockMvc mvc,JdbcTemplate jdbc,JobQueue queue,
                                                       MarketPrices prices,YahooProcess yahoo)throws Exception {
        var equity=catalogue(mvc,"fictional-market-reader");
        String other="fictional-market-foreign";
        read(mvc,equity.market(),other).andExpect(status().isNotFound());
        submit(mvc,equity.market()+"/refresh",equity.owner(),window()).andExpect(status().isConflict());
        var first=close(mvc,equity,TODAY.minusDays(7),"100");
        assertThat(close(mvc,equity,TODAY.minusDays(7),"100.00").get("observationId")).isEqualTo(first.get("observationId"));
        close(mvc,equity,TODAY.minusDays(7),"99.50");
        read(mvc,equity.market(),equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.latest.close").value("99.5")).andExpect(jsonPath("$.latest.freshness").value("STALE"));
        doReturn("PRIVATE_DAILY").when(yahoo).capability();
        var worker=new MarketWorker(prices,queue,yahoo);
        var payload=candidate(equity,row(TODAY.minusDays(1),"103.125")+","+row(TODAY.minusDays(3),"101"));
        doReturn(payload).when(yahoo).fetch(any());
        String job=JSON.readTree(submit(mvc,equity.market()+"/refresh",equity.owner(),window())
                .andExpect(status().isAccepted()).andReturn().getResponse().getContentAsString()).get("jobId").asText();
        submit(mvc,equity.market()+"/refresh",equity.owner(),window())
                .andExpect(status().isAccepted()).andExpect(jsonPath("$.jobId").value(job));
        read(mvc,"/api/v1/jobs/"+job,other).andExpect(status().isNotFound());
        worker.tick();
        read(mvc,equity.market(),equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.latest.close").value("103.125")).andExpect(jsonPath("$.latest.priceBasis").value("PROVIDER_DEFINED"))
                .andExpect(jsonPath("$.acceptedRows").value(2));
        String history=equity.market()+"/history?start="+TODAY.minusDays(8)+"&endExclusive="+TODAY;
        read(mvc,history,equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.observations.length()").value(3));
        submit(mvc,equity.market()+"/refresh",equity.owner(),window()).andExpect(status().isAccepted());
        worker.tick();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM finn.market_observation WHERE listing_id=?",Integer.class,UUID.fromString(equity.listing()))).isEqualTo(4);
        doReturn(candidate(equity,row(TODAY.minusDays(2),"150"))).when(yahoo).fetch(any());
        submit(mvc,equity.market()+"/refresh",equity.owner(),window()).andExpect(status().isAccepted());
        worker.tick();
        read(mvc,equity.market(),equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.failureCode").value("SOURCE_VALIDATION_FAILED")).andExpect(jsonPath("$.latest.close").value("103.125"));
        doThrow(new IOException("synthetic private provider fault")).when(yahoo).fetch(any());
        submit(mvc,equity.market()+"/refresh",equity.owner(),window()).andExpect(status().isAccepted());
        for(int attempt=0;attempt<3;attempt++){
            jdbc.update("UPDATE finn.app_job SET available_at=clock_timestamp() WHERE state='QUEUED' AND resource_id=?",UUID.fromString(equity.listing()));
            worker.tick();
        }
        read(mvc,equity.market(),equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.failureCode").value("PROVIDER_REQUEST_FAILED"))
                .andExpect(jsonPath("$.lastSuccessAt").isString()).andExpect(jsonPath("$.latest.close").value("103.125"));
        read(mvc,history,other).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/market/status")).andExpect(status().isUnauthorized());
        read(mvc,"/api/v1/market/status",equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.sourceValidationFailuresLastDay").value(1))
                .andExpect(jsonPath("$.failedRunsLastDay").value(2))
                .andExpect(jsonPath("$.quota.remaining").value(4))
                .andExpect(jsonPath("$.recentRuns[0].failureCode").value("PROVIDER_REQUEST_FAILED"))
                .andExpect(jsonPath("$.lastSuccessfulAcquisition").isString())
                .andExpect(jsonPath("$.providerDelay").value("UNKNOWN"));
        read(mvc,"/api/v1/market/status",other).andExpect(status().isOk()).andExpect(jsonPath("$.recentRuns").isEmpty())
                .andExpect(jsonPath("$.quota.remaining").value(8)).andExpect(jsonPath("$.lastSuccessfulAcquisition").isEmpty());
        var account=ValuationDatabaseChecks.account(mvc,equity.owner());
        ValuationDatabaseChecks.event(mvc,account,TODAY.minusDays(2),"BUY",equity.security(),"1","100",null,"0");
        read(mvc,account.base()+"/ledger",equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.positions[0].quantity").value("1"));
        prices.expireYahoo();
    }
}
