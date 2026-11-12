
package dev.finn.research;

import dev.finn.identity.CurrentUser;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class NewsContext {
    record Cluster(String clusterId,UUID companyId,String companyName,String headline,LocalDate date,List<SourceDocuments.Entry> sources) {}
    record Page(String coverage,List<Cluster> items,boolean hasMore) {}
    private static final ZoneId INDIA=ZoneId.of("Asia/Kolkata");
    private final CurrentUser users;
    private final SourceDocuments sources;

    NewsContext(CurrentUser users,SourceDocuments sources) {
        this.users=users;
        this.sources=sources;
    }

    @Transactional public SourceDocuments.Entry save(UUID company,String headline,String publisher,String url,String publishedAt) {
        return sources.createFor(users.requireId(),"NEWS",new SourceDocuments.Input(company,headline,publisher,url,null,publishedAt));
    }

    @Transactional public Page list(UUID company,int offset) {
        var grouped=new LinkedHashMap<String,List<SourceDocuments.Entry>>();
        for(var source:sources.allCurrent(users.requireId(),"NEWS",company)){
            String key=SourceDocuments.checksum(source.companyId()+"|"+date(source)+"|"+CompanyEvents.normalize(source.title()));
            grouped.computeIfAbsent(key,ignored->new ArrayList<>()).add(source);
        }
        var items=grouped.entrySet().stream().skip(offset).limit(25).map(group->{
            var first=group.getValue().getFirst();
            return new Cluster(group.getKey(),first.companyId(),first.companyName(),first.title(),date(first),List.copyOf(group.getValue()));
        }).toList();
        return new Page("MANUAL_LINKS",items,grouped.size()>offset+items.size());
    }

    private static LocalDate date(SourceDocuments.Entry source){
        return Instant.parse(source.publishedAt()==null?source.ingestedAt():source.publishedAt()).atZone(INDIA).toLocalDate();
    }
}
