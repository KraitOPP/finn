// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
export type AccountInput = ({
  "name": (string);
  "source": ("GROWW" | "MANUAL" | "OTHER") & (string);
  "currency": ("INR");
});

export type AccountValuation = ({
  "accountId": (OpaqueId);
  "asOf": (SessionDate);
  "ledgerRevision": (number);
  "calculationVersion": (OpaqueId);
  "currency": ("INR") & (string);
  "coverageStart": (((SessionDate)) | ((null)));
  "historyStatus": ("UNKNOWN" | "HOLDINGS_ONLY" | "PARTIAL_TRADES") & (string);
  "holdings": (Array<(ValuedHolding)>);
  "totals": (ValuationTotals);
});

export type AccountValuationTotal = ({
  "accountId": (OpaqueId);
  "name": (string);
  "ledgerRevision": (number);
  "totals": (ValuationTotals);
});

export type AcquisitionEnvelope = ({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "provider": (Provider);
  "adapterVersion": (string);
  "requestedAt": (UtcInstant);
  "completedAt": (UtcInstant);
  "outcome": ("COMPLETE" | "PARTIAL" | "UNAVAILABLE") & (string);
  "results": (Array<(InstrumentResult)>);
  "warnings": (Array<(Warning)>);
});

export type AdjustmentBasis = ("AS_REPORTED_EXCHANGE" | "SPLIT_ADJUSTED" | "TOTAL_RETURN_ADJUSTED" | "PROVIDER_DEFINED" | "UNKNOWN") & (string);

export type AlertCloseEvidence = ({
  "observationId": (OpaqueId);
  "sessionDate": (SessionDate);
  "source": ("MANUAL_REVIEWED" | "YAHOO_YFINANCE") & (string);
  "priceBasis": ("AS_REPORTED_EXCHANGE" | "PROVIDER_DEFINED") & (string);
  "close": (PositiveDecimalString);
  "sourceReference": (string);
  "receivedAt": (UtcInstant);
});

export type AnnouncedEventDate = ({
  "type": ("MEETING" | "RESULTS" | "EX_DATE" | "RECORD_DATE" | "OTHER") & (string);
  "date": (SessionDate);
  "certainty": ("CONFIRMED" | "TENTATIVE" | "CANCELLED") & (string);
});

export type AsyncJobStatus = ((({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("QUEUED") & (string);
  "startedAt": (null);
  "finishedAt": (null);
  "failureCode": (null);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("RUNNING") & (string);
  "startedAt": (UtcInstant);
  "finishedAt": (null);
  "failureCode": (null);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("SUCCEEDED") & (string);
  "startedAt": (UtcInstant);
  "finishedAt": (UtcInstant);
  "failureCode": (null);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("PARTIALLY_SUCCEEDED") & (string);
  "startedAt": (UtcInstant);
  "finishedAt": (UtcInstant);
  "failureCode": ("PARTIAL_RESULT") & (string);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("FAILED") & (string);
  "startedAt": (((UtcInstant)) | ((null)));
  "finishedAt": (UtcInstant);
  "failureCode": (string);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "jobId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
  "updatedAt": (UtcInstant);
  "state": ("CANCELLED") & (string);
  "startedAt": (((UtcInstant)) | ((null)));
  "finishedAt": (UtcInstant);
  "failureCode": (null);
})));

export type AttentionFeedback = ({
  "eventRevision": (number);
  "action": ("READ" | "UNREAD" | "MUTE" | "UNMUTE" | "SNOOZE" | "UNSNOOZE") & (string);
  "snoozeUntil": (((UtcInstant)) | ((null)));
});

export type AttentionItem = ({
  "event": (CompanyEvent);
  "score": (number);
  "state": (AttentionState);
  "reasons": (Array<({
  "label": (string);
  "points": (number);
})>);
  "holdings": (Array<({
  "securityId": (OpaqueId);
  "name": (string);
  "quantity": (PositiveDecimalString);
})>);
});

export type AttentionPage = ({
  "coverage": ("NO_RECORDS" | "PARTIAL" | "RECORDED_ACCOUNTS") & (string);
  "rankedAt": (UtcInstant);
  "items": (Array<(AttentionItem)>);
  "hasMore": (boolean);
});

export type AttentionState = ({
  "read": (boolean);
  "muted": (boolean);
  "snoozedUntil": (((UtcInstant)) | ((null)));
});

export type BriefIndex = ({
  "schedule": (((BriefSchedule)) | ((null)));
  "runs": (Array<({
  "runId": (OpaqueId);
  "scheduleRevision": (number);
  "windowStart": (UtcInstant);
  "windowEnd": (UtcInstant);
  "createdAt": (UtcInstant);
})>);
});

export type BriefSchedule = ({
  "revision": (number);
  "settings": (BriefSettings);
  "nextAt": (((UtcInstant)) | ((null)));
});

export type BriefScheduleInput = ({
  "expectedRevision": (number);
  "settings": (BriefSettings);
});

export type BriefSettings = ({
  "scheduledLocal": (string);
  "timeZone": (string);
  "cadence": ("DAILY" | "WEEKLY") & (string);
  "enabled": (boolean);
  "includeAlerts": (boolean);
  "includeReminders": (boolean);
  "includeCompany": (boolean);
  "includeValuations": (boolean);
});

export type Capability = ({
  "capability": ("QUOTE" | "DAILY_HISTORY" | "INTRADAY_HISTORY" | "STREAMING" | "CORPORATE_ACTIONS" | "FILINGS" | "NEWS" | "FUNDAMENTALS") & (string);
  "status": ("VALIDATED" | "DOCUMENTED_UNVERIFIED" | "UNSUPPORTED" | "TEMPORARILY_UNAVAILABLE") & (string);
  "coverage": (string);
  "evidence": (string);
});

export type CatalogueCompanies = (Array<(CatalogueCompany)>);

export type CatalogueCompany = ({
  "companyId": (OpaqueId);
  "name": (string);
  "source": ("MANUAL_USER" | "NSE_DIRECTORY" | "YAHOO_DISCOVERY" | "GROWW_HOLDINGS") & (string);
});

export type CatalogueListing = ({
  "listingId": (OpaqueId);
  "securityId": (OpaqueId);
  "companyId": (OpaqueId);
  "exchange": ("NSE" | "BSE") & (string);
  "segment": ("CASH_EQUITY") & (string);
  "series": (string);
  "symbol": (string);
  "currency": ("INR") & (string);
  "isin": (((string)) | ((null)));
  "providerSymbol": (((string)) | ((null)));
  "reviewStatus": ("USER_CONFIRMED");
  "source": ("MANUAL_USER" | "NSE_DIRECTORY" | "YAHOO_DISCOVERY") & (string);
  "validFrom": (SessionDate);
});

export type CatalogueSecurity = ({
  "securityId": (OpaqueId);
  "companyId": (OpaqueId);
  "companyName": (string);
  "name": (string);
  "isin": (((string)) | ((null)));
  "reviewStatus": ("USER_CONFIRMED" | "UNRESOLVED") & (string);
});

export type CatalogueSecurityDetail = ({
  "security": (CatalogueSecurity);
  "listings": (Array<(CatalogueListing)>);
});

export type CatalogueSecurityPage = ({
  "items": (Array<(CatalogueSecurity)>);
  "limit": (number);
  "offset": (number);
  "hasMore": (boolean);
});

export type ChartRange = ("D1" | "D7" | "M1" | "Y1" | "Y5" | "ALL") & (string);

export type CompanyCalendarPage = ({
  "items": (Array<({
  "eventId": (OpaqueId);
  "versionId": (OpaqueId);
  "revision": (number);
  "title": (string);
  "companyName": (string);
  "documentId": (OpaqueId);
  "documentRevision": (number);
  "date": (AnnouncedEventDate);
})>);
  "hasMore": (boolean);
});

export type CompanyEvent = ({
  "eventId": (OpaqueId);
  "versionId": (OpaqueId);
  "companyId": (OpaqueId);
  "companyName": (string);
  "revision": (number);
  "documentId": (OpaqueId);
  "documentRevision": (number);
  "sourceTitle": (string);
  "title": (string);
  "category": ("EARNINGS" | "CAPITAL" | "GOVERNANCE" | "CORPORATE_ACTION" | "OTHER") & (string);
  "subtype": ("RESULTS" | "RESULTS_MEETING" | "BUYBACK" | "CAPITAL_RAISE" | "AUDITOR" | "GOVERNANCE" | "DIVIDEND" | "SPLIT_BONUS" | "MERGER" | "OTHER") & (string);
  "stage": ("ANNOUNCED" | "DECIDED" | "COMPLETED" | "CANCELLED" | "UNKNOWN") & (string);
  "materiality": ("HIGH" | "MEDIUM" | "LOW" | "UNKNOWN") & (string);
  "novelty": ("NEW" | "FOLLOW_UP" | "CORRECTION" | "ROUTINE" | "UNKNOWN") & (string);
  "confidence": ("REVIEWED");
  "reviewedAt": (UtcInstant);
  "dates": (Array<(AnnouncedEventDate)>);
});

export type CompanyEventHistory = ({
  "items": (Array<(CompanyEvent)>);
});

export type CompanyEventInput = ({
  "documentId": (OpaqueId);
  "documentRevision": (number);
  "eventId": (((OpaqueId)) | ((null)));
  "expectedRevision": (((number)) | ((null)));
  "title": (string);
  "groupingKey": (((string)) | ((null)));
  "subtype": ("RESULTS" | "RESULTS_MEETING" | "BUYBACK" | "CAPITAL_RAISE" | "AUDITOR" | "GOVERNANCE" | "DIVIDEND" | "SPLIT_BONUS" | "MERGER" | "OTHER") & (string);
  "stage": ("ANNOUNCED" | "DECIDED" | "COMPLETED" | "CANCELLED" | "UNKNOWN") & (string);
  "materiality": ("HIGH" | "MEDIUM" | "LOW" | "UNKNOWN") & (string);
  "novelty": ("NEW" | "FOLLOW_UP" | "CORRECTION" | "ROUTINE" | "UNKNOWN") & (string);
  "reviewed": (true);
  "dates"?: (Array<(AnnouncedEventDate)>);
});

export type CompanyEventPage = ({
  "items": (Array<(CompanyEvent)>);
  "hasMore": (boolean);
});

export type CompanyInput = ({
  "name": (string);
});

export type CompanyNewsCluster = ({
  "clusterId": (OpaqueId);
  "companyId": (OpaqueId);
  "companyName": (string);
  "headline": (string);
  "date": (SessionDate);
  "sources": (Array<(CompanySource)>);
});

export type CompanyNewsInput = ({
  "companyId": (OpaqueId);
  "headline": (string);
  "publisher": (string);
  "url": (string);
  "publishedAt": (((UtcInstant)) | ((null)));
  "rightsConfirmed": (true);
});

export type CompanyNewsPage = ({
  "coverage": ("MANUAL_LINKS");
  "items": (Array<(CompanyNewsCluster)>);
  "hasMore": (boolean);
});

export type CompanyResearchNote = ({
  "kind": ("BUSINESS" | "GOVERNANCE" | "QUESTION") & (string);
  "title": (string);
  "anchorId": (((OpaqueId)) | ((null)));
  "noteId": (OpaqueId);
  "resolved": (boolean);
});

export type CompanyResearchNoteInput = ({
  "kind": ("BUSINESS" | "GOVERNANCE" | "QUESTION") & (string);
  "title": (string);
  "anchorId": (((OpaqueId)) | ((null)));
});

export type CompanyResearchOverview = ({
  "companyId": (OpaqueId);
  "companyName": (string);
  "primarySources": (number);
  "indexedSources": (number);
  "sources": (Array<(CompanySource)>);
  "events": (Array<(CompanyEvent)>);
  "notes": (Array<(CompanyResearchNote)>);
});

export type CompanyResearchResolution = ({
  "resolved": (boolean);
});

export type CompanySource = ({
  "documentId": (OpaqueId);
  "companyId": (OpaqueId);
  "companyName": (string);
  "sourceType": ("PRIMARY" | "NEWS") & (string);
  "revision": (number);
  "title": (string);
  "sourceName": (string);
  "url": (((string)) | ((null)));
  "hasAttachment": (boolean);
  "hasPdf": (boolean);
  "checksum": (string);
  "publishedAt": (((UtcInstant)) | ((null)));
  "ingestedAt": (UtcInstant);
});

export type CompanySourceDetail = ({
  "source": (CompanySource);
  "attachment": (((string)) | ((null)));
});

export type CompanySourceEdit = ({
  "expectedRevision": (number);
  "source": (CompanySourceInput);
});

export type CompanySourceInput = ({
  "companyId": (OpaqueId);
  "title": (string);
  "sourceName": (string);
  "url": (((string)) | ((null)));
  "attachment": (((string)) | ((null)));
  "publishedAt": (((UtcInstant)) | ((null)));
  "rightsConfirmed": (true);
  "pdfFileId"?: (((OpaqueId)) | ((null)));
  "removePdf"?: (boolean);
});

export type CompanySourcePage = ({
  "items": (Array<(CompanySource)>);
  "hasMore": (boolean);
});

export type CompanySourceVersions = ({
  "items": (Array<(CompanySource)>);
});

export type ContractVersion = ("0.47.0") & (string);

export type CorporateActionApproval = ({
  "action": (CorporateActionInput);
  "reviewed": (true);
  "expectedLedgerRevision": (number);
});

export type CorporateActionEffect = ({
  "state": ("APPLICABLE" | "NEEDS_REVIEW") & (string);
  "reason": (((OpaqueId)) | ((null)));
  "ledgerRevision": (number);
  "unitsBefore": (((string)) | ((null)));
  "unitsAfter": (((string)) | ((null)));
  "recordedCostBefore": (((string)) | ((null)));
  "recordedCostAfter": (((string)) | ((null)));
  "cashDelta": (((string)) | ((null)));
  "previousSymbol": (((string)) | ((null)));
  "newSymbol": (((string)) | ((null)));
});

export type CorporateActionInput = ({
  "type": ("SPLIT" | "BONUS" | "DIVIDEND" | "SYMBOL_CHANGE" | "MERGER" | "DEMERGER" | "RIGHTS") & (string);
  "securityId": (OpaqueId);
  "listingId": (((OpaqueId)) | ((null)));
  "effectiveDate": (SessionDate);
  "ratioNumerator": (((number)) | ((null)));
  "ratioDenominator": (((number)) | ((null)));
  "netCash": (((string)) | ((null)));
  "sourceReference": (string);
  "sourceUrl": (((string)) | ((null)));
  "newSymbol": (((string)) | ((null)));
  "newProviderSymbol": (((string)) | ((null)));
  "correctsActionId": (((OpaqueId)) | ((null)));
});

export type CorporateActionList = ({
  "items": (Array<(CorporateActionRecord)>);
});

export type CorporateActionRecord = ({
  "actionId": (OpaqueId);
  "securityName": (string);
  "action": (CorporateActionInput);
  "effect": (CorporateActionEffect);
  "state": ("APPLIED" | "NEEDS_REVIEW" | "REVERSED") & (string);
  "ledgerEventId": (((OpaqueId)) | ((null)));
  "ledgerRevision": (number);
  "recordedAt": (UtcInstant);
  "replayed": (boolean);
});

export type CsrfInformation = ({
  "headerName": ("X-CSRF-TOKEN");
  "parameterName": ("_csrf");
  "token": (string);
});

export type DecimalString = (string);

export type Delay = ((({
  "kind": ("EOD") & (string);
  "seconds": (null);
  "basis": ("SOURCE_DECLARED" | "UNKNOWN") & (string);
})) | (({
  "kind": ("UNKNOWN") & (string);
  "seconds": (null);
  "basis": ("UNKNOWN") & (string);
})) | (({
  "kind": ("DELAYED") & (string);
  "seconds": (number);
  "basis": ("SOURCE_DECLARED") & (string);
})));

export type DeriveFinancialFact = ({
  "existingFactId": (((OpaqueId)) | ((null)));
  "expectedRevision": (((number)) | ((null)));
  "operatingCash": (FinancialOperand);
  "capitalExpenditure": (FinancialOperand);
  "reviewed": (true);
});

export type DiscoveryCompany = ({
  "member": (DiscoveryMember);
  "readings": (Array<(DiscoveryReading)>);
});

export type DiscoveryDirectory = ({
  "source": ("MANUAL_CURRENT");
  "members": (Array<(DiscoveryMember)>);
  "metrics": (Array<(DiscoveryMetricSupport)>);
});

export type DiscoveryMember = ({
  "listingId": (OpaqueId);
  "sector": (DiscoverySector);
  "active": (boolean);
  "companyId": (OpaqueId);
  "name": (string);
  "exchange": ("NSE" | "BSE") & (string);
  "symbol": (string);
  "revision": (number);
  "registeredAt": (UtcInstant);
  "reviewedAt": (UtcInstant);
});

export type DiscoveryMemberInput = ({
  "listingId": (OpaqueId);
  "sector": (DiscoverySector);
  "active": (boolean);
  "expectedRevision": (((number)) | ((null)));
});

export type DiscoveryMetric = ("REVENUE" | "PROFIT_AFTER_TAX" | "EPS_BASIC" | "OPERATING_MARGIN" | "FREE_CASH_FLOW" | "TOTAL_EQUITY") & (string);

export type DiscoveryMetricSupport = ({
  "metric": (DiscoveryMetric);
  "unit": ("MONEY" | "PER_SHARE" | "PERCENT") & (string);
  "sectors": (Array<(DiscoverySector)>);
});

export type DiscoveryPeriod = ({
  "kind": ("QUARTER" | "FULL_YEAR") & (string);
  "start": (SessionDate);
  "end": (SessionDate);
});

export type DiscoveryReading = ({
  "metric": (DiscoveryMetric);
  "reason": ("PERIOD_OPEN" | "FACT_MISSING" | "DIMENSIONS_MISMATCH" | "PUBLICATION_UNKNOWN" | "PUBLISHED_AFTER_CUTOFF" | "PERIOD_PUBLICATION_INVALID" | "SOURCE_REVISED" | "DERIVATION_REVIEW_REQUIRED" | "COMPARABLE_FACT" | "SECTOR_INELIGIBLE") & (string);
  "fact": (((FinancialFact)) | ((null)));
});

export type DiscoverySector = ("BANKING" | "FINANCIAL_SERVICES" | "MANUFACTURING" | "TECHNOLOGY" | "CONSUMER" | "ENERGY" | "OTHER") & (string);

export type DiscoverySnapshot = ({
  "source": ("MANUAL_CURRENT");
  "capturedAt": (UtcInstant);
  "period": (DiscoveryPeriod);
  "companies": (Array<(DiscoveryCompany)>);
});

export type EventReplay = ({
  "mode": ("SYNTHETIC_REPLAY");
  "runId": (((OpaqueId)) | ((null)));
  "savedAt": (((UtcInstant)) | ((null)));
  "events": (Array<({
  "attention": (AttentionItem);
  "evidence": (CompanySourceDetail);
})>);
  "notifications": (Array<({
  "title": (string);
  "status": ("PENDING" | "DELIVERED" | "SUPPRESSED" | "PREVIEWED" | "FAILED") & (string);
})>);
  "brief": (((PortfolioBrief)) | ((null)));
});

export type EventSuggestion = ({
  "category": ("EARNINGS" | "CAPITAL" | "GOVERNANCE" | "CORPORATE_ACTION" | "OTHER") & (string);
  "subtype": ("RESULTS" | "RESULTS_MEETING" | "BUYBACK" | "CAPITAL_RAISE" | "AUDITOR" | "GOVERNANCE" | "DIVIDEND" | "SPLIT_BONUS" | "MERGER" | "OTHER") & (string);
  "stage": ("ANNOUNCED" | "DECIDED" | "COMPLETED" | "CANCELLED" | "UNKNOWN") & (string);
  "materiality": ("HIGH" | "MEDIUM" | "LOW" | "UNKNOWN") & (string);
  "novelty": ("NEW" | "FOLLOW_UP" | "CORRECTION" | "ROUTINE" | "UNKNOWN") & (string);
  "confidence": ("TITLE_HINT" | "UNKNOWN") & (string);
});

export type ExchangeSession = ({
  "date": (SessionDate);
  "kind": ("HOLIDAY" | "SPECIAL" | "WEEKEND" | "SCHEDULED" | "UNKNOWN") & (string);
  "label": (string);
  "sourceUrl": (((string)) | ((null)));
});

export type FilingRule = ({
  "ruleId": (OpaqueId);
  "revision": (number);
  "enabled": (boolean);
  "settings": (FilingRuleSettings);
});

export type FilingRuleChange = ({
  "expectedRevision": (number);
  "enabled": (boolean);
});

export type FilingRuleList = ({
  "items": (Array<(FilingRule)>);
});

export type FilingRuleSettings = ({
  "companyId": (((OpaqueId)) | ((null)));
  "title": (string);
  "category": ("ANY" | "EARNINGS" | "CAPITAL" | "GOVERNANCE" | "CORPORATE_ACTION" | "OTHER") & (string);
  "minimumMateriality": ("ANY" | "MEDIUM" | "HIGH") & (string);
  "arrivals": (boolean);
  "dates": (boolean);
  "tentative": (boolean);
});

export type FinancialComparison = ({
  "state": ("COMPARABLE" | "INCOMPARABLE") & (string);
  "reason": ((("DIFFERENT_REPORTING_BASIS" | "DIFFERENT_OR_OVERLAPPING_PERIODS" | "NON_POSITIVE_BASE" | "PERCENTAGE_POINTS") & (string)) | ((null)));
  "current": (FinancialFact);
  "previous": (FinancialFact);
  "change": (((DecimalString)) | ((null)));
  "percentChange": (((DecimalString)) | ((null)));
});

export type FinancialDimensions = ({
  "metric": ("REVENUE" | "EBITDA" | "PROFIT_AFTER_TAX" | "CASH_FROM_OPERATIONS" | "CAPITAL_EXPENDITURE" | "FREE_CASH_FLOW" | "TOTAL_DEBT" | "TOTAL_EQUITY" | "EPS_BASIC" | "OPERATING_MARGIN") & (string);
  "basis": ("STANDALONE" | "CONSOLIDATED") & (string);
  "periodKind": ("QUARTER" | "YTD" | "FULL_YEAR" | "AS_OF") & (string);
  "periodStart": (SessionDate);
  "periodEnd": (SessionDate);
  "unit": ("MONEY" | "PER_SHARE" | "PERCENT") & (string);
  "currency": ((("INR" | "USD" | "EUR" | "GBP" | "JPY") & (string)) | ((null)));
});

export type FinancialFact = ({
  "factId": (OpaqueId);
  "companyId": (OpaqueId);
  "revision": (number);
  "dimensions": (FinancialDimensions);
  "amount": (DecimalString);
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "normalizedAmount": (DecimalString);
  "origin": ("REPORTED" | "DERIVED") & (string);
  "anchorId": (OpaqueId);
  "sourceTitle": (string);
  "documentRevision": (number);
  "publishedAt": (((UtcInstant)) | ((null)));
  "reviewedAt": (UtcInstant);
  "operands": (Array<(FinancialOperand)>);
});

export type FinancialFactEdit = ({
  "companyId": (OpaqueId);
  "expectedRevision": (number);
  "fact": (ReportedFactInput);
});

export type FinancialFactHistory = ({
  "items": (Array<(FinancialFact)>);
});

export type FinancialFactPage = ({
  "items": (Array<(FinancialFact)>);
  "hasMore": (boolean);
});

export type FinancialOperand = ({
  "factId": (OpaqueId);
  "revision": (number);
});

export type Freshness = ({
  "state": ("FRESH" | "STALE" | "UNKNOWN" | "NOT_APPLICABLE") & (string);
  "evaluatedAt": (UtcInstant);
  "expectedSessionDate": (((SessionDate)) | ((null)));
  "latestSessionDate": (((SessionDate)) | ((null)));
  "reasonCode": (OpaqueId);
});

export type GeminiCapability = ({
  "configured": (boolean);
  "model": (((string)) | ((null)));
});

export type GeminiInput = ({
  "listingId": (OpaqueId);
  "preset": (GeminiPreset);
});

export type GeminiListings = ({
  "items": (Array<(CatalogueListing)>);
});

export type GeminiPreset = ("DEEP_DIVE" | "FINANCIALS" | "VALUATION" | "RISKS" | "NEWS") & (string);

export type GeminiReport = ({
  "preset": (GeminiPreset);
  "model": (string);
  "asOf": (SessionDate);
  "items": (Array<({
  "title": (string);
  "detail": (string);
  "publishedOn": (((SessionDate)) | ((null)));
  "sourceIds": (Array<(number)>);
})>);
  "sources": (Array<({
  "id": (number);
  "title": (string);
  "url": (string);
})>);
  "searchSuggestions": (((string)) | ((null)));
});

export type GuidanceCandidates = ({
  "evidence": (ResearchLocation);
  "printedNumbers": (Array<(string)>);
});

export type GuidanceDelivery = ({
  "guidanceId": (OpaqueId);
  "guidanceRevision": (number);
  "asOf": (SessionDate);
  "state": ("MET" | "MISSED" | "PARTIAL" | "WITHDRAWN" | "REVISED" | "NOT_DUE" | "INSUFFICIENT_EVIDENCE") & (string);
  "reason": ("PERIOD_OPEN" | "FACT_MISSING" | "DIMENSIONS_MISMATCH" | "PUBLICATION_UNKNOWN" | "PUBLISHED_AFTER_CUTOFF" | "PERIOD_PUBLICATION_INVALID" | "SOURCE_REVISED" | "DERIVATION_REVIEW_REQUIRED" | "COMPARABLE_FACT" | "GUIDANCE_UNCONFIRMED" | "GUIDANCE_NOT_PUBLISHED" | "WITHDRAWAL_PUBLISHED" | "REVISION_PUBLISHED" | "QUALITATIVE_STATEMENT" | "OUTCOME_PREDATES_GUIDANCE" | "INTERIM_YTD_ONLY") & (string);
  "actual": (((FinancialFact)) | ((null)));
  "successor": (((ManagementGuidance)) | ((null)));
});

export type HistoryCoverage = ({
  "state": ("COMPLETE" | "PARTIAL" | "UNKNOWN" | "NONE") & (string);
  "expectedSessions": (((number)) | ((null)));
  "availableSessions": (number);
  "missingSessions": (Array<(SessionDate)>);
  "reasonCode": (OpaqueId);
});

export type HistoryResponse = ({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "listing": (ListingIdentity);
  "from": (SessionDate);
  "toExclusive": (SessionDate);
  "requestedBasis": (AdjustmentBasis);
  "selectionSnapshotId": (OpaqueId);
  "availability": ("AVAILABLE" | "NOT_YET_PUBLISHED" | "NO_TRADE" | "NOT_COVERED" | "TEMPORARILY_UNAVAILABLE" | "INVALID_DATA" | "UNKNOWN") & (string);
  "items": (Array<(PriceObservation)>);
  "nextCursor": (((string)) | ((null)));
  "coverage": (HistoryCoverage);
  "freshness": (Freshness);
  "warnings": (Array<(Warning)>);
});

export type HoldingsAcceptanceInput = ({
  "confirmInr": (true);
  "retainUnresolvedListings": (true);
  "acknowledgeDifferences": (boolean);
  "costMode": ("UNITS_ONLY" | "REPORTED_ROW_COST") & (string);
  "expectedLedgerRevision": (number);
});

export type HoldingsAcceptanceReceipt = ({
  "importId": (OpaqueId);
  "outcome": ("APPLIED" | "DUPLICATE") & (string);
  "costMode": ("UNITS_ONLY" | "REPORTED_ROW_COST") & (string);
  "acceptedRows": (number);
  "skippedRows": (number);
  "duplicateRows": (number);
  "ledgerRevision": (number);
  "originalImportId": (((OpaqueId)) | ((null)));
  "replayed": (boolean);
  "acceptedAt": (UtcInstant);
});

export type HoldingsComparison = ({
  "field": ("BUY_VALUE" | "CLOSING_VALUE" | "UNREALISED_PNL") & (string);
  "reported": (((DecimalString)) | ((null)));
  "detailSum": (((DecimalString)) | ((null)));
  "difference": (((DecimalString)) | ((null)));
  "status": ("MATCH" | "MISMATCH" | "INCOMPLETE") & (string);
});

export type HoldingsImportList = ({
  "items": (Array<(HoldingsImportSummary)>);
});

export type HoldingsImportSummary = ({
  "importId": (OpaqueId);
  "jobId": (OpaqueId);
  "state": ("QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "PARTIALLY_SUCCEEDED" | "CANCELLED") & (string);
  "createdAt": (UtcInstant);
  "sizeBytes": (number);
  "failureCode": (((string)) | ((null)));
});

export type HoldingsPreviewMetadata = ({
  "profile": ("groww-holdings-xlsx-v1");
  "asOfDate": (SessionDate);
  "reportedSummary": (HoldingsTotals);
  "detailTotals": (HoldingsTotals);
  "comparisons": (Array<(HoldingsComparison)>);
  "warnings": (Array<(OpaqueId)>);
  "rowCount": (number);
});

export type HoldingsPreviewPage = ({
  "importId": (OpaqueId);
  "jobId": (OpaqueId);
  "ledgerRevisionAtPreview": (number);
  "metadata": (HoldingsPreviewMetadata);
  "rows": (Array<(HoldingsPreviewRow)>);
  "nextOffset": (((number)) | ((null)));
  "requiresInrConfirmation": (true);
  "commitAvailable": (boolean);
  "review": (HoldingsReviewPlan);
});

export type HoldingsPreviewRow = ({
  "source": (HoldingsSourceRow);
  "matchedSecurityId": (((OpaqueId)) | ((null)));
  "mappingStatus": ("UNRESOLVED_SECURITY" | "EXISTING_SECURITY") & (string);
});

export type HoldingsReconciliation = ({
  "importId": (OpaqueId);
  "reportDate": (SessionDate);
  "ledgerRevision": (number);
  "state": ("COMPARABLE" | "HISTORY_UNAVAILABLE") & (string);
  "coverageStart": (((SessionDate)) | ((null)));
  "historyStatus": ("UNKNOWN" | "HOLDINGS_ONLY" | "PARTIAL_TRADES") & (string);
  "rowCount": (number);
  "issueCount": (number);
  "rows": (Array<(HoldingsReconciliationRow)>);
  "nextOffset": (((number)) | ((null)));
  "reviewedAt": (((UtcInstant)) | ((null)));
});

export type HoldingsReconciliationInput = ({
  "reviewed": (true);
  "expectedLedgerRevision": (number);
});

export type HoldingsReconciliationReceipt = ({
  "importId": (OpaqueId);
  "ledgerRevision": (number);
  "reviewedAt": (UtcInstant);
});

export type HoldingsReconciliationRow = ({
  "sourceRow": (((number)) | ((null)));
  "securityId": (((OpaqueId)) | ((null)));
  "name": (((string)) | ((null)));
  "isin": (((string)) | ((null)));
  "reportedUnits": (((DecimalString)) | ((null)));
  "recordedUnits": (((DecimalString)) | ((null)));
  "reportedCost": (((DecimalString)) | ((null)));
  "recordedCost": (((DecimalString)) | ((null)));
  "unitDifference": (((DecimalString)) | ((null)));
  "costDifference": (((DecimalString)) | ((null)));
  "issues": (Array<(OpaqueId)>);
});

export type HoldingsReviewPlan = ({
  "state": ("READY" | "ALREADY_ACCEPTED" | "DUPLICATE" | "SOURCE_CONFLICT" | "RECONCILIATION_ONLY" | "ROWS_BLOCKED" | "ARCHIVED") & (string);
  "currentLedgerRevision": (number);
  "eligibleRows": (number);
  "duplicateRows": (number);
  "conflictRows": (number);
  "reportedCostAvailable": (boolean);
  "differencesRequireAcknowledgement": (boolean);
  "receipt": (((HoldingsAcceptanceReceipt)) | ((null)));
});

export type HoldingsRowIssue = ({
  "code": (OpaqueId);
  "column": ("A" | "B" | "C" | "D" | "E" | "F" | "G" | "H") & (string);
  "blocksCommit": (boolean);
});

export type HoldingsSourceRow = ({
  "rowNumber": (number);
  "reportedName": (((string)) | ((null)));
  "isin": (((string)) | ((null)));
  "quantity": (((DecimalString)) | ((null)));
  "averageCost": (((DecimalString)) | ((null)));
  "buyValue": (((DecimalString)) | ((null)));
  "closingPrice": (((DecimalString)) | ((null)));
  "closingValue": (((DecimalString)) | ((null)));
  "unrealisedPnl": (((DecimalString)) | ((null)));
  "issues": (Array<(HoldingsRowIssue)>);
});

export type HoldingsTotals = ({
  "buyValue": (((DecimalString)) | ((null)));
  "closingValue": (((DecimalString)) | ((null)));
  "unrealisedPnl": (((DecimalString)) | ((null)));
});

export type ImportTicket = ({
  "importId": (OpaqueId);
  "jobId": (OpaqueId);
  "duplicate": (boolean);
});

export type IndicatorCreate = ({
  "listingId": (OpaqueId);
  "portfolioId": (((OpaqueId)) | ((null)));
  "kind": ("VOLUME" | "ALLOCATION") & (string);
  "title": (string);
  "threshold": (PositiveDecimalString);
});

export type IndicatorEdit = ({
  "expectedRevision": (number);
  "threshold": (PositiveDecimalString);
  "enabled": (boolean);
});

export type IndicatorEvaluation = ({
  "evaluationId": (OpaqueId);
  "revision": (number);
  "sessionDate": (SessionDate);
  "threshold": (PositiveDecimalString);
  "metric": (NonNegativeDecimalString);
  "baselineStart": (((SessionDate)) | ((null)));
  "holdingValue": (((NonNegativeDecimalString)) | ((null)));
  "equityValue": (((PositiveDecimalString)) | ((null)));
  "triggered": (boolean);
  "evaluatedAt": (UtcInstant);
});

export type IndicatorEvaluations = ({
  "items": (Array<(IndicatorEvaluation)>);
});

export type IndicatorList = ({
  "items": (Array<(IndicatorRule)>);
});

export type IndicatorRule = ({
  "listingId": (OpaqueId);
  "portfolioId": (((OpaqueId)) | ((null)));
  "kind": ("VOLUME" | "ALLOCATION") & (string);
  "title": (string);
  "threshold": (PositiveDecimalString);
  "ruleId": (OpaqueId);
  "revision": (number);
  "enabled": (boolean);
  "result": ("WAITING" | "INSUFFICIENT_COVERAGE" | "EVALUATED") & (string);
  "lastSession": (((SessionDate)) | ((null)));
  "symbol": (string);
  "exchange": ("NSE" | "BSE") & (string);
});

export type InstrumentPage = ({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "items": (Array<(ListingIdentity)>);
  "nextCursor": (((string)) | ((null)));
});

export type InstrumentResult = ((({
  "listing": (ListingIdentity);
  "reasonCode": (OpaqueId);
  "warnings": (Array<(Warning)>);
  "availability": ("AVAILABLE") & (string);
  "observations": (Array<(PriceObservation)>);
})) | (({
  "listing": (ListingIdentity);
  "reasonCode": (OpaqueId);
  "warnings": (Array<(Warning)>);
  "availability": ("NOT_YET_PUBLISHED" | "NO_TRADE" | "NOT_COVERED" | "TEMPORARILY_UNAVAILABLE" | "INVALID_DATA" | "UNKNOWN") & (string);
  "observations": (Array<(PriceObservation)>);
})));

export type IntegerString = (string);

export type InvestmentAccount = ((({
  "accountId": (OpaqueId);
  "portfolioId": (OpaqueId);
  "name": (string);
  "source": ("GROWW" | "MANUAL" | "OTHER") & (string);
  "currency": ("INR");
  "historyStatus": ("UNKNOWN");
  "historyStartDate": (null);
})) | (({
  "accountId": (OpaqueId);
  "portfolioId": (OpaqueId);
  "name": (string);
  "source": ("GROWW" | "MANUAL" | "OTHER") & (string);
  "currency": ("INR");
  "historyStatus": ("HOLDINGS_ONLY" | "PARTIAL_TRADES") & (string);
  "historyStartDate": (SessionDate);
})));

export type InvestmentTheses = ({
  "items": (Array<(InvestmentThesis)>);
});

export type InvestmentThesis = ({
  "title": (string);
  "rationale": (string);
  "risks": (string);
  "milestones": (string);
  "decision": ("MONITOR" | "REAFFIRM" | "REVISE" | "PAUSE" | "CLOSE") & (string);
  "decisionNote": (string);
  "review": (((ThesisReviewSchedule)) | ((null)));
  "anchorIds": (Array<(OpaqueId)>);
  "thesisId": (OpaqueId);
  "companyId": (OpaqueId);
  "revision": (number);
  "reminderId": (((OpaqueId)) | ((null)));
  "savedAt": (UtcInstant);
});

export type InvestmentThesisEdit = ({
  "expectedRevision": (number);
  "thesis": (InvestmentThesisInput);
});

export type InvestmentThesisInput = ({
  "title": (string);
  "rationale": (string);
  "risks": (string);
  "milestones": (string);
  "decision": ("MONITOR" | "REAFFIRM" | "REVISE" | "PAUSE" | "CLOSE") & (string);
  "decisionNote": (string);
  "review": (((ThesisReviewSchedule)) | ((null)));
  "anchorIds": (Array<(OpaqueId)>);
});

export type LedgerCorrectInput = ({
  "idempotencyKey": (string);
  "replacement": (LedgerEntryInput);
  "reference": (((string)) | ((null)));
});

export type LedgerEntryInput = ({
  "kind": ("BUY" | "SELL" | "FEE" | "DEPOSIT" | "WITHDRAWAL" | "OPENING_POSITION" | "OPENING_CASH") & (string);
  "effectiveDate": (SessionDate);
  "securityId": (((OpaqueId)) | ((null)));
  "listingId": (((OpaqueId)) | ((null)));
  "quantity": (((string)) | ((null)));
  "price": (((string)) | ((null)));
  "amount": (((string)) | ((null)));
  "fees": (((string)) | ((null)));
  "reference": (((string)) | ((null)));
});

export type LedgerEventView = ({
  "kind": ("BUY" | "SELL" | "FEE" | "DEPOSIT" | "WITHDRAWAL" | "OPENING_POSITION" | "OPENING_CASH" | "SPLIT" | "BONUS" | "DIVIDEND" | "REVERSAL") & (string);
  "effectiveDate": (SessionDate);
  "securityId": (((OpaqueId)) | ((null)));
  "listingId": (((OpaqueId)) | ((null)));
  "quantity": (((string)) | ((null)));
  "price": (((string)) | ((null)));
  "amount": (((string)) | ((null)));
  "fees": (((string)) | ((null)));
  "reference": (((string)) | ((null)));
  "eventId": (OpaqueId);
  "sequence": (number);
  "securityName": (((string)) | ((null)));
  "exchange": ((("NSE" | "BSE") & (string)) | ((null)));
  "reversalOf": (((OpaqueId)) | ((null)));
  "reversedBy": (((OpaqueId)) | ((null)));
  "replacesEventId": (((OpaqueId)) | ((null)));
  "source": ("MANUAL" | "GROWW_HOLDINGS" | "REVIEWED_CORPORATE_ACTION") & (string);
  "sourceReference": (((OpaqueId)) | ((null)));
  "recordedAt": (UtcInstant);
  "ratioNumerator": (((number)) | ((null)));
  "ratioDenominator": (((number)) | ((null)));
});

export type LedgerExportInput = ({
  "expectedLedgerRevision": (number);
});

export type LedgerPage = ({
  "items": (Array<(LedgerEventView)>);
  "nextBefore": (((number)) | ((null)));
});

export type LedgerPosition = ({
  "securityId": (OpaqueId);
  "securityName": (((string)) | ((null)));
  "quantity": (IntegerString);
  "recordedCost": (((NonNegativeDecimalString)) | ((null)));
  "averageCost": (((NonNegativeDecimalString)) | ((null)));
  "costBasis": ("RECORDED_TRADES" | "REPORTED_OPENING_COST" | "MIXED_RECORDED_COST" | "UNKNOWN") & (string);
});

export type LedgerReceipt = ({
  "commandId": (OpaqueId);
  "revision": (number);
  "eventIds": (Array<(OpaqueId)>);
  "replayed": (boolean);
});

export type LedgerRecordInput = ({
  "idempotencyKey": (string);
  "event": (LedgerEntryInput);
});

export type LedgerReverseInput = ({
  "idempotencyKey": (string);
  "reference": (((string)) | ((null)));
});

export type LedgerView = ({
  "revision": (number);
  "calculationVersion": ("MOVING_AVERAGE_1");
  "currency": ("INR");
  "positions": (Array<(LedgerPosition)>);
  "cashBalance": (((DecimalString)) | ((null)));
  "recordedCashComponents": (DecimalString);
  "cashMovementsComplete": (boolean);
  "realisedPnl": (((DecimalString)) | ((null)));
  "knownRealisedPnl": (DecimalString);
  "recordedFees": (NonNegativeDecimalString);
  "recordedFeesComplete": (boolean);
  "standaloneFees": (NonNegativeDecimalString);
  "netContributions": (DecimalString);
  "cashBaselineDate": (((SessionDate)) | ((null)));
  "coverageStart": (((SessionDate)) | ((null)));
  "historyStatus": ("UNKNOWN" | "HOLDINGS_ONLY" | "PARTIAL_TRADES") & (string);
  "warnings": (Array<(OpaqueId)>);
  "recordedDividends": (NonNegativeDecimalString);
});

export type ListingIdentity = ({
  "listingId": (OpaqueId);
  "securityId": (OpaqueId);
  "companyId": (OpaqueId);
  "exchange": ("NSE" | "BSE") & (string);
  "segment": ("CASH_EQUITY") & (string);
  "series": (string);
  "symbol": (string);
  "currency": ("INR") & (string);
  "isin": (((string)) | ((null)));
});

export type ListingInput = ({
  "exchange": ("NSE" | "BSE") & (string);
  "series": (string);
  "symbol": (string);
  "providerSymbol": (((string)) | ((null)));
  "validFrom": (SessionDate);
  "confirmed": (true);
});

export type ManagementGuidance = ({
  "title": (string);
  "kind": ("QUALITATIVE" | "AT_LEAST" | "AT_MOST" | "RANGE") & (string);
  "stage": ("DRAFT" | "CONFIRMED" | "WITHDRAWN") & (string);
  "statementDate": (((SessionDate)) | ((null)));
  "dimensions": (((FinancialDimensions)) | ((null)));
  "lower": (((DecimalString)) | ((null)));
  "upper": (((DecimalString)) | ((null)));
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "caveats": (string);
  "anchorId": (OpaqueId);
  "guidanceId": (OpaqueId);
  "companyId": (OpaqueId);
  "revision": (number);
  "publishedAt": (((UtcInstant)) | ((null)));
  "savedAt": (UtcInstant);
});

export type ManagementGuidanceEdit = ({
  "expectedRevision": (number);
  "guidance": (ManagementGuidanceInput);
});

export type ManagementGuidanceInput = ({
  "title": (string);
  "kind": ("QUALITATIVE" | "AT_LEAST" | "AT_MOST" | "RANGE") & (string);
  "stage": ("DRAFT" | "CONFIRMED" | "WITHDRAWN") & (string);
  "statementDate": (((SessionDate)) | ((null)));
  "dimensions": (((FinancialDimensions)) | ((null)));
  "lower": (((DecimalString)) | ((null)));
  "upper": (((DecimalString)) | ((null)));
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "caveats": (string);
  "anchorId": (OpaqueId);
});

export type ManagementGuidanceList = ({
  "items": (Array<(ManagementGuidance)>);
});

export type MarketChart = ({
  "range": (ChartRange);
  "source": ("YAHOO_YFINANCE" | "MANUAL_REVIEWED") & (string);
  "interval": ("5M" | "DAILY") & (string);
  "points": (Array<({
  "date": (SessionDate);
  "time": (((UtcInstant)) | ((null)));
  "close": (PositiveDecimalString);
})>);
  "count": (number);
  "changePercent": (((DecimalString)) | ((null)));
  "low": (((PositiveDecimalString)) | ((null)));
  "high": (((PositiveDecimalString)) | ((null)));
  "today": (ExchangeSession);
  "calendarEvents": (Array<(ExchangeSession)>);
});

export type MarketDiagnostics = ({
  "yahooCapability": ("DISABLED" | "CONFIGURATION_REQUIRED" | "PRIVATE_DAILY") & (string);
  "officialFiles": ("UNVERIFIED") & (string);
  "streaming": ("UNVERIFIED") & (string);
  "providerDelay": ("UNKNOWN") & (string);
  "providerQuota": ("UNKNOWN") & (string);
  "lastSuccessfulAcquisition": (((UtcInstant)) | ((null)));
  "sourceValidationFailuresLastDay": (number);
  "failedRunsLastDay": (number);
  "coverage": (PriceCoverage);
  "quota": (PriceQuota);
  "recentRuns": (Array<(PriceRun)>);
});

export type MarketFeed = ({
  "listingId": (OpaqueId);
  "yahoo": ("DISABLED" | "CONFIGURATION_REQUIRED" | "REVIEWED_MAPPING_REQUIRED" | "PRIVATE_DAILY") & (string);
  "officialFiles": ("UNVERIFIED") & (string);
  "streaming": ("UNVERIFIED") & (string);
  "latest": (((PrivateClose)) | ((null)));
  "latestJobId": (((OpaqueId)) | ((null)));
  "latestJobState": ((("QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIALLY_SUCCEEDED" | "FAILED" | "CANCELLED") & (string)) | ((null)));
  "failureCode": (((OpaqueId)) | ((null)));
  "lastAttemptAt": (((UtcInstant)) | ((null)));
  "acceptedRows": (((number)) | ((null)));
  "lastSuccessAt": (((UtcInstant)) | ((null)));
  "knownDelaySeconds": (null);
});

export type NonNegativeDecimalString = (string);

export type Notification = ({
  "activityId": (OpaqueId);
  "kind": ("PRICE_RULE" | "REVIEW_REMINDER" | "PORTFOLIO_BRIEF" | "VOLUME_RULE" | "ALLOCATION_RULE" | "COMPANY_EVENT" | "THESIS_REVIEW") & (string);
  "subjectId": (OpaqueId);
  "title": (string);
  "createdAt": (UtcInstant);
  "readAt": (((UtcInstant)) | ((null)));
});

export type NotificationAttempt = ({
  "channel": ("IN_APP" | "EMAIL_PREVIEW") & (string);
  "attempt": (number);
  "outcome": ("DELIVERED" | "SUPPRESSED" | "PREVIEWED" | "RETRY" | "FAILED") & (string);
  "attemptedAt": (UtcInstant);
});

export type NotificationDelivery = ({
  "channel": ("IN_APP" | "EMAIL_PREVIEW") & (string);
  "status": ("PENDING" | "DELIVERED" | "SUPPRESSED" | "PREVIEWED" | "FAILED") & (string);
  "attempts": (number);
  "nextAttemptAt": (UtcInstant);
  "completedAt": (((UtcInstant)) | ((null)));
  "failureCode": (((OpaqueId)) | ((null)));
});

export type NotificationDeliveryPage = ({
  "emailPreviewEnabled": (boolean);
  "items": (Array<({
  "activityId": (OpaqueId);
  "title": (string);
  "kind": ("PRICE_RULE" | "REVIEW_REMINDER" | "PORTFOLIO_BRIEF" | "VOLUME_RULE" | "ALLOCATION_RULE" | "COMPANY_EVENT" | "THESIS_REVIEW") & (string);
  "delivery": (NotificationDelivery);
})>);
});

export type NotificationDetail = ({
  "notification": (Notification);
  "price": (((PriceEvaluation)) | ((null)));
  "reminder": (((ReminderEvidence)) | ((null)));
  "indicator": (((IndicatorEvaluation)) | ((null)));
  "briefId": (((OpaqueId)) | ((null)));
  "companyEvent": (((CompanyEvent)) | ((null)));
  "thesisReview": (((ThesisReviewLink)) | ((null)));
  "deliveries": (Array<(NotificationDelivery)>);
  "attempts": (Array<(NotificationAttempt)>);
});

export type NotificationPage = ({
  "items": (Array<(Notification)>);
  "nextBefore": (((OpaqueId)) | ((null)));
});

export type NotificationRead = ({
  "read": (boolean);
});

export type OpaqueId = (string);

export type PeerRanking = ({
  "rankingId": (OpaqueId);
  "runId": (OpaqueId);
  "methodology": ("within-sector-midrank-v1");
  "sector": (DiscoverySector);
  "specification": (PeerRankingSpecification);
  "completePeers": (number);
  "rows": (Array<(PeerRankingRow)>);
  "createdAt": (UtcInstant);
});

export type PeerRankingContribution = ({
  "factor": (PeerRankingFactor);
  "reason": ("PERIOD_OPEN" | "FACT_MISSING" | "DIMENSIONS_MISMATCH" | "PUBLICATION_UNKNOWN" | "PUBLISHED_AFTER_CUTOFF" | "PERIOD_PUBLICATION_INVALID" | "SOURCE_REVISED" | "DERIVATION_REVIEW_REQUIRED" | "COMPARABLE_FACT") & (string);
  "fact": (((FinancialFact)) | ((null)));
  "percentile": (((DecimalString)) | ((null)));
  "points": (((DecimalString)) | ((null)));
  "relativeWeakness": (boolean);
});

export type PeerRankingFactor = ({
  "metric": (DiscoveryMetric);
  "direction": ("HIGHER" | "LOWER") & (string);
  "weight": (number);
});

export type PeerRankingIndex = ({
  "items": (Array<(PeerRankingSummary)>);
});

export type PeerRankingInput = ({
  "companyIds": (Array<(OpaqueId)>);
  "factors": (Array<(PeerRankingFactor)>);
  "requestId": (OpaqueId);
});

export type PeerRankingRow = ({
  "member": (DiscoveryMember);
  "rank": (((number)) | ((null)));
  "score": (((DecimalString)) | ((null)));
  "status": ("RANKED" | "MISSING_FACTOR" | "INSUFFICIENT_PEERS") & (string);
  "contributions": (Array<(PeerRankingContribution)>);
});

export type PeerRankingSpecification = ({
  "companyIds": (Array<(OpaqueId)>);
  "factors": (Array<(PeerRankingFactor)>);
});

export type PeerRankingSummary = ({
  "rankingId": (OpaqueId);
  "createdAt": (UtcInstant);
});

export type PerformanceFlow = ({
  "date": (SessionDate);
  "deposits": (NonNegativeDecimalString);
  "withdrawals": (NonNegativeDecimalString);
  "net": (DecimalString);
});

export type PerformanceSnapshotRef = ({
  "accountId": (OpaqueId);
  "snapshotId": (OpaqueId);
  "ledgerRevision": (number);
  "value": (DecimalString);
});

export type PerformanceValuation = ({
  "date": (SessionDate);
  "closingValue": (DecimalString);
  "snapshots": (Array<(PerformanceSnapshotRef)>);
});

export type PortfolioArchiveInput = ({
  "archived": (boolean);
  "revision": (number);
});

export type PortfolioBrief = ({
  "windowStart": (UtcInstant);
  "windowEnd": (UtcInstant);
  "timeZone": (string);
  "items": (Array<({
  "activityId": (OpaqueId);
  "kind": ("PRICE_RULE" | "REVIEW_REMINDER" | "PORTFOLIO_BRIEF" | "VOLUME_RULE" | "ALLOCATION_RULE" | "COMPANY_EVENT" | "THESIS_REVIEW") & (string);
  "title": (string);
  "createdAt": (UtcInstant);
})>);
  "snapshots": (Array<({
  "snapshotId": (OpaqueId);
  "portfolioId": (OpaqueId);
  "accountId": (OpaqueId);
  "accountName": (string);
  "sessionDate": (SessionDate);
  "holdingsValue": (((DecimalString)) | ((null)));
  "recordedValue": (((DecimalString)) | ((null)));
  "status": ("BEFORE_COVERAGE" | "PRICES_MISSING" | "CASH_UNKNOWN" | "RECORDED_VALUE") & (string);
})>);
  "companyEvents": (Array<(CompanyEvent)>);
  "truncated": (boolean);
});

export type PortfolioDetail = ({
  "portfolio": (PortfolioSummary);
  "accounts": (Array<(InvestmentAccount)>);
});

export type PortfolioHealth = ({
  "portfolioId": (OpaqueId);
  "asOf": (SessionDate);
  "priceSession": (((SessionDate)) | ((null)));
  "state": ("READY" | "NO_ACCOUNTS" | "PORTFOLIO_BUDGET" | "PRICES_MISSING" | "STALE_PRICES" | "MIXED_PRICE_SESSIONS") & (string);
  "currency": ("INR");
  "unpricedPositions": (number);
  "stalePositions": (number);
  "providerEstimates": (number);
  "equity": (((NonNegativeDecimalString)) | ((null)));
  "cash": (((NonNegativeDecimalString)) | ((null)));
  "largestWeight": (((NonNegativeDecimalString)) | ((null)));
  "topFiveWeight": (((NonNegativeDecimalString)) | ((null)));
  "holdings": (Array<(PortfolioHealthHolding)>);
  "sectors": (Array<(PortfolioHealthSector)>);
});

export type PortfolioHealthHolding = ({
  "securityId": (OpaqueId);
  "name": (string);
  "sector": ("BANKING" | "FINANCIAL_SERVICES" | "MANUFACTURING" | "TECHNOLOGY" | "CONSUMER" | "ENERGY" | "OTHER" | "UNCLASSIFIED") & (string);
  "value": (((NonNegativeDecimalString)) | ((null)));
  "equityWeight": (((NonNegativeDecimalString)) | ((null)));
  "unrealisedContribution": (((DecimalString)) | ((null)));
});

export type PortfolioHealthSector = ({
  "sector": ("BANKING" | "FINANCIAL_SERVICES" | "MANUFACTURING" | "TECHNOLOGY" | "CONSUMER" | "ENERGY" | "OTHER" | "UNCLASSIFIED") & (string);
  "value": (NonNegativeDecimalString);
  "equityWeight": (((NonNegativeDecimalString)) | ((null)));
});

export type PortfolioInput = ({
  "name": (string);
});

export type PortfolioList = ({
  "items": (Array<(PortfolioSummary)>);
});

export type PortfolioPerformance = ({
  "portfolioId": (OpaqueId);
  "start": (SessionDate);
  "end": (SessionDate);
  "currency": ("INR");
  "methodology": ("cash-flow-returns-v1");
  "coverage": ("HISTORY_UNREVIEWED" | "NO_ACCOUNTS" | "PORTFOLIO_BUDGET" | "CASH_HISTORY_INCOMPLETE" | "NEGATIVE_CASH_BALANCE" | "NEW_OPENING_BALANCE" | "ENDPOINT_VALUATIONS_MISSING" | "REVIEWED_WINDOW") & (string);
  "opening": (((PerformanceValuation)) | ((null)));
  "closing": (((PerformanceValuation)) | ((null)));
  "flowValuations": (Array<(PerformanceValuation)>);
  "externalFlows": (Array<(PerformanceFlow)>);
  "recordedDividends": (((NonNegativeDecimalString)) | ((null)));
  "investmentResult": (((DecimalString)) | ((null)));
  "xirr": (ReturnMeasure);
  "timeWeighted": (ReturnMeasure);
  "benchmark": ("NO_COMPATIBLE_BENCHMARK");
});

export type PortfolioPerformanceInput = ({
  "start": (SessionDate);
  "end": (SessionDate);
  "reviewed": (boolean);
});

export type PortfolioRisk = ({
  "portfolioId": (OpaqueId);
  "start": (SessionDate);
  "end": (SessionDate);
  "methodology": ("weekly-linked-risk-v1");
  "state": ("AVAILABLE" | "UNAVAILABLE") & (string);
  "reason": ("HISTORY_UNREVIEWED" | "NO_ACCOUNTS" | "PORTFOLIO_BUDGET" | "CASH_HISTORY_INCOMPLETE" | "NEGATIVE_CASH_BALANCE" | "NEW_OPENING_BALANCE" | "ENDPOINT_VALUATIONS_MISSING" | "REVIEWED_WINDOW" | "CALCULATED" | "WEEKLY_VALUATIONS_MISSING" | "FLOW_DAY_VALUATION_MISSING" | "NON_POSITIVE_BASE") & (string);
  "maxDrawdownPercent": (((NonNegativeDecimalString)) | ((null)));
  "annualizedVolatilityPercent": (((NonNegativeDecimalString)) | ((null)));
  "observations": (Array<(PortfolioRiskObservation)>);
});

export type PortfolioRiskObservation = ({
  "date": (SessionDate);
  "indexValue": (NonNegativeDecimalString);
});

export type PortfolioScenario = ({
  "listingId": (OpaqueId);
  "cashAllocation": (NonNegativeDecimalString);
  "shockPercent": (DecimalString);
  "portfolioId": (OpaqueId);
  "state": ("SIMULATED" | "NO_ACCOUNTS" | "PORTFOLIO_BUDGET" | "PRICES_MISSING" | "STALE_PRICES" | "MIXED_PRICE_SESSIONS" | "CASH_UNKNOWN" | "INSUFFICIENT_CASH" | "TARGET_NOT_HELD") & (string);
  "priceSession": (((SessionDate)) | ((null)));
  "targetName": (string);
  "beforeEquity": (((NonNegativeDecimalString)) | ((null)));
  "afterEquity": (((NonNegativeDecimalString)) | ((null)));
  "beforeCash": (((NonNegativeDecimalString)) | ((null)));
  "afterCash": (((NonNegativeDecimalString)) | ((null)));
  "beforeTotal": (((NonNegativeDecimalString)) | ((null)));
  "afterTotal": (((NonNegativeDecimalString)) | ((null)));
  "beforeTargetWeight": (((NonNegativeDecimalString)) | ((null)));
  "afterTargetWeight": (((NonNegativeDecimalString)) | ((null)));
  "valueChange": (((DecimalString)) | ((null)));
});

export type PortfolioScenarioInput = ({
  "listingId": (OpaqueId);
  "cashAllocation": (NonNegativeDecimalString);
  "shockPercent": (DecimalString);
});

export type PortfolioSummary = ({
  "portfolioId": (OpaqueId);
  "name": (string);
  "currency": ("INR");
  "archived": (boolean);
  "revision": (number);
});

export type PortfolioValuation = ({
  "portfolioId": (OpaqueId);
  "asOf": (SessionDate);
  "currency": ("INR") & (string);
  "accounts": (Array<(AccountValuationTotal)>);
  "totals": (ValuationTotals);
});

export type PositiveDecimalString = (string);

export type Preferences = ({
  "timeZone": (string);
  "currency": ("INR");
  "inAppNotifications": (boolean);
  "emailNotifications": (boolean);
  "revision": (number);
  "deliveryAvailable": (true);
});

export type PreferencesUpdate = ({
  "timeZone": (string);
  "currency": ("INR");
  "inAppNotifications": (boolean);
  "emailNotifications": (boolean);
  "revision": (number);
});

export type PriceBasis = ({
  "ohlcPrice": (AdjustmentBasis);
  "adjustedClose": (((AdjustmentBasis)) | ((null)));
  "volume": ("AS_REPORTED" | "SPLIT_ADJUSTED" | "PROVIDER_DEFINED" | "UNKNOWN") & (string);
  "adjustmentAsOf": (((SessionDate)) | ((null)));
});

export type PriceCoverage = ({
  "trackedListings": (number);
  "withClose": (number);
  "recentClose": (number);
});

export type PriceEvaluation = ({
  "evaluationId": (OpaqueId);
  "revision": (number);
  "sessionDate": (SessionDate);
  "outcome": ("TRIGGERED" | "BELOW_OR_ABOVE_RESET" | "NO_MATCH" | "INSUFFICIENT_HISTORY" | "COOLDOWN" | "ALREADY_LATCHED") & (string);
  "evaluatedAt": (UtcInstant);
  "observation": (((AlertCloseEvidence)) | ((null)));
  "previous": (((AlertCloseEvidence)) | ((null)));
});

export type PriceEvaluationReport = ({
  "status": ("PAUSED" | "EXPIRED" | "WAITING_FOR_PRICE" | "STALE" | "EVALUATED" | "INSUFFICIENT_HISTORY") & (string);
  "items": (Array<(PriceEvaluation)>);
});

export type PriceFetchQueued = ({
  "jobId": (OpaqueId);
  "start": (SessionDate);
  "endExclusive": (SessionDate);
});

export type PriceFetchWindow = ({
  "start": (SessionDate);
  "endExclusive": (SessionDate);
});

export type PriceObservation = ({
  "observationId": (OpaqueId);
  "listing": (ListingIdentity);
  "sessionDate": (SessionDate);
  "interval": ("ONE_DAY") & (string);
  "open": (((PositiveDecimalString)) | ((null)));
  "high": (((PositiveDecimalString)) | ((null)));
  "low": (((PositiveDecimalString)) | ((null)));
  "close": (PositiveDecimalString);
  "adjustedClose": (((PositiveDecimalString)) | ((null)));
  "volume": (((IntegerString)) | ((null)));
  "turnover": (((NonNegativeDecimalString)) | ((null)));
  "basis": (PriceBasis);
  "finality": ("FINAL" | "PROVISIONAL" | "UNKNOWN") & (string);
  "provenance": (Provenance);
});

export type PriceQuota = ({
  "requestsLastHour": (number);
  "hourlyLimit": (number);
  "remaining": (number);
  "pending": (number);
  "pendingLimit": (number);
  "status": ("AVAILABLE" | "HOURLY_LIMIT_REACHED" | "PENDING_LIMIT_REACHED") & (string);
});

export type PriceRule = ({
  "ruleId": (OpaqueId);
  "revision": (number);
  "settings": (PriceRuleSettings);
  "exchange": ("NSE" | "BSE") & (string);
  "symbol": (string);
  "createdAt": (UtcInstant);
});

export type PriceRuleEdit = ({
  "expectedRevision": (number);
  "settings": (PriceRuleSettings);
});

export type PriceRuleList = ({
  "items": (Array<(PriceRule)>);
});

export type PriceRuleSettings = ({
  "listingId": (OpaqueId);
  "name": (string);
  "source": ("MANUAL_REVIEWED" | "YAHOO_YFINANCE") & (string);
  "comparison": ("ABOVE" | "BELOW" | "CROSS_ABOVE" | "CROSS_BELOW" | "MOVE_UP" | "MOVE_DOWN") & (string);
  "threshold": (PositiveDecimalString);
  "maxAgeDays": (number);
  "cooldownMinutes": (number);
  "rearm": (boolean);
  "enabled": (boolean);
  "expiresOn": (((SessionDate)) | ((null)));
});

export type PriceRun = ({
  "jobId": (OpaqueId);
  "listingId": (OpaqueId);
  "symbol": (string);
  "exchange": ("NSE" | "BSE") & (string);
  "state": ("QUEUED" | "RUNNING" | "SUCCEEDED" | "PARTIALLY_SUCCEEDED" | "FAILED" | "CANCELLED") & (string);
  "failureCode": (((OpaqueId)) | ((null)));
  "updatedAt": (UtcInstant);
  "rowsReturned": (((number)) | ((null)));
});

export type PrivateClose = ({
  "observationId": (OpaqueId);
  "listingId": (OpaqueId);
  "sessionDate": (SessionDate);
  "source": ("MANUAL_REVIEWED" | "YAHOO_YFINANCE") & (string);
  "priceBasis": ("AS_REPORTED_EXCHANGE" | "PROVIDER_DEFINED") & (string);
  "currency": ("INR") & (string);
  "close": (PositiveDecimalString);
  "sourceReference": (string);
  "receivedAt": (UtcInstant);
  "freshness": ("STALE" | "DELAY_UNKNOWN") & (string);
});

export type PrivateCloseHistory = ({
  "listingId": (OpaqueId);
  "start": (SessionDate);
  "endExclusive": (SessionDate);
  "observations": (Array<(PrivateClose)>);
});

export type Problem = ({
  "type": (string);
  "title": (string);
  "status": (number);
  "detail": (string);
  "instance": (string);
  "code": ("MALFORMED_REQUEST" | "VALIDATION_FAILED" | "AUTHENTICATION_REQUIRED" | "RESOURCE_NOT_FOUND" | "OPERATION_FORBIDDEN" | "CONFLICT" | "RATE_LIMITED" | "DATA_SOURCE_UNAVAILABLE" | "INTERNAL_ERROR") & (string);
  "traceId": (OpaqueId);
  "errors"?: (Array<(ProblemField)>);
});

export type ProblemField = ({
  "field": (string);
  "code": (OpaqueId);
});

export type Provenance = ({
  "provider": (Provider);
  "providerInstrumentId": (string);
  "mappingVersion": (OpaqueId);
  "adapterVersion": (string);
  "sourceName": (string);
  "sourceLocator": (((string)) | ((null)));
  "artifactSha256": (((string)) | ((null)));
  "sourceRevision": (OpaqueId);
  "parserVersion": (string);
  "sourceTimezone": ("Asia/Kolkata") & (string);
  "times": (SourceTimes);
  "delay": (Delay);
  "rights": (Rights);
  "quality": ("VALIDATED" | "REVIEW_REQUIRED") & (string);
  "qualityFlags": (Array<(OpaqueId)>);
});

export type Provider = ("SYNTHETIC" | "YAHOO_YFINANCE" | "NSE_EOD_FILE" | "BSE_EOD_FILE") & (string);

export type ProviderCapabilities = ({
  "contractVersion": (ContractVersion);
  "provider": (Provider);
  "adapterVersion": (string);
  "evaluatedAt": (UtcInstant);
  "capabilities": (Array<(Capability)>);
  "rights": (Rights);
});

export type ProviderStatus = ({
  "provider": (Provider);
  "health": ("HEALTHY" | "DEGRADED" | "UNAVAILABLE" | "UNTESTED") & (string);
  "checkedAt": (UtcInstant);
  "lastSuccessfulAcquisitionAt": (((UtcInstant)) | ((null)));
  "reasonCode": (OpaqueId);
  "capabilities": (ProviderCapabilities);
});

export type ProviderStatusPage = ({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "items": (Array<(ProviderStatus)>);
});

export type QuoteResponse = ((({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "listing": (ListingIdentity);
  "freshness": (Freshness);
  "selectionReason": (OpaqueId);
  "warnings": (Array<(Warning)>);
  "availability": ("AVAILABLE") & (string);
  "observation": (PriceObservation);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "listing": (ListingIdentity);
  "freshness": (Freshness);
  "selectionReason": (OpaqueId);
  "warnings": (Array<(Warning)>);
  "availability": ("NOT_YET_PUBLISHED" | "NO_TRADE" | "NOT_COVERED" | "TEMPORARILY_UNAVAILABLE" | "INVALID_DATA" | "UNKNOWN") & (string);
  "observation": (null);
})));

export type ReminderEdit = ({
  "expectedRevision": (number);
  "settings": (ReminderSettings);
});

export type ReminderEvidence = ({
  "revision": (number);
  "dueAt": (UtcInstant);
  "deliverAt": (UtcInstant);
});

export type ReminderList = ({
  "items": (Array<(ReviewReminder)>);
});

export type ReminderScheduleChange = ({
  "expectedRevision": (number);
  "snoozeUntil": (((string)) | ((null)));
});

export type ReminderSettings = ({
  "title": (string);
  "scheduledLocal": (string);
  "timeZone": (string);
  "recurrence": ("ONCE" | "DAILY" | "WEEKLY") & (string);
  "quietStart": (((string)) | ((null)));
  "quietEnd": (((string)) | ((null)));
});

export type ReportedFactInput = ({
  "dimensions": (FinancialDimensions);
  "anchorId": (OpaqueId);
  "amount": (DecimalString);
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "reviewed": (true);
});

export type ResearchExtraction = ({
  "state": ("LINK_ONLY" | "NOT_STARTED" | "QUEUED" | "RUNNING" | "READY" | "PARTIAL" | "NO_TEXT" | "UNSUPPORTED" | "FAILED" | "CANCELLED") & (string);
  "reason": (((OpaqueId)) | ((null)));
  "jobId": (((OpaqueId)) | ((null)));
  "canRequest": (boolean);
  "totalPages": (number);
  "pages": (Array<({
  "page": (number);
  "state": ("TEXT" | "TRUNCATED" | "NO_TEXT" | "UNREADABLE") & (string);
})>);
});

export type ResearchLocation = ({
  "anchorId": (OpaqueId);
  "companyId": (OpaqueId);
  "documentId": (OpaqueId);
  "documentRevision": (number);
  "sourceTitle": (string);
  "sourceName": (string);
  "publishedAt": (((UtcInstant)) | ((null)));
  "page": (number);
  "lineStart": (number);
  "lineEnd": (number);
  "kind": ("PASSAGE" | "TABLE_ROW") & (string);
  "quote": (string);
  "cells": (Array<(string)>);
});

export type ResearchLocations = ({
  "items": (Array<(ResearchLocation)>);
  "hasMore": (boolean);
});

export type ResearchPdfDiscard = ({
  "fileId": (OpaqueId);
  "discarded": (true);
});

export type ResearchPdfUpload = ({
  "fileId": (OpaqueId);
  "checksum": (string);
});

export type ResearchReport = ({
  "reportId": (OpaqueId);
  "companyId": (OpaqueId);
  "question": (string);
  "asOf": (UtcInstant);
  "state": ("PENDING" | "EVIDENCE" | "INSUFFICIENT" | "CONFLICTING_CONTEXT" | "LOCAL_RANKED" | "MODEL_FALLBACK") & (string);
  "modelName": (((string)) | ((null)));
  "policyVersion": (string);
  "version": (number);
  "previousReportId": (((OpaqueId)) | ((null)));
  "current": (boolean);
  "citations": (Array<(ResearchLocation)>);
  "facts": (Array<(FinancialFact)>);
  "feedback": (((ResearchReportFeedback)) | ((null)));
});

export type ResearchReportCapabilities = ({
  "localRanking": (boolean);
});

export type ResearchReportFeedback = ({
  "note": (string);
  "anchorId": (((OpaqueId)) | ((null)));
  "recordedAt": (UtcInstant);
});

export type ResearchReportFeedbackInput = ({
  "note": (string);
  "anchorId": (((OpaqueId)) | ((null)));
});

export type ResearchReportHistory = ({
  "items": (Array<(ResearchReportSummary)>);
  "hasMore": (boolean);
});

export type ResearchReportInput = ({
  "question": (string);
  "rankLocally": (boolean);
});

export type ResearchReportSummary = ({
  "reportId": (OpaqueId);
  "question": (string);
  "asOf": (UtcInstant);
  "version": (number);
});

export type ResearchSearchResult = ({
  "documents": (Array<(CompanySource)>);
  "passages": (Array<(ResearchLocation)>);
  "moreDocuments": (boolean);
  "morePassages": (boolean);
});

export type ResearchTextPage = ({
  "page": (number);
  "state": ("TEXT" | "TRUNCATED" | "NO_TEXT" | "UNREADABLE") & (string);
  "content": (string);
});

export type ReturnMeasure = ({
  "state": ("AVAILABLE" | "UNAVAILABLE") & (string);
  "reason": ("HISTORY_UNREVIEWED" | "NO_ACCOUNTS" | "PORTFOLIO_BUDGET" | "CASH_HISTORY_INCOMPLETE" | "NEGATIVE_CASH_BALANCE" | "NEW_OPENING_BALANCE" | "ENDPOINT_VALUATIONS_MISSING" | "REVIEWED_WINDOW" | "CALCULATED" | "FLOW_DAY_VALUATION_MISSING" | "NON_POSITIVE_BASE" | "CASH_FLOW_SIGNS" | "AMBIGUOUS_CASH_FLOWS" | "OUTSIDE_SOLVER_RANGE") & (string);
  "percent": (((DecimalString)) | ((null)));
});

export type ReviewCloseInput = ({
  "sessionDate": (SessionDate);
  "close": (PositiveDecimalString);
  "sourceReference": (string);
  "reviewed": (true) & (boolean);
});

export type ReviewReminder = ({
  "reminderId": (OpaqueId);
  "revision": (number);
  "state": ("ACTIVE" | "CANCELLED" | "COMPLETED") & (string);
  "settings": (ReminderSettings);
  "nextAt": (((UtcInstant)) | ((null)));
});

export type Rights = ((({
  "policyId": (OpaqueId);
  "reviewedAt": (((UtcInstant)) | ((null)));
  "retentionUntil": (((UtcInstant)) | ((null)));
  "attribution": (((string)) | ((null)));
  "mode": ("SYNTHETIC_PUBLIC_DEMO") & (string);
  "reviewStatus": ("VERIFIED") & (string);
  "publicDisplayAllowed": (true) & (boolean);
  "externalAiAllowed": (false) & (boolean);
})) | (({
  "policyId": (OpaqueId);
  "reviewedAt": (((UtcInstant)) | ((null)));
  "retentionUntil": (((UtcInstant)) | ((null)));
  "attribution": (((string)) | ((null)));
  "mode": ("PRIVATE_PERSONAL") & (string);
  "reviewStatus": ("VERIFIED") & (string);
  "publicDisplayAllowed": (false) & (boolean);
  "externalAiAllowed": (false) & (boolean);
})) | (({
  "policyId": (OpaqueId);
  "reviewedAt": (((UtcInstant)) | ((null)));
  "retentionUntil": (((UtcInstant)) | ((null)));
  "attribution": (((string)) | ((null)));
  "mode": ("RESTRICTED_UNVERIFIED") & (string);
  "reviewStatus": ("UNVERIFIED") & (string);
  "publicDisplayAllowed": (false) & (boolean);
  "externalAiAllowed": (false) & (boolean);
})));

export type SecurityInput = ({
  "companyId": (OpaqueId);
  "name": (string);
  "isin": (((string)) | ((null)));
  "confirmed": (true);
});

export type SessionDate = (string);

export type SessionResponse = ((({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "authenticated": (true);
  "user": (UserProfile);
  "csrf": (CsrfInformation);
})) | (({
  "contractVersion": (ContractVersion);
  "requestId": (OpaqueId);
  "authenticated": (false);
  "user": (null);
  "csrf": (CsrfInformation);
})));

export type SourceTimes = ({
  "observedAt": (((UtcInstant)) | ((null)));
  "publishedAt": (((UtcInstant)) | ((null)));
  "providerAvailableAt": (((UtcInstant)) | ((null)));
  "firstSeenAt": (UtcInstant);
  "ingestedAt": (((UtcInstant)) | ((null)));
  "acceptedAt": (((UtcInstant)) | ((null)));
  "unknownTimeReasons": (Array<("OBSERVATION_TIME_NOT_PROVIDED" | "PUBLICATION_TIME_NOT_PROVIDED" | "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED" | "NOT_YET_INGESTED" | "NOT_YET_ACCEPTED") & (string)>);
});

export type StagedResearchPdf = ({
  "fileId": (OpaqueId);
  "checksum": (string);
  "stagedAt": (UtcInstant);
});

export type StagedResearchPdfs = ({
  "items": (Array<(StagedResearchPdf)>);
});

export type StockLookupOpened = ({
  "listing": (CatalogueListing);
  "refreshStatus": ("QUEUED" | "RECENT" | "UNAVAILABLE") & (string);
});

export type StockLookupResults = ({
  "items": (Array<(StockSuggestion)>);
  "status": ("READY" | "UNAVAILABLE") & (string);
});

export type StockLookupSelection = ({
  "exchange": ("NSE" | "BSE") & (string);
  "symbol": (string);
});

export type StockScreen = ({
  "screenId": (OpaqueId);
  "revision": (number);
  "definition": (StockScreenInput);
  "savedAt": (UtcInstant);
});

export type StockScreenCheck = ({
  "filter": (StockScreenFilter);
  "state": ("PASS" | "FAIL" | "UNKNOWN") & (string);
  "reason": ("PERIOD_OPEN" | "FACT_MISSING" | "DIMENSIONS_MISMATCH" | "PUBLICATION_UNKNOWN" | "PUBLISHED_AFTER_CUTOFF" | "PERIOD_PUBLICATION_INVALID" | "SOURCE_REVISED" | "DERIVATION_REVIEW_REQUIRED" | "COMPARABLE_FACT") & (string);
  "fact": (((FinancialFact)) | ((null)));
});

export type StockScreenEdit = ({
  "expectedRevision": (number);
  "screen": (StockScreenInput);
});

export type StockScreenFilter = ({
  "metric": (DiscoveryMetric);
  "comparator": ("GTE" | "LTE") & (string);
  "amount": (DecimalString);
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
});

export type StockScreenHistory = ({
  "items": (Array<(StockScreenRunSummary)>);
});

export type StockScreenIndex = ({
  "items": (Array<(StockScreen)>);
});

export type StockScreenInput = ({
  "name": (string);
  "sector": (DiscoverySector);
  "period": (DiscoveryPeriod);
  "filters": (Array<(StockScreenFilter)>);
});

export type StockScreenResult = ({
  "member": (DiscoveryMember);
  "state": ("MATCH" | "EXCLUDED" | "UNKNOWN" | "OUTSIDE_SECTOR") & (string);
  "checks": (Array<(StockScreenCheck)>);
});

export type StockScreenRun = ({
  "runId": (OpaqueId);
  "screen": (StockScreen);
  "methodology": ("absolute-thresholds-v1");
  "inputs": (DiscoverySnapshot);
  "results": (Array<(StockScreenResult)>);
  "createdAt": (UtcInstant);
});

export type StockScreenRunInput = ({
  "revision": (number);
  "requestId": (OpaqueId);
});

export type StockScreenRunSummary = ({
  "runId": (OpaqueId);
  "revision": (number);
  "createdAt": (UtcInstant);
});

export type StockSuggestion = ({
  "exchange": ("NSE" | "BSE") & (string);
  "symbol": (string);
  "name": (string);
  "series": (string);
  "isin": (((string)) | ((null)));
  "validFrom": (SessionDate);
  "source": ("NSE_DIRECTORY" | "YAHOO_DISCOVERY") & (string);
});

export type SymbolHistory = ({
  "symbol": (string);
  "validFrom": (SessionDate);
  "validTo": (((SessionDate)) | ((null)));
  "source": ("MANUAL_USER" | "NSE_DIRECTORY" | "YAHOO_DISCOVERY") & (string);
});

export type SymbolHistoryList = (Array<(SymbolHistory)>);

export type SymbolInput = ({
  "symbol": (string);
  "providerSymbol": (((string)) | ((null)));
  "effectiveDate": (SessionDate);
  "confirmed": (true);
});

export type ThesisCondition = ({
  "definition": (ThesisConditionDefinition);
  "lastCheck": (((ThesisConditionCheck)) | ((null)));
});

export type ThesisConditionCheck = ({
  "checkId": (OpaqueId);
  "thesisRevision": (number);
  "state": ("MATCHED" | "VIOLATED" | "UNKNOWN" | "REVIEW_NEEDED") & (string);
  "reason": ("PERIOD_OPEN" | "FACT_MISSING" | "DIMENSIONS_MISMATCH" | "PUBLICATION_UNKNOWN" | "PUBLISHED_AFTER_CUTOFF" | "PERIOD_PUBLICATION_INVALID" | "SOURCE_REVISED" | "DERIVATION_REVIEW_REQUIRED" | "COMPARABLE_FACT") & (string);
  "fact": (((FinancialFact)) | ((null)));
  "evaluatedAt": (UtcInstant);
});

export type ThesisConditionDefinition = ({
  "label": (string);
  "dimensions": (FinancialDimensions);
  "comparator": ("GTE" | "LTE") & (string);
  "threshold": (DecimalString);
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "conditionId": (OpaqueId);
  "thesisRevision": (number);
  "retired": (boolean);
});

export type ThesisConditionInput = ({
  "label": (string);
  "dimensions": (FinancialDimensions);
  "comparator": ("GTE" | "LTE") & (string);
  "threshold": (DecimalString);
  "scale": ("ONES" | "THOUSAND" | "LAKH" | "MILLION" | "CRORE" | "BILLION") & (string);
  "expectedRevision": (number);
});

export type ThesisConditions = ({
  "items": (Array<(ThesisCondition)>);
});

export type ThesisReview = ({
  "reviewId": (OpaqueId);
  "thesis": (InvestmentThesis);
  "event": (CompanyEvent);
  "relation": ("CONTEXT" | "SUPPORTS" | "CHALLENGES") & (string);
  "anchorId": (((OpaqueId)) | ((null)));
  "condition": (((ThesisConditionCheck)) | ((null)));
  "guidance": (((ThesisReviewGuidance)) | ((null)));
  "decision": (((ThesisReviewDecision)) | ((null)));
  "createdAt": (UtcInstant);
});

export type ThesisReviewDecision = ({
  "action": ("REAFFIRM" | "REVISE" | "PAUSE" | "CLOSE" | "DISMISS") & (string);
  "note": (string);
  "anchorId": (((OpaqueId)) | ((null)));
  "decidedAt": (UtcInstant);
});

export type ThesisReviewDecisionInput = ({
  "action": ("REAFFIRM" | "REVISE" | "PAUSE" | "CLOSE" | "DISMISS") & (string);
  "note": (string);
  "anchorId": (((OpaqueId)) | ((null)));
});

export type ThesisReviewGuidance = ({
  "statement": (ManagementGuidance);
  "outcome": (GuidanceDelivery);
});

export type ThesisReviewGuidanceRef = ({
  "id": (OpaqueId);
  "revision": (number);
});

export type ThesisReviewIndex = ({
  "suggestions": (Array<(CompanyEvent)>);
  "items": (Array<(ThesisReviewSummary)>);
  "hasMore": (boolean);
});

export type ThesisReviewInput = ({
  "expectedRevision": (number);
  "eventVersionId": (OpaqueId);
  "relation": ("CONTEXT" | "SUPPORTS" | "CHALLENGES") & (string);
  "anchorId": (((OpaqueId)) | ((null)));
  "conditionCheckId": (((OpaqueId)) | ((null)));
  "guidance": (((ThesisReviewGuidanceRef)) | ((null)));
});

export type ThesisReviewLink = ({
  "companyId": (OpaqueId);
  "thesisId": (OpaqueId);
  "reviewId": (OpaqueId);
});

export type ThesisReviewSchedule = ({
  "scheduledLocal": (string);
  "timeZone": (string);
});

export type ThesisReviewSummary = ({
  "reviewId": (OpaqueId);
  "thesisRevision": (number);
  "eventTitle": (string);
  "createdAt": (UtcInstant);
  "decided": (boolean);
});

export type UserProfile = ({
  "userId": (OpaqueId);
  "displayName": (string);
});

export type UtcInstant = (string);

export type ValuationListing = ({
  "securityId": (OpaqueId);
  "listingId": (((OpaqueId)) | ((null)));
  "allowProviderEstimate": (boolean);
});

export type ValuationPoint = ({
  "snapshotId": (OpaqueId);
  "sessionDate": (SessionDate);
  "ledgerRevision": (number);
  "calculationVersion": (OpaqueId);
  "priceBasis": ("AS_REPORTED_EXCHANGE") & (string);
  "status": ("BEFORE_COVERAGE" | "PRICES_MISSING" | "CASH_UNKNOWN" | "RECORDED_VALUE") & (string);
  "holdingsValue": (((DecimalString)) | ((null)));
  "cashBalance": (((DecimalString)) | ((null)));
  "recordedValue": (((DecimalString)) | ((null)));
  "recordedAt": (UtcInstant);
});

export type ValuationSeries = ({
  "start": (SessionDate);
  "endExclusive": (SessionDate);
  "points": (Array<(ValuationPoint)>);
});

export type ValuationSnapshotDetail = ({
  "snapshot": (ValuationPoint);
  "valuation": (((AccountValuation)) | ((null)));
});

export type ValuationTotals = ({
  "positions": (number);
  "priced": (number);
  "stalePrices": (number);
  "providerEstimates": (number);
  "knownHoldingsValue": (((DecimalString)) | ((null)));
  "holdingsValue": (((DecimalString)) | ((null)));
  "knownUnrealisedPnl": (((DecimalString)) | ((null)));
  "unrealisedPnl": (((DecimalString)) | ((null)));
  "cashBalance": (((DecimalString)) | ((null)));
  "portfolioValue": (((DecimalString)) | ((null)));
  "realisedPnl": (((DecimalString)) | ((null)));
  "recordedFees": (((DecimalString)) | ((null)));
  "recordedDividends": (((DecimalString)) | ((null)));
  "netContributions": (((DecimalString)) | ((null)));
  "recordedFeesComplete": (boolean);
});

export type ValuedHolding = ({
  "securityId": (OpaqueId);
  "securityName": (string);
  "quantity": (PositiveDecimalString);
  "recordedCost": (((DecimalString)) | ((null)));
  "listingId": (((OpaqueId)) | ((null)));
  "allowProviderEstimate": (boolean);
  "observation": (((PrivateClose)) | ((null)));
  "value": (((DecimalString)) | ((null)));
  "unrealisedPnl": (((DecimalString)) | ((null)));
  "priceStatus": ("LISTING_REQUIRED" | "PRICE_UNAVAILABLE" | "STALE" | "DELAY_UNKNOWN") & (string);
});

export type Warning = ({
  "code": (OpaqueId);
  "message": (string);
});

export type WatchlistDetail = ({
  "watchlist": (WatchlistSummary);
  "items": (Array<(WatchlistItem)>);
});

export type WatchlistIndex = ({
  "items": (Array<(WatchlistSummary)>);
});

export type WatchlistItem = ({
  "listingId": (OpaqueId);
  "securityId": (OpaqueId);
  "securityName": (string);
  "exchange": ("NSE" | "BSE") & (string);
  "symbol": (string);
  "latest": (((PrivateClose)) | ((null)));
});

export type WatchlistName = ({
  "name": (string);
});

export type WatchlistSummary = ({
  "watchlistId": (OpaqueId);
  "name": (string);
});

export type WatchlistTrack = ({
  "listingId": (OpaqueId);
  "tracked": (boolean);
});

export interface ContractTypes {
  AccountInput: AccountInput;
  AccountValuation: AccountValuation;
  AccountValuationTotal: AccountValuationTotal;
  AcquisitionEnvelope: AcquisitionEnvelope;
  AdjustmentBasis: AdjustmentBasis;
  AlertCloseEvidence: AlertCloseEvidence;
  AnnouncedEventDate: AnnouncedEventDate;
  AsyncJobStatus: AsyncJobStatus;
  AttentionFeedback: AttentionFeedback;
  AttentionItem: AttentionItem;
  AttentionPage: AttentionPage;
  AttentionState: AttentionState;
  BriefIndex: BriefIndex;
  BriefSchedule: BriefSchedule;
  BriefScheduleInput: BriefScheduleInput;
  BriefSettings: BriefSettings;
  Capability: Capability;
  CatalogueCompanies: CatalogueCompanies;
  CatalogueCompany: CatalogueCompany;
  CatalogueListing: CatalogueListing;
  CatalogueSecurity: CatalogueSecurity;
  CatalogueSecurityDetail: CatalogueSecurityDetail;
  CatalogueSecurityPage: CatalogueSecurityPage;
  ChartRange: ChartRange;
  CompanyCalendarPage: CompanyCalendarPage;
  CompanyEvent: CompanyEvent;
  CompanyEventHistory: CompanyEventHistory;
  CompanyEventInput: CompanyEventInput;
  CompanyEventPage: CompanyEventPage;
  CompanyInput: CompanyInput;
  CompanyNewsCluster: CompanyNewsCluster;
  CompanyNewsInput: CompanyNewsInput;
  CompanyNewsPage: CompanyNewsPage;
  CompanyResearchNote: CompanyResearchNote;
  CompanyResearchNoteInput: CompanyResearchNoteInput;
  CompanyResearchOverview: CompanyResearchOverview;
  CompanyResearchResolution: CompanyResearchResolution;
  CompanySource: CompanySource;
  CompanySourceDetail: CompanySourceDetail;
  CompanySourceEdit: CompanySourceEdit;
  CompanySourceInput: CompanySourceInput;
  CompanySourcePage: CompanySourcePage;
  CompanySourceVersions: CompanySourceVersions;
  ContractVersion: ContractVersion;
  CorporateActionApproval: CorporateActionApproval;
  CorporateActionEffect: CorporateActionEffect;
  CorporateActionInput: CorporateActionInput;
  CorporateActionList: CorporateActionList;
  CorporateActionRecord: CorporateActionRecord;
  CsrfInformation: CsrfInformation;
  DecimalString: DecimalString;
  Delay: Delay;
  DeriveFinancialFact: DeriveFinancialFact;
  DiscoveryCompany: DiscoveryCompany;
  DiscoveryDirectory: DiscoveryDirectory;
  DiscoveryMember: DiscoveryMember;
  DiscoveryMemberInput: DiscoveryMemberInput;
  DiscoveryMetric: DiscoveryMetric;
  DiscoveryMetricSupport: DiscoveryMetricSupport;
  DiscoveryPeriod: DiscoveryPeriod;
  DiscoveryReading: DiscoveryReading;
  DiscoverySector: DiscoverySector;
  DiscoverySnapshot: DiscoverySnapshot;
  EventReplay: EventReplay;
  EventSuggestion: EventSuggestion;
  ExchangeSession: ExchangeSession;
  FilingRule: FilingRule;
  FilingRuleChange: FilingRuleChange;
  FilingRuleList: FilingRuleList;
  FilingRuleSettings: FilingRuleSettings;
  FinancialComparison: FinancialComparison;
  FinancialDimensions: FinancialDimensions;
  FinancialFact: FinancialFact;
  FinancialFactEdit: FinancialFactEdit;
  FinancialFactHistory: FinancialFactHistory;
  FinancialFactPage: FinancialFactPage;
  FinancialOperand: FinancialOperand;
  Freshness: Freshness;
  GeminiCapability: GeminiCapability;
  GeminiInput: GeminiInput;
  GeminiListings: GeminiListings;
  GeminiPreset: GeminiPreset;
  GeminiReport: GeminiReport;
  GuidanceCandidates: GuidanceCandidates;
  GuidanceDelivery: GuidanceDelivery;
  HistoryCoverage: HistoryCoverage;
  HistoryResponse: HistoryResponse;
  HoldingsAcceptanceInput: HoldingsAcceptanceInput;
  HoldingsAcceptanceReceipt: HoldingsAcceptanceReceipt;
  HoldingsComparison: HoldingsComparison;
  HoldingsImportList: HoldingsImportList;
  HoldingsImportSummary: HoldingsImportSummary;
  HoldingsPreviewMetadata: HoldingsPreviewMetadata;
  HoldingsPreviewPage: HoldingsPreviewPage;
  HoldingsPreviewRow: HoldingsPreviewRow;
  HoldingsReconciliation: HoldingsReconciliation;
  HoldingsReconciliationInput: HoldingsReconciliationInput;
  HoldingsReconciliationReceipt: HoldingsReconciliationReceipt;
  HoldingsReconciliationRow: HoldingsReconciliationRow;
  HoldingsReviewPlan: HoldingsReviewPlan;
  HoldingsRowIssue: HoldingsRowIssue;
  HoldingsSourceRow: HoldingsSourceRow;
  HoldingsTotals: HoldingsTotals;
  ImportTicket: ImportTicket;
  IndicatorCreate: IndicatorCreate;
  IndicatorEdit: IndicatorEdit;
  IndicatorEvaluation: IndicatorEvaluation;
  IndicatorEvaluations: IndicatorEvaluations;
  IndicatorList: IndicatorList;
  IndicatorRule: IndicatorRule;
  InstrumentPage: InstrumentPage;
  InstrumentResult: InstrumentResult;
  IntegerString: IntegerString;
  InvestmentAccount: InvestmentAccount;
  InvestmentTheses: InvestmentTheses;
  InvestmentThesis: InvestmentThesis;
  InvestmentThesisEdit: InvestmentThesisEdit;
  InvestmentThesisInput: InvestmentThesisInput;
  LedgerCorrectInput: LedgerCorrectInput;
  LedgerEntryInput: LedgerEntryInput;
  LedgerEventView: LedgerEventView;
  LedgerExportInput: LedgerExportInput;
  LedgerPage: LedgerPage;
  LedgerPosition: LedgerPosition;
  LedgerReceipt: LedgerReceipt;
  LedgerRecordInput: LedgerRecordInput;
  LedgerReverseInput: LedgerReverseInput;
  LedgerView: LedgerView;
  ListingIdentity: ListingIdentity;
  ListingInput: ListingInput;
  ManagementGuidance: ManagementGuidance;
  ManagementGuidanceEdit: ManagementGuidanceEdit;
  ManagementGuidanceInput: ManagementGuidanceInput;
  ManagementGuidanceList: ManagementGuidanceList;
  MarketChart: MarketChart;
  MarketDiagnostics: MarketDiagnostics;
  MarketFeed: MarketFeed;
  NonNegativeDecimalString: NonNegativeDecimalString;
  Notification: Notification;
  NotificationAttempt: NotificationAttempt;
  NotificationDelivery: NotificationDelivery;
  NotificationDeliveryPage: NotificationDeliveryPage;
  NotificationDetail: NotificationDetail;
  NotificationPage: NotificationPage;
  NotificationRead: NotificationRead;
  OpaqueId: OpaqueId;
  PeerRanking: PeerRanking;
  PeerRankingContribution: PeerRankingContribution;
  PeerRankingFactor: PeerRankingFactor;
  PeerRankingIndex: PeerRankingIndex;
  PeerRankingInput: PeerRankingInput;
  PeerRankingRow: PeerRankingRow;
  PeerRankingSpecification: PeerRankingSpecification;
  PeerRankingSummary: PeerRankingSummary;
  PerformanceFlow: PerformanceFlow;
  PerformanceSnapshotRef: PerformanceSnapshotRef;
  PerformanceValuation: PerformanceValuation;
  PortfolioArchiveInput: PortfolioArchiveInput;
  PortfolioBrief: PortfolioBrief;
  PortfolioDetail: PortfolioDetail;
  PortfolioHealth: PortfolioHealth;
  PortfolioHealthHolding: PortfolioHealthHolding;
  PortfolioHealthSector: PortfolioHealthSector;
  PortfolioInput: PortfolioInput;
  PortfolioList: PortfolioList;
  PortfolioPerformance: PortfolioPerformance;
  PortfolioPerformanceInput: PortfolioPerformanceInput;
  PortfolioRisk: PortfolioRisk;
  PortfolioRiskObservation: PortfolioRiskObservation;
  PortfolioScenario: PortfolioScenario;
  PortfolioScenarioInput: PortfolioScenarioInput;
  PortfolioSummary: PortfolioSummary;
  PortfolioValuation: PortfolioValuation;
  PositiveDecimalString: PositiveDecimalString;
  Preferences: Preferences;
  PreferencesUpdate: PreferencesUpdate;
  PriceBasis: PriceBasis;
  PriceCoverage: PriceCoverage;
  PriceEvaluation: PriceEvaluation;
  PriceEvaluationReport: PriceEvaluationReport;
  PriceFetchQueued: PriceFetchQueued;
  PriceFetchWindow: PriceFetchWindow;
  PriceObservation: PriceObservation;
  PriceQuota: PriceQuota;
  PriceRule: PriceRule;
  PriceRuleEdit: PriceRuleEdit;
  PriceRuleList: PriceRuleList;
  PriceRuleSettings: PriceRuleSettings;
  PriceRun: PriceRun;
  PrivateClose: PrivateClose;
  PrivateCloseHistory: PrivateCloseHistory;
  Problem: Problem;
  ProblemField: ProblemField;
  Provenance: Provenance;
  Provider: Provider;
  ProviderCapabilities: ProviderCapabilities;
  ProviderStatus: ProviderStatus;
  ProviderStatusPage: ProviderStatusPage;
  QuoteResponse: QuoteResponse;
  ReminderEdit: ReminderEdit;
  ReminderEvidence: ReminderEvidence;
  ReminderList: ReminderList;
  ReminderScheduleChange: ReminderScheduleChange;
  ReminderSettings: ReminderSettings;
  ReportedFactInput: ReportedFactInput;
  ResearchExtraction: ResearchExtraction;
  ResearchLocation: ResearchLocation;
  ResearchLocations: ResearchLocations;
  ResearchPdfDiscard: ResearchPdfDiscard;
  ResearchPdfUpload: ResearchPdfUpload;
  ResearchReport: ResearchReport;
  ResearchReportCapabilities: ResearchReportCapabilities;
  ResearchReportFeedback: ResearchReportFeedback;
  ResearchReportFeedbackInput: ResearchReportFeedbackInput;
  ResearchReportHistory: ResearchReportHistory;
  ResearchReportInput: ResearchReportInput;
  ResearchReportSummary: ResearchReportSummary;
  ResearchSearchResult: ResearchSearchResult;
  ResearchTextPage: ResearchTextPage;
  ReturnMeasure: ReturnMeasure;
  ReviewCloseInput: ReviewCloseInput;
  ReviewReminder: ReviewReminder;
  Rights: Rights;
  SecurityInput: SecurityInput;
  SessionDate: SessionDate;
  SessionResponse: SessionResponse;
  SourceTimes: SourceTimes;
  StagedResearchPdf: StagedResearchPdf;
  StagedResearchPdfs: StagedResearchPdfs;
  StockLookupOpened: StockLookupOpened;
  StockLookupResults: StockLookupResults;
  StockLookupSelection: StockLookupSelection;
  StockScreen: StockScreen;
  StockScreenCheck: StockScreenCheck;
  StockScreenEdit: StockScreenEdit;
  StockScreenFilter: StockScreenFilter;
  StockScreenHistory: StockScreenHistory;
  StockScreenIndex: StockScreenIndex;
  StockScreenInput: StockScreenInput;
  StockScreenResult: StockScreenResult;
  StockScreenRun: StockScreenRun;
  StockScreenRunInput: StockScreenRunInput;
  StockScreenRunSummary: StockScreenRunSummary;
  StockSuggestion: StockSuggestion;
  SymbolHistory: SymbolHistory;
  SymbolHistoryList: SymbolHistoryList;
  SymbolInput: SymbolInput;
  ThesisCondition: ThesisCondition;
  ThesisConditionCheck: ThesisConditionCheck;
  ThesisConditionDefinition: ThesisConditionDefinition;
  ThesisConditionInput: ThesisConditionInput;
  ThesisConditions: ThesisConditions;
  ThesisReview: ThesisReview;
  ThesisReviewDecision: ThesisReviewDecision;
  ThesisReviewDecisionInput: ThesisReviewDecisionInput;
  ThesisReviewGuidance: ThesisReviewGuidance;
  ThesisReviewGuidanceRef: ThesisReviewGuidanceRef;
  ThesisReviewIndex: ThesisReviewIndex;
  ThesisReviewInput: ThesisReviewInput;
  ThesisReviewLink: ThesisReviewLink;
  ThesisReviewSchedule: ThesisReviewSchedule;
  ThesisReviewSummary: ThesisReviewSummary;
  UserProfile: UserProfile;
  UtcInstant: UtcInstant;
  ValuationListing: ValuationListing;
  ValuationPoint: ValuationPoint;
  ValuationSeries: ValuationSeries;
  ValuationSnapshotDetail: ValuationSnapshotDetail;
  ValuationTotals: ValuationTotals;
  ValuedHolding: ValuedHolding;
  Warning: Warning;
  WatchlistDetail: WatchlistDetail;
  WatchlistIndex: WatchlistIndex;
  WatchlistItem: WatchlistItem;
  WatchlistName: WatchlistName;
  WatchlistSummary: WatchlistSummary;
  WatchlistTrack: WatchlistTrack;
}
