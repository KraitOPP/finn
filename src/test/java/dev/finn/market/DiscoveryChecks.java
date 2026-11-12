package dev.finn.market;

import dev.finn.research.ResearchExtractionWorker;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.company;
import static dev.finn.market.ThesisChecks.*;
import static dev.finn.market.GuidanceChecks.document;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class DiscoveryChecks {
    static final String DISCOVERY="/api/v1/discovery";
    static final String UNIVERSE=DISCOVERY+"/universe";
    static final String PERIOD="""
            {"kind":"QUARTER","start":"2025-04-01","end":"2025-06-30"}
            """;
    private DiscoveryChecks() {}

    static String listing(MockMvc mvc,String owner,String company,String ticker)throws Exception {
        String security=ok(submit(mvc,"/api/v1/catalog/securities",owner,"""
                {"companyId":"%s","name":"Fictional company %s","confirmed":true}
                """.formatted(company,ticker))).path("securityId").asText();
        return ok(submit(mvc,"/api/v1/catalog/securities/"+security+"/listings",owner,"""
                {"exchange":"NSE","series":"EQ","symbol":"%s","validFrom":"2020-01-01","confirmed":true}
                """.formatted(ticker))).path("listingId").asText();
    }

    static String member(String listing,String sector,boolean active,Integer revision){
        return """
                {"listingId":"%s","sector":"%s","active":%s,"expectedRevision":%s}
                """.formatted(listing,sector,active,revision);
    }

    static String saveFact(MockMvc mvc,ResearchExtractionWorker worker,String owner,String company,String metric,
                           String value,String scale,String title)throws Exception {
        String doc=document(mvc,owner,filing(company,title,"Reviewed result "+value,"2025-07-20T12:00:00Z"));
        String anchor=index(mvc,worker,owner,doc,1);
        String dimensions=QUARTER.replace("REVENUE",metric);
        if(metric.equals("OPERATING_MARGIN"))dimensions=dimensions.replace("\"MONEY\"","\"PERCENT\"").replace("\"INR\"","null");
        return ok(submit(mvc,ROOT+"/companies/"+company+"/facts",owner,amount(dimensions,anchor,value,scale))).path("factId").asText();
    }

    static String screen(String sector,String metric,String amount,String scale){
        return """
                {"name":"Fictional saved screen","sector":"%s","period":%s,
                 "filters":[{"metric":"%s","comparator":"GTE","amount":"%s","scale":"%s"}]}
                """.formatted(sector,PERIOD,metric,amount,scale);
    }

    public static void savesAndReplaysScreenInputs(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-screen-owner",other="fictional-screen-other",company=company(mvc,owner);
        String listing=listing(mvc,owner,company,"FICTIONALSC");
        ok(submit(mvc,UNIVERSE,owner,member(listing,"MANUFACTURING",true,null)));
        String gap=company(mvc,owner);
        ok(submit(mvc,UNIVERSE,owner,member(listing(mvc,owner,gap,"FICTIONALGAP"),"MANUFACTURING",true,null)));
        saveFact(mvc,worker,owner,company,"REVENUE","1250","MILLION","Fictional screened result");
        String screens=DISCOVERY+"/screens";
        submit(mvc,screens,owner,screen("BANKING","REVENUE","120","CRORE")).andExpect(status().isUnprocessableContent());
        String input=screen("MANUFACTURING","REVENUE","120","CRORE");
        String id=ok(submit(mvc,screens,owner,input)).path("screenId").asText();
        String path=screens+"/"+id;
        String key=java.util.UUID.randomUUID().toString();
        String request="{\"revision\":1,\"requestId\":\""+key+"\"}";
        var first=ok(submit(mvc,path+"/runs",owner,request));
        org.assertj.core.api.Assertions.assertThat(first.path("results").valueStream().map(row->row.path("state").asText()).toList())
                .containsExactlyInAnyOrder("MATCH","UNKNOWN");
        var watchlist=ok(submit(mvc,"/api/v1/watchlists",owner,"{\"name\":\"Fictional screened candidates\"}"));
        submit(mvc,"/api/v1/watchlists/"+watchlist.path("watchlistId").asText()+"/items",owner,
                "{\"listingId\":\""+listing+"\",\"tracked\":true}").andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].listingId").value(listing));
        ok(submit(mvc,UNIVERSE,owner,member(listing,"TECHNOLOGY",true,1)));
        ok(submit(mvc,path,owner,"{\"expectedRevision\":1,\"screen\":"+input.replace("\"120\"","\"130\"")+"}"));
        String saved=DISCOVERY+"/screen-runs/"+first.path("runId").asText();
        org.assertj.core.api.Assertions.assertThat(ok(read(mvc,saved,owner))).isEqualTo(first);
        org.assertj.core.api.Assertions.assertThat(ok(submit(mvc,path+"/runs",owner,request))).isEqualTo(first);
        submit(mvc,path+"/runs",owner,request.replace("\"revision\":1","\"revision\":2")).andExpect(status().isConflict());
        read(mvc,saved,other).andExpect(status().isNotFound());
    }

    public static void usesOnlyPrivateReviewedUniverseAndComparableFacts(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-discovery-owner",other="fictional-discovery-other";
        String company=company(mvc,owner),listing=listing(mvc,owner,company,"FICTIONAL9");
        submit(mvc,UNIVERSE,other,member(listing,"MANUFACTURING",true,null)).andExpect(status().isNotFound());
        ok(submit(mvc,UNIVERSE,owner,member(listing,"MANUFACTURING",true,null)));
        saveFact(mvc,worker,owner,company,"REVENUE","125","CRORE","Fictional quarter evidence");
        String coverage=UNIVERSE+"/coverage?kind=QUARTER&start=2025-04-01&end=2025-06-30";
        read(mvc,coverage,other).andExpect(status().isOk()).andExpect(jsonPath("$.companies.length()").value(0));
        read(mvc,coverage,owner).andExpect(status().isOk()).andExpect(jsonPath("$.source").value("MANUAL_CURRENT"))
                .andExpect(jsonPath("$.companies[0].readings[0].fact.normalizedAmount").value("1250000000"))
                .andExpect(jsonPath("$.companies[0].readings[1].reason").value("FACT_MISSING"))
                .andExpect(jsonPath("$.companies[0].readings[1].fact").isEmpty());
        ok(submit(mvc,UNIVERSE,owner,member(listing,"BANKING",true,1)));
        submit(mvc,UNIVERSE,owner,member(listing,"BANKING",false,1)).andExpect(status().isConflict());
        read(mvc,coverage,owner).andExpect(status().isOk()).andExpect(jsonPath("$.companies[0].readings[0].reason").value("SECTOR_INELIGIBLE"))
                .andExpect(jsonPath("$.companies[0].readings[0].fact").isEmpty());
        ok(submit(mvc,UNIVERSE,owner,member(listing,"BANKING",false,2)));
        read(mvc,coverage,owner).andExpect(status().isOk()).andExpect(jsonPath("$.companies.length()").value(0));
    }
}
