
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.jobs.JobQueue;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.json.JsonMapper;

@Service
class ResearchEvidence {
    record Location(UUID anchorId,UUID companyId,UUID documentId,int documentRevision,String sourceTitle,
                    String sourceName,String publishedAt,int page,int lineStart,int lineEnd,String kind,String quote,List<String> cells) {}
    record PageInfo(int page,String state) {}
    record Status(String state,String reason,UUID jobId,boolean canRequest,int totalPages,List<PageInfo> pages) {}
    record Locations(List<Location> items,boolean hasMore) {}
    record TextPage(int page,String state,String content) {}
    record Input(String text,byte[] pdf) {}
    private record Extraction(UUID id,UUID job,int requested,String result,String reason,int total,String jobState,String failure) {}

    static final String SELECT_LOCATION="""
            SELECT a.*,x.document_id,x.document_revision,d.company_id,v.title,v.source_name,v.published_at
            FROM finn.research_anchor a JOIN finn.research_extraction x USING(owner_id,extraction_id)
            JOIN finn.source_document d ON d.owner_id=x.owner_id AND d.document_id=x.document_id
            JOIN finn.source_document_version v ON v.owner_id=x.owner_id AND v.document_id=x.document_id AND v.revision=x.document_revision
            """;
    private static final TypeReference<List<String>> CELLS=new TypeReference<>() {};
    private final CurrentUser users;
    private final JdbcTemplate jdbc;
    private final SourceDocuments sources;
    private final JobQueue jobs;
    private final ResearchPdfProcess pdf;
    private final JsonMapper json;

    ResearchEvidence(CurrentUser users,JdbcTemplate jdbc,SourceDocuments sources,JobQueue jobs,ResearchPdfProcess pdf,JsonMapper json) {
        this.users=users;this.jdbc=jdbc;this.sources=sources;this.jobs=jobs;this.pdf=pdf;this.json=json;
    }

    @Transactional public Status status(UUID document,int version) { return status(users.requireId(),document,version); }

    @Transactional public Status request(UUID document,int version) {
        UUID owner=users.requireId();
        var state=status(owner,document,version);
        if(!state.canRequest())return state;
        if(jdbc.queryForObject("""
                SELECT count(*) FROM finn.app_job WHERE owner_id=? AND kind='RESEARCH_EXTRACT' AND state IN ('QUEUED','RUNNING')
                """,Integer.class,owner)>=3)throw new ApiFailure(429,"EXTRACTION_BACKLOG");
        var existing=find(owner,document,version);
        UUID id=existing==null?UUID.randomUUID():existing.id();
        UUID job=jobs.enqueue(owner,JobQueue.Kind.RESEARCH_EXTRACT,id);
        if(existing==null){
            jdbc.update("""
                    INSERT INTO finn.research_extraction(extraction_id,owner_id,document_id,document_revision,job_id)
                    VALUES(?,?,?,?,?)
                    """,id,owner,document,version,job);
        }else{
            jdbc.update("""
                    UPDATE finn.research_extraction SET job_id=?,requested=requested+1,status=NULL,reason=NULL,total_pages=0
                    WHERE owner_id=? AND extraction_id=?
                    """,job,owner,id);
        }
        return status(owner,document,version);
    }

    private Status status(UUID owner,UUID document,int version) {
        var source=sources.evidence(owner,document,version).source();
        if(!source.hasAttachment()&&!source.hasPdf())return new Status("LINK_ONLY","NO_LOCAL_ATTACHMENT",null,false,0,List.of());
        boolean configured=!source.hasPdf()||pdf.configured();
        var extraction=find(owner,document,version);
        if(extraction==null)return new Status("NOT_STARTED",configured?null:"PDF_EXTRACTOR_UNCONFIGURED",null,configured,0,List.of());
        String state=extraction.result()==null?extraction.jobState():extraction.result();
        String reason=extraction.reason()==null?extraction.failure():extraction.reason();
        boolean retry=configured&&extraction.requested()<3&&(state.equals("FAILED")||state.equals("UNSUPPORTED"));
        var pages=jdbc.query("SELECT page_number,state FROM finn.research_page WHERE owner_id=? AND extraction_id=? ORDER BY page_number",
                (row,i)->new PageInfo(row.getInt(1),row.getString(2)),owner,extraction.id());
        return new Status(state,reason,extraction.job(),retry,extraction.total(),pages);
    }

    private Extraction find(UUID owner,UUID document,int version) {
        return jdbc.query("""
                SELECT x.extraction_id,x.job_id,x.requested,x.status,x.reason,x.total_pages,j.state,j.failure_code
                FROM finn.research_extraction x JOIN finn.app_job j USING(owner_id,job_id)
                WHERE x.owner_id=? AND x.document_id=? AND x.document_revision=?
                """,(row,i)->new Extraction(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getInt(3),row.getString(4),
                row.getString(5),row.getInt(6),row.getString(7),row.getString(8)),owner,document,version).stream().findFirst().orElse(null);
    }

    Input input(JobQueue.Claim claim) {
        return jdbc.query("""
                SELECT v.attachment,p.contents FROM finn.research_extraction x JOIN finn.source_document_version v
                  ON v.owner_id=x.owner_id AND v.document_id=x.document_id AND v.revision=x.document_revision
                LEFT JOIN finn.research_pdf p ON p.owner_id=v.owner_id AND p.file_id=v.pdf_id
                WHERE x.owner_id=? AND x.extraction_id=? AND x.job_id=?
                """,(row,i)->new Input(row.getString(1),row.getBytes(2)),claim.ownerId(),claim.resourceId(),claim.jobId())
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    @Transactional public void finish(JobQueue.Claim claim,EvidenceText.Result result) {
        boolean committed=switch(result.status()){
            case "FAILED","UNSUPPORTED" -> jobs.reject(claim,result.reason());
            case "PARTIAL" -> jobs.partial(claim);
            default -> jobs.succeed(claim);
        };
        if(!committed)return;
        jdbc.update("""
                UPDATE finn.research_extraction SET status=?,reason=?,total_pages=? WHERE owner_id=? AND extraction_id=? AND job_id=?
                """,result.status(),result.reason(),result.totalPages(),claim.ownerId(),claim.resourceId(),claim.jobId());
        List<Object[]> pageRows=new ArrayList<>();
        List<Object[]> anchors=new ArrayList<>();
        for(var page:result.pages()){
            pageRows.add(new Object[]{claim.ownerId(),claim.resourceId(),page.number(),page.state(),page.content()});
            for(var anchor:page.anchors()){
                anchors.add(new Object[]{UUID.randomUUID(),claim.ownerId(),claim.resourceId(),page.number(),anchor.lineStart(),
                        anchor.lineEnd(),anchor.kind(),anchor.quote(),json.writeValueAsString(anchor.cells())});
            }
        }
        if(!pageRows.isEmpty())jdbc.batchUpdate("""
                INSERT INTO finn.research_page(owner_id,extraction_id,page_number,state,content) VALUES (?,?,?,?,?)
                """,pageRows);
        if(!anchors.isEmpty())jdbc.batchUpdate("""
                INSERT INTO finn.research_anchor(anchor_id,owner_id,extraction_id,page_number,line_start,line_end,kind,quote,cells)
                VALUES (?,?,?,?,?,?,?,?,CAST(? AS jsonb))
                """,anchors);
    }

    @Transactional public Locations list(UUID document,int version,int offset) {
        UUID owner=users.requireId();
        sources.evidence(owner,document,version);
        var rows=jdbc.query(SELECT_LOCATION+"""
                WHERE a.owner_id=? AND x.document_id=? AND x.document_revision=?
                ORDER BY a.page_number,a.line_start,a.anchor_id LIMIT 41 OFFSET ?
                """,this::row,owner,document,version,offset);
        return new Locations(rows.stream().limit(40).toList(),rows.size()>40);
    }

    @Transactional public TextPage page(UUID document,int version,int number) {
        return jdbc.query("""
                SELECT p.page_number,p.state,p.content FROM finn.research_page p JOIN finn.research_extraction x USING(owner_id,extraction_id)
                WHERE p.owner_id=? AND x.document_id=? AND x.document_revision=? AND p.page_number=?
                """,(row,i)->new TextPage(row.getInt(1),row.getString(2),row.getString(3)),users.requireId(),document,version,number)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    @Transactional public Location read(UUID anchor) { return require(users.requireId(),anchor); }

    Location require(UUID owner,UUID anchor) {
        return jdbc.query(SELECT_LOCATION+" WHERE a.owner_id=? AND a.anchor_id=?",this::row,owner,anchor)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    Location row(ResultSet row,int ignored)throws SQLException {
        return new Location(row.getObject("anchor_id",UUID.class),row.getObject("company_id",UUID.class),row.getObject("document_id",UUID.class),
                row.getInt("document_revision"),row.getString("title"),row.getString("source_name"),SourceDocuments.instant(row,"published_at"),
                row.getInt("page_number"),row.getInt("line_start"),row.getInt("line_end"),row.getString("kind"),row.getString("quote"),
                json.readValue(row.getString("cells"),CELLS));
    }
}
