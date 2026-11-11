import { useState } from "react";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnnouncedDates } from "./AnnouncedDates.tsx";
import { EventLabels } from "./Events.tsx";
import { SourceEvidence } from "./SourceEvidence.tsx";

const path = "/api/v1/research/replay";
const delivery = {
  PENDING: "Pending",
  DELIVERED: "Delivered",
  SUPPRESSED: "Suppressed",
  PREVIEWED: "Previewed",
  FAILED: "Failed",
};

export function EventReplay() {
  const [open, setOpen] = useState(false);
  const data = useResource("EventReplay", open ? path : null);
  const command = usePrivateCommand();
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Fictional event replay</summary>
      {open && (
        <>
          <p>
            This example uses a fictional company, holding, and January 2025
            source dates in its own workspace.
          </p>
          {data.error && <p role="alert">{data.error}</p>}
          {command.error && <p role="alert">{command.error}</p>}
          {data.loading ? (
            <p role="status">Loading replay…</p>
          ) : data.value?.runId ? (
            <>
              {data.value.savedAt && (
                <p>
                  Replay saved <LocalTime value={data.value.savedAt} />
                </p>
              )}
              <button type="button" onClick={data.reload}>
                Refresh replay delivery status
              </button>
              <h3>Ranked events</h3>
              <ul className="security-list">
                {data.value.events.map(({ attention, evidence }) => (
                  <li key={attention.event.eventId}>
                    <div>
                      <strong>{attention.event.title}</strong>
                      <EventLabels event={attention.event} />
                      <AnnouncedDates dates={attention.event.dates} />
                      <p>
                        Priority {attention.score} · Event version{" "}
                        {attention.event.revision}
                      </p>
                      <ul>
                        {attention.reasons.map((reason) => (
                          <li key={reason.label}>
                            {reason.label} ({reason.points} points)
                          </li>
                        ))}
                      </ul>
                      {attention.holdings.map((holding) => (
                        <p key={holding.securityId}>
                          {holding.name} · {holding.quantity} fictional units
                        </p>
                      ))}
                      <details>
                        <summary>Inspect fictional source</summary>
                        <SourceEvidence detail={evidence} />
                      </details>
                    </div>
                  </li>
                ))}
              </ul>
              <h3>Fictional notifications</h3>
              <ul>
                {data.value.notifications.map((item) => (
                  <li key={item.title}>
                    {item.title} · {delivery[item.status]}
                  </li>
                ))}
              </ul>
              {data.value.brief && (
                <>
                  <h3>Fictional brief</h3>
                  <ul>
                    {data.value.brief.companyEvents.map((item) => (
                      <li key={item.versionId}>
                        {item.title} · Cites source version{" "}
                        {item.documentRevision}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <button
              type="button"
              className="primary-button"
              disabled={command.busy || !!data.error}
              onClick={async () => {
                const result = await command.run((csrf) =>
                  requestContract("EventReplay", path, {
                    method: "POST",
                    csrf,
                  }),
                );
                if (result) data.reload();
              }}
            >
              {command.busy ? "Running replay…" : "Run fictional scenario"}
            </button>
          )}
        </>
      )}
    </details>
  );
}
