import { useState } from "react";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { useDisplayInstant } from "../preferences/PreferencesProvider.tsx";

const issues: Record<string, string> = {
  QUANTITY_DIFFERENCE: "Units differ",
  COST_DIFFERENCE: "Costs differ",
  COST_UNAVAILABLE: "Cost comparison unavailable",
  MISSING_FROM_REPORT: "Recorded holding absent from report",
  UNMAPPED_SECURITY: "No owned security match",
  SOURCE_ROW_INVALID: "Source row needs correction",
};
const present = (value: string | null) => value ?? "Unavailable";
export function HoldingsReconciliationPanel({
  path,
  archived,
}: {
  path: string;
  archived: boolean;
}) {
  const auth = useAuthentication(),
    formatInstant = useDisplayInstant();
  const [offset, setOffset] = useState(0);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const result = useResource(
    "HoldingsReconciliation",
    `${path}?offset=${offset}`,
  );
  const comparison = result.value;
  const acknowledge = async () => {
    if (
      comparison?.state !== "COMPARABLE" ||
      !checked ||
      busy ||
      archived ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await requestContract("HoldingsReconciliationReceipt", path, {
        method: "POST",
        csrf: auth.session.csrf,
        body: {
          reviewed: true,
          expectedLedgerRevision: comparison.ledgerRevision,
        },
      });
      setChecked(false);
      result.reload();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "The review could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="reconciliation-workspace"
      aria-label="Holdings reconciliation"
    >
      <h4>Compare with recorded holdings</h4>
      {result.error ? (
        <p role="alert">
          {result.error}{" "}
          <button type="button" onClick={result.reload}>
            Retry comparison
          </button>
        </p>
      ) : !comparison ? (
        <p role="status">Comparing holdings on the report date…</p>
      ) : (
        <>
          <p>
            Report date: <strong>{comparison.reportDate}</strong>.{" "}
            {comparison.coverageStart
              ? `Recorded equity coverage starts ${comparison.coverageStart}.`
              : "Recorded equity coverage is unknown."}
          </p>
          {comparison.state === "HISTORY_UNAVAILABLE" ? (
            <p className="session-notice">
              The report date is outside available history. Earlier units and
              costs cannot be reconstructed.
            </p>
          ) : (
            <>
              <p className="field-help">
                Differences are report minus ledger at the report date. Confirm
                the report uses INR before comparing costs. Recorded costs use
                moving weighted average; reported costs can use a different
                basis. The comparison cannot establish complete trade history.
              </p>
              <p>
                {comparison.issueCount} of {comparison.rowCount} rows need
                review. Saving a review does not change the ledger.
              </p>
              <div className="data-table">
                <table>
                  <caption>
                    Report and recorded holdings on the same date
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Security</th>
                      <th scope="col">Report units</th>
                      <th scope="col">Recorded units</th>
                      <th scope="col">Report cost</th>
                      <th scope="col">Recorded cost</th>
                      <th scope="col">Differences</th>
                      <th scope="col">Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.rows.map((row) => (
                      <tr key={row.sourceRow ?? row.securityId}>
                        <th scope="row">
                          {row.name ?? "Unresolved security"}
                          <small>
                            {row.isin ?? ""}
                            {row.sourceRow ? ` · row ${row.sourceRow}` : ""}
                          </small>
                        </th>
                        <td>{present(row.reportedUnits)}</td>
                        <td>{present(row.recordedUnits)}</td>
                        <td>{present(row.reportedCost)}</td>
                        <td>{present(row.recordedCost)}</td>
                        <td>
                          <small>Units: {present(row.unitDifference)}</small>
                          <small>Cost: {present(row.costDifference)}</small>
                        </td>
                        <td>
                          {row.issues.length === 0
                            ? "Matches within tolerance"
                            : row.issues.map((issue) => (
                                <small key={issue}>
                                  {Object.hasOwn(issues, issue)
                                    ? issues[issue]
                                    : "Review required"}
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
                  onClick={() => setOffset((value) => Math.max(0, value - 50))}
                >
                  Previous comparison rows
                </button>
                <button
                  type="button"
                  disabled={comparison.nextOffset === null}
                  onClick={() => setOffset(comparison.nextOffset ?? 0)}
                >
                  More comparison rows
                </button>
              </div>
              {comparison.reviewedAt ? (
                <p role="status">
                  Comparison reviewed {formatInstant(comparison.reviewedAt)}.
                  Differences remain visible.
                </p>
              ) : (
                !archived && (
                  <>
                    <label className="check-label">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => setChecked(event.target.checked)}
                      />
                      I reviewed the differences, currency context and cost
                      basis.
                    </label>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!checked || busy}
                      onClick={acknowledge}
                    >
                      {busy ? "Saving…" : "Save comparison review"}
                    </button>
                  </>
                )
              )}
              {error && (
                <p role="alert">
                  {error}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setChecked(false);
                      setError(null);
                      result.reload();
                    }}
                  >
                    Reload comparison
                  </button>
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
