import { useState } from "react";
import type {
  BriefSchedule,
  BriefSettings,
  PortfolioBrief,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { usePreferences } from "../preferences/PreferencesProvider.tsx";
import { CompanyNotificationEvidence } from "../research/CompanyNotificationEvidence.tsx";
import { LocalTime } from "./LocalTime.tsx";

const path = "/api/v1/monitoring/briefs";
const options = [
  ["includeAlerts", "Price, volume, and concentration alerts"],
  ["includeReminders", "Review reminders"],
  ["includeCompany", "Company events"],
  ["includeValuations", "Saved account valuations"],
] as const;

export function Briefs() {
  const data = useResource("BriefIndex", path);
  const [selected, setSelected] = useState<string | null>(null);
  const [end, setEnd] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const draft = useResource(
    "PortfolioBrief",
    preview === null
      ? null
      : `${path}/preview${preview ? `?windowEnd=${preview}` : ""}`,
  );
  return (
    <section className="detail-card">
      <h2>Portfolio briefs</h2>
      {data.error ? (
        <p role="alert">
          {data.error}{" "}
          <button type="button" onClick={data.reload}>
            Retry
          </button>
        </p>
      ) : !data.value ? (
        <p role="status">Loading portfolio briefs…</p>
      ) : (
        <>
          <BriefScheduleForm
            key={data.value.schedule?.revision ?? 0}
            saved={data.value.schedule}
            onSave={() => {
              data.reload();
              setPreview(null);
            }}
          />
          {data.value.schedule && (
            <>
              <form
                className="market-filters"
                onSubmit={(event) => {
                  event.preventDefault();
                  setPreview(end);
                  draft.reload();
                }}
              >
                <label>
                  Preview through (date excluded){" "}
                  <input
                    type="date"
                    value={end}
                    onChange={(event) => setEnd(event.target.value)}
                  />
                </label>
                <button type="submit">Preview brief</button>
              </form>
              {draft.error && <p role="alert">{draft.error}</p>}
              {draft.loading && <p role="status">Preparing preview…</p>}
              {draft.value && <BriefContents brief={draft.value} />}
            </>
          )}
          <h3>Saved briefs</h3>
          {data.value.runs.length === 0 ? (
            <p>No scheduled briefs have run.</p>
          ) : (
            <ul className="security-list">
              {data.value.runs.map((run) => (
                <li key={run.runId}>
                  <div>
                    <p>
                      <LocalTime value={run.windowStart} /> to{" "}
                      <LocalTime value={run.windowEnd} /> (excluded)
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected(selected === run.runId ? null : run.runId)
                      }
                    >
                      View saved brief
                    </button>
                    {selected === run.runId && <SavedBrief id={run.runId} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

function BriefScheduleForm({
  saved,
  onSave,
}: {
  saved: BriefSchedule | null;
  onSave: () => void;
}) {
  const { value } = usePreferences();
  const command = usePrivateCommand();
  const [settings, setSettings] = useState<BriefSettings>(
    saved?.settings ?? {
      scheduledLocal: "",
      timeZone: value?.timeZone ?? "Asia/Kolkata",
      cadence: "DAILY",
      enabled: true,
      includeAlerts: true,
      includeReminders: true,
      includeCompany: true,
      includeValuations: true,
    },
  );
  function change<K extends keyof BriefSettings>(
    key: K,
    input: BriefSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: input }));
  }
  return (
    <form
      className="settings-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await command.run((csrf) =>
          requestContract("BriefSchedule", `${path}/schedule`, {
            method: "POST",
            csrf,
            body: { expectedRevision: saved?.revision ?? 0, settings },
          }),
        );
        if (result) onSave();
      }}
    >
      <h3>Brief schedule</h3>
      {saved?.nextAt && (
        <p>
          Next brief <LocalTime value={saved.nextAt} />
        </p>
      )}
      <label>
        First run (local date and time){" "}
        <input
          type="datetime-local"
          required
          value={settings.scheduledLocal}
          onChange={(event) => change("scheduledLocal", event.target.value)}
        />
      </label>
      <label>
        Time zone{" "}
        <input
          required
          maxLength={64}
          value={settings.timeZone}
          onChange={(event) => change("timeZone", event.target.value)}
        />
      </label>
      <label>
        Frequency{" "}
        <select
          value={settings.cadence}
          onChange={(event) =>
            change(
              "cadence",
              event.target.value === "WEEKLY" ? "WEEKLY" : "DAILY",
            )
          }
        >
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
        </select>
      </label>
      <p className="field-help">
        A brief covers the previous full day or seven full days in the selected
        time zone.
      </p>
      <fieldset>
        <legend>Include</legend>
        {options.map(([key, label]) => (
          <label className="check-label" key={key}>
            <input
              type="checkbox"
              checked={settings[key]}
              onChange={(event) => change(key, event.target.checked)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="check-label">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(event) => change("enabled", event.target.checked)}
        />
        Enable scheduled briefs
      </label>
      {command.error && <p role="alert">{command.error}</p>}
      <button type="submit" className="primary-button" disabled={command.busy}>
        Save brief schedule
      </button>
    </form>
  );
}

export function SavedBrief({ id }: { id: string }) {
  const data = useResource("PortfolioBrief", `${path}/${id}`);
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading saved brief…</p>;
  return <BriefContents brief={data.value} />;
}

function BriefContents({ brief }: { brief: PortfolioBrief }) {
  const [source, setSource] = useState<string | null>(null);
  return (
    <section className="settings-card" aria-label="Portfolio brief contents">
      <p>
        <LocalTime value={brief.windowStart} /> to{" "}
        <LocalTime value={brief.windowEnd} /> (excluded) · Window in{" "}
        {brief.timeZone}.
      </p>
      {brief.items.length === 0 &&
        brief.snapshots.length === 0 &&
        brief.companyEvents.length === 0 && (
          <p>No changes recorded for the selected categories in this period.</p>
        )}
      {brief.items.length > 0 && (
        <ul className="security-list">
          {brief.items.map((item) => (
            <li key={item.activityId}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  <LocalTime value={item.createdAt} />
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSource(
                      source === item.activityId ? null : item.activityId,
                    )
                  }
                >
                  Inspect saved activity
                </button>
                {source === item.activityId && (
                  <BriefActivity id={item.activityId} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {brief.snapshots.length > 0 && (
        <ul className="security-list">
          {brief.snapshots.map((item) => (
            <li key={item.snapshotId}>
              <div>
                <strong>
                  {item.accountName} · {item.sessionDate}
                </strong>
                <p>
                  Holdings{" "}
                  {item.holdingsValue === null
                    ? "unavailable"
                    : `₹${item.holdingsValue}`}{" "}
                  · With recorded cash{" "}
                  {item.recordedValue === null
                    ? "unavailable"
                    : `₹${item.recordedValue}`}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSource(
                      source === item.snapshotId ? null : item.snapshotId,
                    )
                  }
                >
                  Inspect saved valuation
                </button>
                {source === item.snapshotId && <BriefSnapshot item={item} />}
              </div>
            </li>
          ))}
        </ul>
      )}
      {brief.companyEvents.length > 0 && (
        <ul className="security-list">
          {brief.companyEvents.map((item) => (
            <li key={item.versionId}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.companyName} · Event version {item.revision} · Reviewed{" "}
                  <LocalTime value={item.reviewedAt} />
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setSource(source === item.versionId ? null : item.versionId)
                  }
                >
                  Inspect filing evidence
                </button>
                {source === item.versionId && (
                  <CompanyNotificationEvidence event={item} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {brief.truncated && (
        <p>
          The brief shows up to 50 saved activities, 50 company events and 50
          account snapshots.
        </p>
      )}
    </section>
  );
}

function BriefActivity({ id }: { id: string }) {
  const source = useResource(
    "NotificationDetail",
    `/api/v1/monitoring/notifications/${id}`,
  );
  if (source.error)
    return <p>No in-app delivery is available for this activity.</p>;
  if (!source.value) return <p role="status">Loading saved activity…</p>;
  return (
    <p>
      {source.value.notification.title} ·{" "}
      {source.value.notification.kind.toLowerCase().replaceAll("_", " ")}
      {source.value.price &&
        ` · Rule version ${source.value.price.revision} on ${source.value.price.sessionDate}`}
    </p>
  );
}

function BriefSnapshot({
  item,
}: {
  item: PortfolioBrief["snapshots"][number];
}) {
  const source = useResource(
    "ValuationSnapshotDetail",
    `/api/v1/portfolios/${item.portfolioId}/accounts/${item.accountId}/valuation/snapshots/${item.snapshotId}`,
  );
  if (source.error) return <p role="alert">{source.error}</p>;
  if (!source.value) return <p role="status">Loading valuation inputs…</p>;
  return (
    <p>
      Ledger revision {source.value.snapshot.ledgerRevision} ·{" "}
      {source.value.snapshot.priceBasis.toLowerCase().replaceAll("_", " ")} ·{" "}
      {source.value.snapshot.status.toLowerCase().replaceAll("_", " ")}.
    </p>
  );
}
