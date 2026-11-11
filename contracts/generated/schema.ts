// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
export const contractMetadata = {
  "contractVersion": "0.13.0",
  "openapiVersion": "3.1.1",
  "source": "finn-backend/contracts/public-api/openapi.json",
  "sourceSha256": "53ea66221cd9703d9069b03800bb4ab52df80343a561faaca78e661c1e3f89fa",
  "schemaNames": [
    "AccountInput",
    "AcquisitionEnvelope",
    "AdjustmentBasis",
    "AsyncJobStatus",
    "Capability",
    "CatalogueCompanies",
    "CatalogueCompany",
    "CatalogueListing",
    "CatalogueSecurity",
    "CatalogueSecurityDetail",
    "CatalogueSecurityPage",
    "CompanyInput",
    "ContractVersion",
    "CorporateActionApproval",
    "CorporateActionEffect",
    "CorporateActionInput",
    "CorporateActionList",
    "CorporateActionRecord",
    "CsrfInformation",
    "DecimalString",
    "Delay",
    "Freshness",
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
    "InstrumentPage",
    "InstrumentResult",
    "IntegerString",
    "InvestmentAccount",
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
    "MarketFeed",
    "NonNegativeDecimalString",
    "OpaqueId",
    "PortfolioArchiveInput",
    "PortfolioDetail",
    "PortfolioInput",
    "PortfolioList",
    "PortfolioSummary",
    "PositiveDecimalString",
    "Preferences",
    "PreferencesUpdate",
    "PriceBasis",
    "PriceFetchQueued",
    "PriceFetchWindow",
    "PriceObservation",
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
    "ReviewCloseInput",
    "Rights",
    "SecurityInput",
    "SessionDate",
    "SessionResponse",
    "SourceTimes",
    "SymbolHistory",
    "SymbolHistoryList",
    "SymbolInput",
    "UserProfile",
    "UtcInstant",
    "Warning"
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
        "const": "MANUAL_USER"
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
    "description": "Owner-scoped, manually confirmed listing and optional explicit Yahoo mapping. It is not an authoritative exchange security master. No ISIN-based exchange guess."
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
  "ContractVersion": {
    "type": "string",
    "const": "0.13.0"
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
  "OpaqueId": {
    "type": "string",
    "minLength": 1,
    "maxLength": 128,
    "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$"
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
        "const": false
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
    "description": "Delivery choices are stored; no notification or email service is enabled yet."
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
        "const": "MANUAL_USER"
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
  }
} as const;
