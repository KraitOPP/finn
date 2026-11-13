"""Build deterministic FINN contracts; no framework, network, or runtime files.

The definitions below are the maintained contract source. The JSON Schema and
OpenAPI projections are committed interchange artifacts. Run with --check in CI.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


CONTRACT_ROOT = Path(__file__).resolve().parents[1]
VERSION = "0.51.0"
DIALECT = "https://json-schema.org/draft/2020-12/schema"
PROVIDERS = ["SYNTHETIC", "YAHOO_YFINANCE", "NSE_EOD_FILE", "BSE_EOD_FILE"]
UNAVAILABLE = [
    "NOT_YET_PUBLISHED", "NO_TRADE", "NOT_COVERED", "TEMPORARILY_UNAVAILABLE",
    "INVALID_DATA", "UNKNOWN",
]
BASES = [
    "AS_REPORTED_EXCHANGE", "SPLIT_ADJUSTED", "TOTAL_RETURN_ADJUSTED",
    "PROVIDER_DEFINED", "UNKNOWN",
]
PROBLEM_STATUSES = {
    "MALFORMED_REQUEST": (400,), "VALIDATION_FAILED": (422,),
    "AUTHENTICATION_REQUIRED": (401,), "RESOURCE_NOT_FOUND": (404,),
    "OPERATION_FORBIDDEN": (403,), "CONFLICT": (409,), "RATE_LIMITED": (429,),
    "DATA_SOURCE_UNAVAILABLE": (503,), "INTERNAL_ERROR": (500,),
    "GROQ_SEARCH_FAILED": (502,),
    **{
        f"{provider}_{reason}": statuses
        for provider in ("GROQ", "GEMINI")
        for reason, statuses in {
            "NOT_CONFIGURED": (503,), "ACCESS_REJECTED": (502,), "REQUEST_REJECTED": (502,),
            "QUOTA": (429,), "RATE_LIMIT": (429,), "TIMEOUT": (504,),
            "UNAVAILABLE": (502, 503), "NO_RESULT": (502,), "NO_SOURCES": (502,),
        }.items()
    },
}


def ref(name: str) -> dict:
    return {"$ref": f"#/$defs/{name}"}


def nullable(schema: dict) -> dict:
    return {"anyOf": [schema, {"type": "null"}]}


def text(description: str = "", **kwargs) -> dict:
    return {"type": "string", "minLength": 1, "maxLength": 256,
            **({"description": description} if description else {}), **kwargs}


def enum(values: list[str], description: str = "") -> dict:
    return {"type": "string", "enum": values,
            **({"description": description} if description else {})}


def obj(properties: dict, description: str = "", optional: tuple = ()) -> dict:
    return {"type": "object", "properties": properties,
            "required": [key for key in properties if key not in optional],
            "additionalProperties": False,
            **({"description": description} if description else {})}


def array(items: dict, **kwargs) -> dict:
    return {"type": "array", "items": items, "maxItems": 1000, **kwargs}


def definitions() -> dict:
    d = {
        "ContractVersion": {"type": "string", "const": VERSION},
        "OpaqueId": text(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$", maxLength=128),
        "DecimalString": text(
            "Exact base-10 decimal; no exponent, separators, or financial JSON numbers.",
            pattern=r"^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$", maxLength=80),
        "NonNegativeDecimalString": text(
            pattern=r"^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$", maxLength=80),
        "PositiveDecimalString": text(
            "A present traded price must be positive. Missing price is not zero.",
            pattern=r"^(?:[1-9][0-9]*(?:\.[0-9]+)?|0\.[0-9]*[1-9][0-9]*)$", maxLength=80),
        "IntegerString": text(pattern=r"^(?:0|[1-9][0-9]*)$", maxLength=32),
        "SessionDate": text(format="date", pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$", maxLength=10),
        "UtcInstant": text(
            "UTC RFC3339 instant. A session date must not be expanded into a fabricated observation time.",
            format="date-time", pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]{1,6})?Z$", maxLength=27),
        "Provider": enum(PROVIDERS),
        "AdjustmentBasis": enum(BASES),
        "Warning": obj({"code": ref("OpaqueId"), "message": text(maxLength=512)}),
    }
    d["PrivateClose"] = obj({
        "observationId": ref("OpaqueId"), "listingId": ref("OpaqueId"), "sessionDate": ref("SessionDate"),
        "source": enum(["MANUAL_REVIEWED", "YAHOO_YFINANCE"]),
        "priceBasis": enum(["AS_REPORTED_EXCHANGE", "PROVIDER_DEFINED"]),
        "currency": {"type": "string", "const": "INR"}, "close": ref("PositiveDecimalString"),
        "sourceReference": text(maxLength=240), "receivedAt": ref("UtcInstant"),
        "freshness": enum(["STALE", "DELAY_UNKNOWN"]),
    }, "Owner-only completed-session close. Receipt time is not trade time; staleness is a conservative calendar-day label.")
    d["PrivateCloseHistory"] = obj({
        "listingId": ref("OpaqueId"), "start": ref("SessionDate"), "endExclusive": ref("SessionDate"),
        "observations": array(ref("PrivateClose"), maxItems=180),
    })
    d["MarketFeed"] = obj({
        "listingId": ref("OpaqueId"), "yahoo": enum(["DISABLED", "CONFIGURATION_REQUIRED", "REVIEWED_MAPPING_REQUIRED", "PRIVATE_DAILY"]),
        "officialFiles": enum(["UNVERIFIED"]), "streaming": enum(["UNVERIFIED"]),
        "latest": nullable(ref("PrivateClose")), "latestJobId": nullable(ref("OpaqueId")),
        "latestJobState": nullable(enum(["QUEUED","RUNNING","SUCCEEDED","PARTIALLY_SUCCEEDED","FAILED","CANCELLED"])),
        "failureCode": nullable(ref("OpaqueId")), "lastAttemptAt": nullable(ref("UtcInstant")),
        "acceptedRows": nullable({"type":"integer", "minimum":0, "maximum":31}),
        "lastSuccessAt": nullable(ref("UtcInstant")), "knownDelaySeconds": {"type":"null"},
    })
    d["ChartRange"] = enum(["D1","D7","M1","Y1","Y5","ALL"])
    d["ExchangeSession"] = obj({
        "date": ref("SessionDate"), "kind": enum(["HOLIDAY","SPECIAL","WEEKEND","SCHEDULED","UNKNOWN"]),
        "label": text(maxLength=120), "sourceUrl": nullable(text(maxLength=400)),
    })
    d["MarketChart"] = obj({
        "range": ref("ChartRange"), "source": enum(["YAHOO_YFINANCE","MANUAL_REVIEWED"]),
        "interval": enum(["5M","DAILY"]),
        "points": array(obj({"date": ref("SessionDate"), "time": nullable(ref("UtcInstant")),
                             "close": ref("PositiveDecimalString")}), maxItems=420),
        "count": {"type":"integer","minimum":0,"maximum":40000},
        "changePercent": nullable(ref("DecimalString")), "low": nullable(ref("PositiveDecimalString")),
        "high": nullable(ref("PositiveDecimalString")), "today": ref("ExchangeSession"),
        "calendarEvents": array(ref("ExchangeSession"), maxItems=29),
    })
    d["StockResearchPreset"] = enum(["DEEP_DIVE","FINANCIALS","VALUATION","RISKS","NEWS"])
    d["GeminiPreset"] = ref("StockResearchPreset")
    d["GeminiCapability"] = obj({"configured":{"type":"boolean"},"model":nullable(text(maxLength=77))})
    d["StockResearchListings"] = obj({"items": array(ref("CatalogueListing"), maxItems=100)})
    d["GeminiListings"] = ref("StockResearchListings")
    d["StockResearchInput"] = obj({"listingId": ref("OpaqueId"), "preset": ref("StockResearchPreset")})
    d["GeminiInput"] = ref("StockResearchInput")
    source_index = {"type":"integer","minimum":0,"maximum":99}
    item_index = {"type":"integer","minimum":0,"maximum":7}
    d["StockResearchFactor"] = enum(["BUSINESS","FINANCIALS","VALUATION","RISKS","CATALYSTS"])
    d["StockResearchAssessment"] = obj({
        "itemIndex": item_index, "signal": enum(["SUPPORTIVE","MIXED","ADVERSE"]),
        "rationale": text(maxLength=800), "watchFor": text(maxLength=450),
    })
    d["StockResearchCheck"] = obj({
        "itemIndex": item_index, "verdict": enum(["SUPPORTED","CHALLENGED","UNSUPPORTED"]),
        "concern": text(maxLength=800), "verify": text(maxLength=450),
    })
    d["StockResearchArticle"] = obj({
        "title": text(maxLength=180), "detail": text(maxLength=2400), "impact": text(maxLength=450),
        "publishedOn": ref("SessionDate"), "sourceId": source_index,
    })
    d["StockResearchMarket"] = obj({
        "firstSession": ref("SessionDate"), "lastSession": ref("SessionDate"),
        "close": ref("PositiveDecimalString"), "changePercent": nullable(ref("DecimalString")),
    })
    d["StockResearchIssue"] = obj({
        "stage": enum(["SEARCH", "ANALYST", "CRITIC"]),
        "reason": enum(["QUOTA", "BUSY", "TIMEOUT", "ACCESS", "UNAVAILABLE", "NO_EVIDENCE"]),
        "retryAfterSeconds": nullable({"type": "integer", "minimum": 1, "maximum": 86400}),
    })
    d["StockResearchDecision"] = obj({
        "stance": enum(["RESEARCH_FURTHER","WATCH","CAUTION","INSUFFICIENT_EVIDENCE"]),
        "status": enum(["REVIEWED","ANALYSIS_UNAVAILABLE","REVIEW_INCOMPLETE"]),
        "news": array(ref("StockResearchArticle"), maxItems=4),
        "assessments": array(ref("StockResearchAssessment"), maxItems=5),
        "checks": array(ref("StockResearchCheck"), maxItems=5),
        "market": nullable(ref("StockResearchMarket")),
        "issue": ref("StockResearchIssue"),
    }, optional=("issue",))
    d["StockResearchReport"] = obj({
        "preset": ref("StockResearchPreset"), "model": text(maxLength=77), "asOf": ref("SessionDate"),
        "items": array(obj({"title": text(maxLength=180), "detail": text(maxLength=2400),
                            "publishedOn": nullable(ref("SessionDate")),
                            "sourceIds": array(source_index, maxItems=100),
                            "factor": ref("StockResearchFactor")}, optional=("factor",)), maxItems=8),
        "sources": array(obj({"id": source_index, "title": text(maxLength=240),
                              "url": text(pattern=r"^https://",maxLength=4000)}), maxItems=100),
        "searchSuggestions": nullable(text(maxLength=64000)),
        "decision": ref("StockResearchDecision"),
    }, optional=("decision",))
    d["GeminiReport"] = ref("StockResearchReport")
    provider = enum(["GROQ","GEMINI"])
    d["StockAiCapability"] = obj({"provider":provider,"configured":{"type":"boolean"},"model":nullable(text(maxLength=77))})
    d["StockAiResult"] = obj({"provider":provider,"report":ref("StockResearchReport")})
    d["ReviewCloseInput"] = obj({
        "sessionDate": ref("SessionDate"), "close": ref("PositiveDecimalString"), "sourceReference": text(maxLength=240),
        "reviewed": {"type":"boolean","const":True},
    })
    d["PriceFetchWindow"] = obj({"start": ref("SessionDate"), "endExclusive": ref("SessionDate")})
    d["PriceFetchQueued"] = obj({"jobId": ref("OpaqueId"), "start": ref("SessionDate"), "endExclusive": ref("SessionDate")})
    d["ValuationListing"] = obj({
        "securityId": ref("OpaqueId"), "listingId": nullable(ref("OpaqueId")), "allowProviderEstimate": {"type":"boolean"},
    })
    d["ValuedHolding"] = obj({
        "securityId": ref("OpaqueId"), "securityName": text(maxLength=120), "quantity": ref("PositiveDecimalString"),
        "recordedCost": nullable(ref("DecimalString")), "listingId": nullable(ref("OpaqueId")),
        "allowProviderEstimate": {"type":"boolean"}, "observation": nullable(ref("PrivateClose")),
        "value": nullable(ref("DecimalString")), "unrealisedPnl": nullable(ref("DecimalString")),
        "priceStatus": enum(["LISTING_REQUIRED","PRICE_UNAVAILABLE","STALE","DELAY_UNKNOWN"]),
    })
    d["ValuationTotals"] = obj({
        **{field: {"type":"integer","minimum":0,"maximum":100000} for field in ("positions","priced","stalePrices","providerEstimates")},
        **{field: nullable(ref("DecimalString")) for field in ("knownHoldingsValue","holdingsValue","knownUnrealisedPnl","unrealisedPnl",
             "cashBalance","portfolioValue","realisedPnl","recordedFees","recordedDividends","netContributions")},
        "recordedFeesComplete": {"type":"boolean"},
    }, "Totals cover recorded positions and cash only; unknown components stay null. Contributions are not gains.")
    d["AccountValuation"] = obj({
        "accountId": ref("OpaqueId"), "asOf": ref("SessionDate"), "ledgerRevision":{"type":"integer","minimum":0,"maximum":10000},
        "calculationVersion": ref("OpaqueId"), "currency": {"type":"string","const":"INR"},
        "coverageStart": nullable(ref("SessionDate")), "historyStatus": enum(["UNKNOWN","HOLDINGS_ONLY","PARTIAL_TRADES"]),
        "holdings": array(ref("ValuedHolding")), "totals": ref("ValuationTotals"),
    })
    d["AccountValuationTotal"] = obj({
        "accountId": ref("OpaqueId"), "name": text(maxLength=120), "ledgerRevision": {"type":"integer","minimum":0,"maximum":10000},
        "totals": ref("ValuationTotals"),
    })
    d["PortfolioValuation"] = obj({
        "portfolioId": ref("OpaqueId"), "asOf": ref("SessionDate"), "currency": {"type":"string","const":"INR"},
        "accounts": array(ref("AccountValuationTotal"),maxItems=100), "totals": ref("ValuationTotals"),
    })
    d["ValuationPoint"] = obj({
        "snapshotId": ref("OpaqueId"), "sessionDate": ref("SessionDate"),
        "ledgerRevision": {"type":"integer","minimum":0,"maximum":10000}, "calculationVersion": ref("OpaqueId"),
        "priceBasis": {"type":"string","const":"AS_REPORTED_EXCHANGE"},
        "status": enum(["BEFORE_COVERAGE","PRICES_MISSING","CASH_UNKNOWN","RECORDED_VALUE"]),
        "holdingsValue": nullable(ref("DecimalString")), "cashBalance": nullable(ref("DecimalString")),
        "recordedValue": nullable(ref("DecimalString")), "recordedAt": ref("UtcInstant"),
    }, "Immutable dated valuation. Missing compatible prices or cash remain null.")
    d["ValuationSeries"] = obj({
        "start": ref("SessionDate"), "endExclusive": ref("SessionDate"),
        "points": array(ref("ValuationPoint"),maxItems=90),
    })
    d["ValuationSnapshotDetail"] = obj({"snapshot": ref("ValuationPoint"), "valuation": nullable(ref("AccountValuation"))})
    performance_coverage = ["HISTORY_UNREVIEWED","NO_ACCOUNTS","PORTFOLIO_BUDGET","CASH_HISTORY_INCOMPLETE","NEGATIVE_CASH_BALANCE",
        "NEW_OPENING_BALANCE","ENDPOINT_VALUATIONS_MISSING","REVIEWED_WINDOW"]
    d["PortfolioPerformanceInput"] = obj({"start":ref("SessionDate"),"end":ref("SessionDate"),"reviewed":{"type":"boolean"}})
    d["PerformanceSnapshotRef"] = obj({"accountId":ref("OpaqueId"),"snapshotId":ref("OpaqueId"),
        "ledgerRevision":{"type":"integer","minimum":0,"maximum":10000},"value":ref("DecimalString")})
    d["PerformanceValuation"] = obj({"date":ref("SessionDate"),"closingValue":ref("DecimalString"),
        "snapshots":array(ref("PerformanceSnapshotRef"),minItems=1,maxItems=100)})
    d["PerformanceFlow"] = obj({"date":ref("SessionDate"),"deposits":ref("NonNegativeDecimalString"),
        "withdrawals":ref("NonNegativeDecimalString"),"net":ref("DecimalString")})
    d["ReturnMeasure"] = obj({"state":enum(["AVAILABLE","UNAVAILABLE"]),
        "reason":enum([*performance_coverage,"CALCULATED","FLOW_DAY_VALUATION_MISSING","NON_POSITIVE_BASE","CASH_FLOW_SIGNS",
            "AMBIGUOUS_CASH_FLOWS","OUTSIDE_SOLVER_RANGE"]),"percent":nullable(ref("DecimalString"))})
    d["PortfolioPerformance"] = obj({"portfolioId":ref("OpaqueId"),"start":ref("SessionDate"),"end":ref("SessionDate"),
        "currency":{"const":"INR"},"methodology":{"const":"cash-flow-returns-v1"},"coverage":enum(performance_coverage),
        "opening":nullable(ref("PerformanceValuation")),"closing":nullable(ref("PerformanceValuation")),
        "flowValuations":array(ref("PerformanceValuation"),maxItems=366),"externalFlows":array(ref("PerformanceFlow"),maxItems=366),
        "recordedDividends":nullable(ref("NonNegativeDecimalString")),"investmentResult":nullable(ref("DecimalString")),
        "xirr":ref("ReturnMeasure"),"timeWeighted":ref("ReturnMeasure"),"benchmark":{"const":"NO_COMPATIBLE_BENCHMARK"}})
    health_gaps = ["NO_ACCOUNTS","PORTFOLIO_BUDGET","PRICES_MISSING","STALE_PRICES","MIXED_PRICE_SESSIONS"]
    health_sector = enum(["BANKING","FINANCIAL_SERVICES","MANUFACTURING","TECHNOLOGY","CONSUMER","ENERGY","OTHER","UNCLASSIFIED"])
    d["PortfolioHealthHolding"] = obj({"securityId":ref("OpaqueId"),"name":text(minLength=1,maxLength=120),"sector":health_sector,
        "value":nullable(ref("NonNegativeDecimalString")),"equityWeight":nullable(ref("NonNegativeDecimalString")),
        "unrealisedContribution":nullable(ref("DecimalString"))})
    d["PortfolioHealthSector"] = obj({"sector":health_sector,"value":ref("NonNegativeDecimalString"),
        "equityWeight":nullable(ref("NonNegativeDecimalString"))})
    health_count = {"type":"integer","minimum":0,"maximum":500}
    d["PortfolioHealth"] = obj({"portfolioId":ref("OpaqueId"),"asOf":ref("SessionDate"),"priceSession":nullable(ref("SessionDate")),
        "state":enum(["READY",*health_gaps]),"currency":{"const":"INR"},"unpricedPositions":health_count,
        "stalePositions":health_count,"providerEstimates":health_count,"equity":nullable(ref("NonNegativeDecimalString")),
        "cash":nullable(ref("NonNegativeDecimalString")),"largestWeight":nullable(ref("NonNegativeDecimalString")),
        "topFiveWeight":nullable(ref("NonNegativeDecimalString")),"holdings":array(ref("PortfolioHealthHolding"),maxItems=500),
        "sectors":array(ref("PortfolioHealthSector"),maxItems=8)})
    scenario_input = {"listingId":ref("OpaqueId"),"cashAllocation":ref("NonNegativeDecimalString"),"shockPercent":ref("DecimalString")}
    d["PortfolioScenarioInput"] = obj(scenario_input)
    d["PortfolioScenario"] = obj({**scenario_input,"portfolioId":ref("OpaqueId"),
        "state":enum(["SIMULATED",*health_gaps,"CASH_UNKNOWN","INSUFFICIENT_CASH","TARGET_NOT_HELD"]),
        "priceSession":nullable(ref("SessionDate")),"targetName":text(minLength=1,maxLength=120),
        **{name:nullable(ref("NonNegativeDecimalString")) for name in ["beforeEquity","afterEquity","beforeCash","afterCash",
            "beforeTotal","afterTotal","beforeTargetWeight","afterTargetWeight"]},"valueChange":nullable(ref("DecimalString"))})
    d["PortfolioRiskObservation"] = obj({"date":ref("SessionDate"),"indexValue":ref("NonNegativeDecimalString")})
    d["PortfolioRisk"] = obj({"portfolioId":ref("OpaqueId"),"start":ref("SessionDate"),"end":ref("SessionDate"),
        "methodology":{"const":"weekly-linked-risk-v1"},"state":enum(["AVAILABLE","UNAVAILABLE"]),
        "reason":enum([*performance_coverage,"CALCULATED","WEEKLY_VALUATIONS_MISSING","FLOW_DAY_VALUATION_MISSING","NON_POSITIVE_BASE"]),
        "maxDrawdownPercent":nullable(ref("NonNegativeDecimalString")),"annualizedVolatilityPercent":nullable(ref("NonNegativeDecimalString")),
        "observations":array(ref("PortfolioRiskObservation"),maxItems=53)})
    d["WatchlistName"] = obj({"name": text(maxLength=80)})
    d["WatchlistSummary"] = obj({"watchlistId": ref("OpaqueId"), "name": text(maxLength=80)})
    d["WatchlistIndex"] = obj({"items": array(ref("WatchlistSummary"),maxItems=20)})
    d["WatchlistTrack"] = obj({"listingId": ref("OpaqueId"), "tracked": {"type":"boolean"}})
    d["WatchlistItem"] = obj({
        "listingId": ref("OpaqueId"), "securityId": ref("OpaqueId"), "securityName": text(maxLength=120),
        "exchange": enum(["NSE","BSE"]), "symbol": text(maxLength=64), "latest": nullable(ref("PrivateClose")),
    })
    d["WatchlistDetail"] = obj({"watchlist": ref("WatchlistSummary"), "items": array(ref("WatchlistItem"),maxItems=100)})
    d["PriceRuleSettings"] = obj({
        "listingId": ref("OpaqueId"), "name": text(maxLength=80),
        "source": enum(["MANUAL_REVIEWED","YAHOO_YFINANCE"]),
        "comparison": enum(["ABOVE","BELOW","CROSS_ABOVE","CROSS_BELOW","MOVE_UP","MOVE_DOWN"]),
        "threshold": ref("PositiveDecimalString"),
        "maxAgeDays": {"type":"integer","minimum":1,"maximum":4},
        "cooldownMinutes": {"type":"integer","minimum":0,"maximum":10080},
        "rearm": {"type":"boolean"}, "enabled": {"type":"boolean"}, "expiresOn": nullable(ref("SessionDate")),
    })
    price_rule_revision = {"type":"integer","minimum":1,"maximum":100}
    d["PriceRule"] = obj({
        "ruleId": ref("OpaqueId"), "revision": price_rule_revision, "settings": ref("PriceRuleSettings"),
        "exchange": enum(["NSE","BSE"]), "symbol": text(maxLength=64), "createdAt": ref("UtcInstant"),
    })
    d["PriceRuleList"] = obj({"items": array(ref("PriceRule"),maxItems=100)})
    d["PriceRuleEdit"] = obj({"expectedRevision": price_rule_revision, "settings": ref("PriceRuleSettings")})
    d["AlertCloseEvidence"] = obj({
        "observationId": ref("OpaqueId"), "sessionDate": ref("SessionDate"),
        "source": enum(["MANUAL_REVIEWED","YAHOO_YFINANCE"]),
        "priceBasis": enum(["AS_REPORTED_EXCHANGE","PROVIDER_DEFINED"]), "close": ref("PositiveDecimalString"),
        "sourceReference": text(maxLength=240), "receivedAt": ref("UtcInstant"),
    })
    d["PriceEvaluation"] = obj({
        "evaluationId": ref("OpaqueId"), "revision": price_rule_revision, "sessionDate": ref("SessionDate"),
        "outcome": enum(["TRIGGERED","BELOW_OR_ABOVE_RESET","NO_MATCH","INSUFFICIENT_HISTORY","COOLDOWN","ALREADY_LATCHED"]),
        "evaluatedAt": ref("UtcInstant"), "observation": nullable(ref("AlertCloseEvidence")), "previous": nullable(ref("AlertCloseEvidence")),
    })
    d["PriceEvaluationReport"] = obj({
        "status": enum(["PAUSED","EXPIRED","WAITING_FOR_PRICE","STALE","EVALUATED","INSUFFICIENT_HISTORY"]),
        "items": array(ref("PriceEvaluation"),maxItems=50),
    })
    activity_kind = enum(["PRICE_RULE","REVIEW_REMINDER","PORTFOLIO_BRIEF","VOLUME_RULE","ALLOCATION_RULE","COMPANY_EVENT","THESIS_REVIEW"])
    channel = enum(["IN_APP","EMAIL_PREVIEW"])
    delivery_status = enum(["PENDING","DELIVERED","SUPPRESSED","PREVIEWED","FAILED"])
    d["Notification"] = obj({
        "activityId": ref("OpaqueId"), "kind": activity_kind, "subjectId": ref("OpaqueId"), "title": text(maxLength=160),
        "createdAt": ref("UtcInstant"), "readAt": nullable(ref("UtcInstant")),
    })
    d["NotificationPage"] = obj({"items": array(ref("Notification"),maxItems=40), "nextBefore": nullable(ref("OpaqueId"))})
    d["NotificationRead"] = obj({"read": {"type":"boolean"}})
    d["NotificationDelivery"] = obj({
        "channel": channel, "status": delivery_status, "attempts": {"type":"integer","minimum":0,"maximum":3},
        "nextAttemptAt": ref("UtcInstant"), "completedAt": nullable(ref("UtcInstant")), "failureCode": nullable(ref("OpaqueId")),
    })
    d["NotificationAttempt"] = obj({
        "channel": channel, "attempt": {"type":"integer","minimum":1,"maximum":3},
        "outcome": enum(["DELIVERED","SUPPRESSED","PREVIEWED","RETRY","FAILED"]), "attemptedAt": ref("UtcInstant"),
    })
    d["ReminderEvidence"] = obj({
        "revision": {"type":"integer","minimum":1,"maximum":1000000},
        "dueAt": ref("UtcInstant"), "deliverAt": ref("UtcInstant"),
    })
    indicator_kind = enum(["VOLUME","ALLOCATION"])
    indicator_revision = {"type":"integer","minimum":1,"maximum":1000000}
    indicator_settings = {"listingId": ref("OpaqueId"), "portfolioId": nullable(ref("OpaqueId")),
                          "kind": indicator_kind, "title": text(maxLength=80), "threshold": ref("PositiveDecimalString")}
    d["IndicatorCreate"] = obj(indicator_settings)
    d["IndicatorEdit"] = obj({"expectedRevision": indicator_revision, "threshold": ref("PositiveDecimalString"), "enabled": {"type":"boolean"}})
    d["IndicatorRule"] = obj({
        **indicator_settings, "ruleId": ref("OpaqueId"), "revision": indicator_revision, "enabled": {"type":"boolean"},
        "result": enum(["WAITING","INSUFFICIENT_COVERAGE","EVALUATED"]), "lastSession": nullable(ref("SessionDate")),
        "symbol": text(maxLength=64), "exchange": enum(["NSE","BSE"]),
    })
    d["IndicatorList"] = obj({"items": array(ref("IndicatorRule"),maxItems=50)})
    d["IndicatorEvaluation"] = obj({
        "evaluationId": ref("OpaqueId"), "revision": indicator_revision, "sessionDate": ref("SessionDate"),
        "threshold": ref("PositiveDecimalString"), "metric": ref("NonNegativeDecimalString"), "baselineStart": nullable(ref("SessionDate")),
        "holdingValue": nullable(ref("NonNegativeDecimalString")), "equityValue": nullable(ref("PositiveDecimalString")),
        "triggered": {"type":"boolean"}, "evaluatedAt": ref("UtcInstant"),
    })
    d["IndicatorEvaluations"] = obj({"items": array(ref("IndicatorEvaluation"),maxItems=40)})
    d["ThesisReviewLink"] = obj({"companyId":ref("OpaqueId"),"thesisId":ref("OpaqueId"),"reviewId":ref("OpaqueId")})
    d["NotificationDetail"] = obj({
        "notification": ref("Notification"), "price": nullable(ref("PriceEvaluation")),
        "reminder": nullable(ref("ReminderEvidence")),
        "indicator": nullable(ref("IndicatorEvaluation")),
        "briefId": nullable(ref("OpaqueId")),
        "companyEvent": nullable(ref("CompanyEvent")),
        "thesisReview": nullable(ref("ThesisReviewLink")),
        "deliveries": array(ref("NotificationDelivery"),maxItems=2), "attempts": array(ref("NotificationAttempt"),maxItems=6),
    })
    local_minute = text(pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$",maxLength=16)
    clock_minute = text(pattern=r"^[0-9]{2}:[0-9]{2}$",maxLength=5)
    reminder_revision = {"type":"integer","minimum":1,"maximum":1000000}
    d["ReminderSettings"] = obj({
        "title": text(maxLength=120), "scheduledLocal": local_minute, "timeZone": text(maxLength=64),
        "recurrence": enum(["ONCE","DAILY","WEEKLY"]), "quietStart": nullable(clock_minute), "quietEnd": nullable(clock_minute),
    })
    d["ReviewReminder"] = obj({
        "reminderId": ref("OpaqueId"), "revision": reminder_revision, "state": enum(["ACTIVE","CANCELLED","COMPLETED"]),
        "settings": ref("ReminderSettings"), "nextAt": nullable(ref("UtcInstant")),
    })
    d["ReminderList"] = obj({"items": array(ref("ReviewReminder"),maxItems=50)})
    d["ReminderEdit"] = obj({"expectedRevision": reminder_revision, "settings": ref("ReminderSettings")})
    d["ReminderScheduleChange"] = obj({"expectedRevision": reminder_revision, "snoozeUntil": nullable(local_minute)})
    d["BriefSettings"] = obj({
        "scheduledLocal": local_minute, "timeZone": text(maxLength=64), "cadence": enum(["DAILY","WEEKLY"]),
        **{key: {"type":"boolean"} for key in ("enabled","includeAlerts","includeReminders","includeCompany","includeValuations")},
    })
    d["BriefSchedule"] = obj({"revision": reminder_revision, "settings": ref("BriefSettings"), "nextAt": nullable(ref("UtcInstant"))})
    d["BriefScheduleInput"] = obj({"expectedRevision": {"type":"integer","minimum":0,"maximum":1000000}, "settings": ref("BriefSettings")})
    d["BriefIndex"] = obj({
        "schedule": nullable(ref("BriefSchedule")),
        "runs": array(obj({"runId": ref("OpaqueId"), "scheduleRevision": reminder_revision, "windowStart": ref("UtcInstant"),
                           "windowEnd": ref("UtcInstant"), "createdAt": ref("UtcInstant")}),maxItems=30),
    })
    d["PortfolioBrief"] = obj({
        "windowStart": ref("UtcInstant"), "windowEnd": ref("UtcInstant"), "timeZone": text(maxLength=64),
        "items": array(obj({"activityId": ref("OpaqueId"), "kind": activity_kind, "title": text(maxLength=160),
                            "createdAt": ref("UtcInstant")}),maxItems=50),
        "snapshots": array(obj({
            "snapshotId": ref("OpaqueId"), "portfolioId": ref("OpaqueId"), "accountId": ref("OpaqueId"), "accountName": text(maxLength=120),
            "sessionDate": ref("SessionDate"), "holdingsValue": nullable(ref("DecimalString")), "recordedValue": nullable(ref("DecimalString")),
            "status": enum(["BEFORE_COVERAGE","PRICES_MISSING","CASH_UNKNOWN","RECORDED_VALUE"]),
        }),maxItems=50),
        "companyEvents": array(ref("CompanyEvent"),maxItems=50),
        "truncated": {"type":"boolean"},
    })
    source_revision = {"type":"integer","minimum":1,"maximum":50}
    d["CompanySourceInput"] = obj({
        "companyId": ref("OpaqueId"), "title": text(maxLength=120), "sourceName": text(maxLength=120),
        "url": nullable(text(maxLength=1000)), "attachment": nullable(text(maxLength=49152)),
        "publishedAt": nullable(ref("UtcInstant")), "rightsConfirmed": {"const":True},
        "pdfFileId": nullable(ref("OpaqueId")), "removePdf": {"type":"boolean"},
    }, optional=("pdfFileId","removePdf"))
    d["CompanySource"] = obj({
        "documentId": ref("OpaqueId"), "companyId": ref("OpaqueId"), "companyName": text(maxLength=120),
        "sourceType": enum(["PRIMARY","NEWS"]), "revision": source_revision, "title": text(maxLength=120),
        "sourceName": text(maxLength=120), "url": nullable(text(maxLength=1000)), "hasAttachment": {"type":"boolean"}, "hasPdf": {"type":"boolean"},
        "checksum": text(pattern=r"^[0-9a-f]{64}$",maxLength=64), "publishedAt": nullable(ref("UtcInstant")), "ingestedAt": ref("UtcInstant"),
    })
    d["CompanySourcePage"] = obj({"items": array(ref("CompanySource"),maxItems=40), "hasMore": {"type":"boolean"}})
    d["CompanySourceVersions"] = obj({"items": array(ref("CompanySource"),maxItems=50)})
    d["CompanySourceDetail"] = obj({"source": ref("CompanySource"), "attachment": nullable(text(maxLength=49152))})
    d["CompanySourceEdit"] = obj({"expectedRevision": source_revision, "source": ref("CompanySourceInput")})
    d["ResearchPdfUpload"] = obj({"fileId":ref("OpaqueId"),"checksum":text(pattern=r"^[0-9a-f]{64}$",maxLength=64)})
    d["StagedResearchPdf"] = obj({**d["ResearchPdfUpload"]["properties"],"stagedAt":ref("UtcInstant")})
    d["StagedResearchPdfs"] = obj({"items":array(ref("StagedResearchPdf"),maxItems=30)})
    d["ResearchPdfDiscard"] = obj({"fileId":ref("OpaqueId"),"discarded":{"const":True}})
    evidence_page = {"type":"integer","minimum":1,"maximum":20}
    evidence_line = {"type":"integer","minimum":1,"maximum":600}
    evidence_page_state = enum(["TEXT","TRUNCATED","NO_TEXT","UNREADABLE"])
    d["ResearchExtraction"] = obj({
        "state":enum(["LINK_ONLY","NOT_STARTED","QUEUED","RUNNING","READY","PARTIAL","NO_TEXT","UNSUPPORTED","FAILED","CANCELLED"]),
        "reason":nullable(ref("OpaqueId")), "jobId":nullable(ref("OpaqueId")), "canRequest":{"type":"boolean"},
        "totalPages":{"type":"integer","minimum":0,"maximum":10000},
        "pages":array(obj({"page":evidence_page,"state":evidence_page_state}),maxItems=20),
    })
    d["ResearchLocation"] = obj({
        "anchorId":ref("OpaqueId"),"companyId":ref("OpaqueId"),"documentId":ref("OpaqueId"),"documentRevision":source_revision,
        "sourceTitle":text(maxLength=120),"sourceName":text(maxLength=120),"publishedAt":nullable(ref("UtcInstant")),
        "page":evidence_page,"lineStart":evidence_line,"lineEnd":evidence_line,"kind":enum(["PASSAGE","TABLE_ROW"]),
        "quote":text(maxLength=4000),"cells":array(text(maxLength=400),maxItems=12),
    })
    d["ResearchLocations"] = obj({"items":array(ref("ResearchLocation"),maxItems=40),"hasMore":{"type":"boolean"}})
    d["ResearchTextPage"] = obj({"page":evidence_page,"state":evidence_page_state,"content":text(minLength=0,maxLength=60000)})
    d["FinancialDimensions"] = obj({
        "metric":enum(["REVENUE","EBITDA","PROFIT_AFTER_TAX","CASH_FROM_OPERATIONS","CAPITAL_EXPENDITURE","FREE_CASH_FLOW",
                        "TOTAL_DEBT","TOTAL_EQUITY","EPS_BASIC","OPERATING_MARGIN"]),
        "basis":enum(["STANDALONE","CONSOLIDATED"]),"periodKind":enum(["QUARTER","YTD","FULL_YEAR","AS_OF"]),
        "periodStart":ref("SessionDate"),"periodEnd":ref("SessionDate"),
        "unit":enum(["MONEY","PER_SHARE","PERCENT"]),"currency":nullable(enum(["INR","USD","EUR","GBP","JPY"])),
    })
    fact_scale=enum(["ONES","THOUSAND","LAKH","MILLION","CRORE","BILLION"])
    d["FinancialOperand"] = obj({"factId":ref("OpaqueId"),"revision":source_revision})
    d["ReportedFactInput"] = obj({
        "dimensions":ref("FinancialDimensions"),"anchorId":ref("OpaqueId"),"amount":ref("DecimalString"),
        "scale":fact_scale,"reviewed":{"const":True},
    })
    d["FinancialFactEdit"] = obj({"companyId":ref("OpaqueId"),"expectedRevision":source_revision,"fact":ref("ReportedFactInput")})
    d["DeriveFinancialFact"] = obj({
        "existingFactId":nullable(ref("OpaqueId")),"expectedRevision":nullable(source_revision),
        "operatingCash":ref("FinancialOperand"),"capitalExpenditure":ref("FinancialOperand"),"reviewed":{"const":True},
    })
    d["FinancialFact"] = obj({
        "factId":ref("OpaqueId"),"companyId":ref("OpaqueId"),"revision":source_revision,"dimensions":ref("FinancialDimensions"),
        "amount":ref("DecimalString"),"scale":fact_scale,"normalizedAmount":ref("DecimalString"),"origin":enum(["REPORTED","DERIVED"]),
        "anchorId":ref("OpaqueId"),"sourceTitle":text(maxLength=120),"documentRevision":source_revision,
        "publishedAt":nullable(ref("UtcInstant")),"reviewedAt":ref("UtcInstant"),"operands":array(ref("FinancialOperand"),maxItems=2),
    })
    d["FinancialFactPage"] = obj({"items":array(ref("FinancialFact"),maxItems=50),"hasMore":{"type":"boolean"}})
    d["FinancialFactHistory"] = obj({"items":array(ref("FinancialFact"),maxItems=50)})
    research_note = {"kind":enum(["BUSINESS","GOVERNANCE","QUESTION"]),"title":text(minLength=1,maxLength=240),
                     "anchorId":nullable(ref("OpaqueId"))}
    d["CompanyResearchNoteInput"] = obj(research_note)
    d["CompanyResearchNote"] = obj({**research_note,"noteId":ref("OpaqueId"),"resolved":{"type":"boolean"}})
    d["CompanyResearchResolution"] = obj({"resolved":{"type":"boolean"}})
    d["ThesisReviewSchedule"] = obj({"scheduledLocal":text(pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"),
        "timeZone":text(minLength=1,maxLength=64)})
    thesis_input = {"title":text(minLength=1,maxLength=100),"rationale":text(minLength=1,maxLength=2400),
        "risks":text(minLength=0,maxLength=1600),"milestones":text(minLength=0,maxLength=1600),
        "decision":enum(["MONITOR","REAFFIRM","REVISE","PAUSE","CLOSE"]),
        "decisionNote":text("May be blank for MONITOR. Other decisions require a note.",minLength=0,maxLength=1200),
        "review":nullable(ref("ThesisReviewSchedule")),"anchorIds":array(ref("OpaqueId"),maxItems=5)}
    thesis_revision = {"type":"integer","minimum":1,"maximum":100}
    d["InvestmentThesisInput"] = obj(thesis_input)
    d["InvestmentThesisEdit"] = obj({"expectedRevision":thesis_revision,"thesis":ref("InvestmentThesisInput")})
    d["InvestmentThesis"] = obj({**thesis_input,"thesisId":ref("OpaqueId"),"companyId":ref("OpaqueId"),
        "revision":thesis_revision,"reminderId":nullable(ref("OpaqueId")),"savedAt":ref("UtcInstant")})
    d["InvestmentTheses"] = obj({"items":array(ref("InvestmentThesis"),maxItems=100)})
    condition_input = {"label":text(minLength=1,maxLength=100),"dimensions":ref("FinancialDimensions"),
        "comparator":enum(["GTE","LTE"]),"threshold":ref("DecimalString"),"scale":fact_scale}
    d["ThesisConditionInput"] = obj({**condition_input,"expectedRevision":thesis_revision})
    d["ThesisConditionDefinition"] = obj({**condition_input,"conditionId":ref("OpaqueId"),
        "thesisRevision":thesis_revision,"retired":{"type":"boolean"}})
    fact_evaluation_reason = enum(["PERIOD_OPEN","FACT_MISSING","DIMENSIONS_MISMATCH","PUBLICATION_UNKNOWN","PUBLISHED_AFTER_CUTOFF",
        "PERIOD_PUBLICATION_INVALID","SOURCE_REVISED","DERIVATION_REVIEW_REQUIRED","COMPARABLE_FACT"])
    d["DiscoverySector"] = enum(["BANKING","FINANCIAL_SERVICES","MANUFACTURING","TECHNOLOGY","CONSUMER","ENERGY","OTHER"])
    d["DiscoveryMetric"] = enum(["REVENUE","PROFIT_AFTER_TAX","EPS_BASIC","OPERATING_MARGIN","FREE_CASH_FLOW","TOTAL_EQUITY"])
    d["DiscoveryPeriod"] = obj({"kind":enum(["QUARTER","FULL_YEAR"]),"start":ref("SessionDate"),"end":ref("SessionDate")})
    discovery_member = {"listingId":ref("OpaqueId"),"sector":ref("DiscoverySector"),"active":{"type":"boolean"}}
    d["DiscoveryMemberInput"] = obj({**discovery_member,"expectedRevision":nullable(thesis_revision)})
    d["DiscoveryMember"] = obj({**discovery_member,"companyId":ref("OpaqueId"),"name":text(maxLength=120),
        "exchange":enum(["NSE","BSE"]),"symbol":text(maxLength=64),"revision":thesis_revision,
        "registeredAt":ref("UtcInstant"),"reviewedAt":ref("UtcInstant")})
    d["DiscoveryMetricSupport"] = obj({"metric":ref("DiscoveryMetric"),"unit":enum(["MONEY","PER_SHARE","PERCENT"]),
        "sectors":array(ref("DiscoverySector"),maxItems=7)})
    d["DiscoveryDirectory"] = obj({"source":{"const":"MANUAL_CURRENT"},"members":array(ref("DiscoveryMember"),maxItems=30),
        "metrics":array(ref("DiscoveryMetricSupport"),maxItems=6)})
    d["DiscoveryReading"] = obj({"metric":ref("DiscoveryMetric"),"reason":enum([*fact_evaluation_reason["enum"],"SECTOR_INELIGIBLE"]),
        "fact":nullable(ref("FinancialFact"))})
    d["DiscoveryCompany"] = obj({"member":ref("DiscoveryMember"),"readings":array(ref("DiscoveryReading"),maxItems=6)})
    d["DiscoverySnapshot"] = obj({"source":{"const":"MANUAL_CURRENT"},"capturedAt":ref("UtcInstant"),"period":ref("DiscoveryPeriod"),
        "companies":array(ref("DiscoveryCompany"),maxItems=30)})
    d["StockScreenFilter"] = obj({"metric":ref("DiscoveryMetric"),"comparator":enum(["GTE","LTE"]),
        "amount":ref("DecimalString"),"scale":fact_scale})
    d["StockScreenInput"] = obj({"name":text(minLength=1,maxLength=80),"sector":ref("DiscoverySector"),"period":ref("DiscoveryPeriod"),
        "filters":array(ref("StockScreenFilter"),minItems=1,maxItems=6)})
    d["StockScreenEdit"] = obj({"expectedRevision":thesis_revision,"screen":ref("StockScreenInput")})
    d["StockScreen"] = obj({"screenId":ref("OpaqueId"),"revision":thesis_revision,"definition":ref("StockScreenInput"),"savedAt":ref("UtcInstant")})
    d["StockScreenIndex"] = obj({"items":array(ref("StockScreen"),maxItems=100)})
    d["StockScreenRunInput"] = obj({"revision":thesis_revision,"requestId":ref("OpaqueId")})
    screen_run_summary = {"runId":ref("OpaqueId"),"revision":thesis_revision,"createdAt":ref("UtcInstant")}
    d["StockScreenRunSummary"] = obj(screen_run_summary)
    d["StockScreenHistory"] = obj({"items":array(ref("StockScreenRunSummary"),maxItems=100)})
    d["StockScreenCheck"] = obj({"filter":ref("StockScreenFilter"),"state":enum(["PASS","FAIL","UNKNOWN"]),
        "reason":fact_evaluation_reason,"fact":nullable(ref("FinancialFact"))})
    d["StockScreenResult"] = obj({"member":ref("DiscoveryMember"),"state":enum(["MATCH","EXCLUDED","UNKNOWN","OUTSIDE_SECTOR"]),
        "checks":array(ref("StockScreenCheck"),maxItems=6)})
    d["StockScreenRun"] = obj({"runId":ref("OpaqueId"),"screen":ref("StockScreen"),"methodology":{"const":"absolute-thresholds-v1"},
        "inputs":ref("DiscoverySnapshot"),"results":array(ref("StockScreenResult"),maxItems=30),"createdAt":ref("UtcInstant")})
    d["PeerRankingFactor"] = obj({"metric":ref("DiscoveryMetric"),"direction":enum(["HIGHER","LOWER"]),
        "weight":{"type":"integer","minimum":1,"maximum":100}})
    ranking_spec = {"companyIds":array(ref("OpaqueId"),minItems=2,maxItems=30),
        "factors":array(ref("PeerRankingFactor"),minItems=1,maxItems=6)}
    d["PeerRankingSpecification"] = obj(ranking_spec)
    d["PeerRankingInput"] = obj({**ranking_spec,"requestId":ref("OpaqueId")})
    d["PeerRankingContribution"] = obj({"factor":ref("PeerRankingFactor"),"reason":fact_evaluation_reason,
        "fact":nullable(ref("FinancialFact")),"percentile":nullable(ref("DecimalString")),"points":nullable(ref("DecimalString")),
        "relativeWeakness":{"type":"boolean"}})
    d["PeerRankingRow"] = obj({"member":ref("DiscoveryMember"),"rank":nullable({"type":"integer","minimum":1,"maximum":30}),
        "score":nullable(ref("DecimalString")),"status":enum(["RANKED","MISSING_FACTOR","INSUFFICIENT_PEERS"]),
        "contributions":array(ref("PeerRankingContribution"),maxItems=6)})
    d["PeerRanking"] = obj({"rankingId":ref("OpaqueId"),"runId":ref("OpaqueId"),"methodology":{"const":"within-sector-midrank-v1"},
        "sector":ref("DiscoverySector"),"specification":ref("PeerRankingSpecification"),
        "completePeers":{"type":"integer","minimum":0,"maximum":30},"rows":array(ref("PeerRankingRow"),maxItems=30),"createdAt":ref("UtcInstant")})
    d["PeerRankingSummary"] = obj({"rankingId":ref("OpaqueId"),"createdAt":ref("UtcInstant")})
    d["PeerRankingIndex"] = obj({"items":array(ref("PeerRankingSummary"),maxItems=120)})
    d["ThesisConditionCheck"] = obj({"checkId":ref("OpaqueId"),"thesisRevision":thesis_revision,
        "state":enum(["MATCHED","VIOLATED","UNKNOWN","REVIEW_NEEDED"]),"reason":fact_evaluation_reason,
        "fact":nullable(ref("FinancialFact")),"evaluatedAt":ref("UtcInstant")})
    d["ThesisCondition"] = obj({"definition":ref("ThesisConditionDefinition"),"lastCheck":nullable(ref("ThesisConditionCheck"))})
    d["ThesisConditions"] = obj({"items":array(ref("ThesisCondition"),maxItems=20)})
    guidance_input = {"title":text(minLength=1,maxLength=120),"kind":enum(["QUALITATIVE","AT_LEAST","AT_MOST","RANGE"]),
        "stage":enum(["DRAFT","CONFIRMED","WITHDRAWN"]),"statementDate":nullable(ref("SessionDate")),
        "dimensions":nullable(ref("FinancialDimensions")),"lower":nullable(ref("DecimalString")),"upper":nullable(ref("DecimalString")),
        "scale":fact_scale,"caveats":text(maxLength=1200),"anchorId":ref("OpaqueId")}
    d["ManagementGuidanceInput"] = obj(guidance_input)
    d["ManagementGuidanceEdit"] = obj({"expectedRevision":source_revision,"guidance":ref("ManagementGuidanceInput")})
    d["ManagementGuidance"] = obj({**guidance_input,"guidanceId":ref("OpaqueId"),"companyId":ref("OpaqueId"),
        "revision":source_revision,"publishedAt":nullable(ref("UtcInstant")),"savedAt":ref("UtcInstant")})
    d["ManagementGuidanceList"] = obj({"items":array(ref("ManagementGuidance"),maxItems=50)})
    d["GuidanceCandidates"] = obj({"evidence":ref("ResearchLocation"),"printedNumbers":array(text(minLength=1,maxLength=80),maxItems=12)})
    d["GuidanceDelivery"] = obj({"guidanceId":ref("OpaqueId"),"guidanceRevision":source_revision,"asOf":ref("SessionDate"),
        "state":enum(["MET","MISSED","PARTIAL","WITHDRAWN","REVISED","NOT_DUE","INSUFFICIENT_EVIDENCE"]),
        "reason":enum([*fact_evaluation_reason["enum"],"GUIDANCE_UNCONFIRMED","GUIDANCE_NOT_PUBLISHED","WITHDRAWAL_PUBLISHED",
            "REVISION_PUBLISHED","QUALITATIVE_STATEMENT","OUTCOME_PREDATES_GUIDANCE","INTERIM_YTD_ONLY"]),
        "actual":nullable(ref("FinancialFact")),"successor":nullable(ref("ManagementGuidance"))})
    review_relation = enum(["CONTEXT","SUPPORTS","CHALLENGES"])
    review_decision = {"action":enum(["REAFFIRM","REVISE","PAUSE","CLOSE","DISMISS"]),
        "note":text(minLength=1,maxLength=1200),"anchorId":nullable(ref("OpaqueId"))}
    d["ThesisReviewGuidanceRef"] = obj({"id":ref("OpaqueId"),"revision":source_revision})
    d["ThesisReviewInput"] = obj({"expectedRevision":thesis_revision,"eventVersionId":ref("OpaqueId"),
        "relation":review_relation,"anchorId":nullable(ref("OpaqueId")),"conditionCheckId":nullable(ref("OpaqueId")),
        "guidance":nullable(ref("ThesisReviewGuidanceRef"))})
    d["ThesisReviewDecisionInput"] = obj(review_decision)
    d["ThesisReviewDecision"] = obj({**review_decision,"decidedAt":ref("UtcInstant")})
    d["ThesisReviewGuidance"] = obj({"statement":ref("ManagementGuidance"),"outcome":ref("GuidanceDelivery")})
    d["ThesisReviewSummary"] = obj({"reviewId":ref("OpaqueId"),"thesisRevision":thesis_revision,"eventTitle":text(maxLength=120),
        "createdAt":ref("UtcInstant"),"decided":{"type":"boolean"}})
    d["ThesisReviewIndex"] = obj({"suggestions":array(ref("CompanyEvent"),maxItems=10),
        "items":array(ref("ThesisReviewSummary"),maxItems=20),"hasMore":{"type":"boolean"}})
    d["ThesisReview"] = obj({"reviewId":ref("OpaqueId"),"thesis":ref("InvestmentThesis"),"event":ref("CompanyEvent"),
        "relation":review_relation,"anchorId":nullable(ref("OpaqueId")),"condition":nullable(ref("ThesisConditionCheck")),
        "guidance":nullable(ref("ThesisReviewGuidance")),"decision":nullable(ref("ThesisReviewDecision")),"createdAt":ref("UtcInstant")})
    d["ResearchReportCapabilities"] = obj({"localRanking":{"type":"boolean"}})
    d["ResearchReportInput"] = obj({"question":text(minLength=1,maxLength=320),"rankLocally":{"type":"boolean"}})
    report_feedback = {"note":text(minLength=1,maxLength=500),"anchorId":nullable(ref("OpaqueId"))}
    d["ResearchReportFeedbackInput"] = obj(report_feedback)
    d["ResearchReportFeedback"] = obj({**report_feedback,"recordedAt":ref("UtcInstant")})
    d["ResearchReport"] = obj({"reportId":ref("OpaqueId"),"companyId":ref("OpaqueId"),"question":text(minLength=1,maxLength=320),
        "asOf":ref("UtcInstant"),"state":enum(["PENDING","EVIDENCE","INSUFFICIENT","CONFLICTING_CONTEXT","LOCAL_RANKED","MODEL_FALLBACK"]),
        "modelName":nullable(text(minLength=1,maxLength=100)),"policyVersion":text(minLength=1,maxLength=30),
        "version":{"type":"integer","minimum":1,"maximum":500},"previousReportId":nullable(ref("OpaqueId")),
        "current":{"type":"boolean"},
        "citations":array(ref("ResearchLocation"),maxItems=3),"facts":array(ref("FinancialFact"),maxItems=12),
        "feedback":nullable(ref("ResearchReportFeedback"))})
    d["ResearchReportSummary"] = obj({"reportId":ref("OpaqueId"),"question":text(minLength=1,maxLength=320),
        "asOf":ref("UtcInstant"),"version":{"type":"integer","minimum":1,"maximum":500}})
    d["ResearchReportHistory"] = obj({"items":array(ref("ResearchReportSummary"),maxItems=20),"hasMore":{"type":"boolean"}})
    d["ResearchSearchResult"] = obj({"documents":array(ref("CompanySource"),maxItems=20),
        "passages":array(ref("ResearchLocation"),maxItems=20),"moreDocuments":{"type":"boolean"},"morePassages":{"type":"boolean"}})
    d["CompanyResearchOverview"] = obj({
        "companyId":ref("OpaqueId"),"companyName":text(minLength=1,maxLength=120),
        "primarySources":{"type":"integer","minimum":0},"indexedSources":{"type":"integer","minimum":0},
        "sources":array(ref("CompanySource"),maxItems=6),"events":array(ref("CompanyEvent"),maxItems=6),
        "notes":array(ref("CompanyResearchNote"),maxItems=50)})
    d["FinancialComparison"] = obj({
        "state":enum(["COMPARABLE","INCOMPARABLE"]),
        "reason":nullable(enum(["DIFFERENT_REPORTING_BASIS","DIFFERENT_OR_OVERLAPPING_PERIODS","NON_POSITIVE_BASE","PERCENTAGE_POINTS"])),
        "current":ref("FinancialFact"),"previous":ref("FinancialFact"),"change":nullable(ref("DecimalString")),
        "percentChange":nullable(ref("DecimalString")),
    })
    event_categories = ["EARNINGS","CAPITAL","GOVERNANCE","CORPORATE_ACTION","ORDERS","CREDIT","REGULATORY","OUTLOOK","OTHER"]
    event_category = enum(event_categories)
    event_subtype = enum(["RESULTS","RESULTS_MEETING","BUYBACK","CAPITAL_RAISE","AUDITOR","GOVERNANCE","DIVIDEND",
                          "SPLIT_BONUS","MERGER","ACQUISITION","ORDER","RATING_DOWNGRADE","RATING_CHANGE","MANAGEMENT_CHANGE",
                          "REGULATORY","GUIDANCE_CUT","GUIDANCE_UPDATE","OTHER"])
    d["CompanyEventType"] = event_subtype
    event_revision = {"type":"integer","minimum":1,"maximum":100}
    classification = {
        "subtype": event_subtype, "stage": enum(["ANNOUNCED","DECIDED","COMPLETED","CANCELLED","UNKNOWN"]),
        "materiality": enum(["HIGH","MEDIUM","LOW","UNKNOWN"]), "novelty": enum(["NEW","FOLLOW_UP","CORRECTION","ROUTINE","UNKNOWN"]),
    }
    d["EventSuggestion"] = obj({"category": event_category, **classification, "confidence": enum(["TITLE_HINT","UNKNOWN"])})
    d["AnnouncedEventDate"] = obj({
        "type": enum(["MEETING","RESULTS","EX_DATE","RECORD_DATE","OTHER"]),
        "date": ref("SessionDate"), "certainty": enum(["CONFIRMED","TENTATIVE","CANCELLED"]),
    })
    announced_dates = array(ref("AnnouncedEventDate"),maxItems=5)
    d["CompanyEventInput"] = obj({
        "documentId": ref("OpaqueId"), "documentRevision": source_revision, "eventId": nullable(ref("OpaqueId")),
        "expectedRevision": nullable(event_revision), "title": text(maxLength=120), "groupingKey": nullable(text(maxLength=80)),
        **classification, "reviewed": {"const":True}, "dates": announced_dates,
    }, optional=("dates",))
    d["CompanyEvent"] = obj({
        "eventId": ref("OpaqueId"), "versionId": ref("OpaqueId"), "companyId": ref("OpaqueId"), "companyName": text(maxLength=120), "revision": event_revision,
        "documentId": ref("OpaqueId"), "documentRevision": source_revision, "sourceTitle": text(maxLength=120), "title": text(maxLength=120),
        "category": event_category, **classification, "confidence": {"const":"REVIEWED"}, "reviewedAt": ref("UtcInstant"), "dates": announced_dates,
    })
    d["CompanyEventPage"] = obj({"items": array(ref("CompanyEvent"),maxItems=40), "hasMore": {"type":"boolean"}})
    d["CompanyEventHistory"] = obj({"items": array(ref("CompanyEvent"),maxItems=100)})
    attention_view = enum(["ACTIVE","UNREAD","HIDDEN"])
    d["AttentionState"] = obj({
        "read": {"type":"boolean"}, "muted": {"type":"boolean"}, "snoozedUntil": nullable(ref("UtcInstant")),
    })
    d["AttentionFeedback"] = obj({
        "eventRevision": event_revision, "action": enum(["READ","UNREAD","MUTE","UNMUTE","SNOOZE","UNSNOOZE"]),
        "snoozeUntil": nullable(ref("UtcInstant")),
    })
    points = {"type":"integer","minimum":0,"maximum":75}
    d["AttentionItem"] = obj({
        "event": ref("CompanyEvent"), "score": points, "state": ref("AttentionState"),
        "reasons": array(obj({"label":text(maxLength=100), "points":points}),maxItems=3),
        "holdings": array(obj({"securityId":ref("OpaqueId"), "name":text(maxLength=120), "quantity":ref("PositiveDecimalString")}),maxItems=100),
    })
    d["AttentionPage"] = obj({
        "coverage": enum(["NO_RECORDS","PARTIAL","RECORDED_ACCOUNTS"]), "rankedAt": ref("UtcInstant"),
        "items": array(ref("AttentionItem"),maxItems=25), "hasMore": {"type":"boolean"},
    })
    d["CompanyNewsInput"] = obj({
        "companyId": ref("OpaqueId"), "headline": text(maxLength=120), "publisher": text(maxLength=120),
        "url": text(maxLength=1000), "publishedAt": nullable(ref("UtcInstant")), "rightsConfirmed": {"const":True},
    })
    d["CompanyNewsCluster"] = obj({
        "clusterId": ref("OpaqueId"), "companyId": ref("OpaqueId"), "companyName": text(maxLength=120),
        "headline": text(maxLength=120), "date": ref("SessionDate"), "sources": array(ref("CompanySource"),maxItems=200),
    })
    d["CompanyNewsPage"] = obj({
        "coverage": {"const":"MANUAL_LINKS"}, "items": array(ref("CompanyNewsCluster"),maxItems=25), "hasMore": {"type":"boolean"},
    })
    d["FilingRuleSettings"] = obj({
        "companyId": nullable(ref("OpaqueId")), "title": text(maxLength=80),
        "category": enum(["ANY", *event_categories]),
        "minimumMateriality": enum(["ANY","MEDIUM","HIGH"]),
        **{key: {"type":"boolean"} for key in ("arrivals","dates","tentative")},
    })
    d["FilingRule"] = obj({
        "ruleId": ref("OpaqueId"), "revision": reminder_revision, "enabled": {"type":"boolean"}, "settings": ref("FilingRuleSettings"),
    })
    d["FilingRuleList"] = obj({"items": array(ref("FilingRule"),maxItems=20)})
    d["FilingRuleChange"] = obj({"expectedRevision": reminder_revision, "enabled": {"type":"boolean"}})
    d["CompanyCalendarPage"] = obj({
        "items": array(obj({
            "eventId": ref("OpaqueId"), "versionId": ref("OpaqueId"), "revision": event_revision, "title": text(maxLength=120),
            "companyName": text(maxLength=120), "documentId": ref("OpaqueId"), "documentRevision": source_revision,
            "date": ref("AnnouncedEventDate"),
        }),maxItems=40),
        "hasMore": {"type":"boolean"},
    })
    d["RadarStock"] = obj({
        "companyName": text(maxLength=120), "companyId":ref("OpaqueId"), "listingId":nullable(ref("OpaqueId")),
        "symbol":nullable(text(maxLength=72)), "exchange":nullable(enum(["NSE","BSE"])),
        "sector":nullable(ref("DiscoverySector")), "held":{"type":"boolean"}, "watched":{"type":"boolean"},
    })
    d["RadarAnnouncement"] = obj({
        "event":ref("CompanyEvent"), "publishedAt":nullable(ref("UtcInstant")),
        "sourceUrl":nullable(text(maxLength=1000)), "sourceName":text(maxLength=120),
    })
    d["RadarMovement"] = obj({
        "session":ref("SessionDate"), "previousSession":ref("SessionDate"),
        "changePercent":nullable(ref("DecimalString")), "volumeMultiple":nullable(ref("DecimalString")),
        "medianTurnover":nullable(ref("PositiveDecimalString")), "unusualPrice":{"type":"boolean"},
        "unusualVolume":{"type":"boolean"}, "baselineSessions":{"type":"integer","minimum":1,"maximum":21},
    })
    d["RadarEntry"] = obj({
        "stock":ref("RadarStock"), "announcement":nullable(ref("RadarAnnouncement")),
        "movement":nullable(ref("RadarMovement")),
        "sectorMove":nullable(obj({"peers":{"type":"integer","minimum":3,"maximum":59},"medianChangePercent":ref("DecimalString")})),
        "score":{"type":"integer","minimum":0,"maximum":150},
        "reasons":array(obj({"label":text(maxLength=100),"points":{"type":"integer","minimum":0,"maximum":40}}),maxItems=9),
    })
    d["MarketRadar"] = obj({
        "asOf":ref("SessionDate"), "listingsChecked":{"type":"integer","minimum":0,"maximum":60},
        "listingsWithRecentPrices":{"type":"integer","minimum":0,"maximum":60},
        "listingLimitReached":{"type":"boolean"}, "holdingsCoverage":enum(["NO_RECORDS","PARTIAL","RECORDED_ACCOUNTS"]),
        "items":array(ref("RadarEntry"),maxItems=50), "truncated":{"type":"boolean"},
    })
    d["RadarCalendarEntry"] = obj({"stock":ref("RadarStock"),"event":ref("CompanyEvent"),"date":ref("AnnouncedEventDate")})
    d["RadarCalendar"] = obj({"asOf":ref("SessionDate"),"holdingsCoverage":enum(["NO_RECORDS","PARTIAL","RECORDED_ACCOUNTS"]),
                               "items":array(ref("RadarCalendarEntry"),maxItems=20)})
    d["RadarLeadSearch"] = obj({"days":{"type":"integer","minimum":1,"maximum":30},"eventType":nullable(ref("CompanyEventType"))})
    d["RadarLeads"] = obj({"items":array(obj({
        "symbol":text(maxLength=36), "companyName":text(maxLength=120), "eventType":ref("CompanyEventType"),
        "publishedOn":ref("SessionDate"), "headline":text(maxLength=160), "detail":text(maxLength=500),
        "url":text(pattern=r"^https://",maxLength=4000),
    }),maxItems=5)})
    d["EventReplay"] = obj({
        "mode": {"const":"SYNTHETIC_REPLAY"}, "runId": nullable(ref("OpaqueId")), "savedAt": nullable(ref("UtcInstant")),
        "events": array(obj({"attention": ref("AttentionItem"), "evidence": ref("CompanySourceDetail")}),maxItems=25),
        "notifications": array(obj({"title": text(maxLength=160), "status": delivery_status}),maxItems=20),
        "brief": nullable(ref("PortfolioBrief")),
    })
    d["NotificationDeliveryPage"] = obj({
        "emailPreviewEnabled": {"type":"boolean"},
        "items": array(obj({"activityId": ref("OpaqueId"), "title": text(maxLength=160), "kind": activity_kind,
                            "delivery": ref("NotificationDelivery")}),maxItems=50),
    })
    diagnostic_count = {"type":"integer","minimum":0}
    d["PriceCoverage"] = obj({field: diagnostic_count for field in ("trackedListings","withClose","recentClose")})
    d["PriceQuota"] = obj({
        **{field: diagnostic_count for field in ("requestsLastHour","hourlyLimit","remaining","pending","pendingLimit")},
        "status": enum(["AVAILABLE","HOURLY_LIMIT_REACHED","PENDING_LIMIT_REACHED"]),
    })
    d["PriceRun"] = obj({
        "jobId": ref("OpaqueId"), "listingId": ref("OpaqueId"), "symbol": text(maxLength=72), "exchange": enum(["NSE","BSE"]),
        "state": enum(["QUEUED","RUNNING","SUCCEEDED","PARTIALLY_SUCCEEDED","FAILED","CANCELLED"]),
        "failureCode": nullable(ref("OpaqueId")), "updatedAt": ref("UtcInstant"),
        "rowsReturned": nullable({"type":"integer","minimum":0,"maximum":31}),
    })
    d["MarketDiagnostics"] = obj({
        "yahooCapability": enum(["DISABLED","CONFIGURATION_REQUIRED","PRIVATE_DAILY"]),
        **{field: enum(["UNVERIFIED"]) for field in ("officialFiles","streaming")},
        **{field: enum(["UNKNOWN"]) for field in ("providerDelay","providerQuota")},
        "lastSuccessfulAcquisition": nullable(ref("UtcInstant")),
        "sourceValidationFailuresLastDay": diagnostic_count, "failedRunsLastDay": diagnostic_count,
        "coverage": ref("PriceCoverage"), "quota": ref("PriceQuota"),
        "recentRuns": array(ref("PriceRun"),maxItems=15),
    }, "Owner-scoped diagnostics. The quota is FINN's application limit and says nothing about the provider's quota.")
    d["ListingIdentity"] = obj({
        "listingId": ref("OpaqueId"), "securityId": ref("OpaqueId"),
        "companyId": ref("OpaqueId"), "exchange": enum(["NSE", "BSE"]),
        "segment": {"type": "string", "const": "CASH_EQUITY"},
        "series": text(maxLength=16), "symbol": text(maxLength=64),
        "currency": {"type": "string", "const": "INR"},
        "isin": nullable(text(pattern=r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$", maxLength=12)),
    }, "Stable listing identity. NSE and BSE listings remain distinct even for one security. ISIN may be unknown; ticker is not a permanent identifier.")
    d["Delay"] = {"description": "Delay is source-declared or unknown; FINN receipt time is not evidence of zero upstream delay.", "oneOf": [
        obj({"kind": {"type": "string", "const": "EOD"}, "seconds": {"type": "null"},
             "basis": enum(["SOURCE_DECLARED", "UNKNOWN"])}),
        obj({"kind": {"type": "string", "const": "UNKNOWN"}, "seconds": {"type": "null"},
             "basis": {"type": "string", "const": "UNKNOWN"}}),
        obj({"kind": {"type": "string", "const": "DELAYED"},
             "seconds": {"type": "integer", "minimum": 1},
             "basis": {"type": "string", "const": "SOURCE_DECLARED"}}),
    ]}
    rights_common = {
        "policyId": ref("OpaqueId"), "reviewedAt": nullable(ref("UtcInstant")),
        "retentionUntil": nullable(ref("UtcInstant")),
        "attribution": nullable(text(maxLength=512)),
    }
    d["Rights"] = {"description": "A routing restriction, not a legal entitlement. Public real-data distribution is outside this contract's validated modes.", "oneOf": [
        obj({**rights_common,
             "mode": {"type": "string", "const": "SYNTHETIC_PUBLIC_DEMO"},
             "reviewStatus": {"type": "string", "const": "VERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": True},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
        obj({**rights_common,
             "mode": {"type": "string", "const": "PRIVATE_PERSONAL"},
             "reviewStatus": {"type": "string", "const": "VERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": False},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
        obj({**rights_common,
             "mode": {"type": "string", "const": "RESTRICTED_UNVERIFIED"},
             "reviewStatus": {"type": "string", "const": "UNVERIFIED"},
             "publicDisplayAllowed": {"type": "boolean", "const": False},
             "externalAiAllowed": {"type": "boolean", "const": False}}),
    ]}
    d["SourceTimes"] = obj({
        "observedAt": nullable(ref("UtcInstant")),
        "publishedAt": nullable(ref("UtcInstant")),
        "providerAvailableAt": nullable(ref("UtcInstant")),
        "firstSeenAt": ref("UtcInstant"),
        "ingestedAt": nullable(ref("UtcInstant")),
        "acceptedAt": nullable(ref("UtcInstant")),
        "unknownTimeReasons": array(enum([
            "OBSERVATION_TIME_NOT_PROVIDED", "PUBLICATION_TIME_NOT_PROVIDED",
            "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED", "NOT_YET_INGESTED", "NOT_YET_ACCEPTED",
        ]), maxItems=5),
    }, "Source and FINN processing times are distinct. Null timestamps require matching unknownTimeReasons; checked by semantic validation.")
    d["Provenance"] = obj({
        "provider": ref("Provider"), "providerInstrumentId": text(maxLength=128),
        "mappingVersion": ref("OpaqueId"), "adapterVersion": text(maxLength=64),
        "sourceName": text(maxLength=128), "sourceLocator": nullable(text(format="uri", maxLength=2048)),
        "artifactSha256": nullable(text(pattern=r"^[a-f0-9]{64}$", maxLength=64)),
        "sourceRevision": ref("OpaqueId"), "parserVersion": text(maxLength=64),
        "sourceTimezone": {"type": "string", "const": "Asia/Kolkata"},
        "times": ref("SourceTimes"), "delay": ref("Delay"),
        "rights": ref("Rights"),
        "quality": enum(["VALIDATED", "REVIEW_REQUIRED"]),
        "qualityFlags": array(ref("OpaqueId"), maxItems=32),
    }, "No personal local paths, credentials, cookies, private object URLs, or source payloads in public provenance.")
    d["PriceBasis"] = obj({
        "ohlcPrice": ref("AdjustmentBasis"),
        "adjustedClose": nullable(ref("AdjustmentBasis")),
        "volume": enum(["AS_REPORTED", "SPLIT_ADJUSTED", "PROVIDER_DEFINED", "UNKNOWN"]),
        "adjustmentAsOf": nullable(ref("SessionDate")),
    })
    d["PriceObservation"] = obj({
        "observationId": ref("OpaqueId"), "listing": ref("ListingIdentity"),
        "sessionDate": ref("SessionDate"),
        "interval": {"type": "string", "const": "ONE_DAY"},
        "open": nullable(ref("PositiveDecimalString")),
        "high": nullable(ref("PositiveDecimalString")),
        "low": nullable(ref("PositiveDecimalString")),
        "close": ref("PositiveDecimalString"),
        "adjustedClose": nullable(ref("PositiveDecimalString")),
        "volume": nullable(ref("IntegerString")),
        "turnover": nullable(ref("NonNegativeDecimalString")),
        "basis": ref("PriceBasis"),
        "finality": enum(["FINAL", "PROVISIONAL", "UNKNOWN"]),
        "provenance": ref("Provenance"),
    }, "One present EOD observation. A missing close is represented by unavailable result and no observation. Partial OHLC/volume stay null. As-traded and adjusted series are never interchangeable.")
    result_common = {"listing": ref("ListingIdentity"), "reasonCode": ref("OpaqueId"),
                     "warnings": array(ref("Warning"), maxItems=32)}
    d["InstrumentResult"] = {"oneOf": [
        obj({**result_common, "availability": {"type": "string", "const": "AVAILABLE"},
             "observations": array(ref("PriceObservation"), minItems=1)}),
        obj({**result_common, "availability": enum(UNAVAILABLE),
             "observations": array(ref("PriceObservation"), maxItems=0)}),
    ]}
    d["AcquisitionEnvelope"] = obj({
        "contractVersion": ref("ContractVersion"), "requestId": ref("OpaqueId"),
        "provider": ref("Provider"), "adapterVersion": text(maxLength=64),
        "requestedAt": ref("UtcInstant"), "completedAt": ref("UtcInstant"),
        "outcome": enum(["COMPLETE", "PARTIAL", "UNAVAILABLE"]),
        "results": array(ref("InstrumentResult"), minItems=1, maxItems=100),
        "warnings": array(ref("Warning"), maxItems=32),
    }, "Internal acquisition response: per-listing partial success is explicit. COMPLETE means every requested listing has observations; it does not prove complete date-range coverage.")
    d["Freshness"] = obj({
        "state": enum(["FRESH", "STALE", "UNKNOWN", "NOT_APPLICABLE"]),
        "evaluatedAt": ref("UtcInstant"),
        "expectedSessionDate": nullable(ref("SessionDate")),
        "latestSessionDate": nullable(ref("SessionDate")),
        "reasonCode": ref("OpaqueId"),
    }, "Calendar-aware age/eligibility assessment. A weekend does not make the newest expected completed session stale. FRESH requires equal known latest/expected sessions.")
    capabilities = ["QUOTE", "DAILY_HISTORY", "INTRADAY_HISTORY", "STREAMING",
                    "CORPORATE_ACTIONS", "FILINGS", "NEWS", "FUNDAMENTALS"]
    d["Capability"] = obj({
        "capability": enum(capabilities),
        "status": enum(["VALIDATED", "DOCUMENTED_UNVERIFIED", "UNSUPPORTED", "TEMPORARILY_UNAVAILABLE"]),
        "coverage": text(maxLength=512),
        "evidence": text(maxLength=512),
    }, "A documented library interface does not establish validated Indian listing coverage, timing, or rights.")
    d["ProviderCapabilities"] = obj({
        "contractVersion": ref("ContractVersion"), "provider": ref("Provider"),
        "adapterVersion": text(maxLength=64), "evaluatedAt": ref("UtcInstant"),
        "capabilities": array(ref("Capability"), minItems=8, maxItems=8),
        "rights": ref("Rights"),
    }, "Exactly one entry per declared capability; uniqueness/completeness are semantic checks.")
    d["ProviderStatus"] = obj({
        "provider": ref("Provider"), "health": enum(["HEALTHY", "DEGRADED", "UNAVAILABLE", "UNTESTED"]),
        "checkedAt": ref("UtcInstant"),
        "lastSuccessfulAcquisitionAt": nullable(ref("UtcInstant")),
        "reasonCode": ref("OpaqueId"), "capabilities": ref("ProviderCapabilities"),
    }, "Operational status is distinct from market-data freshness. No service SLA or live exchange certification is implied.")
    d["ProblemField"] = obj({"field": text(maxLength=128), "code": ref("OpaqueId")})
    d["Problem"] = obj({
        "type": text(format="uri", maxLength=256), "title": text(maxLength=128),
        "status": {"type": "integer", "minimum": 400, "maximum": 599},
        "detail": text(maxLength=512), "instance": text(maxLength=512),
        "code": enum(list(PROBLEM_STATUSES)),
        "traceId": ref("OpaqueId"), "errors": array(ref("ProblemField"), maxItems=100),
    }, "RFC9457 problem response. Do not expose stack traces, private rows, tokens, or upstream cookies.", optional=("errors",))
    page_common = {"contractVersion": ref("ContractVersion"), "requestId": ref("OpaqueId")}
    d["InstrumentPage"] = obj({**page_common, "items": array(ref("ListingIdentity"), maxItems=100),
                               "nextCursor": nullable(text(maxLength=512))})
    quote_common = {**page_common, "listing": ref("ListingIdentity"), "freshness": ref("Freshness"),
                    "selectionReason": ref("OpaqueId"), "warnings": array(ref("Warning"), maxItems=32)}
    d["QuoteResponse"] = {"description": "Latest eligible stored EOD observation, not a tick or a promised live quote. Unavailability is a normal domain result; service/auth failures use Problem.", "oneOf": [
        obj({**quote_common, "availability": {"type": "string", "const": "AVAILABLE"},
             "observation": ref("PriceObservation")}),
        obj({**quote_common, "availability": enum(UNAVAILABLE), "observation": {"type": "null"}}),
    ]}
    d["HistoryCoverage"] = obj({
        "state": enum(["COMPLETE", "PARTIAL", "UNKNOWN", "NONE"]),
        "expectedSessions": nullable({"type": "integer", "minimum": 0}),
        "availableSessions": {"type": "integer", "minimum": 0},
        "missingSessions": array(ref("SessionDate")), "reasonCode": ref("OpaqueId"),
    }, "Coverage describes the entire requested range at selectionSnapshotId, not this page. COMPLETE requires a verified calendar, equal expected/available counts, and no missing sessions. availableSessions may exceed the current page length.")
    d["HistoryResponse"] = obj({
        **page_common, "listing": ref("ListingIdentity"),
        "from": ref("SessionDate"), "toExclusive": ref("SessionDate"),
        "requestedBasis": ref("AdjustmentBasis"), "selectionSnapshotId": ref("OpaqueId"),
        "availability": enum(["AVAILABLE", *UNAVAILABLE]),
        "items": array(ref("PriceObservation")),
        "nextCursor": nullable(text(maxLength=512)),
        "coverage": ref("HistoryCoverage"), "freshness": ref("Freshness"),
        "warnings": array(ref("Warning"), maxItems=32),
    }, "Ascending sessionDate/observationId order. ONE_DAY only. Never fill gaps with zero or a silent previous close. Cursors bind listing, range, basis and source-selection snapshot.")
    d["ProviderStatusPage"] = obj({**page_common, "items": array(ref("ProviderStatus"), maxItems=4)})
    d["UserProfile"] = obj({"userId": ref("OpaqueId"), "displayName": text(maxLength=120)},
                            "Application identity only. Provider claims, subject, tokens and secrets are never serialized here.")
    d["CsrfInformation"] = obj({"headerName": {"const": "X-CSRF-TOKEN"}, "parameterName": {"const": "_csrf"}, "token": text(maxLength=2048)})
    preference_fields = {"timeZone": text(maxLength=64), "currency": {"const": "INR"},
                         "inAppNotifications": {"type": "boolean"}, "emailNotifications": {"type": "boolean"},
                         "revision": {"type": "integer", "minimum": 0, "maximum": 9007199254740991}}
    d["PreferencesUpdate"] = obj(preference_fields, "Owner comes only from the authenticated session. Revision prevents silent lost updates. Only supported IANA zone IDs are accepted by Java.")
    d["Preferences"] = obj({**preference_fields, "deliveryAvailable": {"const": True}}, "In-app delivery is enabled. An optional email preview is configured separately.")
    catalogue_sources = ["MANUAL_USER","NSE_DIRECTORY","YAHOO_DISCOVERY"]
    d["CatalogueCompany"] = obj({"companyId": ref("OpaqueId"), "name": text(maxLength=120), "source": enum([*catalogue_sources,"GROWW_HOLDINGS"])})
    d["CatalogueCompanies"] = array(ref("CatalogueCompany"), maxItems=100)
    d["CompanyInput"] = obj({"name": text(maxLength=120)})
    isin = nullable(text(pattern=r"^[A-Z]{2}[A-Z0-9]{9}[0-9]$", maxLength=12))
    d["CatalogueSecurity"] = obj({"securityId": ref("OpaqueId"), "companyId": ref("OpaqueId"), "companyName": text(maxLength=120), "name": text(maxLength=120), "isin": isin, "reviewStatus": enum(["USER_CONFIRMED", "UNRESOLVED"])})
    d["SecurityInput"] = obj({"companyId": ref("OpaqueId"), "name": text(maxLength=120), "isin": isin, "confirmed": {"const": True}})
    d["CatalogueListing"] = obj({**d["ListingIdentity"]["properties"], "providerSymbol": nullable(text(maxLength=72)), "reviewStatus": {"const": "USER_CONFIRMED"}, "source": enum(catalogue_sources), "validFrom": ref("SessionDate")}, "An owner-scoped listing selected or confirmed by the user.")
    listing_fields={"exchange": enum(["NSE", "BSE"]), "series": text(pattern=r"^[A-Z0-9_-]{1,16}$", maxLength=16), "symbol": text(pattern=r"^[A-Z0-9][A-Z0-9&._-]{0,63}$", maxLength=64), "providerSymbol": nullable(text(maxLength=72)), "validFrom": ref("SessionDate"), "confirmed": {"const": True}}
    d["ListingInput"] = obj(listing_fields)
    d["SymbolInput"] = obj({"symbol": listing_fields["symbol"], "providerSymbol": listing_fields["providerSymbol"], "effectiveDate": ref("SessionDate"), "confirmed": {"const": True}})
    d["CatalogueSecurityDetail"] = obj({"security": ref("CatalogueSecurity"), "listings": array(ref("CatalogueListing"), maxItems=100)})
    d["CatalogueSecurityPage"] = obj({"items": array(ref("CatalogueSecurity"), maxItems=100), "limit": {"type": "integer", "minimum": 1, "maximum": 100}, "offset": {"type": "integer", "minimum": 0, "maximum": 10000}, "hasMore": {"type": "boolean"}})
    d["SymbolHistory"] = obj({"symbol": text(maxLength=64), "validFrom": ref("SessionDate"), "validTo": nullable(ref("SessionDate")), "source": enum(catalogue_sources)})
    d["SymbolHistoryList"] = array(ref("SymbolHistory"), maxItems=100)
    stock_key = {"exchange": listing_fields["exchange"], "symbol": listing_fields["symbol"]}
    d["StockLookupSelection"] = obj(stock_key)
    d["StockSuggestion"] = obj({**stock_key, "name": text(maxLength=120), "series": listing_fields["series"],
        "isin": isin, "validFrom": ref("SessionDate"), "source": enum(["NSE_DIRECTORY","YAHOO_DISCOVERY"])})
    d["StockLookupResults"] = obj({"items": array(ref("StockSuggestion"),maxItems=10), "status": enum(["READY","UNAVAILABLE"])})
    d["StockLookupOpened"] = obj({"listing": ref("CatalogueListing"), "refreshStatus": enum(["QUEUED","RECENT","UNAVAILABLE"])})
    d["PortfolioSummary"] = obj({"portfolioId": ref("OpaqueId"), "name": text(maxLength=120), "currency": {"const":"INR"}, "archived": {"type":"boolean"}, "revision": {"type":"integer","minimum":0,"maximum":9007199254740991}})
    d["PortfolioList"] = obj({"items": array(ref("PortfolioSummary"),maxItems=100)}, "Includes active and archived portfolios. At most 100 may be created per owner in this supported scope.")
    d["PortfolioInput"] = obj({"name":text(maxLength=120)})
    d["PortfolioArchiveInput"] = obj({"archived":{"type":"boolean"},"revision":{"type":"integer","minimum":0,"maximum":9007199254740991}})
    account_fields={"accountId":ref("OpaqueId"),"portfolioId":ref("OpaqueId"),"name":text(maxLength=120),"source":enum(["GROWW","MANUAL","OTHER"]),"currency":{"const":"INR"}}
    d["InvestmentAccount"] = {"description":"A source account is a private tracking record, never a broker API connection or trading permission. Creation does not establish history coverage.","oneOf":[obj({**account_fields,"historyStatus":{"const":"UNKNOWN"},"historyStartDate":{"type":"null"}}),obj({**account_fields,"historyStatus":enum(["HOLDINGS_ONLY","PARTIAL_TRADES"]),"historyStartDate":ref("SessionDate")})]}
    d["AccountInput"] = obj({"name":text(maxLength=120),"source":enum(["GROWW","MANUAL","OTHER"]),"currency":{"const":"INR"}})
    d["PortfolioDetail"] = obj({"portfolio":ref("PortfolioSummary"),"accounts":array(ref("InvestmentAccount"),maxItems=100)}, "Archive blocks financial writes and preserves readable account/ledger history. Restore is supported; no deletion is exposed.")
    ledger_types=["BUY","SELL","FEE","DEPOSIT","WITHDRAWAL","OPENING_POSITION","OPENING_CASH"]
    ledger_id=nullable(ref("OpaqueId"))
    ledger_date=nullable(ref("SessionDate"))
    ledger_decimal=nullable(text(pattern=r"^(?:0|[1-9][0-9]{0,21})(?:\.[0-9]{1,8})?$",maxLength=31))
    ledger_text=nullable(text(maxLength=120))
    ledger_revision={"type":"integer","minimum":0,"maximum":10000}
    ledger_sequence={**ledger_revision,"minimum":1}
    ledger_input={"kind":enum(ledger_types),"effectiveDate":ref("SessionDate"),"securityId":ledger_id,"listingId":ledger_id,"quantity":ledger_decimal,"price":ledger_decimal,"amount":ledger_decimal,"fees":ledger_decimal,"reference":ledger_text}
    d["LedgerEntryInput"]=obj(ledger_input,"Record an already executed transaction or reviewed opening balance. Exact decimal text only. BUY/SELL require security, whole units and price; fees null means unknown. FEE/DEPOSIT/WITHDRAWAL use positive amount. OPENING_POSITION uses quantity plus optional total opening cost in amount. OPENING_CASH uses a nonnegative end-of-day balance. No event executes a trade.")
    ledger_key={"idempotencyKey":text(format="uuid",maxLength=36)}
    d["LedgerRecordInput"]=obj({**ledger_key,"event":ref("LedgerEntryInput")})
    d["LedgerReverseInput"]=obj({**ledger_key,"reference":ledger_text})
    d["LedgerCorrectInput"]=obj({**ledger_key,"replacement":ref("LedgerEntryInput"),"reference":ledger_text})
    d["LedgerReceipt"]=obj({"commandId":ref("OpaqueId"),"revision":ledger_sequence,"eventIds":array(ref("OpaqueId"),minItems=1,maxItems=2),"replayed":{"type":"boolean"}},"Same owner/account key and normalized inputs return the original command and event IDs. Changed inputs conflict. Reversal plus replacement is atomic.")
    ratio=nullable({"type":"integer","minimum":1,"maximum":1000000})
    d["LedgerEventView"]=obj({**ledger_input,"kind":enum([*ledger_types,"SPLIT","BONUS","DIVIDEND","REVERSAL"]),"eventId":ref("OpaqueId"),"sequence":ledger_sequence,"securityName":ledger_text,"exchange":nullable(enum(["NSE","BSE"])),"reversalOf":ledger_id,"reversedBy":ledger_id,"replacesEventId":ledger_id,"source":enum(["MANUAL","GROWW_HOLDINGS","REVIEWED_CORPORATE_ACTION"]),"sourceReference":ledger_id,"recordedAt":ref("UtcInstant"),"ratioNumerator":ratio,"ratioDenominator":ratio})
    d["LedgerPage"]=obj({"items":array(ref("LedgerEventView"),maxItems=100),"nextBefore":nullable(ledger_sequence)},"Descending account sequence; before is exclusive. Original and reversing records remain visible.")
    d["LedgerPosition"]=obj({"securityId":ref("OpaqueId"),"securityName":ledger_text,"quantity":ref("IntegerString"),"recordedCost":nullable(ref("NonNegativeDecimalString")),"averageCost":nullable(ref("NonNegativeDecimalString")),"costBasis":enum(["RECORDED_TRADES","REPORTED_OPENING_COST","MIXED_RECORDED_COST","UNKNOWN"])})
    d["LedgerView"]=obj({"revision":ledger_revision,"calculationVersion":{"const":"MOVING_AVERAGE_1"},"currency":{"const":"INR"},"positions":array(ref("LedgerPosition"),maxItems=1000),"cashBalance":nullable(ref("DecimalString")),"recordedCashComponents":ref("DecimalString"),"cashMovementsComplete":{"type":"boolean"},"realisedPnl":nullable(ref("DecimalString")),"knownRealisedPnl":ref("DecimalString"),"recordedFees":ref("NonNegativeDecimalString"),"recordedFeesComplete":{"type":"boolean"},"standaloneFees":ref("NonNegativeDecimalString"),"netContributions":ref("DecimalString"),"cashBaselineDate":ledger_date,"coverageStart":ledger_date,"historyStatus":enum(["UNKNOWN","HOLDINGS_ONLY","PARTIAL_TRADES"]),"warnings":array(ref("OpaqueId"),maxItems=32)},"Tracked positions and accounting effects, not a full broker balance or tax calculation. Cash requires an explicit baseline and known movements. Coverage is partial; never fabricate past returns. Quantity/cost are by security; valuation needs a separate reviewed listing.")
    d["ImportTicket"]=obj({"importId":ref("OpaqueId"),"jobId":ref("OpaqueId"),"duplicate":{"type":"boolean"}},"Byte-identical uploads reuse the original and its current job within the same owned account.")
    d["LedgerView"]["properties"]["recordedDividends"]=ref("NonNegativeDecimalString")
    d["LedgerView"]["required"].append("recordedDividends")
    d["LedgerExportInput"]=obj({"expectedLedgerRevision":ledger_revision},"Export the reviewed current journal revision only. Readable after archive. No credentials, account identity or source workbook bytes are exported.")
    d["CorporateActionInput"]=obj({"type":enum(["SPLIT","BONUS","DIVIDEND","SYMBOL_CHANGE","MERGER","DEMERGER","RIGHTS"]),"securityId":ref("OpaqueId"),"listingId":ledger_id,"effectiveDate":ref("SessionDate"),"ratioNumerator":ratio,"ratioDenominator":ratio,"netCash":ledger_decimal,"sourceReference":text(pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$",maxLength=64),"sourceUrl":nullable(text(format="uri",maxLength=512)),"newSymbol":nullable(text(maxLength=64)),"newProviderSymbol":nullable(text(maxLength=72)),"correctsActionId":ledger_id},"Explicit reviewed source evidence. Split ratio is new total units per old units; bonus ratio is additional units per old units. Dividend is net credited cash. Complex/fractional actions require manual review.")
    d["CorporateActionEffect"]=obj({"state":enum(["APPLICABLE","NEEDS_REVIEW"]),"reason":ledger_id,"ledgerRevision":ledger_revision,"unitsBefore":ledger_decimal,"unitsAfter":ledger_decimal,"recordedCostBefore":ledger_decimal,"recordedCostAfter":ledger_decimal,"cashDelta":ledger_decimal,"previousSymbol":nullable(text(maxLength=64)),"newSymbol":nullable(text(maxLength=64))})
    d["CorporateActionApproval"]=obj({"action":ref("CorporateActionInput"),"reviewed":{"const":True},"expectedLedgerRevision":ledger_revision})
    d["CorporateActionRecord"]=obj({"actionId":ref("OpaqueId"),"securityName":text(maxLength=120),"action":ref("CorporateActionInput"),"effect":ref("CorporateActionEffect"),"state":enum(["APPLIED","NEEDS_REVIEW","REVERSED"]),"ledgerEventId":ledger_id,"ledgerRevision":ledger_revision,"recordedAt":ref("UtcInstant"),"replayed":{"type":"boolean"}})
    d["CorporateActionList"]=obj({"items":array(ref("CorporateActionRecord"),maxItems=100)},"Most recent reviewed records. Source references are owner/account scoped and immutable.")
    d["HoldingsImportSummary"]=obj({"importId":ref("OpaqueId"),"jobId":ref("OpaqueId"),"state":enum(["QUEUED","RUNNING","SUCCEEDED","FAILED","PARTIALLY_SUCCEEDED","CANCELLED"]),"createdAt":ref("UtcInstant"),"sizeBytes":{"type":"integer","minimum":1,"maximum":5242880},"failureCode":nullable(text(pattern=r"^[A-Z][A-Z0-9_]{0,63}$",maxLength=64))})
    d["HoldingsImportList"]=obj({"items":array(ref("HoldingsImportSummary"),maxItems=30)})
    d["HoldingsRowIssue"]=obj({"code":ref("OpaqueId"),"column":enum(list("ABCDEFGH")),"blocksCommit":{"type":"boolean"}})
    evidence_amount=nullable(ref("DecimalString"))
    d["HoldingsSourceRow"]=obj({"rowNumber":{"type":"integer","minimum":12,"maximum":1024},"reportedName":nullable(text(maxLength=512)),"isin":isin,"quantity":evidence_amount,"averageCost":evidence_amount,"buyValue":evidence_amount,"closingPrice":evidence_amount,"closingValue":evidence_amount,"unrealisedPnl":evidence_amount,"issues":array(ref("HoldingsRowIssue"),maxItems=24)},"Source evidence only. Zero or missing closing price cannot become a market observation. No source account identity is staged.")
    d["HoldingsPreviewRow"]=obj({"source":ref("HoldingsSourceRow"),"matchedSecurityId":ledger_id,"mappingStatus":enum(["UNRESOLVED_SECURITY","EXISTING_SECURITY"])},"An exact owned ISIN can identify a security; exchange listing is never inferred.")
    d["HoldingsTotals"]=obj({"buyValue":evidence_amount,"closingValue":evidence_amount,"unrealisedPnl":evidence_amount})
    d["HoldingsComparison"]=obj({"field":enum(["BUY_VALUE","CLOSING_VALUE","UNREALISED_PNL"]),"reported":evidence_amount,"detailSum":evidence_amount,"difference":evidence_amount,"status":enum(["MATCH","MISMATCH","INCOMPLETE"])})
    d["HoldingsPreviewMetadata"]=obj({"profile":{"const":"groww-holdings-xlsx-v1"},"asOfDate":ref("SessionDate"),"reportedSummary":ref("HoldingsTotals"),"detailTotals":ref("HoldingsTotals"),"comparisons":array(ref("HoldingsComparison"),minItems=3,maxItems=3),"warnings":array(ref("OpaqueId"),maxItems=32),"rowCount":{"type":"integer","minimum":1,"maximum":1000}})
    cost_mode=enum(["UNITS_ONLY","REPORTED_ROW_COST"])
    import_count={"type":"integer","minimum":0,"maximum":1000}
    d["HoldingsAcceptanceInput"]=obj({"confirmInr":{"const":True},"retainUnresolvedListings":{"const":True},"acknowledgeDifferences":{"type":"boolean"},"costMode":cost_mode,"expectedLedgerRevision":ledger_revision},"Explicit review only. Requires current ledger revision and acknowledgement of discrepancies when present. Source IDs are the idempotency boundary; changing an accepted decision conflicts.")
    d["HoldingsAcceptanceReceipt"]=obj({"importId":ref("OpaqueId"),"outcome":enum(["APPLIED","DUPLICATE"]),"costMode":cost_mode,"acceptedRows":import_count,"skippedRows":import_count,"duplicateRows":import_count,"ledgerRevision":ledger_revision,"originalImportId":ledger_id,"replayed":{"type":"boolean"},"acceptedAt":ref("UtcInstant")})
    d["HoldingsReviewPlan"]=obj({"state":enum(["READY","ALREADY_ACCEPTED","DUPLICATE","SOURCE_CONFLICT","RECONCILIATION_ONLY","ROWS_BLOCKED","ARCHIVED"]),"currentLedgerRevision":ledger_revision,"eligibleRows":import_count,"duplicateRows":import_count,"conflictRows":import_count,"reportedCostAvailable":{"type":"boolean"},"differencesRequireAcknowledgement":{"type":"boolean"},"receipt":nullable(ref("HoldingsAcceptanceReceipt"))})
    d["HoldingsReconciliationRow"]=obj({"sourceRow":nullable({"type":"integer","minimum":12,"maximum":1024}),"securityId":ledger_id,"name":nullable(text(maxLength=512)),"isin":isin,"reportedUnits":evidence_amount,"recordedUnits":evidence_amount,"reportedCost":evidence_amount,"recordedCost":evidence_amount,"unitDifference":evidence_amount,"costDifference":evidence_amount,"issues":array(ref("OpaqueId"),maxItems=12)})
    reconciliation_count={"type":"integer","minimum":0,"maximum":2000}
    d["HoldingsReconciliation"]=obj({"importId":ref("OpaqueId"),"reportDate":ref("SessionDate"),"ledgerRevision":ledger_revision,"state":enum(["COMPARABLE","HISTORY_UNAVAILABLE"]),"coverageStart":ledger_date,"historyStatus":enum(["UNKNOWN","HOLDINGS_ONLY","PARTIAL_TRADES"]),"rowCount":reconciliation_count,"issueCount":reconciliation_count,"rows":array(ref("HoldingsReconciliationRow"),maxItems=100),"nextOffset":nullable(reconciliation_count),"reviewedAt":nullable(ref("UtcInstant"))},"Compare immutable ledger entries effective on or before the report date and accepted through this revision. Report minus recorded deltas are not tax-basis equivalence. No mutation or fabricated earlier positions.")
    d["HoldingsReconciliationInput"]=obj({"reviewed":{"const":True},"expectedLedgerRevision":ledger_revision})
    d["HoldingsReconciliationReceipt"]=obj({"importId":ref("OpaqueId"),"ledgerRevision":ledger_revision,"reviewedAt":ref("UtcInstant")})
    d["HoldingsPreviewPage"]=obj({"importId":ref("OpaqueId"),"jobId":ref("OpaqueId"),"ledgerRevisionAtPreview":ledger_revision,"metadata":ref("HoldingsPreviewMetadata"),"rows":array(ref("HoldingsPreviewRow"),maxItems=100),"nextOffset":nullable({"type":"integer","minimum":1,"maximum":1000}),"requiresInrConfirmation":{"const":True},"commitAvailable":{"type":"boolean"},"review":ref("HoldingsReviewPlan")},"Source summaries and detail totals remain separate. Upload and preview never write the journal. Explicit acceptance is limited to a first closing opening snapshot; later reports remain reconciliation evidence.")
    d["SessionResponse"] = {"oneOf": [
        obj({**page_common, "authenticated": {"const": True}, "user": ref("UserProfile"), "csrf": ref("CsrfInformation")}),
        obj({**page_common, "authenticated": {"const": False}, "user": {"type": "null"}, "csrf": ref("CsrfInformation")}),
    ]}
    job_common = {
        **page_common, "jobId": ref("OpaqueId"),
        "revision": {"type": "integer", "minimum": 1, "maximum": 9007199254740991},
        "createdAt": ref("UtcInstant"), "updatedAt": ref("UtcInstant"),
    }
    job_states = [
        ("QUEUED", {"type": "null"}, {"type": "null"}, {"type": "null"}),
        ("RUNNING", ref("UtcInstant"), {"type": "null"}, {"type": "null"}),
        ("SUCCEEDED", ref("UtcInstant"), ref("UtcInstant"), {"type": "null"}),
        ("PARTIALLY_SUCCEEDED", ref("UtcInstant"), ref("UtcInstant"),
         {"type": "string", "const": "PARTIAL_RESULT"}),
        ("FAILED", nullable(ref("UtcInstant")), ref("UtcInstant"),
         text(pattern=r"^[A-Z][A-Z0-9_]{0,63}$", maxLength=64)),
        ("CANCELLED", nullable(ref("UtcInstant")), ref("UtcInstant"), {"type": "null"}),
    ]
    d["AsyncJobStatus"] = {
        "description": "Owner-scoped durable job status. Revision increases on committed changes. Terminal states are immutable; explicit retry creates a new job. Failure codes are safe application codes, never raw exceptions or source values.",
        "oneOf": [obj({**job_common, "state": {"type": "string", "const": state},
                       "startedAt": started, "finishedAt": finished, "failureCode": failure})
                  for state, started, finished, failure in job_states],
    }
    return d


def schema_document() -> dict:
    return {"$schema": DIALECT, "$id": f"urn:finn:contracts:market-data:{VERSION}",
            "title": "FINN market data contract", "description": "Versioned synthetic/private EOD data boundary. Schemas describe intended behavior, not deployed APIs or provider entitlements.",
            "$ref": "#/$defs/AcquisitionEnvelope", "$defs": definitions()}


def openapi_refs(value):
    if isinstance(value, dict):
        return {key: (item.replace("#/$defs/", "#/components/schemas/") if key == "$ref"
                      else openapi_refs(item)) for key, item in value.items()}
    if isinstance(value, list):
        return [openapi_refs(item) for item in value]
    return value


def public_api_document() -> dict:
    def parameter(name, location, schema, required=False, description=""):
        return {"name": name, "in": location, "required": required,
                "schema": schema, **({"description": description} if description else {})}

    def response(description, name, media="application/json"):
        return {"description": description,
                "content": {media: {"schema": {"$ref": f"#/components/schemas/{name}"}}}}

    def operation(operation_id, description, result_name, params, implemented=False, implementation_status="IMPLEMENTED_SYNTHETIC_ONLY"):
        return {"operationId": operation_id, "summary": description,
                "description": ("Implemented fixed synthetic demonstration; no provider or portfolio access." if implementation_status == "IMPLEMENTED_SYNTHETIC_ONLY" else "Implemented server-side identity boundary. Do not expose provider tokens or accept a trusted owner ID from the browser.") if implemented else "PLANNED CONTRACT ONLY: endpoint not yet implemented. Authentication/ownership is enforced by the Java service; no browser provider access.",
                "x-finn-implementation-status": implementation_status if implemented else "PLANNED", "parameters": params,
                "responses": {"200": response("Stored result; inspect availability, coverage and freshness.", result_name),
                              "400": response("Malformed request.", "Problem", "application/problem+json"),
                              "401": response("Authentication required.", "Problem", "application/problem+json"),
                              "404": response("Resource unavailable to this user.", "Problem", "application/problem+json"),
                              "422": response("Invalid date range, listing, or query.", "Problem", "application/problem+json"),
                              "429": response("Bounded query budget exceeded; Retry-After when known.", "Problem", "application/problem+json"),
                              "503": response("Service unable to serve stored results.", "Problem", "application/problem+json")}}

    listing = parameter("listingId", "path", ref("OpaqueId"), True,
                        "Exact exchange listing identity. Do not substitute NSE/BSE listings.")
    page = [parameter("limit", "query", {"type": "integer", "minimum": 1, "maximum": 100, "default": 50}),
            parameter("cursor", "query", text(maxLength=512))]
    paths = {
        "/api/v1/demo/quote": {"get": {**operation("getSyntheticDemoQuote", "Get a fixed fictional EOD snapshot", "QuoteResponse", [], True), "security": []}},
        "/api/v1/session": {"get": {**operation("getSession", "Get session status and a same-origin CSRF token", "SessionResponse", [], True, "IMPLEMENTED"), "security": []}},
        "/api/v1/me": {"get": operation("getCurrentUser", "Get the current application profile", "UserProfile", [], True, "IMPLEMENTED")},
        "/api/v1/preferences": {
            "get": operation("getPreferences", "Read the current user's display and delivery preferences", "Preferences", [], True, "IMPLEMENTED"),
            "put": {**operation("updatePreferences", "Save preferences with an optimistic revision check", "Preferences", [parameter("X-CSRF-TOKEN", "header", text(maxLength=2048), True)], True, "IMPLEMENTED"),
                    "requestBody": {"required": True, "content": {"application/json": {"schema": ref("PreferencesUpdate")}}},
                    "responses": {"200": response("Saved preferences.", "Preferences"), "400": response("Malformed request.", "Problem", "application/problem+json"), "401": response("Sign in required.", "Problem", "application/problem+json"), "403": response("CSRF rejected.", "Problem", "application/problem+json"), "409": response("Preferences changed; reload before saving.", "Problem", "application/problem+json"), "422": response("Unsupported zone/currency or invalid input.", "Problem", "application/problem+json")}}},
        "/oauth2/authorization/finn": {"get": {"operationId": "startSignIn", "summary": "Start server-side OIDC authorization code sign-in with PKCE", "security": [], "x-finn-implementation-status": "IMPLEMENTED", "responses": {"302": {"description": "Redirect to the configured identity provider; nonce/state stay server-bound."}}}},
        "/api/v1/logout": {"post": {"operationId": "signOut", "summary": "Invalidate the current session and initiate provider logout", "x-finn-implementation-status": "IMPLEMENTED", "parameters": [parameter("X-CSRF-TOKEN", "header", text(maxLength=2048), True, "Token from getSession; browser form submission may use the _csrf parameter instead.")], "responses": {"302": {"description": "Session invalidated; redirect through configured provider logout or the fixed application origin."}, "403": response("CSRF token missing or invalid.", "Problem", "application/problem+json")}}},
        "/api/v1/instruments": {"get": operation("searchInstruments", "Search supported cash-equity listings", "InstrumentPage", [
            parameter("query", "query", text(maxLength=100)),
            parameter("exchange", "query", enum(["NSE", "BSE"])), *page])},
        "/api/v1/instruments/{listingId}/quote": {"get": operation("getLatestEodQuote", "Get latest stored EOD observation", "QuoteResponse", [listing])},
        "/api/v1/instruments/{listingId}/history": {"get": operation("getDailyHistory", "Get stored daily history", "HistoryResponse", [
            listing, parameter("from", "query", ref("SessionDate"), True, "Inclusive session date."),
            parameter("toExclusive", "query", ref("SessionDate"), True, "Exclusive session date; range must be positive and bounded."),
            parameter("basis", "query", ref("AdjustmentBasis"), True, "Requested price basis; do not silently change it."), *page])},
        "/api/v1/data/providers": {"get": operation("getProviderStatuses", "Get source capabilities and acquisition status", "ProviderStatusPage", [])},
        "/api/v1/jobs/{jobId}": {"get": operation("getJobStatus", "Get an owned background job status", "AsyncJobStatus", [
            parameter("jobId", "path", ref("OpaqueId"), True,
                      "Owner-scoped job ID. Unknown and inaccessible jobs both return 404.")], True,"IMPLEMENTED")},
    }
    def maintained(op_id, summary, result, parameters=(), input_name=None):
        result_op=operation(op_id, summary, result, list(parameters), True, "IMPLEMENTED")
        result_op["description"]="Owner-scoped application resource. Identity derives from the session; all mutations require CSRF. Missing/inaccessible IDs both return 404. Inspect the resource's supported scope and provenance; no broker execution or unverified provider coverage is implied."
        if input_name:
            result_op["parameters"].append(parameter("X-CSRF-TOKEN", "header", text(maxLength=2048), True))
            result_op["requestBody"]={"required": True, "content": {"application/json": {"schema": ref(input_name)}}}
            result_op["responses"]["403"]=response("CSRF token missing or rejected.", "Problem", "application/problem+json")
            result_op["responses"]["409"]=response("Conflict; inspect the current resource and review before retrying.", "Problem", "application/problem+json")
        return result_op
    identifier=[parameter("id", "path", text(format="uuid"), True)]
    ledger_account=[parameter(name,"path",text(format="uuid"),True) for name in ("portfolio","account")]
    ledger_event=[*ledger_account,parameter("event","path",text(format="uuid"),True)]
    journal_path="/api/v1/portfolios/{portfolio}/accounts/{account}"
    import_path=journal_path+"/imports"
    import_id=[*ledger_account,parameter("id","path",text(format="uuid"),True)]
    csrf_header=parameter("X-CSRF-TOKEN","header",text(maxLength=2048),True)
    workbook_media="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    upload=maintained("uploadHoldingsWorkbook","Stage a supported Groww XLSX without mutating holdings","ImportTicket",[*ledger_account,csrf_header])
    upload["requestBody"]={"required":True,"content":{workbook_media:{"schema":{"type":"string","format":"binary"}}},"description":"Raw workbook bytes, at most 5 MiB. No broker credentials or filename are required."}
    upload["responses"].update({"403":response("CSRF rejected.","Problem","application/problem+json"),"413":response("Workbook exceeds the bound.","Problem","application/problem+json"),"415":response("Unsupported upload media type.","Problem","application/problem+json")})
    original=maintained("downloadHoldingsOriginal","Download a statically validated original as its owner","ImportTicket",import_id)
    original["responses"]["200"]={"description":"Original bytes; private attachment, no-store.","content":{"application/octet-stream":{"schema":{"type":"string","format":"binary"}}}}
    ledger_export=maintained("exportLedgerCsv","Download the owned journal with escaped spreadsheet text","LedgerPage",ledger_account,"LedgerExportInput")
    ledger_export["responses"]["200"]={"description":"Private UTF-8 CSV attachment, no-store. Original and reversal entries are retained with effective markers.","content":{"text/csv":{"schema":{"type":"string","format":"binary"}}}}
    market_path="/api/v1/market/listings/{listing}"
    listing_parameter=[parameter("listing","path",text(format="uuid"),True)]
    dates=[parameter(name,"query",ref("SessionDate"),True) for name in ("start","endExclusive")]
    market_refresh=maintained("queuePrivateYahooDaily","Queue a bounded completed-session window for the reviewed mapping","PriceFetchQueued",listing_parameter,"PriceFetchWindow")
    market_refresh["responses"]["202"]=market_refresh["responses"].pop("200")
    source_version_path = "/api/v1/research/sources/{id}/versions/{revision}"
    source_version_params = [*identifier,parameter("revision","path",{"type":"integer","minimum":1,"maximum":50},True)]
    company_parameter=[parameter("company","path",text(format="uuid"),True)]
    pdf_upload = maintained("stageResearchPdf","Stage an owned PDF of at most 3 MiB","ResearchPdfUpload",[csrf_header])
    pdf_upload["requestBody"] = {"required": True, "content": {"application/pdf":{"schema":{"type":"string","format":"binary"}}}}
    pdf_download = maintained("downloadResearchPdf","Download the PDF for a private source version","ResearchPdfUpload",source_version_params)
    pdf_download["responses"]["200"] = {"description":"Private source PDF attachment.", "content":{"application/octet-stream":{"schema":{"type":"string","format":"binary"}}}}
    paths.update({
        "/api/v1/monitoring/rules":{
            "get": maintained("listPriceRules","List owned completed-session alert rules","PriceRuleList"),
            "post": maintained("createPriceRule","Save an owner-scoped price rule","PriceRule",input_name="PriceRuleSettings"),
        },
        "/api/v1/monitoring/rules/{id}":{"post": maintained("editPriceRule","Append a reviewed price rule version","PriceRule",identifier,"PriceRuleEdit")},
        "/api/v1/monitoring/rules/{id}/versions":{"get": maintained("getPriceRuleVersions","Inspect the owned rule and its previous definitions","PriceRuleList",identifier)},
        "/api/v1/monitoring/rules/{id}/evaluations":{"get": maintained("getPriceRuleEvaluations","Read observed decisions and retained evidence","PriceEvaluationReport",identifier)},
        "/api/v1/monitoring/notifications":{"get": maintained("listNotifications","Read an owned page of delivered in-app notifications","NotificationPage",[parameter("before","query",text(format="uuid"))])},
        "/api/v1/monitoring/notifications/{id}":{"get": maintained("getNotification","Inspect an owned in-app item and its delivery evidence","NotificationDetail",identifier)},
        "/api/v1/monitoring/notifications/{id}/read":{"post": maintained("setNotificationRead","Change the read state of an owned notification","Notification",identifier,"NotificationRead")},
        "/api/v1/monitoring/deliveries":{"get": maintained("listNotificationDeliveries","Inspect pending, completed, and failed attempts for the owner","NotificationDeliveryPage")},
        "/api/v1/monitoring/reminders":{
            "get": maintained("listReviewReminders","List the owner's review calendar","ReminderList"),
            "post": maintained("createReviewReminder","Create a local-time review reminder","ReviewReminder",input_name="ReminderSettings"),
        },
        "/api/v1/monitoring/reminders/{id}":{"post": maintained("editReviewReminder","Revise an owned reminder schedule","ReviewReminder",identifier,"ReminderEdit")},
        "/api/v1/monitoring/reminders/{id}/schedule":{"post": maintained("changeReminderSchedule","Snooze or cancel an owned reminder","ReviewReminder",identifier,"ReminderScheduleChange")},
        "/api/v1/monitoring/indicators":{
            "get": maintained("listIndicatorRules","List owned volume and concentration rules","IndicatorList"),
            "post": maintained("createIndicatorRule","Create a completed-session indicator rule","IndicatorRule",input_name="IndicatorCreate"),
        },
        "/api/v1/monitoring/indicators/{id}":{"post": maintained("editIndicatorRule","Update an owned indicator threshold or enablement","IndicatorRule",identifier,"IndicatorEdit")},
        "/api/v1/monitoring/indicators/{id}/evaluations":{"get": maintained("listIndicatorEvaluations","Inspect eligible volume and allocation evidence","IndicatorEvaluations",identifier)},
        "/api/v1/monitoring/briefs":{"get": maintained("getBriefScheduleAndRuns","List the owned schedule and brief history","BriefIndex")},
        "/api/v1/monitoring/briefs/schedule":{"post": maintained("saveBriefSchedule","Configure the owner's local brief schedule","BriefSchedule",input_name="BriefScheduleInput")},
        "/api/v1/monitoring/briefs/preview":{"get": maintained("previewPortfolioBrief","Preview a closed reporting window","PortfolioBrief",[parameter("windowEnd","query",ref("SessionDate"))])},
        "/api/v1/monitoring/briefs/{id}":{"get": maintained("getPortfolioBrief","Inspect an owned immutable brief run","PortfolioBrief",identifier)},
        "/api/v1/research/gemini/capability":{"get": maintained("getGeminiCapability","Read server-side Gemini setup status","GeminiCapability")},
        "/api/v1/research/gemini/listings":{"get": maintained("getGeminiListings","Read owned listings for a company","GeminiListings",[
            parameter("company","query",text(format="uuid"),True)])},
        "/api/v1/research/gemini":{"post": maintained("runGeminiResearch","Run a temporary Google Search grounded report on an owned listing","GeminiReport",(),"GeminiInput")},
        "/api/v1/research/stock-ai/capability":{"get": maintained("getStockAiCapability","Read the active stock research provider and setup status","StockAiCapability")},
        "/api/v1/research/stock-ai/listings":{"get": maintained("getStockAiListings","Read owned listings for stock research","StockResearchListings",[
            parameter("company","query",text(format="uuid"),True)])},
        "/api/v1/research/stock-ai":{"post": maintained("runStockAiResearch","Run temporary source-backed research or news on an owned listing","StockAiResult",(),"StockResearchInput")},
        "/api/v1/research/sources":{
            "get": maintained("listCompanySources","List private primary source records","CompanySourcePage",[
                parameter("offset","query",{"type":"integer","minimum":0,"maximum":200}),parameter("companyId","query",text(format="uuid"))]),
            "post": maintained("registerCompanySource","Register a reviewed private HTTPS link or UTF-8 text","CompanySource",input_name="CompanySourceInput"),
        },
        "/api/v1/research/sources/{id}":{"post": maintained("reviseCompanySource","Append a private source revision","CompanySource",identifier,"CompanySourceEdit")},
        "/api/v1/research/sources/{id}/versions":{"get": maintained("listSourceVersions","Read all retained versions for an owned source","CompanySourceVersions",identifier)},
        "/api/v1/research/sources/{id}/versions/{revision}":{"get": maintained("getSourceVersion","Read a private source version and its text","CompanySourceDetail",[*identifier,parameter("revision","path",{"type":"integer","minimum":1,"maximum":50},True)])},
        "/api/v1/research/pdf":{"post":pdf_upload},
        "/api/v1/research/pdf/staged":{"get":maintained("listStagedResearchPdfs","Read owned unused uploads","StagedResearchPdfs")},
        "/api/v1/research/pdf/{file}/discard":{"post":maintained("discardStagedResearchPdf","Remove an unused owned upload",
            "ResearchPdfDiscard",[parameter("file","path",ref("OpaqueId"),True),csrf_header])},
        source_version_path+"/pdf":{"get":pdf_download},
        source_version_path+"/extraction":{
            "get":maintained("getResearchExtraction","Inspect text and page coverage for this source version","ResearchExtraction",source_version_params),
            "post":maintained("queueResearchExtraction","Queue bounded private extraction for this source version","ResearchExtraction",[*source_version_params,csrf_header]),
        },
        source_version_path+"/anchors":{"get":maintained("listEvidenceLocations","Read indexed passages and table rows","ResearchLocations",[
            *source_version_params,parameter("offset","query",{"type":"integer","minimum":0,"maximum":12000})])},
        source_version_path+"/pages/{number}":{"get":maintained("readEvidencePage","Read an extracted page from a specific source version","ResearchTextPage",[
            *source_version_params,parameter("number","path",{"type":"integer","minimum":1,"maximum":20},True)])},
        "/api/v1/research/evidence/{anchor}":{"get":maintained("getEvidenceLocation","Resolve an owned passage to its exact source version and line range","ResearchLocation",[
            parameter("anchor","path",text(format="uuid"),True)])},
        "/api/v1/research/companies/{company}/overview":{"get":maintained(
            "getCompanyResearchOverview","Read company evidence coverage and reviewed highlights","CompanyResearchOverview",company_parameter)},
        "/api/v1/discovery/radar":{"get":maintained("getMarketRadar","Rank reviewed company events and available completed-session signals","MarketRadar",[
            parameter("days","query",{"type":"integer","minimum":1,"maximum":30}),
            parameter("scope","query",enum(["ALL","HELD","WATCHLIST"])),
            parameter("kind","query",enum(["ALL","ANNOUNCEMENTS","MOVES"])),
            parameter("sector","query",ref("DiscoverySector")), parameter("eventType","query",ref("CompanyEventType")),
            parameter("liquidity","query",enum(["ALL","TURNOVER_1_CRORE","TURNOVER_10_CRORE"])),
            parameter("portfolioId","query",text(format="uuid"))])},
        "/api/v1/discovery/radar/leads":{"post":maintained("findRadarLeads","Find recent public NSE event leads for user review","RadarLeads",input_name="RadarLeadSearch")},
        "/api/v1/discovery/portfolio-calendar":{"get":maintained("getPortfolioCalendar","Read upcoming announced dates for recorded holdings","RadarCalendar",[
            parameter("portfolioId","query",text(format="uuid"))])},
        "/api/v1/discovery/universe":{
            "get":maintained("readDiscoveryDirectory","Read manually reviewed companies and sector metric support","DiscoveryDirectory"),
            "post":maintained("saveDiscoveryMember","Review the sector and listing for a company","DiscoveryMember",input_name="DiscoveryMemberInput"),
        },
        "/api/v1/discovery/universe/coverage":{"get":maintained("inspectDiscoveryCoverage","Inspect current reviewed inputs for a reporting period",
            "DiscoverySnapshot",[parameter("kind","query",enum(["QUARTER","FULL_YEAR"]),True),parameter("start","query",ref("SessionDate"),True),
                parameter("end","query",ref("SessionDate"),True)])},
        "/api/v1/discovery/screens":{
            "get":maintained("listStockScreens","Read the latest saved screen versions","StockScreenIndex"),
            "post":maintained("createStockScreen","Save a sector-scoped screen","StockScreen",input_name="StockScreenInput"),
        },
        "/api/v1/discovery/screens/{id}":{"post":maintained("editStockScreen","Save a new immutable screen version","StockScreen",identifier,"StockScreenEdit")},
        "/api/v1/discovery/screens/{id}/versions":{"get":maintained("readStockScreenVersions","Read historical screen definitions","StockScreenIndex",identifier)},
        "/api/v1/discovery/screens/{id}/runs":{
            "get":maintained("listStockScreenRuns","Read saved run history","StockScreenHistory",identifier),
            "post":maintained("runStockScreen","Capture current reviewed inputs and run a screen version","StockScreenRun",identifier,"StockScreenRunInput"),
        },
        "/api/v1/discovery/screen-runs/{id}":{"get":maintained("readStockScreenRun","Replay a run from retained inputs","StockScreenRun",identifier)},
        "/api/v1/discovery/screen-runs/{id}/rankings":{
            "get":maintained("listPeerRankings","Read saved same-sector comparisons","PeerRankingIndex",identifier),
            "post":maintained("rankScreenPeers","Save factor weights and replayable relative peer positions","PeerRanking",identifier,"PeerRankingInput"),
        },
        "/api/v1/discovery/rankings/{id}":{"get":maintained("readPeerRanking","Replay a retained ranking and its contributions","PeerRanking",identifier)},
        "/api/v1/research/companies/{company}/theses":{
            "get":maintained("listInvestmentTheses","Read the latest thesis versions for a company","InvestmentTheses",company_parameter),
            "post":maintained("createInvestmentThesis","Save original reasoning and an optional review reminder","InvestmentThesis",
                company_parameter,"InvestmentThesisInput"),
        },
        "/api/v1/research/theses/{id}":{"post":maintained("reviseInvestmentThesis","Append a thesis revision","InvestmentThesis",identifier,"InvestmentThesisEdit")},
        "/api/v1/research/theses/{id}/versions":{"get":maintained("readInvestmentThesisVersions","Read immutable thesis reasoning and decisions",
            "InvestmentTheses",identifier)},
        "/api/v1/research/theses/{thesis}/conditions":{
            "get":maintained("readThesisConditions","Read thresholds and their last checked evidence","ThesisConditions",
                [parameter("thesis","path",text(format="uuid"),True)]),
            "post":maintained("addThesisCondition","Set a threshold for an exact reporting period","ThesisCondition",
                [parameter("thesis","path",text(format="uuid"),True)],"ThesisConditionInput"),
        },
        "/api/v1/research/theses/{thesis}/conditions/check":{"post":maintained("checkThesisConditions","Check current reviewed figures and save distinct results",
            "ThesisConditions",[parameter("thesis","path",text(format="uuid"),True),csrf_header])},
        "/api/v1/research/theses/{thesis}/conditions/{condition}/retire":{"post":maintained("retireThesisCondition","Retire a threshold while retaining checked evidence",
            "ThesisCondition",[parameter("thesis","path",text(format="uuid"),True),parameter("condition","path",text(format="uuid"),True),csrf_header])},
        "/api/v1/research/theses/{thesis}/reviews":{
            "get":maintained("listThesisReviews","Read owned review tasks and same-company event suggestions","ThesisReviewIndex",[
                parameter("thesis","path",text(format="uuid"),True),parameter("offset","query",{"type":"integer","minimum":0,"maximum":500}),
                parameter("event","query",ref("OpaqueId"))]),
            "post":maintained("createThesisReview","Queue one review notification with pinned thesis and evidence","ThesisReview",
                [parameter("thesis","path",text(format="uuid"),True)],"ThesisReviewInput"),
        },
        "/api/v1/research/thesis-reviews/{id}":{"get":maintained("readThesisReview","Read a saved review and its original evidence","ThesisReview",identifier)},
        "/api/v1/research/thesis-reviews/{id}/decision":{"post":maintained("recordThesisReviewDecision","Record a user-reviewed decision",
            "ThesisReview",identifier,"ThesisReviewDecisionInput")},
        "/api/v1/research/companies/{company}/guidance":{
            "get":maintained("listManagementGuidance","Read current statements and review status","ManagementGuidanceList",company_parameter),
            "post":maintained("recordManagementGuidance","Save a dated guidance statement from a passage","ManagementGuidance",
                company_parameter,"ManagementGuidanceInput"),
        },
        "/api/v1/research/guidance/{id}":{"post":maintained("reviseManagementGuidance","Append a guidance revision or withdrawal",
            "ManagementGuidance",identifier,"ManagementGuidanceEdit")},
        "/api/v1/research/guidance/{id}/versions":{"get":maintained("readGuidanceTimeline","Read source-linked guidance versions",
            "ManagementGuidanceList",identifier)},
        "/api/v1/research/guidance/{id}/versions/{revision}/delivery":{"get":maintained("compareGuidanceDelivery",
            "Compare the statement and outcome known on the selected date","GuidanceDelivery",
            [*source_version_params,parameter("asOf","query",ref("SessionDate"))])},
        "/api/v1/research/guidance/candidates/{anchor}":{"get":maintained("readGuidanceCandidates","Inspect the selected source and its printed numbers",
            "GuidanceCandidates",[parameter("anchor","path",text(format="uuid"),True)])},
        "/api/v1/research/report-capabilities":{"get":maintained(
            "getResearchReportCapabilities","Read the configured research modes","ResearchReportCapabilities")},
        "/api/v1/research/companies/{company}/reports":{
            "get":maintained("listResearchReports","Read the company report version history","ResearchReportHistory",[
                *company_parameter,parameter("offset","query",{"type":"integer","minimum":0,"maximum":500})]),
            "post":maintained("createResearchReport","Save a cited company research report","ResearchReport",company_parameter,"ResearchReportInput"),
        },
        "/api/v1/research/companies/{company}/search":{"get":maintained(
            "searchCompanyEvidence","Find titles and primary passages within a company and publication range","ResearchSearchResult",[
                *company_parameter,parameter("query","query",text(minLength=1,maxLength=160),True),
                parameter("kind","query",enum(["ALL","PRIMARY","NEWS"])),
                parameter("from","query",ref("SessionDate")),parameter("through","query",ref("SessionDate")),
                parameter("earlier","query",{"type":"boolean"}),
                parameter("offset","query",{"type":"integer","minimum":0,"maximum":1200})])},
        "/api/v1/research/reports/{id}":{"get":maintained(
            "getResearchReport","Read owned research evidence and generation status","ResearchReport",identifier)},
        "/api/v1/research/reports/{id}/refresh":{"post":maintained(
            "refreshResearchReport","Append a version from currently indexed sources","ResearchReport",[*identifier,csrf_header])},
        "/api/v1/research/reports/{id}/feedback":{"post":maintained(
            "recordResearchReportFeedback","Save an owned report correction with optional evidence","ResearchReportFeedback",
            identifier,"ResearchReportFeedbackInput")},
        "/api/v1/research/companies/{company}/notes":{"post":maintained(
            "addCompanyResearchNote","Save a research highlight or open question","CompanyResearchNote",company_parameter,"CompanyResearchNoteInput")},
        "/api/v1/research/companies/{company}/notes/{id}":{"post":maintained(
            "resolveCompanyResearchQuestion","Resolve or reopen a research question","CompanyResearchNote",
            [*company_parameter,*identifier],"CompanyResearchResolution")},
        "/api/v1/research/companies/{company}/facts":{
            "get":maintained("listCompanyFinancialFacts","Read reviewed facts with explicit dimensions","FinancialFactPage",[
                *company_parameter,parameter("offset","query",{"type":"integer","minimum":0,"maximum":1500})]),
            "post":maintained("recordReportedFact","Record a value found in an owned evidence anchor","FinancialFact",company_parameter,"ReportedFactInput"),
        },
        "/api/v1/research/companies/{company}/facts/derive":{"post":maintained("deriveFreeCashFlow","Calculate cash flow less capital expenditure from compatible reviewed versions","FinancialFact",company_parameter,"DeriveFinancialFact")},
        "/api/v1/research/facts/{id}":{"post":maintained("reviseFinancialFact","Append a new reviewed fact version","FinancialFact",identifier,"FinancialFactEdit")},
        "/api/v1/research/facts/{id}/versions":{"get":maintained("getFinancialFactVersions","Read the fact's prior reviewed values and evidence","FinancialFactHistory",identifier)},
        "/api/v1/research/facts/{id}/comparables":{"get":maintained("listComparableFinancialFacts","Find earlier non-overlapping facts in the same series","FinancialFactHistory",identifier)},
        "/api/v1/research/facts/{id}/comparison":{"get":maintained("compareFinancialFacts","Calculate the change between compatible reviewed periods","FinancialComparison",[
            *identifier,parameter("previous","query",text(format="uuid"),True)])},
        "/api/v1/research/events":{
            "get": maintained("listCompanyEvents","List owned reviewed company event threads","CompanyEventPage",[
                parameter("companyId","query",text(format="uuid")),parameter("offset","query",{"type":"integer","minimum":0,"maximum":300})]),
            "post": maintained("classifyCompanySource","Review a classification and append it to a company event thread","CompanyEvent",input_name="CompanyEventInput"),
        },
        "/api/v1/research/events/suggestion":{"get": maintained("suggestSourceClassification","Suggest a classification from an owned primary source title","EventSuggestion",[
            parameter("documentId","query",text(format="uuid"),True),parameter("revision","query",{"type":"integer","minimum":1,"maximum":50},True)])},
        "/api/v1/research/events/{id}/versions":{"get": maintained("getCompanyEventHistory","Read retained thread versions and exact source references","CompanyEventHistory",identifier)},
        "/api/v1/research/attention":{"get": maintained("rankAttentionInbox","Rank owned event threads using reviewed materiality and recorded holdings","AttentionPage",[
            parameter("view","query",enum(["ACTIVE","UNREAD","HIDDEN"])),parameter("offset","query",{"type":"integer","minimum":0,"maximum":300})])},
        "/api/v1/research/attention/{id}":{"post": maintained("saveAttentionFeedback","Set read, mute, or snooze state on an owned event","AttentionState",identifier,"AttentionFeedback")},
        "/api/v1/research/news":{
            "get": maintained("listNewsContext","List clusters of owner-recorded news links and source metadata","CompanyNewsPage",[
                parameter("companyId","query",ref("OpaqueId")),parameter("offset","query",{"type":"integer","minimum":0,"maximum":200})]),
            "post": maintained("registerNewsLink","Register a headline and link as secondary news context","CompanySource",input_name="CompanyNewsInput"),
        },
        "/api/v1/research/filing-rules":{
            "get": maintained("listFilingRules","List the owner's company filing rules","FilingRuleList"),
            "post": maintained("createFilingRule","Select filing categories and date reminders","FilingRule",input_name="FilingRuleSettings"),
        },
        "/api/v1/research/filing-rules/{id}":{"post": maintained("toggleFilingRule","Pause or resume a filing rule","FilingRule",identifier,"FilingRuleChange")},
        "/api/v1/research/calendar":{"get": maintained("listAnnouncedDates","Read current source-backed dates in an owned calendar window","CompanyCalendarPage",[
            parameter("start","query",ref("SessionDate")),parameter("endExclusive","query",ref("SessionDate")),
            parameter("offset","query",{"type":"integer","minimum":0,"maximum":1500})])},
        "/api/v1/research/replay":{
            "get": maintained("getSyntheticEventReplay","Read the signed-in user's isolated fictional scenario","EventReplay"),
            "post": maintained("startSyntheticEventReplay","Run or reopen the fictional scenario in an isolated workspace","EventReplay",[csrf_header]),
        },
        "/api/v1/portfolios/{portfolio}/valuation":{"get":maintained("valuePortfolio","Value the owned portfolio across its recorded source accounts","PortfolioValuation",ledger_account[:1])},
        "/api/v1/portfolios/{portfolio}/performance":{"post":maintained("calculatePortfolioPerformance",
            "Calculate cash-flow-aware returns from a reviewed window and current exact snapshots","PortfolioPerformance",
            ledger_account[:1],"PortfolioPerformanceInput")},
        "/api/v1/portfolios/{portfolio}/health":{"get":maintained("readPortfolioHealth","Read concentration and valuation coverage for owned positions",
            "PortfolioHealth",ledger_account[:1])},
        "/api/v1/portfolios/{portfolio}/health/scenario":{"post":maintained("simulatePortfolioScenario",
            "Calculate a hypothetical cash allocation and security price shock","PortfolioScenario",ledger_account[:1],"PortfolioScenarioInput")},
        "/api/v1/portfolios/{portfolio}/health/risk":{"post":maintained("calculatePortfolioRisk",
            "Calculate weekly drawdown and volatility only with all required saved valuations","PortfolioRisk",
            ledger_account[:1],"PortfolioPerformanceInput")},
        journal_path+"/valuation":{"get":maintained("valueAccount","Value recorded positions with selected, compatible closes","AccountValuation",ledger_account)},
        journal_path+"/valuation/listing":{"post":maintained("chooseValuationListing","Choose the venue for an owned position; null clears it","ValuationListing",ledger_account,"ValuationListing")},
        market_path:{"get":maintained("getListingFeedStatus","Read the owned listing's latest close and acquisition state","MarketFeed",listing_parameter)},
        market_path+"/chart":{"get":maintained("getMarketChart","Read display price history for an owned listing","MarketChart",[
            *listing_parameter,parameter("range","query",ref("ChartRange"),True),
            parameter("reviewed","query",{"type":"boolean"},False)])},
        market_path+"/history":{"get":maintained("getPrivateCloseHistory","Read the latest retained revision per session and source","PrivateCloseHistory",[*listing_parameter,*dates])},
        market_path+"/reviewed-close":{"post":maintained("recordReviewedClose","Record a user-verified as-reported INR closing price","PrivateClose",listing_parameter,"ReviewCloseInput")},
        market_path+"/refresh":{"post":market_refresh},
        journal_path+"/valuation/snapshots":{
            "get":maintained("listValuationSnapshots","Read latest owned snapshot per saved date in a bounded window","ValuationSeries",[*ledger_account,*dates]),
            "post":maintained("buildValuationSnapshots","Save up to 14 dated values and explicit coverage gaps","ValuationSeries",ledger_account,"PriceFetchWindow"),
        },
        journal_path+"/valuation/snapshots/{id}":{"get":maintained("getValuationSnapshot","Read the immutable result and inputs of an owned snapshot","ValuationSnapshotDetail",import_id)},
        "/api/v1/watchlists":{
            "get":maintained("listWatchlists","List the signed-in owner's named watchlists","WatchlistIndex"),
            "post":maintained("createWatchlist","Create an owned watchlist or return the existing name","WatchlistSummary",input_name="WatchlistName"),
        },
        "/api/v1/watchlists/{id}":{"get":maintained("getWatchlist","Read owned listings and their latest stored closes","WatchlistDetail",identifier)},
        "/api/v1/watchlists/{id}/items":{"post":maintained("setWatchlistItem","Idempotently add or remove an owned listing","WatchlistDetail",identifier,"WatchlistTrack")},
        "/api/v1/market/status":{"get":maintained("getMarketDiagnostics","Read acquisition health and coverage for the signed-in owner","MarketDiagnostics")},
        journal_path+"/transactions/export":{"post":ledger_export},
        journal_path+"/corporate-actions":{"get":maintained("listCorporateActions","List reviewed corporate actions for the owned account","CorporateActionList",ledger_account),"post":maintained("applyCorporateAction","Record a confirmed source-backed action or an unsupported review","CorporateActionRecord",ledger_account,"CorporateActionApproval")},
        journal_path+"/corporate-actions/preview":{"post":maintained("previewCorporateAction","Preview units, cost and cash effects without posting","CorporateActionEffect",ledger_account,"CorporateActionInput")},
        import_path:{"get":maintained("listHoldingsImports","List owned holdings imports","HoldingsImportList",ledger_account),"post":upload},
        import_path+"/{id}/preview":{"get":maintained("getHoldingsPreview","Review a completed holdings snapshot preview","HoldingsPreviewPage",[*import_id,parameter("limit","query",{"type":"integer","minimum":1,"maximum":100}),parameter("offset","query",{"type":"integer","minimum":0,"maximum":1000})])},
        import_path+"/{id}/original":{"get":original},
        import_path+"/{id}/retry":{"post":maintained("retryHoldingsPreview","Create a new job for a recoverable preview failure","ImportTicket",[*import_id,csrf_header])},
        import_path+"/{id}/accept":{"post":maintained("acceptHoldingsOpening","Accept a reviewed opening snapshot atomically or deduplicate an overlap","HoldingsAcceptanceReceipt",import_id,"HoldingsAcceptanceInput")},
        import_path+"/{id}/reconciliation":{"get":maintained("getHoldingsReconciliation","Compare source holdings with the owned ledger at the report date","HoldingsReconciliation",[*import_id,parameter("limit","query",{"type":"integer","minimum":1,"maximum":100}),parameter("offset","query",{"type":"integer","minimum":0,"maximum":2000})]),"post":maintained("reviewHoldingsReconciliation","Acknowledge the comparison without changing the ledger","HoldingsReconciliationReceipt",import_id,"HoldingsReconciliationInput")},
        journal_path+"/ledger": {"get":maintained("getAccountLedger","Replay the owned account ledger and coverage","LedgerView",ledger_account)},
        journal_path+"/transactions": {"get":maintained("getLedgerEvents","Page the immutable journal","LedgerPage",[*ledger_account,parameter("limit","query",{"type":"integer","minimum":1,"maximum":100}),parameter("before","query",{"type":"integer","minimum":1,"maximum":10001})]),"post":maintained("recordLedgerEvent","Record an accepted investment entry with an idempotency key","LedgerReceipt",ledger_account,"LedgerRecordInput")},
        journal_path+"/transactions/{event}/reverse": {"post":maintained("reverseLedgerEvent","Append a linked reversal after validating chronological balances","LedgerReceipt",ledger_event,"LedgerReverseInput")},
        journal_path+"/transactions/{event}/correct": {"post":maintained("correctLedgerEvent","Atomically reverse and replace an accepted record","LedgerReceipt",ledger_event,"LedgerCorrectInput")},
        "/api/v1/portfolios": {"get":maintained("getPortfolios","List owned active and archived portfolios","PortfolioList"),"post":maintained("createPortfolio","Create an INR tracking portfolio","PortfolioSummary",input_name="PortfolioInput")},
        "/api/v1/portfolios/{id}": {"get":maintained("getPortfolio","Inspect an owned portfolio and its source accounts","PortfolioDetail",identifier)},
        "/api/v1/portfolios/{id}/archive": {"post":maintained("archivePortfolio","Archive or restore a portfolio without deleting history","PortfolioSummary",identifier,"PortfolioArchiveInput")},
        "/api/v1/portfolios/{id}/accounts": {"post":maintained("createInvestmentAccount","Record an INR source account with unknown initial history","InvestmentAccount",identifier,"AccountInput")},
        "/api/v1/portfolios/{id}/accounts/{accountId}": {"get":maintained("getInvestmentAccount","Read an account only under its actual owned portfolio","InvestmentAccount",[*identifier,parameter("accountId","path",text(format="uuid"),True)])},
        "/api/v1/catalog/companies": {"get": maintained("getCatalogueCompanies", "List up to 100 owned companies", "CatalogueCompanies"), "post": maintained("createCatalogueCompany", "Record a manually identified company", "CatalogueCompany", input_name="CompanyInput")},
        "/api/v1/catalog/lookup": {
            "get": maintained("lookupStocks", "Search the private stock directory by name, symbol or ISIN", "StockLookupResults",
                [parameter("query","query",text(minLength=0,maxLength=80),True),parameter("exchange","query",enum(["NSE","BSE"]))]),
            "post": maintained("openStock", "Select the current listing and request daily prices if needed", "StockLookupOpened", input_name="StockLookupSelection"),
        },
        "/api/v1/catalog/securities": {"get": maintained("searchCatalogueSecurities", "Search the owned manual catalogue", "CatalogueSecurityPage", [parameter("query", "query", text(maxLength=100,minLength=0)), parameter("limit", "query", {"type":"integer","minimum":1,"maximum":100}),parameter("offset", "query", {"type":"integer","minimum":0,"maximum":10000})]), "post": maintained("createCatalogueSecurity", "Record a security separately from its exchange listings", "CatalogueSecurity", input_name="SecurityInput")},
        "/api/v1/catalog/securities/{id}": {"get": maintained("getCatalogueSecurity", "Inspect owned security and distinct listings", "CatalogueSecurityDetail", identifier)},
        "/api/v1/catalog/securities/{id}/listings": {"post": maintained("createCatalogueListing", "Confirm an exchange listing and optional Yahoo mapping", "CatalogueListing", identifier, "ListingInput")},
        "/api/v1/catalog/listings/{id}/symbols": {"get": maintained("getListingSymbols", "Inspect retained listing symbol history", "SymbolHistoryList", identifier), "post": maintained("changeListingSymbol", "Append a reviewed effective symbol change without changing listing identity", "CatalogueListing", identifier, "SymbolInput")},
    })
    return openapi_refs({
        "openapi": "3.1.1", "jsonSchemaDialect": DIALECT,
        "info": {"title": "FINN initial market data API", "version": VERSION,
                 "description": "Private portfolio, ledger, import and valuation operations use reviewed listings and traceable daily closes. Unimplemented market operations are marked planned. Explicit missing/stale states and source provenance; no trading or broker execution."},
        "servers": [{"url": "/", "description": "Same-origin Java API; no running service implied."}],
        "security": [{"sessionCookie": []}],
        "x-finn-status": "PARTIALLY_IMPLEMENTED_REVIEWED_HOLDINGS",
        "x-finn-versioning": "Immutable semantic-versioned contract artifact; independent frontend/backend releases record tested contract SHA. Even 0.x breaking changes require compatibility review.",
        "paths": paths,
        "components": {"securitySchemes": {"sessionCookie": {"type": "apiKey", "in": "cookie", "name": "__Host-FINN_SESSION",
                         "description": "Secure HttpOnly SameSite=Lax host-only session. Explicit loopback local profile uses FINN_SESSION with HTTP. Mutations require CSRF protection."}},
                       "schemas": definitions()},
    })


def render(value) -> str:
    return json.dumps(value, indent=2, ensure_ascii=False) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs = {CONTRACT_ROOT / "market-data.schema.json": schema_document(),
               CONTRACT_ROOT / "public-api" / "openapi.json": public_api_document()}
    failed = []
    for path, document in outputs.items():
        expected = render(document)
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(expected, encoding="utf-8", newline="\n")
        elif not path.exists() or path.read_text(encoding="utf-8") != expected:
            failed.append(path.relative_to(CONTRACT_ROOT).as_posix())
    if failed:
        raise SystemExit("Generated contract drift: " + ", ".join(failed))
    print("Contract artifacts " + ("written" if args.write else "match maintained definitions") + f" ({VERSION}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
