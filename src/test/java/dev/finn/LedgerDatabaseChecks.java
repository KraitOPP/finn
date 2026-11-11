package dev.finn;

import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

final class LedgerDatabaseChecks {
    private static final JsonMapper JSON=JsonMapper.builder().build();
    private record Fixture(String accountPath,String portfolioPath,String security,String subject){}
    private static ResultActions submit(MockMvc mvc,String path,String subject,String body)throws Exception{
        return mvc.perform(post(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject)))
                .with(csrf()).contentType("application/json").content(body));
    }
    private static ResultActions read(MockMvc mvc,String path,String subject)throws Exception{
        return mvc.perform(get(path).with(oidcLogin().idToken(token->token.claim("iss","http://127.0.0.1:1/test-issuer").subject(subject))));
    }
    private static JsonNode ok(ResultActions result)throws Exception{
        return JSON.readTree(result.andDo(response->{if(response.getResponse().getStatus()>=500)throw new AssertionError("Synthetic ledger request failed",response.getResolvedException());}).andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
    }
    private static Fixture create(MockMvc mvc,String subject)throws Exception{
        var portfolio=ok(submit(mvc,"/api/v1/portfolios",subject,"{\"name\":\"Fictional ledger portfolio\"}"));
        String parent="/api/v1/portfolios/"+portfolio.get("portfolioId").asText();
        var account=ok(submit(mvc,parent+"/accounts",subject,"{\"name\":\"Fictional source\",\"source\":\"MANUAL\",\"currency\":\"INR\"}"));
        var company=ok(submit(mvc,"/api/v1/catalog/companies",subject,"{\"name\":\"Fictional ledger issuer\"}"));
        var security=ok(submit(mvc,"/api/v1/catalog/securities",subject,"{\"companyId\":\""+company.get("companyId").asText()+"\",\"name\":\"Fictional ledger equity\",\"isin\":null,\"confirmed\":true}"));
        return new Fixture(parent+"/accounts/"+account.get("accountId").asText(),parent,security.get("securityId").asText(),subject);
    }
    private static String event(String kind,int day,String security,String quantity,String price,String amount,String fees){
        return """
                {"kind":"%s","effectiveDate":"2020-01-%02d","securityId":%s,"listingId":null,"quantity":%s,"price":%s,"amount":%s,"fees":%s,"reference":null}
                """.formatted(kind,day,JSON.writeValueAsString(security),JSON.writeValueAsString(quantity),JSON.writeValueAsString(price),JSON.writeValueAsString(amount),JSON.writeValueAsString(fees));
    }
    private static String record(UUID key,String event){return "{\"idempotencyKey\":\""+key+"\",\"event\":"+event+"}";}
    private static String reverse(UUID key){return "{\"idempotencyKey\":\""+key+"\",\"reference\":\"Reviewed correction\"}";}
    private static String correct(UUID key,String event){return "{\"idempotencyKey\":\""+key+"\",\"reference\":\"Reviewed correction\",\"replacement\":"+event+"}";}

    static void recordCorrectAndReplay(MockMvc mvc,JdbcTemplate jdbc)throws Exception{
        var fixture=create(mvc,"fictional-ledger-corrections");
        String path=fixture.accountPath()+"/transactions",owner=fixture.subject(),ledger=fixture.accountPath()+"/ledger",security=fixture.security();
        ok(submit(mvc,path,owner,record(UUID.randomUUID(),event("OPENING_CASH",1,null,null,null,"1000",null))));
        UUID key=UUID.randomUUID();String original=record(key,event("BUY",2,security,"10","100",null,"10"));
        var buy=ok(submit(mvc,path,owner,original));String buyId=buy.get("eventIds").get(0).asText();
        var replay=ok(submit(mvc,path,owner,record(key,event("BUY",2,security,"10.00","100.00",null,"10.0"))));
        assertThat(replay.get("replayed").asBoolean()).isTrue();assertThat(replay.get("eventIds")).isEqualTo(buy.get("eventIds"));
        submit(mvc,path,owner,record(key,event("BUY",2,security,"11","100",null,"10"))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("IDEMPOTENCY_CONFLICT"));
        submit(mvc,path,owner,record(UUID.randomUUID(),event("BUY",2,security,"10","100",null,"10")).replace("\"price\":\"100\"","\"price\":100"))
                .andExpect(status().isUnprocessableContent()).andExpect(jsonPath("$.code").value("INVALID_EVENT"));
        ok(submit(mvc,path,owner,record(UUID.randomUUID(),event("SELL",3,security,"4","150",null,"6"))));
        read(mvc,ledger,owner).andExpect(status().isOk()).andExpect(jsonPath("$.cashBalance").value("584")).andExpect(jsonPath("$.realisedPnl").value("190")).andExpect(jsonPath("$.revision").value(3));
        read(mvc,path,"fictional-ledger-outsider").andExpect(status().isNotFound());
        read(mvc,ledger,"fictional-ledger-outsider").andExpect(status().isNotFound());
        submit(mvc,path+"/"+buyId+"/reverse","fictional-ledger-outsider",reverse(UUID.randomUUID())).andExpect(status().isNotFound());
        submit(mvc,path+"/"+buyId+"/reverse",owner,reverse(UUID.randomUUID())).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("UNSUPPORTED_SHORT_POSITION"));
        UUID correction=UUID.randomUUID();
        submit(mvc,path+"/"+buyId+"/correct",owner,correct(correction,event("BUY",2,security,"3","110",null,"10"))).andExpect(status().isConflict());
        read(mvc,ledger,owner).andExpect(jsonPath("$.revision").value(3));
        var corrected=ok(submit(mvc,path+"/"+buyId+"/correct",owner,correct(correction,event("BUY",2,security,"10","110",null,"10"))));
        assertThat(corrected.get("eventIds").size()).isEqualTo(2);
        read(mvc,ledger,owner).andExpect(jsonPath("$.positions[0].quantity").value("6")).andExpect(jsonPath("$.positions[0].recordedCost").value("666"))
                .andExpect(jsonPath("$.realisedPnl").value("150")).andExpect(jsonPath("$.cashBalance").value("484")).andExpect(jsonPath("$.revision").value(5));
        read(mvc,path+"?limit=2",owner).andExpect(jsonPath("$.items[0].replacesEventId").value(buyId))
                .andExpect(jsonPath("$.items[1].reversalOf").value(buyId)).andExpect(jsonPath("$.nextBefore").value(4));
        read(mvc,path+"?before=4",owner).andExpect(jsonPath("$.items[1].price").value("100"))
                .andExpect(jsonPath("$.items[1].reversedBy").value(corrected.get("eventIds").get(0).asText()));
        assertThatThrownBy(()->jdbc.update("UPDATE finn.ledger_event SET price=1 WHERE event_id=?",UUID.fromString(buyId))).rootCause().hasMessageContaining("permission denied");
        ok(submit(mvc,fixture.portfolioPath()+"/archive",owner,"{\"archived\":true,\"revision\":0}"));
        assertThat(ok(submit(mvc,path,owner,original)).get("replayed").asBoolean()).isTrue();
        submit(mvc,path,owner,record(UUID.randomUUID(),event("DEPOSIT",4,null,null,null,"20",null))).andExpect(status().isConflict()).andExpect(jsonPath("$.code").value("PORTFOLIO_ARCHIVED"));
    }

    static void concurrentSales(MockMvc mvc)throws Exception{
        var fixture=create(mvc,"fictional-ledger-concurrency");String path=fixture.accountPath()+"/transactions";
        ok(submit(mvc,path,fixture.subject(),record(UUID.randomUUID(),event("BUY",1,fixture.security(),"3","10",null,"0"))));
        var ready=new CountDownLatch(2);var start=new CountDownLatch(1);
        try(var workers=Executors.newFixedThreadPool(2)){
            java.util.concurrent.Callable<Integer> sale=()->{ready.countDown();if(!start.await(5,TimeUnit.SECONDS))throw new AssertionError("Timed out starting concurrent sale");return submit(mvc,path,fixture.subject(),record(UUID.randomUUID(),event("SELL",2,fixture.security(),"2","12",null,"0"))).andReturn().getResponse().getStatus();};
            var first=workers.submit(sale);var second=workers.submit(sale);
            try{assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue();}finally{start.countDown();}
            assertThat(java.util.List.of(first.get(15,TimeUnit.SECONDS),second.get(15,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        read(mvc,fixture.accountPath()+"/ledger",fixture.subject()).andExpect(status().isOk()).andExpect(jsonPath("$.positions[0].quantity").value("1")).andExpect(jsonPath("$.revision").value(2));
    }
    static void reviewedCorporateActions(MockMvc mvc)throws Exception{
        var fixture=create(mvc,"fictional-corporate-actions");String owner=fixture.subject(),path=fixture.accountPath(),actions=path+"/corporate-actions",security=fixture.security();
        ok(submit(mvc,path+"/transactions",owner,record(UUID.randomUUID(),event("OPENING_CASH",1,null,null,null,"1000",null))));
        ok(submit(mvc,path+"/transactions",owner,record(UUID.randomUUID(),event("BUY",2,security,"10","10",null,"0"))));
        String split=action("SPLIT",security,3,"FICT-SPLIT","\"ratioNumerator\":2,\"ratioDenominator\":1");
        submit(mvc,actions+"/preview",owner,split).andExpect(status().isOk()).andExpect(jsonPath("$.unitsBefore").value("10")).andExpect(jsonPath("$.unitsAfter").value("20")).andExpect(jsonPath("$.recordedCostAfter").value("100"));
        submit(mvc,actions+"/preview",owner,split.replace("\"ratioNumerator\":2","\"ratioNumerator\":2.5")).andExpect(status().isUnprocessableContent());
        var first=ok(submit(mvc,actions,owner,approve(split,2)));
        assertThat(ok(submit(mvc,actions,owner,approve(split,2))).get("replayed").asBoolean()).isTrue();
        submit(mvc,actions,owner,approve(split.replace("\"ratioNumerator\":2","\"ratioNumerator\":3"),3)).andExpect(status().isConflict());
        submit(mvc,actions,owner,approve(split.replace("FICT-SPLIT","OTHER-REFERENCE"),3)).andExpect(status().isConflict());
        read(mvc,path+"/ledger",owner).andExpect(jsonPath("$.positions[0].quantity").value("20")).andExpect(jsonPath("$.positions[0].averageCost").value("5")).andExpect(jsonPath("$.cashBalance").value("900"));
        assertThat(first.get("ledgerRevision").asInt()).isEqualTo(3);
        ok(submit(mvc,actions,owner,approve(action("BONUS",security,4,"FICT-BONUS","\"ratioNumerator\":1,\"ratioDenominator\":2"),3)));
        String dividend=action("DIVIDEND",security,5,"FICT-CREDIT","\"netCash\":\"12.25\"");
        var paid=ok(submit(mvc,actions,owner,approve(dividend,4)));
        assertThat(ok(submit(mvc,actions,owner,approve(dividend,4))).get("replayed").asBoolean()).isTrue();
        read(mvc,path+"/ledger",owner).andExpect(jsonPath("$.positions[0].quantity").value("30")).andExpect(jsonPath("$.positions[0].recordedCost").value("100"))
                .andExpect(jsonPath("$.recordedDividends").value("12.25")).andExpect(jsonPath("$.cashBalance").value("912.25")).andExpect(jsonPath("$.netContributions").value("0"));
        submit(mvc,actions,owner,approve(action("SPLIT",security,6,"FICT-FRACTION","\"ratioNumerator\":1,\"ratioDenominator\":4"),5))
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("NEEDS_REVIEW")).andExpect(jsonPath("$.effect.reason").value("FRACTIONAL_ACTION_UNSUPPORTED"));
        submit(mvc,actions,owner,approve(action("MERGER",security,6,"FICT-MERGER","\"netCash\":null"),5)).andExpect(status().isOk()).andExpect(jsonPath("$.ledgerEventId").isEmpty());
        String paidId=paid.get("ledgerEventId").asText();
        ok(submit(mvc,path+"/transactions/"+paidId+"/reverse",owner,reverse(UUID.randomUUID())));
        var replacement=ok(submit(mvc,actions,owner,approve(action("DIVIDEND",security,5,"FICT-CREDIT-CORRECTED","\"netCash\":\"13.75\",\"correctsActionId\":\""+paid.get("actionId").asText()+"\""),6)));
        assertThat(replacement.get("ledgerRevision").asInt()).isEqualTo(7);
        read(mvc,path+"/transactions",owner).andExpect(jsonPath("$.items[0].replacesEventId").value(paidId));
        read(mvc,path+"/ledger",owner).andExpect(jsonPath("$.recordedDividends").value("13.75")).andExpect(jsonPath("$.cashBalance").value("913.75"));
        var listing=ok(submit(mvc,"/api/v1/catalog/securities/"+security+"/listings",owner,"""
                {"exchange":"NSE","series":"EQ","symbol":"DEMOOLD","providerSymbol":null,"validFrom":"2019-01-01","confirmed":true}
                """));
        String listingId=listing.get("listingId").asText();
        submit(mvc,actions,owner,approve(action("SYMBOL_CHANGE",security,7,"FICT-RENAME","\"listingId\":\""+listingId+"\",\"newSymbol\":\"DEMONEW\""),7))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ledgerRevision").value(7)).andExpect(jsonPath("$.effect.previousSymbol").value("DEMOOLD"));
        read(mvc,"/api/v1/catalog/securities/"+security,owner).andExpect(jsonPath("$.listings[0].listingId").value(listingId)).andExpect(jsonPath("$.listings[0].symbol").value("DEMONEW"));
        read(mvc,actions,"fictional-action-outsider").andExpect(status().isNotFound());
        submit(mvc,actions+"/preview","fictional-action-outsider",split).andExpect(status().isNotFound());
    }
    private static String action(String type,String security,int day,String reference,String details){return """
            {"type":"%s","securityId":"%s","effectiveDate":"2020-01-%02d","sourceReference":"%s","sourceUrl":"https://example.invalid/fictional-event",%s}
            """.formatted(type,security,day,reference,details);}
    private static String approve(String action,long revision){return "{\"action\":"+action+",\"reviewed\":true,\"expectedLedgerRevision\":"+revision+"}";}
}
