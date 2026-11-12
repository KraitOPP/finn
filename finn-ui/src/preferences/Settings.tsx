import { type FormEvent, useState } from "react";
import type { Preferences } from "../../contracts/generated/models.ts";
import { ApiError } from "../api/request.ts";
import { RouteHeading } from "../Navigation.tsx";
import { usePreferences } from "./PreferencesProvider.tsx";

export function Settings() {
  const { value, error, reload } = usePreferences();
  return (
    <section className="workspace-section">
      <RouteHeading>Settings</RouteHeading>
      {error ? (
        <div className="empty-state" role="alert">
          <p>{error}</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      ) : !value ? (
        <p role="status">Loading preferences…</p>
      ) : (
        <PreferencesForm value={value} />
      )}
    </section>
  );
}
function PreferencesForm({ value }: { value: Preferences }) {
  const { save, reload } = usePreferences();
  const [zone, setZone] = useState(value.timeZone);
  const [inApp, setInApp] = useState(value.inAppNotifications);
  const [email, setEmail] = useState(value.emailNotifications);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await save({
        timeZone: zone,
        currency: "INR",
        inAppNotifications: inApp,
        emailNotifications: email,
        revision: value.revision,
      });
      setSaved(true);
    } catch (error) {
      setError(
        error instanceof ApiError
          ? error.message
          : "We couldn’t save your preferences. Try again.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <form className="settings-card" onSubmit={submit}>
      <h2>Display & delivery</h2>
      <p className="muted-copy">Your choices apply only to this account.</p>
      <label htmlFor="time-zone">Display time zone</label>
      <input
        id="time-zone"
        list="time-zones"
        value={zone}
        onChange={(event) => setZone(event.target.value)}
        maxLength={64}
        required
        aria-describedby="zone-help"
      />
      <datalist id="time-zones">
        {[
          "Asia/Kolkata",
          "UTC",
          "Europe/London",
          "America/New_York",
          "Asia/Singapore",
        ].map((zone) => (
          <option value={zone} key={zone} />
        ))}
      </datalist>
      <p id="zone-help" className="field-help">
        Use an IANA time zone, such as Asia/Kolkata. Exchange session dates
        retain their original date.
      </p>
      <label htmlFor="display-currency">Display currency</label>
      <select id="display-currency" value="INR" disabled>
        <option value="INR">Indian rupee (INR)</option>
      </select>
      <fieldset>
        <legend>Notification preferences</legend>
        <p className="field-help">
          In-app delivery follows the choice below. Email needs a configured
          provider. Local installations can opt into an email preview.
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={inApp}
            onChange={(event) => setInApp(event.target.checked)}
          />
          In-app notifications
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={email}
            onChange={(event) => setEmail(event.target.checked)}
          />
          Email notifications
        </label>
      </fieldset>
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button type="button" className="text-button" onClick={reload}>
            Reload saved preferences
          </button>
        </div>
      )}
      {saved && <p role="status">Preferences saved.</p>}
      <button type="submit" className="primary-button" disabled={saving}>
        {saving ? "Saving…" : "Save preferences"}
      </button>
    </form>
  );
}
