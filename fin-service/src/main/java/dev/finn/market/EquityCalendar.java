package dev.finn.market;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.MonthDay;
import java.util.List;
import java.util.Map;

final class EquityCalendar {
    record Session(LocalDate date, String kind, String label, String sourceUrl) {}
    private static final String NSE = "https://nsearchives.nseindia.com/content/circulars/CMTR71775.pdf";
    private static final String BSE = "https://www.bseindia.com/markets/MarketInfo/DispNewNoticesCirculars.aspx?page=20251212-8";
    private static final Map<MonthDay,String> HOLIDAYS = Map.ofEntries(
        day(1,26,"Republic Day"), day(2,15,"Mahashivratri"), day(3,3,"Holi"),
        day(3,21,"Eid al-Fitr"), day(3,26,"Ram Navami"),
        day(3,31,"Mahavir Jayanti"), day(4,3,"Good Friday"), day(4,14,"Ambedkar Jayanti"),
        day(5,1,"Maharashtra Day"), day(5,28,"Bakri Id"), day(6,26,"Muharram"),
        day(8,15,"Independence Day"), day(9,14,"Ganesh Chaturthi"), day(10,2,"Gandhi Jayanti"), day(10,20,"Dussehra"),
        day(11,10,"Diwali Balipratipada"), day(11,24,"Guru Nanak Jayanti"), day(12,25,"Christmas")
    );

    private EquityCalendar() {}

    static Session on(String exchange, LocalDate date) {
        if (date.getYear() != 2026) return new Session(date,"UNKNOWN","Exchange calendar unavailable for this year",null);
        String source = "BSE".equals(exchange) ? BSE : NSE;
        MonthDay day = MonthDay.from(date);
        if (day.equals(MonthDay.of(11,8))) return new Session(date,"SPECIAL","Muhurat trading session",source);
        if (day.equals(MonthDay.of(2,1))) {
            String notice = "NSE".equals(exchange) ? "https://nsearchives.nseindia.com/content/circulars/CMTR72349.pdf"
                : "https://www.bseindia.com/markets/MarketInfo/DispNewNoticesCirculars.aspx?page=20260116-33";
            return new Session(date,"SPECIAL","Union Budget trading session",notice);
        }
        if (day.equals(MonthDay.of(1,15))) {
            String notice = "NSE".equals(exchange) ? "https://nsearchives.nseindia.com/content/circulars/CMTR72260.pdf"
                : "https://www.bseindia.com/markets/MarketInfo/DispNewNoticesCirculars.aspx?page=20260112-8";
            return new Session(date,"HOLIDAY","Maharashtra municipal election",notice);
        }
        String holiday = HOLIDAYS.get(day);
        if (holiday != null) return new Session(date,"HOLIDAY",holiday,source);
        if (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY)
            return new Session(date,"WEEKEND","Regular weekend closure",source);
        return new Session(date,"SCHEDULED","Scheduled trading day",source);
    }

    static List<Session> nearby(String exchange, LocalDate today) {
        return today.minusDays(14).datesUntil(today.plusDays(15)).map(date -> on(exchange,date))
                .filter(day -> day.kind().equals("HOLIDAY") || day.kind().equals("SPECIAL")).toList();
    }

    private static Map.Entry<MonthDay,String> day(int month, int day, String name) {
        return Map.entry(MonthDay.of(month,day),name);
    }
}
