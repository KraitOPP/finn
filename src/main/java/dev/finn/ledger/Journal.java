package dev.finn.ledger;

import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;
import dev.finn.portfolio.Portfolios;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import static dev.finn.ledger.LedgerRules.text;

@Service
public class Journal {
    public record Receipt(UUID commandId,long revision,List<UUID> eventIds,boolean replayed){}
    public record Opening(UUID securityId,BigDecimal quantity,BigDecimal reportedCost,int sourceRow){}
    public record EventView(UUID eventId,long sequence,LocalDate effectiveDate,String kind,UUID securityId,String securityName,
                            UUID listingId,String exchange,String quantity,String price,String amount,String fees,
                            UUID reversalOf,UUID reversedBy,UUID replacesEventId,String reference,String source,
                            UUID sourceReference,String recordedAt){}
    public record Page(List<EventView> items,Long nextBefore){}
    public record PositionView(UUID securityId,String securityName,String quantity,String recordedCost,String averageCost,String costBasis){}
    public record View(long revision,String calculationVersion,String currency,List<PositionView> positions,
                       String cashBalance,String recordedCashComponents,boolean cashMovementsComplete,String realisedPnl,
                       String knownRealisedPnl,String recordedFees,boolean recordedFeesComplete,String standaloneFees,
                       String netContributions,LocalDate cashBaselineDate,LocalDate coverageStart,String historyStatus,List<String> warnings){}
    private record Stored(LedgerEvent event,UUID sourceReference,UUID replacesEventId,UUID reversedBy,String securityName,String exchange,String recordedAt){}
    private record NewEvent(LedgerEvent event,UUID sourceReference,UUID replacesEventId){}
    private record Existing(UUID commandId,String inputHash,long revision){}
    private final JdbcTemplate jdbc;private final CurrentUser users;private final Portfolios portfolios;private final Catalogue catalogue;private final AuditTrail audit;
    public Journal(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Catalogue catalogue,AuditTrail audit){this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.catalogue=catalogue;this.audit=audit;}
    private static final String EVENTS="""
            SELECT e.*,s.name security_name,l.exchange,r.event_id reversed_by FROM finn.ledger_event e
            LEFT JOIN finn.security s ON s.owner_id=e.owner_id AND s.security_id=e.security_id
            LEFT JOIN finn.listing l ON l.owner_id=e.owner_id AND l.listing_id=e.listing_id
            LEFT JOIN finn.ledger_event r ON r.owner_id=e.owner_id AND r.account_id=e.account_id AND r.reversal_of=e.event_id
            WHERE e.owner_id=? AND e.account_id=?
            """;
    private Stored row(ResultSet row,int index)throws SQLException{
        var event=new LedgerEvent(row.getObject("event_id",UUID.class),row.getLong("sequence"),row.getObject("effective_date",LocalDate.class),LedgerEvent.Kind.valueOf(row.getString("event_type")),
                row.getObject("security_id",UUID.class),row.getObject("listing_id",UUID.class),row.getBigDecimal("quantity"),row.getBigDecimal("price"),row.getBigDecimal("amount"),row.getBigDecimal("fees"),
                row.getObject("reversal_of",UUID.class),row.getString("reference"),LedgerEvent.Source.valueOf(row.getString("source")));
        return new Stored(event,row.getObject("source_reference",UUID.class),row.getObject("replaces_event_id",UUID.class),row.getObject("reversed_by",UUID.class),row.getString("security_name"),row.getString("exchange"),row.getObject("recorded_at",OffsetDateTime.class).toInstant().toString());
    }
    private EventView view(Stored row){var e=row.event();return new EventView(e.eventId(),e.sequence(),e.effectiveDate(),e.kind().name(),e.securityId(),row.securityName(),e.listingId(),row.exchange(),text(e.quantity()),text(e.price()),text(e.amount()),text(e.fees()),e.reversalOf(),row.reversedBy(),row.replacesEventId(),e.reference(),e.source().name(),row.sourceReference(),row.recordedAt());}
    private List<Stored> load(UUID owner,UUID account){return jdbc.query(EVENTS+" ORDER BY e.sequence LIMIT ?",this::row,owner,account,LedgerEngine.MAX_EVENTS+1);}
    @Transactional public View view(UUID portfolio,UUID account){UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);return project(owner,account);}
    public View project(UUID owner,UUID account){
        var rows=load(owner,account);var projection=LedgerEngine.replay(rows.stream().map(Stored::event).toList());
        Map<UUID,String> names=new HashMap<>();for(var row:rows)if(row.event().securityId()!=null)names.put(row.event().securityId(),row.securityName());
        var positions=projection.positions().stream().map(p->new PositionView(p.securityId(),names.get(p.securityId()),text(p.quantity()),text(p.recordedCost()),text(p.averageCost()),p.costBasis())).toList();
        return new View(rows.isEmpty()?0:rows.getLast().event().sequence(),LedgerEngine.CALCULATION_VERSION,"INR",positions,text(projection.cashBalance()),text(projection.recordedCashComponents()),projection.cashMovementsComplete(),text(projection.realisedPnl()),text(projection.knownRealisedPnl()),text(projection.recordedFees()),projection.recordedFeesComplete(),text(projection.standaloneFees()),text(projection.netContributions()),projection.cashBaselineDate(),projection.coverageStart(),projection.historyStatus(),projection.warnings());
    }
    @Transactional public Page page(UUID portfolio,UUID account,int limit,Long before){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        if(limit<1||limit>100||(before!=null&&(before<1||before>LedgerEngine.MAX_EVENTS+1)))throw ApiFailure.invalid();
        var rows=jdbc.query(EVENTS+" AND e.sequence<? ORDER BY e.sequence DESC LIMIT ?",this::row,owner,account,before==null?LedgerEngine.MAX_EVENTS+1:before,limit+1);
        var items=rows.stream().limit(limit).map(this::view).toList();
        return new Page(items,rows.size()>limit?items.getLast().sequence():null);
    }
    @Transactional public Receipt record(UUID portfolio,UUID account,LedgerCommands.Record input){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        var event=manual(input.event(),1);String hash=hash("RECORD",null,event,null);
        Receipt retry=existing(owner,account,input.idempotencyKey(),hash);if(retry!=null)return retry;
        portfolios.requireAccount(owner,portfolio,account,true);
        retry=existing(owner,account,input.idempotencyKey(),hash);if(retry!=null)return retry;
        long base=revision(owner,account);
        return append(owner,portfolio,account,input.idempotencyKey(),hash,base,List.of(new NewEvent(withSequence(event,base+1),null,null)));
    }
    @Transactional public Receipt reverse(UUID portfolio,UUID account,UUID original,LedgerCommands.Reverse input){
        return correction(portfolio,account,original,input.idempotencyKey(),null,input.reference());
    }
    @Transactional public Receipt correct(UUID portfolio,UUID account,UUID original,LedgerCommands.Correct input){
        return correction(portfolio,account,original,input.idempotencyKey(),manual(input.replacement(),1),input.reference());
    }
    @Transactional public Receipt recordReviewedOpening(UUID owner,UUID portfolio,UUID account,UUID importId,LocalDate asOf,
                                                        long expectedRevision,String costMode,List<Opening> holdings){
        portfolios.requireAccount(owner,portfolio,account,true);
        String hash=hash("GROWW_OPENING",importId,null,costMode);
        Receipt prior=existing(owner,account,importId,hash);if(prior!=null)return prior;
        long base=revision(owner,account);
        if(base!=expectedRevision)throw new ApiFailure(409,"IMPORT_LEDGER_CHANGED");
        if(holdings.isEmpty()||holdings.size()>LedgerEngine.MAX_POSITIONS)throw ApiFailure.invalid();
        if(hasEquityRecords(owner,account))throw new ApiFailure(409,"IMPORT_RECONCILIATION_REQUIRED");
        var additions=new ArrayList<NewEvent>();
        for(Opening row:holdings){
            var event=new LedgerEvent(UUID.randomUUID(),base+additions.size()+1,asOf,LedgerEvent.Kind.OPENING_POSITION,row.securityId(),null,row.quantity(),null,row.reportedCost(),null,null,
                    "Workbook row "+row.sourceRow(),LedgerEvent.Source.GROWW_HOLDINGS);
            additions.add(new NewEvent(event,importId,null));
        }
        return append(owner,portfolio,account,importId,hash,base,additions);
    }
    public boolean hasEquityRecords(UUID owner,UUID account){
        return Boolean.TRUE.equals(jdbc.queryForObject("SELECT EXISTS(SELECT 1 FROM finn.ledger_event WHERE owner_id=? AND account_id=? AND security_id IS NOT NULL)",Boolean.class,owner,account));
    }
    public long currentRevision(UUID owner,UUID account){return revision(owner,account);}
    private Receipt correction(UUID portfolio,UUID account,UUID original,UUID key,LedgerEvent replacement,String note){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        note=reference(note);String hash=hash(replacement==null?"REVERSE":"CORRECT",original,replacement,note);
        Receipt retry=existing(owner,account,key,hash);if(retry!=null)return retry;
        portfolios.requireAccount(owner,portfolio,account,true);
        retry=existing(owner,account,key,hash);if(retry!=null)return retry;
        var prior=jdbc.query(EVENTS+" AND e.event_id=?",this::row,owner,account,original).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(prior.reversedBy()!=null||prior.event().kind()==LedgerEvent.Kind.REVERSAL)throw new LedgerViolation(LedgerViolation.Code.INVALID_REVERSAL);
        long base=revision(owner,account);
        var reversal=new LedgerEvent(UUID.randomUUID(),base+1,prior.event().effectiveDate(),LedgerEvent.Kind.REVERSAL,null,null,null,null,null,null,original,note,LedgerEvent.Source.MANUAL);
        var events=new ArrayList<NewEvent>();events.add(new NewEvent(reversal,null,null));
        if(replacement!=null)events.add(new NewEvent(withSequence(replacement,base+2),null,original));
        return append(owner,portfolio,account,key,hash,base,events);
    }
    private Receipt append(UUID owner,UUID portfolio,UUID account,UUID key,String hash,long base,List<NewEvent> additions){
        if(base+additions.size()>LedgerEngine.MAX_EVENTS)throw new LedgerViolation(LedgerViolation.Code.LEDGER_CAPACITY_REACHED);
        var previous=load(owner,account);var events=new ArrayList<>(previous.stream().map(Stored::event).toList());
        for(var addition:additions){var event=addition.event();if(event.source()!=LedgerEvent.Source.GROWW_HOLDINGS)checkIdentity(owner,event);events.add(event);}
        var result=LedgerEngine.replay(events);
        UUID command=UUID.randomUUID();long revision=base+additions.size();
        jdbc.update("INSERT INTO finn.ledger_command(command_id,owner_id,portfolio_id,account_id,idempotency_key,input_hash,revision) VALUES (?,?,?,?,?,?,?)",command,owner,portfolio,account,key,hash,revision);
        jdbc.batchUpdate("""
                INSERT INTO finn.ledger_event(event_id,owner_id,portfolio_id,account_id,command_id,sequence,effective_date,event_type,security_id,listing_id,quantity,price,amount,fees,reversal_of,replaces_event_id,reference,source,source_reference)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,additions.stream().map(addition->{var e=addition.event();return new Object[]{e.eventId(),owner,portfolio,account,command,e.sequence(),e.effectiveDate(),e.kind().name(),e.securityId(),e.listingId(),e.quantity(),e.price(),e.amount(),e.fees(),e.reversalOf(),addition.replacesEventId(),e.reference(),e.source().name(),addition.sourceReference()};}).toList());
        if(jdbc.update("UPDATE finn.investment_account SET lock_version=?,history_status=?,history_start_date=? WHERE owner_id=? AND account_id=? AND lock_version=?",revision,result.historyStatus(),result.coverageStart(),owner,account,base)!=1)throw ApiFailure.conflict();
        audit.record(AuditTrail.Action.LEDGER_RECORDED,owner,command);
        return new Receipt(command,revision,additions.stream().map(item->item.event().eventId()).toList(),false);
    }
    private void checkIdentity(UUID owner,LedgerEvent e){
        if(e.securityId()!=null)catalogue.security(owner,e.securityId());
        if(e.listingId()!=null&&!catalogue.listing(owner,e.listingId()).securityId().equals(e.securityId()))throw ApiFailure.invalid();
    }
    private long revision(UUID owner,UUID account){return jdbc.queryForObject("SELECT lock_version FROM finn.investment_account WHERE owner_id=? AND account_id=?",Long.class,owner,account);}
    private Receipt existing(UUID owner,UUID account,UUID key,String hash){
        if(key==null)throw ApiFailure.invalid();
        var old=jdbc.query("SELECT command_id,input_hash,revision FROM finn.ledger_command WHERE owner_id=? AND account_id=? AND idempotency_key=?",(row,index)->new Existing(row.getObject("command_id",UUID.class),row.getString("input_hash"),row.getLong("revision")),owner,account,key).stream().findFirst().orElse(null);
        if(old==null)return null;if(!old.inputHash().equals(hash))throw new ApiFailure(409,"IDEMPOTENCY_CONFLICT");
        var ids=jdbc.query("SELECT event_id FROM finn.ledger_event WHERE owner_id=? AND account_id=? AND command_id=? ORDER BY sequence",(row,index)->row.getObject("event_id",UUID.class),owner,account,old.commandId());
        return new Receipt(old.commandId(),old.revision(),ids,true);
    }
    private static String reference(String value){
        if(value==null)return null;
        if(value.length()>120||value.codePoints().anyMatch(Character::isISOControl))throw new LedgerViolation(LedgerViolation.Code.INVALID_EVENT);
        return value.isBlank()?null:value.strip();
    }
    private static LedgerEvent manual(LedgerCommands.Input input,long sequence){
        if(input==null||input.kind()==null||!input.kind().isTextual())throw new LedgerViolation(LedgerViolation.Code.INVALID_EVENT);
        LedgerEvent.Kind kind;
        try{kind=LedgerEvent.Kind.valueOf(input.kind().asText());}catch(IllegalArgumentException invalid){throw new LedgerViolation(LedgerViolation.Code.INVALID_EVENT);}
        if(kind==LedgerEvent.Kind.REVERSAL)throw new LedgerViolation(LedgerViolation.Code.INVALID_EVENT);
        var result=new LedgerEvent(UUID.randomUUID(),sequence,input.effectiveDate(),kind,input.securityId(),input.listingId(),decimal(input.quantity()),decimal(input.price()),decimal(input.amount()),decimal(input.fees()),null,reference(input.reference()),LedgerEvent.Source.MANUAL);
        LedgerRules.validate(result);return result;
    }
    private static BigDecimal decimal(JsonNode node){
        if(node==null||node.isNull())return null;
        if(!node.isTextual())throw new LedgerViolation(LedgerViolation.Code.INVALID_EVENT);
        return LedgerRules.decimal(node.asText());
    }
    private static LedgerEvent withSequence(LedgerEvent event,long sequence){return new LedgerEvent(event.eventId(),sequence,event.effectiveDate(),event.kind(),event.securityId(),event.listingId(),event.quantity(),event.price(),event.amount(),event.fees(),event.reversalOf(),event.reference(),event.source());}
    private static String hash(String action,UUID target,LedgerEvent event,String note){
        try{
            var digest=MessageDigest.getInstance("SHA-256");
            Object[] fields=event==null?new Object[]{action,target,note}:new Object[]{action,target,note,event.kind(),event.effectiveDate(),event.securityId(),event.listingId(),text(event.quantity()),text(event.price()),text(event.amount()),text(event.fees()),event.reference()};
            for(Object field:fields){String value=field==null?null:field.toString();String token=value==null?"-;":value.length()+":"+value+";";digest.update(token.getBytes(StandardCharsets.UTF_8));}
            return HexFormat.of().formatHex(digest.digest());
        }catch(NoSuchAlgorithmException impossible){throw new IllegalStateException("Required hash is unavailable.");}
    }
}
