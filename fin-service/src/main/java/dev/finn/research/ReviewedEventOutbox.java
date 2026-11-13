package dev.finn.research;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class ReviewedEventOutbox {
    record Event(UUID id,UUID owner,UUID company,UUID filing,UUID fact,Integer factRevision,Instant occurredAt) {
        String partitionKey(){return owner+":"+company;}
    }
    record Message(int version,UUID id) {}

    private final JdbcTemplate jdbc;
    private final boolean enabled;

    ReviewedEventOutbox(JdbcTemplate jdbc,@Value("${finn.filings.kafka.enabled:false}") boolean enabled){
        this.jdbc=jdbc;
        this.enabled=enabled;
    }

    boolean enqueueFiling(UUID owner,CompanyEvents.Version event){
        if(!enabled)return false;
        jdbc.update("""
                INSERT INTO finn.reviewed_event_outbox(owner_id,company_id,filing_version_id,occurred_at)
                VALUES (?,?,?,?) ON CONFLICT DO NOTHING
                """,owner,event.companyId(),event.versionId(),OffsetDateTime.parse(event.reviewedAt()));
        return true;
    }

    boolean enqueueFact(UUID owner,FinancialFacts.Fact fact){
        if(!enabled)return false;
        jdbc.update("""
                INSERT INTO finn.reviewed_event_outbox(owner_id,company_id,fact_id,fact_revision,occurred_at)
                VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING
                """,owner,fact.companyId(),fact.factId(),fact.revision(),OffsetDateTime.parse(fact.reviewedAt()));
        return true;
    }

    List<Event> pending(int limit){
        return jdbc.query("""
                SELECT * FROM finn.reviewed_event_outbox WHERE published_at IS NULL ORDER BY sequence LIMIT ?
                """,ReviewedEventOutbox::event,limit);
    }

    void markPublished(List<Event> events){
        jdbc.batchUpdate("UPDATE finn.reviewed_event_outbox SET published_at=clock_timestamp() WHERE message_id=? AND published_at IS NULL",
                events.stream().map(event->new Object[]{event.id()}).toList());
    }

    Event find(UUID id){
        return jdbc.query("SELECT * FROM finn.reviewed_event_outbox WHERE message_id=?",
                ReviewedEventOutbox::event,id).stream().findFirst().orElse(null);
    }

    boolean claim(String consumer,UUID message){
        return jdbc.update("INSERT INTO finn.reviewed_event_receipt(consumer,message_id) VALUES (?,?) ON CONFLICT DO NOTHING",
                consumer,message)==1;
    }

    OffsetDateTime processedAt(String consumer,UUID message){
        return jdbc.queryForObject("SELECT processed_at FROM finn.reviewed_event_receipt WHERE consumer=? AND message_id=?",
                OffsetDateTime.class,consumer,message);
    }

    long pendingPublications(){
        return jdbc.queryForObject("SELECT count(*) FROM finn.reviewed_event_outbox WHERE published_at IS NULL",Long.class);
    }

    long pendingConsumer(String consumer){
        return jdbc.queryForObject("""
                SELECT count(*) FROM finn.reviewed_event_outbox e WHERE e.published_at IS NOT NULL
                  AND (?='alerts' OR (?='radar' AND e.filing_version_id IS NOT NULL) OR (?='thesis' AND e.fact_id IS NOT NULL))
                  AND NOT EXISTS (SELECT 1 FROM finn.reviewed_event_receipt r WHERE r.consumer=? AND r.message_id=e.message_id)
                """,Long.class,consumer,consumer,consumer,consumer);
    }

    private static Event event(ResultSet row,int index)throws SQLException{
        return new Event(row.getObject("message_id",UUID.class),row.getObject("owner_id",UUID.class),
                row.getObject("company_id",UUID.class),row.getObject("filing_version_id",UUID.class),
                row.getObject("fact_id",UUID.class),row.getObject("fact_revision",Integer.class),
                row.getObject("occurred_at",OffsetDateTime.class).toInstant());
    }
}
