package dev.finn.market;

import java.time.LocalDate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static dev.finn.market.PerformanceChecks.snapshot;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class PortfolioHealthChecks {
    private PortfolioHealthChecks() {}

    public static void keepsScenarioSeparateFromLedgerAndChecksValuationCoverage(MockMvc mvc)throws Exception{
        var equity=catalogue(mvc,"fictional-health-owner");
        var account=account(mvc,equity.owner());
        LocalDate asOf=MarketPrices.today().minusDays(1);
        event(mvc,account,asOf.minusDays(1),"OPENING_POSITION",equity.security(),"10",null,"900",null);
        event(mvc,account,asOf.minusDays(1),"OPENING_CASH",null,null,null,"500",null);
        var path=account.portfolio()+"/health";
        read(mvc,path,"fictional-health-other").andExpect(status().isNotFound());
        read(mvc,path,equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("PRICES_MISSING"))
                .andExpect(jsonPath("$.largestWeight").isEmpty());
        choose(mvc,account,equity,false);
        close(mvc,equity,asOf,"100");
        ok(submit(mvc,DiscoveryChecks.UNIVERSE,equity.owner(),DiscoveryChecks.member(equity.listing(),"MANUFACTURING",true,null)));
        read(mvc,path,equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.state").value("READY"))
                .andExpect(jsonPath("$.largestWeight").value("100"))
                .andExpect(jsonPath("$.holdings[0].unrealisedContribution").value("100"))
                .andExpect(jsonPath("$.sectors[0].sector").value("MANUFACTURING"));
        String other=SourceDocumentChecks.company(mvc,equity.owner());
        String candidate=DiscoveryChecks.listing(mvc,equity.owner(),other,"FICTIONALHEALTH");
        String scenario="""
                {"listingId":"%s","cashAllocation":"100","shockPercent":"-10"}
                """.formatted(candidate);
        submit(mvc,path+"/scenario",equity.owner(),scenario).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("SIMULATED"))
                .andExpect(jsonPath("$.beforeTotal").value("1500"))
                .andExpect(jsonPath("$.afterTotal").value("1490"))
                .andExpect(jsonPath("$.afterCash").value("400"))
                .andExpect(jsonPath("$.afterTargetWeight").value("8.256881"))
                .andExpect(jsonPath("$.valueChange").value("-10"));
        submit(mvc,path+"/scenario",equity.owner(),scenario.replace("\"100\"","\"501\"")).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("INSUFFICIENT_CASH")).andExpect(jsonPath("$.afterTotal").isEmpty());
        submit(mvc,path+"/scenario",equity.owner(),scenario.replace("\"-10\"","\"-101\"")).andExpect(status().isUnprocessableContent());
        read(mvc,account.base()+"/ledger",equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2))
                .andExpect(jsonPath("$.cashBalance").value("500")).andExpect(jsonPath("$.positions.length()").value(1));
    }

    public static void weeklyRiskNeedsEveryObservationAndUsesFlowAdjustedIndex(MockMvc mvc)throws Exception{
        var equity=catalogue(mvc,"fictional-risk-owner");
        var account=account(mvc,equity.owner());
        var start=LocalDate.of(2025,1,6);
        var end=start.plusWeeks(8);
        event(mvc,account,start,"OPENING_POSITION",equity.security(),"10",null,"1000",null);
        event(mvc,account,start,"OPENING_CASH",null,null,null,"0",null);
        choose(mvc,account,equity,false);
        String risk=account.portfolio()+"/health/risk";
        String window="{\"start\":\""+start+"\",\"end\":\""+end+"\",\"reviewed\":true}";
        submit(mvc,risk,equity.owner(),window).andExpect(status().isOk()).andExpect(jsonPath("$.reason").value("WEEKLY_VALUATIONS_MISSING"));
        for(int i=0;i<=8;i++){
            var week=start.plusWeeks(i);
            close(mvc,equity,week,i==0?"100":i==1?"110":"88");
            snapshot(mvc,account,week,week.plusDays(1));
        }
        submit(mvc,risk,equity.owner(),window).andExpect(status().isOk())
                .andExpect(jsonPath("$.state").value("AVAILABLE"))
                .andExpect(jsonPath("$.maxDrawdownPercent").value("20"))
                .andExpect(jsonPath("$.annualizedVolatilityPercent").value("60.178306"))
                .andExpect(jsonPath("$.observations.length()").value(9))
                .andExpect(jsonPath("$.observations[2].indexValue").value("88"));
    }
}
