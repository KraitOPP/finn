package dev.finn.ledger;

import java.util.UUID;
import dev.finn.identity.CurrentUser;
import dev.finn.platform.AuditTrail;
import dev.finn.portfolio.Portfolios;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class LedgerExports {
    private final CurrentUser users;private final Portfolios portfolios;private final Journal journal;private final AuditTrail audit;
    public LedgerExports(CurrentUser users,Portfolios portfolios,Journal journal,AuditTrail audit){this.users=users;this.portfolios=portfolios;this.journal=journal;this.audit=audit;}
    @Transactional public byte[] export(UUID portfolio,UUID account,long revision){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        byte[] file=LedgerCsv.encode(journal.exportRows(owner,account,revision),revision);
        audit.record(AuditTrail.Action.EXPORT_CREATED,owner,account);
        return file;
    }
}
