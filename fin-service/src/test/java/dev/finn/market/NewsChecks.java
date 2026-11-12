
package dev.finn.market;

import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static dev.finn.market.CompanyEventChecks.event;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class NewsChecks {
    private NewsChecks() {}
    public static void clustersLinksWithoutMakingThemPrimaryEvidence(MockMvc mvc)throws Exception {
        String owner="fictional-news-owner", company=company(mvc,owner), path="/api/v1/research/news";
        String first=ok(submit(mvc,path,owner,item(company,"Fictional news: market update","News One","https://news.example.com/one"))).get("documentId").asText();
        ok(submit(mvc,path,owner,item(company,"Fictional news – market update","News Two","https://news.example.net/two")));
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.coverage").value("MANUAL_LINKS"))
                .andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.items[0].sources.length()").value(2))
                .andExpect(jsonPath("$.items[0].sources[0].hasAttachment").value(false));
        read(mvc,path+"?companyId="+company,owner).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].companyId").value(company));
        read(mvc,path+"?companyId="+company,"fictional-news-other").andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
        read(mvc,"/api/v1/research/sources",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        submit(mvc,"/api/v1/research/events",owner,event(first,null,null,"Fictional news","OTHER","UNKNOWN","UNKNOWN"))
                .andExpect(status().isUnprocessableContent());
        read(mvc,path,"fictional-news-other").andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    private static String item(String company,String title,String name,String url){
        return """
                {"companyId":"%s","headline":%s,"publisher":%s,"url":"%s","publishedAt":"2025-01-06T09:00:00Z","rightsConfirmed":true}
                """.formatted(company,JSON.writeValueAsString(title),JSON.writeValueAsString(name),url);
    }
}
