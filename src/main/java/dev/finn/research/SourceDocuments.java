
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.*;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class SourceDocuments {
    record Input(UUID companyId, String title, String sourceName, String url, String attachment, String publishedAt) {}
    record Entry(UUID documentId, UUID companyId, String companyName, String sourceType, int revision, String title,
                 String sourceName, String url, boolean hasAttachment, String checksum, String publishedAt, String ingestedAt) {}
    record Page(List<Entry> items, boolean hasMore) {}
    record Versions(List<Entry> items) {}
    record Detail(Entry source, String attachment) {}
    private record Checked(String title, String name, String url, String text, OffsetDateTime published) {}
    private static final String FIELDS = """
            SELECT d.company_id,d.source_type,c.name AS company_name,v.document_id,v.revision,v.title,v.source_name,
                v.url,v.attachment IS NOT NULL AS has_attachment,v.checksum,v.published_at,v.ingested_at
            """;
    private static final String FROM = """
            FROM finn.source_document d JOIN finn.source_document_version v USING(owner_id,document_id)
            JOIN finn.company c ON c.owner_id=d.owner_id AND c.company_id=d.company_id
            """;
    private static final String SELECT = FIELDS + FROM;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final JsonMapper json;

    SourceDocuments(JdbcTemplate jdbc, CurrentUser users, JsonMapper json) {
        this.jdbc = jdbc;
        this.users = users;
        this.json = json;
    }

    @Transactional public Page list(int offset) { return listFor(users.requireId(),"PRIMARY",offset); }

    Page listFor(UUID owner,String kind,int offset) {
        var rows = jdbc.query(SELECT + """
                WHERE d.owner_id=? AND d.source_type=? AND d.revision=v.revision
                ORDER BY v.ingested_at DESC,d.document_id LIMIT 41 OFFSET ?
                """, SourceDocuments::entry, owner,kind,offset);
        return new Page(rows.stream().limit(40).toList(),rows.size()>40);
    }

    List<Entry> allCurrent(UUID owner,String kind) {
        return jdbc.query(SELECT+"""
                WHERE d.owner_id=? AND d.source_type=? AND d.revision=v.revision
                ORDER BY coalesce(v.published_at,v.ingested_at) DESC,d.document_id LIMIT 200
                """, SourceDocuments::entry, owner,kind);
    }

    @Transactional public Versions versions(UUID id) {
        UUID owner = users.requireId();
        latest(owner,id);
        return new Versions(jdbc.query(SELECT + " WHERE d.owner_id=? AND d.document_id=? ORDER BY v.revision DESC LIMIT 50",
                SourceDocuments::entry, owner,id));
    }

    @Transactional public Detail detail(UUID id,int revision) { return evidence(users.requireId(),id,revision); }

    Detail evidence(UUID owner,UUID id,int revision) {
        return jdbc.query(FIELDS + ",v.attachment " + FROM + " WHERE d.owner_id=? AND d.document_id=? AND v.revision=?",
                (row,i) -> new Detail(entry(row,i),row.getString("attachment")),owner,id,revision)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    @Transactional public Entry save(UUID id,Integer expected,Input input) {
        UUID owner = users.requireId();
        if (id == null) return createFor(owner,"PRIMARY",input);
        Entry prior = latest(owner,id);
        if (prior.revision() != expected || !prior.companyId().equals(input.companyId())) throw ApiFailure.conflict();
        Checked checked = validate(prior.sourceType(),input);
        String checksum = checksum(json.writeValueAsString(checked));
        if (prior.checksum().equals(checksum)) return prior;
        if (expected >= 50) throw new ApiFailure(429,"SOURCE_VERSION_LIMIT");
        if (jdbc.update("UPDATE finn.source_document SET revision=? WHERE owner_id=? AND document_id=? AND revision=?",
                expected+1,owner,id,expected)!=1) throw ApiFailure.conflict();
        insert(owner,id,expected+1,checked,checksum);
        return latest(owner,id);
    }

    Entry createFor(UUID owner,String kind,Input input) {
        boolean company = Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS(SELECT 1 FROM finn.company WHERE owner_id=? AND company_id=?)
                """,Boolean.class,owner,input.companyId()));
        if (!company) throw ApiFailure.notFound();
        Checked checked = validate(kind,input);
        String checksum = checksum(json.writeValueAsString(checked));
        var earlier = jdbc.query("""
                SELECT document_id FROM finn.source_document WHERE owner_id=? AND company_id=? AND source_type=? AND initial_checksum=?
                """,(row,i)->row.getObject(1,UUID.class),owner,input.companyId(),kind,checksum).stream().findFirst().orElse(null);
        if (earlier != null) return latest(owner,earlier);
        if (jdbc.queryForObject("SELECT count(*) FROM finn.source_document WHERE owner_id=?",Integer.class,owner)>=200)
            throw new ApiFailure(429,"SOURCE_DOCUMENT_LIMIT");
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO finn.source_document(document_id,owner_id,company_id,source_type,initial_checksum,revision)
                VALUES (?,?,?,?,?,1)
                """,id,owner,input.companyId(),kind,checksum);
        insert(owner,id,1,checked,checksum);
        return latest(owner,id);
    }

    Entry latest(UUID owner,UUID id) {
        return jdbc.query(SELECT+" WHERE d.owner_id=? AND d.document_id=? AND v.revision=d.revision",
                SourceDocuments::entry,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private void insert(UUID owner,UUID id,int revision,Checked checked,String checksum) {
        jdbc.update("""
                INSERT INTO finn.source_document_version(owner_id,document_id,revision,title,source_name,url,attachment,checksum,published_at)
                VALUES (?,?,?,?,?,?,?,?,?)
                """,owner,id,revision,checked.title(),checked.name(),checked.url(),checked.text(),checksum,checked.published());
    }

    private static Checked validate(String kind,Input input) {
        String url = input.url() == null ? null : publicLink(input.url());
        String attachment = input.attachment();
        if (attachment != null) {
            attachment = attachment.replace("\r\n","\n").replace('\r','\n');
            if (attachment.startsWith("\ufeff")) attachment=attachment.substring(1);
            if (attachment.isBlank() || attachment.getBytes(StandardCharsets.UTF_8).length>49152 ||
                    attachment.codePoints().anyMatch(code -> Character.isISOControl(code) && code!='\n' && code!='\t'))
                throw ApiFailure.invalid();
        }
        if ((url == null && attachment == null) || (kind.equals("NEWS") && (url == null || attachment != null))) throw ApiFailure.invalid();
        OffsetDateTime published = null;
        if (input.publishedAt() != null) {
            try {
                published=OffsetDateTime.ofInstant(Instant.parse(input.publishedAt()),ZoneOffset.UTC);
                if (published.isAfter(OffsetDateTime.now(ZoneOffset.UTC)) || published.getYear()<1900) throw ApiFailure.invalid();
            } catch (DateTimeException invalid) { throw ApiFailure.invalid(); }
        }
        return new Checked(Catalogue.cleanName(input.title()),Catalogue.cleanName(input.sourceName()),url,attachment,published);
    }

    static String publicLink(String raw) {
        try {
            URI uri = URI.create(raw.strip());
            String host = uri.getHost();
            if (!"https".equalsIgnoreCase(uri.getScheme()) || host==null || uri.getRawUserInfo()!=null ||
                    (uri.getPort()!=-1 && uri.getPort()!=443)) throw ApiFailure.invalid();
            String name = host.toLowerCase(Locale.ROOT);
            if (!name.matches("(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z][a-z0-9-]{1,62}")
                    || name.endsWith(".localhost") || name.endsWith(".local") || name.endsWith(".internal")
                    || name.endsWith(".lan") || name.endsWith(".home.arpa")) throw ApiFailure.invalid();
            String link=uri.toASCIIString();
            if (link.length()>1000) throw ApiFailure.invalid();
            return link;
        } catch (IllegalArgumentException invalid) { throw ApiFailure.invalid(); }
    }

    static String checksum(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException unavailable) { throw new IllegalStateException(unavailable); }
    }

    static String instant(ResultSet row,String column)throws SQLException {
        var value=row.getObject(column,OffsetDateTime.class);
        return value==null?null:value.toInstant().toString();
    }

    private static Entry entry(ResultSet row,int ignored)throws SQLException {
        return new Entry(row.getObject("document_id",UUID.class),row.getObject("company_id",UUID.class),row.getString("company_name"),
                row.getString("source_type"),row.getInt("revision"),row.getString("title"),row.getString("source_name"),row.getString("url"),
                row.getBoolean("has_attachment"),row.getString("checksum"),instant(row,"published_at"),instant(row,"ingested_at"));
    }
}
