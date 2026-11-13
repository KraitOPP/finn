
package dev.finn.research;

import java.util.Locale;
import java.util.regex.Pattern;

final class EventClassifier {
    enum Subtype {
        RESULTS("EARNINGS"), RESULTS_MEETING("EARNINGS"), BUYBACK("CAPITAL"), CAPITAL_RAISE("CAPITAL"),
        AUDITOR("GOVERNANCE"), GOVERNANCE("GOVERNANCE"), DIVIDEND("CORPORATE_ACTION"),
        SPLIT_BONUS("CORPORATE_ACTION"), MERGER("CORPORATE_ACTION"), ACQUISITION("CORPORATE_ACTION"),
        ORDER("ORDERS"), RATING_DOWNGRADE("CREDIT"), RATING_CHANGE("CREDIT"),
        MANAGEMENT_CHANGE("GOVERNANCE"), REGULATORY("REGULATORY"), GUIDANCE_CUT("OUTLOOK"),
        GUIDANCE_UPDATE("OUTLOOK"), OTHER("OTHER");

        final String category;
        Subtype(String category) { this.category = category; }
    }
    record Hint(String category,String subtype,String stage,String materiality,String novelty,String confidence) {}

    private static final Pattern CAPITAL = Pattern.compile("\\b(fund rais(e|ing)|capital rais(e|ing)|preferential issue|qualified institutional placement|rights issue)\\b");
    private static final Pattern BUYBACK = Pattern.compile("\\b(buy[ -]?back|share repurchase)\\b");
    private static final Pattern RESULTS = Pattern.compile("\\b(financial results|quarterly results|annual results|earnings results)\\b");
    private static final Pattern ORDER = Pattern.compile("\\b(order win|order received|award of (an? )?(order|contract)|contract award|letter of award|work order)\\b");
    private static final Pattern MANAGEMENT = Pattern.compile("\\b(appointment|resignation|retirement) of (the )?(a |an )?(chief|director|ceo|cfo|managing director)\\b");

    private EventClassifier() {}

    static Hint suggest(String title) {
        String value = title.toLowerCase(Locale.ROOT);
        boolean meeting = value.contains("meeting") || value.contains("intimation");
        if (value.contains("auditor")) return hint(Subtype.AUDITOR,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("credit rating") || value.contains("credit-rating"))
            return hint(value.contains("downgrad")?Subtype.RATING_DOWNGRADE:Subtype.RATING_CHANGE,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("guidance"))
            return hint(value.matches(".*\\b(cut|lowers?|reduced?|reduction|downgraded?)\\b.*")?Subtype.GUIDANCE_CUT:Subtype.GUIDANCE_UPDATE,
                    "UNKNOWN","MEDIUM","UNKNOWN");
        if (ORDER.matcher(value).find()) return hint(Subtype.ORDER,"UNKNOWN","MEDIUM","UNKNOWN");
        if (MANAGEMENT.matcher(value).find()) return hint(Subtype.MANAGEMENT_CHANGE,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("regulatory action") || value.contains("regulatory approval") || value.contains("show cause notice"))
            return hint(Subtype.REGULATORY,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("acquisition")) return hint(Subtype.ACQUISITION,"UNKNOWN","HIGH","UNKNOWN");
        if (BUYBACK.matcher(value).find()) return hint(Subtype.BUYBACK,"UNKNOWN","MEDIUM","UNKNOWN");
        if (CAPITAL.matcher(value).find()) return hint(Subtype.CAPITAL_RAISE,"UNKNOWN","MEDIUM","UNKNOWN");
        if (RESULTS.matcher(value).find()) {
            if ((meeting && !value.contains("outcome")) || value.contains("newspaper advertisement"))
                return hint(Subtype.RESULTS_MEETING,"ANNOUNCED","LOW","ROUTINE");
            return hint(Subtype.RESULTS,"UNKNOWN","MEDIUM","UNKNOWN");
        }
        if (value.contains("dividend")) return hint(Subtype.DIVIDEND,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("split") || value.contains("bonus issue")) return hint(Subtype.SPLIT_BONUS,"UNKNOWN","MEDIUM","UNKNOWN");
        if (value.contains("merger") || value.contains("demerger") || value.contains("amalgamation"))
            return hint(Subtype.MERGER,"UNKNOWN","HIGH","UNKNOWN");
        if (value.contains("director") || value.contains("governance")) return hint(Subtype.GOVERNANCE,"UNKNOWN","MEDIUM","UNKNOWN");
        return hint(Subtype.OTHER,"UNKNOWN","UNKNOWN","UNKNOWN");
    }

    private static Hint hint(Subtype subtype,String stage,String materiality,String novelty) {
        return new Hint(subtype.category,subtype.name(),stage,materiality,novelty,subtype==Subtype.OTHER ? "UNKNOWN" : "TITLE_HINT");
    }
}
