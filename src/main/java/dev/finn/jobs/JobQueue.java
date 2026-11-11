package dev.finn.jobs;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.UUID;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.ApiVersion;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobQueue {
    public enum Kind { GROWW_HOLDINGS_PREVIEW, YAHOO_DAILY_HISTORY, RESEARCH_EXTRACT }
    public record Claim(UUID jobId,UUID ownerId,UUID resourceId,UUID leaseToken,int attempts){}
    public record Status(String contractVersion,String requestId,UUID jobId,long revision,String state,String createdAt,
                         String updatedAt,String startedAt,String finishedAt,String failureCode){}
    private final JdbcTemplate jdbc;
    public JobQueue(JdbcTemplate jdbc){this.jdbc=jdbc;}
    public UUID enqueue(UUID owner,Kind kind,UUID resource){
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.app_job(job_id,owner_id,kind,resource_id) VALUES (?,?,?,?)",id,owner,kind.name(),resource);
        return id;
    }
    @Transactional public Claim claim(Kind kind){
        jdbc.update("""
                UPDATE finn.app_job SET state='FAILED',failure_code='LEASE_EXPIRED',finished_at=clock_timestamp(),updated_at=clock_timestamp(),
                lease_token=NULL,lease_until=NULL,revision=revision+1 WHERE kind=? AND state='RUNNING' AND attempts>=3 AND lease_until<=clock_timestamp()
                """,kind.name());
        UUID token=UUID.randomUUID();
        return jdbc.query("""
                WITH candidate AS (
                  SELECT job_id FROM finn.app_job WHERE kind=? AND attempts<3 AND
                  ((state='QUEUED' AND available_at<=clock_timestamp()) OR (state='RUNNING' AND lease_until<=clock_timestamp()))
                  ORDER BY available_at,created_at,job_id FOR UPDATE SKIP LOCKED LIMIT 1
                ) UPDATE finn.app_job job SET state='RUNNING',attempts=attempts+1,revision=revision+1,
                    lease_token=?,lease_until=clock_timestamp()+interval '45 seconds',started_at=COALESCE(started_at,clock_timestamp()),updated_at=clock_timestamp()
                FROM candidate WHERE job.job_id=candidate.job_id
                RETURNING job.job_id,job.owner_id,job.resource_id,job.lease_token,job.attempts
                """,(row,index)->new Claim(row.getObject("job_id",UUID.class),row.getObject("owner_id",UUID.class),row.getObject("resource_id",UUID.class),row.getObject("lease_token",UUID.class),row.getInt("attempts")),kind.name(),token).stream().findFirst().orElse(null);
    }
    public boolean succeed(Claim claim){return terminal(claim,"SUCCEEDED",null);}
    public boolean partial(Claim claim){return terminal(claim,"PARTIALLY_SUCCEEDED","PARTIAL_RESULT");}
    public boolean reject(Claim claim,String safeCode){
        if(safeCode==null||!safeCode.matches("[A-Z][A-Z0-9_]{0,63}"))throw new IllegalArgumentException("Invalid failure code.");
        return terminal(claim,"FAILED",safeCode);
    }
    private boolean terminal(Claim claim,String state,String code){
        return jdbc.update("""
                UPDATE finn.app_job SET state=?,failure_code=?,finished_at=clock_timestamp(),updated_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,revision=revision+1
                WHERE owner_id=? AND job_id=? AND state='RUNNING' AND lease_token=? AND lease_until>clock_timestamp()
                """,state,code,claim.ownerId(),claim.jobId(),claim.leaseToken())==1;
    }
    public void retry(Claim claim){
        if(claim.attempts()>=3){reject(claim,"WORKER_TEMPORARY_FAILURE");return;}
        jdbc.update("""
                UPDATE finn.app_job SET state='QUEUED',available_at=clock_timestamp()+(? * interval '1 second'),started_at=NULL,
                  updated_at=clock_timestamp(),lease_token=NULL,lease_until=NULL,revision=revision+1
                WHERE owner_id=? AND job_id=? AND state='RUNNING' AND lease_token=? AND lease_until>clock_timestamp()
                """,5*claim.attempts()*claim.attempts(),claim.ownerId(),claim.jobId(),claim.leaseToken());
    }
    public Status status(UUID owner,UUID job,String trace){
        return jdbc.query("SELECT * FROM finn.app_job WHERE owner_id=? AND job_id=?",(row,index)->new Status(ApiVersion.CURRENT,trace,row.getObject("job_id",UUID.class),row.getLong("revision"),row.getString("state"),
                instant(row,"created_at"),instant(row,"updated_at"),instant(row,"started_at"),instant(row,"finished_at"),row.getString("failure_code")),owner,job).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    private static String instant(ResultSet row,String column)throws SQLException{
        var value=row.getObject(column,OffsetDateTime.class);return value==null?null:value.toInstant().toString();
    }
}
