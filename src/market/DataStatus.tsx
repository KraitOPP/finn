import { useState } from "react";
import { useResource } from "../api/useResource.ts";
import { capabilityText, failureText } from "./ListingPrices.tsx";

const quotas = {
  AVAILABLE: "Within your FINN request limit",
  HOURLY_LIMIT_REACHED: "Hourly limit reached",
  PENDING_LIMIT_REACHED: "Wait for a pending refresh to finish",
} as const;

export function DataStatus() {
  const [open, setOpen] = useState(false);
  const data = useResource(
    "MarketDiagnostics",
    open ? "/api/v1/market/status" : null,
  );
  const status = data.value;
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Market data status</summary>
      {open && (
        <>
          <p>
            FINN uses completed daily closes. A recent close can still have an
            unknown source delay.
          </p>
          <button type="button" onClick={data.reload}>
            Check latest data status
          </button>
          {data.error ? (
            <p role="alert">{data.error}</p>
          ) : !status ? (
            <p role="status">Checking price sources…</p>
          ) : (
            <>
              <ul>
                <li>{capabilityText(status.yahooCapability)}.</li>
                <li>
                  Last successful Yahoo download:{" "}
                  {status.lastSuccessfulAcquisition ?? "None yet"}.
                </li>
                <li>
                  Reviewed exchange closes can be entered in Securities.
                  Official file imports and streaming are awaiting verification.
                </li>
                <li>
                  {status.coverage.withClose} of{" "}
                  {status.coverage.trackedListings} distinct watchlist listings
                  have a saved close. {status.coverage.recentClose} have a close
                  from the last four calendar days or newer.
                </li>
                <li>
                  {status.failedRunsLastDay} failed refreshes in the last 24
                  hours ({status.sourceValidationFailuresLastDay} failed data
                  validation).
                </li>
                <li>
                  {quotas[status.quota.status]} · {status.quota.remaining} of{" "}
                  {status.quota.hourlyLimit} requests remaining in the last-hour
                  window · {status.quota.pending}/{status.quota.pendingLimit}{" "}
                  pending. Yahoo’s upstream allowance and delay are unknown.
                </li>
              </ul>
              <details>
                <summary>Recent refresh details</summary>
                {status.recentRuns.length === 0 ? (
                  <p>No Yahoo refreshes yet.</p>
                ) : (
                  <ul className="security-list">
                    {status.recentRuns.map((run) => (
                      <li key={run.jobId}>
                        <div>
                          <strong>
                            {run.exchange} · {run.symbol}
                          </strong>
                          <p>
                            {run.state.toLowerCase().replaceAll("_", " ")} ·{" "}
                            {run.updatedAt}
                            {run.rowsReturned === null
                              ? ""
                              : ` · ${run.rowsReturned} valid rows returned`}
                          </p>
                          {run.failureCode && (
                            <p>{failureText(run.failureCode)}</p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </details>
            </>
          )}
        </>
      )}
    </details>
  );
}
