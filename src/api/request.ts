import { decodeContract } from "../../contracts/decode.ts";
import type {
  ContractTypes,
  CsrfInformation,
} from "../../contracts/generated/models.ts";

const safeMessages: Record<string, string> = {
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
};

export class ApiError extends Error {
  constructor(
    public status: number,
    public reference: string | null = null,
    public code: string | null = null,
  ) {
    super(
      (code && Object.hasOwn(safeMessages, code) ? safeMessages[code] : null) ??
        (status === 409
          ? "This changed since you opened it. Reload and review before saving."
          : status === 401 || status === 403
            ? "Your session needs to reconnect. Sign in again if requested."
            : status === 422 || status === 400
              ? "Check the entered values and try again."
              : "We couldn’t complete this request. Try again."),
    );
  }
}

export async function requestContract<K extends keyof ContractTypes>(
  name: K,
  path: string,
  options: {
    method?: "GET" | "PUT" | "POST";
    body?: unknown;
    csrf?: CsrfInformation;
    signal?: AbortSignal;
  } = {},
): Promise<ContractTypes[K]> {
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(12000)])
    : AbortSignal.timeout(12000);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.csrf) headers[options.csrf.headerName] = options.csrf.token;
  const response = await fetch(path, {
    method: options.method ?? "GET",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers,
    signal,
    ...(options.body === undefined
      ? {}
      : { body: JSON.stringify(options.body) }),
  });
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(response.status);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      length += next.value.byteLength;
      if (length > 2 * 1024 * 1024) {
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
    throw new ApiError(response.status, reference, code);
  }
  try {
    return decodeContract(name, body);
  } catch {
    throw new ApiError(502);
  }
}
