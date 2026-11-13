import { useState } from "react";
import type {
  FilingRule,
  FilingRuleSettings,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { eventLabel } from "./Events.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";

const path = "/api/v1/research/filing-rules";
const categories = [
  "ANY",
  "EARNINGS",
  "CAPITAL",
  "GOVERNANCE",
  "CORPORATE_ACTION",
  "ORDERS",
  "CREDIT",
  "REGULATORY",
  "OUTLOOK",
  "OTHER",
] as const;

export function FilingCalendar({ generation }: { generation: number }) {
  const [offset, setOffset] = useState(0);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [range, setRange] = useState({ start: "", end: "" });
  const [open, setOpen] = useState<string | null>(null);
  const parameters = new URLSearchParams({
    offset: String(offset),
    view: String(generation),
  });
  if (range.start) parameters.set("start", range.start);
  if (range.end) parameters.set("endExclusive", range.end);
  const data = useResource(
    "CompanyCalendarPage",
    `/api/v1/research/calendar?${parameters}`,
  );
  return (
    <section className="detail-card">
      <h2>Company calendar</h2>
      <p>Saved announced dates in India. Tentative entries are labelled.</p>
      <form
        className="market-filters"
        onSubmit={(event) => {
          event.preventDefault();
          setRange({ start, end });
          setOffset(0);
          setOpen(null);
          data.reload();
        }}
      >
        <label>
          From{" "}
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Through (date excluded){" "}
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <button type="submit">Show dates</button>
      </form>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading announced dates…</p>
      ) : data.value.items.length === 0 ? (
        <p>No current announced dates in this period.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((item) => {
            const key = `${item.versionId}-${item.date.type}`;
            return (
              <li key={key}>
                <div>
                  <strong>
                    {item.date.date} · {eventLabel(item.date.type)} ·{" "}
                    {eventLabel(item.date.certainty)}
                  </strong>
                  <p>
                    {item.companyName} · {item.title} · Event version{" "}
                    {item.revision}
                  </p>
                  <button
                    type="button"
                    onClick={() => setOpen(open === key ? null : key)}
                  >
                    Inspect dated source
                  </button>
                  {open === key && (
                    <CalendarEvidence
                      id={item.documentId}
                      revision={item.documentRevision}
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {(offset > 0 || data.value?.hasMore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 40)}
          >
            Earlier dates
          </button>
          <button
            type="button"
            disabled={!data.value?.hasMore}
            onClick={() => setOffset(offset + 40)}
          >
            Later dates
          </button>
        </div>
      )}
      <FilingRulePanel />
    </section>
  );
}

function CalendarEvidence({ id, revision }: { id: string; revision: number }) {
  const data = useResource("CompanySourceDetail", versionPath(id, revision));
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading dated source…</p>;
  return <SourceEvidence detail={data.value} />;
}

function FilingRulePanel() {
  const rules = useResource("FilingRuleList", path);
  const command = usePrivateCommand();
  async function toggle(rule: FilingRule) {
    const result = await command.run((csrf) =>
      requestContract("FilingRule", `${path}/${rule.ruleId}`, {
        method: "POST",
        csrf,
        body: { expectedRevision: rule.revision, enabled: !rule.enabled },
      }),
    );
    if (result) rules.reload();
  }
  return (
    <div className="settings-card">
      <h3>Filing rules</h3>
      <p>
        Date reminders are eligible at 9:00 a.m. India time. Pause a rule to
        cancel its pending deliveries.
      </p>
      {rules.error ? (
        <p role="alert">{rules.error}</p>
      ) : !rules.value ? (
        <p role="status">Loading filing rules…</p>
      ) : rules.value.items.length === 0 ? (
        <p>No filing rules saved.</p>
      ) : (
        <ul className="security-list">
          {rules.value.items.map((rule) => (
            <li key={rule.ruleId}>
              <div>
                <strong>{rule.settings.title}</strong>
                <p>
                  {eventLabel(rule.settings.category)} ·{" "}
                  {eventLabel(rule.settings.minimumMateriality)} materiality
                  threshold · {rule.enabled ? "Enabled" : "Paused"}
                </p>
                <button
                  type="button"
                  disabled={command.busy}
                  onClick={() => void toggle(rule)}
                >
                  {rule.enabled ? "Pause" : "Resume"} {rule.settings.title}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {command.error && <p role="alert">{command.error}</p>}
      <FilingRuleForm onSave={rules.reload} />
    </div>
  );
}

function FilingRuleForm({ onSave }: { onSave: () => void }) {
  const companies = useResource(
    "CatalogueCompanies",
    "/api/v1/catalog/companies",
  );
  const command = usePrivateCommand();
  const [settings, setSettings] = useState<FilingRuleSettings>({
    companyId: null,
    title: "",
    category: "ANY",
    minimumMateriality: "ANY",
    arrivals: true,
    dates: true,
    tentative: false,
  });
  function change<K extends keyof FilingRuleSettings>(
    key: K,
    value: FilingRuleSettings[K],
  ) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await command.run((csrf) =>
          requestContract("FilingRule", path, {
            method: "POST",
            csrf,
            body: settings,
          }),
        );
        if (saved) {
          change("title", "");
          onSave();
        }
      }}
    >
      <label>
        Filing rule title{" "}
        <input
          required
          maxLength={80}
          value={settings.title}
          onChange={(event) => change("title", event.target.value)}
        />
      </label>
      <label>
        Company{" "}
        <select
          value={settings.companyId ?? ""}
          onChange={(event) => change("companyId", event.target.value || null)}
        >
          <option value="">All my saved companies</option>
          {companies.value?.map((company) => (
            <option key={company.companyId} value={company.companyId}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Category{" "}
        <select
          value={settings.category}
          onChange={(event) =>
            change(
              "category",
              event.target.value as FilingRuleSettings["category"],
            )
          }
        >
          {categories.map((category) => (
            <option key={category} value={category}>
              {eventLabel(category)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Minimum reviewed materiality{" "}
        <select
          value={settings.minimumMateriality}
          onChange={(event) =>
            change(
              "minimumMateriality",
              event.target.value as FilingRuleSettings["minimumMateriality"],
            )
          }
        >
          <option value="ANY">Any, including unknown</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={settings.arrivals}
          onChange={(event) => change("arrivals", event.target.checked)}
        />
        Notify on new or changed reviewed events
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={settings.dates}
          onChange={(event) => change("dates", event.target.checked)}
        />
        Remind me on announced dates
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={settings.tentative}
          disabled={!settings.dates}
          onChange={(event) => change("tentative", event.target.checked)}
        />
        Include tentative dates in reminders
      </label>
      {command.error && <p role="alert">{command.error}</p>}
      <button
        type="submit"
        className="primary-button"
        disabled={command.busy || (!settings.arrivals && !settings.dates)}
      >
        Save filing rule
      </button>
    </form>
  );
}
