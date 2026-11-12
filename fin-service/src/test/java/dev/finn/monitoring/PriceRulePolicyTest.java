
package dev.finn.monitoring;

import static dev.finn.monitoring.PriceRulePolicy.Comparison.*;
import static org.assertj.core.api.Assertions.assertThat;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;

class PriceRulePolicyTest {
    @Test
    void crossingRequiresTwoNearbyClosesAndStrictThreshold() {
        var previous = close("100", 1);
        assertThat(PriceRulePolicy.evaluate(CROSS_ABOVE, new BigDecimal("100"), close("100", 2), previous).satisfied()).isFalse();
        assertThat(PriceRulePolicy.evaluate(CROSS_ABOVE, new BigDecimal("100"), close("100.01", 2), previous).satisfied()).isTrue();
        assertThat(PriceRulePolicy.evaluate(CROSS_ABOVE, new BigDecimal("100"), close("110", 6), previous).comparable()).isFalse();
    }

    @Test
    void comparesMovesExactlyWithoutRoundedDivision() {
        assertThat(PriceRulePolicy.evaluate(MOVE_UP, new BigDecimal("2.5"), close("10.25", 2), close("10", 1)).satisfied()).isTrue();
        assertThat(PriceRulePolicy.evaluate(MOVE_DOWN, new BigDecimal("2.5"), close("9.7501", 2), close("10", 1)).satisfied()).isFalse();
        assertThat(PriceRulePolicy.evaluate(MOVE_DOWN, new BigDecimal("2.5"), close("9.75", 2), close("10", 1)).satisfied()).isTrue();
    }

    private static PriceRulePolicy.Close close(String value, int day) {
        return new PriceRulePolicy.Close(LocalDate.of(2026, 1, day), new BigDecimal(value));
    }
}
