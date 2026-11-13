import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
import { BriefRows, ResearchQuestions } from "../research/BriefingLists.tsx";
import { CompanyNotificationEvidence } from "../research/CompanyNotificationEvidence.tsx";
import { UpcomingEvents } from "../research/Radar.tsx";
import { LocalTime } from "./LocalTime.tsx";

const path = "/api/v1/monitoring/briefs";
const options = [
  ["includeAlerts", "Research and market alerts"],
  ["includeReminders", "Review reminders"],
  ["includeCompany", "Company events and research shortlist"],
  ["includeValuations", "Saved account valuations"],
] as const;

function tomorrowMorning(zone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts();
  const part = (type: string) =>
    Number(parts.find((value) => value.type === type)?.value);
  const tomorrow = new Date(
    Date.UTC(part("year"), part("month") - 1, part("day") + 1),
  );
  return `${tomorrow.toISOString().slice(0, 10)}T09:00`;
}

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
              <Stack
                component="form"
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ my: 2, alignItems: { sm: "center" } }}
                onSubmit={(event) => {
                  event.preventDefault();
                  setPreview(end);
                  draft.reload();
                }}
              >
                <TextField
                  label="Preview through (date excluded)"
                  type="date"
                  size="small"
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <Button type="submit" variant="outlined">
                  Preview brief
                </Button>
              </Stack>
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
  const zone = value?.timeZone ?? "Asia/Kolkata";
  const [settings, setSettings] = useState<BriefSettings>(
    () =>
      saved?.settings ?? {
        scheduledLocal: tomorrowMorning(zone),
        timeZone: zone,
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
    <Stack
      component="form"
      className="settings-card"
      spacing={1.5}
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
      <Typography component="h3" variant="subtitle1" sx={{ fontWeight: 700 }}>
        Brief schedule
      </Typography>
      {saved?.nextAt && (
        <p>
          Next brief <LocalTime value={saved.nextAt} />
        </p>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <TextField
          select
          label="Frequency"
          size="small"
          sx={{ minWidth: 125 }}
          value={settings.cadence}
          onChange={(event) =>
            change(
              "cadence",
              event.target.value === "WEEKLY" ? "WEEKLY" : "DAILY",
            )
          }
        >
          <MenuItem value="DAILY">Daily</MenuItem>
          <MenuItem value="WEEKLY">Weekly</MenuItem>
        </TextField>
        <TextField
          label="First run (local date and time)"
          type="datetime-local"
          size="small"
          required
          value={settings.scheduledLocal}
          onChange={(event) => change("scheduledLocal", event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <FormControlLabel
          label="Enable scheduled briefs"
          control={
            <Checkbox
              checked={settings.enabled}
              onChange={(event) => change("enabled", event.target.checked)}
            />
          }
        />
      </Stack>
      <Typography variant="body2" color="text.secondary">
        Scheduled in {settings.timeZone}. The research shortlist uses new
        evidence since your last review within the brief’s lookback window.
      </Typography>
      <details>
        <summary>Time zone and included items</summary>
        <Stack spacing={1} sx={{ mt: 1 }}>
          <TextField
            label="Time zone"
            size="small"
            value={settings.timeZone}
            onChange={(event) => change("timeZone", event.target.value)}
            slotProps={{ htmlInput: { maxLength: 64 } }}
            sx={{ alignSelf: "start" }}
          />
          {options.map(([key, label]) => (
            <FormControlLabel
              key={key}
              label={label}
              control={
                <Checkbox
                  checked={settings[key]}
                  onChange={(event) => change(key, event.target.checked)}
                />
              }
            />
          ))}
        </Stack>
      </details>
      {command.error && <p role="alert">{command.error}</p>}
      <Button
        type="submit"
        variant="contained"
        disabled={command.busy}
        sx={{ alignSelf: "start" }}
      >
        Save brief schedule
      </Button>
    </Stack>
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
  const research = brief.research;
  return (
    <section className="settings-card" aria-label="Portfolio brief contents">
      {research && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          <Typography component="h3" variant="h6">
            Research shortlist
          </Typography>
          <Typography variant="body2" color="text.secondary">
            New evidence from <LocalTime value={research.from} /> through{" "}
            <LocalTime value={research.through} />
          </Typography>
          <BriefRows label="Holdings" items={research.holdings} />
          <BriefRows label="Watchlist" items={research.watchlist} />
          <BriefRows
            label="Stocks to investigate"
            items={research.candidates}
          />
          {research.holdings.length +
            research.watchlist.length +
            research.candidates.length ===
            0 && (
            <Typography variant="body2" color="text.secondary">
              No new ranked developments in this window.
            </Typography>
          )}
          <Typography component="h3" variant="subtitle2">
            Upcoming events
          </Typography>
          <UpcomingEvents items={research.upcoming} />
          <Typography component="h3" variant="subtitle2">
            Open research questions
          </Typography>
          <ResearchQuestions items={research.questions} />
        </Stack>
      )}
      <p>
        Saved activity from <LocalTime value={brief.windowStart} /> to{" "}
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
