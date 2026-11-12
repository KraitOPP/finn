// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
export const contractMetadata = {
  "contractVersion": "0.47.0",
  "openapiVersion": "3.1.1",
  "source": "fin-service/contracts/public-api/openapi.json",
  "sourceSha256": "74fed08814daa18d95a2bd8e923fd8b81cc4328bf1791883c4d5c63570beb5c9",
  "schemaNames": [
    "AccountInput",
    "AccountValuation",
    "AccountValuationTotal",
    "AcquisitionEnvelope",
    "AdjustmentBasis",
    "AlertCloseEvidence",
    "AnnouncedEventDate",
    "AsyncJobStatus",
    "AttentionFeedback",
    "AttentionItem",
    "AttentionPage",
    "AttentionState",
    "BriefIndex",
    "BriefSchedule",
    "BriefScheduleInput",
    "BriefSettings",
    "Capability",
    "CatalogueCompanies",
    "CatalogueCompany",
    "CatalogueListing",
    "CatalogueSecurity",
    "CatalogueSecurityDetail",
    "CatalogueSecurityPage",
    "ChartRange",
    "CompanyCalendarPage",
    "CompanyEvent",
    "CompanyEventHistory",
    "CompanyEventInput",
    "CompanyEventPage",
    "CompanyInput",
    "CompanyNewsCluster",
    "CompanyNewsInput",
    "CompanyNewsPage",
    "CompanyResearchNote",
    "CompanyResearchNoteInput",
    "CompanyResearchOverview",
    "CompanyResearchResolution",
    "CompanySource",
    "CompanySourceDetail",
    "CompanySourceEdit",
    "CompanySourceInput",
    "CompanySourcePage",
    "CompanySourceVersions",
    "ContractVersion",
    "CorporateActionApproval",
    "CorporateActionEffect",
    "CorporateActionInput",
    "CorporateActionList",
    "CorporateActionRecord",
    "CsrfInformation",
    "DecimalString",
    "Delay",
    "DeriveFinancialFact",
    "DiscoveryCompany",
    "DiscoveryDirectory",
    "DiscoveryMember",
    "DiscoveryMemberInput",
    "DiscoveryMetric",
    "DiscoveryMetricSupport",
    "DiscoveryPeriod",
    "DiscoveryReading",
    "DiscoverySector",
    "DiscoverySnapshot",
    "EventReplay",
    "EventSuggestion",
    "ExchangeSession",
    "FilingRule",
    "FilingRuleChange",
    "FilingRuleList",
    "FilingRuleSettings",
    "FinancialComparison",
    "FinancialDimensions",
    "FinancialFact",
    "FinancialFactEdit",
    "FinancialFactHistory",
    "FinancialFactPage",
    "FinancialOperand",
    "Freshness",
    "GuidanceCandidates",
    "GuidanceDelivery",
    "HistoryCoverage",
    "HistoryResponse",
    "HoldingsAcceptanceInput",
    "HoldingsAcceptanceReceipt",
    "HoldingsComparison",
    "HoldingsImportList",
    "HoldingsImportSummary",
    "HoldingsPreviewMetadata",
    "HoldingsPreviewPage",
    "HoldingsPreviewRow",
    "HoldingsReconciliation",
    "HoldingsReconciliationInput",
    "HoldingsReconciliationReceipt",
    "HoldingsReconciliationRow",
    "HoldingsReviewPlan",
    "HoldingsRowIssue",
    "HoldingsSourceRow",
    "HoldingsTotals",
    "ImportTicket",
    "IndicatorCreate",
    "IndicatorEdit",
    "IndicatorEvaluation",
    "IndicatorEvaluations",
    "IndicatorList",
    "IndicatorRule",
    "InstrumentPage",
    "InstrumentResult",
    "IntegerString",
    "InvestmentAccount",
    "InvestmentTheses",
    "InvestmentThesis",
    "InvestmentThesisEdit",
    "InvestmentThesisInput",
    "LedgerCorrectInput",
    "LedgerEntryInput",
    "LedgerEventView",
    "LedgerExportInput",
    "LedgerPage",
    "LedgerPosition",
    "LedgerReceipt",
    "LedgerRecordInput",
    "LedgerReverseInput",
    "LedgerView",
    "ListingIdentity",
    "ListingInput",
    "ManagementGuidance",
    "ManagementGuidanceEdit",
    "ManagementGuidanceInput",
    "ManagementGuidanceList",
    "MarketChart",
    "MarketDiagnostics",
    "MarketFeed",
    "NonNegativeDecimalString",
    "Notification",
    "NotificationAttempt",
    "NotificationDelivery",
    "NotificationDeliveryPage",
    "NotificationDetail",
    "NotificationPage",
    "NotificationRead",
    "OpaqueId",
    "PeerRanking",
    "PeerRankingContribution",
    "PeerRankingFactor",
    "PeerRankingIndex",
    "PeerRankingInput",
    "PeerRankingRow",
    "PeerRankingSpecification",
    "PeerRankingSummary",
    "PerformanceFlow",
    "PerformanceSnapshotRef",
    "PerformanceValuation",
    "PortfolioArchiveInput",
    "PortfolioBrief",
    "PortfolioDetail",
    "PortfolioHealth",
    "PortfolioHealthHolding",
    "PortfolioHealthSector",
    "PortfolioInput",
    "PortfolioList",
    "PortfolioPerformance",
    "PortfolioPerformanceInput",
    "PortfolioRisk",
    "PortfolioRiskObservation",
    "PortfolioScenario",
    "PortfolioScenarioInput",
    "PortfolioSummary",
    "PortfolioValuation",
    "PositiveDecimalString",
    "Preferences",
    "PreferencesUpdate",
    "PriceBasis",
    "PriceCoverage",
    "PriceEvaluation",
    "PriceEvaluationReport",
    "PriceFetchQueued",
    "PriceFetchWindow",
    "PriceObservation",
    "PriceQuota",
    "PriceRule",
    "PriceRuleEdit",
    "PriceRuleList",
    "PriceRuleSettings",
    "PriceRun",
    "PrivateClose",
    "PrivateCloseHistory",
    "Problem",
    "ProblemField",
    "Provenance",
    "Provider",
    "ProviderCapabilities",
    "ProviderStatus",
    "ProviderStatusPage",
    "QuoteResponse",
    "ReminderEdit",
    "ReminderEvidence",
    "ReminderList",
    "ReminderScheduleChange",
    "ReminderSettings",
    "ReportedFactInput",
    "ResearchExtraction",
    "ResearchLocation",
    "ResearchLocations",
    "ResearchPdfDiscard",
    "ResearchPdfUpload",
    "ResearchReport",
    "ResearchReportCapabilities",
    "ResearchReportFeedback",
    "ResearchReportFeedbackInput",
    "ResearchReportHistory",
    "ResearchReportInput",
    "ResearchReportSummary",
    "ResearchSearchResult",
    "ResearchTextPage",
    "ReturnMeasure",
    "ReviewCloseInput",
    "ReviewReminder",
    "Rights",
    "SecurityInput",
    "SessionDate",
    "SessionResponse",
    "SourceTimes",
    "StagedResearchPdf",
    "StagedResearchPdfs",
    "StockLookupOpened",
    "StockLookupResults",
    "StockLookupSelection",
    "StockScreen",
    "StockScreenCheck",
    "StockScreenEdit",
    "StockScreenFilter",
    "StockScreenHistory",
    "StockScreenIndex",
    "StockScreenInput",
    "StockScreenResult",
    "StockScreenRun",
    "StockScreenRunInput",
    "StockScreenRunSummary",
    "StockSuggestion",
    "SymbolHistory",
    "SymbolHistoryList",
    "SymbolInput",
    "ThesisCondition",
    "ThesisConditionCheck",
    "ThesisConditionDefinition",
    "ThesisConditionInput",
    "ThesisConditions",
    "ThesisReview",
    "ThesisReviewDecision",
    "ThesisReviewDecisionInput",
    "ThesisReviewGuidance",
    "ThesisReviewGuidanceRef",
    "ThesisReviewIndex",
    "ThesisReviewInput",
    "ThesisReviewLink",
    "ThesisReviewSchedule",
    "ThesisReviewSummary",
    "UserProfile",
    "UtcInstant",
    "ValuationListing",
    "ValuationPoint",
    "ValuationSeries",
    "ValuationSnapshotDetail",
    "ValuationTotals",
    "ValuedHolding",
    "Warning",
    "WatchlistDetail",
    "WatchlistIndex",
    "WatchlistItem",
    "WatchlistName",
    "WatchlistSummary",
    "WatchlistTrack"
  ]
} as const;

export const contractSchemas = {
  "AccountInput": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "source": {
        "type": "string",
        "enum": [
          "GROWW",
          "MANUAL",
          "OTHER"
        ]
      },
      "currency": {
        "const": "INR"
      }
    },
    "required": [
      "name",
      "source",
      "currency"
    ],
    "additionalProperties": false
  },
  "AccountValuation": {
    "type": "object",
    "properties": {
      "accountId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "asOf": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "calculationVersion": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "currency": {
        "type": "string",
        "const": "INR"
      },
      "coverageStart": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "historyStatus": {
        "type": "string",
        "enum": [
          "UNKNOWN",
          "HOLDINGS_ONLY",
          "PARTIAL_TRADES"
        ]
      },
      "holdings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ValuedHolding"
        },
        "maxItems": 1000
      },
      "totals": {
        "$ref": "#/components/schemas/ValuationTotals"
      }
    },
    "required": [
      "accountId",
      "asOf",
      "ledgerRevision",
      "calculationVersion",
      "currency",
      "coverageStart",
      "historyStatus",
      "holdings",
      "totals"
    ],
    "additionalProperties": false
  },
  "AccountValuationTotal": {
    "type": "object",
    "properties": {
      "accountId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "totals": {
        "$ref": "#/components/schemas/ValuationTotals"
      }
    },
    "required": [
      "accountId",
      "name",
      "ledgerRevision",
      "totals"
    ],
    "additionalProperties": false
  },
  "AcquisitionEnvelope": {
    "type": "object",
    "properties": {
      "contractVersion": {
        "$ref": "#/components/schemas/ContractVersion"
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "provider": {
        "$ref": "#/components/schemas/Provider"
      },
      "adapterVersion": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "requestedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "completedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "outcome": {
        "type": "string",
        "enum": [
          "COMPLETE",
          "PARTIAL",
          "UNAVAILABLE"
        ]
      },
      "results": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/InstrumentResult"
        },
        "maxItems": 100,
        "minItems": 1
      },
      "warnings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Warning"
        },
        "maxItems": 32
      }
    },
    "required": [
      "contractVersion",
      "requestId",
      "provider",
      "adapterVersion",
      "requestedAt",
      "completedAt",
      "outcome",
      "results",
      "warnings"
    ],
    "additionalProperties": false,
    "description": "Internal acquisition response: per-listing partial success is explicit. COMPLETE means every requested listing has observations; it does not prove complete date-range coverage."
  },
  "AdjustmentBasis": {
    "type": "string",
    "enum": [
      "AS_REPORTED_EXCHANGE",
      "SPLIT_ADJUSTED",
      "TOTAL_RETURN_ADJUSTED",
      "PROVIDER_DEFINED",
      "UNKNOWN"
    ]
  },
  "AlertCloseEvidence": {
    "type": "object",
    "properties": {
      "observationId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_REVIEWED",
          "YAHOO_YFINANCE"
        ]
      },
      "priceBasis": {
        "type": "string",
        "enum": [
          "AS_REPORTED_EXCHANGE",
          "PROVIDER_DEFINED"
        ]
      },
      "close": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "sourceReference": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "receivedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "observationId",
      "sessionDate",
      "source",
      "priceBasis",
      "close",
      "sourceReference",
      "receivedAt"
    ],
    "additionalProperties": false
  },
  "AnnouncedEventDate": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "MEETING",
          "RESULTS",
          "EX_DATE",
          "RECORD_DATE",
          "OTHER"
        ]
      },
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "certainty": {
        "type": "string",
        "enum": [
          "CONFIRMED",
          "TENTATIVE",
          "CANCELLED"
        ]
      }
    },
    "required": [
      "type",
      "date",
      "certainty"
    ],
    "additionalProperties": false
  },
  "AsyncJobStatus": {
    "description": "Owner-scoped durable job status. Revision increases on committed changes. Terminal states are immutable; explicit retry creates a new job. Failure codes are safe application codes, never raw exceptions or source values.",
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "QUEUED"
          },
          "startedAt": {
            "type": "null"
          },
          "finishedAt": {
            "type": "null"
          },
          "failureCode": {
            "type": "null"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "RUNNING"
          },
          "startedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "finishedAt": {
            "type": "null"
          },
          "failureCode": {
            "type": "null"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "SUCCEEDED"
          },
          "startedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "finishedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "failureCode": {
            "type": "null"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "PARTIALLY_SUCCEEDED"
          },
          "startedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "finishedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "failureCode": {
            "type": "string",
            "const": "PARTIAL_RESULT"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "FAILED"
          },
          "startedAt": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "finishedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "failureCode": {
            "type": "string",
            "minLength": 1,
            "maxLength": 64,
            "pattern": "^[A-Z][A-Z0-9_]{0,63}$"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "jobId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "revision": {
            "type": "integer",
            "minimum": 1,
            "maximum": 9007199254740991
          },
          "createdAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "updatedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "state": {
            "type": "string",
            "const": "CANCELLED"
          },
          "startedAt": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "finishedAt": {
            "$ref": "#/components/schemas/UtcInstant"
          },
          "failureCode": {
            "type": "null"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "jobId",
          "revision",
          "createdAt",
          "updatedAt",
          "state",
          "startedAt",
          "finishedAt",
          "failureCode"
        ],
        "additionalProperties": false
      }
    ]
  },
  "AttentionFeedback": {
    "type": "object",
    "properties": {
      "eventRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "action": {
        "type": "string",
        "enum": [
          "READ",
          "UNREAD",
          "MUTE",
          "UNMUTE",
          "SNOOZE",
          "UNSNOOZE"
        ]
      },
      "snoozeUntil": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "eventRevision",
      "action",
      "snoozeUntil"
    ],
    "additionalProperties": false
  },
  "AttentionItem": {
    "type": "object",
    "properties": {
      "event": {
        "$ref": "#/components/schemas/CompanyEvent"
      },
      "score": {
        "type": "integer",
        "minimum": 0,
        "maximum": 75
      },
      "state": {
        "$ref": "#/components/schemas/AttentionState"
      },
      "reasons": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "label": {
              "type": "string",
              "minLength": 1,
              "maxLength": 100
            },
            "points": {
              "type": "integer",
              "minimum": 0,
              "maximum": 75
            }
          },
          "required": [
            "label",
            "points"
          ],
          "additionalProperties": false
        },
        "maxItems": 3
      },
      "holdings": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "securityId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "name": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "quantity": {
              "$ref": "#/components/schemas/PositiveDecimalString"
            }
          },
          "required": [
            "securityId",
            "name",
            "quantity"
          ],
          "additionalProperties": false
        },
        "maxItems": 100
      }
    },
    "required": [
      "event",
      "score",
      "state",
      "reasons",
      "holdings"
    ],
    "additionalProperties": false
  },
  "AttentionPage": {
    "type": "object",
    "properties": {
      "coverage": {
        "type": "string",
        "enum": [
          "NO_RECORDS",
          "PARTIAL",
          "RECORDED_ACCOUNTS"
        ]
      },
      "rankedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AttentionItem"
        },
        "maxItems": 25
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "coverage",
      "rankedAt",
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "AttentionState": {
    "type": "object",
    "properties": {
      "read": {
        "type": "boolean"
      },
      "muted": {
        "type": "boolean"
      },
      "snoozedUntil": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "read",
      "muted",
      "snoozedUntil"
    ],
    "additionalProperties": false
  },
  "BriefIndex": {
    "type": "object",
    "properties": {
      "schedule": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/BriefSchedule"
          },
          {
            "type": "null"
          }
        ]
      },
      "runs": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "runId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "scheduleRevision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 1000000
            },
            "windowStart": {
              "$ref": "#/components/schemas/UtcInstant"
            },
            "windowEnd": {
              "$ref": "#/components/schemas/UtcInstant"
            },
            "createdAt": {
              "$ref": "#/components/schemas/UtcInstant"
            }
          },
          "required": [
            "runId",
            "scheduleRevision",
            "windowStart",
            "windowEnd",
            "createdAt"
          ],
          "additionalProperties": false
        },
        "maxItems": 30
      }
    },
    "required": [
      "schedule",
      "runs"
    ],
    "additionalProperties": false
  },
  "BriefSchedule": {
    "type": "object",
    "properties": {
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "settings": {
        "$ref": "#/components/schemas/BriefSettings"
      },
      "nextAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "revision",
      "settings",
      "nextAt"
    ],
    "additionalProperties": false
  },
  "BriefScheduleInput": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000000
      },
      "settings": {
        "$ref": "#/components/schemas/BriefSettings"
      }
    },
    "required": [
      "expectedRevision",
      "settings"
    ],
    "additionalProperties": false
  },
  "BriefSettings": {
    "type": "object",
    "properties": {
      "scheduledLocal": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16,
        "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"
      },
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "cadence": {
        "type": "string",
        "enum": [
          "DAILY",
          "WEEKLY"
        ]
      },
      "enabled": {
        "type": "boolean"
      },
      "includeAlerts": {
        "type": "boolean"
      },
      "includeReminders": {
        "type": "boolean"
      },
      "includeCompany": {
        "type": "boolean"
      },
      "includeValuations": {
        "type": "boolean"
      }
    },
    "required": [
      "scheduledLocal",
      "timeZone",
      "cadence",
      "enabled",
      "includeAlerts",
      "includeReminders",
      "includeCompany",
      "includeValuations"
    ],
    "additionalProperties": false
  },
  "Capability": {
    "type": "object",
    "properties": {
      "capability": {
        "type": "string",
        "enum": [
          "QUOTE",
          "DAILY_HISTORY",
          "INTRADAY_HISTORY",
          "STREAMING",
          "CORPORATE_ACTIONS",
          "FILINGS",
          "NEWS",
          "FUNDAMENTALS"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "VALIDATED",
          "DOCUMENTED_UNVERIFIED",
          "UNSUPPORTED",
          "TEMPORARILY_UNAVAILABLE"
        ]
      },
      "coverage": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      },
      "evidence": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      }
    },
    "required": [
      "capability",
      "status",
      "coverage",
      "evidence"
    ],
    "additionalProperties": false,
    "description": "A documented library interface does not establish validated Indian listing coverage, timing, or rights."
  },
  "CatalogueCompanies": {
    "type": "array",
    "items": {
      "$ref": "#/components/schemas/CatalogueCompany"
    },
    "maxItems": 100
  },
  "CatalogueCompany": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_USER",
          "NSE_DIRECTORY",
          "YAHOO_DISCOVERY",
          "GROWW_HOLDINGS"
        ]
      }
    },
    "required": [
      "companyId",
      "name",
      "source"
    ],
    "additionalProperties": false
  },
  "CatalogueListing": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "segment": {
        "type": "string",
        "const": "CASH_EQUITY"
      },
      "series": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "currency": {
        "type": "string",
        "const": "INR"
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "providerSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 72
          },
          {
            "type": "null"
          }
        ]
      },
      "reviewStatus": {
        "const": "USER_CONFIRMED"
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_USER",
          "NSE_DIRECTORY",
          "YAHOO_DISCOVERY"
        ]
      },
      "validFrom": {
        "$ref": "#/components/schemas/SessionDate"
      }
    },
    "required": [
      "listingId",
      "securityId",
      "companyId",
      "exchange",
      "segment",
      "series",
      "symbol",
      "currency",
      "isin",
      "providerSymbol",
      "reviewStatus",
      "source",
      "validFrom"
    ],
    "additionalProperties": false,
    "description": "An owner-scoped listing selected or confirmed by the user."
  },
  "CatalogueSecurity": {
    "type": "object",
    "properties": {
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "reviewStatus": {
        "type": "string",
        "enum": [
          "USER_CONFIRMED",
          "UNRESOLVED"
        ]
      }
    },
    "required": [
      "securityId",
      "companyId",
      "companyName",
      "name",
      "isin",
      "reviewStatus"
    ],
    "additionalProperties": false
  },
  "CatalogueSecurityDetail": {
    "type": "object",
    "properties": {
      "security": {
        "$ref": "#/components/schemas/CatalogueSecurity"
      },
      "listings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CatalogueListing"
        },
        "maxItems": 100
      }
    },
    "required": [
      "security",
      "listings"
    ],
    "additionalProperties": false
  },
  "CatalogueSecurityPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CatalogueSecurity"
        },
        "maxItems": 100
      },
      "limit": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "offset": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "limit",
      "offset",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "ChartRange": {
    "type": "string",
    "enum": [
      "D1",
      "D7",
      "M1",
      "Y1",
      "Y5",
      "ALL"
    ]
  },
  "CompanyCalendarPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "eventId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "versionId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "revision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 100
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "companyName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "documentId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "documentRevision": {
              "type": "integer",
              "minimum": 1,
              "maximum": 50
            },
            "date": {
              "$ref": "#/components/schemas/AnnouncedEventDate"
            }
          },
          "required": [
            "eventId",
            "versionId",
            "revision",
            "title",
            "companyName",
            "documentId",
            "documentRevision",
            "date"
          ],
          "additionalProperties": false
        },
        "maxItems": 40
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "CompanyEvent": {
    "type": "object",
    "properties": {
      "eventId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "versionId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "documentId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "documentRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "sourceTitle": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "category": {
        "type": "string",
        "enum": [
          "EARNINGS",
          "CAPITAL",
          "GOVERNANCE",
          "CORPORATE_ACTION",
          "OTHER"
        ]
      },
      "subtype": {
        "type": "string",
        "enum": [
          "RESULTS",
          "RESULTS_MEETING",
          "BUYBACK",
          "CAPITAL_RAISE",
          "AUDITOR",
          "GOVERNANCE",
          "DIVIDEND",
          "SPLIT_BONUS",
          "MERGER",
          "OTHER"
        ]
      },
      "stage": {
        "type": "string",
        "enum": [
          "ANNOUNCED",
          "DECIDED",
          "COMPLETED",
          "CANCELLED",
          "UNKNOWN"
        ]
      },
      "materiality": {
        "type": "string",
        "enum": [
          "HIGH",
          "MEDIUM",
          "LOW",
          "UNKNOWN"
        ]
      },
      "novelty": {
        "type": "string",
        "enum": [
          "NEW",
          "FOLLOW_UP",
          "CORRECTION",
          "ROUTINE",
          "UNKNOWN"
        ]
      },
      "confidence": {
        "const": "REVIEWED"
      },
      "reviewedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "dates": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AnnouncedEventDate"
        },
        "maxItems": 5
      }
    },
    "required": [
      "eventId",
      "versionId",
      "companyId",
      "companyName",
      "revision",
      "documentId",
      "documentRevision",
      "sourceTitle",
      "title",
      "category",
      "subtype",
      "stage",
      "materiality",
      "novelty",
      "confidence",
      "reviewedAt",
      "dates"
    ],
    "additionalProperties": false
  },
  "CompanyEventHistory": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyEvent"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "CompanyEventInput": {
    "type": "object",
    "properties": {
      "documentId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "documentRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "eventId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "expectedRevision": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "groupingKey": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 80
          },
          {
            "type": "null"
          }
        ]
      },
      "subtype": {
        "type": "string",
        "enum": [
          "RESULTS",
          "RESULTS_MEETING",
          "BUYBACK",
          "CAPITAL_RAISE",
          "AUDITOR",
          "GOVERNANCE",
          "DIVIDEND",
          "SPLIT_BONUS",
          "MERGER",
          "OTHER"
        ]
      },
      "stage": {
        "type": "string",
        "enum": [
          "ANNOUNCED",
          "DECIDED",
          "COMPLETED",
          "CANCELLED",
          "UNKNOWN"
        ]
      },
      "materiality": {
        "type": "string",
        "enum": [
          "HIGH",
          "MEDIUM",
          "LOW",
          "UNKNOWN"
        ]
      },
      "novelty": {
        "type": "string",
        "enum": [
          "NEW",
          "FOLLOW_UP",
          "CORRECTION",
          "ROUTINE",
          "UNKNOWN"
        ]
      },
      "reviewed": {
        "const": true
      },
      "dates": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AnnouncedEventDate"
        },
        "maxItems": 5
      }
    },
    "required": [
      "documentId",
      "documentRevision",
      "eventId",
      "expectedRevision",
      "title",
      "groupingKey",
      "subtype",
      "stage",
      "materiality",
      "novelty",
      "reviewed"
    ],
    "additionalProperties": false
  },
  "CompanyEventPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyEvent"
        },
        "maxItems": 40
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "CompanyInput": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      }
    },
    "required": [
      "name"
    ],
    "additionalProperties": false
  },
  "CompanyNewsCluster": {
    "type": "object",
    "properties": {
      "clusterId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "headline": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "sources": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanySource"
        },
        "maxItems": 200
      }
    },
    "required": [
      "clusterId",
      "companyId",
      "companyName",
      "headline",
      "date",
      "sources"
    ],
    "additionalProperties": false
  },
  "CompanyNewsInput": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "headline": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "publisher": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "url": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1000
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "rightsConfirmed": {
        "const": true
      }
    },
    "required": [
      "companyId",
      "headline",
      "publisher",
      "url",
      "publishedAt",
      "rightsConfirmed"
    ],
    "additionalProperties": false
  },
  "CompanyNewsPage": {
    "type": "object",
    "properties": {
      "coverage": {
        "const": "MANUAL_LINKS"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyNewsCluster"
        },
        "maxItems": 25
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "coverage",
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "CompanyResearchNote": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "BUSINESS",
          "GOVERNANCE",
          "QUESTION"
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "noteId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "resolved": {
        "type": "boolean"
      }
    },
    "required": [
      "kind",
      "title",
      "anchorId",
      "noteId",
      "resolved"
    ],
    "additionalProperties": false
  },
  "CompanyResearchNoteInput": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "BUSINESS",
          "GOVERNANCE",
          "QUESTION"
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "kind",
      "title",
      "anchorId"
    ],
    "additionalProperties": false
  },
  "CompanyResearchOverview": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "primarySources": {
        "type": "integer",
        "minimum": 0
      },
      "indexedSources": {
        "type": "integer",
        "minimum": 0
      },
      "sources": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanySource"
        },
        "maxItems": 6
      },
      "events": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyEvent"
        },
        "maxItems": 6
      },
      "notes": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyResearchNote"
        },
        "maxItems": 50
      }
    },
    "required": [
      "companyId",
      "companyName",
      "primarySources",
      "indexedSources",
      "sources",
      "events",
      "notes"
    ],
    "additionalProperties": false
  },
  "CompanyResearchResolution": {
    "type": "object",
    "properties": {
      "resolved": {
        "type": "boolean"
      }
    },
    "required": [
      "resolved"
    ],
    "additionalProperties": false
  },
  "CompanySource": {
    "type": "object",
    "properties": {
      "documentId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sourceType": {
        "type": "string",
        "enum": [
          "PRIMARY",
          "NEWS"
        ]
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sourceName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "url": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          },
          {
            "type": "null"
          }
        ]
      },
      "hasAttachment": {
        "type": "boolean"
      },
      "hasPdf": {
        "type": "boolean"
      },
      "checksum": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[0-9a-f]{64}$"
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "ingestedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "documentId",
      "companyId",
      "companyName",
      "sourceType",
      "revision",
      "title",
      "sourceName",
      "url",
      "hasAttachment",
      "hasPdf",
      "checksum",
      "publishedAt",
      "ingestedAt"
    ],
    "additionalProperties": false
  },
  "CompanySourceDetail": {
    "type": "object",
    "properties": {
      "source": {
        "$ref": "#/components/schemas/CompanySource"
      },
      "attachment": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 49152
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "source",
      "attachment"
    ],
    "additionalProperties": false
  },
  "CompanySourceEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "source": {
        "$ref": "#/components/schemas/CompanySourceInput"
      }
    },
    "required": [
      "expectedRevision",
      "source"
    ],
    "additionalProperties": false
  },
  "CompanySourceInput": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sourceName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "url": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 1000
          },
          {
            "type": "null"
          }
        ]
      },
      "attachment": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 49152
          },
          {
            "type": "null"
          }
        ]
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "rightsConfirmed": {
        "const": true
      },
      "pdfFileId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "removePdf": {
        "type": "boolean"
      }
    },
    "required": [
      "companyId",
      "title",
      "sourceName",
      "url",
      "attachment",
      "publishedAt",
      "rightsConfirmed"
    ],
    "additionalProperties": false
  },
  "CompanySourcePage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanySource"
        },
        "maxItems": 40
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "CompanySourceVersions": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanySource"
        },
        "maxItems": 50
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "ContractVersion": {
    "type": "string",
    "const": "0.47.0"
  },
  "CorporateActionApproval": {
    "type": "object",
    "properties": {
      "action": {
        "$ref": "#/components/schemas/CorporateActionInput"
      },
      "reviewed": {
        "const": true
      },
      "expectedLedgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      }
    },
    "required": [
      "action",
      "reviewed",
      "expectedLedgerRevision"
    ],
    "additionalProperties": false
  },
  "CorporateActionEffect": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "APPLICABLE",
          "NEEDS_REVIEW"
        ]
      },
      "reason": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "unitsBefore": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "unitsAfter": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedCostBefore": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedCostAfter": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "cashDelta": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "previousSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          {
            "type": "null"
          }
        ]
      },
      "newSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "state",
      "reason",
      "ledgerRevision",
      "unitsBefore",
      "unitsAfter",
      "recordedCostBefore",
      "recordedCostAfter",
      "cashDelta",
      "previousSymbol",
      "newSymbol"
    ],
    "additionalProperties": false
  },
  "CorporateActionInput": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "enum": [
          "SPLIT",
          "BONUS",
          "DIVIDEND",
          "SYMBOL_CHANGE",
          "MERGER",
          "DEMERGER",
          "RIGHTS"
        ]
      },
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listingId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "effectiveDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "ratioNumerator": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          {
            "type": "null"
          }
        ]
      },
      "ratioDenominator": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          {
            "type": "null"
          }
        ]
      },
      "netCash": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "sourceReference": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$"
      },
      "sourceUrl": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 512,
            "format": "uri"
          },
          {
            "type": "null"
          }
        ]
      },
      "newSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 64
          },
          {
            "type": "null"
          }
        ]
      },
      "newProviderSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 72
          },
          {
            "type": "null"
          }
        ]
      },
      "correctsActionId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "type",
      "securityId",
      "listingId",
      "effectiveDate",
      "ratioNumerator",
      "ratioDenominator",
      "netCash",
      "sourceReference",
      "sourceUrl",
      "newSymbol",
      "newProviderSymbol",
      "correctsActionId"
    ],
    "additionalProperties": false,
    "description": "Explicit reviewed source evidence. Split ratio is new total units per old units; bonus ratio is additional units per old units. Dividend is net credited cash. Complex/fractional actions require manual review."
  },
  "CorporateActionList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CorporateActionRecord"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false,
    "description": "Most recent reviewed records. Source references are owner/account scoped and immutable."
  },
  "CorporateActionRecord": {
    "type": "object",
    "properties": {
      "actionId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "action": {
        "$ref": "#/components/schemas/CorporateActionInput"
      },
      "effect": {
        "$ref": "#/components/schemas/CorporateActionEffect"
      },
      "state": {
        "type": "string",
        "enum": [
          "APPLIED",
          "NEEDS_REVIEW",
          "REVERSED"
        ]
      },
      "ledgerEventId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "recordedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "replayed": {
        "type": "boolean"
      }
    },
    "required": [
      "actionId",
      "securityName",
      "action",
      "effect",
      "state",
      "ledgerEventId",
      "ledgerRevision",
      "recordedAt",
      "replayed"
    ],
    "additionalProperties": false
  },
  "CsrfInformation": {
    "type": "object",
    "properties": {
      "headerName": {
        "const": "X-CSRF-TOKEN"
      },
      "parameterName": {
        "const": "_csrf"
      },
      "token": {
        "type": "string",
        "minLength": 1,
        "maxLength": 2048
      }
    },
    "required": [
      "headerName",
      "parameterName",
      "token"
    ],
    "additionalProperties": false
  },
  "DecimalString": {
    "type": "string",
    "minLength": 1,
    "maxLength": 80,
    "description": "Exact base-10 decimal; no exponent, separators, or financial JSON numbers.",
    "pattern": "^-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$"
  },
  "Delay": {
    "description": "Delay is source-declared or unknown; FINN receipt time is not evidence of zero upstream delay.",
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "const": "EOD"
          },
          "seconds": {
            "type": "null"
          },
          "basis": {
            "type": "string",
            "enum": [
              "SOURCE_DECLARED",
              "UNKNOWN"
            ]
          }
        },
        "required": [
          "kind",
          "seconds",
          "basis"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "const": "UNKNOWN"
          },
          "seconds": {
            "type": "null"
          },
          "basis": {
            "type": "string",
            "const": "UNKNOWN"
          }
        },
        "required": [
          "kind",
          "seconds",
          "basis"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "kind": {
            "type": "string",
            "const": "DELAYED"
          },
          "seconds": {
            "type": "integer",
            "minimum": 1
          },
          "basis": {
            "type": "string",
            "const": "SOURCE_DECLARED"
          }
        },
        "required": [
          "kind",
          "seconds",
          "basis"
        ],
        "additionalProperties": false
      }
    ]
  },
  "DeriveFinancialFact": {
    "type": "object",
    "properties": {
      "existingFactId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "expectedRevision": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 50
          },
          {
            "type": "null"
          }
        ]
      },
      "operatingCash": {
        "$ref": "#/components/schemas/FinancialOperand"
      },
      "capitalExpenditure": {
        "$ref": "#/components/schemas/FinancialOperand"
      },
      "reviewed": {
        "const": true
      }
    },
    "required": [
      "existingFactId",
      "expectedRevision",
      "operatingCash",
      "capitalExpenditure",
      "reviewed"
    ],
    "additionalProperties": false
  },
  "DiscoveryCompany": {
    "type": "object",
    "properties": {
      "member": {
        "$ref": "#/components/schemas/DiscoveryMember"
      },
      "readings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DiscoveryReading"
        },
        "maxItems": 6
      }
    },
    "required": [
      "member",
      "readings"
    ],
    "additionalProperties": false
  },
  "DiscoveryDirectory": {
    "type": "object",
    "properties": {
      "source": {
        "const": "MANUAL_CURRENT"
      },
      "members": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DiscoveryMember"
        },
        "maxItems": 30
      },
      "metrics": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DiscoveryMetricSupport"
        },
        "maxItems": 6
      }
    },
    "required": [
      "source",
      "members",
      "metrics"
    ],
    "additionalProperties": false
  },
  "DiscoveryMember": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sector": {
        "$ref": "#/components/schemas/DiscoverySector"
      },
      "active": {
        "type": "boolean"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "registeredAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "reviewedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "listingId",
      "sector",
      "active",
      "companyId",
      "name",
      "exchange",
      "symbol",
      "revision",
      "registeredAt",
      "reviewedAt"
    ],
    "additionalProperties": false
  },
  "DiscoveryMemberInput": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sector": {
        "$ref": "#/components/schemas/DiscoverySector"
      },
      "active": {
        "type": "boolean"
      },
      "expectedRevision": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 100
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "listingId",
      "sector",
      "active",
      "expectedRevision"
    ],
    "additionalProperties": false
  },
  "DiscoveryMetric": {
    "type": "string",
    "enum": [
      "REVENUE",
      "PROFIT_AFTER_TAX",
      "EPS_BASIC",
      "OPERATING_MARGIN",
      "FREE_CASH_FLOW",
      "TOTAL_EQUITY"
    ]
  },
  "DiscoveryMetricSupport": {
    "type": "object",
    "properties": {
      "metric": {
        "$ref": "#/components/schemas/DiscoveryMetric"
      },
      "unit": {
        "type": "string",
        "enum": [
          "MONEY",
          "PER_SHARE",
          "PERCENT"
        ]
      },
      "sectors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DiscoverySector"
        },
        "maxItems": 7
      }
    },
    "required": [
      "metric",
      "unit",
      "sectors"
    ],
    "additionalProperties": false
  },
  "DiscoveryPeriod": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "QUARTER",
          "FULL_YEAR"
        ]
      },
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "end": {
        "$ref": "#/components/schemas/SessionDate"
      }
    },
    "required": [
      "kind",
      "start",
      "end"
    ],
    "additionalProperties": false
  },
  "DiscoveryReading": {
    "type": "object",
    "properties": {
      "metric": {
        "$ref": "#/components/schemas/DiscoveryMetric"
      },
      "reason": {
        "type": "string",
        "enum": [
          "PERIOD_OPEN",
          "FACT_MISSING",
          "DIMENSIONS_MISMATCH",
          "PUBLICATION_UNKNOWN",
          "PUBLISHED_AFTER_CUTOFF",
          "PERIOD_PUBLICATION_INVALID",
          "SOURCE_REVISED",
          "DERIVATION_REVIEW_REQUIRED",
          "COMPARABLE_FACT",
          "SECTOR_INELIGIBLE"
        ]
      },
      "fact": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialFact"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "metric",
      "reason",
      "fact"
    ],
    "additionalProperties": false
  },
  "DiscoverySector": {
    "type": "string",
    "enum": [
      "BANKING",
      "FINANCIAL_SERVICES",
      "MANUFACTURING",
      "TECHNOLOGY",
      "CONSUMER",
      "ENERGY",
      "OTHER"
    ]
  },
  "DiscoverySnapshot": {
    "type": "object",
    "properties": {
      "source": {
        "const": "MANUAL_CURRENT"
      },
      "capturedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "period": {
        "$ref": "#/components/schemas/DiscoveryPeriod"
      },
      "companies": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/DiscoveryCompany"
        },
        "maxItems": 30
      }
    },
    "required": [
      "source",
      "capturedAt",
      "period",
      "companies"
    ],
    "additionalProperties": false
  },
  "EventReplay": {
    "type": "object",
    "properties": {
      "mode": {
        "const": "SYNTHETIC_REPLAY"
      },
      "runId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "savedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "events": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "attention": {
              "$ref": "#/components/schemas/AttentionItem"
            },
            "evidence": {
              "$ref": "#/components/schemas/CompanySourceDetail"
            }
          },
          "required": [
            "attention",
            "evidence"
          ],
          "additionalProperties": false
        },
        "maxItems": 25
      },
      "notifications": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "status": {
              "type": "string",
              "enum": [
                "PENDING",
                "DELIVERED",
                "SUPPRESSED",
                "PREVIEWED",
                "FAILED"
              ]
            }
          },
          "required": [
            "title",
            "status"
          ],
          "additionalProperties": false
        },
        "maxItems": 20
      },
      "brief": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PortfolioBrief"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "mode",
      "runId",
      "savedAt",
      "events",
      "notifications",
      "brief"
    ],
    "additionalProperties": false
  },
  "EventSuggestion": {
    "type": "object",
    "properties": {
      "category": {
        "type": "string",
        "enum": [
          "EARNINGS",
          "CAPITAL",
          "GOVERNANCE",
          "CORPORATE_ACTION",
          "OTHER"
        ]
      },
      "subtype": {
        "type": "string",
        "enum": [
          "RESULTS",
          "RESULTS_MEETING",
          "BUYBACK",
          "CAPITAL_RAISE",
          "AUDITOR",
          "GOVERNANCE",
          "DIVIDEND",
          "SPLIT_BONUS",
          "MERGER",
          "OTHER"
        ]
      },
      "stage": {
        "type": "string",
        "enum": [
          "ANNOUNCED",
          "DECIDED",
          "COMPLETED",
          "CANCELLED",
          "UNKNOWN"
        ]
      },
      "materiality": {
        "type": "string",
        "enum": [
          "HIGH",
          "MEDIUM",
          "LOW",
          "UNKNOWN"
        ]
      },
      "novelty": {
        "type": "string",
        "enum": [
          "NEW",
          "FOLLOW_UP",
          "CORRECTION",
          "ROUTINE",
          "UNKNOWN"
        ]
      },
      "confidence": {
        "type": "string",
        "enum": [
          "TITLE_HINT",
          "UNKNOWN"
        ]
      }
    },
    "required": [
      "category",
      "subtype",
      "stage",
      "materiality",
      "novelty",
      "confidence"
    ],
    "additionalProperties": false
  },
  "ExchangeSession": {
    "type": "object",
    "properties": {
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "kind": {
        "type": "string",
        "enum": [
          "HOLIDAY",
          "SPECIAL",
          "WEEKEND",
          "SCHEDULED",
          "UNKNOWN"
        ]
      },
      "label": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sourceUrl": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 400
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "date",
      "kind",
      "label",
      "sourceUrl"
    ],
    "additionalProperties": false
  },
  "FilingRule": {
    "type": "object",
    "properties": {
      "ruleId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "enabled": {
        "type": "boolean"
      },
      "settings": {
        "$ref": "#/components/schemas/FilingRuleSettings"
      }
    },
    "required": [
      "ruleId",
      "revision",
      "enabled",
      "settings"
    ],
    "additionalProperties": false
  },
  "FilingRuleChange": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "enabled": {
        "type": "boolean"
      }
    },
    "required": [
      "expectedRevision",
      "enabled"
    ],
    "additionalProperties": false
  },
  "FilingRuleList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FilingRule"
        },
        "maxItems": 20
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "FilingRuleSettings": {
    "type": "object",
    "properties": {
      "companyId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "category": {
        "type": "string",
        "enum": [
          "ANY",
          "EARNINGS",
          "CAPITAL",
          "GOVERNANCE",
          "CORPORATE_ACTION",
          "OTHER"
        ]
      },
      "minimumMateriality": {
        "type": "string",
        "enum": [
          "ANY",
          "MEDIUM",
          "HIGH"
        ]
      },
      "arrivals": {
        "type": "boolean"
      },
      "dates": {
        "type": "boolean"
      },
      "tentative": {
        "type": "boolean"
      }
    },
    "required": [
      "companyId",
      "title",
      "category",
      "minimumMateriality",
      "arrivals",
      "dates",
      "tentative"
    ],
    "additionalProperties": false
  },
  "FinancialComparison": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "COMPARABLE",
          "INCOMPARABLE"
        ]
      },
      "reason": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "DIFFERENT_REPORTING_BASIS",
              "DIFFERENT_OR_OVERLAPPING_PERIODS",
              "NON_POSITIVE_BASE",
              "PERCENTAGE_POINTS"
            ]
          },
          {
            "type": "null"
          }
        ]
      },
      "current": {
        "$ref": "#/components/schemas/FinancialFact"
      },
      "previous": {
        "$ref": "#/components/schemas/FinancialFact"
      },
      "change": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "percentChange": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "state",
      "reason",
      "current",
      "previous",
      "change",
      "percentChange"
    ],
    "additionalProperties": false
  },
  "FinancialDimensions": {
    "type": "object",
    "properties": {
      "metric": {
        "type": "string",
        "enum": [
          "REVENUE",
          "EBITDA",
          "PROFIT_AFTER_TAX",
          "CASH_FROM_OPERATIONS",
          "CAPITAL_EXPENDITURE",
          "FREE_CASH_FLOW",
          "TOTAL_DEBT",
          "TOTAL_EQUITY",
          "EPS_BASIC",
          "OPERATING_MARGIN"
        ]
      },
      "basis": {
        "type": "string",
        "enum": [
          "STANDALONE",
          "CONSOLIDATED"
        ]
      },
      "periodKind": {
        "type": "string",
        "enum": [
          "QUARTER",
          "YTD",
          "FULL_YEAR",
          "AS_OF"
        ]
      },
      "periodStart": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "periodEnd": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "unit": {
        "type": "string",
        "enum": [
          "MONEY",
          "PER_SHARE",
          "PERCENT"
        ]
      },
      "currency": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "INR",
              "USD",
              "EUR",
              "GBP",
              "JPY"
            ]
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "metric",
      "basis",
      "periodKind",
      "periodStart",
      "periodEnd",
      "unit",
      "currency"
    ],
    "additionalProperties": false
  },
  "FinancialFact": {
    "type": "object",
    "properties": {
      "factId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "dimensions": {
        "$ref": "#/components/schemas/FinancialDimensions"
      },
      "amount": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "normalizedAmount": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "origin": {
        "type": "string",
        "enum": [
          "REPORTED",
          "DERIVED"
        ]
      },
      "anchorId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sourceTitle": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "documentRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "reviewedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "operands": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FinancialOperand"
        },
        "maxItems": 2
      }
    },
    "required": [
      "factId",
      "companyId",
      "revision",
      "dimensions",
      "amount",
      "scale",
      "normalizedAmount",
      "origin",
      "anchorId",
      "sourceTitle",
      "documentRevision",
      "publishedAt",
      "reviewedAt",
      "operands"
    ],
    "additionalProperties": false
  },
  "FinancialFactEdit": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "fact": {
        "$ref": "#/components/schemas/ReportedFactInput"
      }
    },
    "required": [
      "companyId",
      "expectedRevision",
      "fact"
    ],
    "additionalProperties": false
  },
  "FinancialFactHistory": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FinancialFact"
        },
        "maxItems": 50
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "FinancialFactPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FinancialFact"
        },
        "maxItems": 50
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "FinancialOperand": {
    "type": "object",
    "properties": {
      "factId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      }
    },
    "required": [
      "factId",
      "revision"
    ],
    "additionalProperties": false
  },
  "Freshness": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "FRESH",
          "STALE",
          "UNKNOWN",
          "NOT_APPLICABLE"
        ]
      },
      "evaluatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "expectedSessionDate": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "latestSessionDate": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "reasonCode": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "state",
      "evaluatedAt",
      "expectedSessionDate",
      "latestSessionDate",
      "reasonCode"
    ],
    "additionalProperties": false,
    "description": "Calendar-aware age/eligibility assessment. A weekend does not make the newest expected completed session stale. FRESH requires equal known latest/expected sessions."
  },
  "GuidanceCandidates": {
    "type": "object",
    "properties": {
      "evidence": {
        "$ref": "#/components/schemas/ResearchLocation"
      },
      "printedNumbers": {
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 80
        },
        "maxItems": 12
      }
    },
    "required": [
      "evidence",
      "printedNumbers"
    ],
    "additionalProperties": false
  },
  "GuidanceDelivery": {
    "type": "object",
    "properties": {
      "guidanceId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "guidanceRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "asOf": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "state": {
        "type": "string",
        "enum": [
          "MET",
          "MISSED",
          "PARTIAL",
          "WITHDRAWN",
          "REVISED",
          "NOT_DUE",
          "INSUFFICIENT_EVIDENCE"
        ]
      },
      "reason": {
        "type": "string",
        "enum": [
          "PERIOD_OPEN",
          "FACT_MISSING",
          "DIMENSIONS_MISMATCH",
          "PUBLICATION_UNKNOWN",
          "PUBLISHED_AFTER_CUTOFF",
          "PERIOD_PUBLICATION_INVALID",
          "SOURCE_REVISED",
          "DERIVATION_REVIEW_REQUIRED",
          "COMPARABLE_FACT",
          "GUIDANCE_UNCONFIRMED",
          "GUIDANCE_NOT_PUBLISHED",
          "WITHDRAWAL_PUBLISHED",
          "REVISION_PUBLISHED",
          "QUALITATIVE_STATEMENT",
          "OUTCOME_PREDATES_GUIDANCE",
          "INTERIM_YTD_ONLY"
        ]
      },
      "actual": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialFact"
          },
          {
            "type": "null"
          }
        ]
      },
      "successor": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ManagementGuidance"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "guidanceId",
      "guidanceRevision",
      "asOf",
      "state",
      "reason",
      "actual",
      "successor"
    ],
    "additionalProperties": false
  },
  "HistoryCoverage": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "COMPLETE",
          "PARTIAL",
          "UNKNOWN",
          "NONE"
        ]
      },
      "expectedSessions": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 0
          },
          {
            "type": "null"
          }
        ]
      },
      "availableSessions": {
        "type": "integer",
        "minimum": 0
      },
      "missingSessions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/SessionDate"
        },
        "maxItems": 1000
      },
      "reasonCode": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "state",
      "expectedSessions",
      "availableSessions",
      "missingSessions",
      "reasonCode"
    ],
    "additionalProperties": false,
    "description": "Coverage describes the entire requested range at selectionSnapshotId, not this page. COMPLETE requires a verified calendar, equal expected/available counts, and no missing sessions. availableSessions may exceed the current page length."
  },
  "HistoryResponse": {
    "type": "object",
    "properties": {
      "contractVersion": {
        "$ref": "#/components/schemas/ContractVersion"
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listing": {
        "$ref": "#/components/schemas/ListingIdentity"
      },
      "from": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "toExclusive": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "requestedBasis": {
        "$ref": "#/components/schemas/AdjustmentBasis"
      },
      "selectionSnapshotId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "availability": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "NOT_YET_PUBLISHED",
          "NO_TRADE",
          "NOT_COVERED",
          "TEMPORARILY_UNAVAILABLE",
          "INVALID_DATA",
          "UNKNOWN"
        ]
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PriceObservation"
        },
        "maxItems": 1000
      },
      "nextCursor": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          {
            "type": "null"
          }
        ]
      },
      "coverage": {
        "$ref": "#/components/schemas/HistoryCoverage"
      },
      "freshness": {
        "$ref": "#/components/schemas/Freshness"
      },
      "warnings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Warning"
        },
        "maxItems": 32
      }
    },
    "required": [
      "contractVersion",
      "requestId",
      "listing",
      "from",
      "toExclusive",
      "requestedBasis",
      "selectionSnapshotId",
      "availability",
      "items",
      "nextCursor",
      "coverage",
      "freshness",
      "warnings"
    ],
    "additionalProperties": false,
    "description": "Ascending sessionDate/observationId order. ONE_DAY only. Never fill gaps with zero or a silent previous close. Cursors bind listing, range, basis and source-selection snapshot."
  },
  "HoldingsAcceptanceInput": {
    "type": "object",
    "properties": {
      "confirmInr": {
        "const": true
      },
      "retainUnresolvedListings": {
        "const": true
      },
      "acknowledgeDifferences": {
        "type": "boolean"
      },
      "costMode": {
        "type": "string",
        "enum": [
          "UNITS_ONLY",
          "REPORTED_ROW_COST"
        ]
      },
      "expectedLedgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      }
    },
    "required": [
      "confirmInr",
      "retainUnresolvedListings",
      "acknowledgeDifferences",
      "costMode",
      "expectedLedgerRevision"
    ],
    "additionalProperties": false,
    "description": "Explicit review only. Requires current ledger revision and acknowledgement of discrepancies when present. Source IDs are the idempotency boundary; changing an accepted decision conflicts."
  },
  "HoldingsAcceptanceReceipt": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "outcome": {
        "type": "string",
        "enum": [
          "APPLIED",
          "DUPLICATE"
        ]
      },
      "costMode": {
        "type": "string",
        "enum": [
          "UNITS_ONLY",
          "REPORTED_ROW_COST"
        ]
      },
      "acceptedRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "skippedRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "duplicateRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "originalImportId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "replayed": {
        "type": "boolean"
      },
      "acceptedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "importId",
      "outcome",
      "costMode",
      "acceptedRows",
      "skippedRows",
      "duplicateRows",
      "ledgerRevision",
      "originalImportId",
      "replayed",
      "acceptedAt"
    ],
    "additionalProperties": false
  },
  "HoldingsComparison": {
    "type": "object",
    "properties": {
      "field": {
        "type": "string",
        "enum": [
          "BUY_VALUE",
          "CLOSING_VALUE",
          "UNREALISED_PNL"
        ]
      },
      "reported": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "detailSum": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "difference": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "MATCH",
          "MISMATCH",
          "INCOMPLETE"
        ]
      }
    },
    "required": [
      "field",
      "reported",
      "detailSum",
      "difference",
      "status"
    ],
    "additionalProperties": false
  },
  "HoldingsImportList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/HoldingsImportSummary"
        },
        "maxItems": 30
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "HoldingsImportSummary": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "jobId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "state": {
        "type": "string",
        "enum": [
          "QUEUED",
          "RUNNING",
          "SUCCEEDED",
          "FAILED",
          "PARTIALLY_SUCCEEDED",
          "CANCELLED"
        ]
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "sizeBytes": {
        "type": "integer",
        "minimum": 1,
        "maximum": 5242880
      },
      "failureCode": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 64,
            "pattern": "^[A-Z][A-Z0-9_]{0,63}$"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "importId",
      "jobId",
      "state",
      "createdAt",
      "sizeBytes",
      "failureCode"
    ],
    "additionalProperties": false
  },
  "HoldingsPreviewMetadata": {
    "type": "object",
    "properties": {
      "profile": {
        "const": "groww-holdings-xlsx-v1"
      },
      "asOfDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "reportedSummary": {
        "$ref": "#/components/schemas/HoldingsTotals"
      },
      "detailTotals": {
        "$ref": "#/components/schemas/HoldingsTotals"
      },
      "comparisons": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/HoldingsComparison"
        },
        "maxItems": 3,
        "minItems": 3
      },
      "warnings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 32
      },
      "rowCount": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000
      }
    },
    "required": [
      "profile",
      "asOfDate",
      "reportedSummary",
      "detailTotals",
      "comparisons",
      "warnings",
      "rowCount"
    ],
    "additionalProperties": false
  },
  "HoldingsPreviewPage": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "jobId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "ledgerRevisionAtPreview": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "metadata": {
        "$ref": "#/components/schemas/HoldingsPreviewMetadata"
      },
      "rows": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/HoldingsPreviewRow"
        },
        "maxItems": 100
      },
      "nextOffset": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000
          },
          {
            "type": "null"
          }
        ]
      },
      "requiresInrConfirmation": {
        "const": true
      },
      "commitAvailable": {
        "type": "boolean"
      },
      "review": {
        "$ref": "#/components/schemas/HoldingsReviewPlan"
      }
    },
    "required": [
      "importId",
      "jobId",
      "ledgerRevisionAtPreview",
      "metadata",
      "rows",
      "nextOffset",
      "requiresInrConfirmation",
      "commitAvailable",
      "review"
    ],
    "additionalProperties": false,
    "description": "Source summaries and detail totals remain separate. Upload and preview never write the journal. Explicit acceptance is limited to a first closing opening snapshot; later reports remain reconciliation evidence."
  },
  "HoldingsPreviewRow": {
    "type": "object",
    "properties": {
      "source": {
        "$ref": "#/components/schemas/HoldingsSourceRow"
      },
      "matchedSecurityId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "mappingStatus": {
        "type": "string",
        "enum": [
          "UNRESOLVED_SECURITY",
          "EXISTING_SECURITY"
        ]
      }
    },
    "required": [
      "source",
      "matchedSecurityId",
      "mappingStatus"
    ],
    "additionalProperties": false,
    "description": "An exact owned ISIN can identify a security; exchange listing is never inferred."
  },
  "HoldingsReconciliation": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "reportDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "state": {
        "type": "string",
        "enum": [
          "COMPARABLE",
          "HISTORY_UNAVAILABLE"
        ]
      },
      "coverageStart": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "historyStatus": {
        "type": "string",
        "enum": [
          "UNKNOWN",
          "HOLDINGS_ONLY",
          "PARTIAL_TRADES"
        ]
      },
      "rowCount": {
        "type": "integer",
        "minimum": 0,
        "maximum": 2000
      },
      "issueCount": {
        "type": "integer",
        "minimum": 0,
        "maximum": 2000
      },
      "rows": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/HoldingsReconciliationRow"
        },
        "maxItems": 100
      },
      "nextOffset": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 0,
            "maximum": 2000
          },
          {
            "type": "null"
          }
        ]
      },
      "reviewedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "importId",
      "reportDate",
      "ledgerRevision",
      "state",
      "coverageStart",
      "historyStatus",
      "rowCount",
      "issueCount",
      "rows",
      "nextOffset",
      "reviewedAt"
    ],
    "additionalProperties": false,
    "description": "Compare immutable ledger entries effective on or before the report date and accepted through this revision. Report minus recorded deltas are not tax-basis equivalence. No mutation or fabricated earlier positions."
  },
  "HoldingsReconciliationInput": {
    "type": "object",
    "properties": {
      "reviewed": {
        "const": true
      },
      "expectedLedgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      }
    },
    "required": [
      "reviewed",
      "expectedLedgerRevision"
    ],
    "additionalProperties": false
  },
  "HoldingsReconciliationReceipt": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "reviewedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "importId",
      "ledgerRevision",
      "reviewedAt"
    ],
    "additionalProperties": false
  },
  "HoldingsReconciliationRow": {
    "type": "object",
    "properties": {
      "sourceRow": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 12,
            "maximum": 1024
          },
          {
            "type": "null"
          }
        ]
      },
      "securityId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "name": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          {
            "type": "null"
          }
        ]
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "reportedUnits": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedUnits": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "reportedCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unitDifference": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "costDifference": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "issues": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 12
      }
    },
    "required": [
      "sourceRow",
      "securityId",
      "name",
      "isin",
      "reportedUnits",
      "recordedUnits",
      "reportedCost",
      "recordedCost",
      "unitDifference",
      "costDifference",
      "issues"
    ],
    "additionalProperties": false
  },
  "HoldingsReviewPlan": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "READY",
          "ALREADY_ACCEPTED",
          "DUPLICATE",
          "SOURCE_CONFLICT",
          "RECONCILIATION_ONLY",
          "ROWS_BLOCKED",
          "ARCHIVED"
        ]
      },
      "currentLedgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "eligibleRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "duplicateRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "conflictRows": {
        "type": "integer",
        "minimum": 0,
        "maximum": 1000
      },
      "reportedCostAvailable": {
        "type": "boolean"
      },
      "differencesRequireAcknowledgement": {
        "type": "boolean"
      },
      "receipt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/HoldingsAcceptanceReceipt"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "state",
      "currentLedgerRevision",
      "eligibleRows",
      "duplicateRows",
      "conflictRows",
      "reportedCostAvailable",
      "differencesRequireAcknowledgement",
      "receipt"
    ],
    "additionalProperties": false
  },
  "HoldingsRowIssue": {
    "type": "object",
    "properties": {
      "code": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "column": {
        "type": "string",
        "enum": [
          "A",
          "B",
          "C",
          "D",
          "E",
          "F",
          "G",
          "H"
        ]
      },
      "blocksCommit": {
        "type": "boolean"
      }
    },
    "required": [
      "code",
      "column",
      "blocksCommit"
    ],
    "additionalProperties": false
  },
  "HoldingsSourceRow": {
    "type": "object",
    "properties": {
      "rowNumber": {
        "type": "integer",
        "minimum": 12,
        "maximum": 1024
      },
      "reportedName": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          {
            "type": "null"
          }
        ]
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "quantity": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "averageCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "buyValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "closingPrice": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "closingValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unrealisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "issues": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/HoldingsRowIssue"
        },
        "maxItems": 24
      }
    },
    "required": [
      "rowNumber",
      "reportedName",
      "isin",
      "quantity",
      "averageCost",
      "buyValue",
      "closingPrice",
      "closingValue",
      "unrealisedPnl",
      "issues"
    ],
    "additionalProperties": false,
    "description": "Source evidence only. Zero or missing closing price cannot become a market observation. No source account identity is staged."
  },
  "HoldingsTotals": {
    "type": "object",
    "properties": {
      "buyValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "closingValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unrealisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "buyValue",
      "closingValue",
      "unrealisedPnl"
    ],
    "additionalProperties": false
  },
  "ImportTicket": {
    "type": "object",
    "properties": {
      "importId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "jobId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "duplicate": {
        "type": "boolean"
      }
    },
    "required": [
      "importId",
      "jobId",
      "duplicate"
    ],
    "additionalProperties": false,
    "description": "Byte-identical uploads reuse the original and its current job within the same owned account."
  },
  "IndicatorCreate": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "portfolioId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "kind": {
        "type": "string",
        "enum": [
          "VOLUME",
          "ALLOCATION"
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "threshold": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      }
    },
    "required": [
      "listingId",
      "portfolioId",
      "kind",
      "title",
      "threshold"
    ],
    "additionalProperties": false
  },
  "IndicatorEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "threshold": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "enabled": {
        "type": "boolean"
      }
    },
    "required": [
      "expectedRevision",
      "threshold",
      "enabled"
    ],
    "additionalProperties": false
  },
  "IndicatorEvaluation": {
    "type": "object",
    "properties": {
      "evaluationId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "threshold": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "metric": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "baselineStart": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "holdingValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "equityValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "triggered": {
        "type": "boolean"
      },
      "evaluatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "evaluationId",
      "revision",
      "sessionDate",
      "threshold",
      "metric",
      "baselineStart",
      "holdingValue",
      "equityValue",
      "triggered",
      "evaluatedAt"
    ],
    "additionalProperties": false
  },
  "IndicatorEvaluations": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/IndicatorEvaluation"
        },
        "maxItems": 40
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "IndicatorList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/IndicatorRule"
        },
        "maxItems": 50
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "IndicatorRule": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "portfolioId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "kind": {
        "type": "string",
        "enum": [
          "VOLUME",
          "ALLOCATION"
        ]
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "threshold": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "ruleId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "enabled": {
        "type": "boolean"
      },
      "result": {
        "type": "string",
        "enum": [
          "WAITING",
          "INSUFFICIENT_COVERAGE",
          "EVALUATED"
        ]
      },
      "lastSession": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      }
    },
    "required": [
      "listingId",
      "portfolioId",
      "kind",
      "title",
      "threshold",
      "ruleId",
      "revision",
      "enabled",
      "result",
      "lastSession",
      "symbol",
      "exchange"
    ],
    "additionalProperties": false
  },
  "InstrumentPage": {
    "type": "object",
    "properties": {
      "contractVersion": {
        "$ref": "#/components/schemas/ContractVersion"
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ListingIdentity"
        },
        "maxItems": 100
      },
      "nextCursor": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 512
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "contractVersion",
      "requestId",
      "items",
      "nextCursor"
    ],
    "additionalProperties": false
  },
  "InstrumentResult": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "listing": {
            "$ref": "#/components/schemas/ListingIdentity"
          },
          "reasonCode": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "warnings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Warning"
            },
            "maxItems": 32
          },
          "availability": {
            "type": "string",
            "const": "AVAILABLE"
          },
          "observations": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/PriceObservation"
            },
            "maxItems": 1000,
            "minItems": 1
          }
        },
        "required": [
          "listing",
          "reasonCode",
          "warnings",
          "availability",
          "observations"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "listing": {
            "$ref": "#/components/schemas/ListingIdentity"
          },
          "reasonCode": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "warnings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Warning"
            },
            "maxItems": 32
          },
          "availability": {
            "type": "string",
            "enum": [
              "NOT_YET_PUBLISHED",
              "NO_TRADE",
              "NOT_COVERED",
              "TEMPORARILY_UNAVAILABLE",
              "INVALID_DATA",
              "UNKNOWN"
            ]
          },
          "observations": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/PriceObservation"
            },
            "maxItems": 0
          }
        },
        "required": [
          "listing",
          "reasonCode",
          "warnings",
          "availability",
          "observations"
        ],
        "additionalProperties": false
      }
    ]
  },
  "IntegerString": {
    "type": "string",
    "minLength": 1,
    "maxLength": 32,
    "pattern": "^(?:0|[1-9][0-9]*)$"
  },
  "InvestmentAccount": {
    "description": "A source account is a private tracking record, never a broker API connection or trading permission. Creation does not establish history coverage.",
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "accountId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "portfolioId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "source": {
            "type": "string",
            "enum": [
              "GROWW",
              "MANUAL",
              "OTHER"
            ]
          },
          "currency": {
            "const": "INR"
          },
          "historyStatus": {
            "const": "UNKNOWN"
          },
          "historyStartDate": {
            "type": "null"
          }
        },
        "required": [
          "accountId",
          "portfolioId",
          "name",
          "source",
          "currency",
          "historyStatus",
          "historyStartDate"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "accountId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "portfolioId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "name": {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          "source": {
            "type": "string",
            "enum": [
              "GROWW",
              "MANUAL",
              "OTHER"
            ]
          },
          "currency": {
            "const": "INR"
          },
          "historyStatus": {
            "type": "string",
            "enum": [
              "HOLDINGS_ONLY",
              "PARTIAL_TRADES"
            ]
          },
          "historyStartDate": {
            "$ref": "#/components/schemas/SessionDate"
          }
        },
        "required": [
          "accountId",
          "portfolioId",
          "name",
          "source",
          "currency",
          "historyStatus",
          "historyStartDate"
        ],
        "additionalProperties": false
      }
    ]
  },
  "InvestmentTheses": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/InvestmentThesis"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "InvestmentThesis": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "rationale": {
        "type": "string",
        "minLength": 1,
        "maxLength": 2400
      },
      "risks": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1600
      },
      "milestones": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1600
      },
      "decision": {
        "type": "string",
        "enum": [
          "MONITOR",
          "REAFFIRM",
          "REVISE",
          "PAUSE",
          "CLOSE"
        ]
      },
      "decisionNote": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1200,
        "description": "May be blank for MONITOR. Other decisions require a note."
      },
      "review": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewSchedule"
          },
          {
            "type": "null"
          }
        ]
      },
      "anchorIds": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 5
      },
      "thesisId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "reminderId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "savedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "title",
      "rationale",
      "risks",
      "milestones",
      "decision",
      "decisionNote",
      "review",
      "anchorIds",
      "thesisId",
      "companyId",
      "revision",
      "reminderId",
      "savedAt"
    ],
    "additionalProperties": false
  },
  "InvestmentThesisEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "thesis": {
        "$ref": "#/components/schemas/InvestmentThesisInput"
      }
    },
    "required": [
      "expectedRevision",
      "thesis"
    ],
    "additionalProperties": false
  },
  "InvestmentThesisInput": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "rationale": {
        "type": "string",
        "minLength": 1,
        "maxLength": 2400
      },
      "risks": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1600
      },
      "milestones": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1600
      },
      "decision": {
        "type": "string",
        "enum": [
          "MONITOR",
          "REAFFIRM",
          "REVISE",
          "PAUSE",
          "CLOSE"
        ]
      },
      "decisionNote": {
        "type": "string",
        "minLength": 0,
        "maxLength": 1200,
        "description": "May be blank for MONITOR. Other decisions require a note."
      },
      "review": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewSchedule"
          },
          {
            "type": "null"
          }
        ]
      },
      "anchorIds": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 5
      }
    },
    "required": [
      "title",
      "rationale",
      "risks",
      "milestones",
      "decision",
      "decisionNote",
      "review",
      "anchorIds"
    ],
    "additionalProperties": false
  },
  "LedgerCorrectInput": {
    "type": "object",
    "properties": {
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "format": "uuid"
      },
      "replacement": {
        "$ref": "#/components/schemas/LedgerEntryInput"
      },
      "reference": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "idempotencyKey",
      "replacement",
      "reference"
    ],
    "additionalProperties": false
  },
  "LedgerEntryInput": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "BUY",
          "SELL",
          "FEE",
          "DEPOSIT",
          "WITHDRAWAL",
          "OPENING_POSITION",
          "OPENING_CASH"
        ]
      },
      "effectiveDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "securityId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "listingId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "quantity": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "price": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "amount": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "fees": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "reference": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "kind",
      "effectiveDate",
      "securityId",
      "listingId",
      "quantity",
      "price",
      "amount",
      "fees",
      "reference"
    ],
    "additionalProperties": false,
    "description": "Record an already executed transaction or reviewed opening balance. Exact decimal text only. BUY/SELL require security, whole units and price; fees null means unknown. FEE/DEPOSIT/WITHDRAWAL use positive amount. OPENING_POSITION uses quantity plus optional total opening cost in amount. OPENING_CASH uses a nonnegative end-of-day balance. No event executes a trade."
  },
  "LedgerEventView": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": [
          "BUY",
          "SELL",
          "FEE",
          "DEPOSIT",
          "WITHDRAWAL",
          "OPENING_POSITION",
          "OPENING_CASH",
          "SPLIT",
          "BONUS",
          "DIVIDEND",
          "REVERSAL"
        ]
      },
      "effectiveDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "securityId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "listingId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "quantity": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "price": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "amount": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "fees": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 31,
            "pattern": "^(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?$"
          },
          {
            "type": "null"
          }
        ]
      },
      "reference": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      },
      "eventId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sequence": {
        "type": "integer",
        "minimum": 1,
        "maximum": 10000
      },
      "securityName": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      },
      "exchange": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "NSE",
              "BSE"
            ]
          },
          {
            "type": "null"
          }
        ]
      },
      "reversalOf": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "reversedBy": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "replacesEventId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL",
          "GROWW_HOLDINGS",
          "REVIEWED_CORPORATE_ACTION"
        ]
      },
      "sourceReference": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "ratioNumerator": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          {
            "type": "null"
          }
        ]
      },
      "ratioDenominator": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 1000000
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "kind",
      "effectiveDate",
      "securityId",
      "listingId",
      "quantity",
      "price",
      "amount",
      "fees",
      "reference",
      "eventId",
      "sequence",
      "securityName",
      "exchange",
      "reversalOf",
      "reversedBy",
      "replacesEventId",
      "source",
      "sourceReference",
      "recordedAt",
      "ratioNumerator",
      "ratioDenominator"
    ],
    "additionalProperties": false
  },
  "LedgerExportInput": {
    "type": "object",
    "properties": {
      "expectedLedgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      }
    },
    "required": [
      "expectedLedgerRevision"
    ],
    "additionalProperties": false,
    "description": "Export the reviewed current journal revision only. Readable after archive. No credentials, account identity or source workbook bytes are exported."
  },
  "LedgerPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/LedgerEventView"
        },
        "maxItems": 100
      },
      "nextBefore": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 10000
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "items",
      "nextBefore"
    ],
    "additionalProperties": false,
    "description": "Descending account sequence; before is exclusive. Original and reversing records remain visible."
  },
  "LedgerPosition": {
    "type": "object",
    "properties": {
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityName": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      },
      "quantity": {
        "$ref": "#/components/schemas/IntegerString"
      },
      "recordedCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "averageCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "costBasis": {
        "type": "string",
        "enum": [
          "RECORDED_TRADES",
          "REPORTED_OPENING_COST",
          "MIXED_RECORDED_COST",
          "UNKNOWN"
        ]
      }
    },
    "required": [
      "securityId",
      "securityName",
      "quantity",
      "recordedCost",
      "averageCost",
      "costBasis"
    ],
    "additionalProperties": false
  },
  "LedgerReceipt": {
    "type": "object",
    "properties": {
      "commandId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 10000
      },
      "eventIds": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 2,
        "minItems": 1
      },
      "replayed": {
        "type": "boolean"
      }
    },
    "required": [
      "commandId",
      "revision",
      "eventIds",
      "replayed"
    ],
    "additionalProperties": false,
    "description": "Same owner/account key and normalized inputs return the original command and event IDs. Changed inputs conflict. Reversal plus replacement is atomic."
  },
  "LedgerRecordInput": {
    "type": "object",
    "properties": {
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "format": "uuid"
      },
      "event": {
        "$ref": "#/components/schemas/LedgerEntryInput"
      }
    },
    "required": [
      "idempotencyKey",
      "event"
    ],
    "additionalProperties": false
  },
  "LedgerReverseInput": {
    "type": "object",
    "properties": {
      "idempotencyKey": {
        "type": "string",
        "minLength": 1,
        "maxLength": 36,
        "format": "uuid"
      },
      "reference": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 120
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "idempotencyKey",
      "reference"
    ],
    "additionalProperties": false
  },
  "LedgerView": {
    "type": "object",
    "properties": {
      "revision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "calculationVersion": {
        "const": "MOVING_AVERAGE_1"
      },
      "currency": {
        "const": "INR"
      },
      "positions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/LedgerPosition"
        },
        "maxItems": 1000
      },
      "cashBalance": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedCashComponents": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "cashMovementsComplete": {
        "type": "boolean"
      },
      "realisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "knownRealisedPnl": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "recordedFees": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "recordedFeesComplete": {
        "type": "boolean"
      },
      "standaloneFees": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "netContributions": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "cashBaselineDate": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "coverageStart": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "historyStatus": {
        "type": "string",
        "enum": [
          "UNKNOWN",
          "HOLDINGS_ONLY",
          "PARTIAL_TRADES"
        ]
      },
      "warnings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 32
      },
      "recordedDividends": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      }
    },
    "required": [
      "revision",
      "calculationVersion",
      "currency",
      "positions",
      "cashBalance",
      "recordedCashComponents",
      "cashMovementsComplete",
      "realisedPnl",
      "knownRealisedPnl",
      "recordedFees",
      "recordedFeesComplete",
      "standaloneFees",
      "netContributions",
      "cashBaselineDate",
      "coverageStart",
      "historyStatus",
      "warnings",
      "recordedDividends"
    ],
    "additionalProperties": false,
    "description": "Tracked positions and accounting effects, not a full broker balance or tax calculation. Cash requires an explicit baseline and known movements. Coverage is partial; never fabricate past returns. Quantity/cost are by security; valuation needs a separate reviewed listing."
  },
  "ListingIdentity": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "segment": {
        "type": "string",
        "const": "CASH_EQUITY"
      },
      "series": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "currency": {
        "type": "string",
        "const": "INR"
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "listingId",
      "securityId",
      "companyId",
      "exchange",
      "segment",
      "series",
      "symbol",
      "currency",
      "isin"
    ],
    "additionalProperties": false,
    "description": "Stable listing identity. NSE and BSE listings remain distinct even for one security. ISIN may be unknown; ticker is not a permanent identifier."
  },
  "ListingInput": {
    "type": "object",
    "properties": {
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "series": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16,
        "pattern": "^[A-Z0-9_-]{1,16}$"
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[A-Z0-9][A-Z0-9&._-]{0,63}$"
      },
      "providerSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 72
          },
          {
            "type": "null"
          }
        ]
      },
      "validFrom": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "confirmed": {
        "const": true
      }
    },
    "required": [
      "exchange",
      "series",
      "symbol",
      "providerSymbol",
      "validFrom",
      "confirmed"
    ],
    "additionalProperties": false
  },
  "ManagementGuidance": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "kind": {
        "type": "string",
        "enum": [
          "QUALITATIVE",
          "AT_LEAST",
          "AT_MOST",
          "RANGE"
        ]
      },
      "stage": {
        "type": "string",
        "enum": [
          "DRAFT",
          "CONFIRMED",
          "WITHDRAWN"
        ]
      },
      "statementDate": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "dimensions": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialDimensions"
          },
          {
            "type": "null"
          }
        ]
      },
      "lower": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "upper": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "caveats": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1200
      },
      "anchorId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "guidanceId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "savedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "title",
      "kind",
      "stage",
      "statementDate",
      "dimensions",
      "lower",
      "upper",
      "scale",
      "caveats",
      "anchorId",
      "guidanceId",
      "companyId",
      "revision",
      "publishedAt",
      "savedAt"
    ],
    "additionalProperties": false
  },
  "ManagementGuidanceEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "guidance": {
        "$ref": "#/components/schemas/ManagementGuidanceInput"
      }
    },
    "required": [
      "expectedRevision",
      "guidance"
    ],
    "additionalProperties": false
  },
  "ManagementGuidanceInput": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "kind": {
        "type": "string",
        "enum": [
          "QUALITATIVE",
          "AT_LEAST",
          "AT_MOST",
          "RANGE"
        ]
      },
      "stage": {
        "type": "string",
        "enum": [
          "DRAFT",
          "CONFIRMED",
          "WITHDRAWN"
        ]
      },
      "statementDate": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "dimensions": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialDimensions"
          },
          {
            "type": "null"
          }
        ]
      },
      "lower": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "upper": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "caveats": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1200
      },
      "anchorId": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "title",
      "kind",
      "stage",
      "statementDate",
      "dimensions",
      "lower",
      "upper",
      "scale",
      "caveats",
      "anchorId"
    ],
    "additionalProperties": false
  },
  "ManagementGuidanceList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ManagementGuidance"
        },
        "maxItems": 50
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "MarketChart": {
    "type": "object",
    "properties": {
      "range": {
        "$ref": "#/components/schemas/ChartRange"
      },
      "source": {
        "type": "string",
        "enum": [
          "YAHOO_YFINANCE",
          "MANUAL_REVIEWED"
        ]
      },
      "interval": {
        "type": "string",
        "enum": [
          "5M",
          "DAILY"
        ]
      },
      "points": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "date": {
              "$ref": "#/components/schemas/SessionDate"
            },
            "time": {
              "anyOf": [
                {
                  "$ref": "#/components/schemas/UtcInstant"
                },
                {
                  "type": "null"
                }
              ]
            },
            "close": {
              "$ref": "#/components/schemas/PositiveDecimalString"
            }
          },
          "required": [
            "date",
            "time",
            "close"
          ],
          "additionalProperties": false
        },
        "maxItems": 420
      },
      "count": {
        "type": "integer",
        "minimum": 0,
        "maximum": 40000
      },
      "changePercent": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "low": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "high": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "today": {
        "$ref": "#/components/schemas/ExchangeSession"
      },
      "calendarEvents": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ExchangeSession"
        },
        "maxItems": 29
      }
    },
    "required": [
      "range",
      "source",
      "interval",
      "points",
      "count",
      "changePercent",
      "low",
      "high",
      "today",
      "calendarEvents"
    ],
    "additionalProperties": false
  },
  "MarketDiagnostics": {
    "type": "object",
    "properties": {
      "yahooCapability": {
        "type": "string",
        "enum": [
          "DISABLED",
          "CONFIGURATION_REQUIRED",
          "PRIVATE_DAILY"
        ]
      },
      "officialFiles": {
        "type": "string",
        "enum": [
          "UNVERIFIED"
        ]
      },
      "streaming": {
        "type": "string",
        "enum": [
          "UNVERIFIED"
        ]
      },
      "providerDelay": {
        "type": "string",
        "enum": [
          "UNKNOWN"
        ]
      },
      "providerQuota": {
        "type": "string",
        "enum": [
          "UNKNOWN"
        ]
      },
      "lastSuccessfulAcquisition": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "sourceValidationFailuresLastDay": {
        "type": "integer",
        "minimum": 0
      },
      "failedRunsLastDay": {
        "type": "integer",
        "minimum": 0
      },
      "coverage": {
        "$ref": "#/components/schemas/PriceCoverage"
      },
      "quota": {
        "$ref": "#/components/schemas/PriceQuota"
      },
      "recentRuns": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PriceRun"
        },
        "maxItems": 15
      }
    },
    "required": [
      "yahooCapability",
      "officialFiles",
      "streaming",
      "providerDelay",
      "providerQuota",
      "lastSuccessfulAcquisition",
      "sourceValidationFailuresLastDay",
      "failedRunsLastDay",
      "coverage",
      "quota",
      "recentRuns"
    ],
    "additionalProperties": false,
    "description": "Owner-scoped diagnostics. The quota is FINN's application limit and says nothing about the provider's quota."
  },
  "MarketFeed": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "yahoo": {
        "type": "string",
        "enum": [
          "DISABLED",
          "CONFIGURATION_REQUIRED",
          "REVIEWED_MAPPING_REQUIRED",
          "PRIVATE_DAILY"
        ]
      },
      "officialFiles": {
        "type": "string",
        "enum": [
          "UNVERIFIED"
        ]
      },
      "streaming": {
        "type": "string",
        "enum": [
          "UNVERIFIED"
        ]
      },
      "latest": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PrivateClose"
          },
          {
            "type": "null"
          }
        ]
      },
      "latestJobId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "latestJobState": {
        "anyOf": [
          {
            "type": "string",
            "enum": [
              "QUEUED",
              "RUNNING",
              "SUCCEEDED",
              "PARTIALLY_SUCCEEDED",
              "FAILED",
              "CANCELLED"
            ]
          },
          {
            "type": "null"
          }
        ]
      },
      "failureCode": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "lastAttemptAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "acceptedRows": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 0,
            "maximum": 31
          },
          {
            "type": "null"
          }
        ]
      },
      "lastSuccessAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "knownDelaySeconds": {
        "type": "null"
      }
    },
    "required": [
      "listingId",
      "yahoo",
      "officialFiles",
      "streaming",
      "latest",
      "latestJobId",
      "latestJobState",
      "failureCode",
      "lastAttemptAt",
      "acceptedRows",
      "lastSuccessAt",
      "knownDelaySeconds"
    ],
    "additionalProperties": false
  },
  "NonNegativeDecimalString": {
    "type": "string",
    "minLength": 1,
    "maxLength": 80,
    "pattern": "^(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?$"
  },
  "Notification": {
    "type": "object",
    "properties": {
      "activityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "kind": {
        "type": "string",
        "enum": [
          "PRICE_RULE",
          "REVIEW_REMINDER",
          "PORTFOLIO_BRIEF",
          "VOLUME_RULE",
          "ALLOCATION_RULE",
          "COMPANY_EVENT",
          "THESIS_REVIEW"
        ]
      },
      "subjectId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 160
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "readAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "activityId",
      "kind",
      "subjectId",
      "title",
      "createdAt",
      "readAt"
    ],
    "additionalProperties": false
  },
  "NotificationAttempt": {
    "type": "object",
    "properties": {
      "channel": {
        "type": "string",
        "enum": [
          "IN_APP",
          "EMAIL_PREVIEW"
        ]
      },
      "attempt": {
        "type": "integer",
        "minimum": 1,
        "maximum": 3
      },
      "outcome": {
        "type": "string",
        "enum": [
          "DELIVERED",
          "SUPPRESSED",
          "PREVIEWED",
          "RETRY",
          "FAILED"
        ]
      },
      "attemptedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "channel",
      "attempt",
      "outcome",
      "attemptedAt"
    ],
    "additionalProperties": false
  },
  "NotificationDelivery": {
    "type": "object",
    "properties": {
      "channel": {
        "type": "string",
        "enum": [
          "IN_APP",
          "EMAIL_PREVIEW"
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "PENDING",
          "DELIVERED",
          "SUPPRESSED",
          "PREVIEWED",
          "FAILED"
        ]
      },
      "attempts": {
        "type": "integer",
        "minimum": 0,
        "maximum": 3
      },
      "nextAttemptAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "completedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "failureCode": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "channel",
      "status",
      "attempts",
      "nextAttemptAt",
      "completedAt",
      "failureCode"
    ],
    "additionalProperties": false
  },
  "NotificationDeliveryPage": {
    "type": "object",
    "properties": {
      "emailPreviewEnabled": {
        "type": "boolean"
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "activityId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "kind": {
              "type": "string",
              "enum": [
                "PRICE_RULE",
                "REVIEW_REMINDER",
                "PORTFOLIO_BRIEF",
                "VOLUME_RULE",
                "ALLOCATION_RULE",
                "COMPANY_EVENT",
                "THESIS_REVIEW"
              ]
            },
            "delivery": {
              "$ref": "#/components/schemas/NotificationDelivery"
            }
          },
          "required": [
            "activityId",
            "title",
            "kind",
            "delivery"
          ],
          "additionalProperties": false
        },
        "maxItems": 50
      }
    },
    "required": [
      "emailPreviewEnabled",
      "items"
    ],
    "additionalProperties": false
  },
  "NotificationDetail": {
    "type": "object",
    "properties": {
      "notification": {
        "$ref": "#/components/schemas/Notification"
      },
      "price": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PriceEvaluation"
          },
          {
            "type": "null"
          }
        ]
      },
      "reminder": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ReminderEvidence"
          },
          {
            "type": "null"
          }
        ]
      },
      "indicator": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/IndicatorEvaluation"
          },
          {
            "type": "null"
          }
        ]
      },
      "briefId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "companyEvent": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/CompanyEvent"
          },
          {
            "type": "null"
          }
        ]
      },
      "thesisReview": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewLink"
          },
          {
            "type": "null"
          }
        ]
      },
      "deliveries": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NotificationDelivery"
        },
        "maxItems": 2
      },
      "attempts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/NotificationAttempt"
        },
        "maxItems": 6
      }
    },
    "required": [
      "notification",
      "price",
      "reminder",
      "indicator",
      "briefId",
      "companyEvent",
      "thesisReview",
      "deliveries",
      "attempts"
    ],
    "additionalProperties": false
  },
  "NotificationPage": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Notification"
        },
        "maxItems": 40
      },
      "nextBefore": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "items",
      "nextBefore"
    ],
    "additionalProperties": false
  },
  "NotificationRead": {
    "type": "object",
    "properties": {
      "read": {
        "type": "boolean"
      }
    },
    "required": [
      "read"
    ],
    "additionalProperties": false
  },
  "OpaqueId": {
    "type": "string",
    "minLength": 1,
    "maxLength": 128,
    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
  },
  "PeerRanking": {
    "type": "object",
    "properties": {
      "rankingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "runId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "methodology": {
        "const": "within-sector-midrank-v1"
      },
      "sector": {
        "$ref": "#/components/schemas/DiscoverySector"
      },
      "specification": {
        "$ref": "#/components/schemas/PeerRankingSpecification"
      },
      "completePeers": {
        "type": "integer",
        "minimum": 0,
        "maximum": 30
      },
      "rows": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PeerRankingRow"
        },
        "maxItems": 30
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "rankingId",
      "runId",
      "methodology",
      "sector",
      "specification",
      "completePeers",
      "rows",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "PeerRankingContribution": {
    "type": "object",
    "properties": {
      "factor": {
        "$ref": "#/components/schemas/PeerRankingFactor"
      },
      "reason": {
        "type": "string",
        "enum": [
          "PERIOD_OPEN",
          "FACT_MISSING",
          "DIMENSIONS_MISMATCH",
          "PUBLICATION_UNKNOWN",
          "PUBLISHED_AFTER_CUTOFF",
          "PERIOD_PUBLICATION_INVALID",
          "SOURCE_REVISED",
          "DERIVATION_REVIEW_REQUIRED",
          "COMPARABLE_FACT"
        ]
      },
      "fact": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialFact"
          },
          {
            "type": "null"
          }
        ]
      },
      "percentile": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "points": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "relativeWeakness": {
        "type": "boolean"
      }
    },
    "required": [
      "factor",
      "reason",
      "fact",
      "percentile",
      "points",
      "relativeWeakness"
    ],
    "additionalProperties": false
  },
  "PeerRankingFactor": {
    "type": "object",
    "properties": {
      "metric": {
        "$ref": "#/components/schemas/DiscoveryMetric"
      },
      "direction": {
        "type": "string",
        "enum": [
          "HIGHER",
          "LOWER"
        ]
      },
      "weight": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": [
      "metric",
      "direction",
      "weight"
    ],
    "additionalProperties": false
  },
  "PeerRankingIndex": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PeerRankingSummary"
        },
        "maxItems": 120
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "PeerRankingInput": {
    "type": "object",
    "properties": {
      "companyIds": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 30,
        "minItems": 2
      },
      "factors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PeerRankingFactor"
        },
        "maxItems": 6,
        "minItems": 1
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "companyIds",
      "factors",
      "requestId"
    ],
    "additionalProperties": false
  },
  "PeerRankingRow": {
    "type": "object",
    "properties": {
      "member": {
        "$ref": "#/components/schemas/DiscoveryMember"
      },
      "rank": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 1,
            "maximum": 30
          },
          {
            "type": "null"
          }
        ]
      },
      "score": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "status": {
        "type": "string",
        "enum": [
          "RANKED",
          "MISSING_FACTOR",
          "INSUFFICIENT_PEERS"
        ]
      },
      "contributions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PeerRankingContribution"
        },
        "maxItems": 6
      }
    },
    "required": [
      "member",
      "rank",
      "score",
      "status",
      "contributions"
    ],
    "additionalProperties": false
  },
  "PeerRankingSpecification": {
    "type": "object",
    "properties": {
      "companyIds": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 30,
        "minItems": 2
      },
      "factors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PeerRankingFactor"
        },
        "maxItems": 6,
        "minItems": 1
      }
    },
    "required": [
      "companyIds",
      "factors"
    ],
    "additionalProperties": false
  },
  "PeerRankingSummary": {
    "type": "object",
    "properties": {
      "rankingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "rankingId",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "PerformanceFlow": {
    "type": "object",
    "properties": {
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "deposits": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "withdrawals": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "net": {
        "$ref": "#/components/schemas/DecimalString"
      }
    },
    "required": [
      "date",
      "deposits",
      "withdrawals",
      "net"
    ],
    "additionalProperties": false
  },
  "PerformanceSnapshotRef": {
    "type": "object",
    "properties": {
      "accountId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "snapshotId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "value": {
        "$ref": "#/components/schemas/DecimalString"
      }
    },
    "required": [
      "accountId",
      "snapshotId",
      "ledgerRevision",
      "value"
    ],
    "additionalProperties": false
  },
  "PerformanceValuation": {
    "type": "object",
    "properties": {
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "closingValue": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "snapshots": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PerformanceSnapshotRef"
        },
        "maxItems": 100,
        "minItems": 1
      }
    },
    "required": [
      "date",
      "closingValue",
      "snapshots"
    ],
    "additionalProperties": false
  },
  "PortfolioArchiveInput": {
    "type": "object",
    "properties": {
      "archived": {
        "type": "boolean"
      },
      "revision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "archived",
      "revision"
    ],
    "additionalProperties": false
  },
  "PortfolioBrief": {
    "type": "object",
    "properties": {
      "windowStart": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "windowEnd": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "items": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "activityId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "kind": {
              "type": "string",
              "enum": [
                "PRICE_RULE",
                "REVIEW_REMINDER",
                "PORTFOLIO_BRIEF",
                "VOLUME_RULE",
                "ALLOCATION_RULE",
                "COMPANY_EVENT",
                "THESIS_REVIEW"
              ]
            },
            "title": {
              "type": "string",
              "minLength": 1,
              "maxLength": 160
            },
            "createdAt": {
              "$ref": "#/components/schemas/UtcInstant"
            }
          },
          "required": [
            "activityId",
            "kind",
            "title",
            "createdAt"
          ],
          "additionalProperties": false
        },
        "maxItems": 50
      },
      "snapshots": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "snapshotId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "portfolioId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "accountId": {
              "$ref": "#/components/schemas/OpaqueId"
            },
            "accountName": {
              "type": "string",
              "minLength": 1,
              "maxLength": 120
            },
            "sessionDate": {
              "$ref": "#/components/schemas/SessionDate"
            },
            "holdingsValue": {
              "anyOf": [
                {
                  "$ref": "#/components/schemas/DecimalString"
                },
                {
                  "type": "null"
                }
              ]
            },
            "recordedValue": {
              "anyOf": [
                {
                  "$ref": "#/components/schemas/DecimalString"
                },
                {
                  "type": "null"
                }
              ]
            },
            "status": {
              "type": "string",
              "enum": [
                "BEFORE_COVERAGE",
                "PRICES_MISSING",
                "CASH_UNKNOWN",
                "RECORDED_VALUE"
              ]
            }
          },
          "required": [
            "snapshotId",
            "portfolioId",
            "accountId",
            "accountName",
            "sessionDate",
            "holdingsValue",
            "recordedValue",
            "status"
          ],
          "additionalProperties": false
        },
        "maxItems": 50
      },
      "companyEvents": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyEvent"
        },
        "maxItems": 50
      },
      "truncated": {
        "type": "boolean"
      }
    },
    "required": [
      "windowStart",
      "windowEnd",
      "timeZone",
      "items",
      "snapshots",
      "companyEvents",
      "truncated"
    ],
    "additionalProperties": false
  },
  "PortfolioDetail": {
    "type": "object",
    "properties": {
      "portfolio": {
        "$ref": "#/components/schemas/PortfolioSummary"
      },
      "accounts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/InvestmentAccount"
        },
        "maxItems": 100
      }
    },
    "required": [
      "portfolio",
      "accounts"
    ],
    "additionalProperties": false,
    "description": "Archive blocks financial writes and preserves readable account/ledger history. Restore is supported; no deletion is exposed."
  },
  "PortfolioHealth": {
    "type": "object",
    "properties": {
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "asOf": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "priceSession": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "state": {
        "type": "string",
        "enum": [
          "READY",
          "NO_ACCOUNTS",
          "PORTFOLIO_BUDGET",
          "PRICES_MISSING",
          "STALE_PRICES",
          "MIXED_PRICE_SESSIONS"
        ]
      },
      "currency": {
        "const": "INR"
      },
      "unpricedPositions": {
        "type": "integer",
        "minimum": 0,
        "maximum": 500
      },
      "stalePositions": {
        "type": "integer",
        "minimum": 0,
        "maximum": 500
      },
      "providerEstimates": {
        "type": "integer",
        "minimum": 0,
        "maximum": 500
      },
      "equity": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "cash": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "largestWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "topFiveWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "holdings": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortfolioHealthHolding"
        },
        "maxItems": 500
      },
      "sectors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortfolioHealthSector"
        },
        "maxItems": 8
      }
    },
    "required": [
      "portfolioId",
      "asOf",
      "priceSession",
      "state",
      "currency",
      "unpricedPositions",
      "stalePositions",
      "providerEstimates",
      "equity",
      "cash",
      "largestWeight",
      "topFiveWeight",
      "holdings",
      "sectors"
    ],
    "additionalProperties": false
  },
  "PortfolioHealthHolding": {
    "type": "object",
    "properties": {
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sector": {
        "type": "string",
        "enum": [
          "BANKING",
          "FINANCIAL_SERVICES",
          "MANUFACTURING",
          "TECHNOLOGY",
          "CONSUMER",
          "ENERGY",
          "OTHER",
          "UNCLASSIFIED"
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "equityWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unrealisedContribution": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "securityId",
      "name",
      "sector",
      "value",
      "equityWeight",
      "unrealisedContribution"
    ],
    "additionalProperties": false
  },
  "PortfolioHealthSector": {
    "type": "object",
    "properties": {
      "sector": {
        "type": "string",
        "enum": [
          "BANKING",
          "FINANCIAL_SERVICES",
          "MANUFACTURING",
          "TECHNOLOGY",
          "CONSUMER",
          "ENERGY",
          "OTHER",
          "UNCLASSIFIED"
        ]
      },
      "value": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "equityWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "sector",
      "value",
      "equityWeight"
    ],
    "additionalProperties": false
  },
  "PortfolioInput": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      }
    },
    "required": [
      "name"
    ],
    "additionalProperties": false
  },
  "PortfolioList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortfolioSummary"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false,
    "description": "Includes active and archived portfolios. At most 100 may be created per owner in this supported scope."
  },
  "PortfolioPerformance": {
    "type": "object",
    "properties": {
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "end": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "currency": {
        "const": "INR"
      },
      "methodology": {
        "const": "cash-flow-returns-v1"
      },
      "coverage": {
        "type": "string",
        "enum": [
          "HISTORY_UNREVIEWED",
          "NO_ACCOUNTS",
          "PORTFOLIO_BUDGET",
          "CASH_HISTORY_INCOMPLETE",
          "NEGATIVE_CASH_BALANCE",
          "NEW_OPENING_BALANCE",
          "ENDPOINT_VALUATIONS_MISSING",
          "REVIEWED_WINDOW"
        ]
      },
      "opening": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PerformanceValuation"
          },
          {
            "type": "null"
          }
        ]
      },
      "closing": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PerformanceValuation"
          },
          {
            "type": "null"
          }
        ]
      },
      "flowValuations": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PerformanceValuation"
        },
        "maxItems": 366
      },
      "externalFlows": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PerformanceFlow"
        },
        "maxItems": 366
      },
      "recordedDividends": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "investmentResult": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "xirr": {
        "$ref": "#/components/schemas/ReturnMeasure"
      },
      "timeWeighted": {
        "$ref": "#/components/schemas/ReturnMeasure"
      },
      "benchmark": {
        "const": "NO_COMPATIBLE_BENCHMARK"
      }
    },
    "required": [
      "portfolioId",
      "start",
      "end",
      "currency",
      "methodology",
      "coverage",
      "opening",
      "closing",
      "flowValuations",
      "externalFlows",
      "recordedDividends",
      "investmentResult",
      "xirr",
      "timeWeighted",
      "benchmark"
    ],
    "additionalProperties": false
  },
  "PortfolioPerformanceInput": {
    "type": "object",
    "properties": {
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "end": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "reviewed": {
        "type": "boolean"
      }
    },
    "required": [
      "start",
      "end",
      "reviewed"
    ],
    "additionalProperties": false
  },
  "PortfolioRisk": {
    "type": "object",
    "properties": {
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "end": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "methodology": {
        "const": "weekly-linked-risk-v1"
      },
      "state": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "UNAVAILABLE"
        ]
      },
      "reason": {
        "type": "string",
        "enum": [
          "HISTORY_UNREVIEWED",
          "NO_ACCOUNTS",
          "PORTFOLIO_BUDGET",
          "CASH_HISTORY_INCOMPLETE",
          "NEGATIVE_CASH_BALANCE",
          "NEW_OPENING_BALANCE",
          "ENDPOINT_VALUATIONS_MISSING",
          "REVIEWED_WINDOW",
          "CALCULATED",
          "WEEKLY_VALUATIONS_MISSING",
          "FLOW_DAY_VALUATION_MISSING",
          "NON_POSITIVE_BASE"
        ]
      },
      "maxDrawdownPercent": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "annualizedVolatilityPercent": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "observations": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PortfolioRiskObservation"
        },
        "maxItems": 53
      }
    },
    "required": [
      "portfolioId",
      "start",
      "end",
      "methodology",
      "state",
      "reason",
      "maxDrawdownPercent",
      "annualizedVolatilityPercent",
      "observations"
    ],
    "additionalProperties": false
  },
  "PortfolioRiskObservation": {
    "type": "object",
    "properties": {
      "date": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "indexValue": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      }
    },
    "required": [
      "date",
      "indexValue"
    ],
    "additionalProperties": false
  },
  "PortfolioScenario": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "cashAllocation": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "shockPercent": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "state": {
        "type": "string",
        "enum": [
          "SIMULATED",
          "NO_ACCOUNTS",
          "PORTFOLIO_BUDGET",
          "PRICES_MISSING",
          "STALE_PRICES",
          "MIXED_PRICE_SESSIONS",
          "CASH_UNKNOWN",
          "INSUFFICIENT_CASH",
          "TARGET_NOT_HELD"
        ]
      },
      "priceSession": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "targetName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "beforeEquity": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "afterEquity": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "beforeCash": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "afterCash": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "beforeTotal": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "afterTotal": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "beforeTargetWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "afterTargetWeight": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "valueChange": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "listingId",
      "cashAllocation",
      "shockPercent",
      "portfolioId",
      "state",
      "priceSession",
      "targetName",
      "beforeEquity",
      "afterEquity",
      "beforeCash",
      "afterCash",
      "beforeTotal",
      "afterTotal",
      "beforeTargetWeight",
      "afterTargetWeight",
      "valueChange"
    ],
    "additionalProperties": false
  },
  "PortfolioScenarioInput": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "cashAllocation": {
        "$ref": "#/components/schemas/NonNegativeDecimalString"
      },
      "shockPercent": {
        "$ref": "#/components/schemas/DecimalString"
      }
    },
    "required": [
      "listingId",
      "cashAllocation",
      "shockPercent"
    ],
    "additionalProperties": false
  },
  "PortfolioSummary": {
    "type": "object",
    "properties": {
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "currency": {
        "const": "INR"
      },
      "archived": {
        "type": "boolean"
      },
      "revision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "portfolioId",
      "name",
      "currency",
      "archived",
      "revision"
    ],
    "additionalProperties": false
  },
  "PortfolioValuation": {
    "type": "object",
    "properties": {
      "portfolioId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "asOf": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "currency": {
        "type": "string",
        "const": "INR"
      },
      "accounts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/AccountValuationTotal"
        },
        "maxItems": 100
      },
      "totals": {
        "$ref": "#/components/schemas/ValuationTotals"
      }
    },
    "required": [
      "portfolioId",
      "asOf",
      "currency",
      "accounts",
      "totals"
    ],
    "additionalProperties": false
  },
  "PositiveDecimalString": {
    "type": "string",
    "minLength": 1,
    "maxLength": 80,
    "description": "A present traded price must be positive. Missing price is not zero.",
    "pattern": "^(?:[1-9][0-9]*(?:\\.[0-9]+)?|0\\.[0-9]*[1-9][0-9]*)$"
  },
  "Preferences": {
    "type": "object",
    "properties": {
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "currency": {
        "const": "INR"
      },
      "inAppNotifications": {
        "type": "boolean"
      },
      "emailNotifications": {
        "type": "boolean"
      },
      "revision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      },
      "deliveryAvailable": {
        "const": true
      }
    },
    "required": [
      "timeZone",
      "currency",
      "inAppNotifications",
      "emailNotifications",
      "revision",
      "deliveryAvailable"
    ],
    "additionalProperties": false,
    "description": "In-app delivery is enabled. An optional email preview is configured separately."
  },
  "PreferencesUpdate": {
    "type": "object",
    "properties": {
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "currency": {
        "const": "INR"
      },
      "inAppNotifications": {
        "type": "boolean"
      },
      "emailNotifications": {
        "type": "boolean"
      },
      "revision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 9007199254740991
      }
    },
    "required": [
      "timeZone",
      "currency",
      "inAppNotifications",
      "emailNotifications",
      "revision"
    ],
    "additionalProperties": false,
    "description": "Owner comes only from the authenticated session. Revision prevents silent lost updates. Only supported IANA zone IDs are accepted by Java."
  },
  "PriceBasis": {
    "type": "object",
    "properties": {
      "ohlcPrice": {
        "$ref": "#/components/schemas/AdjustmentBasis"
      },
      "adjustedClose": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/AdjustmentBasis"
          },
          {
            "type": "null"
          }
        ]
      },
      "volume": {
        "type": "string",
        "enum": [
          "AS_REPORTED",
          "SPLIT_ADJUSTED",
          "PROVIDER_DEFINED",
          "UNKNOWN"
        ]
      },
      "adjustmentAsOf": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "ohlcPrice",
      "adjustedClose",
      "volume",
      "adjustmentAsOf"
    ],
    "additionalProperties": false
  },
  "PriceCoverage": {
    "type": "object",
    "properties": {
      "trackedListings": {
        "type": "integer",
        "minimum": 0
      },
      "withClose": {
        "type": "integer",
        "minimum": 0
      },
      "recentClose": {
        "type": "integer",
        "minimum": 0
      }
    },
    "required": [
      "trackedListings",
      "withClose",
      "recentClose"
    ],
    "additionalProperties": false
  },
  "PriceEvaluation": {
    "type": "object",
    "properties": {
      "evaluationId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "outcome": {
        "type": "string",
        "enum": [
          "TRIGGERED",
          "BELOW_OR_ABOVE_RESET",
          "NO_MATCH",
          "INSUFFICIENT_HISTORY",
          "COOLDOWN",
          "ALREADY_LATCHED"
        ]
      },
      "evaluatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "observation": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/AlertCloseEvidence"
          },
          {
            "type": "null"
          }
        ]
      },
      "previous": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/AlertCloseEvidence"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "evaluationId",
      "revision",
      "sessionDate",
      "outcome",
      "evaluatedAt",
      "observation",
      "previous"
    ],
    "additionalProperties": false
  },
  "PriceEvaluationReport": {
    "type": "object",
    "properties": {
      "status": {
        "type": "string",
        "enum": [
          "PAUSED",
          "EXPIRED",
          "WAITING_FOR_PRICE",
          "STALE",
          "EVALUATED",
          "INSUFFICIENT_HISTORY"
        ]
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PriceEvaluation"
        },
        "maxItems": 50
      }
    },
    "required": [
      "status",
      "items"
    ],
    "additionalProperties": false
  },
  "PriceFetchQueued": {
    "type": "object",
    "properties": {
      "jobId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "endExclusive": {
        "$ref": "#/components/schemas/SessionDate"
      }
    },
    "required": [
      "jobId",
      "start",
      "endExclusive"
    ],
    "additionalProperties": false
  },
  "PriceFetchWindow": {
    "type": "object",
    "properties": {
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "endExclusive": {
        "$ref": "#/components/schemas/SessionDate"
      }
    },
    "required": [
      "start",
      "endExclusive"
    ],
    "additionalProperties": false
  },
  "PriceObservation": {
    "type": "object",
    "properties": {
      "observationId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listing": {
        "$ref": "#/components/schemas/ListingIdentity"
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "interval": {
        "type": "string",
        "const": "ONE_DAY"
      },
      "open": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "high": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "low": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "close": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "adjustedClose": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PositiveDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "volume": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/IntegerString"
          },
          {
            "type": "null"
          }
        ]
      },
      "turnover": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/NonNegativeDecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "basis": {
        "$ref": "#/components/schemas/PriceBasis"
      },
      "finality": {
        "type": "string",
        "enum": [
          "FINAL",
          "PROVISIONAL",
          "UNKNOWN"
        ]
      },
      "provenance": {
        "$ref": "#/components/schemas/Provenance"
      }
    },
    "required": [
      "observationId",
      "listing",
      "sessionDate",
      "interval",
      "open",
      "high",
      "low",
      "close",
      "adjustedClose",
      "volume",
      "turnover",
      "basis",
      "finality",
      "provenance"
    ],
    "additionalProperties": false,
    "description": "One present EOD observation. A missing close is represented by unavailable result and no observation. Partial OHLC/volume stay null. As-traded and adjusted series are never interchangeable."
  },
  "PriceQuota": {
    "type": "object",
    "properties": {
      "requestsLastHour": {
        "type": "integer",
        "minimum": 0
      },
      "hourlyLimit": {
        "type": "integer",
        "minimum": 0
      },
      "remaining": {
        "type": "integer",
        "minimum": 0
      },
      "pending": {
        "type": "integer",
        "minimum": 0
      },
      "pendingLimit": {
        "type": "integer",
        "minimum": 0
      },
      "status": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "HOURLY_LIMIT_REACHED",
          "PENDING_LIMIT_REACHED"
        ]
      }
    },
    "required": [
      "requestsLastHour",
      "hourlyLimit",
      "remaining",
      "pending",
      "pendingLimit",
      "status"
    ],
    "additionalProperties": false
  },
  "PriceRule": {
    "type": "object",
    "properties": {
      "ruleId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "settings": {
        "$ref": "#/components/schemas/PriceRuleSettings"
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "ruleId",
      "revision",
      "settings",
      "exchange",
      "symbol",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "PriceRuleEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "settings": {
        "$ref": "#/components/schemas/PriceRuleSettings"
      }
    },
    "required": [
      "expectedRevision",
      "settings"
    ],
    "additionalProperties": false
  },
  "PriceRuleList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PriceRule"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "PriceRuleSettings": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_REVIEWED",
          "YAHOO_YFINANCE"
        ]
      },
      "comparison": {
        "type": "string",
        "enum": [
          "ABOVE",
          "BELOW",
          "CROSS_ABOVE",
          "CROSS_BELOW",
          "MOVE_UP",
          "MOVE_DOWN"
        ]
      },
      "threshold": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "maxAgeDays": {
        "type": "integer",
        "minimum": 1,
        "maximum": 4
      },
      "cooldownMinutes": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10080
      },
      "rearm": {
        "type": "boolean"
      },
      "enabled": {
        "type": "boolean"
      },
      "expiresOn": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "listingId",
      "name",
      "source",
      "comparison",
      "threshold",
      "maxAgeDays",
      "cooldownMinutes",
      "rearm",
      "enabled",
      "expiresOn"
    ],
    "additionalProperties": false
  },
  "PriceRun": {
    "type": "object",
    "properties": {
      "jobId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 72
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "state": {
        "type": "string",
        "enum": [
          "QUEUED",
          "RUNNING",
          "SUCCEEDED",
          "PARTIALLY_SUCCEEDED",
          "FAILED",
          "CANCELLED"
        ]
      },
      "failureCode": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "updatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "rowsReturned": {
        "anyOf": [
          {
            "type": "integer",
            "minimum": 0,
            "maximum": 31
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "jobId",
      "listingId",
      "symbol",
      "exchange",
      "state",
      "failureCode",
      "updatedAt",
      "rowsReturned"
    ],
    "additionalProperties": false
  },
  "PrivateClose": {
    "type": "object",
    "properties": {
      "observationId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_REVIEWED",
          "YAHOO_YFINANCE"
        ]
      },
      "priceBasis": {
        "type": "string",
        "enum": [
          "AS_REPORTED_EXCHANGE",
          "PROVIDER_DEFINED"
        ]
      },
      "currency": {
        "type": "string",
        "const": "INR"
      },
      "close": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "sourceReference": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "receivedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "freshness": {
        "type": "string",
        "enum": [
          "STALE",
          "DELAY_UNKNOWN"
        ]
      }
    },
    "required": [
      "observationId",
      "listingId",
      "sessionDate",
      "source",
      "priceBasis",
      "currency",
      "close",
      "sourceReference",
      "receivedAt",
      "freshness"
    ],
    "additionalProperties": false,
    "description": "Owner-only completed-session close. Receipt time is not trade time; staleness is a conservative calendar-day label."
  },
  "PrivateCloseHistory": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "endExclusive": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "observations": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/PrivateClose"
        },
        "maxItems": 180
      }
    },
    "required": [
      "listingId",
      "start",
      "endExclusive",
      "observations"
    ],
    "additionalProperties": false
  },
  "Problem": {
    "type": "object",
    "properties": {
      "type": {
        "type": "string",
        "minLength": 1,
        "maxLength": 256,
        "format": "uri"
      },
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "status": {
        "type": "integer",
        "minimum": 400,
        "maximum": 599
      },
      "detail": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      },
      "instance": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      },
      "code": {
        "type": "string",
        "enum": [
          "MALFORMED_REQUEST",
          "VALIDATION_FAILED",
          "AUTHENTICATION_REQUIRED",
          "RESOURCE_NOT_FOUND",
          "OPERATION_FORBIDDEN",
          "CONFLICT",
          "RATE_LIMITED",
          "DATA_SOURCE_UNAVAILABLE",
          "INTERNAL_ERROR"
        ]
      },
      "traceId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "errors": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ProblemField"
        },
        "maxItems": 100
      }
    },
    "required": [
      "type",
      "title",
      "status",
      "detail",
      "instance",
      "code",
      "traceId"
    ],
    "additionalProperties": false,
    "description": "RFC9457 problem response. Do not expose stack traces, private rows, tokens, or upstream cookies."
  },
  "ProblemField": {
    "type": "object",
    "properties": {
      "field": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "code": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "field",
      "code"
    ],
    "additionalProperties": false
  },
  "Provenance": {
    "type": "object",
    "properties": {
      "provider": {
        "$ref": "#/components/schemas/Provider"
      },
      "providerInstrumentId": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "mappingVersion": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "adapterVersion": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "sourceName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 128
      },
      "sourceLocator": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 2048,
            "format": "uri"
          },
          {
            "type": "null"
          }
        ]
      },
      "artifactSha256": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 64,
            "pattern": "^[a-f0-9]{64}$"
          },
          {
            "type": "null"
          }
        ]
      },
      "sourceRevision": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "parserVersion": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "sourceTimezone": {
        "type": "string",
        "const": "Asia/Kolkata"
      },
      "times": {
        "$ref": "#/components/schemas/SourceTimes"
      },
      "delay": {
        "$ref": "#/components/schemas/Delay"
      },
      "rights": {
        "$ref": "#/components/schemas/Rights"
      },
      "quality": {
        "type": "string",
        "enum": [
          "VALIDATED",
          "REVIEW_REQUIRED"
        ]
      },
      "qualityFlags": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/OpaqueId"
        },
        "maxItems": 32
      }
    },
    "required": [
      "provider",
      "providerInstrumentId",
      "mappingVersion",
      "adapterVersion",
      "sourceName",
      "sourceLocator",
      "artifactSha256",
      "sourceRevision",
      "parserVersion",
      "sourceTimezone",
      "times",
      "delay",
      "rights",
      "quality",
      "qualityFlags"
    ],
    "additionalProperties": false,
    "description": "No personal local paths, credentials, cookies, private object URLs, or source payloads in public provenance."
  },
  "Provider": {
    "type": "string",
    "enum": [
      "SYNTHETIC",
      "YAHOO_YFINANCE",
      "NSE_EOD_FILE",
      "BSE_EOD_FILE"
    ]
  },
  "ProviderCapabilities": {
    "type": "object",
    "properties": {
      "contractVersion": {
        "$ref": "#/components/schemas/ContractVersion"
      },
      "provider": {
        "$ref": "#/components/schemas/Provider"
      },
      "adapterVersion": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "evaluatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "capabilities": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/Capability"
        },
        "maxItems": 8,
        "minItems": 8
      },
      "rights": {
        "$ref": "#/components/schemas/Rights"
      }
    },
    "required": [
      "contractVersion",
      "provider",
      "adapterVersion",
      "evaluatedAt",
      "capabilities",
      "rights"
    ],
    "additionalProperties": false,
    "description": "Exactly one entry per declared capability; uniqueness/completeness are semantic checks."
  },
  "ProviderStatus": {
    "type": "object",
    "properties": {
      "provider": {
        "$ref": "#/components/schemas/Provider"
      },
      "health": {
        "type": "string",
        "enum": [
          "HEALTHY",
          "DEGRADED",
          "UNAVAILABLE",
          "UNTESTED"
        ]
      },
      "checkedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "lastSuccessfulAcquisitionAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "reasonCode": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "capabilities": {
        "$ref": "#/components/schemas/ProviderCapabilities"
      }
    },
    "required": [
      "provider",
      "health",
      "checkedAt",
      "lastSuccessfulAcquisitionAt",
      "reasonCode",
      "capabilities"
    ],
    "additionalProperties": false,
    "description": "Operational status is distinct from market-data freshness. No service SLA or live exchange certification is implied."
  },
  "ProviderStatusPage": {
    "type": "object",
    "properties": {
      "contractVersion": {
        "$ref": "#/components/schemas/ContractVersion"
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ProviderStatus"
        },
        "maxItems": 4
      }
    },
    "required": [
      "contractVersion",
      "requestId",
      "items"
    ],
    "additionalProperties": false
  },
  "QuoteResponse": {
    "description": "Latest eligible stored EOD observation, not a tick or a promised live quote. Unavailability is a normal domain result; service/auth failures use Problem.",
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "listing": {
            "$ref": "#/components/schemas/ListingIdentity"
          },
          "freshness": {
            "$ref": "#/components/schemas/Freshness"
          },
          "selectionReason": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "warnings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Warning"
            },
            "maxItems": 32
          },
          "availability": {
            "type": "string",
            "const": "AVAILABLE"
          },
          "observation": {
            "$ref": "#/components/schemas/PriceObservation"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "listing",
          "freshness",
          "selectionReason",
          "warnings",
          "availability",
          "observation"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "listing": {
            "$ref": "#/components/schemas/ListingIdentity"
          },
          "freshness": {
            "$ref": "#/components/schemas/Freshness"
          },
          "selectionReason": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "warnings": {
            "type": "array",
            "items": {
              "$ref": "#/components/schemas/Warning"
            },
            "maxItems": 32
          },
          "availability": {
            "type": "string",
            "enum": [
              "NOT_YET_PUBLISHED",
              "NO_TRADE",
              "NOT_COVERED",
              "TEMPORARILY_UNAVAILABLE",
              "INVALID_DATA",
              "UNKNOWN"
            ]
          },
          "observation": {
            "type": "null"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "listing",
          "freshness",
          "selectionReason",
          "warnings",
          "availability",
          "observation"
        ],
        "additionalProperties": false
      }
    ]
  },
  "ReminderEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "settings": {
        "$ref": "#/components/schemas/ReminderSettings"
      }
    },
    "required": [
      "expectedRevision",
      "settings"
    ],
    "additionalProperties": false
  },
  "ReminderEvidence": {
    "type": "object",
    "properties": {
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "dueAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "deliverAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "revision",
      "dueAt",
      "deliverAt"
    ],
    "additionalProperties": false
  },
  "ReminderList": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ReviewReminder"
        },
        "maxItems": 50
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "ReminderScheduleChange": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "snoozeUntil": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 16,
            "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "expectedRevision",
      "snoozeUntil"
    ],
    "additionalProperties": false
  },
  "ReminderSettings": {
    "type": "object",
    "properties": {
      "title": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "scheduledLocal": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16,
        "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"
      },
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "recurrence": {
        "type": "string",
        "enum": [
          "ONCE",
          "DAILY",
          "WEEKLY"
        ]
      },
      "quietStart": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 5,
            "pattern": "^[0-9]{2}:[0-9]{2}$"
          },
          {
            "type": "null"
          }
        ]
      },
      "quietEnd": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 5,
            "pattern": "^[0-9]{2}:[0-9]{2}$"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "title",
      "scheduledLocal",
      "timeZone",
      "recurrence",
      "quietStart",
      "quietEnd"
    ],
    "additionalProperties": false
  },
  "ReportedFactInput": {
    "type": "object",
    "properties": {
      "dimensions": {
        "$ref": "#/components/schemas/FinancialDimensions"
      },
      "anchorId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "amount": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "reviewed": {
        "const": true
      }
    },
    "required": [
      "dimensions",
      "anchorId",
      "amount",
      "scale",
      "reviewed"
    ],
    "additionalProperties": false
  },
  "ResearchExtraction": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "LINK_ONLY",
          "NOT_STARTED",
          "QUEUED",
          "RUNNING",
          "READY",
          "PARTIAL",
          "NO_TEXT",
          "UNSUPPORTED",
          "FAILED",
          "CANCELLED"
        ]
      },
      "reason": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "jobId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "canRequest": {
        "type": "boolean"
      },
      "totalPages": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "pages": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "page": {
              "type": "integer",
              "minimum": 1,
              "maximum": 20
            },
            "state": {
              "type": "string",
              "enum": [
                "TEXT",
                "TRUNCATED",
                "NO_TEXT",
                "UNREADABLE"
              ]
            }
          },
          "required": [
            "page",
            "state"
          ],
          "additionalProperties": false
        },
        "maxItems": 20
      }
    },
    "required": [
      "state",
      "reason",
      "jobId",
      "canRequest",
      "totalPages",
      "pages"
    ],
    "additionalProperties": false
  },
  "ResearchLocation": {
    "type": "object",
    "properties": {
      "anchorId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "documentId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "documentRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      },
      "sourceTitle": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "sourceName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "page": {
        "type": "integer",
        "minimum": 1,
        "maximum": 20
      },
      "lineStart": {
        "type": "integer",
        "minimum": 1,
        "maximum": 600
      },
      "lineEnd": {
        "type": "integer",
        "minimum": 1,
        "maximum": 600
      },
      "kind": {
        "type": "string",
        "enum": [
          "PASSAGE",
          "TABLE_ROW"
        ]
      },
      "quote": {
        "type": "string",
        "minLength": 1,
        "maxLength": 4000
      },
      "cells": {
        "type": "array",
        "items": {
          "type": "string",
          "minLength": 1,
          "maxLength": 400
        },
        "maxItems": 12
      }
    },
    "required": [
      "anchorId",
      "companyId",
      "documentId",
      "documentRevision",
      "sourceTitle",
      "sourceName",
      "publishedAt",
      "page",
      "lineStart",
      "lineEnd",
      "kind",
      "quote",
      "cells"
    ],
    "additionalProperties": false
  },
  "ResearchLocations": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ResearchLocation"
        },
        "maxItems": 40
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "ResearchPdfDiscard": {
    "type": "object",
    "properties": {
      "fileId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "discarded": {
        "const": true
      }
    },
    "required": [
      "fileId",
      "discarded"
    ],
    "additionalProperties": false
  },
  "ResearchPdfUpload": {
    "type": "object",
    "properties": {
      "fileId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "checksum": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[0-9a-f]{64}$"
      }
    },
    "required": [
      "fileId",
      "checksum"
    ],
    "additionalProperties": false
  },
  "ResearchReport": {
    "type": "object",
    "properties": {
      "reportId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "question": {
        "type": "string",
        "minLength": 1,
        "maxLength": 320
      },
      "asOf": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "state": {
        "type": "string",
        "enum": [
          "PENDING",
          "EVIDENCE",
          "INSUFFICIENT",
          "CONFLICTING_CONTEXT",
          "LOCAL_RANKED",
          "MODEL_FALLBACK"
        ]
      },
      "modelName": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 100
          },
          {
            "type": "null"
          }
        ]
      },
      "policyVersion": {
        "type": "string",
        "minLength": 1,
        "maxLength": 30
      },
      "version": {
        "type": "integer",
        "minimum": 1,
        "maximum": 500
      },
      "previousReportId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "current": {
        "type": "boolean"
      },
      "citations": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ResearchLocation"
        },
        "maxItems": 3
      },
      "facts": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/FinancialFact"
        },
        "maxItems": 12
      },
      "feedback": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ResearchReportFeedback"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "reportId",
      "companyId",
      "question",
      "asOf",
      "state",
      "modelName",
      "policyVersion",
      "version",
      "previousReportId",
      "current",
      "citations",
      "facts",
      "feedback"
    ],
    "additionalProperties": false
  },
  "ResearchReportCapabilities": {
    "type": "object",
    "properties": {
      "localRanking": {
        "type": "boolean"
      }
    },
    "required": [
      "localRanking"
    ],
    "additionalProperties": false
  },
  "ResearchReportFeedback": {
    "type": "object",
    "properties": {
      "note": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "note",
      "anchorId",
      "recordedAt"
    ],
    "additionalProperties": false
  },
  "ResearchReportFeedbackInput": {
    "type": "object",
    "properties": {
      "note": {
        "type": "string",
        "minLength": 1,
        "maxLength": 500
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "note",
      "anchorId"
    ],
    "additionalProperties": false
  },
  "ResearchReportHistory": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ResearchReportSummary"
        },
        "maxItems": 20
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "ResearchReportInput": {
    "type": "object",
    "properties": {
      "question": {
        "type": "string",
        "minLength": 1,
        "maxLength": 320
      },
      "rankLocally": {
        "type": "boolean"
      }
    },
    "required": [
      "question",
      "rankLocally"
    ],
    "additionalProperties": false
  },
  "ResearchReportSummary": {
    "type": "object",
    "properties": {
      "reportId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "question": {
        "type": "string",
        "minLength": 1,
        "maxLength": 320
      },
      "asOf": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "version": {
        "type": "integer",
        "minimum": 1,
        "maximum": 500
      }
    },
    "required": [
      "reportId",
      "question",
      "asOf",
      "version"
    ],
    "additionalProperties": false
  },
  "ResearchSearchResult": {
    "type": "object",
    "properties": {
      "documents": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanySource"
        },
        "maxItems": 20
      },
      "passages": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ResearchLocation"
        },
        "maxItems": 20
      },
      "moreDocuments": {
        "type": "boolean"
      },
      "morePassages": {
        "type": "boolean"
      }
    },
    "required": [
      "documents",
      "passages",
      "moreDocuments",
      "morePassages"
    ],
    "additionalProperties": false
  },
  "ResearchTextPage": {
    "type": "object",
    "properties": {
      "page": {
        "type": "integer",
        "minimum": 1,
        "maximum": 20
      },
      "state": {
        "type": "string",
        "enum": [
          "TEXT",
          "TRUNCATED",
          "NO_TEXT",
          "UNREADABLE"
        ]
      },
      "content": {
        "type": "string",
        "minLength": 0,
        "maxLength": 60000
      }
    },
    "required": [
      "page",
      "state",
      "content"
    ],
    "additionalProperties": false
  },
  "ReturnMeasure": {
    "type": "object",
    "properties": {
      "state": {
        "type": "string",
        "enum": [
          "AVAILABLE",
          "UNAVAILABLE"
        ]
      },
      "reason": {
        "type": "string",
        "enum": [
          "HISTORY_UNREVIEWED",
          "NO_ACCOUNTS",
          "PORTFOLIO_BUDGET",
          "CASH_HISTORY_INCOMPLETE",
          "NEGATIVE_CASH_BALANCE",
          "NEW_OPENING_BALANCE",
          "ENDPOINT_VALUATIONS_MISSING",
          "REVIEWED_WINDOW",
          "CALCULATED",
          "FLOW_DAY_VALUATION_MISSING",
          "NON_POSITIVE_BASE",
          "CASH_FLOW_SIGNS",
          "AMBIGUOUS_CASH_FLOWS",
          "OUTSIDE_SOLVER_RANGE"
        ]
      },
      "percent": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "state",
      "reason",
      "percent"
    ],
    "additionalProperties": false
  },
  "ReviewCloseInput": {
    "type": "object",
    "properties": {
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "close": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "sourceReference": {
        "type": "string",
        "minLength": 1,
        "maxLength": 240
      },
      "reviewed": {
        "type": "boolean",
        "const": true
      }
    },
    "required": [
      "sessionDate",
      "close",
      "sourceReference",
      "reviewed"
    ],
    "additionalProperties": false
  },
  "ReviewReminder": {
    "type": "object",
    "properties": {
      "reminderId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 1000000
      },
      "state": {
        "type": "string",
        "enum": [
          "ACTIVE",
          "CANCELLED",
          "COMPLETED"
        ]
      },
      "settings": {
        "$ref": "#/components/schemas/ReminderSettings"
      },
      "nextAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "reminderId",
      "revision",
      "state",
      "settings",
      "nextAt"
    ],
    "additionalProperties": false
  },
  "Rights": {
    "description": "A routing restriction, not a legal entitlement. Public real-data distribution is outside this contract's validated modes.",
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "policyId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "reviewedAt": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "retentionUntil": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "attribution": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              {
                "type": "null"
              }
            ]
          },
          "mode": {
            "type": "string",
            "const": "SYNTHETIC_PUBLIC_DEMO"
          },
          "reviewStatus": {
            "type": "string",
            "const": "VERIFIED"
          },
          "publicDisplayAllowed": {
            "type": "boolean",
            "const": true
          },
          "externalAiAllowed": {
            "type": "boolean",
            "const": false
          }
        },
        "required": [
          "policyId",
          "reviewedAt",
          "retentionUntil",
          "attribution",
          "mode",
          "reviewStatus",
          "publicDisplayAllowed",
          "externalAiAllowed"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "policyId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "reviewedAt": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "retentionUntil": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "attribution": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              {
                "type": "null"
              }
            ]
          },
          "mode": {
            "type": "string",
            "const": "PRIVATE_PERSONAL"
          },
          "reviewStatus": {
            "type": "string",
            "const": "VERIFIED"
          },
          "publicDisplayAllowed": {
            "type": "boolean",
            "const": false
          },
          "externalAiAllowed": {
            "type": "boolean",
            "const": false
          }
        },
        "required": [
          "policyId",
          "reviewedAt",
          "retentionUntil",
          "attribution",
          "mode",
          "reviewStatus",
          "publicDisplayAllowed",
          "externalAiAllowed"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "policyId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "reviewedAt": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "retentionUntil": {
            "anyOf": [
              {
                "$ref": "#/components/schemas/UtcInstant"
              },
              {
                "type": "null"
              }
            ]
          },
          "attribution": {
            "anyOf": [
              {
                "type": "string",
                "minLength": 1,
                "maxLength": 512
              },
              {
                "type": "null"
              }
            ]
          },
          "mode": {
            "type": "string",
            "const": "RESTRICTED_UNVERIFIED"
          },
          "reviewStatus": {
            "type": "string",
            "const": "UNVERIFIED"
          },
          "publicDisplayAllowed": {
            "type": "boolean",
            "const": false
          },
          "externalAiAllowed": {
            "type": "boolean",
            "const": false
          }
        },
        "required": [
          "policyId",
          "reviewedAt",
          "retentionUntil",
          "attribution",
          "mode",
          "reviewStatus",
          "publicDisplayAllowed",
          "externalAiAllowed"
        ],
        "additionalProperties": false
      }
    ]
  },
  "SecurityInput": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "confirmed": {
        "const": true
      }
    },
    "required": [
      "companyId",
      "name",
      "isin",
      "confirmed"
    ],
    "additionalProperties": false
  },
  "SessionDate": {
    "type": "string",
    "minLength": 1,
    "maxLength": 10,
    "format": "date",
    "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}$"
  },
  "SessionResponse": {
    "oneOf": [
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "authenticated": {
            "const": true
          },
          "user": {
            "$ref": "#/components/schemas/UserProfile"
          },
          "csrf": {
            "$ref": "#/components/schemas/CsrfInformation"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "authenticated",
          "user",
          "csrf"
        ],
        "additionalProperties": false
      },
      {
        "type": "object",
        "properties": {
          "contractVersion": {
            "$ref": "#/components/schemas/ContractVersion"
          },
          "requestId": {
            "$ref": "#/components/schemas/OpaqueId"
          },
          "authenticated": {
            "const": false
          },
          "user": {
            "type": "null"
          },
          "csrf": {
            "$ref": "#/components/schemas/CsrfInformation"
          }
        },
        "required": [
          "contractVersion",
          "requestId",
          "authenticated",
          "user",
          "csrf"
        ],
        "additionalProperties": false
      }
    ]
  },
  "SourceTimes": {
    "type": "object",
    "properties": {
      "observedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "publishedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "providerAvailableAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "firstSeenAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "ingestedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "acceptedAt": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/UtcInstant"
          },
          {
            "type": "null"
          }
        ]
      },
      "unknownTimeReasons": {
        "type": "array",
        "items": {
          "type": "string",
          "enum": [
            "OBSERVATION_TIME_NOT_PROVIDED",
            "PUBLICATION_TIME_NOT_PROVIDED",
            "PROVIDER_AVAILABILITY_TIME_NOT_PROVIDED",
            "NOT_YET_INGESTED",
            "NOT_YET_ACCEPTED"
          ]
        },
        "maxItems": 5
      }
    },
    "required": [
      "observedAt",
      "publishedAt",
      "providerAvailableAt",
      "firstSeenAt",
      "ingestedAt",
      "acceptedAt",
      "unknownTimeReasons"
    ],
    "additionalProperties": false,
    "description": "Source and FINN processing times are distinct. Null timestamps require matching unknownTimeReasons; checked by semantic validation."
  },
  "StagedResearchPdf": {
    "type": "object",
    "properties": {
      "fileId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "checksum": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[0-9a-f]{64}$"
      },
      "stagedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "fileId",
      "checksum",
      "stagedAt"
    ],
    "additionalProperties": false
  },
  "StagedResearchPdfs": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StagedResearchPdf"
        },
        "maxItems": 30
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "StockLookupOpened": {
    "type": "object",
    "properties": {
      "listing": {
        "$ref": "#/components/schemas/CatalogueListing"
      },
      "refreshStatus": {
        "type": "string",
        "enum": [
          "QUEUED",
          "RECENT",
          "UNAVAILABLE"
        ]
      }
    },
    "required": [
      "listing",
      "refreshStatus"
    ],
    "additionalProperties": false
  },
  "StockLookupResults": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockSuggestion"
        },
        "maxItems": 10
      },
      "status": {
        "type": "string",
        "enum": [
          "READY",
          "UNAVAILABLE"
        ]
      }
    },
    "required": [
      "items",
      "status"
    ],
    "additionalProperties": false
  },
  "StockLookupSelection": {
    "type": "object",
    "properties": {
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[A-Z0-9][A-Z0-9&._-]{0,63}$"
      }
    },
    "required": [
      "exchange",
      "symbol"
    ],
    "additionalProperties": false
  },
  "StockScreen": {
    "type": "object",
    "properties": {
      "screenId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "definition": {
        "$ref": "#/components/schemas/StockScreenInput"
      },
      "savedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "screenId",
      "revision",
      "definition",
      "savedAt"
    ],
    "additionalProperties": false
  },
  "StockScreenCheck": {
    "type": "object",
    "properties": {
      "filter": {
        "$ref": "#/components/schemas/StockScreenFilter"
      },
      "state": {
        "type": "string",
        "enum": [
          "PASS",
          "FAIL",
          "UNKNOWN"
        ]
      },
      "reason": {
        "type": "string",
        "enum": [
          "PERIOD_OPEN",
          "FACT_MISSING",
          "DIMENSIONS_MISMATCH",
          "PUBLICATION_UNKNOWN",
          "PUBLISHED_AFTER_CUTOFF",
          "PERIOD_PUBLICATION_INVALID",
          "SOURCE_REVISED",
          "DERIVATION_REVIEW_REQUIRED",
          "COMPARABLE_FACT"
        ]
      },
      "fact": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialFact"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "filter",
      "state",
      "reason",
      "fact"
    ],
    "additionalProperties": false
  },
  "StockScreenEdit": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "screen": {
        "$ref": "#/components/schemas/StockScreenInput"
      }
    },
    "required": [
      "expectedRevision",
      "screen"
    ],
    "additionalProperties": false
  },
  "StockScreenFilter": {
    "type": "object",
    "properties": {
      "metric": {
        "$ref": "#/components/schemas/DiscoveryMetric"
      },
      "comparator": {
        "type": "string",
        "enum": [
          "GTE",
          "LTE"
        ]
      },
      "amount": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      }
    },
    "required": [
      "metric",
      "comparator",
      "amount",
      "scale"
    ],
    "additionalProperties": false
  },
  "StockScreenHistory": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockScreenRunSummary"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "StockScreenIndex": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockScreen"
        },
        "maxItems": 100
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "StockScreenInput": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      },
      "sector": {
        "$ref": "#/components/schemas/DiscoverySector"
      },
      "period": {
        "$ref": "#/components/schemas/DiscoveryPeriod"
      },
      "filters": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockScreenFilter"
        },
        "maxItems": 6,
        "minItems": 1
      }
    },
    "required": [
      "name",
      "sector",
      "period",
      "filters"
    ],
    "additionalProperties": false
  },
  "StockScreenResult": {
    "type": "object",
    "properties": {
      "member": {
        "$ref": "#/components/schemas/DiscoveryMember"
      },
      "state": {
        "type": "string",
        "enum": [
          "MATCH",
          "EXCLUDED",
          "UNKNOWN",
          "OUTSIDE_SECTOR"
        ]
      },
      "checks": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockScreenCheck"
        },
        "maxItems": 6
      }
    },
    "required": [
      "member",
      "state",
      "checks"
    ],
    "additionalProperties": false
  },
  "StockScreenRun": {
    "type": "object",
    "properties": {
      "runId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "screen": {
        "$ref": "#/components/schemas/StockScreen"
      },
      "methodology": {
        "const": "absolute-thresholds-v1"
      },
      "inputs": {
        "$ref": "#/components/schemas/DiscoverySnapshot"
      },
      "results": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/StockScreenResult"
        },
        "maxItems": 30
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "runId",
      "screen",
      "methodology",
      "inputs",
      "results",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "StockScreenRunInput": {
    "type": "object",
    "properties": {
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "requestId": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "revision",
      "requestId"
    ],
    "additionalProperties": false
  },
  "StockScreenRunSummary": {
    "type": "object",
    "properties": {
      "runId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "runId",
      "revision",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "StockSuggestion": {
    "type": "object",
    "properties": {
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[A-Z0-9][A-Z0-9&._-]{0,63}$"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "series": {
        "type": "string",
        "minLength": 1,
        "maxLength": 16,
        "pattern": "^[A-Z0-9_-]{1,16}$"
      },
      "isin": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 12,
            "pattern": "^[A-Z]{2}[A-Z0-9]{9}[0-9]$"
          },
          {
            "type": "null"
          }
        ]
      },
      "validFrom": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "source": {
        "type": "string",
        "enum": [
          "NSE_DIRECTORY",
          "YAHOO_DISCOVERY"
        ]
      }
    },
    "required": [
      "exchange",
      "symbol",
      "name",
      "series",
      "isin",
      "validFrom",
      "source"
    ],
    "additionalProperties": false
  },
  "SymbolHistory": {
    "type": "object",
    "properties": {
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "validFrom": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "validTo": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/SessionDate"
          },
          {
            "type": "null"
          }
        ]
      },
      "source": {
        "type": "string",
        "enum": [
          "MANUAL_USER",
          "NSE_DIRECTORY",
          "YAHOO_DISCOVERY"
        ]
      }
    },
    "required": [
      "symbol",
      "validFrom",
      "validTo",
      "source"
    ],
    "additionalProperties": false
  },
  "SymbolHistoryList": {
    "type": "array",
    "items": {
      "$ref": "#/components/schemas/SymbolHistory"
    },
    "maxItems": 100
  },
  "SymbolInput": {
    "type": "object",
    "properties": {
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64,
        "pattern": "^[A-Z0-9][A-Z0-9&._-]{0,63}$"
      },
      "providerSymbol": {
        "anyOf": [
          {
            "type": "string",
            "minLength": 1,
            "maxLength": 72
          },
          {
            "type": "null"
          }
        ]
      },
      "effectiveDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "confirmed": {
        "const": true
      }
    },
    "required": [
      "symbol",
      "providerSymbol",
      "effectiveDate",
      "confirmed"
    ],
    "additionalProperties": false
  },
  "ThesisCondition": {
    "type": "object",
    "properties": {
      "definition": {
        "$ref": "#/components/schemas/ThesisConditionDefinition"
      },
      "lastCheck": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisConditionCheck"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "definition",
      "lastCheck"
    ],
    "additionalProperties": false
  },
  "ThesisConditionCheck": {
    "type": "object",
    "properties": {
      "checkId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "thesisRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "state": {
        "type": "string",
        "enum": [
          "MATCHED",
          "VIOLATED",
          "UNKNOWN",
          "REVIEW_NEEDED"
        ]
      },
      "reason": {
        "type": "string",
        "enum": [
          "PERIOD_OPEN",
          "FACT_MISSING",
          "DIMENSIONS_MISMATCH",
          "PUBLICATION_UNKNOWN",
          "PUBLISHED_AFTER_CUTOFF",
          "PERIOD_PUBLICATION_INVALID",
          "SOURCE_REVISED",
          "DERIVATION_REVIEW_REQUIRED",
          "COMPARABLE_FACT"
        ]
      },
      "fact": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/FinancialFact"
          },
          {
            "type": "null"
          }
        ]
      },
      "evaluatedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "checkId",
      "thesisRevision",
      "state",
      "reason",
      "fact",
      "evaluatedAt"
    ],
    "additionalProperties": false
  },
  "ThesisConditionDefinition": {
    "type": "object",
    "properties": {
      "label": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "dimensions": {
        "$ref": "#/components/schemas/FinancialDimensions"
      },
      "comparator": {
        "type": "string",
        "enum": [
          "GTE",
          "LTE"
        ]
      },
      "threshold": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "conditionId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "thesisRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "retired": {
        "type": "boolean"
      }
    },
    "required": [
      "label",
      "dimensions",
      "comparator",
      "threshold",
      "scale",
      "conditionId",
      "thesisRevision",
      "retired"
    ],
    "additionalProperties": false
  },
  "ThesisConditionInput": {
    "type": "object",
    "properties": {
      "label": {
        "type": "string",
        "minLength": 1,
        "maxLength": 100
      },
      "dimensions": {
        "$ref": "#/components/schemas/FinancialDimensions"
      },
      "comparator": {
        "type": "string",
        "enum": [
          "GTE",
          "LTE"
        ]
      },
      "threshold": {
        "$ref": "#/components/schemas/DecimalString"
      },
      "scale": {
        "type": "string",
        "enum": [
          "ONES",
          "THOUSAND",
          "LAKH",
          "MILLION",
          "CRORE",
          "BILLION"
        ]
      },
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      }
    },
    "required": [
      "label",
      "dimensions",
      "comparator",
      "threshold",
      "scale",
      "expectedRevision"
    ],
    "additionalProperties": false
  },
  "ThesisConditions": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ThesisCondition"
        },
        "maxItems": 20
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "ThesisReview": {
    "type": "object",
    "properties": {
      "reviewId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "thesis": {
        "$ref": "#/components/schemas/InvestmentThesis"
      },
      "event": {
        "$ref": "#/components/schemas/CompanyEvent"
      },
      "relation": {
        "type": "string",
        "enum": [
          "CONTEXT",
          "SUPPORTS",
          "CHALLENGES"
        ]
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "condition": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisConditionCheck"
          },
          {
            "type": "null"
          }
        ]
      },
      "guidance": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewGuidance"
          },
          {
            "type": "null"
          }
        ]
      },
      "decision": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewDecision"
          },
          {
            "type": "null"
          }
        ]
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "reviewId",
      "thesis",
      "event",
      "relation",
      "anchorId",
      "condition",
      "guidance",
      "decision",
      "createdAt"
    ],
    "additionalProperties": false
  },
  "ThesisReviewDecision": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "REAFFIRM",
          "REVISE",
          "PAUSE",
          "CLOSE",
          "DISMISS"
        ]
      },
      "note": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1200
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "decidedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "action",
      "note",
      "anchorId",
      "decidedAt"
    ],
    "additionalProperties": false
  },
  "ThesisReviewDecisionInput": {
    "type": "object",
    "properties": {
      "action": {
        "type": "string",
        "enum": [
          "REAFFIRM",
          "REVISE",
          "PAUSE",
          "CLOSE",
          "DISMISS"
        ]
      },
      "note": {
        "type": "string",
        "minLength": 1,
        "maxLength": 1200
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "action",
      "note",
      "anchorId"
    ],
    "additionalProperties": false
  },
  "ThesisReviewGuidance": {
    "type": "object",
    "properties": {
      "statement": {
        "$ref": "#/components/schemas/ManagementGuidance"
      },
      "outcome": {
        "$ref": "#/components/schemas/GuidanceDelivery"
      }
    },
    "required": [
      "statement",
      "outcome"
    ],
    "additionalProperties": false
  },
  "ThesisReviewGuidanceRef": {
    "type": "object",
    "properties": {
      "id": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "revision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 50
      }
    },
    "required": [
      "id",
      "revision"
    ],
    "additionalProperties": false
  },
  "ThesisReviewIndex": {
    "type": "object",
    "properties": {
      "suggestions": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/CompanyEvent"
        },
        "maxItems": 10
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ThesisReviewSummary"
        },
        "maxItems": 20
      },
      "hasMore": {
        "type": "boolean"
      }
    },
    "required": [
      "suggestions",
      "items",
      "hasMore"
    ],
    "additionalProperties": false
  },
  "ThesisReviewInput": {
    "type": "object",
    "properties": {
      "expectedRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "eventVersionId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "relation": {
        "type": "string",
        "enum": [
          "CONTEXT",
          "SUPPORTS",
          "CHALLENGES"
        ]
      },
      "anchorId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "conditionCheckId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "guidance": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/ThesisReviewGuidanceRef"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "expectedRevision",
      "eventVersionId",
      "relation",
      "anchorId",
      "conditionCheckId",
      "guidance"
    ],
    "additionalProperties": false
  },
  "ThesisReviewLink": {
    "type": "object",
    "properties": {
      "companyId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "thesisId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "reviewId": {
        "$ref": "#/components/schemas/OpaqueId"
      }
    },
    "required": [
      "companyId",
      "thesisId",
      "reviewId"
    ],
    "additionalProperties": false
  },
  "ThesisReviewSchedule": {
    "type": "object",
    "properties": {
      "scheduledLocal": {
        "type": "string",
        "minLength": 1,
        "maxLength": 256,
        "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$"
      },
      "timeZone": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      }
    },
    "required": [
      "scheduledLocal",
      "timeZone"
    ],
    "additionalProperties": false
  },
  "ThesisReviewSummary": {
    "type": "object",
    "properties": {
      "reviewId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "thesisRevision": {
        "type": "integer",
        "minimum": 1,
        "maximum": 100
      },
      "eventTitle": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "createdAt": {
        "$ref": "#/components/schemas/UtcInstant"
      },
      "decided": {
        "type": "boolean"
      }
    },
    "required": [
      "reviewId",
      "thesisRevision",
      "eventTitle",
      "createdAt",
      "decided"
    ],
    "additionalProperties": false
  },
  "UserProfile": {
    "type": "object",
    "properties": {
      "userId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "displayName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      }
    },
    "required": [
      "userId",
      "displayName"
    ],
    "additionalProperties": false,
    "description": "Application identity only. Provider claims, subject, tokens and secrets are never serialized here."
  },
  "UtcInstant": {
    "type": "string",
    "minLength": 1,
    "maxLength": 27,
    "description": "UTC RFC3339 instant. A session date must not be expanded into a fabricated observation time.",
    "format": "date-time",
    "pattern": "^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\\.[0-9]{1,6})?Z$"
  },
  "ValuationListing": {
    "type": "object",
    "properties": {
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "listingId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "allowProviderEstimate": {
        "type": "boolean"
      }
    },
    "required": [
      "securityId",
      "listingId",
      "allowProviderEstimate"
    ],
    "additionalProperties": false
  },
  "ValuationPoint": {
    "type": "object",
    "properties": {
      "snapshotId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "sessionDate": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "ledgerRevision": {
        "type": "integer",
        "minimum": 0,
        "maximum": 10000
      },
      "calculationVersion": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "priceBasis": {
        "type": "string",
        "const": "AS_REPORTED_EXCHANGE"
      },
      "status": {
        "type": "string",
        "enum": [
          "BEFORE_COVERAGE",
          "PRICES_MISSING",
          "CASH_UNKNOWN",
          "RECORDED_VALUE"
        ]
      },
      "holdingsValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "cashBalance": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedAt": {
        "$ref": "#/components/schemas/UtcInstant"
      }
    },
    "required": [
      "snapshotId",
      "sessionDate",
      "ledgerRevision",
      "calculationVersion",
      "priceBasis",
      "status",
      "holdingsValue",
      "cashBalance",
      "recordedValue",
      "recordedAt"
    ],
    "additionalProperties": false,
    "description": "Immutable dated valuation. Missing compatible prices or cash remain null."
  },
  "ValuationSeries": {
    "type": "object",
    "properties": {
      "start": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "endExclusive": {
        "$ref": "#/components/schemas/SessionDate"
      },
      "points": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/ValuationPoint"
        },
        "maxItems": 90
      }
    },
    "required": [
      "start",
      "endExclusive",
      "points"
    ],
    "additionalProperties": false
  },
  "ValuationSnapshotDetail": {
    "type": "object",
    "properties": {
      "snapshot": {
        "$ref": "#/components/schemas/ValuationPoint"
      },
      "valuation": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/AccountValuation"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "snapshot",
      "valuation"
    ],
    "additionalProperties": false
  },
  "ValuationTotals": {
    "type": "object",
    "properties": {
      "positions": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100000
      },
      "priced": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100000
      },
      "stalePrices": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100000
      },
      "providerEstimates": {
        "type": "integer",
        "minimum": 0,
        "maximum": 100000
      },
      "knownHoldingsValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "holdingsValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "knownUnrealisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unrealisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "cashBalance": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "portfolioValue": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "realisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedFees": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedDividends": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "netContributions": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "recordedFeesComplete": {
        "type": "boolean"
      }
    },
    "required": [
      "positions",
      "priced",
      "stalePrices",
      "providerEstimates",
      "knownHoldingsValue",
      "holdingsValue",
      "knownUnrealisedPnl",
      "unrealisedPnl",
      "cashBalance",
      "portfolioValue",
      "realisedPnl",
      "recordedFees",
      "recordedDividends",
      "netContributions",
      "recordedFeesComplete"
    ],
    "additionalProperties": false,
    "description": "Totals cover recorded positions and cash only; unknown components stay null. Contributions are not gains."
  },
  "ValuedHolding": {
    "type": "object",
    "properties": {
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "quantity": {
        "$ref": "#/components/schemas/PositiveDecimalString"
      },
      "recordedCost": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "listingId": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/OpaqueId"
          },
          {
            "type": "null"
          }
        ]
      },
      "allowProviderEstimate": {
        "type": "boolean"
      },
      "observation": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PrivateClose"
          },
          {
            "type": "null"
          }
        ]
      },
      "value": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "unrealisedPnl": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/DecimalString"
          },
          {
            "type": "null"
          }
        ]
      },
      "priceStatus": {
        "type": "string",
        "enum": [
          "LISTING_REQUIRED",
          "PRICE_UNAVAILABLE",
          "STALE",
          "DELAY_UNKNOWN"
        ]
      }
    },
    "required": [
      "securityId",
      "securityName",
      "quantity",
      "recordedCost",
      "listingId",
      "allowProviderEstimate",
      "observation",
      "value",
      "unrealisedPnl",
      "priceStatus"
    ],
    "additionalProperties": false
  },
  "Warning": {
    "type": "object",
    "properties": {
      "code": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "message": {
        "type": "string",
        "minLength": 1,
        "maxLength": 512
      }
    },
    "required": [
      "code",
      "message"
    ],
    "additionalProperties": false
  },
  "WatchlistDetail": {
    "type": "object",
    "properties": {
      "watchlist": {
        "$ref": "#/components/schemas/WatchlistSummary"
      },
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/WatchlistItem"
        },
        "maxItems": 100
      }
    },
    "required": [
      "watchlist",
      "items"
    ],
    "additionalProperties": false
  },
  "WatchlistIndex": {
    "type": "object",
    "properties": {
      "items": {
        "type": "array",
        "items": {
          "$ref": "#/components/schemas/WatchlistSummary"
        },
        "maxItems": 20
      }
    },
    "required": [
      "items"
    ],
    "additionalProperties": false
  },
  "WatchlistItem": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "securityName": {
        "type": "string",
        "minLength": 1,
        "maxLength": 120
      },
      "exchange": {
        "type": "string",
        "enum": [
          "NSE",
          "BSE"
        ]
      },
      "symbol": {
        "type": "string",
        "minLength": 1,
        "maxLength": 64
      },
      "latest": {
        "anyOf": [
          {
            "$ref": "#/components/schemas/PrivateClose"
          },
          {
            "type": "null"
          }
        ]
      }
    },
    "required": [
      "listingId",
      "securityId",
      "securityName",
      "exchange",
      "symbol",
      "latest"
    ],
    "additionalProperties": false
  },
  "WatchlistName": {
    "type": "object",
    "properties": {
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      }
    },
    "required": [
      "name"
    ],
    "additionalProperties": false
  },
  "WatchlistSummary": {
    "type": "object",
    "properties": {
      "watchlistId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "name": {
        "type": "string",
        "minLength": 1,
        "maxLength": 80
      }
    },
    "required": [
      "watchlistId",
      "name"
    ],
    "additionalProperties": false
  },
  "WatchlistTrack": {
    "type": "object",
    "properties": {
      "listingId": {
        "$ref": "#/components/schemas/OpaqueId"
      },
      "tracked": {
        "type": "boolean"
      }
    },
    "required": [
      "listingId",
      "tracked"
    ],
    "additionalProperties": false
  }
} as const;
