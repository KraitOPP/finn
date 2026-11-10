package dev.finn.portfolio;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import dev.finn.identity.CurrentUser;
import dev.finn.instruments.Catalogue;
import dev.finn.platform.ApiFailure;
import dev.finn.platform.AuditTrail;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class Portfolios {
    public record Portfolio(UUID portfolioId,String name,String currency,boolean archived,long revision) {}
    public record Account(UUID accountId,UUID portfolioId,String name,String source,String currency,String historyStatus,LocalDate historyStartDate) {}
    public record PortfolioList(List<Portfolio> items) {}
    public record Detail(Portfolio portfolio,List<Account> accounts) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final AuditTrail audit;
    public Portfolios(JdbcTemplate jdbc,CurrentUser users,AuditTrail audit){this.jdbc=jdbc;this.users=users;this.audit=audit;}
    private Portfolio portfolioRow(ResultSet row,int index)throws SQLException{return new Portfolio(row.getObject("portfolio_id",UUID.class),row.getString("name"),row.getString("currency"),row.getBoolean("archived"),row.getLong("revision"));}
    private Account accountRow(ResultSet row,int index)throws SQLException{return new Account(row.getObject("account_id",UUID.class),row.getObject("portfolio_id",UUID.class),row.getString("name"),row.getString("source"),row.getString("currency"),row.getString("history_status"),row.getObject("history_start_date",LocalDate.class));}
    @Transactional public PortfolioList list(){return new PortfolioList(jdbc.query("SELECT * FROM finn.portfolio WHERE owner_id=? ORDER BY created_at,portfolio_id LIMIT 100",this::portfolioRow,users.requireId()));}
    public Portfolio require(UUID owner,UUID id,boolean active,boolean sharedLock){
        Portfolio result=jdbc.query("SELECT * FROM finn.portfolio WHERE owner_id=? AND portfolio_id=?"+(sharedLock?" FOR SHARE":""),this::portfolioRow,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(active && result.archived())throw new ApiFailure(409,"PORTFOLIO_ARCHIVED");
        return result;
    }
    public Account requireAccount(UUID owner,UUID portfolio,UUID id,boolean writable){
        // Consistent lock order: portfolio SHARE, then account UPDATE. Archive obtains portfolio UPDATE.
        require(owner,portfolio,writable,writable);
        return jdbc.query("SELECT * FROM finn.investment_account WHERE owner_id=? AND portfolio_id=? AND account_id=?"+(writable?" FOR UPDATE":""),this::accountRow,owner,portfolio,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
    }
    @Transactional public Portfolio create(String name){
        UUID owner=users.requireId(),id=UUID.randomUUID();
        jdbc.queryForList("SELECT user_id FROM finn.app_user WHERE user_id=? FOR UPDATE",owner);
        if(jdbc.queryForObject("SELECT count(*) FROM finn.portfolio WHERE owner_id=?",Integer.class,owner)>=100)throw new ApiFailure(409,"PORTFOLIO_LIMIT_REACHED");
        jdbc.update("INSERT INTO finn.portfolio(portfolio_id,owner_id,name,currency) VALUES (?,?,?,'INR')",id,owner,Catalogue.cleanName(name));
        audit.record(AuditTrail.Action.PORTFOLIO_CREATED,owner,id);
        return require(owner,id,false,false);
    }
    @Transactional public Detail detail(UUID id){
        UUID owner=users.requireId();
        return new Detail(require(owner,id,false,false),jdbc.query("SELECT * FROM finn.investment_account WHERE owner_id=? AND portfolio_id=? ORDER BY created_at,account_id LIMIT 100",this::accountRow,owner,id));
    }
    @Transactional public Account account(UUID portfolio,UUID id){return requireAccount(users.requireId(),portfolio,id,false);}
    @Transactional public Account createAccount(UUID portfolio,String name,String source,String currency){
        UUID owner=users.requireId(),id=UUID.randomUUID();
        // Serialise account creation under this portfolio to keep the explicit account bound deterministic.
        Portfolio parent=jdbc.query("SELECT * FROM finn.portfolio WHERE owner_id=? AND portfolio_id=? FOR UPDATE",this::portfolioRow,owner,portfolio).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(parent.archived())throw new ApiFailure(409,"PORTFOLIO_ARCHIVED");
        if(!Set.of("GROWW","MANUAL","OTHER").contains(source)||!"INR".equals(currency))throw ApiFailure.invalid();
        if(jdbc.queryForObject("SELECT count(*) FROM finn.investment_account WHERE owner_id=? AND portfolio_id=?",Integer.class,owner,portfolio)>=100)throw new ApiFailure(409,"ACCOUNT_LIMIT_REACHED");
        jdbc.update("INSERT INTO finn.investment_account(account_id,owner_id,portfolio_id,name,source,currency) VALUES (?,?,?,?,?,'INR')",id,owner,portfolio,Catalogue.cleanName(name),source);
        audit.record(AuditTrail.Action.ACCOUNT_CREATED,owner,id);
        return requireAccount(owner,portfolio,id,false);
    }
    @Transactional public Portfolio archive(UUID id,boolean archived,long revision){
        UUID owner=users.requireId();
        Portfolio current=jdbc.query("SELECT * FROM finn.portfolio WHERE owner_id=? AND portfolio_id=? FOR UPDATE",this::portfolioRow,owner,id).stream().findFirst().orElseThrow(ApiFailure::notFound);
        if(current.revision()!=revision)throw ApiFailure.conflict();
        if(current.archived()==archived)return current;
        jdbc.update("UPDATE finn.portfolio SET archived=?,revision=revision+1 WHERE owner_id=? AND portfolio_id=?",archived,owner,id);
        audit.record(archived?AuditTrail.Action.PORTFOLIO_ARCHIVED:AuditTrail.Action.PORTFOLIO_RESTORED,owner,id);
        return require(owner,id,false,false);
    }
}
