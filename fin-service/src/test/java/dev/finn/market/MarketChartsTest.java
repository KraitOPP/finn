package dev.finn.market;

import static org.junit.jupiter.api.Assertions.*;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class MarketChartsTest {
    @Test
    void skipsHolidayBarsAndPreservesSpecialTrading() {
        var rows = List.of(point("2026-11-06",null,"100"),point("2026-11-08",null,"104"),
                point("2026-11-09",null,"102"),point("2026-11-10",null,"1"),point("2026-11-11",null,"110"));
        for (String exchange : List.of("NSE","BSE")) {
            var chart = MarketCharts.summarize(MarketCharts.Range.D7,"YAHOO_YFINANCE",false,exchange,
                    LocalDate.parse("2026-11-10"),rows.subList(0,4));
            assertEquals(List.of(rows.get(0),rows.get(1),rows.get(2)),chart.points());
            assertEquals("2.00",chart.changePercent());
            assertEquals("100",chart.low());
            assertEquals("104",chart.high());
            assertEquals("HOLIDAY",chart.today().kind());
            assertTrue(chart.calendarEvents().stream().anyMatch(event -> event.kind().equals("SPECIAL")));
        }
    }

    @Test
    void oneDayOnClosureUsesLatestObservedSession() {
        var rows = List.of(point("2026-11-06","2026-11-06T09:45:00Z","100"),
                point("2026-11-09","2026-11-09T03:45:00Z","101"),
                point("2026-11-09","2026-11-09T03:50:00Z","103"));
        var chart = MarketCharts.summarize(MarketCharts.Range.D1,"YAHOO_YFINANCE",true,"NSE",
                LocalDate.parse("2026-11-10"),rows);
        assertEquals(rows.subList(1,3),chart.points());
        assertEquals("5M",chart.interval());
    }

    private static MarketCharts.Point point(String date,String time,String close) {
        return new MarketCharts.Point(LocalDate.parse(date),time,close);
    }
}
