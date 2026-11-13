package dev.finn.market;

import com.fasterxml.jackson.annotation.JsonIgnore;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class DailyMovement {
    public record Signal(LocalDate session, LocalDate previousSession, String changePercent, String volumeMultiple,
                         String medianTurnover, boolean unusualPrice, boolean unusualVolume, int baselineSessions,
                         @JsonIgnore Instant receivedAt) {}
    record Bar(LocalDate date, BigDecimal close, BigDecimal adjusted, BigDecimal volume, Instant receivedAt) {}

    private final JdbcTemplate jdbc;

    DailyMovement(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public Signal observed(UUID owner, UUID listing, String exchange, LocalDate today, Instant through) {
        if (listing == null) return null;
        var bars = jdbc.query("""
                SELECT DISTINCT ON (session_date) session_date,close,received_at,
                    (provider_bar->>'adjustedClose')::numeric AS adjusted,
                    (provider_bar->>'volume')::numeric AS volume
                FROM finn.market_observation
                WHERE owner_id=? AND listing_id=? AND source='YAHOO_YFINANCE'
                    AND session_date>=? AND session_date<? AND received_at<=?
                ORDER BY session_date DESC,receipt_order DESC LIMIT 22
                """,(row,i)->new Bar(row.getObject("session_date",LocalDate.class),row.getBigDecimal("close"),
                    row.getBigDecimal("adjusted"),row.getBigDecimal("volume"),row.getObject("received_at",OffsetDateTime.class).toInstant()),
                owner,listing,today.minusDays(42),today,through.atOffset(ZoneOffset.UTC));
        return assess(bars,exchange);
    }

    static Signal assess(List<Bar> latestFirst,String exchange) {
        var bars = latestFirst.stream().filter(bar -> !"HOLIDAY".equals(EquityCalendar.on(exchange,bar.date()).kind())).toList();
        if (bars.size()<2) return null;
        var latest=bars.getFirst();
        var previous=bars.get(1);
        var change=consecutive(previous.date(),latest.date(),exchange) ? change(previous,latest) : null;
        var baseline=bars.subList(1,bars.size());
        var volumes=baseline.stream().map(Bar::volume).filter(Objects::nonNull).filter(v->v.signum()>0).toList();
        var turnover=baseline.stream().filter(bar->bar.volume()!=null&&bar.volume().signum()>0)
                .map(bar->bar.close().multiply(bar.volume())).toList();
        BigDecimal multiple=volumes.size()<7||latest.volume()==null ? null : ratio(latest.volume(),median(volumes));
        var swings=new ArrayList<BigDecimal>();
        for(int i=0;i<baseline.size()-1;i++){
            var newer=baseline.get(i);var older=baseline.get(i+1);
            if (!consecutive(older.date(),newer.date(),exchange)) continue;
            var swing=change(older,newer);
            if(swing!=null)swings.add(swing.abs());
        }
        boolean price=change!=null&&swings.size()>=7&&change.abs().compareTo(new BigDecimal("3"))>=0
                &&change.abs().compareTo(median(swings).multiply(BigDecimal.TWO))>=0;
        boolean volume=multiple!=null&&multiple.compareTo(new BigDecimal("2.5"))>=0;
        return new Signal(latest.date(),previous.date(),decimal(change),decimal(multiple),
                turnover.size()<7?null:decimal(median(turnover)),price,volume,baseline.size(),latest.receivedAt());
    }

    public static BigDecimal median(List<BigDecimal> values) {
        var sorted=values.stream().sorted().toList();
        int middle=sorted.size()/2;
        return sorted.size()%2==1?sorted.get(middle):sorted.get(middle-1).add(sorted.get(middle)).divide(BigDecimal.TWO);
    }

    public static boolean recent(Signal signal,String exchange,LocalDate today) {
        return signal!=null&&signal.session().isBefore(today)
                &&consecutive(signal.session(),today,exchange);
    }

    private static boolean consecutive(LocalDate older,LocalDate newer,String exchange) {
        if (!newer.isAfter(older)||newer.isAfter(older.plusDays(7))) return false;
        return older.plusDays(1).datesUntil(newer).noneMatch(date -> {
            var kind=EquityCalendar.on(exchange,date).kind();
            return kind.equals("SCHEDULED")||kind.equals("SPECIAL")||kind.equals("UNKNOWN")&&date.getDayOfWeek().getValue()<=5;
        });
    }

    private static BigDecimal change(Bar earlier,Bar later) {
        if(earlier.adjusted()==null||later.adjusted()==null||earlier.adjusted().signum()<=0)return null;
        return ratio(later.adjusted().subtract(earlier.adjusted()).movePointRight(2),earlier.adjusted());
    }

    private static BigDecimal ratio(BigDecimal a,BigDecimal b) {return a.divide(b,6,RoundingMode.HALF_EVEN);}
    private static String decimal(BigDecimal amount){return amount==null?null:amount.stripTrailingZeros().toPlainString();}
}
