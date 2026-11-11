import { useState } from "react";
import type { ValuationPoint } from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { calendarDates, GapChart } from "./GapChart.tsx";
import { sessionOffset } from "./ListingPrices.tsx";
import { money } from "./ValuationPanel.tsx";

const states = {
  BEFORE_COVERAGE: "Before recorded coverage",
  PRICES_MISSING: "Same-date reviewed prices missing",
  CASH_UNKNOWN: "Holdings priced; cash unknown",
  RECORDED_VALUE: "Recorded value available",
} as const;

export function ValuationHistory({
  base,
  archived,
}: {
  base: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Historical account valuations</summary>
      {open && (
        <HistoryContents
          path={`${base}/valuation/snapshots`}
          archived={archived}
        />
      )}
    </details>
  );
}

function HistoryContents({
  path,
  archived,
}: {
  path: string;
  archived: boolean;
}) {
  const auth = useAuthentication();
  const [period, setPeriod] = useState("30");
  const [end, setEnd] = useState(() => sessionOffset(0));
  const [chart, setChart] = useState<"holdingsValue" | "recordedValue">(
    "holdingsValue",
  );
  const [buildStart, setBuildStart] = useState(() => sessionOffset(-7));
  const [buildEnd, setBuildEnd] = useState(() => sessionOffset(0));
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  const start = (() => {
    if (!end) return "";
    const date = new Date(`${end}T00:00:00Z`);
    if (!Number.isFinite(date.getTime())) return "";
    date.setUTCDate(date.getUTCDate() - Number(period));
    return date.toISOString().slice(0, 10);
  })();
  const query = new URLSearchParams({ start, endExclusive: end });
  const data = useResource(
    "ValuationSeries",
    start ? `${path}?${query}` : null,
  );
  const byDay = new Map(
    data.value?.points.map((point) => [point.sessionDate, point]),
  );
  const days = calendarDates(start, end);
  return (
    <>
      <p>
        Saved values use the ledger revision and the reviewed exchange close for
        each date. Missing values stay blank. These are recorded amounts, not
        investment returns.
      </p>
      {!archived && (
        <form
          className="settings-card"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy || auth.status !== "ready") return;
            setBusy(true);
            setNotice("");
            setFailure("");
            try {
              const result = await requestContract("ValuationSeries", path, {
                method: "POST",
                csrf: auth.session.csrf,
                body: { start: buildStart, endExclusive: buildEnd },
              });
              setEnd(result.endExclusive);
              setDetail(null);
              setNotice(
                `Checked ${result.points.length} dates. Missing coverage is shown in the table.`,
              );
              data.reload();
            } catch (error) {
              if (
                error instanceof ApiError &&
                (error.status === 401 || error.status === 403)
              )
                auth.refresh();
              setFailure(
                "Couldn’t build the snapshots. Choose a completed window of up to 14 calendar days and try again.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Build from{" "}
            <input
              type="date"
              required
              value={buildStart}
              max={sessionOffset(-1)}
              onChange={(event) => setBuildStart(event.target.value)}
            />
          </label>
          <label>
            Build until (excluded){" "}
            <input
              type="date"
              required
              value={buildEnd}
              max={sessionOffset(0)}
              onChange={(event) => setBuildEnd(event.target.value)}
            />
          </label>
          <button className="primary-button" disabled={busy} type="submit">
            {busy ? "Building…" : "Build dated snapshots"}
          </button>
        </form>
      )}
      {notice && <p role="status">{notice}</p>}
      {failure && <p role="alert">{failure}</p>}
      <div className="market-filters">
        <label>
          Chart period{" "}
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </label>
        <label>
          View until (excluded){" "}
          <input
            type="date"
            value={end}
            max={sessionOffset(0)}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label>
          Show{" "}
          <select
            value={chart}
            onChange={(event) =>
              setChart(
                event.target.value === "recordedValue"
                  ? "recordedValue"
                  : "holdingsValue",
              )
            }
          >
            <option value="holdingsValue">Holdings value</option>
            <option value="recordedValue">Holdings plus cash</option>
          </select>
        </label>
      </div>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : data.loading ? (
        <p role="status">Loading snapshots…</p>
      ) : (
        data.value && (
          <>
            <GapChart
              label={
                chart === "holdingsValue"
                  ? "Dated holdings values"
                  : "Dated holdings plus cash"
              }
              points={days.map((date) => ({
                date,
                amount: byDay.get(date)?.[chart] ?? null,
              }))}
            />
            <section
              className="market-table"
              aria-label="Dated account valuations"
            >
              <table>
                <caption>Saved valuations by date</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Holdings</th>
                    <th scope="col">With cash</th>
                    <th scope="col">Coverage</th>
                    <th scope="col">Inputs</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((date) => (
                    <SnapshotRow
                      key={date}
                      date={date}
                      point={byDay.get(date)}
                      onOpen={setDetail}
                    />
                  ))}
                </tbody>
              </table>
            </section>
          </>
        )
      )}
      {detail && (
        <SnapshotInputs
          key={detail}
          path={`${path}/${detail}`}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}

function SnapshotRow({
  date,
  point,
  onOpen,
}: {
  date: string;
  point?: ValuationPoint;
  onOpen: (id: string) => void;
}) {
  return (
    <tr>
      <th scope="row">{date}</th>
      <td>{money(point?.holdingsValue ?? null)}</td>
      <td>{money(point?.recordedValue ?? null)}</td>
      <td>{point ? states[point.status] : "No saved snapshot"}</td>
      <td>
        {point && (
          <button type="button" onClick={() => onOpen(point.snapshotId)}>
            View inputs for {date}
          </button>
        )}
      </td>
    </tr>
  );
}

function SnapshotInputs({
  path,
  onClose,
}: {
  path: string;
  onClose: () => void;
}) {
  const data = useResource("ValuationSnapshotDetail", path);
  const value = data.value;
  return (
    <section className="settings-card">
      <h3>Saved valuation inputs</h3>
      <button type="button" onClick={onClose}>
        Close inputs
      </button>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !value ? (
        <p role="status">Loading the saved inputs…</p>
      ) : (
        <>
          <p>
            {value.snapshot.sessionDate} · Ledger revision{" "}
            {value.snapshot.ledgerRevision} ·{" "}
            {value.snapshot.calculationVersion} · As-reported exchange close.
          </p>
          {value.valuation ? (
            <ul className="security-list">
              {value.valuation.holdings.map((row) => (
                <li key={row.securityId}>
                  <div>
                    <strong>{row.securityName}</strong>
                    <p>
                      {row.quantity} units ·{" "}
                      {row.observation
                        ? `₹${row.observation.close} · ${row.observation.sourceReference} · recorded ${row.observation.receivedAt}`
                        : "No compatible reviewed close"}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>This date is before recorded holdings coverage.</p>
          )}
        </>
      )}
    </section>
  );
}
