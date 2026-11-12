
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ResearchPdfs {
    static final int MAX_SIZE = 3 * 1024 * 1024;
    record FileRef(UUID fileId,String checksum) {}
    record Staged(UUID fileId,String checksum,String stagedAt) {}
    record Staging(List<Staged> items) {}
    record Discard(UUID fileId,boolean discarded) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    ResearchPdfs(JdbcTemplate jdbc, CurrentUser users) {
        this.jdbc=jdbc;
        this.users=users;
    }

    @Transactional public FileRef stage(byte[] bytes) {
        UUID owner=users.requireId();
        if(bytes.length<12 || bytes.length>MAX_SIZE ||
                !new String(bytes,0,8,StandardCharsets.US_ASCII).matches("%PDF-(1\\.[0-9]|2\\.0)")) throw ApiFailure.invalid();
        jdbc.queryForObject("SELECT finn.prune_staged_pdfs(?)",Integer.class,owner);
        String checksum=digest(bytes);
        var prior=jdbc.query("SELECT file_id FROM finn.research_pdf WHERE owner_id=? AND checksum=?",
                (row,i)->row.getObject(1,UUID.class),owner,checksum).stream().findFirst().orElse(null);
        if(prior!=null)return new FileRef(prior,checksum);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.research_pdf WHERE owner_id=?",Integer.class,owner)>=30)
            throw new ApiFailure(429,"RESEARCH_PDF_LIMIT");
        UUID id=UUID.randomUUID();
        jdbc.update("INSERT INTO finn.research_pdf(owner_id,file_id,checksum,contents) VALUES (?,?,?,?)",owner,id,checksum,bytes);
        return new FileRef(id,checksum);
    }

    FileRef require(UUID owner,UUID file) {
        return jdbc.query("SELECT checksum FROM finn.research_pdf WHERE owner_id=? AND file_id=?",
                (row,i)->new FileRef(file,row.getString(1)),owner,file).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    @Transactional public Staging staged() {
        UUID owner=users.requireId();
        return new Staging(jdbc.query("""
                SELECT p.file_id,p.checksum,p.staged_at FROM finn.research_pdf p WHERE p.owner_id=?
                  AND NOT EXISTS(SELECT 1 FROM finn.source_document_version v WHERE v.owner_id=p.owner_id AND v.pdf_id=p.file_id)
                ORDER BY p.staged_at DESC,p.file_id LIMIT 30
                """,(row,i)->new Staged(row.getObject("file_id",UUID.class),row.getString("checksum"),
                SourceDocuments.instant(row,"staged_at")),owner));
    }

    @Transactional public Discard discard(UUID file) {
        UUID owner=users.requireId();
        require(owner,file);
        if(!Boolean.TRUE.equals(jdbc.queryForObject("SELECT finn.discard_staged_pdf(?,?)",Boolean.class,owner,file)))
            throw new ApiFailure(409,"PDF_RETAINED_AS_EVIDENCE");
        return new Discard(file,true);
    }

    @Transactional public byte[] download(UUID document,int revision) {
        return jdbc.query("""
                SELECT p.contents FROM finn.source_document_version v JOIN finn.research_pdf p
                  ON p.owner_id=v.owner_id AND p.file_id=v.pdf_id
                WHERE v.owner_id=? AND v.document_id=? AND v.revision=?
                """,(row,i)->row.getBytes(1),users.requireId(),document,revision).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (NoSuchAlgorithmException unavailable) { throw new IllegalStateException(unavailable); }
    }
}
