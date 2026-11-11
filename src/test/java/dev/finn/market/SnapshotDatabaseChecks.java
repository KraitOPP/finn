
package dev.finn.market;

import dev.finn.jobs.JobQueue;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class SnapshotDatabaseChecks {
    private SnapshotDatabaseChecks(){}

    public static void snapshotsKeepGapsAndImmutableInputs(MockMvc mvc,MarketPrices prices,JobQueue queue,YahooProcess yahoo)throws Exception {
        var equity=catalogue(mvc,"fictional-valuation-snapshots");
        var account=account(mvc,equity.owner());
        var date=MarketPrices.today().minusDays(5);
        event(mvc,account,date,"BUY",equity.security(),"2","12",null,"0");
        choose(mvc,account,equity,true);
        var original=close(mvc,equity,date,"20");
        var paths=account.base()+"/valuation/snapshots";
        String range="""
                {"start":"%s","endExclusive":"%s"}
                """.formatted(date.minusDays(1),date.plusDays(2));
        doReturn("PRIVATE_DAILY").when(yahoo).capability();
        doReturn(candidate(equity,row(date.plusDays(1),"100"))).when(yahoo).fetch(any());
        submit(mvc,equity.market()+"/refresh",equity.owner(),"""
                {"start":"%s","endExclusive":"%s"}
                """.formatted(date,date.plusDays(2))).andExpect(status().isAccepted());
        new MarketWorker(prices,queue,yahoo).tick();
        read(mvc,account.base()+"/valuation",equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.holdings[0].observation.priceBasis").value("PROVIDER_DEFINED"))
                .andExpect(jsonPath("$.totals.holdingsValue").value("200"));
        var initial=ok(submit(mvc,paths,equity.owner(),range));
        var points=initial.get("points");
        assertThat(points.get(0).get("status").asText()).isEqualTo("BEFORE_COVERAGE");
        assertThat(points.get(1).get("status").asText()).isEqualTo("CASH_UNKNOWN");
        assertThat(points.get(1).get("holdingsValue").asText()).isEqualTo("40");
        assertThat(points.get(2).get("status").asText()).isEqualTo("PRICES_MISSING");
        assertThat(points.get(2).get("holdingsValue").isNull()).isTrue();
        assertThat(ok(submit(mvc,paths,equity.owner(),range))).isEqualTo(initial);
        String old=points.get(1).get("snapshotId").asText();
        close(mvc,equity,date,"21");
        var revised=ok(submit(mvc,paths,equity.owner(),range)).get("points").get(1);
        assertThat(revised.get("snapshotId").asText()).isNotEqualTo(old);
        assertThat(revised.get("holdingsValue").asText()).isEqualTo("42");
        read(mvc,paths+"/"+old,equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.snapshot.holdingsValue").value("40"))
                .andExpect(jsonPath("$.valuation.holdings[0].observation.observationId").value(original.get("observationId").asText()));
        read(mvc,paths+"/"+old,"fictional-snapshot-outsider").andExpect(status().isNotFound());
        read(mvc,paths+"?start="+date.minusDays(1)+"&endExclusive="+date.plusDays(2),equity.owner())
                .andExpect(status().isOk()).andExpect(jsonPath("$.points[1].holdingsValue").value("42"));
    }
}
