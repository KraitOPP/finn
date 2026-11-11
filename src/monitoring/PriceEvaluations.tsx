import type { AlertCloseEvidence } from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";

const statusText = {
  PAUSED: "Paused",
  EXPIRED: "Expired",
  WAITING_FOR_PRICE: "Waiting for a saved close",
  STALE: "The latest close is older than this rule allows",
  EVALUATED: "Latest close evaluated",
  INSUFFICIENT_HISTORY: "More comparable closes are needed",
};
const outcomes = {
  TRIGGERED: "Alert triggered",
  BELOW_OR_ABOVE_RESET: "The condition reset",
  NO_MATCH: "Condition not met",
  INSUFFICIENT_HISTORY: "Insufficient history",
  COOLDOWN: "Within cooldown",
  ALREADY_LATCHED: "Waiting for the condition to reset",
};

export function PriceEvaluations({ id }: { id: string }) {
  const data = useResource(
    "PriceEvaluationReport",
    `/api/v1/monitoring/rules/${id}/evaluations`,
  );
  return (
    <section className="settings-card">
      <h3>Evaluation history</h3>
      <button type="button" onClick={data.reload}>
        Refresh evaluations
      </button>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading evaluations…</p>
      ) : (
        <>
          <p>{statusText[data.value.status]}.</p>
          {data.value.items.length === 0 ? (
            <p>No sessions evaluated yet.</p>
          ) : (
            <ul className="security-list">
              {data.value.items.map((item) => (
                <li key={item.evaluationId}>
                  <div>
                    <strong>
                      {item.sessionDate} · {outcomes[item.outcome]}
                    </strong>
                    <p>
                      Rule version {item.revision} · {item.evaluatedAt}
                    </p>
                    <CloseEvidence value={item.observation} />
                    {item.previous && (
                      <p>
                        Comparison close: ₹{item.previous.close} on{" "}
                        {item.previous.sessionDate}.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

export function CloseEvidence({ value }: { value: AlertCloseEvidence | null }) {
  return value ? (
    <p>
      ₹{value.close} on {value.sessionDate} ·{" "}
      {value.source === "YAHOO_YFINANCE"
        ? "Yahoo provider basis"
        : "Reviewed exchange close"}{" "}
      · {value.sourceReference}
    </p>
  ) : (
    <p>The underlying close is outside the retained data.</p>
  );
}
