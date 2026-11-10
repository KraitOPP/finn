// Generated from the backend OpenAPI authority. Run contracts/generate.mjs; do not edit.
export const contractMetadata = {
  "contractVersion": "0.4.0",
  "openapiVersion": "3.1.1",
  "source": "finn-backend/contracts/public-api/openapi.json",
  "sourceSha256": "cff7dc12bd24a24f0b0f18729d776ecf250987c0082b568f2cbf40ddcac251b5",
  "schemaNames": [
    "AcquisitionEnvelope",
    "AdjustmentBasis",
    "AsyncJobStatus",
    "Capability",
    "ContractVersion",
    "CsrfInformation",
    "DecimalString",
    "Delay",
    "Freshness",
    "HistoryCoverage",
    "HistoryResponse",
    "InstrumentPage",
    "InstrumentResult",
    "IntegerString",
    "ListingIdentity",
    "NonNegativeDecimalString",
    "OpaqueId",
    "PositiveDecimalString",
    "Preferences",
    "PreferencesUpdate",
    "PriceBasis",
    "PriceObservation",
    "Problem",
    "ProblemField",
    "Provenance",
    "Provider",
    "ProviderCapabilities",
    "ProviderStatus",
    "ProviderStatusPage",
    "QuoteResponse",
    "Rights",
    "SessionDate",
    "SessionResponse",
    "SourceTimes",
    "UserProfile",
    "UtcInstant",
    "Warning"
  ]
} as const;

export const contractSchemas = {
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
    "description": "Owner-scoped status snapshot, not a queue implementation. Revision is server-assigned and increases on committed changes. Terminal states are immutable; retry creates a new job. Failure codes are safe application codes, never raw exceptions or source values.",
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
  "ContractVersion": {
    "type": "string",
    "const": "0.4.0"
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
