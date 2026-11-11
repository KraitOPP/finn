package dev.finn.research;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class EvidenceSearch {
    private static final Pattern WORD=Pattern.compile("[\\p{L}\\p{N}]{2,32}");
    private static final Set<String> STOP=Set.of("what","when","where","which","about","tell","show","does","did","the","for",
            "and","are","were","was","from","this","that","with","how","have","can","you","why","its","company","has");
    private final JdbcTemplate jdbc;
    private final ResearchEvidence evidence;

    EvidenceSearch(JdbcTemplate jdbc,ResearchEvidence evidence){this.jdbc=jdbc;this.evidence=evidence;}

    List<ResearchEvidence.Location> find(UUID owner,UUID company,String query,int limit){
        String terms=terms(query);
        if(terms.isEmpty())return List.of();
        return jdbc.query(ResearchEvidence.SELECT_LOCATION+"""
                WHERE a.owner_id=? AND d.company_id=? AND d.source_type='PRIMARY' AND d.revision=x.document_revision
                  AND to_tsvector('simple',a.quote) @@ to_tsquery('simple',?)
                ORDER BY ts_rank_cd(to_tsvector('simple',a.quote),to_tsquery('simple',?)) DESC,
                         v.published_at DESC NULLS LAST,a.anchor_id LIMIT ?
                """,evidence::row,owner,company,terms,terms,limit);
    }

    static String terms(String query){
        return String.join(" | ",WORD.matcher(query.toLowerCase(Locale.ROOT)).results().map(match->match.group())
                .filter(word->!STOP.contains(word)).distinct().limit(12).toList());
    }
}
