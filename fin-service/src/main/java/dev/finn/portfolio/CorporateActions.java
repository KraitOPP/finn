package dev.finn.portfolio;

import java.math.BigDecimal;
import java.net.URI;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.ledger.*;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Service
public class CorporateActions {
    public enum Type{SPLIT,BONUS,DIVIDEND,SYMBOL_CHANGE,MERGER,DEMERGER,RIGHTS}
    public record Input(@NotNull @Pattern(regexp="SPLIT|BONUS|DIVIDEND|SYMBOL_CHANGE|MERGER|DEMERGER|RIGHTS") String type,
                        @NotNull UUID securityId,UUID listingId,@NotNull LocalDate effectiveDate,
                        JsonNode ratioNumerator,JsonNode ratioDenominator,
                        JsonNode netCash,@NotNull @Pattern(regexp="[A-Za-z0-9][A-Za-z0-9._:-]{0,63}") String sourceReference,
                        @Size(max=512) String sourceUrl,@Size(max=64) String newSymbol,@Size(max=72) String newProviderSymbol,UUID correctsActionId){}
    public record Approve(@NotNull @Valid Input action,@NotNull @AssertTrue Boolean reviewed,@NotNull @Min(0) @Max(10000) Long expectedLedgerRevision){}
    public record Effect(String state,String reason,long ledgerRevision,String unitsBefore,String unitsAfter,String recordedCostBefore,
                         String recordedCostAfter,String cashDelta,String previousSymbol,String newSymbol){}
    public record View(UUID actionId,String securityName,Input action,Effect effect,String state,UUID ledgerEventId,long ledgerRevision,String recordedAt,boolean replayed){}
    public record Page(List<View> items){}
    private record Payload(Input input,Effect effect,long ledgerRevision){}
    private record Stored(View view,String hash){}
    private static final String ACTIONS="""
            SELECT a.*,s.name security_name,EXISTS(SELECT 1 FROM finn.ledger_event r WHERE r.owner_id=a.owner_id AND r.account_id=a.account_id AND r.reversal_of=a.ledger_event_id) reversed
            FROM finn.corporate_action a JOIN finn.security s ON s.owner_id=a.owner_id AND s.security_id=a.security_id
            WHERE a.owner_id=? AND a.portfolio_id=? AND a.account_id=?
            """;
    private final JdbcTemplate jdbc;private final CurrentUser users;private final Portfolios portfolios;private final Catalogue catalogue;
    private final Journal journal;private final AuditTrail audit;private final JsonMapper json;
    public CorporateActions(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Catalogue catalogue,Journal journal,AuditTrail audit,JsonMapper json){
        this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.catalogue=catalogue;this.journal=journal;this.audit=audit;this.json=json;
    }
    @Transactional public Page list(UUID portfolio,UUID account){UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);return new Page(jdbc.query(ACTIONS+" ORDER BY a.created_at DESC,a.action_id DESC LIMIT 100",this::stored,owner,portfolio,account).stream().map(Stored::view).toList());}
    @Transactional public Effect preview(UUID portfolio,UUID account,Input action){UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);return prepare(owner,portfolio,account,action);}
    @Transactional public View apply(UUID portfolio,UUID account,Approve approval){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        Input input=approval.action();String hash=hash(input);
        var prior=byReference(owner,portfolio,account,input.sourceReference());if(prior!=null)return replay(prior,hash);
        portfolios.requireAccount(owner,portfolio,account,true);
        prior=byReference(owner,portfolio,account,input.sourceReference());if(prior!=null)return replay(prior,hash);
        Effect effect=prepare(owner,portfolio,account,input);
        if(effect.ledgerRevision()!=approval.expectedLedgerRevision())throw new ApiFailure(409,"CORPORATE_LEDGER_CHANGED");
        if(jdbc.queryForObject("SELECT count(*) FROM finn.corporate_action WHERE owner_id=? AND account_id=?",Integer.class,owner,account)>=1000)throw new ApiFailure(409,"CORPORATE_ACTION_LIMIT_REACHED");
        UUID id=UUID.randomUUID(),event=null;long revision=effect.ledgerRevision();Type type=Type.valueOf(input.type());
        if(effect.state().equals("APPLICABLE")){
            if(type==Type.SYMBOL_CHANGE)catalogue.changeSymbol(input.listingId(),input.newSymbol(),input.newProviderSymbol(),input.effectiveDate(),true);
            else{
                UUID replacement=input.correctsActionId()==null?null:require(owner,portfolio,account,input.correctsActionId()).view().ledgerEventId();
                var receipt=journal.recordCorporate(owner,portfolio,account,id,LedgerEvent.Kind.valueOf(type.name()),input.securityId(),input.listingId(),input.effectiveDate(),ratio(input.ratioNumerator()),ratio(input.ratioDenominator()),cash(input.netCash()),input.sourceReference(),revision,replacement);
                revision=receipt.revision();event=receipt.eventIds().getFirst();
            }
        }
        jdbc.update("""
                INSERT INTO finn.corporate_action(action_id,owner_id,portfolio_id,account_id,security_id,listing_id,effective_date,action_type,source_reference,input_hash,ledger_event_id,corrects_action_id,outcome,payload)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?::jsonb)
                """,id,owner,portfolio,account,input.securityId(),input.listingId(),input.effectiveDate(),input.type(),input.sourceReference(),hash,event,input.correctsActionId(),effect.state().equals("APPLICABLE")?"APPLIED":"NEEDS_REVIEW",json.writeValueAsString(new Payload(input,effect,revision)));
        audit.record(effect.state().equals("APPLICABLE")?AuditTrail.Action.CORPORATE_ACTION_APPLIED:AuditTrail.Action.CORPORATE_ACTION_REVIEWED,owner,id);
        return require(owner,portfolio,account,id).view();
    }
    private Effect prepare(UUID owner,UUID portfolio,UUID account,Input input){
        Type type=Type.valueOf(input.type());catalogue.security(owner,input.securityId());
        LocalDate date=input.effectiveDate();if(date.isBefore(LocalDate.of(1900,1,1))||date.isAfter(LocalDate.now(ZoneId.of("Asia/Kolkata"))))throw ApiFailure.invalid();
        validateUrl(input.sourceUrl());
        Catalogue.Listing listing=input.listingId()==null?null:catalogue.listing(owner,input.listingId());
        if(listing!=null&&!listing.securityId().equals(input.securityId()))throw ApiFailure.invalid();
        if(input.correctsActionId()!=null){
            View old=require(owner,portfolio,account,input.correctsActionId()).view();
            boolean symbol=type==Type.SYMBOL_CHANGE&&Objects.equals(old.action().listingId(),input.listingId())&&date.isAfter(old.action().effectiveDate());
            if(!old.action().type().equals(type.name())||!old.action().securityId().equals(input.securityId())||!(symbol||old.state().equals("REVERSED")||old.state().equals("NEEDS_REVIEW")))throw new ApiFailure(409,"CORPORATE_CORRECTION_REQUIRES_REVIEW");
        }
        long revision=journal.currentRevision(owner,account);
        boolean unit=type==Type.SPLIT||type==Type.BONUS;
        BigDecimal cash=cash(input.netCash());
        Integer numerator=ratio(input.ratioNumerator()),denominator=ratio(input.ratioDenominator());
        if(unit!=(numerator!=null&&denominator!=null)||(numerator==null)!=(denominator==null))throw ApiFailure.invalid();
        if((type==Type.DIVIDEND)!=(cash!=null)||cash!=null&&cash.signum()<=0)throw ApiFailure.invalid();
        if(type==Type.SYMBOL_CHANGE){
            if(listing==null||input.newSymbol()==null||!input.newSymbol().matches("[A-Z0-9][A-Z0-9&._-]{0,63}"))throw ApiFailure.invalid();
            if(input.newProviderSymbol()!=null&&(!input.newProviderSymbol().matches("[A-Z0-9][A-Z0-9&._-]{0,63}\\.(NS|BO)")||!input.newProviderSymbol().endsWith(listing.exchange().equals("NSE")?".NS":".BO")))throw ApiFailure.invalid();
            if(!date.isAfter(listing.validFrom()))throw ApiFailure.conflict();
            return new Effect("APPLICABLE",null,revision,null,null,null,null,"0",listing.symbol(),input.newSymbol());
        }
        if(input.newSymbol()!=null||input.newProviderSymbol()!=null)throw ApiFailure.invalid();
        if(!unit&&type!=Type.DIVIDEND)return new Effect("NEEDS_REVIEW","UNSUPPORTED_COMPLEX_ACTION",revision,null,null,null,null,null,null,null);
        LedgerEvent.Kind kind=LedgerEvent.Kind.valueOf(type.name());
        if(journal.hasActiveCorporate(owner,account,input.securityId(),date,kind))throw new ApiFailure(409,"CORPORATE_ACTION_ALREADY_APPLIED");
        var before=journal.projectAt(owner,account,date.minusDays(1),revision);
        var position=before.positions().stream().filter(p->p.securityId().equals(input.securityId())).findFirst().orElse(null);
        String units=position==null?"0":position.quantity(),cost=position==null?null:position.recordedCost();
        if(!unit)return new Effect("APPLICABLE",null,revision,units,units,cost,cost,LedgerRules.text(cash),null,null);
        try{
            var after=LedgerEngine.corporateUnits(new BigDecimal(units),numerator,denominator,type==Type.BONUS);
            return new Effect("APPLICABLE",null,revision,units,LedgerRules.text(after),cost,cost,"0",null,null);
        }catch(LedgerViolation unsupported){return new Effect("NEEDS_REVIEW",unsupported.code().name(),revision,units,null,cost,null,null,null,null);}
    }
    private Stored byReference(UUID owner,UUID portfolio,UUID account,String reference){return jdbc.query(ACTIONS+" AND a.source_reference=?",this::stored,owner,portfolio,account,reference).stream().findFirst().orElse(null);}
    private Stored require(UUID owner,UUID portfolio,UUID account,UUID id){return jdbc.query(ACTIONS+" AND a.action_id=?",this::stored,owner,portfolio,account,id).stream().findFirst().orElseThrow(ApiFailure::notFound);}
    private Stored stored(ResultSet row,int index)throws SQLException{
        Payload payload=json.readValue(row.getString("payload"),Payload.class);
        return new Stored(new View(row.getObject("action_id",UUID.class),row.getString("security_name"),payload.input(),payload.effect(),row.getBoolean("reversed")?"REVERSED":row.getString("outcome"),row.getObject("ledger_event_id",UUID.class),payload.ledgerRevision(),row.getObject("created_at",OffsetDateTime.class).toInstant().toString(),false),row.getString("input_hash"));
    }
    private static View replay(Stored stored,String hash){
        if(!stored.hash().equals(hash))throw new ApiFailure(409,"CORPORATE_SOURCE_CONFLICT");
        View old=stored.view();return new View(old.actionId(),old.securityName(),old.action(),old.effect(),old.state(),old.ledgerEventId(),old.ledgerRevision(),old.recordedAt(),true);
    }
    private String hash(Input input){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(json.writeValueAsBytes(input)));}catch(NoSuchAlgorithmException impossible){throw new IllegalStateException("Required hash is unavailable.");}}
    private static BigDecimal cash(JsonNode node){if(node==null||node.isNull())return null;if(!node.isTextual())throw ApiFailure.invalid();return LedgerRules.decimal(node.asText());}
    private static Integer ratio(JsonNode node){if(node==null||node.isNull())return null;if(!node.isIntegralNumber()||!node.canConvertToInt())throw ApiFailure.invalid();int value=node.asInt();if(value<1||value>1000000)throw ApiFailure.invalid();return value;}
    private static void validateUrl(String value){
        if(value==null)return;URI uri=URI.create(value);
        if(!"https".equalsIgnoreCase(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null)throw ApiFailure.invalid();
    }
}
