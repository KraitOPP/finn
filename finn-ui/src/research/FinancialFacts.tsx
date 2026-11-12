import { useState } from "react";
import type {
  FinancialDimensions,
  FinancialFact,
  ReportedFactInput,
  ResearchLocation,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { versionPath } from "./SourceEvidence.tsx";

const root = "/api/v1/research";
export const metricLabels: Record<FinancialDimensions["metric"], string> = {
  REVENUE: "Revenue",
  EBITDA: "EBITDA",
  PROFIT_AFTER_TAX: "Profit after tax",
  CASH_FROM_OPERATIONS: "Cash from operations",
  CAPITAL_EXPENDITURE: "Capital expenditure",
  FREE_CASH_FLOW: "Free cash flow",
  TOTAL_DEBT: "Total debt",
  TOTAL_EQUITY: "Total equity",
  EPS_BASIC: "Basic earnings per share",
  OPERATING_MARGIN: "Operating margin",
};
const scales = [
  "ONES",
  "THOUSAND",
  "LAKH",
  "MILLION",
  "CRORE",
  "BILLION",
] as const;
const periods = {
  QUARTER: "Quarter",
  YTD: "Year to date",
  FULL_YEAR: "Full year",
  AS_OF: "As of",
};
const currencies = ["INR", "USD", "EUR", "GBP", "JPY"] as const;

export function CompanyFacts({ company }: { company: string }) {
  const [offset, setOffset] = useState(0);
  const [editing, setEditing] = useState<FinancialFact | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const data = useResource(
    "FinancialFactPage",
    `${root}/companies/${company}/facts?offset=${offset}`,
  );
  function saved() {
    setEditing(null);
    setNotice("Reviewed value saved.");
    data.reload();
  }
  return (
    <div>
      {notice && <p role="status">{notice}</p>}
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading reviewed facts…</p>
      ) : data.value.items.length === 0 ? (
        <p>No reviewed facts for this company.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((fact) => (
            <li key={fact.factId}>
              <div>
                <strong>
                  {metricLabels[fact.dimensions.metric]} · {factAmount(fact)}
                </strong>
                <FactLabels fact={fact} />
                <button
                  type="button"
                  onClick={() =>
                    setOpen(open === fact.factId ? null : fact.factId)
                  }
                >
                  Versions and comparison
                </button>
                {fact.origin === "REPORTED" && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => {
                        setNotice("");
                        setEditing(fact);
                      }}
                    >
                      Revise {metricLabels[fact.dimensions.metric]}
                    </button>
                  </>
                )}
                {open === fact.factId && (
                  <FactDetails
                    key={`${fact.factId}-${fact.revision}`}
                    fact={fact}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {(offset > 0 || data.value?.hasMore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 50)}
          >
            Newer periods
          </button>
          <button
            type="button"
            disabled={!data.value?.hasMore}
            onClick={() => setOffset(offset + 50)}
          >
            Older periods
          </button>
        </div>
      )}
      <FactForm
        key={editing ? `${editing.factId}-${editing.revision}` : "new"}
        company={company}
        editing={editing}
        onSave={saved}
        onCancel={() => setEditing(null)}
      />
      {data.value && (
        <DeriveCashFlow
          company={company}
          facts={data.value.items}
          onSave={saved}
        />
      )}
    </div>
  );
}

export function factAmount(fact: FinancialFact) {
  const { dimensions: d } = fact;
  if (d.unit === "PERCENT") return `${fact.amount}%`;
  if (d.unit === "PER_SHARE") return `${d.currency} ${fact.amount} per share`;
  return `${d.currency} ${fact.amount}${fact.scale === "ONES" ? "" : ` ${fact.scale.toLowerCase()}`}`;
}

export function FactLabels({ fact }: { fact: FinancialFact }) {
  const d = fact.dimensions;
  return (
    <p>
      {d.basis === "CONSOLIDATED" ? "Consolidated" : "Standalone"} ·{" "}
      {periods[d.periodKind]} ·{" "}
      {d.periodStart === d.periodEnd
        ? d.periodEnd
        : `${d.periodStart} to ${d.periodEnd}`}{" "}
      · {fact.origin === "REPORTED" ? "Reported" : "Calculated"} · Version{" "}
      {fact.revision}
    </p>
  );
}

function FactDetails({ fact }: { fact: FinancialFact }) {
  const path = `${root}/facts/${fact.factId}`;
  const versions = useResource("FinancialFactHistory", `${path}/versions`);
  const prior = useResource("FinancialFactHistory", `${path}/comparables`);
  const [revision, setRevision] = useState(fact.revision);
  const [previous, setPrevious] = useState("");
  const [showSource, setShowSource] = useState(false);
  const comparison = useResource(
    "FinancialComparison",
    previous ? `${path}/comparison?previous=${previous}` : null,
  );
  const selected = versions.value?.items.find(
    (item) => item.revision === revision,
  );
  return (
    <section className="settings-card">
      {versions.error ? (
        <p role="alert">{versions.error}</p>
      ) : !versions.value ? (
        <p role="status">Loading versions…</p>
      ) : (
        <>
          <label>
            Fact version{" "}
            <select
              value={revision}
              onChange={(event) => {
                setRevision(Number(event.target.value));
                setShowSource(false);
              }}
            >
              {versions.value.items.map((item) => (
                <option key={item.revision} value={item.revision}>
                  Version {item.revision} · {factAmount(item)}
                </option>
              ))}
            </select>
          </label>
          {selected && (
            <>
              <p>
                {selected.sourceTitle} · Document version{" "}
                {selected.documentRevision} · Published{" "}
                {selected.publishedAt ? (
                  <LocalTime value={selected.publishedAt} />
                ) : (
                  "time unknown"
                )}
              </p>
              <button type="button" onClick={() => setShowSource(!showSource)}>
                {showSource ? "Hide evidence" : "Inspect evidence"}
              </button>
              {showSource && <FactEvidence fact={selected} />}
            </>
          )}
        </>
      )}
      {prior.error && <p role="alert">{prior.error}</p>}
      {prior.value?.items.length === 0 && (
        <p>No comparable earlier period has been reviewed.</p>
      )}
      {prior.value && prior.value.items.length > 0 && (
        <label>
          Compare latest version with{" "}
          <select
            value={previous}
            onChange={(event) => setPrevious(event.target.value)}
          >
            <option value="">Choose earlier period</option>
            {prior.value.items.map((item) => (
              <option key={item.factId} value={item.factId}>
                {item.dimensions.periodEnd} · {factAmount(item)}
              </option>
            ))}
          </select>
        </label>
      )}
      {comparison.error && <p role="alert">{comparison.error}</p>}
      {comparison.value &&
        (comparison.value.state === "COMPARABLE" ? (
          <p>
            Change in base units: {comparison.value.change}
            {fact.dimensions.unit === "PERCENT"
              ? " percentage points"
              : ` ${fact.dimensions.currency}`}
            {comparison.value.percentChange !== null
              ? ` · ${comparison.value.percentChange}%`
              : comparison.value.reason === "NON_POSITIVE_BASE"
                ? " · Percentage change is unavailable with a zero or negative base."
                : ""}
          </p>
        ) : (
          <p>The selected periods have incompatible reporting dimensions.</p>
        ))}
    </section>
  );
}

function FactEvidence({ fact }: { fact: FinancialFact }) {
  return fact.operands.length ? (
    <div>
      <p>Free cash flow = cash from operations − capital expenditure.</p>
      {fact.operands.map((operand) => (
        <OperandEvidence key={operand.factId} operand={operand} />
      ))}
    </div>
  ) : (
    <AnchorEvidence id={fact.anchorId} />
  );
}

function OperandEvidence({
  operand,
}: {
  operand: FinancialFact["operands"][number];
}) {
  const data = useResource(
    "FinancialFactHistory",
    `${root}/facts/${operand.factId}/versions`,
  );
  const fact = data.value?.items.find(
    (item) => item.revision === operand.revision,
  );
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!fact) return <p role="status">Loading calculation input…</p>;
  return (
    <div>
      <p>
        {metricLabels[fact.dimensions.metric]} · Version {fact.revision} ·{" "}
        {factAmount(fact)}
      </p>
      <AnchorEvidence id={fact.anchorId} />
    </div>
  );
}

function FactForm({
  company,
  editing,
  onSave,
  onCancel,
}: {
  company: string;
  editing: FinancialFact | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const [dimensions, setDimensions] = useState<FinancialDimensions>(
    editing?.dimensions ?? {
      metric: "REVENUE",
      basis: "CONSOLIDATED",
      periodKind: "QUARTER",
      periodStart: "",
      periodEnd: "",
      unit: "MONEY",
      currency: "INR",
    },
  );
  const [amount, setAmount] = useState(editing?.amount ?? "");
  const [scale, setScale] = useState<ReportedFactInput["scale"]>(
    editing?.scale ?? "ONES",
  );
  const [anchor, setAnchor] = useState<ResearchLocation | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const anchorId = anchor?.anchorId ?? editing?.anchorId ?? "";
  function update<K extends keyof FinancialDimensions>(
    key: K,
    value: FinancialDimensions[K],
  ) {
    setDimensions((old) => ({ ...old, [key]: value }));
  }
  const stock =
    dimensions.metric === "TOTAL_DEBT" || dimensions.metric === "TOTAL_EQUITY";
  return (
    <section className="settings-card">
      <h3>{editing ? "Review a fact revision" : "Record a reported value"}</h3>
      <EvidencePicker company={company} onChoose={setAnchor} />
      {anchor ? (
        <p>
          {anchor.sourceTitle} · Page {anchor.page}, line {anchor.lineStart} ·{" "}
          {anchor.quote}
        </p>
      ) : (
        editing && <p>Using the evidence from the previous fact version.</p>
      )}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!anchorId || !reviewed) return;
          const fact: ReportedFactInput = {
            dimensions: {
              ...dimensions,
              periodStart: stock
                ? dimensions.periodEnd
                : dimensions.periodStart,
            },
            anchorId,
            amount,
            scale,
            reviewed: true,
          };
          const endpoint = editing
            ? `${root}/facts/${editing.factId}`
            : `${root}/companies/${company}/facts`;
          const saved = await command.run((csrf) =>
            requestContract("FinancialFact", endpoint, {
              method: "POST",
              csrf,
              body: editing
                ? {
                    companyId: company,
                    expectedRevision: editing.revision,
                    fact,
                  }
                : fact,
            }),
          );
          if (saved) {
            setReviewed(false);
            setAmount("");
            onSave();
          }
        }}
      >
        <label>
          Metric{" "}
          <select
            value={dimensions.metric}
            disabled={!!editing}
            onChange={(event) => {
              const metric = event.target
                .value as FinancialDimensions["metric"];
              const unit =
                metric === "EPS_BASIC"
                  ? "PER_SHARE"
                  : metric === "OPERATING_MARGIN"
                    ? "PERCENT"
                    : "MONEY";
              const stockMetric =
                metric === "TOTAL_DEBT" || metric === "TOTAL_EQUITY";
              setDimensions({
                ...dimensions,
                metric,
                unit,
                currency:
                  unit === "PERCENT" ? null : (dimensions.currency ?? "INR"),
                periodKind: stockMetric
                  ? "AS_OF"
                  : dimensions.periodKind === "AS_OF"
                    ? "QUARTER"
                    : dimensions.periodKind,
              });
              if (unit !== "MONEY") setScale("ONES");
            }}
          >
            {Object.entries(metricLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Statement basis{" "}
          <select
            disabled={!!editing}
            value={dimensions.basis}
            onChange={(event) =>
              update(
                "basis",
                event.target.value as FinancialDimensions["basis"],
              )
            }
          >
            <option value="CONSOLIDATED">Consolidated</option>
            <option value="STANDALONE">Standalone</option>
          </select>
        </label>
        <label>
          Period type{" "}
          <select
            disabled={!!editing || stock}
            value={dimensions.periodKind}
            onChange={(event) =>
              update(
                "periodKind",
                event.target.value as FinancialDimensions["periodKind"],
              )
            }
          >
            {Object.entries(periods)
              .filter(([value]) =>
                stock ? value === "AS_OF" : value !== "AS_OF",
              )
              .map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        {!stock && (
          <label>
            Period start{" "}
            <input
              type="date"
              required
              disabled={!!editing}
              value={dimensions.periodStart}
              onChange={(event) => update("periodStart", event.target.value)}
            />
          </label>
        )}
        <label>
          {stock ? "As-of date" : "Period end"}{" "}
          <input
            type="date"
            required
            disabled={!!editing}
            value={dimensions.periodEnd}
            onChange={(event) => update("periodEnd", event.target.value)}
          />
        </label>
        {dimensions.currency && (
          <label>
            Currency{" "}
            <select
              disabled={!!editing}
              value={dimensions.currency}
              onChange={(event) =>
                update(
                  "currency",
                  event.target.value as FinancialDimensions["currency"],
                )
              }
            >
              {currencies.map((currency) => (
                <option key={currency}>{currency}</option>
              ))}
            </select>
          </label>
        )}
        {dimensions.unit === "MONEY" && (
          <label>
            Scale as printed{" "}
            <select
              value={scale}
              onChange={(event) =>
                setScale(event.target.value as ReportedFactInput["scale"])
              }
            >
              {scales.map((option) => (
                <option key={option} value={option}>
                  {option.toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          Reported amount{dimensions.unit === "PERCENT" ? " (%)" : ""}{" "}
          <input
            required
            inputMode="decimal"
            maxLength={32}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            required
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          I checked the amount, unit, period and basis against this evidence.
        </label>
        {command.error && <p role="alert">{command.error}</p>}
        <button
          className="primary-button"
          type="submit"
          disabled={command.busy || !anchorId}
        >
          Save reported value
        </button>
        {editing && (
          <button type="button" onClick={onCancel}>
            Cancel revision
          </button>
        )}
      </form>
    </section>
  );
}

export function EvidencePicker({
  company,
  onChoose,
}: {
  company: string;
  onChoose: (location: ResearchLocation) => void;
}) {
  const [open, setOpen] = useState(false);
  const [sourceOffset, setSourceOffset] = useState(0);
  const [source, setSource] = useState("");
  const [revision, setRevision] = useState<number | null>(null);
  const [anchorOffset, setAnchorOffset] = useState(0);
  const sources = useResource(
    "CompanySourcePage",
    open ? `${root}/sources?companyId=${company}&offset=${sourceOffset}` : null,
  );
  const versions = useResource(
    "CompanySourceVersions",
    source ? `${root}/sources/${source}/versions` : null,
  );
  const selected = revision ?? versions.value?.items[0]?.revision;
  const anchors = useResource(
    "ResearchLocations",
    source && selected
      ? `${versionPath(source, selected)}/anchors?offset=${anchorOffset}`
      : null,
  );
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Choose extracted evidence</summary>
      {open && (
        <>
          <label>
            Evidence source{" "}
            <select
              value={source}
              onChange={(event) => {
                setSource(event.target.value);
                setRevision(null);
                setAnchorOffset(0);
              }}
            >
              <option value="">Choose a source</option>
              {sources.value?.items.map((item) => (
                <option key={item.documentId} value={item.documentId}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          {(sourceOffset > 0 || sources.value?.hasMore) && (
            <div className="pagination">
              <button
                type="button"
                disabled={sourceOffset === 0}
                onClick={() => {
                  setSourceOffset(sourceOffset - 40);
                  setSource("");
                }}
              >
                Previous sources
              </button>
              <button
                type="button"
                disabled={!sources.value?.hasMore}
                onClick={() => {
                  setSourceOffset(sourceOffset + 40);
                  setSource("");
                }}
              >
                Next sources
              </button>
            </div>
          )}
          {versions.value && (
            <label>
              Evidence version{" "}
              <select
                value={selected}
                onChange={(event) => {
                  setRevision(Number(event.target.value));
                  setAnchorOffset(0);
                }}
              >
                {versions.value.items.map((item) => (
                  <option key={item.revision} value={item.revision}>
                    Version {item.revision} · {item.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(sources.error || versions.error || anchors.error) && (
            <p role="alert">
              {sources.error || versions.error || anchors.error}
            </p>
          )}
          {anchors.value?.items.length === 0 && (
            <p>
              Extract evidence for this source version in Primary sources first.
            </p>
          )}
          {anchors.value && (
            <ul className="security-list">
              {anchors.value.items.map((item) => (
                <li key={item.anchorId}>
                  <div>
                    <p>{item.quote}</p>
                    <button type="button" onClick={() => onChoose(item)}>
                      Use page {item.page}, line {item.lineStart}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {(anchorOffset > 0 || anchors.value?.hasMore) && (
            <div className="pagination">
              <button
                type="button"
                disabled={anchorOffset === 0}
                onClick={() => setAnchorOffset(anchorOffset - 40)}
              >
                Previous passages
              </button>
              <button
                type="button"
                disabled={!anchors.value?.hasMore}
                onClick={() => setAnchorOffset(anchorOffset + 40)}
              >
                Next passages
              </button>
            </div>
          )}
        </>
      )}
    </details>
  );
}

function DeriveCashFlow({
  company,
  facts,
  onSave,
}: {
  company: string;
  facts: FinancialFact[];
  onSave: () => void;
}) {
  const command = usePrivateCommand();
  const [cash, setCash] = useState("");
  const [capex, setCapex] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const operating = facts.find((fact) => fact.factId === cash);
  const compatible = (fact: FinancialFact) =>
    !!operating &&
    fact.dimensions.basis === operating.dimensions.basis &&
    fact.dimensions.periodKind === operating.dimensions.periodKind &&
    fact.dimensions.periodStart === operating.dimensions.periodStart &&
    fact.dimensions.periodEnd === operating.dimensions.periodEnd &&
    fact.dimensions.currency === operating.dimensions.currency;
  const expense = facts.find(
    (fact) => fact.factId === capex && compatible(fact),
  );
  const existing = facts.find(
    (fact) => fact.dimensions.metric === "FREE_CASH_FLOW" && compatible(fact),
  );
  return (
    <details className="settings-card">
      <summary>Calculate free cash flow</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (!operating || !expense || !reviewed) return;
          const result = await command.run((csrf) =>
            requestContract(
              "FinancialFact",
              `${root}/companies/${company}/facts/derive`,
              {
                method: "POST",
                csrf,
                body: {
                  existingFactId: existing?.factId ?? null,
                  expectedRevision: existing?.revision ?? null,
                  operatingCash: {
                    factId: operating.factId,
                    revision: operating.revision,
                  },
                  capitalExpenditure: {
                    factId: expense.factId,
                    revision: expense.revision,
                  },
                  reviewed: true,
                },
              },
            ),
          );
          if (result) {
            setReviewed(false);
            onSave();
          }
        }}
      >
        <p>
          Cash from operations less capital expenditure recorded as a positive
          outflow.
        </p>
        <label>
          Cash from operations{" "}
          <select
            required
            value={cash}
            onChange={(event) => {
              setCash(event.target.value);
              setCapex("");
              setReviewed(false);
            }}
          >
            <option value="">Choose a reviewed value</option>
            {facts
              .filter(
                (fact) => fact.dimensions.metric === "CASH_FROM_OPERATIONS",
              )
              .map((fact) => (
                <option key={fact.factId} value={fact.factId}>
                  {fact.dimensions.periodEnd} ·{" "}
                  {fact.dimensions.basis.toLowerCase()} · {factAmount(fact)}
                </option>
              ))}
          </select>
        </label>
        <label>
          Capital expenditure{" "}
          <select
            required
            value={capex}
            onChange={(event) => setCapex(event.target.value)}
          >
            <option value="">Choose a compatible reviewed value</option>
            {facts
              .filter(
                (fact) =>
                  fact.dimensions.metric === "CAPITAL_EXPENDITURE" &&
                  compatible(fact),
              )
              .map((fact) => (
                <option key={fact.factId} value={fact.factId}>
                  {factAmount(fact)}
                </option>
              ))}
          </select>
        </label>
        {existing && (
          <p>
            This calculation creates a new version of the saved free cash flow
            fact for this period.
          </p>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            required
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
          I checked the two inputs and their units.
        </label>
        {command.error && <p role="alert">{command.error}</p>}
        <button
          className="primary-button"
          type="submit"
          disabled={command.busy || !expense}
        >
          Save calculated free cash flow
        </button>
      </form>
    </details>
  );
}
