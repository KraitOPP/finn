
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.monitoring.PortfolioBriefs;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EventReplay {
    record ReplayItem(AttentionInbox.Item attention,SourceDocuments.Detail evidence) {}
    record Notice(String title,String status) {}
    record View(String mode,UUID runId,String savedAt,List<ReplayItem> events,List<Notice> notifications,PortfolioBriefs.Brief brief) {}
    private record Run(UUID id,UUID syntheticOwner,String savedAt) {}

    private static final int SCENARIO=1;
    private static final String FICTIONAL_ISSUER="urn:finn:synthetic-event-replay";
    private static final String COMPANY="Fictional Cedar Tools";
    private static final String AUDITOR="Fictional Cedar Tools reports an auditor resignation";
    private static final String MEETING="Fictional Cedar Tools quarterly results meeting notice";
    private final CurrentUser users;
    private final JdbcTemplate jdbc;
    private final SourceDocuments sources;
    private final CompanyEvents events;
    private final FilingRules rules;
    private final AttentionInbox inbox;
    private final PortfolioBriefs briefs;

    EventReplay(CurrentUser users,JdbcTemplate jdbc,SourceDocuments sources,CompanyEvents events,
                FilingRules rules,AttentionInbox inbox,PortfolioBriefs briefs) {
        this.users=users;
        this.jdbc=jdbc;
        this.sources=sources;
        this.events=events;
        this.rules=rules;
        this.inbox=inbox;
        this.briefs=briefs;
    }

    @Transactional public View read() {
        return view(load(users.requireId()));
    }

    @Transactional public View start() {
        UUID owner=users.requireId();
        Run existing=load(owner);
        if(existing!=null)return view(existing);
        UUID replay=UUID.randomUUID();
        UUID synthetic=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.app_user(user_id,issuer,subject,display_name) VALUES (?,?,?,'Fictional replay account')",
                synthetic,FICTIONAL_ISSUER,replay.toString());
        UUID company=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.company(company_id,owner_id,name,source) VALUES (?,?,?,'MANUAL_USER')",company,synthetic,COMPANY);
        seedHolding(synthetic,company);
        rules.createFor(synthetic,new FilingRules.Settings(company,"Fictional filing rule","ANY","ANY",true,false,false));
        var first=sources.createFor(synthetic,"PRIMARY",new SourceDocuments.Input(company,AUDITOR,"Fictional company secretary",
                null,"Fictional source. The auditor resigned on 6 January 2025. The company acknowledges the notice.",
                "2025-01-06T09:00:00Z"));
        var copy=sources.createFor(synthetic,"PRIMARY",new SourceDocuments.Input(company,AUDITOR,"Fictional exchange notice",
                null,"Fictional second record of the same auditor resignation.", "2025-01-06T09:15:00Z"));
        var meeting=sources.createFor(synthetic,"PRIMARY",new SourceDocuments.Input(company,MEETING,"Fictional company secretary",
                null,"Fictional notice. The board plans to meet on 10 January 2025 to review quarterly results.",
                "2025-01-06T10:00:00Z"));
        var main=events.classifyFor(synthetic,decision(first,null,"HIGH","NEW",List.of()));
        events.classifyFor(synthetic,decision(copy,main,"HIGH","FOLLOW_UP",List.of()));
        events.classifyFor(synthetic,decision(meeting,null,"LOW","ROUTINE",
                List.of(new CompanyEvents.AnnouncedDate("MEETING",LocalDate.of(2025,1,10),"TENTATIVE"))));
        jdbc.update("INSERT INTO finn.event_replay(owner_id,scenario,run_id,synthetic_owner_id) VALUES (?,?,?,?)",
                owner,SCENARIO,replay,synthetic);
        return view(load(owner));
    }

    private View view(Run run) {
        if(run==null)return new View("SYNTHETIC_REPLAY",null,null,List.of(),List.of(),null);
        var ranked=inbox.rank(run.syntheticOwner(),"ACTIVE",0,Instant.now());
        var entries=ranked.items().stream().map(item->new ReplayItem(item,sources.evidence(run.syntheticOwner(),
                item.event().documentId(),item.event().documentRevision()))).toList();
        var notices=jdbc.query("""
                SELECT a.title,d.status FROM finn.activity a JOIN finn.activity_delivery d USING(owner_id,activity_id)
                WHERE a.owner_id=? AND d.channel='IN_APP' AND a.kind='COMPANY_EVENT'
                ORDER BY a.created_at,a.activity_id LIMIT 20
                """,(row,i)->new Notice(row.getString(1),row.getString(2)),run.syntheticOwner());
        LocalDate through=Instant.parse(run.savedAt()).atZone(ZoneOffset.UTC).toLocalDate().plusDays(1);
        return new View("SYNTHETIC_REPLAY",run.id(),run.savedAt(),entries,notices,briefs.replayWindow(run.syntheticOwner(),through));
    }

    private static CompanyEvents.Input decision(SourceDocuments.Entry source,CompanyEvents.Version prior,String materiality,
                                                String novelty,List<CompanyEvents.AnnouncedDate> dates) {
        var hint=EventClassifier.suggest(source.title());
        return new CompanyEvents.Input(source.documentId(),source.revision(),prior==null?null:prior.eventId(),
                prior==null?null:prior.revision(),source.title(),"fictional-january-2025",hint.subtype(),"ANNOUNCED",
                materiality,novelty,dates);
    }

    private void seedHolding(UUID owner,UUID company) {
        UUID security=UUID.randomUUID(),portfolio=UUID.randomUUID(),account=UUID.randomUUID(),command=UUID.randomUUID();
        LocalDate date=LocalDate.of(2025,1,2);
        jdbc.update("""
                INSERT INTO finn.security(security_id,owner_id,company_id,name,review_status) VALUES (?,?,?,?,'USER_CONFIRMED')
                """,security,owner,company,COMPANY);
        jdbc.update("INSERT INTO finn.portfolio(portfolio_id,owner_id,name,currency) VALUES (?,?,'Fictional replay portfolio','INR')",
                portfolio,owner);
        jdbc.update("""
                INSERT INTO finn.investment_account(account_id,owner_id,portfolio_id,name,source,currency,history_status,history_start_date,lock_version)
                VALUES (?,?,?,'Fictional replay ledger','MANUAL','INR','PARTIAL_TRADES',?,1)
                """,account,owner,portfolio,date);
        jdbc.update("""
                INSERT INTO finn.ledger_command(command_id,owner_id,portfolio_id,account_id,idempotency_key,input_hash,revision)
                VALUES (?,?,?,?,?,?,1)
                """,command,owner,portfolio,account,UUID.randomUUID(),SourceDocuments.checksum("fictional-replay-holding"));
        jdbc.update("""
                INSERT INTO finn.ledger_event(event_id,owner_id,portfolio_id,account_id,command_id,sequence,effective_date,event_type,
                    security_id,quantity,price,fees,source)
                VALUES (?,?,?,?,?,1,?,'BUY',?,2,50,0,'MANUAL')
                """,UUID.randomUUID(),owner,portfolio,account,command,date,security);
    }

    private Run load(UUID owner) {
        return jdbc.query("SELECT * FROM finn.event_replay WHERE owner_id=? AND scenario=?",EventReplay::row,owner,SCENARIO)
                .stream().findFirst().orElse(null);
    }

    private static Run row(ResultSet row,int ignored)throws SQLException {
        return new Run(row.getObject("run_id",UUID.class),row.getObject("synthetic_owner_id",UUID.class),
                SourceDocuments.instant(row,"saved_at"));
    }
}
