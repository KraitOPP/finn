package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import java.util.concurrent.Semaphore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import tools.jackson.databind.JsonNode;

@Service
class MarketCharts {
    static final ZoneId INDIA = ZoneId.of("Asia/Kolkata");
    private static final int MAX_POINTS = 420;
    enum Range {
        D1, D7, M1, Y1, Y5, ALL;
        LocalDate start(LocalDate today) {
            return switch (this) {
                case D1 -> today.minusDays(14);
                case D7 -> today.minusDays(6);
                case M1 -> today.minusMonths(1);
                case Y1 -> today.minusYears(1);
                case Y5 -> today.minusYears(5);
                case ALL -> null;
            };
        }
    }
    record ProviderRequest(String exchange, String symbol, Range range, LocalDate start, LocalDate end) {}
    record Point(LocalDate date, String time, String close) {}
    record Chart(Range range, String source, String interval, List<Point> points, int count,
                 String changePercent, String low, String high, EquityCalendar.Session today,
                 List<EquityCalendar.Session> calendarEvents) {}

    private final CurrentUser users;
    private final Catalogue catalogue;
    private final YahooProcess yahoo;
    private final JdbcTemplate jdbc;
    private final Semaphore providerSlots = new Semaphore(4);

    MarketCharts(CurrentUser users, Catalogue catalogue, YahooProcess yahoo, JdbcTemplate jdbc) {
        this.users=users; this.catalogue=catalogue; this.yahoo=yahoo; this.jdbc=jdbc;
    }

    Chart chart(UUID id, Range range, boolean reviewed) {
        UUID owner = users.requireId();
        var listing = catalogue.listing(owner, id);
        var now = ZonedDateTime.now(INDIA);
        var today = now.toLocalDate();
        var end = now.toLocalTime().isBefore(LocalTime.of(16,0)) ? today : today.plusDays(1);
        if (reviewed || listing.providerSymbol() == null) {
            var start = range.start(today);
            var rows = jdbc.query("""
                    SELECT DISTINCT ON(session_date) session_date,close
                    FROM finn.market_observation
                    WHERE owner_id=? AND listing_id=? AND source='MANUAL_REVIEWED'
                      AND session_date>=? AND session_date<?
                    ORDER BY session_date DESC,receipt_order DESC LIMIT 40000
                    """, (row,index) -> new Point(row.getObject(1,LocalDate.class),null,row.getBigDecimal(2).toPlainString()),
                    owner,id,start == null || range == Range.D1 ? LocalDate.of(1900,1,1) : start,end);
            return summarize(range,"MANUAL_REVIEWED",false,listing.exchange(),today,rows);
        }
        if (!"PRIVATE_DAILY".equals(yahoo.capability())) throw new ApiFailure(503,"CHART_NOT_CONFIGURED");
        if (!providerSlots.tryAcquire()) throw new ApiFailure(429,"CHART_BUSY");
        try {
            var start = range.start(today);
            if ("NSE_DIRECTORY".equals(listing.source()) && (start == null || start.isBefore(listing.validFrom())))
                start = listing.validFrom();
            if (range != Range.D1 && start != null && !start.isBefore(end))
                return summarize(range,"YAHOO_YFINANCE",false,listing.exchange(),today,List.of());
            var request = new ProviderRequest(listing.exchange(),listing.providerSymbol(),range,start,end);
            var rows = readPoints(yahoo.chart(request).path("items"),request,today);
            return summarize(range,"YAHOO_YFINANCE",range == Range.D1,listing.exchange(),today,rows);
        } catch (IOException | IllegalArgumentException | DateTimeException failure) {
            throw new ApiFailure(502,"CHART_UNAVAILABLE");
        } catch (InterruptedException failure) {
            Thread.currentThread().interrupt();
            throw new ApiFailure(503,"CHART_UNAVAILABLE");
        } finally {
            providerSlots.release();
        }
    }

    private static List<Point> readPoints(JsonNode items, ProviderRequest request, LocalDate today) {
        if (!items.isArray() || items.size() > 40000) throw new IllegalArgumentException();
        boolean intraday = request.range() == Range.D1;
        var points = new ArrayList<Point>();
        for (var item : items) {
            LocalDate date = LocalDate.parse(item.path("date").asText());
            if (date.isAfter(today) || (!intraday && !date.isBefore(request.end())) ||
                (request.start() != null && date.isBefore(request.start()))) continue;
            String time = null;
            if (intraday) {
                Instant instant = Instant.parse(item.path("time").asText());
                if (!instant.atZone(INDIA).toLocalDate().equals(date) || instant.isAfter(Instant.now())) continue;
                time = instant.toString();
            }
            String close = item.path("close").asText();
            if (!close.matches("[0-9]{1,14}(\\.[0-9]{1,30})?") || new BigDecimal(close).signum() <= 0)
                throw new IllegalArgumentException();
            points.add(new Point(date,time,close));
        }
        return points;
    }

    static Chart summarize(Range range, String source, boolean intraday, String exchange, LocalDate today, List<Point> rows) {
        var sorted = new TreeMap<String,Point>();
        for (var point : rows) {
            if (!EquityCalendar.on(exchange,point.date()).kind().equals("HOLIDAY"))
                sorted.put(intraday ? point.time() : point.date().toString(),point);
        }
        List<Point> points = List.copyOf(sorted.values());
        if (range == Range.D1 && !points.isEmpty()) {
            var session = points.getLast().date();
            points = points.stream().filter(point -> point.date().equals(session)).toList();
        }
        String change = null, low = null, high = null;
        int count = points.size();
        if (count > 0) {
            var amounts = points.stream().map(point -> new BigDecimal(point.close())).toList();
            low = Collections.min(amounts).toPlainString();
            high = Collections.max(amounts).toPlainString();
            if (count > 1)
                change = amounts.getLast().subtract(amounts.getFirst()).movePointRight(2)
                        .divide(amounts.getFirst(),2,RoundingMode.HALF_UP).toPlainString();
        }
        if (count > MAX_POINTS) {
            var sample = new ArrayList<Point>(MAX_POINTS);
            for (int i = 0; i < MAX_POINTS; i++)
                sample.add(points.get(i * (count - 1) / (MAX_POINTS - 1)));
            points = List.copyOf(sample);
        }
        return new Chart(range,source,intraday ? "5M" : "DAILY",points,count,change,low,high,
                EquityCalendar.on(exchange,today),EquityCalendar.nearby(exchange,today));
    }
}
