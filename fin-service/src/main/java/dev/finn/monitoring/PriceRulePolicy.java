
package dev.finn.monitoring;

import java.math.BigDecimal;
import java.time.LocalDate;

final class PriceRulePolicy {
    enum Comparison { ABOVE, BELOW, CROSS_ABOVE, CROSS_BELOW, MOVE_UP, MOVE_DOWN }

    record Close(LocalDate date, BigDecimal value) {}
    record Match(boolean comparable, boolean satisfied, boolean resets) {}

    private PriceRulePolicy() {}

    static Match evaluate(Comparison comparison, BigDecimal threshold, Close current, Close previous) {
        int relation = current.value().compareTo(threshold);
        return switch (comparison) {
            case ABOVE -> new Match(true, relation > 0, relation <= 0);
            case BELOW -> new Match(true, relation < 0, relation >= 0);
            case CROSS_ABOVE, CROSS_BELOW -> crossing(comparison, threshold, current, previous, relation);
            case MOVE_UP, MOVE_DOWN -> move(comparison, threshold, current, previous);
        };
    }

    private static Match crossing(Comparison comparison, BigDecimal threshold, Close current, Close previous, int relation) {
        boolean above = comparison == Comparison.CROSS_ABOVE;
        boolean onResetSide = above ? relation <= 0 : relation >= 0;
        if (!nearby(current, previous)) return new Match(false, false, onResetSide);
        int prior = previous.value().compareTo(threshold);
        boolean crossed = above ? prior <= 0 && relation > 0 : prior >= 0 && relation < 0;
        return new Match(true, crossed, onResetSide);
    }

    private static Match move(Comparison comparison, BigDecimal threshold, Close current, Close previous) {
        if (!nearby(current, previous)) return new Match(false, false, false);
        var change = current.value().subtract(previous.value()).movePointRight(2);
        if (comparison == Comparison.MOVE_DOWN) change = change.negate();
        boolean matched = change.compareTo(previous.value().multiply(threshold)) >= 0;
        return new Match(true, matched, !matched);
    }

    private static boolean nearby(Close current, Close previous) {
        return previous != null && current.date().isAfter(previous.date()) && !previous.date().isBefore(current.date().minusDays(4));
    }
}
