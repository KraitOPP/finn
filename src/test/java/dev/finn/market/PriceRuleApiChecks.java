
package dev.finn.market;

import static dev.finn.market.MarketDatabaseChecks.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import org.springframework.test.web.servlet.MockMvc;

public final class PriceRuleApiChecks {
    private PriceRuleApiChecks() {}

    public static void versionsArePrivateAndRetainThresholds(MockMvc mvc) throws Exception {
        var equity = catalogue(mvc, "fictional-rule-owner");
        var other = catalogue(mvc, "fictional-rule-other");
        String rules = "/api/v1/monitoring/rules";
        String input = settings(equity.listing());
        submit(mvc, rules, other.owner(), input).andExpect(status().isNotFound());
        submit(mvc, rules, equity.owner(), input.replace("\"100.250\"", "100.250")).andExpect(status().isUnprocessableContent());
        var created = ok(submit(mvc, rules, equity.owner(), input));
        String path = rules + "/" + created.get("ruleId").asText();
        submit(mvc, path, other.owner(), edit(input, 1)).andExpect(status().isNotFound());
        submit(mvc, path, equity.owner(), edit(input.replace("100.250", "150"), 1))
                .andExpect(status().isOk()).andExpect(jsonPath("$.revision").value(2));
        submit(mvc, path, equity.owner(), edit(input, 1)).andExpect(status().isConflict());
        read(mvc, path + "/versions", equity.owner()).andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].settings.threshold").value("150"))
                .andExpect(jsonPath("$.items[1].settings.threshold").value("100.25"));
        read(mvc, rules, other.owner()).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    static String settings(String listing) {
        return """
                {"listingId":"%s","name":"Fictional rule","source":"MANUAL_REVIEWED","comparison":"ABOVE",
                 "threshold":"100.250","maxAgeDays":4,"cooldownMinutes":0,"rearm":true,"enabled":true,"expiresOn":null}
                """.formatted(listing);
    }

    private static String edit(String settings, int version) {
        return "{\"settings\":" + settings + ",\"expectedRevision\":" + version + "}";
    }
}
