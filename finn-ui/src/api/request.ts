import { decodeContract } from "../../contracts/decode.ts";
import type {
  ContractTypes,
  CsrfInformation,
} from "../../contracts/generated/models.ts";

const safeMessages: Record<string, string> = {
  ALERT_LANGUAGE_UNSUPPORTED:
    "This wording is outside the supported alert rules. Start with an example and preview the exact conditions.",
  RESEARCH_ALERT_LIMIT:
    "This workspace has reached its limit of 20 research alert rules.",
  EARNINGS_INPUT_LIMIT:
    "This workspace has reached its limit for reviewed earnings inputs.",
  GUIDANCE_EVIDENCE_REQUIRED:
    "Use a source that supports the target and its dates.",
  MILESTONE_EVIDENCE_REQUIRED:
    "Use a dated company source that confirms completion after the original statement.",
  CHART_NOT_CONFIGURED:
    "Yahoo price history is unavailable. Try saved closes if you have them.",
  CHART_BUSY: "Price history is busy. Try again in a moment.",
  CHART_UNAVAILABLE:
    "Yahoo couldn’t return this range. Try again or select another range.",
  GEMINI_NOT_CONFIGURED:
    "Set GEMINI_API_KEY on the FINN backend and restart it to use Gemini.",
  GEMINI_ACCESS_REJECTED:
    "Gemini rejected access. Check the backend API key and Google project access.",
  GEMINI_REQUEST_REJECTED:
    "Gemini rejected this request. Check the API key, model and Google Search access.",
  GEMINI_QUOTA:
    "Google’s Gemini or Search quota has been reached. Check your Google project’s quota and billing.",
  GEMINI_RATE_LIMIT: "Gemini is busy. Try again in a moment.",
  GEMINI_TIMEOUT: "Gemini took too long to respond. Try again.",
  GEMINI_UNAVAILABLE: "Gemini is temporarily unavailable.",
  GEMINI_NO_RESULT: "Gemini did not return a complete report. Try again.",
  GEMINI_NO_SOURCES:
    "Gemini did not return usable Google Search sources. Try again.",
  GROQ_NOT_CONFIGURED:
    "Set GROQ_API_KEY on the FINN backend and restart it to use Groq.",
  GROQ_ACCESS_REJECTED:
    "Groq rejected access. Check the API key and your project’s model permissions.",
  GROQ_REQUEST_REJECTED:
    "Groq rejected the research request. Check your project’s model and Browser Search access.",
  GROQ_SEARCH_FAILED:
    "Groq Browser Search couldn’t collect sources for this request.",
  GROQ_QUOTA: "Groq’s usage limit has been reached.",
  GROQ_RATE_LIMIT: "Stock research is busy. Try again in a moment.",
  GROQ_TIMEOUT: "Groq took too long to respond. Try again.",
  GROQ_UNAVAILABLE: "Groq is temporarily unavailable.",
  GROQ_NO_RESULT: "Groq did not return a complete report. Try again.",
  GROQ_NO_SOURCES:
    "Groq did not return source links that could be matched to the report. Try again.",
  STOCK_IDENTITY_REVIEW_REQUIRED:
    "This ticker is already saved for a different security. Check the existing listing before using it.",
  UNSUPPORTED_SHORT_POSITION:
    "This would make the recorded units negative. Review the dates and available units.",
  SNAPSHOT_BOUNDARY_CONFLICT:
    "This trade overlaps a closing holdings snapshot. Enter only trades after that snapshot, or review the opening record.",
  CASH_BASELINE_CONFLICT:
    "The cash baseline must precede recorded cash movements, with no other active baseline.",
  DUPLICATE_OPENING_POSITION:
    "This security already has an opening holding. Review or correct the existing record.",
  INVALID_REVERSAL:
    "This record has already been reversed or is unavailable for correction.",
  IDEMPOTENCY_CONFLICT:
    "This submission reference was already used for different details. Check your history before recording another entry.",
  LEDGER_CAPACITY_REACHED:
    "This account has reached the supported ledger limit.",
  PORTFOLIO_ARCHIVED: "Restore this portfolio before adding records.",
  DUPLICATE_RESOURCE:
    "A matching record already exists. Check your saved records before trying again.",
  INVALID_XLSX: "This file is not a supported XLSX workbook.",
  GROWW_SOURCE_ACCOUNT_REQUIRED:
    "Select a Groww source account to preview a holdings workbook.",
  IMPORT_QUEUE_FULL:
    "Two previews are already queued or running. Wait for one to finish.",
  IMPORT_STORAGE_LIMIT_REACHED:
    "This workspace has reached its stored workbook limit.",
  IMPORT_RETRY_LIMIT_REACHED: "This workbook has reached its retry limit.",
  UPLOAD_CAPACITY_REACHED: "Other uploads are in progress. Try again shortly.",
  IMPORT_LEDGER_CHANGED:
    "The ledger changed after this review. Reload the preview and review the current account.",
  IMPORT_SOURCE_CONFLICT:
    "Some rows differ from the accepted opening snapshot. Review them without replacing the ledger.",
  IMPORT_ALREADY_REVIEWED:
    "This workbook already has a saved decision. Reload the preview to see its receipt.",
  IMPORT_RECONCILIATION_REQUIRED:
    "This account already has equity history. Compare the report without posting another opening.",
  IMPORT_DIFFERENCES_REQUIRE_REVIEW:
    "Review and acknowledge the report differences before recording holdings.",
  IMPORT_REPORTED_COST_UNAVAILABLE:
    "Reported row costs are incomplete or exceed the supported precision. You can keep costs unknown.",
  SECURITY_LABEL_REVIEW_REQUIRED:
    "Create or review this ISIN in Securities with a shorter display label, then reload the preview.",
  CORPORATE_LEDGER_CHANGED:
    "The ledger changed. Preview the action again before saving.",
  CORPORATE_SOURCE_CONFLICT:
    "This source reference already has different recorded details. Review the existing action before correcting it.",
  CORPORATE_ACTION_ALREADY_APPLIED:
    "A matching action is already recorded for this security and date.",
  CORPORATE_CORRECTION_REQUIRES_REVIEW:
    "Review the original action and its journal reversal before recording a linked correction.",
};

export function formatRetryDelay(seconds: number) {
  const unit = seconds >= 3600 ? "hour" : seconds >= 60 ? "minute" : "second";
  const secondsPerUnit = { hour: 3600, minute: 60, second: 1 };
  const amount = Math.ceil(seconds / secondsPerUnit[unit]);
  return `${amount} ${unit}${amount === 1 ? "" : "s"}`;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public reference: string | null = null,
    public code: string | null = null,
    retryAfterSeconds: number | null = null,
  ) {
    const message =
      (code && Object.hasOwn(safeMessages, code) ? safeMessages[code] : null) ??
      (status === 409
        ? "This changed since you opened it. Reload and review before saving."
        : status === 401 || status === 403
          ? "Your session needs to reconnect. Sign in again if requested."
          : status === 422 || status === 400
            ? "Check the entered values and try again."
            : "We couldn’t complete this request. Try again.");
    let retryAdvice = "";
    if (code === "GROQ_QUOTA") {
      retryAdvice = retryAfterSeconds
        ? ` Try again in about ${formatRetryDelay(retryAfterSeconds)}.`
        : " Retry after the quota resets or check your project’s usage limits.";
    }
    super(`${message}${retryAdvice}`);
  }
}

export async function readBoundedResponse(response: Response, maximum: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(response.status);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > maximum) {
        await reader.cancel();
        throw new ApiError(502);
      }
      chunks.push(next.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function requestContract<K extends keyof ContractTypes>(
  name: K,
  path: string,
  options: {
    method?: "GET" | "PUT" | "POST";
    body?: unknown;
    raw?: { data: BodyInit; contentType: string };
    csrf?: CsrfInformation;
    signal?: AbortSignal;
    timeoutMs?: number;
  } = {},
): Promise<ContractTypes[K]> {
  const deadline = AbortSignal.timeout(
    options.timeoutMs ?? (options.raw ? 24000 : 12000),
  );
  const signal = options.signal
    ? AbortSignal.any([options.signal, deadline])
    : deadline;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.raw) headers["Content-Type"] = options.raw.contentType;
  if (options.csrf) headers[options.csrf.headerName] = options.csrf.token;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers,
    signal,
    ...(options.raw
      ? { body: options.raw.data }
      : options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
  });
  const bytes = await readBoundedResponse(response, 2 * 1024 * 1024);
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError(response.ok ? 502 : response.status);
  }
  if (!response.ok) {
    let reference: string | null = null;
    let code: string | null = null;
    try {
      const problem = decodeContract("Problem", body);
      reference = problem.traceId;
      code = problem.code;
    } catch {
      /* Untrusted error details stay hidden. */
    }
    const retryAfter =
      response.status === 429 ? response.headers.get("Retry-After") : null;
    const delay =
      retryAfter && /^\d{1,5}$/.test(retryAfter) ? Number(retryAfter) : 0;
    throw new ApiError(
      response.status,
      reference,
      code,
      delay > 0 && delay <= 86400 ? delay : null,
    );
  }
  try {
    return decodeContract(name, body);
  } catch {
    throw new ApiError(502);
  }
}
