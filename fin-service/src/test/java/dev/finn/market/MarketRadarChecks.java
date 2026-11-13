package dev.finn.market;

import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.test.web.servlet.MockMvc;

public final class MarketRadarChecks {
    private MarketRadarChecks() {}

    public static void ranksDatedEventsWithoutPriceAndKeepsOwnersSeparate(MockMvc mvc) throws Exception {
        String owner="fictional-radar-owner",other="fictional-radar-other";
        String company=company(mvc,owner);
        String listing=DiscoveryChecks.listing(mvc,owner,company,"RADARTEST");
        ok(submit(mvc,DiscoveryChecks.UNIVERSE,owner,DiscoveryChecks.member(listing,"MANUFACTURING",true,null)));
        String watch=ok(submit(mvc,"/api/v1/watchlists",owner,"{\"name\":\"Fictional research candidates\"}")).path("watchlistId").asText();
        ok(submit(mvc,"/api/v1/watchlists/"+watch+"/items",owner,
                "{\"listingId\":\""+listing+"\",\"tracked\":true}"));
        Instant now=Instant.now().minusSeconds(5).truncatedTo(ChronoUnit.SECONDS);
        String old=saveSource(mvc,owner,company,now.minus(40,ChronoUnit.DAYS),"Fictional old order");
        String fresh=saveSource(mvc,owner,company,now,"Fictional letter of award");
        event(mvc,owner,old,"Old award");
        event(mvc,owner,fresh,"Recent award");
        ok(submit(mvc,"/api/v1/research/events",owner,"""
                {"documentId":"%s","documentRevision":1,"title":"Repeated publication notice","subtype":"ORDER","stage":"ANNOUNCED",
                 "materiality":"LOW","novelty":"ROUTINE","reviewed":true}
                """.formatted(fresh)));
        var endpoint="/api/v1/discovery/radar?scope=WATCHLIST&eventType=ORDER&sector=MANUFACTURING&days=7";
        read(mvc,endpoint,owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].announcement.event.title").value("Recent award"))
                .andExpect(jsonPath("$.items[0].stock.watched").value(true))
                .andExpect(jsonPath("$.items[0].score").value(70))
                .andExpect(jsonPath("$.items[0].movement").isEmpty());
        read(mvc,endpoint+"&liquidity=TURNOVER_1_CRORE",owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(0));
        read(mvc,endpoint,other).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(0));
    }

    private static String saveSource(MockMvc mvc,String owner,String company,Instant published,String title)throws Exception {
        return ok(submit(mvc,"/api/v1/research/sources",owner,"""
                {"companyId":"%s","title":"%s","sourceName":"Fictional issuer","url":"https://filings.example.com/award",
                 "publishedAt":"%s","rightsConfirmed":true}
                """.formatted(company,title,published))).path("documentId").asText();
    }

    static String event(MockMvc mvc,String owner,String source,String title)throws Exception {
        return ok(submit(mvc,"/api/v1/research/events",owner,"""
                {"documentId":"%s","documentRevision":1,"title":"%s","subtype":"ORDER","stage":"ANNOUNCED",
                 "materiality":"HIGH","novelty":"NEW","reviewed":true}
                """.formatted(source,title))).path("eventId").asText();
    }
}
