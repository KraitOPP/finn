package dev.finn.research;

import java.time.OffsetDateTime;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class RadarFilings {
    private final JdbcTemplate jdbc;

    RadarFilings(JdbcTemplate jdbc){this.jdbc=jdbc;}

    void project(UUID owner,CompanyEvents.Version event,OffsetDateTime visibleAt){
        jdbc.update("""
                INSERT INTO finn.radar_filing AS current(owner_id,event_id,revision,visible_at)
                VALUES (?,?,?,COALESCE(?::timestamptz,clock_timestamp()))
                ON CONFLICT(owner_id,event_id) DO UPDATE SET revision=EXCLUDED.revision,visible_at=EXCLUDED.visible_at
                WHERE current.revision<EXCLUDED.revision
                """,owner,event.eventId(),event.revision(),visibleAt);
    }
}
