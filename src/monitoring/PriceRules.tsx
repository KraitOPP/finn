import { useState } from "react";
import type {
  PriceRule,
  PriceRuleSettings,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPicker } from "../instruments/ListingPicker.tsx";

import { PriceEvaluations } from "./PriceEvaluations.tsx";

const path = "/api/v1/monitoring/rules";
const comparisons: Record<PriceRuleSettings["comparison"], string> = {
  ABOVE: "Closes above",
  BELOW: "Closes below",
  CROSS_ABOVE: "Crosses above between closes",
  CROSS_BELOW: "Crosses below between closes",
  MOVE_UP: "Rises between closes by at least",
  MOVE_DOWN: "Falls between closes by at least",
};

export function PriceRules() {
  const rules = useResource("PriceRuleList", path);
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [evaluations, setEvaluations] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  return (
    <section className="detail-card">
      <h2>Price alerts</h2>
      <p>
        FINN checks saved daily closes about once a minute. Refresh Yahoo prices
        or add a reviewed close to supply new observations.
      </p>
      {rules.error ? (
        <p role="alert">
          {rules.error}{" "}
          <button type="button" onClick={rules.reload}>
            Retry
          </button>
        </p>
      ) : !rules.value ? (
        <p role="status">Loading price rules…</p>
      ) : rules.value.items.length === 0 ? (
        <p>No price rules saved.</p>
      ) : (
        <ul className="security-list">
          {rules.value.items.map((rule) => (
            <li key={rule.ruleId}>
              <div>
                <strong>{rule.settings.name}</strong>
                <p>
                  {rule.exchange} · {rule.symbol} ·{" "}
                  {comparisons[rule.settings.comparison]}{" "}
                  {rule.settings.comparison.startsWith("MOVE_")
                    ? `${rule.settings.threshold}%`
                    : `₹${rule.settings.threshold}`}{" "}
                  · {rule.settings.enabled ? "Enabled" : "Paused"} · Version{" "}
                  {rule.revision}
                </p>
                <button type="button" onClick={() => setEditing(rule)}>
                  Edit {rule.settings.name}
                </button>{" "}
                <button
                  type="button"
                  onClick={() =>
                    setHistory(history === rule.ruleId ? null : rule.ruleId)
                  }
                >
                  Versions of {rule.settings.name}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEvaluations(
                      evaluations === rule.ruleId ? null : rule.ruleId,
                    )
                  }
                >
                  Evaluations of {rule.settings.name}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {evaluations && <PriceEvaluations key={evaluations} id={evaluations} />}
      {history && <RuleHistory key={history} id={history} />}
      <RuleForm
        key={editing ? `${editing.ruleId}-${editing.revision}` : "new"}
        rule={editing}
        onCancel={() => setEditing(null)}
        onSave={() => {
          setEditing(null);
          setHistory(null);
          rules.reload();
        }}
      />
    </section>
  );
}

function RuleHistory({ id }: { id: string }) {
  const data = useResource("PriceRuleList", `${path}/${id}/versions`);
  return (
    <section className="settings-card">
      <h3>Saved rule versions</h3>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading versions…</p>
      ) : (
        <ul>
          {data.value.items.map((rule) => (
            <li key={rule.revision}>
              Version {rule.revision} · {rule.settings.name} ·{" "}
              {comparisons[rule.settings.comparison]} {rule.settings.threshold}{" "}
              · {rule.settings.enabled ? "Enabled" : "Paused"} ·{" "}
              {rule.createdAt}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: PriceRule | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const [settings, setSettings] = useState<PriceRuleSettings>(
    rule?.settings ?? {
      listingId: "",
      name: "",
      source: "MANUAL_REVIEWED",
      comparison: "ABOVE",
      threshold: "",
      maxAgeDays: 4,
      cooldownMinutes: 1440,
      rearm: true,
      enabled: true,
      expiresOn: null,
    },
  );
  const [listingName, setListingName] = useState(
    rule ? `${rule.symbol} · ${rule.exchange}` : "",
  );
  const [saved, setSaved] = useState(false);
  function change<K extends keyof PriceRuleSettings>(
    key: K,
    value: PriceRuleSettings[K],
  ) {
    setSaved(false);
    setSettings((old) => ({ ...old, [key]: value }));
  }
  const move = settings.comparison.startsWith("MOVE_");
  return (
    <section className="settings-card">
      <h3>{rule ? "Edit price rule" : "Create a price rule"}</h3>
      <p>{listingName || "Choose an exchange listing."}</p>
      <ListingPicker
        busy={command.busy}
        summary="Choose an exchange listing"
        action="Select"
        onChoose={(listing) => {
          setListingName(`${listing.symbol} · ${listing.exchange}`);
          change("listingId", listing.listingId);
        }}
      />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const result = await command.run((csrf) =>
            requestContract(
              "PriceRule",
              rule ? `${path}/${rule.ruleId}` : path,
              {
                method: "POST",
                csrf,
                body: rule
                  ? { expectedRevision: rule.revision, settings }
                  : settings,
              },
            ),
          );
          if (result) {
            setSaved(true);
            onSave();
          }
        }}
      >
        <label>
          Rule name{" "}
          <input
            required
            maxLength={80}
            value={settings.name}
            onChange={(event) => change("name", event.target.value)}
          />
        </label>
        <label>
          Price source{" "}
          <select
            value={settings.source}
            onChange={(event) =>
              change(
                "source",
                event.target.value === "YAHOO_YFINANCE"
                  ? "YAHOO_YFINANCE"
                  : "MANUAL_REVIEWED",
              )
            }
          >
            <option value="MANUAL_REVIEWED">Reviewed exchange closes</option>
            <option value="YAHOO_YFINANCE">Yahoo daily closes</option>
          </select>
        </label>
        <label>
          Condition{" "}
          <select
            value={settings.comparison}
            onChange={(event) =>
              change(
                "comparison",
                event.target.value as PriceRuleSettings["comparison"],
              )
            }
          >
            {Object.entries(comparisons).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {move ? "Percentage move (%)" : "Price (INR)"}{" "}
          <input
            required
            value={settings.threshold}
            inputMode="decimal"
            maxLength={25}
            onChange={(event) => change("threshold", event.target.value)}
          />
        </label>
        <p className="field-help">
          {move
            ? "For example, enter 3 for a 3% move. FINN compares two saved closes at most four calendar days apart."
            : "For example, enter 150 for ₹150. Crossing compares saved closes, so movements between observations can be missed."}
        </p>
        <label>
          Maximum close age (calendar days){" "}
          <input
            type="number"
            required
            min={1}
            max={4}
            value={settings.maxAgeDays}
            onChange={(event) =>
              change("maxAgeDays", Number(event.target.value))
            }
          />
        </label>
        <label>
          Cooldown (minutes){" "}
          <input
            type="number"
            required
            min={0}
            max={10080}
            value={settings.cooldownMinutes}
            onChange={(event) =>
              change("cooldownMinutes", Number(event.target.value))
            }
          />
        </label>
        <label>
          Expires on (India date){" "}
          <input
            type="date"
            value={settings.expiresOn ?? ""}
            onChange={(event) =>
              change("expiresOn", event.target.value || null)
            }
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={settings.rearm}
            onChange={(event) => change("rearm", event.target.checked)}
          />
          Allow another alert after the condition resets and the cooldown has
          elapsed
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => change("enabled", event.target.checked)}
          />
          Enabled
        </label>
        {command.error && <p role="alert">{command.error}</p>}
        {saved && <p role="status">Price rule saved.</p>}
        <button
          type="submit"
          className="primary-button"
          disabled={command.busy || !settings.listingId}
        >
          {rule ? "Save new version" : "Save price rule"}
        </button>
        {rule && (
          <button type="button" onClick={onCancel}>
            Cancel edit
          </button>
        )}
      </form>
    </section>
  );
}
