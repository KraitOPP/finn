import { type FormEvent, useEffect, useRef, useState } from "react";
import type {
  HoldingsAcceptanceReceipt,
  HoldingsPreviewPage,
  ImportTicket,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { useDisplayInstant } from "../preferences/PreferencesProvider.tsx";
import { ReviewOpening, receiptMessage } from "./ReviewOpening.tsx";

const XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const labels: Record<string, string> = {
  QUEUED: "Waiting to read",
  RUNNING: "Reading workbook",
  SUCCEEDED: "Ready to review",
  FAILED: "Preview failed",
  PARTIALLY_SUCCEEDED: "Partial result",
  CANCELLED: "Cancelled",
};
const failures: Record<string, string> = {
  FILE_TOO_LARGE: "This workbook exceeds the 5 MiB limit.",
  INVALID_XLSX: "The file is not a valid supported XLSX workbook.",
  UNSUPPORTED_PACKAGE_CONTENT:
    "The file contains active or unsupported content. Use a static holdings export without formulas, macros or external links.",
  PACKAGE_LIMIT_REACHED: "The workbook exceeds a safe parsing limit.",
  UNSAFE_XML: "The workbook could not be read safely.",
  UNSUPPORTED_REPORT_LAYOUT:
    "Use the supported Groww stock holdings statement. Trade, order and cash reports use different layouts.",
  INVALID_REPORT_DATE:
    "The report caption does not contain a valid as-of date.",
  PARSE_BUDGET_EXCEEDED: "Reading the workbook exceeded the time limit.",
  LEASE_EXPIRED:
    "The reader stopped before finishing. Retry the preview to start a new job.",
  WORKER_TEMPORARY_FAILURE:
    "The reader was temporarily unavailable. Retry the preview to start a new job.",
};
const issues: Record<string, string> = {
  INVALID_SECURITY_NAME: "Invalid security label",
  INVALID_ISIN: "Invalid or missing ISIN",
  DUPLICATE_SECURITY: "Repeated ISIN",
  INVALID_WHOLE_UNITS: "Unsupported quantity",
  ZERO_QUANTITY: "Zero units",
  REQUIRED_NUMBER_MISSING: "Required value missing",
  INVALID_NUMBER: "Invalid number",
  REPORTED_COST_UNKNOWN: "Reported cost unknown",
  ZERO_REPORTED_CLOSE: "Zero close is source evidence only",
  ROW_BUY_MISMATCH: "Buy amount differs from quantity × average",
  ROW_CLOSE_MISMATCH: "Closing amount differs from quantity × close",
  ROW_PNL_MISMATCH: "Reported gain/loss differs from row values",
};
const comparisonLabels = {
  BUY_VALUE: "Invested value",
  CLOSING_VALUE: "Closing value",
  UNREALISED_PNL: "Unrealised gain/loss",
};
const amount = (value: string | null) => value ?? "Unavailable";

export function HoldingsImportPanel({
  base,
  archived,
  onAccepted,
}: {
  base: string;
  archived: boolean;
  onAccepted?: (receipt: HoldingsAcceptanceReceipt) => void;
}) {
  const auth = useAuthentication();
  const displayInstant = useDisplayInstant();
  const imports = useResource("HoldingsImportList", `${base}/imports`);
  const [selected, setSelected] = useState<Pick<
    ImportTicket,
    "importId" | "jobId"
  > | null>(null);
  const [offset, setOffset] = useState(0);
  const [polls, setPolls] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const job = useResource(
    "AsyncJobStatus",
    selected ? `/api/v1/jobs/${selected.jobId}` : null,
  );
  const state = job.value?.state;
  const reloadJob = job.reload;
  const reloadImports = imports.reload;
  const preview = useResource(
    "HoldingsPreviewPage",
    selected && state === "SUCCEEDED"
      ? `${base}/imports/${selected.importId}/preview?offset=${offset}`
      : null,
  );
  useEffect(() => {
    if ((state !== "QUEUED" && state !== "RUNNING") || polls >= 30) return;
    const timer = window.setTimeout(() => {
      setPolls((value) => value + 1);
      reloadJob();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [state, polls, reloadJob]);
  useEffect(() => {
    if (
      state === "SUCCEEDED" ||
      state === "FAILED" ||
      state === "CANCELLED" ||
      state === "PARTIALLY_SUCCEEDED"
    )
      reloadImports();
  }, [state, reloadImports]);
  const open = (ticket: Pick<ImportTicket, "importId" | "jobId">) => {
    setSelected(ticket);
    setOffset(0);
    setPolls(0);
    setError(null);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      archived ||
      inFlight.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    const file = input.current?.files?.[0];
    if (
      !file?.name.toLowerCase().endsWith(".xlsx") ||
      file.size === 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      setError("Choose a nonempty .xlsx workbook up to 5 MiB.");
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const ticket = await requestContract("ImportTicket", `${base}/imports`, {
        method: "POST",
        raw: { data: file, contentType: XLSX },
        csrf: auth.session.csrf,
      });
      open(ticket);
      if (input.current) input.current.value = "";
      imports.reload();
      setNotice(
        ticket.duplicate
          ? "This workbook is already stored for this account. Opening its existing preview."
          : "Workbook received. Your ledger has not changed.",
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "The upload could not be confirmed. Retrying this same file will reuse an existing upload.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const retry = async () => {
    if (
      !selected ||
      archived ||
      inFlight.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const ticket = await requestContract(
        "ImportTicket",
        `${base}/imports/${selected.importId}/retry`,
        { method: "POST", csrf: auth.session.csrf },
      );
      open(ticket);
      imports.reload();
      setNotice(
        "A new preview job is queued. The original workbook is unchanged.",
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "The preview couldn’t be retried.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="import-workspace" aria-label="Groww holdings imports">
      <h3>Groww holdings imports</h3>
      <p className="field-help">
        Review a supported stock holdings workbook and its differences. A
        preview does not change your ledger.
      </p>
      {!archived && (
        <form className="settings-card" onSubmit={submit}>
          <label htmlFor="holdings-file">Groww holdings workbook (.xlsx)</label>
          <input
            id="holdings-file"
            type="file"
            accept={`.xlsx,${XLSX}`}
            ref={input}
            disabled={busy}
          />
          <p className="field-help">
            Up to 5 MiB. Use the holdings statement, without formulas or links.
            No Groww login is required.
          </p>
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Working…" : "Upload for preview"}
          </button>
        </form>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {imports.error ? (
        <p role="alert">
          {imports.error}{" "}
          <button type="button" onClick={imports.reload}>
            Reload uploads
          </button>
        </p>
      ) : !imports.value ? (
        <p role="status">Loading workbooks…</p>
      ) : imports.value.items.length === 0 ? (
        <p>No workbooks uploaded yet.</p>
      ) : (
        <ul className="security-list">
          {imports.value.items.map((item) => (
            <li key={item.importId}>
              <div>
                <strong>Groww holdings workbook</strong>
                <p>
                  {displayInstant(item.createdAt)} · {labels[item.state]} ·{" "}
                  {Math.max(1, Math.ceil(item.sizeBytes / 1024))} KiB
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                aria-pressed={selected?.importId === item.importId}
                onClick={() => {
                  open(item);
                  reloadJob();
                }}
              >
                Open preview
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="review-card">
          <h4>Workbook preview</h4>
          {job.error ? (
            <p role="alert">{job.error}</p>
          ) : (
            <p role="status">
              {state ? labels[state] : "Loading preview status…"}
            </p>
          )}
          {state === "FAILED" && (
            <p role="alert">
              {failures[job.value?.failureCode ?? ""] ??
                "This workbook could not be previewed."}
            </p>
          )}
          {!archived &&
            state === "FAILED" &&
            ["LEASE_EXPIRED", "WORKER_TEMPORARY_FAILURE"].includes(
              job.value?.failureCode ?? "",
            ) && (
              <button type="button" disabled={busy} onClick={retry}>
                Retry preview
              </button>
            )}
          {(job.error || state === "QUEUED" || state === "RUNNING") && (
            <button
              type="button"
              onClick={() => {
                setPolls(0);
                reloadJob();
              }}
            >
              Refresh status
            </button>
          )}
          {state === "SUCCEEDED" &&
            (preview.error ? (
              <p role="alert">
                {preview.error}{" "}
                <button type="button" onClick={preview.reload}>
                  Reload preview
                </button>
              </p>
            ) : preview.value ? (
              <>
                <Preview
                  page={preview.value}
                  original={`${base}/imports/${selected.importId}/original`}
                  offset={offset}
                  onOffset={setOffset}
                />
                <ReviewOpening
                  page={preview.value}
                  archived={archived}
                  path={`${base}/imports/${selected.importId}/accept`}
                  onReload={preview.reload}
                  onAccepted={(receipt) => {
                    setNotice(receiptMessage(receipt));
                    preview.reload();
                    onAccepted?.(receipt);
                  }}
                />
              </>
            ) : (
              <p role="status">Loading reconciliation and source rows…</p>
            ))}
        </div>
      )}
    </section>
  );
}

function Preview({
  page,
  original,
  offset,
  onOffset,
}: {
  page: HoldingsPreviewPage;
  original: string;
  offset: number;
  onOffset: (value: number) => void;
}) {
  const metadata = page.metadata;
  return (
    <>
      <p>
        <strong>Holdings as of {metadata.asOfDate}</strong> ·{" "}
        {metadata.rowCount} source rows
      </p>
      <p className="field-help">
        Amounts are shown as reported. The workbook does not specify a currency
        code or exchange listings. The snapshot does not establish past trades,
        cash flows or returns.
      </p>
      {metadata.warnings.includes("SUMMARY_TOTAL_MISMATCH") && (
        <p className="session-notice">
          Some report totals differ from the sum of the rows. Both are preserved
          below for review.
        </p>
      )}
      {metadata.warnings.includes("BLOCKED_ROWS_PRESENT") && (
        <p className="session-notice">
          Some rows have issues that prevent acceptance. Check the marked cells.
        </p>
      )}
      <div className="data-table">
        <table>
          <caption>Report summary compared with source rows</caption>
          <thead>
            <tr>
              <th scope="col">Amount</th>
              <th scope="col">Report summary</th>
              <th scope="col">Sum of rows</th>
              <th scope="col">Difference</th>
              <th scope="col">Review</th>
            </tr>
          </thead>
          <tbody>
            {metadata.comparisons.map((item) => (
              <tr key={item.field}>
                <th scope="row">{comparisonLabels[item.field]}</th>
                <td>{amount(item.reported)}</td>
                <td>{amount(item.detailSum)}</td>
                <td>{amount(item.difference)}</td>
                <td>
                  {item.status === "MATCH"
                    ? "Matches within tolerance"
                    : item.status === "MISMATCH"
                      ? "Review difference"
                      : "Incomplete"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="data-table">
        <table>
          <caption>Source holdings rows</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              <th scope="col">Security</th>
              <th scope="col">Units</th>
              <th scope="col">Average cost</th>
              <th scope="col">Buy value</th>
              <th scope="col">Closing price</th>
              <th scope="col">Closing value</th>
              <th scope="col">Unrealised gain/loss</th>
              <th scope="col">Review</th>
            </tr>
          </thead>
          <tbody>
            {page.rows.map(({ source, mappingStatus }) => (
              <tr key={source.rowNumber}>
                <th scope="row">{source.rowNumber}</th>
                <td>
                  {source.reportedName ?? "Unavailable"}
                  <small>{source.isin ?? "ISIN unavailable"}</small>
                </td>
                <td>{amount(source.quantity)}</td>
                <td>{amount(source.averageCost)}</td>
                <td>{amount(source.buyValue)}</td>
                <td>{amount(source.closingPrice)}</td>
                <td>{amount(source.closingValue)}</td>
                <td>{amount(source.unrealisedPnl)}</td>
                <td>
                  {mappingStatus === "EXISTING_SECURITY"
                    ? "Owned security matched"
                    : "Security needs review"}
                  <small>Exchange not provided</small>
                  {source.issues.map((issue) => (
                    <small key={`${issue.column}-${issue.code}`}>
                      {issue.blocksCommit ? "Blocked: " : ""}
                      {issues[issue.code] ?? "Review source cell"} (
                      {issue.column}
                      {source.rowNumber})
                    </small>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onOffset(Math.max(0, offset - 50))}
        >
          Previous rows
        </button>
        <button
          type="button"
          disabled={page.nextOffset === null}
          onClick={() => onOffset(page.nextOffset ?? 0)}
        >
          More rows
        </button>
        <a href={original} download>
          Download original
        </a>
      </div>
    </>
  );
}
