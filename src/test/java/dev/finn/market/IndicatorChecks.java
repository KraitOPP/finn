
package dev.finn.market;

import dev.finn.jobs.JobQueue;
import dev.finn.monitoring.Indicators;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class IndicatorChecks {
    private IndicatorChecks() {}
    public static void requiresCompleteCoverageAndExcludesCurrentVolume(MockMvc mvc, JdbcTemplate jdbc, Indicators indicators,
            MarketPrices prices, JobQueue queue, YahooProcess yahoo) throws Exception {
        var equity = catalogue(mvc, "fictional-indicator-owner");
        String owner = equity.owner(), path = "/api/v1/monitoring/indicators";
        var account = account(mvc, owner);
        String portfolio = account.portfolio().substring(account.portfolio().lastIndexOf('/')+1);
        var date = MarketPrices.today().minusDays(1);
        event(mvc, account, date.minusDays(2), "BUY", equity.security(), "2", "10", null, "0");
        String volume = ok(submit(mvc,path,owner,rule(equity.listing(),null,"VOLUME","2.5"))).get("ruleId").asText();
        String allocation = ok(submit(mvc,path,owner,rule(equity.listing(),portfolio,"ALLOCATION","75"))).get("ruleId").asText();
        drain(indicators);
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].result").value("INSUFFICIENT_COVERAGE"));
        choose(mvc, account, equity, false);
        close(mvc, equity, date, "20");

        var rows = new ArrayList<String>();
        rows.add(row(date,"100").replace("\"volume\":\"100\"","\"volume\":\"300\""));
        for (int prior=1; prior<=10; prior++) rows.add(row(date.minusDays(prior),"100"));
        doReturn("PRIVATE_DAILY").when(yahoo).capability();
        doReturn(candidate(equity,String.join(",",rows))).when(yahoo).fetch(any());
        submit(mvc,equity.market()+"/refresh",owner,"""
                {"start":"%s","endExclusive":"%s"}
                """.formatted(date.minusDays(12),date.plusDays(1))).andExpect(status().isAccepted());
        new MarketWorker(prices,queue,yahoo).tick();
        jdbc.update("UPDATE finn.indicator_rule SET next_check_at=clock_timestamp() WHERE rule_id IN (?,?)",
                UUID.fromString(volume),UUID.fromString(allocation));
        drain(indicators);
        read(mvc,path+"/"+volume+"/evaluations",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].metric").value("3"))
                .andExpect(jsonPath("$.items[0].triggered").value(true)).andExpect(jsonPath("$.items[0].baselineStart").value(date.minusDays(10).toString()));
        read(mvc,path+"/"+allocation+"/evaluations",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].metric").value("100"))
                .andExpect(jsonPath("$.items[0].equityValue").value("40"));
        read(mvc,path+"/"+allocation+"/evaluations","fictional-indicator-other").andExpect(status().isNotFound());
    }

    private static String rule(String listing,String portfolio,String kind,String threshold) {
        return """
                {"listingId":"%s","portfolioId":%s,"kind":"%s","title":"Fictional indicator","threshold":"%s"}
                """.formatted(listing,JSON.writeValueAsString(portfolio),kind,threshold);
    }

    private static void drain(Indicators indicators) {
        for (int i=0; i<10 && indicators.processNext(); i++) { /* bounded synthetic work */ }
    }
}
