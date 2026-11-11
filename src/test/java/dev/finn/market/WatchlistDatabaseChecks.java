
package dev.finn.market;

import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class WatchlistDatabaseChecks {
    private WatchlistDatabaseChecks(){}
    public static void separatesListsAndDuplicateListings(MockMvc mvc)throws Exception {
        var equity=catalogue(mvc,"fictional-watchlist-owner");
        var other=catalogue(mvc,"fictional-watchlist-outsider");
        var path="/api/v1/watchlists";
        var list=ok(submit(mvc,path,equity.owner(),"{\"name\":\"Fictional watchlist\"}"));
        assertThat(ok(submit(mvc,path,equity.owner(),"{\"name\":\"fictional watchlist\"}"))).isEqualTo(list);
        var detail=path+"/"+list.get("watchlistId").asText();
        String track="""
                {"listingId":"%s","tracked":true}
                """.formatted(equity.listing());
        submit(mvc,detail+"/items",equity.owner(),track.replace(equity.listing(),other.listing())).andExpect(status().isNotFound());
        submit(mvc,detail+"/items",other.owner(),track).andExpect(status().isNotFound());
        read(mvc,detail,other.owner()).andExpect(status().isNotFound());
        read(mvc,path,other.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        ok(submit(mvc,detail+"/items",equity.owner(),track));
        submit(mvc,detail+"/items",equity.owner(),track).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].latest").isEmpty());
        close(mvc,equity,MarketPrices.today().minusDays(1),"76.25");
        read(mvc,detail,equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].latest.close").value("76.25"));
        submit(mvc,detail+"/items",equity.owner(),track.replace("true","false")).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        read(mvc,equity.market(),equity.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.latest.close").value("76.25"));
    }
}
