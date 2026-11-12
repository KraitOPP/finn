
package dev.finn.monitoring;

import java.time.*;
import java.time.temporal.ChronoUnit;

final class CalendarTiming {
    private CalendarTiming() {}

    static Instant resolve(LocalDateTime local, ZoneId zone) {
        return local.atZone(zone).toInstant();
    }

    static Instant next(LocalDateTime anchor, ZoneId zone, int intervalDays, Instant after) {
        Instant start = resolve(anchor, zone);
        if (start.isAfter(after)) return start;
        if (intervalDays == 0) return null;
        long elapsedDays = ChronoUnit.DAYS.between(anchor.toLocalDate(), after.atZone(zone).toLocalDate());
        LocalDateTime nearest = anchor.plusDays(Math.max(0, elapsedDays / intervalDays) * intervalDays);
        Instant slot = resolve(nearest, zone);
        return slot.isAfter(after) ? slot : resolve(nearest.plusDays(intervalDays), zone);
    }

    static Instant outsideQuietHours(Instant requested, ZoneId zone, LocalTime start, LocalTime end) {
        if (start == null || end == null) return requested;
        ZonedDateTime local = requested.atZone(zone);
        LocalTime time = local.toLocalTime();
        LocalDate endDate = local.toLocalDate();
        if (start.isBefore(end)) {
            if (time.isBefore(start) || !time.isBefore(end)) return requested;
        } else if (!time.isBefore(start)) {
            endDate = endDate.plusDays(1);
        } else if (!time.isBefore(end)) {
            return requested;
        }
        Instant release = endDate.atTime(end).atZone(zone).withLaterOffsetAtOverlap().toInstant();
        return release.isBefore(requested) ? requested : release;
    }
}
