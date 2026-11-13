package dev.finn.research;

import dev.finn.identity.CurrentUser;
import dev.finn.platform.ApiFailure;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;

@Service
class OrderContext {
    record Size(String amount, String execution, UUID anchorId, FinancialFacts.Fact revenue, String percent) {}
    record Input(@NotNull UUID versionId,@NotNull UUID anchorId,@NotNull UUID revenueFactId,
                 @NotNull @Min(1) @Max(50) Integer revenueRevision,@NotNull JsonNode amount,
                 @NotNull FactPolicy.Scale scale,@NotBlank @jakarta.validation.constraints.Size(max=160) String execution,
                 @NotNull @AssertTrue Boolean reviewed) {}
    record View(Size order) {}
    private record Saved(BigDecimal amount,String execution,UUID anchor,UUID revenue,int revision) {}
    private final JdbcTemplate jdbc;
    private final CurrentUser users;
    private final CompanyEvents events;
    private final ResearchEvidence evidence;
    private final FinancialFacts facts;
    private final FactEvaluation evaluation;

    OrderContext(JdbcTemplate jdbc,CurrentUser users,CompanyEvents events,ResearchEvidence evidence,
                 FinancialFacts facts,FactEvaluation evaluation){
        this.jdbc=jdbc;this.users=users;this.events=events;this.evidence=evidence;this.facts=facts;this.evaluation=evaluation;
    }

    @Transactional public View read(UUID id){
        var owner=users.requireId();
        return new View(find(owner,events.current(owner,id).versionId()));
    }

    @Transactional public View save(UUID id,Input input){
        var owner=users.requireId();
        var event=events.current(owner,id);
        if(!event.versionId().equals(input.versionId())||!event.subtype().equals("ORDER"))throw ApiFailure.conflict();
        var anchor=evidence.require(owner,input.anchorId());
        if(!event.documentId().equals(anchor.documentId())||event.documentRevision()!=anchor.documentRevision())
            throw ApiFailure.notFound();
        var printed=FactPolicy.parseAmount(input.amount());
        if(printed.signum()<=0||!FactPolicy.containsAmount(anchor.quote(),printed))throw ApiFailure.invalid();
        var revenue=facts.require(owner,input.revenueFactId(),null);
        var d=revenue.dimensions();
        if(revenue.revision()!=input.revenueRevision()||!event.companyId().equals(revenue.companyId())
                ||!d.metric().equals("REVENUE")||!d.basis().equals("CONSOLIDATED")||!d.periodKind().equals("FULL_YEAR")
                ||!"INR".equals(d.currency())||new BigDecimal(revenue.normalizedAmount()).signum()<=0
                ||anchor.publishedAt()==null||revenue.publishedAt()==null
                ||Instant.parse(revenue.publishedAt()).isAfter(Instant.parse(anchor.publishedAt()))
                ||!evaluation.usable(owner,revenue,LocalDate.now(FactPolicy.INDIA),false).equals("COMPARABLE_FACT"))
            throw ApiFailure.invalid();
        var amount=input.scale().normalize(printed);
        var execution=input.execution().strip();
        if(execution.codePoints().anyMatch(Character::isISOControl))throw ApiFailure.invalid();
        int inserted=jdbc.update("""
                INSERT INTO finn.event_order_context(owner_id,event_version_id,amount_inr,execution,anchor_id,revenue_fact_id,revenue_revision)
                VALUES (?,?,?,?,?,?,?) ON CONFLICT DO NOTHING
                """,owner,event.versionId(),amount,execution,input.anchorId(),revenue.factId(),revenue.revision());
        var result=find(owner,event.versionId());
        if(inserted==0&&(result==null||!result.amount().equals(FactPolicy.decimal(amount))||!result.execution().equals(execution)
                ||!result.anchorId().equals(input.anchorId())||!result.revenue().factId().equals(revenue.factId())
                ||result.revenue().revision()!=revenue.revision()))throw ApiFailure.conflict();
        return new View(result);
    }

    Size find(UUID owner,UUID version){
        var saved=jdbc.query("""
                SELECT amount_inr,execution,anchor_id,revenue_fact_id,revenue_revision
                FROM finn.event_order_context WHERE owner_id=? AND event_version_id=?
                """,(row,i)->new Saved(row.getBigDecimal(1),row.getString(2),row.getObject(3,UUID.class),
                row.getObject(4,UUID.class),row.getInt(5)),owner,version).stream().findFirst().orElse(null);
        if(saved==null)return null;
        var revenue=facts.require(owner,saved.revenue(),saved.revision());
        var ratio=saved.amount().movePointRight(2).divide(new BigDecimal(revenue.normalizedAmount()),6,RoundingMode.HALF_EVEN);
        return new Size(FactPolicy.decimal(saved.amount()),saved.execution(),saved.anchor(),revenue,FactPolicy.decimal(ratio));
    }
}

@RestController
@RequestMapping("/api/v1/research/events/{id}/order")
class OrderContextController {
    private final OrderContext orders;
    OrderContextController(OrderContext orders){this.orders=orders;}
    @GetMapping OrderContext.View read(@PathVariable UUID id){return orders.read(id);}
    @PostMapping OrderContext.View save(@PathVariable UUID id,@Valid @RequestBody OrderContext.Input input){return orders.save(id,input);}
}
