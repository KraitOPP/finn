
package dev.finn.market;

import java.time.LocalDate;
import java.util.UUID;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class ValuationDatabaseChecks {
    record Account(String portfolio,String base,String owner){}
    private ValuationDatabaseChecks(){}

    static Account account(MockMvc mvc,String owner)throws Exception {
        String id=ok(submit(mvc,"/api/v1/portfolios",owner,"{\"name\":\"Fictional valuation portfolio\"}")).get("portfolioId").asText();
        var portfolio="/api/v1/portfolios/"+id;
        var account=ok(submit(mvc,portfolio+"/accounts",owner,"{\"name\":\"Fictional account\",\"currency\":\"INR\",\"source\":\"MANUAL\"}")).get("accountId").asText();
        return new Account(portfolio,portfolio+"/accounts/"+account,owner);
    }
    static void event(MockMvc mvc,Account account,LocalDate date,String kind,String security,String units,String price,String amount,String fees)throws Exception {
        ok(submit(mvc,account.base()+"/transactions",account.owner(),"""
                {"idempotencyKey":"%s","event":{"kind":"%s","effectiveDate":"%s","securityId":%s,"listingId":null,
                "quantity":%s,"price":%s,"amount":%s,"fees":%s,"reference":null}}
                """.formatted(UUID.randomUUID(),kind,date,JSON.writeValueAsString(security),JSON.writeValueAsString(units),JSON.writeValueAsString(price),
                 JSON.writeValueAsString(amount),JSON.writeValueAsString(fees))));
    }
    static void choose(MockMvc mvc,Account account,Security equity,boolean estimate)throws Exception {
        ok(submit(mvc,account.base()+"/valuation/listing",account.owner(),"""
                {"securityId":"%s","listingId":"%s","allowProviderEstimate":%s}
                """.formatted(equity.security(),equity.listing(),estimate)));
    }

    public static void valuesAreScopedAndKeepFlowsSeparate(MockMvc mvc)throws Exception {
        var equity=catalogue(mvc,"fictional-account-valuation");
        var account=account(mvc,equity.owner());
        var day=MarketPrices.today().minusDays(12);
        event(mvc,account,day,"OPENING_CASH",null,null,null,"1000",null);
        event(mvc,account,day.plusDays(1),"BUY",equity.security(),"10","10",null,"1");
        event(mvc,account,day.plusDays(2),"DEPOSIT",null,null,null,"50",null);
        event(mvc,account,day.plusDays(3),"SELL",equity.security(),"2","15",null,"1");
        close(mvc,equity,day.plusDays(4),"20");
        var path=account.base()+"/valuation";
        read(mvc,path,equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.holdings[0].priceStatus").value("LISTING_REQUIRED"))
                .andExpect(jsonPath("$.totals.holdingsValue").isEmpty()).andExpect(jsonPath("$.totals.portfolioValue").isEmpty());
        choose(mvc,account,equity,false);
        read(mvc,path,equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.holdings[0].value").value("160")).andExpect(jsonPath("$.holdings[0].recordedCost").value("80.8"))
                .andExpect(jsonPath("$.holdings[0].priceStatus").value("STALE"))
                .andExpect(jsonPath("$.totals.portfolioValue").value("1138")).andExpect(jsonPath("$.totals.realisedPnl").value("8.8"))
                .andExpect(jsonPath("$.totals.netContributions").value("50")).andExpect(jsonPath("$.totals.unrealisedPnl").value("79.2"))
                .andExpect(jsonPath("$.totals.recordedFees").value("2"));
        read(mvc,account.portfolio()+"/valuation",equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.portfolioValue").value("1138"));
        ok(submit(mvc,account.portfolio()+"/accounts",equity.owner(),"{\"name\":\"Unknown cash\",\"source\":\"MANUAL\",\"currency\":\"INR\"}"));
        read(mvc,account.portfolio()+"/valuation",equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.totals.portfolioValue").isEmpty()).andExpect(jsonPath("$.totals.knownHoldingsValue").value("160"));
        ok(submit(mvc,account.base()+"/corporate-actions",equity.owner(),"""
                {"expectedLedgerRevision":4,"reviewed":true,"action":{"type":"SPLIT","securityId":"%s","effectiveDate":"%s",
                "sourceReference":"SYNTHETIC-PRICE-SPLIT","ratioNumerator":2,"ratioDenominator":1}}
                """.formatted(equity.security(),day.plusDays(5))));
        read(mvc,path,equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.holdings[0].quantity").value("16")).andExpect(jsonPath("$.holdings[0].value").isEmpty());
        close(mvc,equity,day.plusDays(5),"10");
        read(mvc,path,equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.holdings[0].value").value("160"));
        read(mvc,path,"fictional-other-investor").andExpect(status().isNotFound());
        submit(mvc,path+"/listing","fictional-other-investor","""
                {"securityId":"%s","listingId":"%s","allowProviderEstimate":false}
                """.formatted(equity.security(),equity.listing())).andExpect(status().isNotFound());
    }
}
