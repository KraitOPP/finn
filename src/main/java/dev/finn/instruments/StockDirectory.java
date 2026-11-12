package dev.finn.instruments;

import dev.finn.identity.CurrentUser;
import dev.finn.market.YahooProcess;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.WorkspacePolicy;
import java.io.IOException;
import java.nio.file.Files;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.Semaphore;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tools.jackson.databind.json.JsonMapper;

@Service
class StockDirectory {
    record Stock(String exchange,String symbol,String name,String series,String isin,LocalDate validFrom,String source) {
        String yahooSymbol() { return symbol+("NSE".equals(exchange)?".NS":".BO"); }
    }
    record Results(List<Stock> items,String status) {}
    private record Snapshot(List<Stock> items) {}
    private record Cached(Instant until,Results results) {}
    private record Match(Stock stock,int score) {}
    private static final String SYMBOL="[A-Z0-9][A-Z0-9&._-]{0,63}";
    private static final int MAX_FILE=3_000_000;
    private final List<Stock> nse;
    private final YahooProcess yahoo;
    private final CurrentUser users;
    private final LinkedHashMap<String,Cached> cache=new LinkedHashMap<>();
    private final Semaphore lookups=new Semaphore(2);

    StockDirectory(JsonMapper json,YahooProcess yahoo,CurrentUser users,@Value("${FINN_WORKSPACE_ROOT:}") String workspace) {
        this.yahoo=yahoo;
        this.users=users;
        this.nse=load(json,workspace);
    }

    Results search(String query,String exchange) {
        users.requireId();
        if (!List.of("NSE","BSE").contains(exchange) || query.length()>80 || query.codePoints().anyMatch(Character::isISOControl))
            throw ApiFailure.invalid();
        String normalized=normalize(query);
        if(normalized.length()<2) return new Results(List.of(),"READY");
        if("NSE".equals(exchange)&&!nse.isEmpty()) {
            var items=nse.stream().map(stock->new Match(stock,score(stock,normalized)))
                    .filter(match->match.score()<100)
                    .sorted(Comparator.comparingInt(Match::score).thenComparing(match->match.stock().symbol()))
                    .limit(10).map(Match::stock).toList();
            return new Results(items,"READY");
        }
        // ISINs belong to the local directory. Keep them out of upstream search requests.
        if (normalized.matches("in[a-z0-9]{9}[0-9]")) return new Results(List.of(),"READY");
        return upstream(query.strip(),exchange);
    }

    Stock resolve(String exchange,String symbol) {
        if (!List.of("NSE","BSE").contains(exchange)||!symbol.matches(SYMBOL)) throw ApiFailure.invalid();
        if ("NSE".equals(exchange)&&!nse.isEmpty())
            return nse.stream().filter(stock->stock.symbol().equals(symbol)).findFirst().orElseThrow(ApiFailure::notFound);
        String suffix="NSE".equals(exchange)?".NS":".BO";
        synchronized(cache) {
            for(var entry:cache.values()) {
                if(entry.until().isAfter(Instant.now()))
                    for(var stock:entry.results().items())
                        if(exchange.equals(stock.exchange())&&symbol.equals(stock.symbol())) return stock;
            }
        }
        return upstream(symbol+suffix,exchange).items().stream().filter(stock->stock.symbol().equals(symbol))
                .findFirst().orElseThrow(ApiFailure::notFound);
    }

    private Results upstream(String query,String exchange) {
        String key=exchange+":"+query.toLowerCase(Locale.ROOT);
        synchronized(cache) {
            var previous=cache.get(key);
            if(previous!=null&&previous.until().isAfter(Instant.now())) return previous.results();
        }
        if(!"PRIVATE_DAILY".equals(yahoo.capability())||!lookups.tryAcquire())
            return new Results(List.of(),"UNAVAILABLE");
        try {
            var reply=yahoo.lookup(query,exchange).path("items");
            if(!reply.isArray()||reply.size()>10) return new Results(List.of(),"UNAVAILABLE");
            Map<String,Stock> stocks=new LinkedHashMap<>();
            for(var item:reply) {
                String symbol=item.path("symbol").asText();
                if(!symbol.matches(SYMBOL)) continue;
                String name=Catalogue.cleanName(item.path("name").asText());
                stocks.putIfAbsent(symbol,new Stock(exchange,symbol,name,"UNKNOWN",null,today().minusDays(14),"YAHOO_DISCOVERY"));
            }
            var result=new Results(List.copyOf(stocks.values()),"READY");
            synchronized(cache) {
                cache.put(key,new Cached(Instant.now().plusSeconds(600),result));
                if(cache.size()>200) cache.pollFirstEntry();
            }
            return result;
        } catch(IOException|RuntimeException failed) {
            return new Results(List.of(),"UNAVAILABLE");
        } catch(InterruptedException stopped) {
            Thread.currentThread().interrupt();
            return new Results(List.of(),"UNAVAILABLE");
        } finally {
            lookups.release();
        }
    }

    private static List<Stock> load(JsonMapper json,String workspace) {
        try {
            var root=WorkspacePolicy.requireExternalRoot(workspace);
            var file=root.resolve("data/stock-directory.json");
            if(!Files.exists(file)) return List.of();
            if(!file.toRealPath().startsWith(root)||!Files.isRegularFile(file)||Files.size(file)>MAX_FILE)
                throw new IOException("Invalid directory file.");
            var entries=json.readValue(Files.readAllBytes(file),Snapshot.class).items();
            if(entries.size()>12_000) throw new IOException("Invalid directory size.");
            return entries.stream().filter(stock->"NSE".equals(stock.exchange())&&"NSE_DIRECTORY".equals(stock.source())
                    &&stock.symbol()!=null&&stock.symbol().matches(SYMBOL)&&Isin.valid(stock.isin())
                    &&stock.series()!=null&&stock.series().matches("[A-Z0-9_-]{1,16}")
                    &&stock.validFrom()!=null&&!stock.validFrom().isAfter(today())
                    &&Catalogue.cleanName(stock.name()).equals(stock.name())).toList();
        } catch(IOException|RuntimeException badFile) {
            LoggerFactory.getLogger(StockDirectory.class).warn("Local stock directory unavailable. Yahoo lookup remains available when configured.");
            return List.of();
        }
    }

    static LocalDate today() { return LocalDate.now(ZoneId.of("Asia/Kolkata")); }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+"," ").strip();
    }

    private static int score(Stock stock,String query) {
        String symbol=normalize(stock.symbol()), name=normalize(stock.name()), isin=normalize(stock.isin());
        if(symbol.equals(query)||isin.equals(query)) return 0;
        if(symbol.startsWith(query)) return 1;
        if(name.startsWith(query)) return 2;
        if(name.contains(query)) return 3;
        var words=name.split(" ");
        if(java.util.Arrays.stream(query.split(" ")).allMatch(term->java.util.Arrays.stream(words).anyMatch(word->word.startsWith(term)))) return 4;
        if(query.length()>=4&&(nearPrefix(symbol,query)||java.util.Arrays.stream(words).anyMatch(word->nearPrefix(word,query)))) return 5;
        return 100;
    }

    private static boolean nearPrefix(String word,String query) {
        String prefix=word.substring(0,Math.min(word.length(),query.length()));
        if(prefix.length()==query.length()) {
            int mismatches=0;
            for(int i=0;i<prefix.length();i++) if(prefix.charAt(i)!=query.charAt(i)) mismatches++;
            return mismatches==1;
        }
        if(prefix.length()+1!=query.length()) return false;
        int first=0;
        while(first<prefix.length()&&prefix.charAt(first)==query.charAt(first)) first++;
        return prefix.substring(first).equals(query.substring(first+1));
    }
}
