import { useState } from "react";
import type {
  CompanyEvent,
  InvestmentThesis,
  ThesisReview,
  ThesisReviewDecisionInput,
  ThesisReviewInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { CompanyNotificationEvidence } from "./CompanyNotificationEvidence.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { EvidencePicker, FactLabels, factAmount } from "./FinancialFacts.tsx";
import { DeliveryResult } from "./GuidanceDelivery.tsx";
import { factReasons } from "./ThesisConditions.tsx";

const root = "/api/v1/research";
const relations = {
  CONTEXT: "Context for review",
  SUPPORTS: "Supporting evidence",
  CHALLENGES: "Counter-evidence",
} as const;
const decisions = {
  REAFFIRM: "Reaffirm",
  REVISE: "Revise",
  PAUSE: "Pause",
  CLOSE: "Close",
  DISMISS: "Dismiss",
} as const;
const checks = {
  MATCHED: "Matched",
  VIOLATED: "Violated",
  UNKNOWN: "Unknown",
  REVIEW_NEEDED: "Needs review",
} as const;

export function ThesisReviews({
  thesis,
  event,
  review,
}: {
  thesis: InvestmentThesis;
  event?: string;
  review?: string;
}) {
  const [open, setOpen] = useState(Boolean(event || review));
  const [selected, setSelected] = useState(review ?? "");
  const [adding, setAdding] = useState(Boolean(event));
  const [offset, setOffset] = useState(0);
  const path = `${root}/theses/${thesis.thesisId}/reviews`;
  const data = useResource(
    "ThesisReviewIndex",
    open ? `${path}?offset=${offset}${event ? `&event=${event}` : ""}` : null,
  );
  return (
    <details
      open={open}
      onToggle={(toggle) => setOpen(toggle.currentTarget.open)}
    >
      <summary>Evidence review tasks</summary>
      {data.error && <p role="alert">{data.error}</p>}
      {open && !data.value && !data.error && (
        <p role="status">Loading review tasks…</p>
      )}
      {data.value && (
        <>
          {data.value.items.length === 0 && <p>No review tasks saved.</p>}
          {data.value.items.map((item) => (
            <div key={item.reviewId}>
              <button
                type="button"
                aria-pressed={item.reviewId === selected}
                onClick={() => {
                  setAdding(false);
                  setSelected(item.reviewId);
                }}
              >
                {item.eventTitle} · {item.decided ? "Decided" : "Open"}
              </button>
              <p>
                Thesis version {item.thesisRevision} ·{" "}
                <LocalTime value={item.createdAt} />
              </p>
            </div>
          ))}
          {offset > 0 && (
            <button type="button" onClick={() => setOffset(offset - 20)}>
              Previous tasks
            </button>
          )}
          {data.value.hasMore && (
            <button type="button" onClick={() => setOffset(offset + 20)}>
              Next tasks
            </button>
          )}
          {thesis.decision !== "CLOSE" &&
            (adding ? (
              <ReviewForm
                thesis={thesis}
                suggestions={data.value.suggestions}
                event={event}
                path={path}
                onCancel={() => setAdding(false)}
                onSaved={(item) => {
                  setSelected(item.reviewId);
                  setAdding(false);
                  setOffset(0);
                  data.reload();
                }}
              />
            ) : (
              <button type="button" onClick={() => setAdding(true)}>
                Review a company event
              </button>
            ))}
        </>
      )}
      {open && !adding && selected && (
        <ReviewDetails key={selected} id={selected} onChange={data.reload} />
      )}
    </details>
  );
}

function ReviewForm({
  thesis,
  suggestions,
  event,
  path,
  onSaved,
  onCancel,
}: {
  thesis: InvestmentThesis;
  suggestions: CompanyEvent[];
  event?: string;
  path: string;
  onSaved: (item: ThesisReview) => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const [draft, setDraft] = useState<ThesisReviewInput>({
    expectedRevision: thesis.revision,
    eventVersionId: event ?? "",
    relation: "CONTEXT",
    anchorId: null,
    conditionCheckId: null,
    guidance: null,
  });
  const [guidanceId, setGuidanceId] = useState("");
  const company = thesis.companyId;
  const guidance = useResource(
    "ManagementGuidanceList",
    `${root}/companies/${company}/guidance`,
  );
  const versions = useResource(
    "ManagementGuidanceList",
    guidanceId ? `${root}/guidance/${guidanceId}/versions` : null,
  );
  const conditions = useResource(
    "ThesisConditions",
    `${root}/theses/${thesis.thesisId}/conditions`,
  );
  const chosen = suggestions.find(
    (item) => item.versionId === draft.eventVersionId,
  );
  return (
    <form
      onSubmit={async (submission) => {
        submission.preventDefault();
        const saved = await command.run((csrf) =>
          requestContract("ThesisReview", path, {
            method: "POST",
            csrf,
            body: draft,
          }),
        );
        if (saved) onSaved(saved);
      }}
    >
      <p>
        Recent reviewed events from this company are suggested for inspection.
        Choose how the event relates to this thesis.
      </p>
      <label>
        Reviewed event{" "}
        <select
          required
          value={draft.eventVersionId}
          onChange={(item) =>
            setDraft({ ...draft, eventVersionId: item.target.value })
          }
        >
          <option value="">Choose an event</option>
          {suggestions.map((item) => (
            <option key={item.versionId} value={item.versionId}>
              {item.title} · version {item.revision}
            </option>
          ))}
        </select>
      </label>
      {chosen && (
        <details>
          <summary>Inspect the event source</summary>
          <CompanyNotificationEvidence event={chosen} />
        </details>
      )}
      <label>
        How the evidence relates{" "}
        <select
          value={draft.relation}
          onChange={(item) =>
            setDraft({
              ...draft,
              relation: item.target.value as ThesisReviewInput["relation"],
            })
          }
        >
          {Object.entries(relations).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <EvidencePicker
        company={company}
        onChoose={(item) => setDraft({ ...draft, anchorId: item.anchorId })}
      />
      {draft.anchorId && (
        <details>
          <summary>Selected evidence</summary>
          <AnchorEvidence id={draft.anchorId} />
          <button
            type="button"
            onClick={() => setDraft({ ...draft, anchorId: null })}
          >
            Clear evidence
          </button>
        </details>
      )}
      <label>
        Include a checked condition{" "}
        <select
          value={draft.conditionCheckId ?? ""}
          onChange={(item) =>
            setDraft({ ...draft, conditionCheckId: item.target.value || null })
          }
        >
          <option value="">No condition selected</option>
          {conditions.value?.items.map(
            (item) =>
              item.lastCheck?.thesisRevision === thesis.revision && (
                <option
                  key={item.lastCheck.checkId}
                  value={item.lastCheck.checkId}
                >
                  {item.definition.label} · {checks[item.lastCheck.state]}
                </option>
              ),
          )}
        </select>
      </label>
      <label>
        Include guidance and its comparison{" "}
        <select
          value={guidanceId}
          onChange={(item) => {
            setGuidanceId(item.target.value);
            setDraft({ ...draft, guidance: null });
          }}
        >
          <option value="">No guidance selected</option>
          {guidance.value?.items.map((item) => (
            <option key={item.guidanceId} value={item.guidanceId}>
              {item.title}
            </option>
          ))}
        </select>
      </label>
      {guidanceId && (
        <label>
          Guidance version{" "}
          <select
            required
            value={draft.guidance?.revision ?? ""}
            onChange={(item) =>
              setDraft({
                ...draft,
                guidance: item.target.value
                  ? { id: guidanceId, revision: Number(item.target.value) }
                  : null,
              })
            }
          >
            <option value="">Choose a reviewed version</option>
            {versions.value?.items
              .filter((item) => item.stage !== "DRAFT")
              .map((item) => (
                <option key={item.revision} value={item.revision}>
                  Version {item.revision} · {item.statementDate}
                </option>
              ))}
          </select>
        </label>
      )}
      <button
        type="submit"
        disabled={
          command.busy ||
          !chosen ||
          (draft.relation !== "CONTEXT" && !draft.anchorId)
        }
      >
        Create review task
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {(command.error ||
        conditions.error ||
        guidance.error ||
        versions.error) && (
        <p role="alert">
          {command.error ||
            conditions.error ||
            guidance.error ||
            versions.error}
        </p>
      )}
    </form>
  );
}

function ReviewDetails({ id, onChange }: { id: string; onChange: () => void }) {
  const data = useResource("ThesisReview", `${root}/thesis-reviews/${id}`);
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading review evidence…</p>;
  const item = data.value;
  return (
    <article className="settings-card">
      <h4>{item.event.title}</h4>
      <p>
        {relations[item.relation]} · Saved <LocalTime value={item.createdAt} />
      </p>
      <details>
        <summary>
          Thesis version {item.thesis.revision} · {item.thesis.title}
        </summary>
        <p>{item.thesis.rationale}</p>
        <p>{item.thesis.risks}</p>
        <p>{item.thesis.milestones}</p>
      </details>
      <details>
        <summary>Reviewed event and original source</summary>
        <CompanyNotificationEvidence event={item.event} />
      </details>
      {item.anchorId && <AnchorEvidence id={item.anchorId} />}
      {item.condition && (
        <div>
          <p>
            Condition {checks[item.condition.state]} · Checked{" "}
            <LocalTime value={item.condition.evaluatedAt} />
          </p>
          <p>{factReasons[item.condition.reason]}</p>
          {item.condition.fact && (
            <>
              <p>{factAmount(item.condition.fact)}</p>
              <FactLabels fact={item.condition.fact} />
              <AnchorEvidence id={item.condition.fact.anchorId} />
            </>
          )}
        </div>
      )}
      {item.guidance && (
        <details>
          <summary>
            {item.guidance.statement.title} · guidance version{" "}
            {item.guidance.statement.revision}
          </summary>
          <p>Statement date {item.guidance.statement.statementDate}</p>
          <AnchorEvidence id={item.guidance.statement.anchorId} />
          <DeliveryResult result={item.guidance.outcome} />
        </details>
      )}
      {item.decision ? (
        <div>
          <p>
            <strong>{decisions[item.decision.action]}</strong> ·{" "}
            <LocalTime value={item.decision.decidedAt} />
          </p>
          <p>{item.decision.note}</p>
          {item.decision.anchorId && (
            <AnchorEvidence id={item.decision.anchorId} />
          )}
        </div>
      ) : (
        <DecisionForm
          item={item}
          onSaved={() => {
            data.reload();
            onChange();
          }}
        />
      )}
    </article>
  );
}

function DecisionForm({
  item,
  onSaved,
}: {
  item: ThesisReview;
  onSaved: () => void;
}) {
  const command = usePrivateCommand();
  const [draft, setDraft] = useState<ThesisReviewDecisionInput>({
    action: "REAFFIRM",
    note: "",
    anchorId: null,
  });
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const saved = await command.run((csrf) =>
          requestContract(
            "ThesisReview",
            `${root}/thesis-reviews/${item.reviewId}/decision`,
            {
              method: "POST",
              csrf,
              body: draft,
            },
          ),
        );
        if (saved) onSaved();
      }}
    >
      <label>
        Review decision{" "}
        <select
          value={draft.action}
          onChange={(event) =>
            setDraft({
              ...draft,
              action: event.target.value as ThesisReviewDecisionInput["action"],
            })
          }
        >
          {Object.entries(decisions).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Decision note{" "}
        <textarea
          rows={3}
          required
          maxLength={1200}
          value={draft.note}
          onChange={(event) => setDraft({ ...draft, note: event.target.value })}
        />
      </label>
      <EvidencePicker
        company={item.thesis.companyId}
        onChoose={(location) =>
          setDraft({ ...draft, anchorId: location.anchorId })
        }
      />
      {draft.anchorId && (
        <details>
          <summary>Selected decision evidence</summary>
          <AnchorEvidence id={draft.anchorId} />
          <button
            type="button"
            onClick={() => setDraft({ ...draft, anchorId: null })}
          >
            Clear evidence
          </button>
        </details>
      )}
      <button type="submit" disabled={command.busy}>
        Record decision
      </button>
      {command.error && <p role="alert">{command.error}</p>}
    </form>
  );
}
