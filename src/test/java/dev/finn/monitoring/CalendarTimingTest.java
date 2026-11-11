
package dev.finn.monitoring;

import static org.assertj.core.api.Assertions.assertThat;
import java.time.*;
import org.junit.jupiter.api.Test;

class CalendarTimingTest {
    @Test
    void resolvesSpringGapAndPreservesWallTimeOnSubsequentDays() {
        var zone = ZoneId.of("America/New_York");
        var local = LocalDateTime.parse("2025-03-08T02:30");
        var gap = CalendarTiming.next(local, zone, 1, Instant.parse("2025-03-09T00:00:00Z"));
        assertThat(gap).isEqualTo(Instant.parse("2025-03-09T07:30:00Z"));
        assertThat(CalendarTiming.next(local, zone, 1, gap)).isEqualTo(Instant.parse("2025-03-10T06:30:00Z"));
    }

    @Test
    void overnightQuietHoursReleaseAtTheLaterRepeatedEndTime() {
        var zone = ZoneId.of("America/New_York");
        var release = CalendarTiming.outsideQuietHours(Instant.parse("2025-11-02T02:30:00Z"), zone,
                LocalTime.of(22, 0), LocalTime.of(1, 30));
        assertThat(release).isEqualTo(Instant.parse("2025-11-02T06:30:00Z"));
    }
}
