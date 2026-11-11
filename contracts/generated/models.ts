// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
export type AccountInput = ({
  "name": (string);
  "source": ("GROWW" | "MANUAL" | "OTHER") & (string);
  "currency": ("INR");
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
  "source": ("MANUAL_USER");
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

export type ContractVersion = ("0.8.0") & (string);

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
  "commitAvailable": (false);
});

export type HoldingsPreviewRow = ({
  "source": (HoldingsSourceRow);
  "matchedSecurityId": (((OpaqueId)) | ((null)));
  "mappingStatus": ("UNRESOLVED_SECURITY" | "EXISTING_SECURITY") & (string);
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
  "kind": ("BUY" | "SELL" | "FEE" | "DEPOSIT" | "WITHDRAWAL" | "OPENING_POSITION" | "OPENING_CASH" | "REVERSAL") & (string);
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

export type NonNegativeDecimalString = (string);

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

export type PositiveDecimalString = (string);

export type Preferences = ({
  "timeZone": (string);
  "currency": ("INR");
  "inAppNotifications": (boolean);
  "emailNotifications": (boolean);
  "revision": (number);
  "deliveryAvailable": (false);
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

export type Warning = ({
  "code": (OpaqueId);
  "message": (string);
});

export interface ContractTypes {
  AccountInput: AccountInput;
  AcquisitionEnvelope: AcquisitionEnvelope;
  AdjustmentBasis: AdjustmentBasis;
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
  CsrfInformation: CsrfInformation;
  DecimalString: DecimalString;
  Delay: Delay;
  Freshness: Freshness;
  HistoryCoverage: HistoryCoverage;
  HistoryResponse: HistoryResponse;
  HoldingsComparison: HoldingsComparison;
  HoldingsImportList: HoldingsImportList;
  HoldingsImportSummary: HoldingsImportSummary;
  HoldingsPreviewMetadata: HoldingsPreviewMetadata;
  HoldingsPreviewPage: HoldingsPreviewPage;
  HoldingsPreviewRow: HoldingsPreviewRow;
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
  LedgerPage: LedgerPage;
  LedgerPosition: LedgerPosition;
  LedgerReceipt: LedgerReceipt;
  LedgerRecordInput: LedgerRecordInput;
  LedgerReverseInput: LedgerReverseInput;
  LedgerView: LedgerView;
  ListingIdentity: ListingIdentity;
  ListingInput: ListingInput;
  NonNegativeDecimalString: NonNegativeDecimalString;
  OpaqueId: OpaqueId;
  PortfolioArchiveInput: PortfolioArchiveInput;
  PortfolioDetail: PortfolioDetail;
  PortfolioInput: PortfolioInput;
  PortfolioList: PortfolioList;
  PortfolioSummary: PortfolioSummary;
  PositiveDecimalString: PositiveDecimalString;
  Preferences: Preferences;
  PreferencesUpdate: PreferencesUpdate;
  PriceBasis: PriceBasis;
  PriceObservation: PriceObservation;
  Problem: Problem;
  ProblemField: ProblemField;
  Provenance: Provenance;
  Provider: Provider;
  ProviderCapabilities: ProviderCapabilities;
  ProviderStatus: ProviderStatus;
  ProviderStatusPage: ProviderStatusPage;
  QuoteResponse: QuoteResponse;
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
  Warning: Warning;
}
