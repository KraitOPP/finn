package dev.finn.platform;

import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditTrail {
    public enum Action { PREFERENCES_CHANGED, PORTFOLIO_CREATED, PORTFOLIO_ARCHIVED, PORTFOLIO_RESTORED, ACCOUNT_CREATED,
        LEDGER_RECORDED, IMPORT_PREVIEWED, IMPORT_COMMITTED, IMPORT_RECONCILED, CORPORATE_ACTION_APPLIED, EXPORT_CREATED, PRICE_REQUESTED }
    private final JdbcTemplate jdbc;
    public AuditTrail(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void record(Action action, UUID owner, UUID resource) {
        jdbc.update("INSERT INTO finn.audit_event(event_id,owner_id,action,resource_id) VALUES (?,?,?,?)",
                UUID.randomUUID(), owner, action.name(), resource);
    }
}
