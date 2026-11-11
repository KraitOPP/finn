
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class ResearchPdfs {
    static final int MAX_SIZE = 3 * 1024 * 1024;
    record FileRef(UUID fileId,String checksum) {}

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
