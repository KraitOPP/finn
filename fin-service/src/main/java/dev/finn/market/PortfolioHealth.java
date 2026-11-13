package dev.finn.market;

import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import dev.finn.portfolio.Portfolios;
import dev.finn.ledger.Journal;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class PortfolioHealth {
    record Holding(UUID securityId,String name,String sector,String value,String equityWeight,String unrealisedContribution) {}
    record Sector(String sector,String value,String equityWeight) {}
    record ExposureEvidence(UUID companyId,String companyName,UUID anchorId) {}
    record SharedExposure(String name,int companies,String equityWeight,List<ExposureEvidence> evidence) {}
    record EventImpact(UUID companyId,String companyName,String equityWeight,List<UUID> securities) {}
    record Current(UUID portfolioId,LocalDate asOf,LocalDate priceSession,String state,String currency,int unpricedPositions,
                   int stalePositions,int providerEstimates,String equity,String cash,String largestWeight,String topFiveWeight,
                   List<Holding> holdings,List<Sector> sectors,List<SharedExposure> sharedExposures,List<EventImpact> eventImpact) {}
    record Assumptions(UUID listingId,BigDecimal cashAllocation,BigDecimal shockPercent) {}
    record SectorScenario(UUID portfolioId,String state,LocalDate priceSession,String sector,String shockPercent,
                          String beforeEquity,String afterEquity,String valueChange,String affectedEquityWeight) {}
    record Scenario(UUID portfolioId,String state,LocalDate priceSession,UUID listingId,String targetName,String cashAllocation,
                    String shockPercent,String beforeEquity,String afterEquity,String beforeCash,String afterCash,
                    String beforeTotal,String afterTotal,String valueChange,String beforeTargetWeight,String afterTargetWeight) {}
    private record HoldingInput(UUID id,String name,String sector,BigDecimal value,BigDecimal unrealised) {
        HoldingInput add(Valuations.Holding holding){
            return new HoldingInput(id,name,sector,sum(value,number(holding.value())),sum(unrealised,number(holding.unrealisedPnl())));
        }
    }
    private record Exposure(String state,LocalDate date,LocalDate session,int unpriced,int stale,int estimates,BigDecimal cash,
                            BigDecimal equity,Map<UUID,HoldingInput> holdings) {}

    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final Portfolios portfolios;
    private final Valuations values;
    private final Journal journal;
    private final Catalogue catalogue;

    PortfolioHealth(JdbcTemplate jdbc,CurrentUser users,Portfolios portfolios,Valuations values,Journal journal,Catalogue catalogue){
        this.jdbc=jdbc;this.users=users;this.portfolios=portfolios;this.values=values;this.journal=journal;this.catalogue=catalogue;
    }

    @Transactional public Current health(UUID portfolio){
        var owner=users.requireId();
        var exposure=exposure(owner,portfolio);
        var equity=exposure.equity();
        var inputs=exposure.holdings().values().stream().sorted(Comparator
                .comparing(HoldingInput::value,Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(HoldingInput::id)).toList();
        var holdings=inputs.stream().map(item->new Holding(item.id(),item.name(),item.sector(),text(item.value()),
                weight(item.value(),equity),text(item.unrealised()))).toList();
        var sectors=new HashMap<String,BigDecimal>();
        if(equity!=null){
            for(var item:inputs)sectors.merge(item.sector(),item.value(),BigDecimal::add);
        }
        var sectorRows=sectors.entrySet().stream().sorted(Map.Entry.<String,BigDecimal>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
                .map(entry->new Sector(entry.getKey(),text(entry.getValue()),weight(entry.getValue(),equity))).toList();
        String largest=holdings.isEmpty()?null:holdings.getFirst().equityWeight();
        String topFive=equity==null?null:weight(inputs.stream().limit(5).map(HoldingInput::value).reduce(BigDecimal.ZERO,BigDecimal::add),equity);
        return new Current(portfolio,exposure.date(),exposure.session(),exposure.state(),"INR",exposure.unpriced(),exposure.stale(),
                exposure.estimates(),text(equity),text(exposure.cash()),largest,topFive,holdings,sectorRows,
                shared(owner,exposure),companyImpact(owner,exposure));
    }

    @Transactional public SectorScenario sectorScenario(UUID portfolio,String sector,BigDecimal shock){
        var exposure=exposure(users.requireId(),portfolio);
        var equity=exposure.equity();
        var affected=exposure.holdings().values().stream().filter(item->sector.equals(item.sector())).toList();
        if(equity==null||affected.isEmpty())return new SectorScenario(portfolio,
                equity==null?exposure.state():"TARGET_NOT_HELD",exposure.session(),sector,text(shock),text(equity),null,null,null);
        var position=affected.stream().map(HoldingInput::value).reduce(BigDecimal.ZERO,BigDecimal::add);
        var change=position.multiply(shock.movePointLeft(2));
        return new SectorScenario(portfolio,"SIMULATED",exposure.session(),sector,text(shock),text(equity),
                text(equity.add(change)),text(change),weight(position,equity));
    }

    @Transactional public Scenario simulate(UUID portfolio,Assumptions input){
        UUID owner=users.requireId();
        var exposure=exposure(owner,portfolio);
        var listing=catalogue.listing(owner,input.listingId());
        String name=catalogue.security(owner,listing.securityId()).name();
        var equity=exposure.equity();
        var cash=exposure.cash();
        var allocation=input.cashAllocation();
        if(equity==null)return scenario(portfolio,input,exposure,exposure.state(),name,null,null,null,null);
        if(allocation.signum()>0&&(cash==null||cash.compareTo(allocation)<0))
            return scenario(portfolio,input,exposure,cash==null?"CASH_UNKNOWN":"INSUFFICIENT_CASH",name,null,null,null,null);
        var held=exposure.holdings().get(listing.securityId());
        var target=held==null?BigDecimal.ZERO:held.value();
        if(target.signum()==0&&allocation.signum()==0)
            return scenario(portfolio,input,exposure,"TARGET_NOT_HELD",name,null,null,null,null);
        var afterTarget=target.add(allocation).multiply(BigDecimal.ONE.add(input.shockPercent().movePointLeft(2)));
        var afterEquity=equity.subtract(target).add(afterTarget);
        var afterCash=cash==null?null:cash.subtract(allocation);
        return scenario(portfolio,input,exposure,"SIMULATED",name,afterEquity,afterCash,target,afterTarget);
    }

    private Exposure exposure(UUID owner,UUID portfolio){
        var detail=portfolios.detail(owner,portfolio);
        var today=MarketPrices.today();
        if(detail.accounts().isEmpty())return unavailable("NO_ACCOUNTS",today);
        if(!values.withinBudget(owner,portfolio))return unavailable("PORTFOLIO_BUDGET",today);
        var holdings=new ArrayList<Valuations.Holding>();
        BigDecimal cash=BigDecimal.ZERO;
        for(var account:detail.accounts()){
            UUID id=account.accountId();
            var accountValue=values.calculate(owner,id,today,journal.currentRevision(owner,id),false);
            if(holdings.size()+accountValue.holdings().size()>500)return unavailable("PORTFOLIO_BUDGET",today);
            holdings.addAll(accountValue.holdings());
            var balance=number(accountValue.totals().cashBalance());
            cash=balance!=null&&balance.signum()>=0?sum(cash,balance):null;
        }
        int unpriced=0,stale=0,estimates=0;
        var sessions=new java.util.HashSet<LocalDate>();
        var classifications=sectorLabels(owner);
        Map<UUID,HoldingInput> grouped=new HashMap<>();
        for(var holding:holdings){
            var price=holding.observation();
            if(price==null)unpriced++;
            else{
                if(holding.priceStatus().equals("STALE"))stale++;
                if(price.source().equals("YAHOO_YFINANCE"))estimates++;
                sessions.add(price.sessionDate());
            }
            grouped.compute(holding.securityId(),(id,current)->{
                if(current!=null)return current.add(holding);
                return new HoldingInput(id,holding.securityName()==null?"Unresolved security":holding.securityName(),
                        classifications.getOrDefault(id,"UNCLASSIFIED"),number(holding.value()),number(holding.unrealisedPnl()));
            });
        }
        String state=unpriced>0?"PRICES_MISSING":stale>0?"STALE_PRICES":sessions.size()>1?"MIXED_PRICE_SESSIONS":"READY";
        BigDecimal equity=state.equals("READY")?grouped.values().stream().map(HoldingInput::value).reduce(BigDecimal.ZERO,BigDecimal::add):null;
        return new Exposure(state,today,sessions.size()==1?sessions.iterator().next():null,unpriced,stale,estimates,cash,equity,Map.copyOf(grouped));
    }

    private Map<UUID,String> sectorLabels(UUID owner){
        var labels=new HashMap<UUID,String>();
        jdbc.query("""
                SELECT s.security_id,m.sector FROM finn.security s JOIN finn.discovery_member m USING(owner_id,company_id)
                WHERE s.owner_id=?
                """,row->{labels.put(row.getObject("security_id",UUID.class),row.getString("sector"));},owner);
        return labels;
    }

    private List<EventImpact> companyImpact(UUID owner,Exposure exposure){
        if(exposure.holdings().isEmpty())return List.of();
        record Company(UUID id,String name) {}
        Map<UUID,Company> companies=new HashMap<>();
        jdbc.query("""
                SELECT s.security_id,c.company_id,c.name FROM finn.security s JOIN finn.company c USING(owner_id,company_id)
                WHERE s.owner_id=? AND s.security_id=ANY(?::uuid[])
                """,row->{companies.put(row.getObject(1,UUID.class),new Company(row.getObject(2,UUID.class),row.getString(3)));},
                owner,securityArray(exposure));
        var groups=new HashMap<UUID,List<HoldingInput>>();
        for(var holding:exposure.holdings().values()){
            var company=companies.get(holding.id());
            if(company!=null)groups.computeIfAbsent(company.id(),key->new ArrayList<>()).add(holding);
        }
        return groups.entrySet().stream().map(entry->{
            var held=entry.getValue();
            var company=companies.get(held.getFirst().id());
            var value=exposure.equity()==null?null:held.stream().map(HoldingInput::value).reduce(BigDecimal.ZERO,BigDecimal::add);
            return new EventImpact(entry.getKey(),company.name(),weight(value,exposure.equity()),
                    held.stream().map(HoldingInput::id).sorted().toList());
        }).sorted(Comparator.comparing(EventImpact::companyName).thenComparing(EventImpact::companyId)).toList();
    }

    private List<SharedExposure> shared(UUID owner,Exposure exposure){
        if(exposure.holdings().isEmpty())return List.of();
        record Note(String label,UUID security,ExposureEvidence evidence) {}
        var notes=jdbc.query("""
                SELECT n.title,n.company_id,c.name,n.anchor_id,s.security_id
                FROM finn.company_research_note n JOIN finn.company c USING(owner_id,company_id)
                JOIN finn.security s USING(owner_id,company_id)
                JOIN finn.research_anchor a ON a.owner_id=n.owner_id AND a.anchor_id=n.anchor_id
                JOIN finn.research_extraction x ON x.owner_id=a.owner_id AND x.extraction_id=a.extraction_id
                JOIN finn.source_document d ON d.owner_id=x.owner_id AND d.document_id=x.document_id
                WHERE n.owner_id=? AND n.kind='EXPOSURE' AND d.revision=x.document_revision AND s.security_id=ANY(?::uuid[])
                ORDER BY lower(n.title),n.note_id,s.security_id LIMIT 1000
                """,(row,i)->new Note(row.getString(1),row.getObject(5,UUID.class),new ExposureEvidence(
                row.getObject(2,UUID.class),row.getString(3),row.getObject(4,UUID.class))),owner,
                securityArray(exposure));
        var groups=new java.util.TreeMap<String,List<Note>>();
        for(var note:notes)groups.computeIfAbsent(note.label().strip().toLowerCase(java.util.Locale.ROOT),key->new ArrayList<>()).add(note);
        var result=new ArrayList<SharedExposure>();
        for(var group:groups.values()){
            var evidence=new java.util.LinkedHashMap<UUID,ExposureEvidence>();
            for(var note:group)evidence.putIfAbsent(note.evidence().companyId(),note.evidence());
            if(evidence.size()<2)continue;
            var value=exposure.equity()==null?null:group.stream().map(Note::security).distinct()
                    .map(exposure.holdings()::get).map(HoldingInput::value).reduce(BigDecimal.ZERO,BigDecimal::add);
            result.add(new SharedExposure(group.getFirst().label(),evidence.size(),weight(value,exposure.equity()),
                    evidence.values().stream().limit(50).toList()));
        }
        return result.stream().limit(25).toList();
    }

    private static String securityArray(Exposure exposure){
        return exposure.holdings().keySet().stream().map(UUID::toString)
                .collect(java.util.stream.Collectors.joining(",","{","}"));
    }

    private static Exposure unavailable(String reason,LocalDate today){
        return new Exposure(reason,today,null,0,0,0,null,null,Map.of());
    }

    private static Scenario scenario(UUID portfolio,Assumptions input,Exposure exposure,String state,String name,
                                     BigDecimal afterEquity,BigDecimal afterCash,BigDecimal target,BigDecimal afterTarget){
        var beforeTotal=sum(exposure.equity(),exposure.cash());
        var afterTotal=sum(afterEquity,afterCash);
        String change=afterTarget==null?null:text(afterTarget.subtract(target).subtract(input.cashAllocation()));
        return new Scenario(portfolio,state,exposure.session(),input.listingId(),name,text(input.cashAllocation()),text(input.shockPercent()),
                text(exposure.equity()),text(afterEquity),text(exposure.cash()),text(afterCash),text(beforeTotal),text(afterTotal),change,
                weight(target,exposure.equity()),weight(afterTarget,afterEquity));
    }

    private static BigDecimal sum(BigDecimal first,BigDecimal second){
        return first==null||second==null?null:first.add(second);
    }

    private static String weight(BigDecimal value,BigDecimal equity){
        return value==null||equity==null||equity.signum()<=0?null:text(value.movePointRight(2).divide(equity,6,RoundingMode.HALF_EVEN));
    }

    private static BigDecimal number(String value){return value==null?null:new BigDecimal(value);}
    private static String text(BigDecimal value){return value==null?null:PortfolioReturnMath.decimal(value);}
}
