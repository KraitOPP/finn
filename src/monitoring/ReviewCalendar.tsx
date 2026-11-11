import { useState } from "react";
import type {
  ReminderSettings,
  ReviewReminder,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { usePreferences } from "../preferences/PreferencesProvider.tsx";
import { LocalTime } from "./LocalTime.tsx";

const path = "/api/v1/monitoring/reminders";
const recurrenceText = { ONCE: "One time", DAILY: "Daily", WEEKLY: "Weekly" };
const states = {
  ACTIVE: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function ReviewCalendar() {
  const data = useResource("ReminderList", path);
  const [edit, setEdit] = useState<ReviewReminder | null>(null);
  const [notice, setNotice] = useState("");
  function updated(message: string) {
    setNotice(message);
    setEdit(null);
    data.reload();
  }
  return (
    <section className="detail-card">
      <h2>Review calendar</h2>
      {notice && <p role="status">{notice}</p>}
      {data.error ? (
        <p role="alert">
          {data.error}{" "}
          <button type="button" onClick={data.reload}>
            Retry
          </button>
        </p>
      ) : !data.value ? (
        <p role="status">Loading reminders…</p>
      ) : data.value.items.length === 0 ? (
        <p>No review reminders.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((item) => (
            <li key={item.reminderId}>
              <div>
                <strong>{item.settings.title}</strong>
                <p>
                  {states[item.state]} ·{" "}
                  {recurrenceText[item.settings.recurrence]} ·{" "}
                  {item.settings.timeZone}
                  {item.nextAt && (
                    <>
                      {" "}
                      · Next <LocalTime value={item.nextAt} />
                    </>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setNotice("");
                    setEdit(item);
                  }}
                >
                  Edit {item.settings.title}
                </button>
                {item.state !== "CANCELLED" && (
                  <ReminderActions item={item} onChange={updated} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <ReminderForm
        key={edit ? `${edit.reminderId}-${edit.revision}` : "new"}
        edit={edit}
        onSave={updated}
        onCancel={() => setEdit(null)}
      />
    </section>
  );
}

function ReminderActions({
  item,
  onChange,
}: {
  item: ReviewReminder;
  onChange: (message: string) => void;
}) {
  const command = usePrivateCommand();
  const [until, setUntil] = useState("");
  async function save(snoozeUntil: string | null) {
    const saved = await command.run((csrf) =>
      requestContract("ReviewReminder", `${path}/${item.reminderId}/schedule`, {
        method: "POST",
        csrf,
        body: { expectedRevision: item.revision, snoozeUntil },
      }),
    );
    if (saved)
      onChange(
        snoozeUntil === null ? "Reminder cancelled." : "Reminder snoozed.",
      );
  }
  return (
    <details>
      <summary>Reschedule or cancel {item.settings.title}</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(until);
        }}
      >
        <label>
          Snooze until ({item.settings.timeZone}){" "}
          <input
            type="datetime-local"
            required
            value={until}
            onChange={(event) => setUntil(event.target.value)}
          />
        </label>
        <button type="submit" disabled={command.busy}>
          Snooze reminder
        </button>{" "}
        <button
          type="button"
          disabled={command.busy}
          onClick={() => void save(null)}
        >
          Cancel reminder
        </button>
      </form>
      {command.error && <p role="alert">{command.error}</p>}
    </details>
  );
}

function ReminderForm({
  edit,
  onSave,
  onCancel,
}: {
  edit: ReviewReminder | null;
  onSave: (message: string) => void;
  onCancel: () => void;
}) {
  const { value } = usePreferences();
  const command = usePrivateCommand();
  const [settings, setSettings] = useState<ReminderSettings>(
    edit?.settings ?? {
      title: "",
      scheduledLocal: "",
      timeZone: value?.timeZone ?? "Asia/Kolkata",
      recurrence: "ONCE",
      quietStart: null,
      quietEnd: null,
    },
  );
  function change<K extends keyof ReminderSettings>(
    key: K,
    field: ReminderSettings[K],
  ) {
    setSettings((old) => ({ ...old, [key]: field }));
  }
  return (
    <form
      className="settings-card"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await command.run((csrf) =>
          requestContract(
            "ReviewReminder",
            edit ? `${path}/${edit.reminderId}` : path,
            {
              method: "POST",
              csrf,
              body: edit
                ? { expectedRevision: edit.revision, settings }
                : settings,
            },
          ),
        );
        if (result) {
          if (!edit)
            setSettings((old) => ({ ...old, title: "", scheduledLocal: "" }));
          onSave("Review reminder saved.");
        }
      }}
    >
      <h3>{edit ? "Edit reminder" : "Schedule a review"}</h3>
      <label>
        Review title{" "}
        <input
          required
          maxLength={120}
          value={settings.title}
          onChange={(event) => change("title", event.target.value)}
        />
      </label>
      <label>
        First review (local date and time){" "}
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
        Repeat{" "}
        <select
          value={settings.recurrence}
          onChange={(event) =>
            change(
              "recurrence",
              event.target.value as ReminderSettings["recurrence"],
            )
          }
        >
          {Object.entries(recurrenceText).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>Quiet hours (optional)</legend>
        <label>
          Start{" "}
          <input
            type="time"
            value={settings.quietStart ?? ""}
            onChange={(event) =>
              change("quietStart", event.target.value || null)
            }
          />
        </label>
        <label>
          End{" "}
          <input
            type="time"
            value={settings.quietEnd ?? ""}
            onChange={(event) => change("quietEnd", event.target.value || null)}
          />
        </label>
        <p className="field-help">
          A reminder due during quiet hours is held until the window ends in its
          time zone.
        </p>
      </fieldset>
      {command.error && <p role="alert">{command.error}</p>}
      <button className="primary-button" type="submit" disabled={command.busy}>
        Save reminder
      </button>
      {edit && (
        <button type="button" onClick={onCancel}>
          Close edit
        </button>
      )}
    </form>
  );
}
