import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  ManagementGuidance,
  ManagementGuidanceInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence, SourceLocation } from "./Evidence.tsx";
import { EvidencePicker } from "./FinancialFacts.tsx";
import { DeliveryComparison } from "./GuidanceDelivery.tsx";
import {
  emptyTarget,
  MetricTargetFields,
  TargetAmount,
  TargetContext,
} from "./MetricTargetFields.tsx";

const root = "/api/v1/research";
const kinds = {
  QUALITATIVE: "Qualitative outlook",
  AT_LEAST: "At least",
  AT_MOST: "At most",
  RANGE: "Range or exact target",
} as const;
const stages = {
  DRAFT: "Needs review",
  CONFIRMED: "Confirmed",
  WITHDRAWN: "Withdrawn",
} as const;

export function GuidancePanel({ company }: { company: string }) {
  const [open, setOpen] = useState(true);
  const [selected, setSelected] = useState("");
  const [editing, setEditing] = useState(false);
  const data = useResource(
    "ManagementGuidanceList",
    open ? `${root}/companies/${company}/guidance` : null,
  );
  const guidance = data.value?.items.find(
    (item) => item.guidanceId === selected,
  );
  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Management promises and delivery</summary>
      {data.error && <p role="alert">{data.error}</p>}
      {open && !data.value && !data.error && (
        <p role="status">Loading management guidance…</p>
      )}
      {data.value?.items.length === 0 && (
        <p>No guidance saved for this company.</p>
      )}
      {data.value && (
        <>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ my: 1.5, alignItems: { sm: "center" } }}
          >
            <TextField
              select
              label="Commitment"
              size="small"
              sx={{ minWidth: { sm: 220 }, flex: 1 }}
              value={selected}
              onChange={(event) => {
                setSelected(event.target.value);
                setEditing(false);
              }}
            >
              <MenuItem value="">Choose a commitment</MenuItem>
              {data.value.items.map((item) => (
                <MenuItem key={item.guidanceId} value={item.guidanceId}>
                  {item.statementDate ?? "Undated"} · {item.title} ·{" "}
                  {stages[item.stage]}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="outlined"
              onClick={() => {
                setSelected("");
                setEditing(true);
              }}
            >
              Add guidance from a source
            </Button>
          </Stack>
          {editing ? (
            <GuidanceForm
              key={selected}
              company={company}
              guidance={guidance}
              onCancel={() => setEditing(false)}
              onSaved={(item) => {
                setSelected(item.guidanceId);
                setEditing(false);
                data.reload();
              }}
            />
          ) : (
            guidance && (
              <GuidanceTimeline
                key={guidance.guidanceId}
                guidance={guidance}
                onEdit={() => setEditing(true)}
              />
            )
          )}
        </>
      )}
    </details>
  );
}

function GuidanceTimeline({
  guidance,
  onEdit,
}: {
  guidance: ManagementGuidance;
  onEdit: () => void;
}) {
  const data = useResource(
    "ManagementGuidanceList",
    `${root}/guidance/${guidance.guidanceId}/versions`,
  );
  const older =
    data.value?.items.filter((item) => item.revision < guidance.revision) ?? [];
  const original = older.filter((item) => item.stage === "CONFIRMED").at(-1);
  const intermediate = older.filter(
    (item) => item.revision !== original?.revision,
  );
  return (
    <Stack spacing={1.5}>
      <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
        {original && (
          <GuidanceVersion item={original} label="Original commitment" />
        )}
        <GuidanceVersion
          item={guidance}
          label="Latest saved statement"
          allowCompletion
        />
      </Stack>
      <Button variant="outlined" onClick={onEdit} sx={{ alignSelf: "start" }}>
        Review or revise guidance
      </Button>
      {data.error && <p role="alert">{data.error}</p>}
      {intermediate.length > 0 && (
        <details>
          <summary>Other saved revisions ({intermediate.length})</summary>
          <Stack spacing={1.5} sx={{ mt: 1 }}>
            {intermediate.map((item) => (
              <GuidanceVersion key={item.revision} item={item} />
            ))}
          </Stack>
        </details>
      )}
    </Stack>
  );
}

function GuidanceVersion({
  item,
  label,
  allowCompletion = false,
}: {
  item: ManagementGuidance;
  label?: string;
  allowCompletion?: boolean;
}) {
  const [evidence, setEvidence] = useState(false);
  return (
    <Paper
      component="article"
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        flex: 1,
        minWidth: 0,
        overflowWrap: "anywhere",
      }}
    >
      {label && (
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
      )}
      <h4>
        {item.title} · version {item.revision}
      </h4>
      <p>
        {kinds[item.kind]} · {stages[item.stage]}
      </p>
      {item.targetDate && (
        <p>
          <strong>Target date</strong> {item.targetDate}
        </p>
      )}
      <p>
        Stated {item.statementDate ?? "on an unverified date"} · Published{" "}
        {item.publishedAt ? (
          <LocalTime value={item.publishedAt} />
        ) : (
          "on an unverified date"
        )}
      </p>
      {item.dimensions && <TargetContext value={item.dimensions} />}
      <GuidanceBounds item={item} />
      {item.caveats && <p>{item.caveats}</p>}
      <details onToggle={(event) => setEvidence(event.currentTarget.open)}>
        <summary>Open the source statement</summary>
        {evidence && <AnchorEvidence id={item.anchorId} />}
      </details>
      <DeliveryComparison item={item} allowCompletion={allowCompletion} />
    </Paper>
  );
}

function GuidanceBounds({ item }: { item: ManagementGuidance }) {
  const dimensions = item.dimensions;
  if (!dimensions || (item.lower === null && item.upper === null)) return null;
  return (
    <p>
      {item.lower !== null && (
        <>
          Lower bound{" "}
          <TargetAmount
            value={dimensions}
            amount={item.lower}
            scale={item.scale}
          />
        </>
      )}
      {item.lower !== null && item.upper !== null && " · "}
      {item.upper !== null && (
        <>
          Upper bound{" "}
          <TargetAmount
            value={dimensions}
            amount={item.upper}
            scale={item.scale}
          />
        </>
      )}
    </p>
  );
}

function GuidanceForm({
  company,
  guidance,
  onSaved,
  onCancel,
}: {
  company: string;
  guidance?: ManagementGuidance;
  onSaved: (item: ManagementGuidance) => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const [draft, setDraft] = useState<ManagementGuidanceInput>(() => ({
    title: guidance?.title ?? "",
    kind: guidance?.kind ?? "QUALITATIVE",
    stage: "DRAFT",
    statementDate: guidance?.statementDate ?? null,
    targetDate: guidance?.targetDate ?? null,
    dimensions: guidance?.dimensions ?? null,
    lower: guidance?.lower ?? null,
    upper: guidance?.upper ?? null,
    scale: guidance?.scale ?? "ONES",
    caveats: guidance?.caveats ?? "",
    anchorId: guidance?.anchorId ?? "",
  }));
  const candidate = useResource(
    "GuidanceCandidates",
    draft.anchorId ? `${root}/guidance/candidates/${draft.anchorId}` : null,
  );
  const withdrawal = draft.stage === "WITHDRAWN";
  const numeric = draft.kind !== "QUALITATIVE";
  const needsLower = draft.kind === "RANGE" || draft.kind === "AT_LEAST";
  const needsUpper = draft.kind === "RANGE" || draft.kind === "AT_MOST";
  function changeKind(kind: ManagementGuidanceInput["kind"]) {
    setDraft({
      ...draft,
      kind,
      targetDate: kind === "QUALITATIVE" ? draft.targetDate : null,
      dimensions:
        kind === "QUALITATIVE" ? null : (draft.dimensions ?? emptyTarget),
      scale: kind === "QUALITATIVE" ? "ONES" : draft.scale,
      lower: kind === "AT_MOST" || kind === "QUALITATIVE" ? null : draft.lower,
      upper: kind === "AT_LEAST" || kind === "QUALITATIVE" ? null : draft.upper,
    });
  }
  return (
    <form
      className="workspace-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const dimensions =
          draft.dimensions?.periodEnd && draft.dimensions.periodStart
            ? draft.dimensions
            : null;
        const body = { ...draft, dimensions };
        const result = await command.run((csrf) =>
          requestContract(
            "ManagementGuidance",
            guidance
              ? `${root}/guidance/${guidance.guidanceId}`
              : `${root}/companies/${company}/guidance`,
            {
              method: "POST",
              csrf,
              body: guidance
                ? { expectedRevision: guidance.revision, guidance: body }
                : body,
            },
          ),
        );
        if (result) onSaved(result);
      }}
    >
      <label>
        Commitment title{" "}
        <input
          required
          maxLength={120}
          value={draft.title}
          onChange={(event) =>
            setDraft({ ...draft, title: event.target.value })
          }
        />
      </label>
      <label>
        Review status{" "}
        <select
          value={draft.stage}
          onChange={(event) => {
            const stage = event.target
              .value as ManagementGuidanceInput["stage"];
            setDraft(
              stage === "WITHDRAWN" && guidance
                ? {
                    ...draft,
                    stage,
                    kind: guidance.kind,
                    targetDate: guidance.targetDate,
                    dimensions: guidance.dimensions,
                    lower: guidance.lower,
                    upper: guidance.upper,
                    scale: guidance.scale,
                  }
                : { ...draft, stage },
            );
          }}
        >
          <option value="DRAFT">Save for review</option>
          <option value="CONFIRMED">Confirm source statement</option>
          {guidance?.stage === "CONFIRMED" && (
            <option value="WITHDRAWN">Confirm withdrawal</option>
          )}
        </select>
      </label>
      <EvidencePicker
        company={company}
        onChoose={(location) =>
          setDraft({ ...draft, anchorId: location.anchorId })
        }
      />
      {candidate.error && <p role="alert">{candidate.error}</p>}
      {candidate.value && (
        <details>
          <summary>Selected statement and printed numbers</summary>
          <SourceLocation location={candidate.value.evidence} />
          {candidate.value.printedNumbers.length > 0 && (
            <p>
              Numbers in this passage ·{" "}
              {candidate.value.printedNumbers.join(", ")}
            </p>
          )}
        </details>
      )}
      <label>
        Statement date{" "}
        <input
          type="date"
          required={draft.stage !== "DRAFT"}
          value={draft.statementDate ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, statementDate: event.target.value || null })
          }
        />
      </label>
      {withdrawal ? (
        <p>Select the source passage that documents the withdrawal.</p>
      ) : (
        <>
          <label>
            Statement type{" "}
            <select
              value={draft.kind}
              onChange={(event) =>
                changeKind(
                  event.target.value as ManagementGuidanceInput["kind"],
                )
              }
            >
              {Object.entries(kinds).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {!numeric && (
            <TextField
              label="Published milestone target date"
              type="date"
              value={draft.targetDate ?? ""}
              onChange={(event) =>
                setDraft({ ...draft, targetDate: event.target.value || null })
              }
              helperText="Optional. Use the deadline supported by the selected statement."
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
          {numeric && (
            <MetricTargetFields
              value={draft.dimensions ?? emptyTarget}
              scale={draft.scale}
              required={draft.stage === "CONFIRMED"}
              onChange={(dimensions, scale) =>
                setDraft({ ...draft, dimensions, scale })
              }
            />
          )}
          {needsLower && (
            <label>
              Lower bound{" "}
              <input
                inputMode="decimal"
                required={draft.stage === "CONFIRMED"}
                maxLength={32}
                value={draft.lower ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, lower: event.target.value || null })
                }
              />
            </label>
          )}
          {needsUpper && (
            <label>
              Upper bound{" "}
              <input
                inputMode="decimal"
                required={draft.stage === "CONFIRMED"}
                maxLength={32}
                value={draft.upper ?? ""}
                onChange={(event) =>
                  setDraft({ ...draft, upper: event.target.value || null })
                }
              />
            </label>
          )}
        </>
      )}
      <label>
        {withdrawal ? "Withdrawal reason" : "Caveats or conditions"}{" "}
        <textarea
          rows={3}
          required={withdrawal}
          maxLength={1200}
          value={draft.caveats}
          onChange={(event) =>
            setDraft({ ...draft, caveats: event.target.value })
          }
        />
      </label>
      <button
        type="submit"
        disabled={
          command.busy ||
          !draft.anchorId ||
          (withdrawal && draft.anchorId === guidance?.anchorId)
        }
      >
        Save guidance version
      </button>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
      {command.error && <p role="alert">{command.error}</p>}
    </form>
  );
}
