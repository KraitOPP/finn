package dev.finn.market;

import static org.junit.jupiter.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class DailyMovementTest {
    @Test void distinguishesAdjustedPriceFromSplitAndUsesPriorSessionsForVolume() {
        LocalDate latest=LocalDate.of(2026,10,16);
        var baseline=new ArrayList<DailyMovement.Bar>();
        LocalDate date=latest.minusDays(1);
        for(int i=0;i<12;date=date.minusDays(1)){
            if(!EquityCalendar.on("NSE",date).kind().equals("SCHEDULED"))continue;
            baseline.add(new DailyMovement.Bar(date,BigDecimal.valueOf(100),BigDecimal.valueOf(50+(i%2)),BigDecimal.valueOf(1000),null));
            i++;
        }
        var rows=new ArrayList<>(baseline);
        rows.addFirst(new DailyMovement.Bar(latest,BigDecimal.valueOf(50),BigDecimal.valueOf(50),BigDecimal.valueOf(3500),null));
        var split=DailyMovement.assess(rows,"NSE");
        assertEquals("0",split.changePercent());
        assertFalse(split.unusualPrice());
        assertTrue(split.unusualVolume());
        assertEquals("3.5",split.volumeMultiple());
        rows.set(0,new DailyMovement.Bar(latest,BigDecimal.valueOf(56),BigDecimal.valueOf(56),BigDecimal.valueOf(1000),null));
        var move=DailyMovement.assess(rows,"NSE");
        assertEquals("12",move.changePercent());
        assertTrue(move.unusualPrice());
        assertFalse(move.unusualVolume());
    }

    @Test void doesNotTreatAWindowWithMissingSessionsAsADailyMove() {
        var older=new DailyMovement.Bar(LocalDate.of(2026,11,11),BigDecimal.TEN,BigDecimal.TEN,BigDecimal.ONE,null);
        var latest=new DailyMovement.Bar(LocalDate.of(2026,11,13),BigDecimal.ONE,BigDecimal.ONE,BigDecimal.TEN,null);
        var signal=DailyMovement.assess(List.of(latest,older),"NSE");
        assertNull(signal.changePercent());
        assertNull(signal.volumeMultiple());
        assertFalse(signal.unusualPrice());
    }
}
