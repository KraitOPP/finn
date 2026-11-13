import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type {
  GuidanceDelivery,
  ManagementGuidance,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { EvidencePicker, FactLabels, factAmount } from "./FinancialFacts.tsx";
import { factReasons } from "./ThesisConditions.tsx";

const states: Record<GuidanceDelivery["state"], string> = {
  MET: "Met",
  MISSED: "Missed",
  PARTIAL: "Interim evidence",
  WITHDRAWN: "Withdrawn",
  REVISED: "Revised",
  NOT_DUE: "Not due",
  INSUFFICIENT_EVIDENCE: "Insufficient evidence",
};
const reasons: Record<string, string> = {
  ...factReasons,
  GUIDANCE_UNCONFIRMED: "The source statement still needs review.",
  GUIDANCE_NOT_PUBLISHED:
    "The source statement was unavailable by the selected date.",
  WITHDRAWAL_PUBLISHED: "A withdrawal had been published by the selected date.",
  REVISION_PUBLISHED:
    "An updated statement had been published by the selected date.",
  QUALITATIVE_STATEMENT: "This outlook has no numerical target.",
  OUTCOME_PREDATES_GUIDANCE:
    "The reported figure predates the guidance source.",
  INTERIM_YTD_ONLY:
    "Only a comparable interim figure is available. It gives no full-period verdict.",
  COMPARABLE_FACT:
    "The figure matches the metric, reporting period, basis, currency and unit. The comparison uses the published bounds after scale conversion.",
  MILESTONE_ON_TIME:
    "The reviewed completion date meets the published target date.",
  MILESTONE_LATE:
    "The reviewed completion date falls after the published target date.",
  MILESTONE_UNVERIFIED:
    "No reviewed completion evidence was available by the selected date.",
};

export function DeliveryComparison({
  item,
  allowCompletion = false,
}: {
  item: ManagementGuidance;
  allowCompletion?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [asOf, setAsOf] = useState("");
  const [editing, setEditing] = useState(false);
  const path = `/api/v1/research/guidance/${item.guidanceId}/versions/${item.revision}/delivery`;
  const data = useResource(
    "GuidanceDelivery",
    open ? `${path}${asOf ? `?asOf=${asOf}` : ""}` : null,
  );
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        {item.targetDate
          ? "Check milestone delivery"
          : "Compare with reported results"}
      </summary>
      <Stack spacing={1.5} sx={{ mt: 1, alignItems: "start" }}>
        <TextField
          label="As of (India time)"
          type="date"
          size="small"
          value={asOf}
          onChange={(event) => setAsOf(event.target.value)}
          helperText="Leave blank for today."
          slotProps={{ inputLabel: { shrink: true } }}
        />
        {data.error && <Alert severity="warning">{data.error}</Alert>}
        {open && !data.value && !data.error && (
          <p role="status">Checking published evidence…</p>
        )}
        {data.value && <DeliveryResult result={data.value} />}
        {open &&
          allowCompletion &&
          item.targetDate &&
          item.stage === "CONFIRMED" && (
            <>
              <Button variant="outlined" onClick={() => setEditing(!editing)}>
                {editing
                  ? "Close completion form"
                  : "Record documented completion"}
              </Button>
              {editing && (
                <CompletionForm
                  company={item.companyId}
                  path={path}
                  onSaved={() => {
                    data.reload();
                    setEditing(false);
                  }}
                />
              )}
            </>
          )}
      </Stack>
    </details>
  );
}

function CompletionForm({
  company,
  path,
  onSaved,
}: {
  company: string;
  path: string;
  onSaved: () => void;
}) {
  const command = usePrivateCommand();
  const [actualDate, setActualDate] = useState("");
  const [anchorId, setAnchorId] = useState("");
  const [reviewed, setReviewed] = useState(false);
  return (
    <Stack
      component="form"
      spacing={1.25}
      sx={{ alignItems: "start", width: "100%" }}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!reviewed || !anchorId || !actualDate) return;
        const saved = await command.run((csrf) =>
          requestContract("MilestoneCompletion", path, {
            method: "POST",
            csrf,
            body: { actualDate, anchorId, reviewed },
          }),
        );
        if (saved) onSaved();
      }}
    >
      <EvidencePicker
        company={company}
        onChoose={(location) => {
          setAnchorId(location.anchorId);
          setReviewed(false);
        }}
      />
      {anchorId && <AnchorEvidence id={anchorId} />}
      <TextField
        type="date"
        label="Actual completion date"
        size="small"
        required
        value={actualDate}
        onChange={(event) => {
          setActualDate(event.target.value);
          setReviewed(false);
        }}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <FormControlLabel
        label="The selected passage confirms completion and supports the date."
        control={
          <Checkbox
            checked={reviewed}
            onChange={(event) => setReviewed(event.target.checked)}
          />
        }
      />
      {command.error && <Alert severity="warning">{command.error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        disabled={command.busy || !reviewed || !anchorId || !actualDate}
      >
        Save completion evidence
      </Button>
    </Stack>
  );
}

export function DeliveryResult({ result }: { result: GuidanceDelivery }) {
  return (
    <div>
      <p>
        <strong>{states[result.state]}</strong> · As of {result.asOf}
      </p>
      <p>{reasons[result.reason]}</p>
      {result.actual && (
        <>
          <p>Reported {factAmount(result.actual)}</p>
          <FactLabels fact={result.actual} />
          <AnchorEvidence id={result.actual.anchorId} />
        </>
      )}
      {result.successor && (
        <>
          <p>
            {result.successor.title} · version {result.successor.revision} ·{" "}
            {result.successor.statementDate}
          </p>
          {result.successor.targetDate && (
            <p>Updated target date {result.successor.targetDate}</p>
          )}
          <AnchorEvidence id={result.successor.anchorId} />
        </>
      )}
      {result.milestone && (
        <>
          <p>
            Completed {result.milestone.actualDate} · Published{" "}
            <LocalTime value={result.milestone.publishedAt} />
          </p>
          <AnchorEvidence id={result.milestone.anchorId} />
        </>
      )}
    </div>
  );
}
