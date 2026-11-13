package dev.finn.market;

import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

import dev.finn.monitoring.DeliveryWorker;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.springframework.test.web.servlet.MockMvc;

public final class ResearchAlertChecks {
    private ResearchAlertChecks(){}
    public static void confirmsExactRulesAndDeliversOneNoticePerMaterialEvent(MockMvc mvc,DeliveryWorker delivery)throws Exception{
        String owner="fictional-alert-language-owner",other="fictional-alert-language-other";
        String company=company(mvc,owner);
        String listing=DiscoveryChecks.listing(mvc,owner,company,"LANGTEST");
        String watch=ok(submit(mvc,"/api/v1/watchlists",owner,"{\"name\":\"Fictional watched list\"}")).path("watchlistId").asText();
        ok(submit(mvc,"/api/v1/watchlists/"+watch+"/items",owner,"{\"listingId\":\""+listing+"\",\"tracked\":true}"));
        String path="/api/v1/monitoring/research-alerts";
        String sentence="Notify me if a watchlisted company announces a significant order.";
        String request="{\"sentence\":\""+sentence+"\",\"cadence\":\"DAILY\"}";
        var preview=ok(submit(mvc,path+"/preview",owner,request));
        assertThat(preview.path("criteria").path("scope").asText()).isEqualTo("WATCHLIST");
        submit(mvc,path+"/preview",owner,request.replace("announces","does not announce")).andExpect(status().isUnprocessableContent());
        read(mvc,path,owner).andExpect(jsonPath("$.items.length()").value(0));
        String confirm=request.substring(0,request.length()-1)+",\"criteria\":"+preview.path("criteria")+"}";
        submit(mvc,path,owner,confirm.replace("\"WATCHLIST\"","\"ALL\"")).andExpect(status().isConflict());
        String id=ok(submit(mvc,path,owner,confirm)).path("ruleId").asText();
        assertThat(ok(submit(mvc,path,owner,confirm)).path("ruleId").asText()).isEqualTo(id);
        submit(mvc,path+"/"+id,other,"{\"enabled\":false}").andExpect(status().isNotFound());

        var published=Instant.now().minusSeconds(60).truncatedTo(ChronoUnit.SECONDS);
        String source=source(mvc,owner,company,published,"Fictional issuer order");
        String event=MarketRadarChecks.event(mvc,owner,source,"Fictional significant award");
        String followup=source(mvc,owner,company,published,"Fictional issuer award update");
        revise(mvc,owner,event,followup,1,"FOLLOW_UP");
        String alertsPath="/api/v1/monitoring/notifications";
        assertThat(ok(read(mvc,alertsPath,owner)).path("items").size()).isZero();

        // Use an immediate rule to exercise actual notice delivery with no time manipulation.
        String immediate=request.replace("DAILY","IMMEDIATE");
        var quick=ok(submit(mvc,path+"/preview",owner,immediate));
        String quickConfirm=immediate.substring(0,immediate.length()-1)+",\"criteria\":"+quick.path("criteria")+"}";
        ok(submit(mvc,path,owner,quickConfirm));
        String second=MarketRadarChecks.event(mvc,owner,source,"Fictional separate order");
        revise(mvc,owner,second,followup,1,"FOLLOW_UP");
        for(int i=0;i<15&&delivery.processNext();i++){}
        var items=ok(read(mvc,alertsPath,owner)).path("items");
        assertThat(items.size()).isEqualTo(1);
        assertThat(items.get(0).path("kind").asText()).isEqualTo("RESEARCH_ALERT");
        String notice=alertsPath+"/"+items.get(0).path("activityId").asText();
        read(mvc,notice,owner).andExpect(status().isOk()).andExpect(jsonPath("$.researchMatches[0].event.eventId").value(second));
        read(mvc,notice,other).andExpect(status().isNotFound());
        revise(mvc,owner,second,source,2,"CORRECTION");
        for(int i=0;i<15&&delivery.processNext();i++){}
        assertThat(ok(read(mvc,alertsPath,owner)).path("items").size()).isEqualTo(2);

        ok(submit(mvc,"/api/v1/research/attention/"+second,owner,"{\"eventRevision\":3,\"action\":\"TOO_MANY\"}"));
        var feed=ok(read(mvc,"/api/v1/research/attention",owner)).path("items");
        assertThat(feed.get(0).path("watched").asBoolean()).isTrue();
        String article=ok(submit(mvc,"/api/v1/research/news",owner,"""
                {"companyId":"%s","headline":"Fictional independent coverage","publisher":"Example",
                 "url":"https://news.example.com/award","rightsConfirmed":true}
                """.formatted(company))).path("documentId").asText();
        String articleBody="{\"documentId\":\""+article+"\",\"revision\":1}";
        ok(submit(mvc,"/api/v1/research/events/"+second+"/news",owner,articleBody));
        read(mvc,"/api/v1/research/events/"+second+"/news",owner).andExpect(jsonPath("$.items.length()").value(1));
        submit(mvc,"/api/v1/research/events/"+event+"/news",owner,articleBody).andExpect(status().isConflict());
    }
    private static String source(MockMvc mvc,String owner,String company,Instant published,String title)throws Exception{
        return ok(submit(mvc,"/api/v1/research/sources",owner,"""
                {"companyId":"%s","title":"%s","sourceName":"Fictional issuer","url":"https://issuer.example.com/order",
                 "publishedAt":"%s","rightsConfirmed":true}
                """.formatted(company,title,published))).path("documentId").asText();
    }
    private static void revise(MockMvc mvc,String owner,String event,String source,int previous,String novelty)throws Exception{
        ok(submit(mvc,"/api/v1/research/events",owner,"""
                {"documentId":"%s","documentRevision":1,"eventId":"%s","expectedRevision":%d,"title":"Fictional reviewed order",
                 "subtype":"ORDER","stage":"ANNOUNCED","materiality":"HIGH","novelty":"%s","reviewed":true}
                """.formatted(source,event,previous,novelty)));
    }
}
