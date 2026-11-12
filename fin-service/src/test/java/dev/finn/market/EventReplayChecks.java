
package dev.finn.market;

import dev.finn.monitoring.DeliveryWorker;
import org.springframework.test.web.servlet.MockMvc;
import static dev.finn.market.MarketDatabaseChecks.*;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

public final class EventReplayChecks {
    private EventReplayChecks() {}
    public static void replaysWithoutCrossingRealWorkspaceBoundaries(MockMvc mvc,DeliveryWorker deliveries)throws Exception {
        String owner="fictional-replay-caller", other="fictional-replay-other", path="/api/v1/research/replay";
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.runId").isEmpty());
        var started=ok(submit(mvc,path,owner,"{}"));
        assertThat(started.get("mode").asText()).isEqualTo("SYNTHETIC_REPLAY");
        assertThat(started.get("events").size()).isEqualTo(2);
        assertThat(started.get("notifications").size()).isEqualTo(2);
        assertThat(started.get("events").get(0).get("attention").get("event").get("revision").asInt()).isEqualTo(2);
        assertThat(started.get("events").get(0).get("attention").get("score").asInt()).isEqualTo(65);
        assertThat(started.get("events").get(0).get("attention").get("holdings").size()).isEqualTo(1);
        assertThat(started.get("events").get(0).get("attention").get("holdings").get(0).get("quantity").asText()).isEqualTo("2");
        assertThat(started.get("brief").get("companyEvents").size()).isEqualTo(2);
        var repeated=ok(submit(mvc,path,owner,"{}"));
        assertThat(repeated.get("runId")).isEqualTo(started.get("runId"));
        assertThat(repeated.get("notifications").size()).isEqualTo(2);
        for(int i=0;i<100&&deliveries.processNext();i++){ /* bounded synthetic delivery */ }
        read(mvc,path,owner).andExpect(status().isOk()).andExpect(jsonPath("$.notifications[0].status").value("DELIVERED"));
        read(mvc,path,other).andExpect(status().isOk()).andExpect(jsonPath("$.runId").isEmpty());
        read(mvc,"/api/v1/portfolios",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        read(mvc,"/api/v1/research/events",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        read(mvc,"/api/v1/monitoring/notifications",owner).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
        String id=started.get("events").get(0).get("evidence").get("source").get("documentId").asText();
        read(mvc,"/api/v1/research/sources/"+id+"/versions/1",owner).andExpect(status().isNotFound());
    }
}
