
package dev.finn.market;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static dev.finn.market.SourceDocumentChecks.*;
import static dev.finn.market.CompanyEventChecks.event;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class FilingRuleChecks {
    private FilingRuleChecks() {}
    public static void schedulesDistinctDatesAndSuppressesCorrections(MockMvc mvc,JdbcTemplate jdbc)throws Exception {
        String owner="fictional-filing-date-owner",company=company(mvc,owner);
        String source=ok(submit(mvc,"/api/v1/research/sources",owner,source(company,"Fictional dated notice",null,"Fictional dated evidence"))).get("documentId").asText();
        ok(submit(mvc,"/api/v1/research/filing-rules",owner,"""
                {"companyId":"%s","title":"Fictional filing monitor","category":"CORPORATE_ACTION",
                "minimumMateriality":"ANY","arrivals":true,"dates":true,"tentative":false}
                """.formatted(company)));
        var today=LocalDate.now(ZoneId.of("Asia/Kolkata"));
        String events="/api/v1/research/events";
        String initial=dated(event(source,null,null,"Fictional dated event","DIVIDEND","ANNOUNCED","NEW"),
                today.plusDays(2),today.plusDays(3));
        var created=ok(submit(mvc,events,owner,initial));
        UUID id=UUID.fromString(created.get("eventId").asText());
        ok(submit(mvc,events,owner,initial));
        assertThat(count(jdbc,id,"ARRIVAL")).isEqualTo(1);
        assertThat(count(jdbc,id,"DATE")).isEqualTo(1);
        String calendar="/api/v1/research/calendar";
        read(mvc,calendar,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].date.type").value("EX_DATE"))
                .andExpect(jsonPath("$.items[1].date.type").value("RECORD_DATE"))
                .andExpect(jsonPath("$.items[1].date.certainty").value("TENTATIVE"));
        ok(submit(mvc,events,owner,dated(event(source,id.toString(),1,"Fictional dated event","DIVIDEND","ANNOUNCED","CORRECTION"),
                today.plusDays(4),today.plusDays(3))));
        assertThat(count(jdbc,id,"DATE")).isEqualTo(2);
        assertThat(suppressed(jdbc,id)).isEqualTo(1);
        ok(submit(mvc,events,owner,event(source,id.toString(),2,"Fictional dated event","DIVIDEND","CANCELLED","CORRECTION")));
        read(mvc,calendar,owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        assertThat(suppressed(jdbc,id)).isEqualTo(2);
        read(mvc,events+"/"+id+"/versions",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items[2].dates[0].date").value(today.plusDays(2).toString()));
        read(mvc,calendar,"fictional-filing-date-other").andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    private static int count(JdbcTemplate jdbc,UUID id,String kind){
        return jdbc.queryForObject("SELECT count(*) FROM finn.activity WHERE subject_id=? AND dedupe_key LIKE ?",Integer.class,id,kind+":%");
    }

    private static int suppressed(JdbcTemplate jdbc,UUID id){
        return jdbc.queryForObject("""
                SELECT count(*) FROM finn.activity a JOIN finn.activity_delivery d USING(owner_id,activity_id)
                WHERE a.subject_id=? AND a.dedupe_key LIKE 'DATE:%' AND d.status='SUPPRESSED'
                """,Integer.class,id);
    }

    private static String dated(String input,LocalDate ex,LocalDate record) {
        String body=input.strip();
        return body.substring(0,body.length()-1)+"""
                ,"dates":[{"type":"EX_DATE","date":"%s","certainty":"CONFIRMED"},{"type":"RECORD_DATE","date":"%s","certainty":"TENTATIVE"}]}
                """.formatted(ex,record);
    }
}
