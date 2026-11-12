package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class EvidenceSearch {
    record Result(List<SourceDocuments.Entry> documents,List<ResearchEvidence.Location> passages,
                  boolean moreDocuments,boolean morePassages) {}
    record Scope(String kind,OffsetDateTime from,OffsetDateTime until,boolean includeEarlier) {}
    static final String DATE_FILTER="""
            AND (?::timestamptz IS NULL OR v.published_at>=?) AND (?::timestamptz IS NULL OR v.published_at<?)
            """;
    private static final Pattern WORD=Pattern.compile("[\\p{L}\\p{N}]{2,32}");
    private static final Set<String> STOP=Set.of("what","when","where","which","about","tell","show","does","did","the","for",
            "and","are","were","was","from","this","that","with","how","have","can","you","why","its","company","has");
    private final JdbcTemplate jdbc;
    private final ResearchEvidence evidence;
    private final CurrentUser users;
    private final FinancialFacts facts;
    private final SourceDocuments sources;

    EvidenceSearch(JdbcTemplate jdbc,ResearchEvidence evidence,CurrentUser users,FinancialFacts facts,SourceDocuments sources){
        this.jdbc=jdbc;this.evidence=evidence;this.users=users;this.facts=facts;this.sources=sources;
    }

    @Transactional public Result search(UUID company,String query,String kind,LocalDate from,LocalDate through,boolean earlier,int offset){
        UUID owner=users.requireId();
        facts.requireCompany(owner,company);
        if(!Set.of("ALL","PRIMARY","NEWS").contains(kind)||offset<0||offset>1200
                ||(from!=null&&through!=null&&from.isAfter(through))
                ||(from!=null&&(from.getYear()<1||from.getYear()>9999))
                ||(through!=null&&(through.getYear()<1||through.getYear()>9999)))throw ApiFailure.invalid();
        String terms=terms(query);
        if(terms.isEmpty())return new Result(List.of(),List.of(),false,false);
        var scope=new Scope(kind,startOfDay(from),through==null?null:startOfDay(through.plusDays(1)),earlier);
        var documents=sources.search(owner,company,terms,scope,offset);
        var passages=kind.equals("NEWS")?List.<ResearchEvidence.Location>of():passages(owner,company,terms,scope,21,offset);
        return new Result(documents.stream().limit(20).toList(),passages.stream().limit(20).toList(),documents.size()>20,passages.size()>20);
    }

    List<ResearchEvidence.Location> find(UUID owner,UUID company,String query,int limit){
        String terms=terms(query);
        if(terms.isEmpty())return List.of();
        return passages(owner,company,terms,new Scope("PRIMARY",null,null,false),limit,0);
    }

    private List<ResearchEvidence.Location> passages(UUID owner,UUID company,String terms,Scope scope,int limit,int offset){
        return jdbc.query(ResearchEvidence.SELECT_LOCATION+"""
                WHERE a.owner_id=? AND d.company_id=? AND d.source_type='PRIMARY' AND (? OR d.revision=x.document_revision)
                  AND to_tsvector('simple',a.quote) @@ to_tsquery('simple',?)
                """+DATE_FILTER+"""
                ORDER BY ts_rank_cd(to_tsvector('simple',a.quote),to_tsquery('simple',?)) DESC,
                         v.published_at DESC NULLS LAST,a.anchor_id LIMIT ? OFFSET ?
                """,evidence::row,owner,company,scope.includeEarlier(),terms,scope.from(),scope.from(),scope.until(),scope.until(),
                terms,limit,offset);
    }

    private static OffsetDateTime startOfDay(LocalDate date){
        return date==null?null:date.atStartOfDay().atOffset(ZoneOffset.UTC);
    }

    static String terms(String query){
        return String.join(" | ",WORD.matcher(query.toLowerCase(Locale.ROOT)).results().map(match->match.group())
                .filter(word->!STOP.contains(word)).distinct().limit(12).toList());
    }
}
