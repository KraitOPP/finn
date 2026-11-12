package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class PeerRankings {
    static final String METHOD="within-sector-midrank-v1";
    record Factor(DiscoveryUniverse.Metric metric,String direction,int weight) {}
    record Specification(List<UUID> companyIds,List<Factor> factors) {}
    record Contribution(Factor factor,String reason,FinancialFacts.Fact fact,String percentile,String points,boolean relativeWeakness) {}
    record Row(DiscoveryUniverse.Member member,Integer rank,String score,String status,List<Contribution> contributions) {}
    record View(UUID rankingId,UUID runId,String methodology,DiscoveryUniverse.Sector sector,Specification specification,
                int completePeers,List<Row> rows,String createdAt) {}
    record Summary(UUID rankingId,String createdAt) {}
    record Index(List<Summary> items) {}
    private record Stored(UUID id,UUID run,String method,Specification spec,String createdAt) {}
    private record Peer(DiscoveryUniverse.Member member,List<DiscoveryUniverse.Reading> readings) {
        boolean complete(){return readings.stream().allMatch(reading->reading.fact()!=null);}
    }
    private record Score(Peer peer,Integer total,List<Contribution> contributions) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final StockScreens screens;
    private final JsonMapper json;

    PeerRankings(JdbcTemplate jdbc,CurrentUser users,StockScreens screens,JsonMapper json){
        this.jdbc=jdbc;this.users=users;this.screens=screens;this.json=json;
    }

    @Transactional public Index list(UUID run){
        UUID owner=users.requireId();
        screens.requireRun(owner,run);
        return new Index(jdbc.query("SELECT rank_id,created_at FROM finn.discovery_peer_rank WHERE owner_id=? AND run_id=? ORDER BY created_at DESC,rank_id",
                (row,i)->new Summary(row.getObject("rank_id",UUID.class),SourceDocuments.instant(row,"created_at")),owner,run));
    }

    @Transactional public View rank(UUID run,PeerRankingController.Input input){
        UUID owner=users.requireId();
        var captured=screens.requireRun(owner,run);
        var sector=screens.version(owner,captured.screen(),captured.revision()).definition().sector();
        var specification=new Specification(input.companyIds().stream().sorted().toList(),
                input.factors().stream().map(factor->new Factor(factor.metric(),factor.direction(),factor.weight())).toList());
        validate(captured,sector,specification);
        var existing=jdbc.query("SELECT * FROM finn.discovery_peer_rank WHERE owner_id=? AND request_id=?",this::stored,owner,input.requestId())
                .stream().findFirst().orElse(null);
        if(existing!=null){
            if(!existing.run().equals(run)||!existing.spec().equals(specification))throw ApiFailure.conflict();
            return view(existing,captured,sector);
        }
        if(jdbc.queryForObject("SELECT count(*) FROM finn.discovery_peer_rank WHERE owner_id=?",Integer.class,owner)>=120)
            throw new ApiFailure(429,"PEER_RANKING_LIMIT");
        var stored=jdbc.queryForObject("""
                INSERT INTO finn.discovery_peer_rank(rank_id,owner_id,run_id,request_id,methodology,specification)
                VALUES (?,?,?,?,?,?::jsonb) RETURNING *
                """,this::stored,UUID.randomUUID(),owner,run,input.requestId(),METHOD,json.writeValueAsString(specification));
        return view(stored,captured,sector);
    }

    @Transactional public View read(UUID id){
        UUID owner=users.requireId();
        var stored=jdbc.query("SELECT * FROM finn.discovery_peer_rank WHERE owner_id=? AND rank_id=?",this::stored,owner,id)
                .stream().findFirst().orElseThrow(ApiFailure::notFound);
        var captured=screens.requireRun(owner,stored.run());
        var sector=screens.version(owner,captured.screen(),captured.revision()).definition().sector();
        return view(stored,captured,sector);
    }

    private static void validate(StockScreens.Stored captured,DiscoveryUniverse.Sector sector,Specification spec){
        if(spec.companyIds().stream().distinct().count()!=spec.companyIds().size()
                ||spec.factors().stream().map(Factor::metric).distinct().count()!=spec.factors().size()
                ||spec.factors().stream().anyMatch(factor->!factor.metric().eligible(sector)))throw ApiFailure.invalid();
        var eligible=captured.inputs().companies().stream().filter(company->company.member().sector()==sector)
                .map(company->company.member().companyId()).toList();
        if(!eligible.containsAll(spec.companyIds()))throw new ApiFailure(422,"PEER_SECTOR_REQUIRED");
    }

    private static View view(Stored stored,StockScreens.Stored run,DiscoveryUniverse.Sector sector){
        if(!stored.method().equals(METHOD))throw new IllegalStateException("Unsupported stored ranking method");
        var spec=stored.spec();
        var peers=run.inputs().companies().stream().filter(company->spec.companyIds().contains(company.member().companyId()))
                .map(company->new Peer(company.member(),spec.factors().stream()
                        .map(factor->company.readings().stream().filter(reading->reading.metric()==factor.metric()).findFirst().orElseThrow())
                        .toList())).toList();
        var complete=peers.stream().filter(Peer::complete).toList();
        int sumWeights=spec.factors().stream().mapToInt(Factor::weight).sum();
        int factorDenominator=2*(complete.size()-1);
        int scoreDenominator=factorDenominator*sumWeights;
        var scores=peers.stream().map(peer->score(peer,complete,spec.factors(),factorDenominator,sumWeights))
                .sorted(Comparator.comparing(Score::total,Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(score->score.peer().member().companyId())).toList();
        var rows=new ArrayList<Row>();
        Integer previous=null;
        int rank=0;
        for(int i=0;i<scores.size();i++){
            var score=scores.get(i);
            Integer total=score.total();
            if(total!=null&&!total.equals(previous))rank=i+1;
            String status=total!=null?"RANKED":score.peer().complete()?"INSUFFICIENT_PEERS":"MISSING_FACTOR";
            rows.add(new Row(score.peer().member(),total==null?null:rank,total==null?null:percent(total,scoreDenominator),status,
                    score.contributions()));
            previous=total;
        }
        return new View(stored.id(),run.id(),stored.method(),sector,spec,complete.size(),List.copyOf(rows),stored.createdAt());
    }

    private static Score score(Peer peer,List<Peer> complete,List<Factor> factors,int denominator,int sumWeights){
        boolean rankable=peer.complete()&&complete.size()>=2;
        var result=new ArrayList<Contribution>();
        int total=0;
        for(int index=0;index<factors.size();index++){
            var factor=factors.get(index);
            var reading=peer.readings().get(index);
            if(!rankable){
                result.add(new Contribution(factor,reading.reason(),reading.fact(),null,null,false));
                continue;
            }
            int twiceRank=twiceRank(peer,complete,index,factor.direction());
            int weighted=twiceRank*factor.weight();
            total+=weighted;
            result.add(new Contribution(factor,reading.reason(),reading.fact(),percent(twiceRank,denominator),
                    percent(weighted,denominator*sumWeights),twiceRank*2<denominator));
        }
        return new Score(peer,rankable?total:null,List.copyOf(result));
    }

    private static int twiceRank(Peer peer,List<Peer> complete,int index,String direction){
        var actual=new BigDecimal(peer.readings().get(index).fact().normalizedAmount());
        int value=0;
        for(var other:complete){
            if(peer==other)continue;
            int comparison=actual.compareTo(new BigDecimal(other.readings().get(index).fact().normalizedAmount()));
            if(direction.equals("LOWER"))comparison=-comparison;
            value+=comparison>0?2:comparison==0?1:0;
        }
        return value;
    }

    private static String percent(int numerator,int denominator){
        return FactPolicy.decimal(BigDecimal.valueOf(numerator*100L).divide(BigDecimal.valueOf(denominator),4,RoundingMode.HALF_UP));
    }

    private Stored stored(ResultSet row,int index)throws SQLException{
        return new Stored(row.getObject("rank_id",UUID.class),row.getObject("run_id",UUID.class),row.getString("methodology"),
                json.readValue(row.getString("specification"),Specification.class),SourceDocuments.instant(row,"created_at"));
    }
}
