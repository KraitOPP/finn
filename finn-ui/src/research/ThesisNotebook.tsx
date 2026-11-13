import { useState } from "react";
import type {
  InvestmentThesis,
  InvestmentThesisInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { usePreferences } from "../preferences/PreferencesProvider.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { EvidencePicker } from "./FinancialFacts.tsx";
import { ThesisConditions } from "./ThesisConditions.tsx";
import { ThesisReviews } from "./ThesisReviews.tsx";

const root = "/api/v1/research";
const decisions = {
  MONITOR: "Monitor",
  REAFFIRM: "Reaffirm",
  REVISE: "Revise",
  PAUSE: "Pause",
  CLOSE: "Close",
} as const;

export function ThesisNotebook({
  company,
  initialThesis,
  event,
  review,
}: {
  company: string;
  initialThesis?: string;
  event?: string;
  review?: string;
}) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState(initialThesis ?? "");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const path = `${root}/companies/${company}/theses`;
  const data = useResource("InvestmentTheses", open ? path : null);
  const thesis = data.value?.items.find((item) => item.thesisId === selected);
  function saved(version: InvestmentThesis) {
    setSelected(version.thesisId);
    setEditing(false);
    setNotice(`Thesis version ${version.revision} saved.`);
    data.reload();
  }
  return (
    <details
      open={open}
      onToggle={(toggle) => setOpen(toggle.currentTarget.open)}
    >
      <summary>Investment theses</summary>
      {notice && <p role="status">{notice}</p>}
      {data.error && <p role="alert">{data.error}</p>}
      {open && !data.value && !data.error && (
        <p role="status">Loading theses…</p>
      )}
      {data.value?.items.length === 0 && (
        <p>No investment thesis saved for this company.</p>
      )}
      {data.value && (
        <>
          <label>
            Saved thesis{" "}
            <select
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setEditing(false);
              }}
            >
              <option value="">Choose a thesis</option>
              {data.value.items.map((item) => (
                <option key={item.thesisId} value={item.thesisId}>
                  {item.title} · {decisions[item.decision]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => {
              setSelected("");
              setEditing(true);
            }}
          >
            New thesis
          </button>
          {editing ? (
            <ThesisEditor
              key={thesis?.thesisId ?? "new"}
              company={company}
              thesis={thesis}
              onSaved={saved}
              onCancel={() => setEditing(false)}
            />
          ) : (
            thesis && (
              <ThesisDetails
                key={thesis.thesisId}
                thesis={thesis}
                event={event}
                review={thesis.thesisId === initialThesis ? review : undefined}
                onEdit={() => setEditing(true)}
              />
            )
          )}
        </>
      )}
    </details>
  );
}

function ThesisDetails({
  thesis,
  onEdit,
  event,
  review,
}: {
  thesis: InvestmentThesis;
  onEdit: () => void;
  event?: string;
  review?: string;
}) {
  const [history, setHistory] = useState(false);
  const [revision, setRevision] = useState(0);
  const data = useResource(
    "InvestmentTheses",
    history ? `${root}/theses/${thesis.thesisId}/versions` : null,
  );
  const previous = data.value?.items.find((item) => item.revision === revision);
  return (
    <div className="settings-card">
      <ThesisVersion thesis={thesis} />
      <ThesisConditions key={thesis.revision} thesis={thesis} />
      <ThesisReviews thesis={thesis} event={event} review={review} />
      {thesis.reminderId && (
        <p>
          <a href="#/inbox">Manage review reminders in Inbox</a>
        </p>
      )}
      <button type="button" onClick={onEdit}>
        Save a new thesis version
      </button>
      <details onToggle={(event) => setHistory(event.currentTarget.open)}>
        <summary>Compare with a previous version</summary>
        {data.error && <p role="alert">{data.error}</p>}
        {data.value?.items.length === 1 && (
          <p>The first version is the only one saved.</p>
        )}
        {data.value && data.value.items.length > 1 && (
          <label>
            Earlier version{" "}
            <select
              value={revision}
              onChange={(event) => setRevision(Number(event.target.value))}
            >
              <option value="0">Choose a version</option>
              {data.value.items
                .filter((item) => item.revision < thesis.revision)
                .map((item) => (
                  <option key={item.revision} value={item.revision}>
                    Version {item.revision}
                  </option>
                ))}
            </select>
          </label>
        )}
        {previous && <ThesisVersion thesis={previous} />}
      </details>
    </div>
  );
}

function ThesisVersion({ thesis }: { thesis: InvestmentThesis }) {
  const [evidence, setEvidence] = useState(false);
  return (
    <article>
      <h4>
        {thesis.title} · version {thesis.revision}
      </h4>
      <p>
        Saved <LocalTime value={thesis.savedAt} />
      </p>
      <dl>
        <dt>Rationale</dt>
        <dd>{thesis.rationale}</dd>
        <dt>Risks</dt>
        <dd>{thesis.risks || "No risks recorded."}</dd>
        <dt>Milestones</dt>
        <dd>{thesis.milestones || "No milestones recorded."}</dd>
        <dt>Review decision</dt>
        <dd>
          {decisions[thesis.decision]}
          {thesis.decisionNote && ` · ${thesis.decisionNote}`}
        </dd>
        <dt>Scheduled review</dt>
        <dd>
          {thesis.review
            ? `${thesis.review.scheduledLocal.replace("T", " ")} · ${thesis.review.timeZone}`
            : "No review scheduled."}
        </dd>
      </dl>
      {thesis.anchorIds.length > 0 && (
        <details onToggle={(event) => setEvidence(event.currentTarget.open)}>
          <summary>Thesis evidence ({thesis.anchorIds.length})</summary>
          {evidence &&
            thesis.anchorIds.map((id) => <AnchorEvidence key={id} id={id} />)}
        </details>
      )}
    </article>
  );
}

const fields = [
  ["rationale", "Investment rationale", 2400, true],
  ["risks", "Risks", 1600, false],
  ["milestones", "Milestones to watch", 1600, false],
  ["decisionNote", "Reason for decision", 1200, false],
] as const;

function ThesisEditor({
  company,
  thesis,
  onSaved,
  onCancel,
}: {
  company: string;
  thesis?: InvestmentThesis;
  onSaved: (item: InvestmentThesis) => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const preferences = usePreferences();
  const [draft, setDraft] = useState<InvestmentThesisInput>(() => ({
    title: thesis?.title ?? "",
    rationale: thesis?.rationale ?? "",
    risks: thesis?.risks ?? "",
    milestones: thesis?.milestones ?? "",
    decision: thesis?.decision ?? "MONITOR",
    decisionNote: thesis?.decisionNote ?? "",
    review: thesis?.review ?? null,
    anchorIds: thesis?.anchorIds ?? [],
  }));
  const zone =
    draft.review?.timeZone ?? preferences.value?.timeZone ?? "Asia/Kolkata";
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const item = await command.run((csrf) =>
          requestContract(
            "InvestmentThesis",
            thesis
              ? `${root}/theses/${thesis.thesisId}`
              : `${root}/companies/${company}/theses`,
            {
              method: "POST",
              csrf,
              body: thesis
                ? { expectedRevision: thesis.revision, thesis: draft }
                : draft,
            },
          ),
        );
        if (item) onSaved(item);
      }}
    >
      <label>
        Thesis title{" "}
        <input
          required
          maxLength={100}
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
      </label>
      <label>
        Decision{" "}
        <select
          value={draft.decision}
          onChange={(event) => {
            const decision = event.target
              .value as InvestmentThesisInput["decision"];
            setDraft({
              ...draft,
              decision,
              review: decision === "CLOSE" ? null : draft.review,
            });
          }}
        >
          {Object.entries(decisions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {fields.map(([key, label, max, required]) => (
        <label key={key}>
          {label}
          <textarea
            rows={3}
            maxLength={max}
            required={
              required ||
              (key === "decisionNote" && draft.decision !== "MONITOR")
            }
            value={draft[key]}
            onChange={(event) =>
              setDraft({ ...draft, [key]: event.target.value })
            }
          />
        </label>
      ))}
      {draft.decision !== "CLOSE" && (
        <label>
          Review reminder ({zone}){" "}
          <input
            type="datetime-local"
            value={draft.review?.scheduledLocal ?? ""}
            onChange={(event) =>
              setDraft({
                ...draft,
                review: event.target.value
                  ? { scheduledLocal: event.target.value, timeZone: zone }
                  : null,
              })
            }
          />
        </label>
      )}
      {draft.anchorIds.map((id, index) => (
        <details key={id}>
          <summary>Selected evidence {index + 1}</summary>
          <AnchorEvidence id={id} />
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                anchorIds: draft.anchorIds.filter((item) => item !== id),
              })
            }
          >
            Remove evidence
          </button>
        </details>
      ))}
      {draft.anchorIds.length < 5 && (
        <EvidencePicker
          company={company}
          onChoose={(location) =>
            setDraft((previous) =>
              previous.anchorIds.includes(location.anchorId)
                ? previous
                : {
                    ...previous,
                    anchorIds: [...previous.anchorIds, location.anchorId],
                  },
            )
          }
        />
      )}
      <button type="submit" disabled={command.busy}>
        Save thesis
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {command.error && <p role="alert">{command.error}</p>}
    </form>
  );
}
