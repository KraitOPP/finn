import { useState } from "react";
import type {
  CompanyResearchNote,
  CompanyResearchNoteInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { EventHistory } from "./Events.tsx";
import { AnchorEvidence, EvidencePanel } from "./Evidence.tsx";
import { CompanyFacts, EvidencePicker } from "./FinancialFacts.tsx";
import { GuidancePanel } from "./Guidance.tsx";
import { ResearchReports } from "./ResearchReports.tsx";
import { SearchEvidence } from "./SearchEvidence.tsx";
import { ThesisNotebook } from "./ThesisNotebook.tsx";

const labels = {
  BUSINESS: "Business highlights",
  GOVERNANCE: "Governance highlights",
  QUESTION: "Research questions",
} as const;

export function CompanyWorkspace({ generation }: { generation: number }) {
  const companies = useResource(
    "CatalogueCompanies",
    "/api/v1/catalog/companies",
  );
  const [selected, setCompany] = useState<string | null>(null);
  const security = new URLSearchParams(window.location.hash.split("?")[1]).get(
    "security",
  );
  const holding = useResource(
    "CatalogueSecurityDetail",
    selected === null && security && /^[a-f0-9-]{36}$/i.test(security)
      ? `/api/v1/catalog/securities/${security}`
      : null,
  );
  const company = selected ?? holding.value?.security.companyId ?? "";
  return (
    <section className="detail-card">
      <h2>Company workspace</h2>
      <label>
        Company for research{" "}
        <select
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        >
          <option value="">Choose a company</option>
          {companies.value?.map((item) => (
            <option key={item.companyId} value={item.companyId}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {companies.error && <p role="alert">{companies.error}</p>}
      {holding.error && <p role="alert">{holding.error}</p>}
      {company && (
        <Overview key={company} company={company} generation={generation} />
      )}
    </section>
  );
}

function Overview({
  company,
  generation,
}: {
  company: string;
  generation: number;
}) {
  const path = `/api/v1/research/companies/${company}`;
  const data = useResource(
    "CompanyResearchOverview",
    `${path}/overview?view=${generation}`,
  );
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading company research…</p>;
  const {
    companyName,
    primarySources,
    indexedSources,
    sources,
    events,
    notes,
  } = data.value;
  return (
    <div>
      <h3>{companyName}</h3>
      <ThesisNotebook company={company} />
      <GuidancePanel company={company} />
      <p>
        {indexedSources} of {primarySources} current primary sources have
        extracted evidence.
      </p>
      <button type="button" onClick={data.reload}>
        Refresh research coverage
      </button>
      <details>
        <summary>Financial statements and cash flow</summary>
        <CompanyFacts company={company} />
      </details>
      {Object.entries(labels).map(([kind, label]) => (
        <details key={kind}>
          <summary>
            {label} (
            {
              notes.filter((note) => note.kind === kind && !note.resolved)
                .length
            }
            )
          </summary>
          {notes
            .filter((note) => note.kind === kind)
            .map((note) => (
              <ResearchNote
                key={note.noteId}
                note={note}
                path={path}
                onChange={data.reload}
              />
            ))}
          {notes.every((note) => note.kind !== kind) && <p>No entries yet.</p>}
        </details>
      ))}
      <AddNote company={company} path={path} onSaved={data.reload} />
      <SearchEvidence company={company} />
      <ResearchReports company={company} />
      <details>
        <summary>Recent primary documents</summary>
        {sources.length === 0 && <p>No primary documents registered.</p>}
        {sources.map((source) => (
          <details key={source.documentId}>
            <summary>
              {source.title} · revision {source.revision}
            </summary>
            <EvidencePanel source={source} />
          </details>
        ))}
      </details>
      <details>
        <summary>Recent company events</summary>
        {events.length === 0 && <p>No reviewed company events.</p>}
        {events.map((event) => (
          <details key={event.eventId}>
            <summary>{event.title}</summary>
            <EventHistory id={event.eventId} />
          </details>
        ))}
      </details>
    </div>
  );
}

function ResearchNote({
  note,
  path,
  onChange,
}: {
  note: CompanyResearchNote;
  path: string;
  onChange: () => void;
}) {
  const command = usePrivateCommand();
  return (
    <div>
      <p>{note.title}</p>
      {note.anchorId && <AnchorEvidence id={note.anchorId} />}
      {note.kind === "QUESTION" && (
        <button
          type="button"
          disabled={command.busy}
          onClick={async () => {
            const saved = await command.run((csrf) =>
              requestContract(
                "CompanyResearchNote",
                `${path}/notes/${note.noteId}`,
                {
                  method: "POST",
                  csrf,
                  body: { resolved: !note.resolved },
                },
              ),
            );
            if (saved) onChange();
          }}
        >
          {note.resolved ? "Reopen question" : "Mark answered"}
        </button>
      )}
      {command.error && <p role="alert">{command.error}</p>}
    </div>
  );
}

function AddNote({
  company,
  path,
  onSaved,
}: {
  company: string;
  path: string;
  onSaved: () => void;
}) {
  const command = usePrivateCommand();
  const [kind, setKind] =
    useState<CompanyResearchNoteInput["kind"]>("QUESTION");
  const [title, setTitle] = useState("");
  const [anchor, setAnchor] =
    useState<CompanyResearchNoteInput["anchorId"]>(null);
  return (
    <details>
      <summary>Add a highlight or question</summary>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const saved = await command.run((csrf) =>
            requestContract("CompanyResearchNote", `${path}/notes`, {
              method: "POST",
              csrf,
              body: { kind, title, anchorId: anchor },
            }),
          );
          if (saved) {
            setTitle("");
            setAnchor(null);
            onSaved();
          }
        }}
      >
        <label>
          Entry type{" "}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as typeof kind)}
          >
            <option value="QUESTION">Open question</option>
            <option value="BUSINESS">Business highlight</option>
            <option value="GOVERNANCE">Governance highlight</option>
          </select>
        </label>
        <label>
          Note{" "}
          <input
            required
            maxLength={240}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <EvidencePicker
          company={company}
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
        <button
          type="submit"
          disabled={
            command.busy || !title.trim() || (kind !== "QUESTION" && !anchor)
          }
        >
          Save entry
        </button>
        {command.error && <p role="alert">{command.error}</p>}
      </form>
    </details>
  );
}
