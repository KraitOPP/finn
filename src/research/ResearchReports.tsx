import { useEffect, useState } from "react";
import type { ResearchReport } from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence, SourceLocation } from "./Evidence.tsx";
import {
  EvidencePicker,
  FactLabels,
  factAmount,
  metricLabels,
} from "./FinancialFacts.tsx";

const root = "/api/v1/research";
const states: Record<ResearchReport["state"], string> = {
  PENDING: "Waiting for the local model to rank passages.",
  EVIDENCE: "Matching passages from primary documents at generation time.",
  INSUFFICIENT:
    "No matching primary evidence was found. Try a more specific term or add an indexed source.",
  CONFLICTING_CONTEXT:
    "Matching reviewed facts use different reporting contexts. Compare their labels and sources before drawing a conclusion.",
  LOCAL_RANKED: "Passages ranked by the local model.",
  MODEL_FALLBACK: "Local ranking was unavailable. Showing matching passages.",
};

export function ResearchReports({ company }: { company: string }) {
  const [question, setQuestion] = useState("");
  const [rankLocally, setRankLocally] = useState(false);
  const [id, setId] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const command = usePrivateCommand();
  const capabilities = useResource(
    "ResearchReportCapabilities",
    `${root}/report-capabilities`,
  );
  const localAvailable = capabilities.value?.localRanking === true;
  const history = useResource(
    "ResearchReportHistory",
    historyOpen
      ? `${root}/companies/${company}/reports?offset=${offset}`
      : null,
  );
  function saved(report: ResearchReport) {
    setId(report.reportId);
    setRankLocally(false);
    setOffset(0);
    history.reload();
  }
  return (
    <details>
      <summary>Ask a question or review company evidence</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const report = await command.run((csrf) =>
            requestContract(
              "ResearchReport",
              `${root}/companies/${company}/reports`,
              {
                method: "POST",
                csrf,
                body: { question, rankLocally: localAvailable && rankLocally },
              },
            ),
          );
          if (report) saved(report);
        }}
      >
        <label>
          Research question or topic
          <input
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            required
            maxLength={320}
          />
        </label>
        <button
          type="button"
          onClick={() =>
            setQuestion(
              "Revenue profit cash debt governance business operations",
            )
          }
        >
          Use company overview topics
        </button>
        {localAvailable ? (
          <label>
            <input
              type="checkbox"
              checked={rankLocally}
              onChange={(event) => setRankLocally(event.target.checked)}
            />
            Let the configured local model rank matching excerpts for this
            request
          </label>
        ) : (
          <p>Evidence search is available. Local model ranking is off.</p>
        )}
        <button type="submit" disabled={command.busy || !question.trim()}>
          Find and save evidence
        </button>
        {command.error && <p role="alert">{command.error}</p>}
      </form>
      <details onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
        <summary>Saved report history</summary>
        {history.error && <p role="alert">{history.error}</p>}
        {historyOpen && !history.value && !history.error && (
          <p role="status">Loading saved reports…</p>
        )}
        {history.value?.items.length === 0 && (
          <p>No saved reports on this page.</p>
        )}
        {history.value?.items.map((item) => (
          <div key={item.reportId}>
            <button
              type="button"
              aria-pressed={id === item.reportId}
              onClick={() => setId(item.reportId)}
            >
              {item.question} · version {item.version}
            </button>{" "}
            <LocalTime value={item.asOf} />
          </div>
        ))}
        {offset > 0 && (
          <button type="button" onClick={() => setOffset(offset - 20)}>
            Previous reports
          </button>
        )}
        {history.value?.hasMore && (
          <button type="button" onClick={() => setOffset(offset + 20)}>
            Next reports
          </button>
        )}
      </details>
      {id && (
        <ReportView key={id} id={id} onNavigate={setId} onRefresh={saved} />
      )}
    </details>
  );
}

function ReportView({
  id,
  onNavigate,
  onRefresh,
}: {
  id: string;
  onNavigate: (id: string) => void;
  onRefresh: (report: ResearchReport) => void;
}) {
  const data = useResource("ResearchReport", `${root}/reports/${id}`);
  const command = usePrivateCommand();
  const waiting = data.value?.state === "PENDING";
  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(data.reload, 2500);
    return () => clearInterval(timer);
  }, [waiting, data.reload]);
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading research report…</p>;
  const report = data.value;
  return (
    <article>
      <h4>{report.question}</h4>
      <p>
        Version {report.version} · Evidence as of{" "}
        <LocalTime value={report.asOf} />
      </p>
      {report.previousReportId && (
        <button
          type="button"
          onClick={() => {
            if (report.previousReportId) onNavigate(report.previousReportId);
          }}
        >
          Open previous version
        </button>
      )}
      {report.current && !waiting && (
        <button
          type="button"
          disabled={command.busy}
          onClick={async () => {
            const next = await command.run((csrf) =>
              requestContract(
                "ResearchReport",
                `${root}/reports/${id}/refresh`,
                {
                  method: "POST",
                  csrf,
                },
              ),
            );
            if (next) onRefresh(next);
          }}
        >
          Save a new version using current sources
        </button>
      )}
      {command.error && <p role="alert">{command.error}</p>}
      <p role="status">{states[report.state]}</p>
      {report.state === "LOCAL_RANKED" && <p>Model {report.modelName}</p>}
      {report.citations.map((item) => (
        <SourceLocation key={item.anchorId} location={item} />
      ))}
      {report.facts.length > 0 && (
        <details>
          <summary>Linked reviewed figures</summary>
          <ul className="security-list">
            {report.facts.map((fact) => (
              <li key={fact.factId}>
                <div>
                  <strong>
                    {metricLabels[fact.dimensions.metric]} · {factAmount(fact)}
                  </strong>
                  <FactLabels fact={fact} />
                  <AnchorEvidence id={fact.anchorId} />
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
      {report.feedback ? (
        <div>
          <p>Review note · {report.feedback.note}</p>
          {report.feedback.anchorId && (
            <AnchorEvidence id={report.feedback.anchorId} />
          )}
        </div>
      ) : (
        !waiting && <ReportFeedback report={report} onSaved={data.reload} />
      )}
    </article>
  );
}

function ReportFeedback({
  report,
  onSaved,
}: {
  report: ResearchReport;
  onSaved: () => void;
}) {
  const [note, setNote] = useState("");
  const [anchor, setAnchor] = useState<string | null>(null);
  const command = usePrivateCommand();
  return (
    <details>
      <summary>Record a correction or missing context</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const saved = await command.run((csrf) =>
            requestContract(
              "ResearchReportFeedback",
              `${root}/reports/${report.reportId}/feedback`,
              {
                method: "POST",
                csrf,
                body: { note, anchorId: anchor },
              },
            ),
          );
          if (saved) onSaved();
        }}
      >
        <label>
          Review note{" "}
          <input
            required
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </label>
        <EvidencePicker
          company={report.companyId}
          onChoose={(location) => setAnchor(location.anchorId)}
        />
        {anchor && (
          <p>
            Evidence selected.{" "}
            <button type="button" onClick={() => setAnchor(null)}>
              Clear
            </button>
          </p>
        )}
        <button type="submit" disabled={command.busy || !note.trim()}>
          Save review
        </button>
        {command.error && <p role="alert">{command.error}</p>}
      </form>
    </details>
  );
}
