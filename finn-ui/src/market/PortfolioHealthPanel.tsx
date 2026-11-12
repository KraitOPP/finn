import { useState } from "react";
import type {
  PortfolioHealth,
  PortfolioPerformanceInput,
  PortfolioRisk,
  PortfolioScenario,
  PortfolioScenarioInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPicker } from "../instruments/ListingPicker.tsx";
import { GapChart } from "./GapChart.tsx";
import {
  PerformanceWindowFields,
  performanceReasons,
} from "./PerformancePanel.tsx";
import { money } from "./ValuationPanel.tsx";

const labels: Record<string, string> = {
  NO_ACCOUNTS: "Add at least one source account.",
  PORTFOLIO_BUDGET: "This portfolio exceeds the supported calculation size.",
  PRICES_MISSING: "Review listing choices and prices for unpriced positions.",
  STALE_PRICES: "Refresh the reviewed closes before comparing weights.",
  MIXED_PRICE_SESSIONS:
    "Positions need prices from the same completed session.",
  CASH_UNKNOWN: "A cash-funded allocation needs a known recorded cash balance.",
  INSUFFICIENT_CASH: "The assumed allocation exceeds recorded cash.",
  TARGET_NOT_HELD:
    "Select a holding or enter a positive cash allocation for a candidate.",
  WEEKLY_VALUATIONS_MISSING:
    "Build complete valuations for every weekly date in the window.",
};
const sectorNames: Record<string, string> = {
  BANKING: "Banking",
  FINANCIAL_SERVICES: "Financial services",
  MANUFACTURING: "Manufacturing",
  TECHNOLOGY: "Technology",
  CONSUMER: "Consumer",
  ENERGY: "Energy",
  OTHER: "Other",
  UNCLASSIFIED: "Unclassified",
};
const pct = (value: string | null) =>
  value === null ? "Unavailable" : `${value}%`;

export function PortfolioHealthPanel({
  portfolio,
  candidate,
}: {
  portfolio: string;
  candidate?: string;
}) {
  const [open, setOpen] = useState(Boolean(candidate));
  const path = `/api/v1/portfolios/${portfolio}/health`;
  const data = useResource("PortfolioHealth", open ? path : null);
  return (
    <details
      open={open}
      className="settings-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Portfolio health and scenarios</summary>
      {data.loading && <p role="status">Loading exposure…</p>}
      {data.error && <p role="alert">{data.error}</p>}
      {data.value && <Exposure value={data.value} onRefresh={data.reload} />}
      {open && (
        <>
          <Scenario path={path} candidate={candidate} />
          <WeeklyRisk path={path} />
        </>
      )}
    </details>
  );
}

function Exposure({
  value,
  onRefresh,
}: {
  value: PortfolioHealth;
  onRefresh: () => void;
}) {
  return (
    <section>
      <h4>Current concentration</h4>
      <p>
        {value.priceSession
          ? `Close session ${value.priceSession}`
          : `Valuation checked ${value.asOf}`}
        {" · "}
        {value.unpricedPositions} unpriced · {value.stalePositions} stale ·{" "}
        {value.providerEstimates} Yahoo estimates
      </p>
      {value.state !== "READY" && <p role="status">{labels[value.state]}</p>}
      <button type="button" onClick={onRefresh}>
        Refresh exposure
      </button>
      <dl>
        <dt>Equity value</dt>
        <dd>{money(value.equity)}</dd>
        <dt>Recorded cash</dt>
        <dd>{money(value.cash)}</dd>
        <dt>Largest equity holding</dt>
        <dd>{pct(value.largestWeight)}</dd>
        <dt>Five largest equity holdings</dt>
        <dd>{pct(value.topFiveWeight)}</dd>
      </dl>
      {value.sectors.length > 0 && (
        <details>
          <summary>Equity by sector</summary>
          <ul>
            {value.sectors.map((item) => (
              <li key={item.sector}>
                {sectorNames[item.sector]} · {money(item.value)} ·{" "}
                {pct(item.equityWeight)}
              </li>
            ))}
          </ul>
        </details>
      )}
      {value.holdings.length > 0 && (
        <details>
          <summary>Holdings and unrealised gains or losses</summary>
          <div className="data-table">
            <table>
              <caption>
                Concentration uses total equity. Unrealised gain or loss uses
                recorded cost.
              </caption>
              <thead>
                <tr>
                  <th scope="col">Holding</th>
                  <th scope="col">Sector</th>
                  <th scope="col">Value</th>
                  <th scope="col">Equity weight</th>
                  <th scope="col">Unrealised gain or loss</th>
                </tr>
              </thead>
              <tbody>
                {value.holdings.map((item) => (
                  <tr key={item.securityId}>
                    <th scope="row">{item.name}</th>
                    <td>{sectorNames[item.sector]}</td>
                    <td>{money(item.value)}</td>
                    <td>{pct(item.equityWeight)}</td>
                    <td>{money(item.unrealisedContribution)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}

function Scenario({ path, candidate }: { path: string; candidate?: string }) {
  const [draft, setDraft] = useState<PortfolioScenarioInput>({
    listingId: candidate ?? "",
    cashAllocation: candidate ? "" : "0",
    shockPercent: "0",
  });
  const [listingLabel, setListingLabel] = useState(
    candidate ? "Listing from Discover" : "",
  );
  const [result, setResult] = useState<PortfolioScenario | null>(null);
  const command = usePrivateCommand();
  function change(value: Partial<PortfolioScenarioInput>) {
    setDraft({ ...draft, ...value });
    setResult(null);
  }
  return (
    <details open={Boolean(candidate) || undefined}>
      <summary>Model an allocation or price shock</summary>
      <p>
        Use an assumed INR allocation from recorded cash and a price change for
        one security. Enter zero allocation to model a price change for an
        existing holding.
      </p>
      <ListingPicker
        busy={command.busy}
        summary="Choose a holding or candidate listing"
        action="Model"
        onChoose={(listing) => {
          change({ listingId: listing.listingId });
          setListingLabel(`${listing.exchange} ${listing.symbol}`);
        }}
      />
      <form
        className="workspace-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const next = await command.run((csrf) =>
            requestContract("PortfolioScenario", `${path}/scenario`, {
              method: "POST",
              csrf,
              body: draft,
            }),
          );
          if (next) setResult(next);
        }}
      >
        <p>{listingLabel || "Choose a listing to model."}</p>
        <label>
          Assumed cash allocation (INR){" "}
          <input
            required
            inputMode="decimal"
            maxLength={32}
            value={draft.cashAllocation}
            onChange={(event) => change({ cashAllocation: event.target.value })}
          />
        </label>
        <label>
          Assumed price change (%){" "}
          <input
            required
            type="number"
            min={-100}
            max={500}
            step="any"
            value={draft.shockPercent}
            onChange={(event) => change({ shockPercent: event.target.value })}
          />
        </label>
        <button type="submit" disabled={command.busy || !draft.listingId}>
          Calculate scenario
        </button>
      </form>
      {command.error && <p role="alert">{command.error}</p>}
      {result && (
        <div>
          <h4>{result.targetName}</h4>
          {result.state === "SIMULATED" ? (
            <>
              <p>
                Hypothetical change {money(result.valueChange)} after an
                allocation of {money(result.cashAllocation)}
                {" and a "}
                {result.shockPercent}% price change
                {result.priceSession
                  ? ` using closes from ${result.priceSession}`
                  : ""}
                .
              </p>
              <div className="data-table">
                <table>
                  <caption>Recorded values and scenario values</caption>
                  <thead>
                    <tr>
                      <th scope="col">Measure</th>
                      <th scope="col">Before</th>
                      <th scope="col">After</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">Equity</th>
                      <td>{money(result.beforeEquity)}</td>
                      <td>{money(result.afterEquity)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Cash</th>
                      <td>{money(result.beforeCash)}</td>
                      <td>{money(result.afterCash)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Total</th>
                      <td>{money(result.beforeTotal)}</td>
                      <td>{money(result.afterTotal)}</td>
                    </tr>
                    <tr>
                      <th scope="row">Target equity weight</th>
                      <td>{pct(result.beforeTargetWeight)}</td>
                      <td>{pct(result.afterTargetWeight)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p role="status">{labels[result.state]}</p>
          )}
        </div>
      )}
    </details>
  );
}

function WeeklyRisk({ path }: { path: string }) {
  const [input, setInput] = useState<PortfolioPerformanceInput>({
    start: "",
    end: "",
    reviewed: false,
  });
  const [result, setResult] = useState<PortfolioRisk | null>(null);
  const command = usePrivateCommand();
  const days = (Date.parse(input.end) - Date.parse(input.start)) / 86_400_000;
  const valid = days >= 56 && days <= 364 && days % 7 === 0;
  return (
    <details>
      <summary>Weekly drawdown and volatility</summary>
      <p>
        Choose 8 to 52 whole weeks. Every weekly closing value and every
        external cash-flow date needs a saved valuation for each account.
      </p>
      <form
        className="workspace-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const next = await command.run((csrf) =>
            requestContract("PortfolioRisk", `${path}/risk`, {
              method: "POST",
              csrf,
              body: input,
            }),
          );
          if (next) setResult(next);
        }}
      >
        <PerformanceWindowFields
          input={input}
          onChange={(value) => {
            setInput(value);
            setResult(null);
          }}
        />
        {input.start && input.end && !valid && (
          <p>Choose dates 8 to 52 whole weeks apart.</p>
        )}
        <button type="submit" disabled={command.busy || !valid}>
          Calculate weekly risk
        </button>
      </form>
      {command.error && <p role="alert">{command.error}</p>}
      {result &&
        (result.state === "AVAILABLE" ? (
          <>
            <dl>
              <dt>Largest peak-to-trough decline at weekly closes</dt>
              <dd>{pct(result.maxDrawdownPercent)}</dd>
              <dt>Annualised volatility from weekly returns</dt>
              <dd>{pct(result.annualizedVolatilityPercent)}</dd>
            </dl>
            <p>
              The index starts at 100. External flows are removed before linking
              returns. Volatility is the sample standard deviation of weekly
              returns scaled by the square root of 52.
            </p>
            <GapChart
              label="Cash-flow-adjusted weekly value index"
              unitPrefix=""
              points={result.observations.map((item) => ({
                date: item.date,
                amount: item.indexValue,
              }))}
            />
            <div className="data-table">
              <table>
                <caption>Weekly value index</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Index</th>
                  </tr>
                </thead>
                <tbody>
                  {result.observations.map((item) => (
                    <tr key={item.date}>
                      <th scope="row">{item.date}</th>
                      <td>{item.indexValue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p role="status">
            {labels[result.reason] ?? performanceReasons[result.reason]}
          </p>
        ))}
    </details>
  );
}
