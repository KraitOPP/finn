import { useRef, useState } from "react";
import type {
  DiscoveryMetricSupport,
  DiscoverySector,
  StockScreen,
  StockScreenInput,
  StockScreenResult,
  StockScreenRun,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import {
  DiscoveryPeriodFields,
  emptyPeriod,
  sectors,
} from "./DiscoveryFields.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { factAmount, metricLabels } from "./FinancialFacts.tsx";
import { targetScales } from "./MetricTargetFields.tsx";
import { PeerRankings } from "./PeerRankings.tsx";
import { factReasons } from "./ThesisConditions.tsx";

const base = "/api/v1/discovery";
const path = `${base}/screens`;
const resultStates = {
  MATCH: "Matched",
  EXCLUDED: "Excluded by filter",
  UNKNOWN: "Insufficient evidence",
  OUTSIDE_SECTOR: "Outside selected sector",
} as const;
const checkStates = {
  PASS: "Passed",
  FAIL: "Failed",
  UNKNOWN: "Unknown",
} as const;

export function SavedScreens({
  metrics,
}: {
  metrics: DiscoveryMetricSupport[];
}) {
  const [id, setId] = useState("");
  const [editing, setEditing] = useState(false);
  const screens = useResource("StockScreenIndex", path);
  const current = screens.value?.items.find((item) => item.screenId === id);
  return (
    <section className="detail-card">
      <h2>Saved stock screens</h2>
      <p>
        Set thresholds for one sector. Each run saves the company list and
        figures used, including gaps.
      </p>
      {screens.error && <p role="alert">{screens.error}</p>}
      {screens.loading && <p role="status">Loading screens…</p>}
      {screens.value && (
        <>
          <label>
            Screen{" "}
            <select
              value={id}
              onChange={(event) => {
                setId(event.target.value);
                setEditing(false);
              }}
            >
              <option value="">Choose a saved screen</option>
              {screens.value.items.map((item) => (
                <option key={item.screenId} value={item.screenId}>
                  {item.definition.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setId("");
              setEditing(true);
            }}
          >
            New screen
          </button>
          {editing ? (
            <ScreenEditor
              key={id}
              current={current}
              metrics={metrics}
              onCancel={() => setEditing(false)}
              onSaved={(item) => {
                setId(item.screenId);
                setEditing(false);
                screens.reload();
              }}
            />
          ) : (
            current && (
              <ScreenHistory
                key={current.screenId}
                current={current}
                metrics={metrics}
                onEdit={() => setEditing(true)}
              />
            )
          )}
        </>
      )}
    </section>
  );
}

type DraftFilter = StockScreenInput["filters"][number] & { key: number };
function ScreenEditor({
  current,
  metrics,
  onSaved,
  onCancel,
}: {
  current?: StockScreen;
  metrics: DiscoveryMetricSupport[];
  onSaved: (item: StockScreen) => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const nextKey = useRef(6);
  const [name, setName] = useState(current?.definition.name ?? "");
  const [sector, setSector] = useState<DiscoverySector>(
    current?.definition.sector ?? "MANUFACTURING",
  );
  const [period, setPeriod] = useState(
    current?.definition.period ?? emptyPeriod,
  );
  const [filters, setFilters] = useState<DraftFilter[]>(
    current?.definition.filters.map((item, key) => ({ ...item, key })) ?? [],
  );
  const allowed = metrics.filter((item) => item.sectors.includes(sector));
  function update(key: number, value: Partial<DraftFilter>) {
    setFilters((previous) =>
      previous.map((item) => (item.key === key ? { ...item, ...value } : item)),
    );
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const screen: StockScreenInput = {
          name,
          sector,
          period,
          filters: filters.map(({ key: _key, ...item }) => item),
        };
        const result = await command.run((csrf) =>
          requestContract(
            "StockScreen",
            current ? `${path}/${current.screenId}` : path,
            {
              method: "POST",
              csrf,
              body: current
                ? { expectedRevision: current.revision, screen }
                : screen,
            },
          ),
        );
        if (result) onSaved(result);
      }}
    >
      <label>
        Screen name{" "}
        <input
          value={name}
          required
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label>
        Sector{" "}
        <select
          value={sector}
          onChange={(event) => {
            const value = event.target.value as DiscoverySector;
            setSector(value);
            setFilters((previous) =>
              previous.filter((item) =>
                metrics.some(
                  (metric) =>
                    metric.metric === item.metric &&
                    metric.sectors.includes(value),
                ),
              ),
            );
          }}
        >
          {Object.entries(sectors).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <DiscoveryPeriodFields value={period} onChange={setPeriod} />
      {filters.map((item, index) => (
        <fieldset key={item.key}>
          <legend>Filter {index + 1}</legend>
          <label>
            Metric{" "}
            <select
              value={item.metric}
              onChange={(event) => {
                const selected = allowed.find(
                  (metric) => metric.metric === event.target.value,
                );
                if (selected)
                  update(item.key, {
                    metric: selected.metric,
                    scale: selected.unit === "MONEY" ? item.scale : "ONES",
                  });
              }}
            >
              {allowed.map((metric) => (
                <option key={metric.metric} value={metric.metric}>
                  {metricLabels[metric.metric]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Rule{" "}
            <select
              value={item.comparator}
              onChange={(event) =>
                update(item.key, {
                  comparator: event.target.value as DraftFilter["comparator"],
                })
              }
            >
              <option value="GTE">At least</option>
              <option value="LTE">At most</option>
            </select>
          </label>
          <label>
            Threshold{" "}
            <input
              required
              inputMode="decimal"
              maxLength={32}
              value={item.amount}
              onChange={(event) =>
                update(item.key, { amount: event.target.value })
              }
            />
          </label>
          {allowed.find((metric) => metric.metric === item.metric)?.unit ===
            "MONEY" && (
            <label>
              INR scale{" "}
              <select
                value={item.scale}
                onChange={(event) =>
                  update(item.key, {
                    scale: event.target.value as DraftFilter["scale"],
                  })
                }
              >
                {targetScales.map((scale) => (
                  <option key={scale} value={scale}>
                    {scale.toLowerCase()}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() =>
              setFilters((previous) =>
                previous.filter((row) => row.key !== item.key),
              )
            }
          >
            Remove filter
          </button>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={filters.length >= 6 || allowed.length === 0}
        onClick={() => {
          const first = allowed[0];
          if (first)
            setFilters([
              ...filters,
              {
                key: nextKey.current++,
                metric: first.metric,
                comparator: "GTE",
                amount: "",
                scale: "ONES",
              },
            ]);
        }}
      >
        Add filter
      </button>
      <button type="submit" disabled={command.busy || filters.length === 0}>
        Save screen version
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {command.error && <p role="alert">{command.error}</p>}
    </form>
  );
}

function ScreenHistory({
  current,
  metrics,
  onEdit,
}: {
  current: StockScreen;
  metrics: DiscoveryMetricSupport[];
  onEdit: () => void;
}) {
  const [revision, setRevision] = useState(current.revision);
  const [runId, setRunId] = useState("");
  const key = useRef<{ revision: number; id: string } | null>(null);
  const command = usePrivateCommand();
  const endpoint = `${path}/${current.screenId}`;
  const versions = useResource("StockScreenIndex", `${endpoint}/versions`);
  const history = useResource("StockScreenHistory", `${endpoint}/runs`);
  const run = useResource(
    "StockScreenRun",
    runId ? `${base}/screen-runs/${runId}` : null,
  );
  const picked =
    versions.value?.items.find((item) => item.revision === revision) ?? current;
  return (
    <div className="settings-card">
      <p>
        {sectors[picked.definition.sector]} · {picked.definition.period.start}{" "}
        to {picked.definition.period.end}
      </p>
      <ul>
        {picked.definition.filters.map((item) => (
          <li key={`${item.metric}-${item.comparator}`}>
            {metricLabels[item.metric]} ·{" "}
            {item.comparator === "GTE" ? "at least" : "at most"} {item.amount}
            {item.scale === "ONES" ? "" : ` ${item.scale.toLowerCase()}`}
          </li>
        ))}
      </ul>
      <label>
        Version to run{" "}
        <select
          value={revision}
          onChange={(event) => setRevision(Number(event.target.value))}
        >
          {(versions.value?.items ?? [current]).map((item) => (
            <option key={item.revision} value={item.revision}>
              Version {item.revision}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={onEdit}>
        Edit latest version
      </button>
      <button
        type="button"
        disabled={command.busy}
        onClick={async () => {
          if (key.current?.revision !== revision)
            key.current = { revision, id: crypto.randomUUID() };
          const requestId = key.current.id;
          const result = await command.run((csrf) =>
            requestContract("StockScreenRun", `${endpoint}/runs`, {
              method: "POST",
              csrf,
              body: { revision, requestId },
            }),
          );
          if (result) {
            key.current = null;
            setRunId(result.runId);
            history.reload();
          }
        }}
      >
        Run with current reviewed inputs
      </button>
      {(command.error || versions.error || history.error || run.error) && (
        <p role="alert">
          {command.error || versions.error || history.error || run.error}
        </p>
      )}
      {history.value && history.value.items.length > 0 && (
        <label>
          Saved run{" "}
          <select
            value={runId}
            onChange={(event) => setRunId(event.target.value)}
          >
            <option value="">Choose a run</option>
            {history.value.items.map((item) => (
              <option key={item.runId} value={item.runId}>
                Version {item.revision} · {item.createdAt}
              </option>
            ))}
          </select>
        </label>
      )}
      {run.loading && <p role="status">Loading the retained run…</p>}
      {run.value && (
        <ScreenResults
          key={run.value.runId}
          run={run.value}
          metrics={metrics}
        />
      )}
    </div>
  );
}

function ScreenResults({
  run,
  metrics,
}: {
  run: StockScreenRun;
  metrics: DiscoveryMetricSupport[];
}) {
  const lists = useResource("WatchlistIndex", "/api/v1/watchlists");
  const [watchlist, setWatchlist] = useState("");
  return (
    <section>
      <h3>
        {run.screen.definition.name} · version {run.screen.revision}
      </h3>
      <p>
        Inputs captured <LocalTime value={run.inputs.capturedAt} /> ·{" "}
        {run.results.filter((item) => item.state === "MATCH").length} matches
      </p>
      {run.results.length === 0 && <p>No active companies in this run.</p>}
      {run.results.some((item) => item.state === "MATCH") && (
        <label>
          Watchlist for matches{" "}
          <select
            value={watchlist}
            onChange={(event) => setWatchlist(event.target.value)}
          >
            <option value="">Choose a watchlist</option>
            {lists.value?.items.map((item) => (
              <option key={item.watchlistId} value={item.watchlistId}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {lists.error && <p role="alert">{lists.error}</p>}
      {run.results.map((item) => (
        <ScreenCompany
          key={item.member.companyId}
          result={item}
          watchlist={watchlist}
        />
      ))}
      <PeerRankings run={run} metrics={metrics} />
    </section>
  );
}

function ScreenCompany({
  result,
  watchlist,
}: {
  result: StockScreenResult;
  watchlist: string;
}) {
  const command = usePrivateCommand();
  const [anchor, setAnchor] = useState("");
  const [saved, setSaved] = useState("");
  return (
    <details>
      <summary>
        {result.member.name} · {resultStates[result.state]}
      </summary>
      <p>
        {result.member.exchange} {result.member.symbol} ·{" "}
        {sectors[result.member.sector]}{" "}
        <a href={`#/research?company=${result.member.companyId}`}>
          Open company research
        </a>
      </p>
      <ul>
        {result.checks.map((item) => (
          <li key={`${item.filter.metric}-${item.filter.comparator}`}>
            {metricLabels[item.filter.metric]} · {checkStates[item.state]} ·{" "}
            {item.fact ? factAmount(item.fact) : factReasons[item.reason]}
            {item.fact && (
              <button
                type="button"
                onClick={() =>
                  setAnchor(
                    anchor === item.fact?.anchorId
                      ? ""
                      : (item.fact?.anchorId ?? ""),
                  )
                }
              >
                Open figure source
              </button>
            )}
          </li>
        ))}
      </ul>
      {anchor && <AnchorEvidence id={anchor} />}
      {watchlist && result.state === "MATCH" && (
        <button
          type="button"
          disabled={command.busy || saved === watchlist}
          onClick={async () => {
            const tracked = await command.run((csrf) =>
              requestContract(
                "WatchlistDetail",
                `/api/v1/watchlists/${watchlist}/items`,
                {
                  method: "POST",
                  csrf,
                  body: { listingId: result.member.listingId, tracked: true },
                },
              ),
            );
            if (tracked) setSaved(watchlist);
          }}
        >
          {saved === watchlist ? "Saved to watchlist" : "Save to watchlist"}
        </button>
      )}
      {command.error && <p role="alert">{command.error}</p>}
    </details>
  );
}
