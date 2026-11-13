package dev.finn.market;

import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.ValuationDatabaseChecks.*;
import static dev.finn.market.GuidanceChecks.document;
import static dev.finn.market.ThesisChecks.filing;
import static dev.finn.market.ThesisChecks.index;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static org.assertj.core.api.Assertions.assertThat;

import dev.finn.research.ResearchExtractionWorker;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.springframework.test.web.servlet.MockMvc;

public final class TodayBriefingChecks {
    private TodayBriefingChecks(){}

    public static void briefingConnectsOwnedEvidenceWithCurrentExposure(MockMvc mvc,ResearchExtractionWorker worker)throws Exception{
        String owner="fictional-today-owner",other="fictional-today-other";
        var first=catalogue(mvc,owner);
        String company=ok(read(mvc,"/api/v1/catalog/securities/"+first.security(),owner)).path("security").path("companyId").asText();
        String secondCompany=SourceDocumentChecks.company(mvc,owner);
        String secondId=DiscoveryChecks.listing(mvc,owner,secondCompany,"TODAYTEST");
        var account=account(mvc,owner);
        var secondListing=ok(read(mvc,"/api/v1/research/stock-ai/listings?company="+secondCompany,owner)).path("items").get(0);
        var second=new Security(owner,secondListing.path("securityId").asText(),secondId);
        LocalDate last=MarketPrices.today().minusDays(1);
        event(mvc,account,last.minusDays(2),"OPENING_POSITION",first.security(),"10",null,"900",null);
        event(mvc,account,last.minusDays(2),"OPENING_POSITION",second.security(),"5",null,"300",null);
        choose(mvc,account,first,false);
        choose(mvc,account,second,false);
        close(mvc,first,last,"100");
        close(mvc,second,last,"100");
        ok(submit(mvc,DiscoveryChecks.UNIVERSE,owner,DiscoveryChecks.member(first.listing(),"TECHNOLOGY",true,null)));
        ok(submit(mvc,DiscoveryChecks.UNIVERSE,owner,DiscoveryChecks.member(secondId,"MANUFACTURING",true,null)));
        String date=Instant.now().minusSeconds(30).truncatedTo(ChronoUnit.SECONDS).toString();
        String doc=document(mvc,owner,filing(company,"Fictional filing for holding","Exports to Asia account for 25 of sales.",date));
        String otherDoc=document(mvc,owner,filing(secondCompany,"Fictional same exposure","Asia sales represented 20 of total.",date));
        String anchor=index(mvc,worker,owner,doc,1);
        String otherAnchor=index(mvc,worker,owner,otherDoc,1);
        note(mvc,owner,company,anchor);
        note(mvc,owner,secondCompany,otherAnchor);
        ok(submit(mvc,"/api/v1/research/companies/"+company+"/notes",owner,
                "{\"kind\":\"QUESTION\",\"title\":\"Is this growth sustainable?\",\"anchorId\":null}"));
        String event=ok(submit(mvc,"/api/v1/research/events",owner,"""
                {"documentId":"%s","documentRevision":1,"title":"Fictional results due","subtype":"RESULTS_MEETING","stage":"ANNOUNCED",
                 "materiality":"MEDIUM","novelty":"NEW","reviewed":true,"dates":[{"type":"RESULTS","date":"%s","certainty":"CONFIRMED"}]}
                """.formatted(doc.substring(doc.lastIndexOf('/')+1),last.plusDays(8)))).path("eventId").asText();
        var brief=ok(read(mvc,"/api/v1/briefing",owner));
        assertThat(brief.path("holdings").size()).isEqualTo(1);
        assertThat(brief.path("holdings").get(0).at("/announcement/event/eventId").asText()).isEqualTo(event);
        assertThat(brief.path("questions").size()).isEqualTo(1);
        assertThat(brief.path("upcoming").size()).isEqualTo(1);
        assertThat(ok(read(mvc,"/api/v1/briefing",other)).path("holdings").size()).isZero();
        String through=brief.path("through").asText();
        ok(submit(mvc,"/api/v1/briefing/reviewed",owner,"{\"through\":\""+through+"\"}"));
        read(mvc,"/api/v1/briefing",owner).andExpect(jsonPath("$.holdings.length()").value(0))
                .andExpect(jsonPath("$.upcoming.length()").value(1)).andExpect(jsonPath("$.lastReviewedThrough").value(through));

        String health=account.portfolio()+"/health";
        read(mvc,health,owner).andExpect(status().isOk()).andExpect(jsonPath("$.sharedExposures[0].companies").value(2))
                .andExpect(jsonPath("$.sharedExposures[0].equityWeight").value("100"))
                .andExpect(jsonPath("$.eventImpact.length()").value(2));
        submit(mvc,health+"/sector-scenario",owner,"{\"sector\":\"TECHNOLOGY\",\"shockPercent\":\"-10\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.state").value("SIMULATED"))
                .andExpect(jsonPath("$.beforeEquity").value("1500")).andExpect(jsonPath("$.afterEquity").value("1400"));
        var portfolio=account.portfolio().substring(account.portfolio().lastIndexOf('/')+1);
        var calendar="/api/v1/discovery/portfolio-calendar?portfolioId="+portfolio;
        read(mvc,calendar,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[0].event.eventId").value(event));
        read(mvc,calendar,other).andExpect(status().isNotFound());
    }

    private static void note(MockMvc mvc,String owner,String company,String anchor)throws Exception{
        ok(submit(mvc,"/api/v1/research/companies/"+company+"/notes",owner,
                "{\"kind\":\"EXPOSURE\",\"title\":\"Asia exports\",\"anchorId\":\""+anchor+"\"}"));
    }
}
