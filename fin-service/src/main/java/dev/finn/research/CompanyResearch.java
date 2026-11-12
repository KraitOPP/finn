package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class CompanyResearch {
    record Note(UUID noteId,String kind,String title,UUID anchorId,boolean resolved) {}
    record Overview(UUID companyId,String companyName,int primarySources,int indexedSources,List<SourceDocuments.Entry> sources,
                    List<CompanyEvents.Version> events,List<Note> notes) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final ResearchEvidence evidence;
    private final SourceDocuments sources;
    private final CompanyEvents events;

    CompanyResearch(JdbcTemplate jdbc,CurrentUser users,ResearchEvidence evidence,SourceDocuments sources,CompanyEvents events){
        this.jdbc=jdbc;this.users=users;this.evidence=evidence;this.sources=sources;this.events=events;
    }

    @Transactional public Overview overview(UUID company){
        UUID owner=users.requireId();
        String name=name(owner,company);
        var coverage=jdbc.queryForObject("""
                SELECT count(*) AS registered,count(x.extraction_id) AS indexed
                FROM finn.source_document d LEFT JOIN finn.research_extraction x
                ON x.owner_id=d.owner_id AND x.document_id=d.document_id AND x.document_revision=d.revision
                   AND x.status IN ('READY','PARTIAL')
                WHERE d.owner_id=? AND d.company_id=? AND d.source_type='PRIMARY'
                """,(row,i)->new int[]{row.getInt("registered"),row.getInt("indexed")},owner,company);
        var notes=jdbc.query("""
                SELECT * FROM finn.company_research_note WHERE owner_id=? AND company_id=? ORDER BY resolved,kind,title,note_id
                """,CompanyResearch::note,owner,company);
        return new Overview(company,name,coverage[0],coverage[1],sources.listFor(owner,"PRIMARY",0,company).items().stream().limit(6).toList(),
                events.listFor(owner,company,0).items().stream().limit(6).toList(),notes);
    }

    @Transactional public Note add(UUID company,String kind,String title,UUID anchor){
        UUID owner=users.requireId();
        name(owner,company);
        if(anchor==null&&!kind.equals("QUESTION"))throw ApiFailure.invalid();
        if(anchor!=null&&!evidence.require(owner,anchor).companyId().equals(company))throw ApiFailure.notFound();
        int count=jdbc.queryForObject("SELECT count(*) FROM finn.company_research_note WHERE owner_id=? AND company_id=?",Integer.class,owner,company);
        if(count>=50)throw ApiFailure.conflict();
        var id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.company_research_note(note_id,owner_id,company_id,kind,title,anchor_id) VALUES (?,?,?,?,?,?)",
                id,owner,company,kind,title.strip(),anchor);
        return new Note(id,kind,title.strip(),anchor,false);
    }

    @Transactional public Note resolve(UUID company,UUID id,boolean resolved){
        UUID owner=users.requireId();
        return jdbc.query("""
                UPDATE finn.company_research_note SET resolved=?
                WHERE owner_id=? AND company_id=? AND note_id=? AND kind='QUESTION' RETURNING *
                """,CompanyResearch::note,resolved,owner,company,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private String name(UUID owner,UUID company){
        return jdbc.query("SELECT name FROM finn.company WHERE owner_id=? AND company_id=?",
                (row,i)->row.getString(1),owner,company).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Note note(ResultSet row,int index)throws SQLException{
        return new Note(row.getObject("note_id",UUID.class),row.getString("kind"),row.getString("title"),
                row.getObject("anchor_id",UUID.class),row.getBoolean("resolved"));
    }
}
