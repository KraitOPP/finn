import { useState } from "react";
import type {
  AttentionFeedback,
  AttentionItem,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { EventHistory, EventLabels } from "./Events.tsx";

const path = "/api/v1/research/attention";
const views = {
  ACTIVE: "Active",
  UNREAD: "Unread",
  HIDDEN: "Muted or snoozed",
} as const;
const coverage = {
  NO_RECORDS: "No recorded holdings are available for ranking.",
  PARTIAL:
    "Ranking uses the recorded holdings available within the coverage limits.",
  RECORDED_ACCOUNTS: "Ranking uses holdings in your recorded active accounts.",
};

export function Attention() {
  const [view, setView] = useState<keyof typeof views>("ACTIVE");
  const [offset, setOffset] = useState(0);
  const data = useResource(
    "AttentionPage",
    `${path}?view=${view}&offset=${offset}`,
  );
  const items = data.value?.items ?? [];
  const routine = items.filter((item) => item.event.novelty === "ROUTINE");
  const other = items.filter((item) => item.event.novelty !== "ROUTINE");
  return (
    <section className="detail-card">
      <div className="section-heading">
        <h2>Company attention</h2>
        <button type="button" onClick={data.reload}>
          Refresh company events
        </button>
      </div>
      <label>
        Show company events{" "}
        <select
          value={view}
          onChange={(event) => {
            setView(event.target.value as keyof typeof views);
            setOffset(0);
          }}
        >
          {Object.entries(views).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading company attention…</p>
      ) : (
        <>
          <p>{coverage[data.value.coverage]}</p>
          {items.length === 0 && (
            <p>
              No company events in this view. Add and classify a primary source
              in <a href="#/research">Research</a>.
            </p>
          )}
          {other.length > 0 && <EventRows items={other} reload={data.reload} />}
          {routine.length > 0 && (
            <details>
              <summary>Routine events ({routine.length})</summary>
              <EventRows items={routine} reload={data.reload} />
            </details>
          )}
        </>
      )}
      {(offset > 0 || data.value?.hasMore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 25)}
          >
            Previous events
          </button>
          <button
            type="button"
            disabled={!data.value?.hasMore}
            onClick={() => setOffset(offset + 25)}
          >
            Next events
          </button>
        </div>
      )}
    </section>
  );
}

function EventRows({
  items,
  reload,
}: {
  items: AttentionItem[];
  reload: () => void;
}) {
  return (
    <ul className="security-list">
      {items.map((item) => (
        <AttentionCard
          key={`${item.event.eventId}-${item.event.revision}`}
          item={item}
          reload={reload}
        />
      ))}
    </ul>
  );
}

function AttentionCard({
  item,
  reload,
}: {
  item: AttentionItem;
  reload: () => void;
}) {
  const [evidence, setEvidence] = useState(false);
  const command = usePrivateCommand();
  const { event, state } = item;
  async function change(action: AttentionFeedback["action"]) {
    const snoozeUntil =
      action === "SNOOZE"
        ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        : null;
    const saved = await command.run((csrf) =>
      requestContract("AttentionState", `${path}/${event.eventId}`, {
        method: "POST",
        csrf,
        body: { eventRevision: event.revision, action, snoozeUntil },
      }),
    );
    if (saved) reload();
  }
  return (
    <li>
      <div>
        <strong>{event.title}</strong>
        <EventLabels event={event} />
        <p>
          {state.read ? "Read" : "Unread"} · Reviewed{" "}
          <LocalTime value={event.reviewedAt} />
          {state.muted && " · Muted"}
          {state.snoozedUntil && (
            <>
              {" "}
              · Snoozed until <LocalTime value={state.snoozedUntil} />
            </>
          )}
        </p>
        <details>
          <summary>Why it appears here</summary>
          <ul>
            {item.reasons.map((reason) => (
              <li key={reason.label}>
                {reason.label} ({reason.points} points)
              </li>
            ))}
          </ul>
          {item.holdings.length > 0 && (
            <ul>
              {item.holdings.map((holding) => (
                <li key={holding.securityId}>
                  {holding.name} · {holding.quantity} recorded units
                </li>
              ))}
            </ul>
          )}
        </details>
        <div className="market-filters">
          <button
            type="button"
            aria-expanded={evidence}
            onClick={() => setEvidence(!evidence)}
          >
            Evidence for {event.title}
          </button>
          <button
            type="button"
            disabled={command.busy}
            onClick={() => void change(state.read ? "UNREAD" : "READ")}
          >
            {state.read ? "Mark unread" : "Mark read"}
          </button>
          <button
            type="button"
            disabled={command.busy}
            onClick={() => void change(state.muted ? "UNMUTE" : "MUTE")}
          >
            {state.muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            disabled={command.busy}
            onClick={() =>
              void change(state.snoozedUntil ? "UNSNOOZE" : "SNOOZE")
            }
          >
            {state.snoozedUntil ? "End snooze" : "Snooze 24 hours"}
          </button>
        </div>
        {command.error && <p role="alert">{command.error}</p>}
        {evidence && <EventHistory id={event.eventId} />}
      </div>
    </li>
  );
}
