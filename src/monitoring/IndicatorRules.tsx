import { useState } from "react";
import type {
  IndicatorCreate,
  IndicatorEvaluation,
  IndicatorRule,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPicker } from "../instruments/ListingPicker.tsx";

const path = "/api/v1/monitoring/indicators";
const labels = { VOLUME: "Volume", ALLOCATION: "Concentration" };
const state = {
  WAITING: "Waiting for evaluation",
  INSUFFICIENT_COVERAGE: "Insufficient comparable data",
  EVALUATED: "Evaluated",
};

export function IndicatorRules() {
  const data = useResource("IndicatorList", path);
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <section className="detail-card">
      <h2>Volume and concentration</h2>
      <button type="button" onClick={data.reload}>
        Refresh monitoring status
      </button>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading rules…</p>
      ) : data.value.items.length === 0 ? (
        <p>No volume or concentration rules saved.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((item) => (
            <li key={item.ruleId}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {labels[item.kind]} · {item.symbol} · {item.exchange} ·{" "}
                  {item.enabled ? state[item.result] : "Paused"}
                </p>
                <button
                  type="button"
                  aria-expanded={expanded === item.ruleId}
                  onClick={() =>
                    setExpanded(expanded === item.ruleId ? null : item.ruleId)
                  }
                >
                  Manage {item.title}
                </button>
                {expanded === item.ruleId && (
                  <IndicatorDetails
                    key={`${item.ruleId}-${item.revision}`}
                    item={item}
                    onSave={data.reload}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <IndicatorForm onSave={data.reload} />
    </section>
  );
}

function IndicatorForm({ onSave }: { onSave: () => void }) {
  const command = usePrivateCommand();
  const [listing, setListing] = useState("");
  const [settings, setSettings] = useState<IndicatorCreate>({
    listingId: "",
    portfolioId: null,
    kind: "VOLUME",
    title: "",
    threshold: "",
  });
  const portfolios = useResource(
    "PortfolioList",
    settings.kind === "ALLOCATION" ? "/api/v1/portfolios" : null,
  );
  const volume = settings.kind === "VOLUME";
  return (
    <div className="settings-card">
      <h3>Create a volume or concentration rule</h3>
      <p>{listing || "Choose an exchange listing."}</p>
      <ListingPicker
        busy={command.busy}
        summary="Choose a listing for monitoring"
        action="Select"
        onChoose={(item) => {
          setListing(`${item.symbol} · ${item.exchange}`);
          setSettings({ ...settings, listingId: item.listingId });
        }}
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const saved = await command.run((csrf) =>
            requestContract("IndicatorRule", path, {
              method: "POST",
              csrf,
              body: settings,
            }),
          );
          if (saved) {
            setSettings({ ...settings, title: "", threshold: "" });
            onSave();
          }
        }}
      >
        <label>
          Rule title{" "}
          <input
            value={settings.title}
            onChange={(event) =>
              setSettings({ ...settings, title: event.target.value })
            }
            required
            maxLength={80}
          />
        </label>
        <label>
          Monitor{" "}
          <select
            value={settings.kind}
            onChange={(event) =>
              setSettings({
                ...settings,
                kind: event.target.value === "VOLUME" ? "VOLUME" : "ALLOCATION",
                portfolioId: null,
                threshold: "",
              })
            }
          >
            <option value="VOLUME">Completed-session volume</option>
            <option value="ALLOCATION">Share of portfolio equity value</option>
          </select>
        </label>
        {!volume && (
          <label>
            Portfolio{" "}
            <select
              required
              value={settings.portfolioId ?? ""}
              onChange={(event) =>
                setSettings({
                  ...settings,
                  portfolioId: event.target.value || null,
                })
              }
            >
              <option value="">Choose a portfolio</option>
              {portfolios.value?.items
                .filter((item) => !item.archived)
                .map((item) => (
                  <option key={item.portfolioId} value={item.portfolioId}>
                    {item.name}
                  </option>
                ))}
            </select>
          </label>
        )}
        {portfolios.error && <p role="alert">{portfolios.error}</p>}
        <p className="field-help">
          {volume
            ? "The latest saved Yahoo volume is compared with the average of the preceding ten retained sessions, all within 28 calendar days."
            : "Concentration compares this security with total recorded equity value, excluding cash. Every recorded account needs coverage and every holding needs a recent close for the same session."}
        </p>
        <label>
          {volume
            ? "At least this many times average volume"
            : "At least this share (%)"}{" "}
          <input
            required
            inputMode="decimal"
            value={settings.threshold}
            onChange={(event) =>
              setSettings({ ...settings, threshold: event.target.value })
            }
            maxLength={13}
          />
        </label>
        {command.error && <p role="alert">{command.error}</p>}
        <button
          type="submit"
          className="primary-button"
          disabled={command.busy || !settings.listingId}
        >
          Save monitoring rule
        </button>
      </form>
    </div>
  );
}

function IndicatorDetails({
  item,
  onSave,
}: {
  item: IndicatorRule;
  onSave: () => void;
}) {
  const command = usePrivateCommand();
  const [threshold, setThreshold] = useState(item.threshold);
  const [enabled, setEnabled] = useState(item.enabled);
  const endpoint = `${path}/${item.ruleId}`;
  const evaluations = useResource(
    "IndicatorEvaluations",
    `${endpoint}/evaluations`,
  );
  return (
    <div className="settings-card">
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await command.run((csrf) =>
            requestContract("IndicatorRule", endpoint, {
              method: "POST",
              csrf,
              body: { expectedRevision: item.revision, threshold, enabled },
            }),
          );
          if (result) onSave();
        }}
      >
        <label>
          Threshold ({item.kind === "VOLUME" ? "times average" : "%"}){" "}
          <input
            required
            value={threshold}
            inputMode="decimal"
            onChange={(event) => setThreshold(event.target.value)}
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
          />
          Enabled
        </label>
        {command.error && <p role="alert">{command.error}</p>}
        <button type="submit" disabled={command.busy}>
          Save rule change
        </button>
      </form>
      {evaluations.error ? (
        <p role="alert">{evaluations.error}</p>
      ) : !evaluations.value ? (
        <p role="status">Loading observations…</p>
      ) : evaluations.value.items.length === 0 ? (
        <p>No eligible observations yet.</p>
      ) : (
        <ul>
          {evaluations.value.items.map((value) => (
            <li key={value.evaluationId}>
              <IndicatorEvidence value={value} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function IndicatorEvidence({ value }: { value: IndicatorEvaluation }) {
  return (
    <p>
      {value.sessionDate} · Version {value.revision} ·{" "}
      {value.triggered ? "Triggered" : "No new alert"} ·{" "}
      {value.baselineStart
        ? `${value.metric}× the average of ten Yahoo sessions starting ${value.baselineStart} · Threshold ${value.threshold}×`
        : `${value.metric}% of recorded equity (₹${value.holdingValue} of ₹${value.equityValue}) · Threshold ${value.threshold}%`}
    </p>
  );
}
