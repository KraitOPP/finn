package dev.finn.imports;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;
import dev.finn.identity.CurrentUser;
import dev.finn.jobs.JobQueue;
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
    public record PreviewPage(UUID importId,UUID jobId,long ledgerRevisionAtPreview,Metadata metadata,List<PreviewRow> rows,
                              Integer nextOffset,boolean requiresInrConfirmation,boolean commitAvailable){}
    private record Stage(UUID jobId,long ledgerRevision,Metadata metadata){}
    private record Original(byte[] contents,String sha256){}
    private static final String SOURCE="""
            SELECT s.import_id,s.current_job_id,s.created_at,s.byte_size,j.state,j.failure_code
            FROM finn.import_source s JOIN finn.app_job j ON j.owner_id=s.owner_id AND j.job_id=s.current_job_id
            WHERE s.owner_id=? AND s.portfolio_id=? AND s.account_id=?
            """;
    private final JdbcTemplate jdbc;private final CurrentUser users;private final Portfolios portfolios;
    private final JobQueue jobs;private final AuditTrail audit;private final JsonMapper json;
    public HoldingsImports(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,JobQueue jobs,AuditTrail audit,JsonMapper json){this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.jobs=jobs;this.audit=audit;this.json=json;}

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
        var rows=jdbc.query("""
                SELECT r.row_payload::text,s.security_id FROM finn.import_preview_row r
                LEFT JOIN finn.security s ON s.owner_id=r.owner_id AND s.isin::text=(r.row_payload->>'isin')
                WHERE r.owner_id=? AND r.import_id=? ORDER BY r.row_number LIMIT ? OFFSET ?
                """,(row,index)->{UUID match=row.getObject("security_id",UUID.class);return new PreviewRow(json.readValue(row.getString(1),GrowwHoldingsReader.Row.class),match,match==null?"UNRESOLVED_SECURITY":"EXISTING_SECURITY");},owner,id,limit,offset);
        Integer next=offset+rows.size()<stage.metadata().rowCount()?offset+rows.size():null;
        return new PreviewPage(id,source.jobId(),stage.ledgerRevision(),stage.metadata(),rows,next,true,false);
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
