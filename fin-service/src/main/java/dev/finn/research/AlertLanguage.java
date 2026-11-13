package dev.finn.research;

import dev.finn.platform.ApiFailure;
import java.math.BigDecimal;
import java.util.*;
import java.util.regex.Pattern;

final class AlertLanguage {
    enum Kind { EVENT, REVENUE_MARGIN }
    enum Scope { ALL, HOLDINGS, WATCHLIST }
    enum Cadence { IMMEDIATE, DAILY, WEEKLY }
    record Criteria(Kind kind,Scope scope,EventClassifier.Subtype eventType,String growthPercent,Cadence cadence) {}
    record Preview(String sentence,Criteria criteria,String summary,String schedule,String coverage) {}
    private static final Pattern GROWTH=Pattern.compile("\\brevenue growth (?:above|over|greater than) ([0-9]{1,3}(?:\\.[0-9]{1,4})?)\\s*(?:%|percent)(?![a-z0-9])");
    private static final Pattern IMPROVING=Pattern.compile("\\bimprov(?:ing|ed|es?) operating margins?\\b|\\boperating margins? (?:improv(?:ing|ed|es?)|rising|increased?)\\b");
    private static final Pattern NEGATED=Pattern.compile("\\b(?:never|unless|except|without|not|exclude|either|or|at least|below|less than|declin\\w*)\\b");
    private static final Pattern HOLDINGS=Pattern.compile("\\b(?:holdings?|held|portfolio)\\b");
    private static final Pattern WATCHLIST=Pattern.compile("\\bwatchlist(?:s|ed)?\\b");
    private static final Map<EventClassifier.Subtype,Pattern> EVENTS=Map.of(
            EventClassifier.Subtype.RATING_DOWNGRADE,Pattern.compile("\\b(?:credit[ -]rating downgrades?|credit downgrades?|downgraded credit rating)\\b"),
            EventClassifier.Subtype.ORDER,Pattern.compile("\\b(?:significant|large|major|material) (?:orders?|contracts?)\\b|\\b(?:orders?|contracts?) (?:awarded|won)\\b"),
            EventClassifier.Subtype.GUIDANCE_CUT,Pattern.compile("\\b(?:reduces?|cuts?|lowers?) (?:its |their |earnings )?guidance\\b|\\bguidance (?:cut|reduction|lowered)\\b"),
            EventClassifier.Subtype.RESULTS,Pattern.compile("\\b(?:quarterly|annual|financial|earnings) results\\b"),
            EventClassifier.Subtype.MANAGEMENT_CHANGE,Pattern.compile("\\b(?:management change|ceo (?:resigns|appointed))\\b"),
            EventClassifier.Subtype.ACQUISITION,Pattern.compile("\\b(?:acquisition|acquires)\\b"),
            EventClassifier.Subtype.REGULATORY,Pattern.compile("\\b(?:regulatory (?:action|development|approval)|show cause notice)\\b"));

    private AlertLanguage() {}

    static Preview interpret(String sentence,Cadence cadence) {
        if(sentence==null||cadence==null||sentence.codePoints().anyMatch(Character::isISOControl))throw ApiFailure.invalid();
        String query=sentence.toLowerCase(Locale.ROOT).strip().replaceAll("\\s+"," ").replaceAll("[‐‑–]","-");
        if(NEGATED.matcher(query).find())throw new ApiFailure(422,"ALERT_LANGUAGE_UNSUPPORTED");
        boolean held=HOLDINGS.matcher(query).find(), watched=WATCHLIST.matcher(query).find();
        if(held&&watched)throw new ApiFailure(422,"ALERT_LANGUAGE_UNSUPPORTED");
        Scope scope=held?Scope.HOLDINGS:watched?Scope.WATCHLIST:Scope.ALL;
        var match=GROWTH.matcher(query);
        var types=EVENTS.entrySet().stream().filter(row->row.getValue().matcher(query).find()).map(Map.Entry::getKey).toList();
        Criteria criteria;
        if(match.find()&&IMPROVING.matcher(query).find()&&types.stream().allMatch(type->type==EventClassifier.Subtype.RESULTS)){
            var threshold=new BigDecimal(match.group(1));
            if(threshold.signum()<=0)throw ApiFailure.invalid();
            criteria=new Criteria(Kind.REVENUE_MARGIN,scope,null,FactPolicy.decimal(threshold),cadence);
        }else if(types.size()==1&&!query.contains("revenue")&&!query.contains("margin")&&!query.contains("%")
                &&!query.matches(".*\\d.*")&&!query.contains(" and ")){
            criteria=new Criteria(Kind.EVENT,scope,types.getFirst(),null,cadence);
        }else throw new ApiFailure(422,"ALERT_LANGUAGE_UNSUPPORTED");
        return describe(sentence.strip(),criteria);
    }

    static Preview describe(String sentence,Criteria criteria) {
        String audience=switch(criteria.scope()){case HOLDINGS->"Recorded holdings";case WATCHLIST->"Watchlisted companies";case ALL->"Saved companies";};
        String condition=criteria.kind()==Kind.EVENT?switch(criteria.eventType()){
            case ORDER -> "a high-materiality contract or order award";
            case RATING_DOWNGRADE -> "a credit-rating downgrade";
            case GUIDANCE_CUT -> "a guidance reduction";
            case RESULTS -> "published financial results";
            case MANAGEMENT_CHANGE -> "a management change";
            case ACQUISITION -> "an acquisition";
            case REGULATORY -> "a regulatory development";
            default -> throw ApiFailure.invalid();
        }:"consolidated INR quarterly revenue growth above "+criteria.growthPercent()+"% year over year and a higher operating margin";
        String schedule=switch(criteria.cadence()){
            case IMMEDIATE -> "After matching evidence is reviewed";
            case DAILY -> "Daily digest at 9:00 am India time";
            case WEEKLY -> "Monday digest at 9:00 am India time";
        };
        return new Preview(sentence,criteria,audience+" with "+condition,schedule,
                criteria.kind()==Kind.EVENT?"Reviewed primary company events":"Reviewed current filings and comparable prior-year figures");
    }
}
