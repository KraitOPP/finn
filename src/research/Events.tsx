import { useState } from "react";
import type {
  CompanyEvent,
  CompanyEventInput,
  CompanySource,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";

const path = "/api/v1/research/events";
const subtypes: Record<CompanyEventInput["subtype"], string> = {
  RESULTS: "Financial results",
  RESULTS_MEETING: "Results meeting notice",
  BUYBACK: "Buyback",
  CAPITAL_RAISE: "Capital raise",
  AUDITOR: "Auditor event",
  GOVERNANCE: "Governance",
  DIVIDEND: "Dividend",
  SPLIT_BONUS: "Split or bonus",
  MERGER: "Merger or demerger",
  OTHER: "Other or unknown",
};
const stages = [
  "ANNOUNCED",
  "DECIDED",
  "COMPLETED",
  "CANCELLED",
  "UNKNOWN",
] as const;
const materialities = ["HIGH", "MEDIUM", "LOW", "UNKNOWN"] as const;
const novelties = [
  "NEW",
  "FOLLOW_UP",
  "CORRECTION",
  "ROUTINE",
  "UNKNOWN",
] as const;
export function eventLabel(code: string) {
  return code.toLowerCase().replaceAll("_", " ");
}

export function CompanyEvents({ generation }: { generation: number }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const data = useResource(
    "CompanyEventPage",
    `${path}?offset=${offset}&view=${generation}`,
  );
  return (
    <section className="detail-card">
      <h2>Company event threads</h2>
      {data.error ? (
        <p role="alert">
          {data.error}{" "}
          <button type="button" onClick={data.reload}>
            Retry
          </button>
        </p>
      ) : !data.value ? (
        <p role="status">Loading company events…</p>
      ) : data.value.items.length === 0 ? (
        <p>Review a saved primary source to create a company event.</p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((item) => (
            <li key={item.eventId}>
              <div>
                <strong>{item.title}</strong>
                <EventLabels event={item} />
                <button
                  type="button"
                  aria-expanded={open === item.eventId}
                  onClick={() =>
                    setOpen(open === item.eventId ? null : item.eventId)
                  }
                >
                  Versions of {item.title}
                </button>
                {open === item.eventId && <EventHistory id={item.eventId} />}
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
            onClick={() => {
              setOffset(offset - 40);
              setOpen(null);
            }}
          >
            Previous events
          </button>
          <button
            type="button"
            disabled={!data.value?.hasMore}
            onClick={() => {
              setOffset(offset + 40);
              setOpen(null);
            }}
          >
            Next events
          </button>
        </div>
      )}
    </section>
  );
}

export function EventLabels({ event }: { event: CompanyEvent }) {
  return (
    <p>
      {event.companyName} · {subtypes[event.subtype]} ·{" "}
      {eventLabel(event.stage)} · {eventLabel(event.materiality)} materiality ·{" "}
      {eventLabel(event.novelty)}
    </p>
  );
}

export function EventHistory({ id }: { id: string }) {
  const versions = useResource("CompanyEventHistory", `${path}/${id}/versions`);
  const [chosen, setChosen] = useState<number | null>(null);
  const selected =
    versions.value?.items.find((item) => item.revision === chosen) ??
    versions.value?.items[0];
  const evidence = useResource(
    "CompanySourceDetail",
    selected
      ? versionPath(selected.documentId, selected.documentRevision)
      : null,
  );
  return (
    <div className="settings-card">
      {versions.error ? (
        <p role="alert">{versions.error}</p>
      ) : !versions.value || !selected ? (
        <p role="status">Loading event versions…</p>
      ) : (
        <>
          <label>
            Event version{" "}
            <select
              value={selected.revision}
              onChange={(event) => setChosen(Number(event.target.value))}
            >
              {versions.value.items.map((item) => (
                <option value={item.revision} key={item.revision}>
                  Version {item.revision} · {item.title}
                </option>
              ))}
            </select>
          </label>
          <EventLabels event={selected} />
          <p>
            Reviewed <LocalTime value={selected.reviewedAt} /> · Source:{" "}
            {selected.sourceTitle} (version {selected.documentRevision})
          </p>
          {evidence.error ? (
            <p role="alert">{evidence.error}</p>
          ) : !evidence.value ? (
            <p role="status">Loading evidence…</p>
          ) : (
            <SourceEvidence detail={evidence.value} />
          )}
        </>
      )}
    </div>
  );
}

export function EventReview({
  source,
  onSaved,
}: {
  source: CompanySource;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Classify this source as a company event</summary>
      {open && <EventForm source={source} onSaved={onSaved} />}
    </details>
  );
}

function EventForm({
  source,
  onSaved,
}: {
  source: CompanySource;
  onSaved: () => void;
}) {
  const hint = useResource(
    "EventSuggestion",
    `${path}/suggestion?documentId=${source.documentId}&revision=${source.revision}`,
  );
  const prior = useResource(
    "CompanyEventPage",
    `${path}?companyId=${source.companyId}`,
  );
  const command = usePrivateCommand();
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState("");
  const [input, setInput] = useState<CompanyEventInput>({
    documentId: source.documentId,
    documentRevision: source.revision,
    eventId: null,
    expectedRevision: null,
    title: source.title,
    groupingKey: null,
    subtype: "OTHER",
    stage: "UNKNOWN",
    materiality: "UNKNOWN",
    novelty: "UNKNOWN",
    reviewed: true,
  });
  function change<K extends keyof CompanyEventInput>(
    key: K,
    value: CompanyEventInput[K],
  ) {
    setNotice("");
    setInput((current) => ({ ...current, [key]: value }));
  }
  return (
    <form
      className="settings-card"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!confirmed) return;
        const result = await command.run((csrf) =>
          requestContract("CompanyEvent", path, {
            method: "POST",
            csrf,
            body: input,
          }),
        );
        if (result) {
          setConfirmed(false);
          setNotice(`Saved event version ${result.revision}.`);
          prior.reload();
          onSaved();
        }
      }}
    >
      {hint.value && (
        <button
          type="button"
          onClick={() => {
            if (!hint.value) return;
            const { subtype, stage, materiality, novelty } = hint.value;
            setInput({ ...input, subtype, stage, materiality, novelty });
            setNotice("");
          }}
        >
          Use title suggestion: {subtypes[hint.value.subtype]}
        </button>
      )}
      <label>
        Event title{" "}
        <input
          required
          value={input.title}
          maxLength={120}
          onChange={(event) => change("title", event.target.value)}
        />
      </label>
      <label>
        Event thread{" "}
        <select
          value={input.eventId ?? ""}
          onChange={(event) => {
            const match = prior.value?.items.find(
              (item) => item.eventId === event.target.value,
            );
            setInput({
              ...input,
              eventId: match?.eventId ?? null,
              expectedRevision: match?.revision ?? null,
              novelty: match ? "FOLLOW_UP" : input.novelty,
            });
          }}
        >
          <option value="">Group by title, type and period</option>
          {prior.value?.items.map((item) => (
            <option key={item.eventId} value={item.eventId}>
              {item.title} · Version {item.revision}
            </option>
          ))}
        </select>
      </label>
      {!input.eventId && (
        <label>
          Period or event reference (optional){" "}
          <input
            value={input.groupingKey ?? ""}
            maxLength={80}
            onChange={(event) =>
              change("groupingKey", event.target.value || null)
            }
          />
        </label>
      )}
      <label>
        Event type{" "}
        <select
          value={input.subtype}
          onChange={(event) =>
            change(
              "subtype",
              event.target.value as CompanyEventInput["subtype"],
            )
          }
        >
          {Object.entries(subtypes).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Stage{" "}
        <select
          value={input.stage}
          onChange={(event) =>
            change("stage", event.target.value as CompanyEventInput["stage"])
          }
        >
          {stages.map((value) => (
            <option key={value} value={value}>
              {eventLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Materiality{" "}
        <select
          value={input.materiality}
          onChange={(event) =>
            change(
              "materiality",
              event.target.value as CompanyEventInput["materiality"],
            )
          }
        >
          {materialities.map((value) => (
            <option key={value} value={value}>
              {eventLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label>
        What changed{" "}
        <select
          value={input.novelty}
          onChange={(event) =>
            change(
              "novelty",
              event.target.value as CompanyEventInput["novelty"],
            )
          }
        >
          {novelties.map((value) => (
            <option key={value} value={value}>
              {eventLabel(value)}
            </option>
          ))}
        </select>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I reviewed this classification against the selected source version.
      </label>
      {command.error && <p role="alert">{command.error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="primary-button" type="submit" disabled={command.busy}>
        Save event classification
      </button>
    </form>
  );
}
