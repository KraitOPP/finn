
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
public class CompanyEvents {
    public record AnnouncedDate(String type,LocalDate date,String certainty) {}
    record Input(UUID documentId,int documentRevision,UUID eventId,Integer expectedRevision,String title,String groupingKey,
                 String subtype,String stage,String materiality,String novelty,List<AnnouncedDate> dates) {}
    public record Version(UUID eventId,UUID versionId,UUID companyId,String companyName,int revision,UUID documentId,int documentRevision,
                   String sourceTitle,String title,String category,String subtype,String stage,String materiality,String novelty,
                   String confidence,String reviewedAt,List<AnnouncedDate> dates) {}
    record Page(List<Version> items,boolean hasMore) {}
    record History(List<Version> items) {}
    private record Root(UUID eventId,UUID companyId,int revision) {}
    private record Decision(UUID documentId,int documentRevision,String title,String category,String subtype,String stage,
                            String materiality,String novelty) {}

    static final String SELECT = """
            SELECT v.*,e.company_id,c.name AS company_name,s.title AS source_title
            FROM finn.company_event_version v
            JOIN finn.company_event e ON e.owner_id=v.owner_id AND e.event_id=v.event_id
            JOIN finn.company c ON c.owner_id=e.owner_id AND c.company_id=e.company_id
            JOIN finn.source_document_version s ON s.owner_id=v.owner_id AND s.document_id=v.document_id AND s.revision=v.document_revision
            """;
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final SourceDocuments sources;
    private final JsonMapper json;
    private final FilingRules rules;
    private static final JsonMapper DATE_READER=JsonMapper.builder().build();

    CompanyEvents(JdbcTemplate jdbc,CurrentUser users,SourceDocuments sources,JsonMapper json,FilingRules rules) {
        this.jdbc=jdbc;
        this.users=users;
        this.sources=sources;
        this.json=json;
        this.rules=rules;
    }

    @Transactional public EventClassifier.Hint suggestion(UUID document,int revision) {
        var source=sources.evidence(users.requireId(),document,revision).source();
        if (!source.sourceType().equals("PRIMARY")) throw ApiFailure.notFound();
        return EventClassifier.suggest(source.title());
    }

    @Transactional public Page list(UUID company,int offset) { return listFor(users.requireId(),company,offset); }

    Page listFor(UUID owner,UUID company,int offset) {
        var rows = company == null
                ? jdbc.query(SELECT+" WHERE e.owner_id=? AND v.revision=e.revision ORDER BY v.reviewed_at DESC,e.event_id LIMIT 41 OFFSET ?",CompanyEvents::version,owner,offset)
                : jdbc.query(SELECT+" WHERE e.owner_id=? AND e.company_id=? AND v.revision=e.revision ORDER BY v.reviewed_at DESC,e.event_id LIMIT 41 OFFSET ?",CompanyEvents::version,owner,company,offset);
        return new Page(rows.stream().limit(40).toList(),rows.size()>40);
    }

    @Transactional public History history(UUID id) {
        UUID owner=users.requireId();
        require(owner,id);
        return new History(jdbc.query(SELECT+" WHERE e.owner_id=? AND e.event_id=? ORDER BY v.revision DESC LIMIT 100",
                CompanyEvents::version,owner,id));
    }

    @Transactional public Version classify(Input input) { return classifyFor(users.requireId(),input); }

    Version classifyFor(UUID owner,Input input) {
        var source=sources.evidence(owner,input.documentId(),input.documentRevision()).source();
        if (!source.sourceType().equals("PRIMARY")) throw new ApiFailure(422,"PRIMARY_SOURCE_REQUIRED");
        if ((input.eventId()==null)!=(input.expectedRevision()==null)) throw ApiFailure.invalid();
        var subtype=EventClassifier.Subtype.valueOf(input.subtype());
        String title=Catalogue.cleanName(input.title());
        var decision=new Decision(input.documentId(),input.documentRevision(),title,subtype.category,subtype.name(),
                input.stage(),input.materiality(),input.novelty());
        var dates=validateDates(input.dates());
        String grouping=SourceDocuments.checksum(subtype.name()+"|"+normalize(title)+"|"+normalize(input.groupingKey()));
        Root root=input.eventId()==null ? byGroup(owner,source.companyId(),grouping) : require(owner,input.eventId());
        if (root!=null && !root.companyId().equals(source.companyId())) throw ApiFailure.notFound();
        String dateJson=json.writeValueAsString(dates);
        String decisionJson=json.writeValueAsString(decision);
        String fingerprint=SourceDocuments.checksum(dates.isEmpty()?decisionJson:decisionJson+"|"+dateJson);
        UUID id;
        int revision;
        if (root==null) {
            if (jdbc.queryForObject("SELECT count(*) FROM finn.company_event WHERE owner_id=?",Integer.class,owner)>=300)
                throw new ApiFailure(429,"COMPANY_EVENT_LIMIT");
            id=UUID.randomUUID();
            revision=1;
            jdbc.update("""
                    INSERT INTO finn.company_event(event_id,owner_id,company_id,group_hash,revision) VALUES (?,?,?,?,1)
                    """,id,owner,source.companyId(),grouping);
        } else {
            id=root.eventId();
            var duplicate=byFingerprint(owner,id,fingerprint);
            if (duplicate!=null) {
                if (input.expectedRevision()==null||duplicate.revision()>=input.expectedRevision()) return duplicate;
                fingerprint=SourceDocuments.checksum(fingerprint+"|after|"+input.expectedRevision());
                var retried=byFingerprint(owner,id,fingerprint);
                if (retried!=null) return retried;
            }
            if (input.expectedRevision()!=null && root.revision()!=input.expectedRevision()) throw ApiFailure.conflict();
            if (root.revision()>=100) throw new ApiFailure(429,"COMPANY_EVENT_VERSION_LIMIT");
            revision=root.revision()+1;
            if (jdbc.update("UPDATE finn.company_event SET revision=? WHERE owner_id=? AND event_id=? AND revision=?",
                    revision,owner,id,root.revision())!=1) throw ApiFailure.conflict();
        }
        jdbc.update("""
                INSERT INTO finn.company_event_version(owner_id,event_id,revision,document_id,document_revision,title,category,
                    subtype,stage,materiality,novelty,fingerprint,announced_dates) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,CAST(? AS jsonb))
                """,owner,id,revision,decision.documentId(),decision.documentRevision(),decision.title(),decision.category(),
                decision.subtype(),decision.stage(),decision.materiality(),decision.novelty(),fingerprint,dateJson);
        var saved=current(owner,id);
        rules.onEvent(owner,saved);
        return saved;
    }

    public Version evidence(UUID owner,UUID versionId) {
        return jdbc.query(SELECT+" WHERE e.owner_id=? AND v.event_version_id=?",
                CompanyEvents::version,owner,versionId).stream().findFirst().orElse(null);
    }

    private Version byFingerprint(UUID owner,UUID id,String fingerprint) {
        return jdbc.query(SELECT+" WHERE e.owner_id=? AND e.event_id=? AND v.fingerprint=?",CompanyEvents::version,
                owner,id,fingerprint).stream().findFirst().orElse(null);
    }

    private static List<AnnouncedDate> validateDates(List<AnnouncedDate> dates) {
        if (dates==null) return List.of();
        var latest=LocalDate.now(ZoneId.of("Asia/Kolkata")).plusYears(10);
        if (dates.size()>5||dates.stream().map(AnnouncedDate::type).distinct().count()!=dates.size()
                || dates.stream().anyMatch(date->date.date().isBefore(LocalDate.of(1900,1,1))||date.date().isAfter(latest)))
            throw ApiFailure.invalid();
        return dates.stream().sorted(Comparator.comparing(AnnouncedDate::type)).toList();
    }

    Version current(UUID owner,UUID id) {
        return jdbc.query(SELECT+" WHERE e.owner_id=? AND e.event_id=? AND v.revision=e.revision",
                CompanyEvents::version,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private Root byGroup(UUID owner,UUID company,String group) {
        return jdbc.query("SELECT event_id,company_id,revision FROM finn.company_event WHERE owner_id=? AND company_id=? AND group_hash=?",
                CompanyEvents::root,owner,company,group).stream().findFirst().orElse(null);
    }

    private Root require(UUID owner,UUID id) {
        return jdbc.query("SELECT event_id,company_id,revision FROM finn.company_event WHERE owner_id=? AND event_id=?",
                CompanyEvents::root,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }

    private static Root root(ResultSet row,int ignored)throws SQLException {
        return new Root(row.getObject(1,UUID.class),row.getObject(2,UUID.class),row.getInt(3));
    }

    static Version version(ResultSet row,int ignored)throws SQLException {
        var dates=new ArrayList<AnnouncedDate>();
        for(var date:DATE_READER.readTree(row.getString("announced_dates")))
            dates.add(new AnnouncedDate(date.path("type").asText(),LocalDate.parse(date.path("date").asText()),date.path("certainty").asText()));
        return new Version(row.getObject("event_id",UUID.class),row.getObject("event_version_id",UUID.class),row.getObject("company_id",UUID.class),row.getString("company_name"),
                row.getInt("revision"),row.getObject("document_id",UUID.class),row.getInt("document_revision"),row.getString("source_title"),
                row.getString("title"),row.getString("category"),row.getString("subtype"),row.getString("stage"),
                row.getString("materiality"),row.getString("novelty"),"REVIEWED",SourceDocuments.instant(row,"reviewed_at"),List.copyOf(dates));
    }

    static String normalize(String value) {
        if (value==null) return "";
        return Normalizer.normalize(value,Normalizer.Form.NFKC).toLowerCase(Locale.ROOT)
                .replaceAll("[^\\p{L}\\p{N}]+"," ").strip();
    }
}
