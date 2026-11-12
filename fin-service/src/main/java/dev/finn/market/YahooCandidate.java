
package dev.finn.market;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.util.*;
import tools.jackson.databind.JsonNode;

/** Revalidates the internal adapter output before any private price is committed. */
final class YahooCandidate {
    record Bar(LocalDate date, BigDecimal close, String payload) {}
    record Result(String status, List<Bar> bars) {}
    private YahooCandidate() {}

    static Result parse(JsonNode node, MarketPrices.Fetch request) {
        try {
            require("0.1.0".equals(string(node,"adapterContractVersion")) && "YAHOO_YFINANCE".equals(string(node,"provider")));
            var rights=node.path("rights");
            require("RESTRICTED_UNVERIFIED".equals(string(rights,"mode"))
                    && explicitFalse(rights,"publicDisplayAllowed") && explicitFalse(rights,"externalAiAllowed"));
            Instant started=Instant.parse(string(node,"startedAt")), completed=Instant.parse(string(node,"completedAt"));
            require(!completed.isBefore(started) && Duration.between(started,completed).toSeconds()<=35);
            var items=node.path("items");
            require(items.isArray()&&items.size()==1);
            var item=items.get(0);
            require(request.listingId().toString().equals(string(item,"listingId"))
                    && request.exchange().equals(string(item,"exchange")) && request.providerSymbol().equals(string(item,"providerSymbol"))
                    && "INR".equals(string(item,"currency")) && "MAPPED_LISTING".equals(string(item,"currencyBasis"))
                    && item.path("knownDelaySeconds").isNull());
            var candles=item.path("candles");
            var status=string(item,"availability");
            require(candles.isArray() && candles.size()<=31);
            if(!status.equals("AVAILABLE")){
                require(candles.isEmpty() && Set.of("UNKNOWN","INVALID_DATA","TEMPORARILY_UNAVAILABLE").contains(status));
                return new Result(status,List.of());
            }
            require(!candles.isEmpty());
            var bars=new ArrayList<Bar>();var dates=new HashSet<LocalDate>();
            for(var bar:candles){
                var date=LocalDate.parse(string(bar,"sessionDate"));
                var source=OffsetDateTime.parse(string(bar,"sourceIndex")).atZoneSameInstant(MarketPrices.INDIA).toLocalDate();
                require(date.equals(source) && !date.isBefore(request.start()) && date.isBefore(request.endExclusive()) && dates.add(date)
                        && "1d".equals(string(bar,"interval")) && bar.path("observedAt").isNull()
                        && "PROVIDER_DEFINED".equals(string(bar,"priceBasis")));
                var close=positive(bar,"close"); var open=positive(bar,"open");
                require(positive(bar,"low").compareTo(close.min(open))<=0 && positive(bar,"high").compareTo(close.max(open))>=0);
                require(string(bar,"volume").matches("[0-9]{1,19}"));
                if(!bar.path("adjustedClose").isNull())positive(bar,"adjustedClose");
                var unavailable=bar.path("unavailableFields");
                require(unavailable.isArray() && (bar.path("adjustedClose").isNull()
                        ? unavailable.size()==1 && "adjustedClose".equals(unavailable.get(0).asText())
                        : unavailable.isEmpty()));
                // Retain canonical fields only, rather than accepting upstream arbitrary keys.
                require(bar.size()==12);
                BigDecimal rounded=close.setScale(8,RoundingMode.HALF_EVEN);
                require(rounded.signum()>0);
                bars.add(new Bar(date,rounded,bar.toString()));
            }
            bars.sort(Comparator.comparing(Bar::date));
            return new Result(status,List.copyOf(bars));
        } catch(RuntimeException failure){return new Result("INVALID_DATA",List.of());}
    }

    private static boolean explicitFalse(JsonNode n,String key){return n.path(key).isBoolean()&&!n.path(key).asBoolean();}
    private static String string(JsonNode n,String key){var value=n.path(key);require(value.isString());return value.asText();}
    private static BigDecimal positive(JsonNode n,String key){
        var value=string(n,key); require(value.matches("[0-9]{1,16}(\\.[0-9]{1,30})?"));
        var amount=new BigDecimal(value);require(amount.signum()>0);return amount;
    }
    private static void require(boolean condition){if(!condition)throw new IllegalArgumentException("Invalid price candidate");}
}
