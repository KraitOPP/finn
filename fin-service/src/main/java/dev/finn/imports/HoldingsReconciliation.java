package dev.finn.imports;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import dev.finn.identity.CurrentUser;
import dev.finn.ledger.Journal;
import dev.finn.ledger.LedgerRules;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;
import dev.finn.portfolio.Portfolios;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class HoldingsReconciliation {
    public record Row(Integer sourceRow,UUID securityId,String name,String isin,String reportedUnits,String recordedUnits,
                      String reportedCost,String recordedCost,String unitDifference,String costDifference,List<String> issues){}
    public record Comparison(UUID importId,LocalDate reportDate,long ledgerRevision,String state,LocalDate coverageStart,
                             String historyStatus,int rowCount,int issueCount,List<Row> rows,Integer nextOffset,String reviewedAt){}
    public record Review(UUID importId,long ledgerRevision,String reviewedAt){}
    private static final BigDecimal COST_TOLERANCE=new BigDecimal("0.01");
    private final CurrentUser users;private final Portfolios portfolios;private final HoldingsImports imports;
    private final Journal journal;private final JdbcTemplate jdbc;private final AuditTrail audit;
    public HoldingsReconciliation(CurrentUser users,Portfolios portfolios,HoldingsImports imports,Journal journal,JdbcTemplate jdbc,AuditTrail audit){this.users=users;this.portfolios=portfolios;this.imports=imports;this.journal=journal;this.jdbc=jdbc;this.audit=audit;}
    @Transactional public Comparison compare(UUID portfolio,UUID account,UUID id,int limit,int offset){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        if(limit<1||limit>100||offset<0||offset>2000)throw ApiFailure.invalid();
        var evidence=imports.evidence(owner,portfolio,account,id);
        LocalDate date=evidence.metadata().asOfDate();var current=journal.project(owner,account);
        if(!covered(current,date))return new Comparison(id,date,current.revision(),"HISTORY_UNAVAILABLE",current.coverageStart(),current.historyStatus(),0,0,List.of(),null,null);
        var before=journal.projectAt(owner,account,date,current.revision());
        var held=new LinkedHashMap<UUID,Journal.PositionView>();before.positions().forEach(position->held.put(position.securityId(),position));
        var rows=new ArrayList<Row>();var mentioned=new HashSet<UUID>();
        for(var mapped:evidence.rows()){
            var source=mapped.source();UUID security=mapped.matchedSecurityId();var issues=new ArrayList<String>();
            if(security!=null)mentioned.add(security);
            var position=held.get(security);
            String units=null,cost=null,unitDelta=null,costDelta=null;
            if(source.issues().stream().anyMatch(GrowwHoldingsReader.RowIssue::blocksCommit))issues.add("SOURCE_ROW_INVALID");
            else if(security==null)issues.add("UNMAPPED_SECURITY");
            else{
                units=position==null?"0":position.quantity();cost=position==null?"0":position.recordedCost();
                unitDelta=subtract(source.quantity(),units);
                if(unitDelta!=null&&new BigDecimal(unitDelta).signum()!=0)issues.add("QUANTITY_DIFFERENCE");
                costDelta=subtract(source.buyValue(),cost);
                if(costDelta==null)issues.add("COST_UNAVAILABLE");
                else if(new BigDecimal(costDelta).abs().compareTo(COST_TOLERANCE)>0)issues.add("COST_DIFFERENCE");
            }
            rows.add(new Row(source.rowNumber(),security,source.reportedName(),source.isin(),source.quantity(),units,source.buyValue(),cost,unitDelta,costDelta,List.copyOf(issues)));
        }
        for(var position:before.positions())if(!mentioned.contains(position.securityId()))rows.add(new Row(null,position.securityId(),position.securityName(),null,null,position.quantity(),null,position.recordedCost(),null,null,List.of("MISSING_FROM_REPORT")));
        var page=rows.stream().skip(offset).limit(limit).toList();int next=offset+page.size();
        return new Comparison(id,date,current.revision(),"COMPARABLE",current.coverageStart(),current.historyStatus(),rows.size(),(int)rows.stream().filter(row->!row.issues().isEmpty()).count(),page,next<rows.size()?next:null,reviewed(owner,id,current.revision()));
    }
    @Transactional public Review acknowledge(UUID portfolio,UUID account,UUID id,long expected){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,true);
        var evidence=imports.evidence(owner,portfolio,account,id);var current=journal.project(owner,account);
        if(current.revision()!=expected)throw new ApiFailure(409,"IMPORT_LEDGER_CHANGED");
        if(!covered(current,evidence.metadata().asOfDate()))throw new ApiFailure(422,"RECONCILIATION_HISTORY_UNAVAILABLE");
        int inserted=jdbc.update("INSERT INTO finn.holdings_reconciliation_review(owner_id,portfolio_id,account_id,import_id,ledger_revision) VALUES (?,?,?,?,?) ON CONFLICT DO NOTHING",owner,portfolio,account,id,expected);
        if(inserted>0)audit.record(AuditTrail.Action.IMPORT_RECONCILED,owner,id);
        return new Review(id,expected,reviewed(owner,id,expected));
    }
    private String reviewed(UUID owner,UUID id,long revision){return jdbc.query("SELECT reviewed_at FROM finn.holdings_reconciliation_review WHERE owner_id=? AND import_id=? AND ledger_revision=?",(row,index)->row.getObject(1,OffsetDateTime.class).toInstant().toString(),owner,id,revision).stream().findFirst().orElse(null);}
    private static boolean covered(Journal.View current,LocalDate date){return current.coverageStart()!=null&&!date.isBefore(current.coverageStart());}
    private static String subtract(String reported,String recorded){return reported==null||recorded==null?null:LedgerRules.text(new BigDecimal(reported).subtract(new BigDecimal(recorded)));}
}
