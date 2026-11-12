package dev.finn.imports;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.jobs.JobQueue;
import dev.finn.ledger.Journal;
import dev.finn.ledger.LedgerRules;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;
import dev.finn.portfolio.Portfolios;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class HoldingsImports {
    public record Ticket(UUID importId,UUID jobId,boolean duplicate){}
    public record Summary(UUID importId,UUID jobId,String state,String createdAt,int sizeBytes,String failureCode){}
    public record ListView(List<Summary> items){}
    public record Metadata(String profile,LocalDate asOfDate,GrowwHoldingsReader.Totals reportedSummary,GrowwHoldingsReader.Totals detailTotals,
                           List<GrowwHoldingsReader.Comparison> comparisons,List<String> warnings,int rowCount){}
    public record PreviewRow(GrowwHoldingsReader.Row source,UUID matchedSecurityId,String mappingStatus){}
    record Evidence(Metadata metadata,List<PreviewRow> rows){}
    public record PreviewPage(UUID importId,UUID jobId,long ledgerRevisionAtPreview,Metadata metadata,List<PreviewRow> rows,
                              Integer nextOffset,boolean requiresInrConfirmation,boolean commitAvailable,ReviewPlan review){}
    public record Receipt(UUID importId,String outcome,String costMode,int acceptedRows,int skippedRows,int duplicateRows,
                          long ledgerRevision,UUID originalImportId,boolean replayed,String acceptedAt){}
    public record ReviewPlan(String state,long currentLedgerRevision,int eligibleRows,int duplicateRows,int conflictRows,
                             boolean reportedCostAvailable,boolean differencesRequireAcknowledgement,Receipt receipt){}
    private record Prior(Receipt receipt,LocalDate date,boolean acknowledged){}
    private record Preparation(ReviewPlan plan,List<GrowwHoldingsReader.Row> rows,UUID original){}
    private record Stage(UUID jobId,long ledgerRevision,Metadata metadata){}
    private record Original(byte[] contents,String sha256){}
    private static final String SOURCE="""
            SELECT s.import_id,s.current_job_id,s.created_at,s.byte_size,j.state,j.failure_code
            FROM finn.import_source s JOIN finn.app_job j ON j.owner_id=s.owner_id AND j.job_id=s.current_job_id
            WHERE s.owner_id=? AND s.portfolio_id=? AND s.account_id=?
            """;
    private final JdbcTemplate jdbc;private final CurrentUser users;private final Portfolios portfolios;
    private final JobQueue jobs;private final AuditTrail audit;private final JsonMapper json;private final Journal journal;private final Catalogue catalogue;
    public HoldingsImports(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,JobQueue jobs,AuditTrail audit,JsonMapper json,Journal journal,Catalogue catalogue){this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.jobs=jobs;this.audit=audit;this.json=json;this.journal=journal;this.catalogue=catalogue;}

    @Transactional public Ticket upload(UUID portfolio,UUID account,byte[] bytes){
        UUID owner=users.requireId();
        jdbc.queryForList("SELECT user_id FROM finn.app_user WHERE user_id=? FOR UPDATE",owner);
        var owned=portfolios.requireAccount(owner,portfolio,account,true);
        if(!owned.source().equals("GROWW"))throw new ApiFailure(422,"GROWW_SOURCE_ACCOUNT_REQUIRED");
        if(bytes.length>GrowwHoldingsReader.MAX_BYTES)throw new ApiFailure(413,"REQUEST_TOO_LARGE");
        if(bytes.length<22||bytes[0]!=0x50||bytes[1]!=0x4b||bytes[2]!=0x03||bytes[3]!=0x04)throw new ApiFailure(422,"INVALID_XLSX");
        String hash=sha256(bytes);
        var duplicate=jdbc.query("SELECT import_id,current_job_id FROM finn.import_source WHERE owner_id=? AND account_id=? AND source_sha256=?",(row,index)->new Ticket(row.getObject(1,UUID.class),row.getObject(2,UUID.class),true),owner,account,hash).stream().findFirst();
        if(duplicate.isPresent())return duplicate.get();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.import_source WHERE owner_id=?",Integer.class,owner)>=30)throw new ApiFailure(409,"IMPORT_STORAGE_LIMIT_REACHED");
        if(jdbc.queryForObject("SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='GROWW_HOLDINGS_PREVIEW' AND state IN ('QUEUED','RUNNING')",Integer.class,owner)>=2)throw new ApiFailure(429,"IMPORT_QUEUE_FULL");
        UUID id=UUID.randomUUID(),job=jobs.enqueue(owner,JobQueue.Kind.GROWW_HOLDINGS_PREVIEW,id);
        jdbc.update("INSERT INTO finn.import_source(import_id,owner_id,portfolio_id,account_id,current_job_id,source_sha256,byte_size,contents) VALUES (?,?,?,?,?,?,?,?)",id,owner,portfolio,account,job,hash,bytes.length,bytes);
        return new Ticket(id,job,false);
    }
    @Transactional public ListView list(UUID portfolio,UUID account){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        return new ListView(jdbc.query(SOURCE+" ORDER BY s.created_at DESC,s.import_id DESC LIMIT 30",this::summary,owner,portfolio,account));
    }
    private Summary summary(ResultSet row,int index)throws SQLException{return new Summary(row.getObject("import_id",UUID.class),row.getObject("current_job_id",UUID.class),row.getString("state"),row.getObject("created_at",OffsetDateTime.class).toInstant().toString(),row.getInt("byte_size"),row.getString("failure_code"));}
    private Summary require(UUID owner,UUID portfolio,UUID account,UUID id){
        return jdbc.query(SOURCE+" AND s.import_id=?",this::summary,owner,portfolio,account,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    @Transactional public Ticket retry(UUID portfolio,UUID account,UUID id){
        UUID owner=users.requireId();jdbc.queryForList("SELECT user_id FROM finn.app_user WHERE user_id=? FOR UPDATE",owner);
        portfolios.requireAccount(owner,portfolio,account,true);
        var prior=require(owner,portfolio,account,id);
        if(!prior.state().equals("FAILED")||!("LEASE_EXPIRED".equals(prior.failureCode())||"WORKER_TEMPORARY_FAILURE".equals(prior.failureCode())))throw new ApiFailure(409,"IMPORT_RETRY_NOT_AVAILABLE");
        if(jdbc.queryForObject("SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='GROWW_HOLDINGS_PREVIEW' AND state IN ('QUEUED','RUNNING')",Integer.class,owner)>=2)throw new ApiFailure(429,"IMPORT_QUEUE_FULL");
        if(jdbc.queryForObject("SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='GROWW_HOLDINGS_PREVIEW' AND resource_id=?",Integer.class,owner,id)>=5)throw new ApiFailure(409,"IMPORT_RETRY_LIMIT_REACHED");
        UUID job=jobs.enqueue(owner,JobQueue.Kind.GROWW_HOLDINGS_PREVIEW,id);
        jdbc.update("UPDATE finn.import_source SET current_job_id=? WHERE owner_id=? AND import_id=?",job,owner,id);
        return new Ticket(id,job,false);
    }
    @Transactional public PreviewPage preview(UUID portfolio,UUID account,UUID id,int limit,int offset){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);
        var source=require(owner,portfolio,account,id);
        if(limit<1||limit>100||offset<0||offset>1000)throw ApiFailure.invalid();
        var stage=stage(owner,id);
        var rows=mappedRows(owner,id,limit,offset);
        Integer next=offset+rows.size()<stage.metadata().rowCount()?offset+rows.size():null;
        var plan=prepare(owner,account,id,stage,portfolios.require(owner,portfolio,false,false).archived()).plan();
        return new PreviewPage(id,source.jobId(),stage.ledgerRevision(),stage.metadata(),rows,next,true,Set.of("READY","DUPLICATE").contains(plan.state()),plan);
    }
    Evidence evidence(UUID owner,UUID portfolio,UUID account,UUID id){
        require(owner,portfolio,account,id);
        return new Evidence(stage(owner,id).metadata(),mappedRows(owner,id,GrowwHoldingsReader.MAX_ROWS,0));
    }
    private List<PreviewRow> mappedRows(UUID owner,UUID id,int limit,int offset){
        return jdbc.query("""
                SELECT r.row_payload::text,s.security_id FROM finn.import_preview_row r
                LEFT JOIN finn.security s ON s.owner_id=r.owner_id AND s.isin::text=(r.row_payload->>'isin')
                WHERE r.owner_id=? AND r.import_id=? ORDER BY r.row_number LIMIT ? OFFSET ?
                """,(row,index)->{UUID match=row.getObject("security_id",UUID.class);return new PreviewRow(json.readValue(row.getString(1),GrowwHoldingsReader.Row.class),match,match==null?"UNRESOLVED_SECURITY":"EXISTING_SECURITY");},owner,id,limit,offset);
    }
    @Transactional public Receipt accept(UUID portfolio,UUID account,UUID id,String costMode,boolean acknowledged,long expectedRevision){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);require(owner,portfolio,account,id);
        if(!Set.of("UNITS_ONLY","REPORTED_ROW_COST").contains(costMode))throw ApiFailure.invalid();
        Prior existing=accepted(owner,id);
        if(existing!=null)return replay(existing,costMode,acknowledged);
        portfolios.requireAccount(owner,portfolio,account,true);
        existing=accepted(owner,id);if(existing!=null)return replay(existing,costMode,acknowledged);
        var stage=stage(owner,id);var preparation=prepare(owner,account,id,stage,false);var plan=preparation.plan();
        if(plan.currentLedgerRevision()!=expectedRevision)throw new ApiFailure(409,"IMPORT_LEDGER_CHANGED");
        if(!Set.of("READY","DUPLICATE").contains(plan.state()))throw new ApiFailure(409,switch(plan.state()){
            case "SOURCE_CONFLICT"->"IMPORT_SOURCE_CONFLICT";case "RECONCILIATION_ONLY"->"IMPORT_RECONCILIATION_REQUIRED";default->"IMPORT_ROWS_BLOCKED";
        });
        if(plan.differencesRequireAcknowledgement()&&!acknowledged)throw new ApiFailure(422,"IMPORT_DIFFERENCES_REQUIRE_REVIEW");
        boolean duplicate=plan.state().equals("DUPLICATE");long revision=plan.currentLedgerRevision();int count=0,skipped=0;
        if(!duplicate){
            if(costMode.equals("REPORTED_ROW_COST")&&!plan.reportedCostAvailable())throw new ApiFailure(422,"IMPORT_REPORTED_COST_UNAVAILABLE");
            var holdings=new ArrayList<Journal.Opening>();
            for(var row:preparation.rows()){
                BigDecimal units=new BigDecimal(row.quantity()).stripTrailingZeros();
                if(units.signum()==0){skipped++;continue;}
                UUID security=catalogue.resolveReviewedHolding(owner,row.reportedName(),row.isin());
                BigDecimal cost=costMode.equals("REPORTED_ROW_COST")?LedgerRules.bounded(new BigDecimal(row.buyValue()).stripTrailingZeros()):null;
                holdings.add(new Journal.Opening(security,units,cost,row.rowNumber()));
            }
            var result=journal.recordReviewedOpening(owner,portfolio,account,id,stage.metadata().asOfDate(),expectedRevision,costMode,holdings);
            revision=result.revision();count=holdings.size();
        }
        jdbc.update("""
                INSERT INTO finn.holdings_acceptance(owner_id,portfolio_id,account_id,import_id,as_of_date,outcome,cost_mode,acknowledged_differences,
                 accepted_rows,skipped_rows,duplicate_rows,original_import_id,ledger_revision) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
                """,owner,portfolio,account,id,stage.metadata().asOfDate(),duplicate?"DUPLICATE":"APPLIED",costMode,acknowledged,count,skipped,duplicate?plan.duplicateRows():0,preparation.original(),revision);
        audit.record(AuditTrail.Action.IMPORT_COMMITTED,owner,id);
        return accepted(owner,id).receipt();
    }
    private static Receipt replay(Prior existing,String costMode,boolean acknowledged){
        Receipt receipt=existing.receipt();
        if(!receipt.costMode().equals(costMode)||existing.acknowledged()!=acknowledged)throw new ApiFailure(409,"IMPORT_ALREADY_REVIEWED");
        return new Receipt(receipt.importId(),receipt.outcome(),receipt.costMode(),receipt.acceptedRows(),receipt.skippedRows(),receipt.duplicateRows(),receipt.ledgerRevision(),receipt.originalImportId(),true,receipt.acceptedAt());
    }
    private Preparation prepare(UUID owner,UUID account,UUID id,Stage stage,boolean archived){
        long revision=journal.currentRevision(owner,account);
        boolean differences=stage.metadata().warnings().stream().anyMatch(warning->warning.startsWith("SUMMARY_")||warning.equals("ROW_RECONCILIATION_REQUIRED"));
        Prior accepted=accepted(owner,id);
        if(accepted!=null)return new Preparation(new ReviewPlan("ALREADY_ACCEPTED",revision,0,accepted.receipt().duplicateRows(),0,false,differences,accepted.receipt()),List.of(),null);
        if(archived)return new Preparation(new ReviewPlan("ARCHIVED",revision,0,0,0,false,differences,null),List.of(),null);
        if(stage.metadata().warnings().contains("BLOCKED_ROWS_PRESENT"))return new Preparation(new ReviewPlan("ROWS_BLOCKED",revision,0,0,0,false,differences,null),List.of(),null);
        var rows=sourceRows(owner,id);
        int eligible=(int)rows.stream().filter(row->new BigDecimal(row.quantity()).signum()>0).count();
        if(eligible==0)return new Preparation(new ReviewPlan("ROWS_BLOCKED",revision,0,0,0,false,differences,null),List.of(),null);
        boolean costs=rows.stream().filter(row->new BigDecimal(row.quantity()).signum()>0).allMatch(row->row.buyValue()!=null&&new BigDecimal(row.buyValue()).stripTrailingZeros().scale()<=8);
        var opening=jdbc.query("SELECT * FROM finn.holdings_acceptance WHERE owner_id=? AND account_id=? AND outcome='APPLIED'",this::prior,owner,account).stream().findFirst().orElse(null);
        if(opening!=null){
            if(!opening.date().equals(stage.metadata().asOfDate()))return new Preparation(new ReviewPlan("RECONCILIATION_ONLY",revision,0,0,0,costs,differences,null),rows,null);
            var priorRows=new HashMap<String,String>();for(var row:sourceRows(owner,opening.receipt().importId()))priorRows.put(row.isin(),fingerprint(row));
            int duplicate=(int)rows.stream().filter(row->fingerprint(row).equals(priorRows.get(row.isin()))).count();
            int conflicts=rows.size()-duplicate;
            return new Preparation(new ReviewPlan(conflicts==0?"DUPLICATE":"SOURCE_CONFLICT",revision,0,duplicate,conflicts,costs,differences,null),rows,conflicts==0?opening.receipt().importId():null);
        }
        if(journal.hasEquityRecords(owner,account))return new Preparation(new ReviewPlan("RECONCILIATION_ONLY",revision,0,0,0,costs,differences,null),rows,null);
        return new Preparation(new ReviewPlan("READY",revision,eligible,0,0,costs,differences,null),rows,null);
    }
    private List<GrowwHoldingsReader.Row> sourceRows(UUID owner,UUID id){
        return jdbc.query("SELECT row_payload::text FROM finn.import_preview_row WHERE owner_id=? AND import_id=? ORDER BY row_number LIMIT 1000",(row,index)->json.readValue(row.getString(1),GrowwHoldingsReader.Row.class),owner,id);
    }
    private Prior accepted(UUID owner,UUID id){return jdbc.query("SELECT * FROM finn.holdings_acceptance WHERE owner_id=? AND import_id=?",this::prior,owner,id).stream().findFirst().orElse(null);}
    private Prior prior(ResultSet row,int index)throws SQLException{
        return new Prior(new Receipt(row.getObject("import_id",UUID.class),row.getString("outcome"),row.getString("cost_mode"),row.getInt("accepted_rows"),row.getInt("skipped_rows"),row.getInt("duplicate_rows"),row.getLong("ledger_revision"),row.getObject("original_import_id",UUID.class),false,row.getObject("accepted_at",OffsetDateTime.class).toInstant().toString()),row.getObject("as_of_date",LocalDate.class),row.getBoolean("acknowledged_differences"));
    }
    private static String fingerprint(GrowwHoldingsReader.Row row){
        StringBuilder value=new StringBuilder(row.isin()).append('|');
        for(String field:new String[]{row.quantity(),row.averageCost(),row.buyValue(),row.closingPrice(),row.closingValue(),row.unrealisedPnl()})value.append(field==null?"-":LedgerRules.text(new BigDecimal(field))).append('|');
        return sha256(value.toString().getBytes(StandardCharsets.UTF_8));
    }
    private Stage stage(UUID owner,UUID id){
        return jdbc.query("SELECT job_id,ledger_revision,metadata::text FROM finn.import_preview WHERE owner_id=? AND import_id=?",(row,index)->new Stage(row.getObject(1,UUID.class),row.getLong(2),json.readValue(row.getString(3),Metadata.class)),owner,id).stream().findFirst().orElseThrow(()->new ApiFailure(409,"IMPORT_PREVIEW_NOT_READY"));
    }
    @Transactional public byte[] original(UUID portfolio,UUID account,UUID id){
        UUID owner=users.requireId();portfolios.requireAccount(owner,portfolio,account,false);require(owner,portfolio,account,id);
        // Do not serve packages that failed static-content validation as downloadable spreadsheets.
        stage(owner,id);return verifiedBytes(owner,id,null);
    }
    public byte[] readForWorker(JobQueue.Claim claim){return verifiedBytes(claim.ownerId(),claim.resourceId(),claim.jobId());}
    private byte[] verifiedBytes(UUID owner,UUID id,UUID currentJob){
        String where=currentJob==null?"":" AND current_job_id=?";
        Object[] args=currentJob==null?new Object[]{owner,id}:new Object[]{owner,id,currentJob};
        var original=jdbc.query("SELECT contents,source_sha256 FROM finn.import_source WHERE owner_id=? AND import_id=?"+where,(row,index)->new Original(row.getBytes(1),row.getString(2)),args).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(original.contents().length>GrowwHoldingsReader.MAX_BYTES||!sha256(original.contents()).equals(original.sha256()))throw new ApiFailure(503,"IMPORT_STORAGE_UNAVAILABLE");
        return original.contents();
    }
    @Transactional public boolean stage(JobQueue.Claim claim,GrowwHoldingsReader.Preview preview){
        if(!jobs.succeed(claim))return false;
        Long ledger=jdbc.queryForObject("""
                SELECT a.lock_version FROM finn.import_source s JOIN finn.investment_account a ON a.owner_id=s.owner_id AND a.account_id=s.account_id
                WHERE s.owner_id=? AND s.import_id=? AND s.current_job_id=?
                """,Long.class,claim.ownerId(),claim.resourceId(),claim.jobId());
        var metadata=new Metadata(preview.profile(),preview.asOfDate(),preview.reportedSummary(),preview.detailTotals(),preview.comparisons(),preview.warnings(),preview.rows().size());
        jdbc.update("INSERT INTO finn.import_preview(owner_id,import_id,job_id,ledger_revision,metadata) VALUES (?,?,?,?,?::jsonb)",claim.ownerId(),claim.resourceId(),claim.jobId(),ledger,json.writeValueAsString(metadata));
        jdbc.batchUpdate("INSERT INTO finn.import_preview_row(owner_id,import_id,row_number,row_payload) VALUES (?,?,?,?::jsonb)",preview.rows(),100,(statement,row)->{
            statement.setObject(1,claim.ownerId());statement.setObject(2,claim.resourceId());statement.setInt(3,row.rowNumber());statement.setString(4,json.writeValueAsString(row));
        });
        audit.record(AuditTrail.Action.IMPORT_PREVIEWED,claim.ownerId(),claim.resourceId());
        return true;
    }
    private static String sha256(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(NoSuchAlgorithmException impossible){throw new IllegalStateException("Required hash is unavailable.");}}
}
