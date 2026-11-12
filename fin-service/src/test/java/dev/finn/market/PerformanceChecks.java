package dev.finn.market;

import java.time.LocalDate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class PerformanceChecks {
    private PerformanceChecks() {}

    public static void computesOnlyFromCompleteValuationsAndRecordedFlows(MockMvc mvc)throws Exception{
        var equity=catalogue(mvc,"fictional-performance-owner");
        var account=account(mvc,equity.owner());
        LocalDate start=LocalDate.of(2025,4,1),deposit=start.plusDays(91),end=start.plusDays(182);
        event(mvc,account,start,"OPENING_POSITION",equity.security(),"10",null,"1000",null);
        event(mvc,account,start,"OPENING_CASH",null,null,null,"0",null);
        event(mvc,account,deposit,"DEPOSIT",null,null,null,"1000",null);
        event(mvc,account,end,"WITHDRAWAL",null,null,null,"100",null);
        ok(submit(mvc,account.base()+"/corporate-actions",equity.owner(),"""
                {"expectedLedgerRevision":4,"reviewed":true,"action":{"type":"DIVIDEND","securityId":"%s",
                 "effectiveDate":"%s","sourceReference":"FICTIONAL-RETURN-DIVIDEND","netCash":"50"}}
                """.formatted(equity.security(),end)));
        choose(mvc,account,equity,false);
        close(mvc,equity,start,"100");
        close(mvc,equity,deposit,"110");
        close(mvc,equity,end,"126");
        String route=account.portfolio()+"/performance";
        String window="{\"start\":\""+start+"\",\"end\":\""+end+"\",\"reviewed\":true}";
        submit(mvc,route,"fictional-performance-other",window).andExpect(status().isNotFound());
        submit(mvc,route,equity.owner(),window.replace("true","false")).andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage").value("HISTORY_UNREVIEWED"));
        submit(mvc,route,equity.owner(),window).andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage").value("ENDPOINT_VALUATIONS_MISSING"));
        snapshot(mvc,account,start,start.plusDays(1));
        snapshot(mvc,account,end,end.plusDays(1));
        submit(mvc,route,equity.owner(),window).andExpect(status().isOk())
                .andExpect(jsonPath("$.xirr.state").value("AVAILABLE"))
                .andExpect(jsonPath("$.timeWeighted.reason").value("FLOW_DAY_VALUATION_MISSING"));
        snapshot(mvc,account,deposit,deposit.plusDays(1));
        submit(mvc,route,equity.owner(),window).andExpect(status().isOk())
                .andExpect(jsonPath("$.opening.closingValue").value("1000"))
                .andExpect(jsonPath("$.closing.closingValue").value("2210"))
                .andExpect(jsonPath("$.investmentResult").value("310"))
                .andExpect(jsonPath("$.recordedDividends").value("50"))
                .andExpect(jsonPath("$.externalFlows.length()").value(2))
                .andExpect(jsonPath("$.externalFlows[1].net").value("-100"))
                .andExpect(jsonPath("$.timeWeighted.percent").value("21"))
                .andExpect(jsonPath("$.benchmark").value("NO_COMPATIBLE_BENCHMARK"));
        event(mvc,account,end,"FEE",null,null,null,"1",null);
        submit(mvc,route,equity.owner(),window).andExpect(status().isOk())
                .andExpect(jsonPath("$.coverage").value("ENDPOINT_VALUATIONS_MISSING"));
    }

    static void snapshot(MockMvc mvc,Account account,LocalDate start,LocalDate endExclusive)throws Exception{
        ok(submit(mvc,account.base()+"/valuation/snapshots",account.owner(),
                "{\"start\":\""+start+"\",\"endExclusive\":\""+endExclusive+"\"}"));
    }
}
