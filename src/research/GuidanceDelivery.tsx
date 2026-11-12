import { useState } from "react";
import type {
  GuidanceDelivery,
  ManagementGuidance,
} from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
import { AnchorEvidence } from "./Evidence.tsx";
import { FactLabels, factAmount } from "./FinancialFacts.tsx";
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
};

export function DeliveryComparison({ item }: { item: ManagementGuidance }) {
  const [open, setOpen] = useState(false);
  const [asOf, setAsOf] = useState("");
  const data = useResource(
    "GuidanceDelivery",
    open
      ? `/api/v1/research/guidance/${item.guidanceId}/versions/${item.revision}/delivery${asOf ? `?asOf=${asOf}` : ""}`
      : null,
  );
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>Compare with reported results</summary>
      <label>
        As of (India time, blank for today){" "}
        <input
          type="date"
          value={asOf}
          onChange={(event) => setAsOf(event.target.value)}
        />
      </label>
      {data.error && <p role="alert">{data.error}</p>}
      {open && !data.value && !data.error && (
        <p role="status">Checking published results…</p>
      )}
      {data.value && <DeliveryResult result={data.value} />}
    </details>
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
          <AnchorEvidence id={result.successor.anchorId} />
        </>
      )}
    </div>
  );
}
