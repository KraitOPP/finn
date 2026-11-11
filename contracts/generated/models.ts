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
  "source": ("MANUAL_USER" | "GROWW_HOLDINGS") & (string);
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
  "source": ("MANUAL_USER");
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

export type CompanyInput = ({
  "name": (string);
});

export type ContractVersion = ("0.21.0") & (string);

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

export type Freshness = ({
  "state": ("FRESH" | "STALE" | "UNKNOWN" | "NOT_APPLICABLE") & (string);
  "evaluatedAt": (UtcInstant);
  "expectedSessionDate": (((SessionDate)) | ((null)));
  "latestSessionDate": (((SessionDate)) | ((null)));
  "reasonCode": (OpaqueId);
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
  "kind": ("PRICE_RULE" | "REVIEW_REMINDER" | "PORTFOLIO_BRIEF" | "VOLUME_RULE" | "ALLOCATION_RULE" | "COMPANY_EVENT") & (string);
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
  "kind": ("PRICE_RULE" | "REVIEW_REMINDER" | "PORTFOLIO_BRIEF" | "VOLUME_RULE" | "ALLOCATION_RULE" | "COMPANY_EVENT") & (string);
  "delivery": (NotificationDelivery);
})>);
});

export type NotificationDetail = ({
  "notification": (Notification);
  "price": (((PriceEvaluation)) | ((null)));
  "reminder": (((ReminderEvidence)) | ((null)));
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

export type PortfolioArchiveInput = ({
  "archived": (boolean);
  "revision": (number);
});

export type PortfolioDetail = ({
  "portfolio": (PortfolioSummary);
  "accounts": (Array<(InvestmentAccount)>);
});

export type PortfolioInput = ({
  "name": (string);
});

export type PortfolioList = ({
  "items": (Array<(PortfolioSummary)>);
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

export type SymbolHistory = ({
  "symbol": (string);
  "validFrom": (SessionDate);
  "validTo": (((SessionDate)) | ((null)));
  "source": ("MANUAL_USER");
});

export type SymbolHistoryList = (Array<(SymbolHistory)>);

export type SymbolInput = ({
  "symbol": (string);
  "providerSymbol": (((string)) | ((null)));
  "effectiveDate": (SessionDate);
  "confirmed": (true);
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
  AsyncJobStatus: AsyncJobStatus;
  Capability: Capability;
  CatalogueCompanies: CatalogueCompanies;
  CatalogueCompany: CatalogueCompany;
  CatalogueListing: CatalogueListing;
  CatalogueSecurity: CatalogueSecurity;
  CatalogueSecurityDetail: CatalogueSecurityDetail;
  CatalogueSecurityPage: CatalogueSecurityPage;
  CompanyInput: CompanyInput;
  ContractVersion: ContractVersion;
  CorporateActionApproval: CorporateActionApproval;
  CorporateActionEffect: CorporateActionEffect;
  CorporateActionInput: CorporateActionInput;
  CorporateActionList: CorporateActionList;
  CorporateActionRecord: CorporateActionRecord;
  CsrfInformation: CsrfInformation;
  DecimalString: DecimalString;
  Delay: Delay;
  Freshness: Freshness;
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
  InstrumentPage: InstrumentPage;
  InstrumentResult: InstrumentResult;
  IntegerString: IntegerString;
  InvestmentAccount: InvestmentAccount;
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
  PortfolioArchiveInput: PortfolioArchiveInput;
  PortfolioDetail: PortfolioDetail;
  PortfolioInput: PortfolioInput;
  PortfolioList: PortfolioList;
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
  ReviewCloseInput: ReviewCloseInput;
  ReviewReminder: ReviewReminder;
  Rights: Rights;
  SecurityInput: SecurityInput;
  SessionDate: SessionDate;
  SessionResponse: SessionResponse;
  SourceTimes: SourceTimes;
  SymbolHistory: SymbolHistory;
  SymbolHistoryList: SymbolHistoryList;
  SymbolInput: SymbolInput;
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
