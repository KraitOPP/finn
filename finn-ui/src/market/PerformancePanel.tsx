import Alert from "@mui/material/Alert";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  PerformanceAttribution,
  PortfolioPerformance,
  PortfolioPerformanceInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { money } from "./ValuationPanel.tsx";

export const performanceReasons: Record<string, string> = {
  HISTORY_UNREVIEWED: "Confirm the journal covers the selected period.",
  NO_ACCOUNTS: "Add at least one source account.",
  PORTFOLIO_BUDGET: "This portfolio exceeds the supported calculation size.",
  CASH_HISTORY_INCOMPLETE:
    "A starting cash balance or recorded fees are missing.",
  NEGATIVE_CASH_BALANCE:
    "Review a negative recorded cash balance before calculating returns.",
  NEW_OPENING_BALANCE:
    "An opening balance falls inside this period. Choose a later starting date.",
  ENDPOINT_VALUATIONS_MISSING:
    "Build complete saved valuations for both dates and every source account using the current journal.",
  FLOW_DAY_VALUATION_MISSING:
    "Build a saved valuation for each deposit or withdrawal date.",
  NON_POSITIVE_BASE:
    "The flow-adjusted series has a zero starting value or a negative value.",
  CASH_FLOW_SIGNS:
    "The dated cash flows do not have the signs needed to calculate XIRR.",
  AMBIGUOUS_CASH_FLOWS:
    "Repeated changes in cash-flow direction may yield multiple XIRR results.",
  OUTSIDE_SOLVER_RANGE:
    "The rate falls outside the supported calculation range.",
};

export function PerformancePanel({ portfolio }: { portfolio: string }) {
  const [input, setInput] = useState<PortfolioPerformanceInput>({
    start: "",
    end: "",
    reviewed: false,
  });
  const [result, setResult] = useState<PortfolioPerformance | null>(null);
  const command = usePrivateCommand();
  return (
    <details className="settings-card">
      <summary>Cash-flow-aware returns</summary>
      <p>
        Use complete saved closing valuations for every account. The window can
        span up to 366 days.
      </p>
      <form
        className="workspace-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const report = await command.run((csrf) =>
            requestContract(
              "PortfolioPerformance",
              `/api/v1/portfolios/${portfolio}/performance`,
              {
                method: "POST",
                csrf,
                body: input,
              },
            ),
          );
          if (report) setResult(report);
        }}
      >
        <PerformanceWindowFields
          input={input}
          onChange={(value) => {
            setInput(value);
            setResult(null);
          }}
        />
        <button type="submit" disabled={command.busy}>
          Calculate returns
        </button>
      </form>
      {command.error && <p role="alert">{command.error}</p>}
      {result && <PerformanceResults result={result} />}
    </details>
  );
}

function PerformanceResults({ result }: { result: PortfolioPerformance }) {
  return (
    <div>
      <h4>
        {result.start} to {result.end} · {result.currency}
      </h4>
      <dl>
        <dt>Money-weighted return (annualised XIRR)</dt>
        <dd>
          {result.xirr.percent === null
            ? performanceReasons[result.xirr.reason]
            : `${result.xirr.percent}%`}
        </dd>
        <dt>Time-weighted return (selected period)</dt>
        <dd>
          {result.timeWeighted.percent === null
            ? performanceReasons[result.timeWeighted.reason]
            : `${result.timeWeighted.percent}%`}
        </dd>
        <dt>Investment result after external flows</dt>
        <dd>
          {result.investmentResult === null
            ? "Unavailable"
            : money(result.investmentResult)}
        </dd>
      </dl>
      <p>
        XIRR annualises the investor’s dated cash flows using 365 days.
        Time-weighted return links subperiods and treats deposits and
        withdrawals as end-of-day flows. Dividends stay inside portfolio cash.
      </p>
      <p>Benchmark comparison is unavailable for this window.</p>
      {result.attribution && <ContributionTable report={result.attribution} />}
      <details>
        <summary>Saved valuations and cash flows</summary>
        {result.opening && (
          <p>
            Opening value {money(result.opening.closingValue)} across{" "}
            {result.opening.snapshots.length} saved account valuations.
          </p>
        )}
        {result.closing && (
          <p>
            Closing value {money(result.closing.closingValue)} across{" "}
            {result.closing.snapshots.length} saved account valuations.
          </p>
        )}
        {result.recordedDividends !== null && (
          <p>Recorded dividends {money(result.recordedDividends)}</p>
        )}
        {result.externalFlows.length > 0 && (
          <div className="data-table">
            <table>
              <caption>External cash flows after the opening valuation</caption>
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Deposits</th>
                  <th scope="col">Withdrawals</th>
                  <th scope="col">Saved portfolio value</th>
                </tr>
              </thead>
              <tbody>
                {result.externalFlows.map((flow) => (
                  <tr key={flow.date}>
                    <th scope="row">{flow.date}</th>
                    <td>{money(flow.deposits)}</td>
                    <td>{money(flow.withdrawals)}</td>
                    <td>
                      {money(
                        result.flowValuations.find(
                          (point) => point.date === flow.date,
                        )?.closingValue ?? null,
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </details>
    </div>
  );
}

function ContributionTable({ report }: { report: PerformanceAttribution }) {
  if (report.state !== "AVAILABLE") {
    const reason = {
      INPUT_MISMATCH:
        "The holding breakdown could not be reconciled to the reviewed portfolio total.",
      LISTING_CHANGED:
        "An account used a different exchange listing at the two valuation dates.",
      HOLDING_LIMIT:
        "This window exceeds the 500-security limit for the breakdown.",
    }[report.state];
    return <Alert severity="info">{reason}</Alert>;
  }
  return (
    <details open>
      <summary>Contribution by holding</summary>
      <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
        Each contribution is the change in holding value plus net trade cash and
        recorded dividends. Deposits and withdrawals are excluded.
      </Typography>
      {report.holdings.length > 0 && (
        <section
          className="data-table contribution-table"
          aria-label="Holding contributions"
          // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard scrolling when the table exceeds the viewport.
          tabIndex={0}
        >
          <table>
            <caption>Largest contributions by absolute value</caption>
            <thead>
              <tr>
                <th scope="col">Security</th>
                <th scope="col">Opening value</th>
                <th scope="col">Closing value</th>
                <th scope="col">Net trade cash</th>
                <th scope="col">Dividends</th>
                <th scope="col">Contribution</th>
              </tr>
            </thead>
            <tbody>
              {report.holdings.map((row) => (
                <tr key={row.securityId}>
                  <th scope="row">{row.name}</th>
                  <td>{money(row.openingValue)}</td>
                  <td>{money(row.closingValue)}</td>
                  <td>{money(row.netTradeCash)}</td>
                  <td>{money(row.dividends)}</td>
                  <td>
                    <strong>{money(row.contribution)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {report.holdings.length === 0 && (
        <p>No holdings or security cash movements in this window.</p>
      )}
      <p>Account fees outside trades {money(report.standaloneFees)}</p>
    </details>
  );
}

export function PerformanceWindowFields({
  input,
  onChange,
}: {
  input: PortfolioPerformanceInput;
  onChange: (value: PortfolioPerformanceInput) => void;
}) {
  return (
    <fieldset className="workspace-fieldset">
      <legend>Reviewed valuation window</legend>
      <label>
        Opening valuation date{" "}
        <input
          required
          type="date"
          value={input.start}
          max={input.end || undefined}
          onChange={(event) => {
            onChange({ ...input, start: event.target.value });
          }}
        />
      </label>
      <label>
        Closing valuation date{" "}
        <input
          required
          type="date"
          value={input.end}
          min={input.start || undefined}
          onChange={(event) => {
            onChange({ ...input, end: event.target.value });
          }}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={input.reviewed}
          onChange={(event) => {
            onChange({ ...input, reviewed: event.target.checked });
          }}
        />
        I reviewed the opening balances and transactions, including deposits,
        withdrawals, fees and dividends, for this window
      </label>
    </fieldset>
  );
}
