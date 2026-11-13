import { useState } from "react";
import type {
  InvestmentThesis,
  ThesisCondition,
  ThesisConditionInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { FactLabels, factAmount } from "./FinancialFacts.tsx";
import {
  emptyTarget,
  MetricTargetFields,
  TargetAmount,
  TargetContext,
} from "./MetricTargetFields.tsx";

const statuses = {
  MATCHED: "Supporting evidence",
  VIOLATED: "Contradicting evidence",
  UNKNOWN: "Missing evidence",
  REVIEW_NEEDED: "Needs review",
} as const;
export const factReasons: Record<string, string> = {
  PERIOD_OPEN: "The target reporting period is still open.",
  FACT_MISSING: "There is no reviewed figure for the target period.",
  DIMENSIONS_MISMATCH:
    "Figures for this period use a different reporting context.",
  PUBLICATION_UNKNOWN: "The figure has no known publication date.",
  PUBLISHED_AFTER_CUTOFF: "The figure was published after the selected date.",
  PERIOD_PUBLICATION_INVALID:
    "The figure was published before the reporting period ended.",
  SOURCE_REVISED:
    "The source was revised. Review the figure against the current source.",
  DERIVATION_REVIEW_REQUIRED:
    "A reviewed input to the calculation changed or needs review.",
  COMPARABLE_FACT:
    "The reviewed figure matches the specified reporting context.",
};

export function ThesisConditions({ thesis }: { thesis: InvestmentThesis }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const path = `/api/v1/research/theses/${thesis.thesisId}/conditions`;
  const data = useResource("ThesisConditions", open ? path : null);
  const command = usePrivateCommand();
  const active = thesis.decision !== "CLOSE";
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Monitored assumptions</summary>
      <p className="muted-copy">
        Saved targets are checked when a matching figure is reviewed.
      </p>
      {data.error && <p role="alert">{data.error}</p>}
      {data.value?.items.length === 0 && <p>No conditions defined.</p>}
      {data.value?.items.map((item) => (
        <Condition
          key={item.definition.conditionId}
          item={item}
          path={path}
          onChange={data.reload}
        />
      ))}
      {active && data.value && (
        <>
          {data.value.items.some((item) => !item.definition.retired) && (
            <button
              type="button"
              disabled={command.busy}
              onClick={async () => {
                const checked = await command.run((csrf) =>
                  requestContract("ThesisConditions", `${path}/check`, {
                    method: "POST",
                    csrf,
                  }),
                );
                if (checked) data.reload();
              }}
            >
              Check current evidence
            </button>
          )}
          {adding ? (
            <ConditionForm
              thesis={thesis}
              path={path}
              onSaved={() => {
                setAdding(false);
                data.reload();
              }}
            />
          ) : (
            <button type="button" onClick={() => setAdding(true)}>
              Add a condition
            </button>
          )}
          {command.error && <p role="alert">{command.error}</p>}
        </>
      )}
    </details>
  );
}

function Condition({
  item,
  path,
  onChange,
}: {
  item: ThesisCondition;
  path: string;
  onChange: () => void;
}) {
  const command = usePrivateCommand();
  const [expanded, setExpanded] = useState(false);
  const { definition, lastCheck } = item;
  return (
    <details onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>
        {definition.label} ·{" "}
        {definition.retired
          ? "Retired"
          : lastCheck
            ? statuses[lastCheck.state]
            : "Awaiting check"}
      </summary>
      <TargetContext value={definition.dimensions} />
      <p>
        {definition.comparator === "GTE" ? "At least " : "At most "}
        <TargetAmount
          value={definition.dimensions}
          amount={definition.threshold}
          scale={definition.scale}
        />
        {" · Added at thesis version "}
        {definition.thesisRevision}
      </p>
      {lastCheck && (
        <div>
          <p>
            {factReasons[lastCheck.reason]} Checked{" "}
            <LocalTime value={lastCheck.evaluatedAt} /> against thesis version{" "}
            {lastCheck.thesisRevision}.
          </p>
          {lastCheck.fact && expanded && (
            <>
              <p>Reviewed figure {factAmount(lastCheck.fact)}</p>
              <FactLabels fact={lastCheck.fact} />
              <AnchorEvidence id={lastCheck.fact.anchorId} />
            </>
          )}
        </div>
      )}
      {!definition.retired && (
        <button
          type="button"
          disabled={command.busy}
          onClick={async () => {
            const result = await command.run((csrf) =>
              requestContract(
                "ThesisCondition",
                `${path}/${definition.conditionId}/retire`,
                { method: "POST", csrf },
              ),
            );
            if (result) onChange();
          }}
        >
          Retire condition
        </button>
      )}
      {command.error && <p role="alert">{command.error}</p>}
    </details>
  );
}

function ConditionForm({
  thesis,
  path,
  onSaved,
}: {
  thesis: InvestmentThesis;
  path: string;
  onSaved: () => void;
}) {
  const command = usePrivateCommand();
  const [draft, setDraft] = useState<ThesisConditionInput>({
    expectedRevision: thesis.revision,
    label: "",
    dimensions: emptyTarget,
    comparator: "GTE",
    threshold: "",
    scale: "ONES",
  });
  return (
    <form
      className="workspace-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const result = await command.run((csrf) =>
          requestContract("ThesisCondition", path, {
            method: "POST",
            csrf,
            body: draft,
          }),
        );
        if (result) onSaved();
      }}
    >
      <label>
        Condition name{" "}
        <input
          required
          maxLength={100}
          value={draft.label}
          onChange={(event) =>
            setDraft({ ...draft, label: event.target.value })
          }
        />
      </label>
      <MetricTargetFields
        value={draft.dimensions}
        scale={draft.scale}
        onChange={(dimensions, scale) =>
          setDraft({ ...draft, dimensions, scale })
        }
      />
      <label>
        Comparison{" "}
        <select
          value={draft.comparator}
          onChange={(event) =>
            setDraft({
              ...draft,
              comparator: event.target
                .value as ThesisConditionInput["comparator"],
            })
          }
        >
          <option value="GTE">At least</option>
          <option value="LTE">At most</option>
        </select>
      </label>
      <label>
        Threshold{" "}
        <input
          required
          inputMode="decimal"
          maxLength={32}
          value={draft.threshold}
          onChange={(event) =>
            setDraft({ ...draft, threshold: event.target.value })
          }
        />
      </label>
      <button type="submit" disabled={command.busy}>
        Save condition
      </button>
      {command.error && <p role="alert">{command.error}</p>}
    </form>
  );
}
