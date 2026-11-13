import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type {
  CompanyResearchNote,
  CompanyResearchNoteInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { EventHistory } from "./Events.tsx";
import { AnchorEvidence, EvidencePanel } from "./Evidence.tsx";
import { EarningsPanel } from "./EarningsPanel.tsx";
import { CompanyFacts, EvidencePicker } from "./FinancialFacts.tsx";
import { GuidancePanel } from "./Guidance.tsx";
import { ResearchReports } from "./ResearchReports.tsx";
import { SearchEvidence } from "./SearchEvidence.tsx";
import { ThesisNotebook } from "./ThesisNotebook.tsx";

const labels = {
  BUSINESS: "Business highlights",
  GOVERNANCE: "Governance highlights",
  QUESTION: "Research questions",
  EXPOSURE: "Disclosed business exposures",
} as const;

type ResearchTarget = {
  thesis?: string;
  review?: string;
  event?: string;
  eventVersion?: string;
  view?: string;
};

export function CompanyWorkspace({ generation }: { generation: number }) {
  const companies = useResource(
    "CatalogueCompanies",
    "/api/v1/catalog/companies",
  );
  const [selected, setCompany] = useState<string | null>(null);
  const params = new URLSearchParams(window.location.hash.split("?")[1]);
  function id(key: string) {
    const value = params.get(key);
    return value && /^[0-9a-f-]{36}$/i.test(value) ? value : undefined;
  }
  const security = id("security");
  const linkedCompany = id("company");
  const target: ResearchTarget =
    selected === null
      ? {
          thesis: id("thesis"),
          review: id("review"),
          event: id("event"),
          eventVersion: id("eventVersion"),
          view: params.get("view") ?? undefined,
        }
      : {};
  const holding = useResource(
    "CatalogueSecurityDetail",
    selected === null && security && !linkedCompany
      ? `/api/v1/catalog/securities/${security}`
      : null,
  );
  const company =
    selected ?? linkedCompany ?? holding.value?.security.companyId ?? "";
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
      {!company && (
        <p>
          Choose a saved company or <a href="#/instruments">find a stock</a> by
          name.
        </p>
      )}
      {company && (
        <Overview
          key={company}
          company={company}
          generation={generation}
          target={target}
        />
      )}
    </section>
  );
}

function Overview({
  company,
  generation,
  target,
}: {
  company: string;
  generation: number;
  target: ResearchTarget;
}) {
  const path = `/api/v1/research/companies/${company}`;
  const data = useResource(
    "CompanyResearchOverview",
    `${path}/overview?view=${generation}`,
  );
  const id = useId();
  const [view, setView] = useState(
    target.thesis || target.review || target.view === "thesis"
      ? "thesis"
      : target.event
        ? "events"
        : target.view === "earnings"
          ? "earnings"
          : target.view === "questions"
            ? "sources"
            : "brief",
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
  const tabs = [
    ["brief", "Company brief"],
    ["events", "Events"],
    ["earnings", "Earnings"],
    ["thesis", "Thesis"],
    ["guidance", "Management"],
    ["sources", "Sources & facts"],
  ] as const;
  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <Typography component="h3" variant="h5">
        {companyName}
      </Typography>
      <Paper variant="outlined">
        <Tabs
          value={view}
          aria-label="Company research sections"
          variant="scrollable"
          allowScrollButtonsMobile
          onChange={(_, next: string) => setView(next)}
        >
          {tabs.map(([key, label]) => (
            <Tab
              key={key}
              value={key}
              label={label}
              id={`${id}-${key}-tab`}
              aria-controls={`${id}-${key}`}
            />
          ))}
        </Tabs>
      </Paper>
      {tabs.map(([key]) => (
        <Box
          key={key}
          role="tabpanel"
          id={`${id}-${key}`}
          aria-labelledby={`${id}-${key}-tab`}
          hidden={key !== view}
        >
          {key === view && (
            <>
              {key === "brief" && <ResearchReports company={company} />}
              {key === "earnings" && <EarningsPanel company={company} />}
              {key === "guidance" && <GuidancePanel company={company} />}
              {key === "thesis" && (
                <ThesisNotebook
                  company={company}
                  initialThesis={target.thesis}
                  event={target.eventVersion}
                  review={target.review}
                />
              )}
              {key === "events" && (
                <Stack spacing={1.25}>
                  {target.event && <EventHistory id={target.event} />}
                  {!target.event && events.length === 0 && (
                    <p>No reviewed company events.</p>
                  )}
                  {events
                    .filter((event) => event.eventId !== target.event)
                    .map((event) => (
                      <details className="workspace-tools" key={event.eventId}>
                        <summary>{event.title}</summary>
                        <EventHistory id={event.eventId} />
                      </details>
                    ))}
                </Stack>
              )}
              {key === "sources" && (
                <>
                  <p className="muted-copy">
                    {indexedSources} of {primarySources} current primary sources
                    have extracted evidence.
                  </p>
                  <button type="button" onClick={data.reload}>
                    Refresh research coverage
                  </button>
                  <details className="workspace-tools">
                    <summary>Review financial statements and cash flow</summary>
                    <CompanyFacts company={company} />
                  </details>
                  <ResearchNotes
                    company={company}
                    path={path}
                    notes={notes}
                    reload={data.reload}
                  />
                  <SearchEvidence company={company} />
                  {sources.map((source) => (
                    <details
                      className="workspace-tools"
                      key={source.documentId}
                    >
                      <summary>
                        {source.title} · revision {source.revision}
                      </summary>
                      <EvidencePanel source={source} />
                    </details>
                  ))}
                </>
              )}
            </>
          )}
        </Box>
      ))}
    </Stack>
  );
}

function ResearchNotes({
  company,
  path,
  notes,
  reload,
}: {
  company: string;
  path: string;
  notes: CompanyResearchNote[];
  reload: () => void;
}) {
  return (
    <>
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
                onChange={reload}
              />
            ))}
          {notes.every((note) => note.kind !== kind) && <p>No entries yet.</p>}
        </details>
      ))}
      <AddNote company={company} path={path} onSaved={reload} />
    </>
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
            <option value="EXPOSURE">Disclosed business exposure</option>
          </select>
        </label>
        <label>
          {kind === "EXPOSURE" ? "Shared exposure label" : "Note"}{" "}
          <input
            required
            maxLength={kind === "EXPOSURE" ? 100 : 240}
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
