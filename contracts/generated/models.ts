// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
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

export type ContractVersion = ("0.2.0") & (string);

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

export type NonNegativeDecimalString = (string);

export type OpaqueId = (string);

export type PositiveDecimalString = (string);

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

export type SessionDate = (string);

export type SourceTimes = ({
  "observedAt": (((UtcInstant)) | ((null)));
  "publishedAt": (((UtcInstant)) | ((null)));
  "providerAvailableAt": (((UtcInstant)) | ((null)));
  "firstSeenAt": (UtcInstant);
  "ingestedAt": (((UtcInstant)) | ((null)));
  "acceptedAt": (((UtcInstant)) | ((null)));
  "unknownTimeReasons": (Array<("OBSERVATION_TIME_NOT_PROVIDED" | "PUBLICATION_TIME_NOT_PROVIDED" | "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED" | "NOT_YET_INGESTED" | "NOT_YET_ACCEPTED") & (string)>);
});

export type UtcInstant = (string);

export type Warning = ({
  "code": (OpaqueId);
  "message": (string);
});

export interface ContractTypes {
  AcquisitionEnvelope: AcquisitionEnvelope;
  AdjustmentBasis: AdjustmentBasis;
  AsyncJobStatus: AsyncJobStatus;
  Capability: Capability;
  ContractVersion: ContractVersion;
  DecimalString: DecimalString;
  Delay: Delay;
  Freshness: Freshness;
  HistoryCoverage: HistoryCoverage;
  HistoryResponse: HistoryResponse;
  InstrumentPage: InstrumentPage;
  InstrumentResult: InstrumentResult;
  IntegerString: IntegerString;
  ListingIdentity: ListingIdentity;
  NonNegativeDecimalString: NonNegativeDecimalString;
  OpaqueId: OpaqueId;
  PositiveDecimalString: PositiveDecimalString;
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
  SessionDate: SessionDate;
  SourceTimes: SourceTimes;
  UtcInstant: UtcInstant;
  Warning: Warning;
}
