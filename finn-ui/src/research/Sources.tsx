import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { type ChangeEvent, useId, useState } from "react";
import type {
  CompanySource,
  CompanySourceDetail,
  CompanySourceInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { RouteHeading } from "../Navigation.tsx";
import { CompanyWorkspace } from "./CompanyWorkspace.tsx";
import { EventReplay } from "./EventReplay.tsx";
import { CompanyEvents, EventReview } from "./Events.tsx";
import { EvidencePanel } from "./Evidence.tsx";
import { FilingCalendar } from "./FilingCalendar.tsx";
import { News } from "./News.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";
import { StagedPdfs } from "./StagedPdfs.tsx";
import { StockResearch } from "./StockResearch.tsx";

const path = "/api/v1/research/sources";
export function Research() {
  const [generation, setGeneration] = useState(0);
  const query = window.location.hash.split("?")[1] ?? "";
  const params = new URLSearchParams(query);
  const id = useId();
  const [selection, setSelection] = useState<{
    query: string;
    tab: string;
  } | null>(null);
  const tab =
    selection?.query === query
      ? selection.tab
      : params.has("thesis") || params.has("event") || params.has("review")
        ? "saved"
        : "gemini";
  return (
    <section className="workspace-section">
      <RouteHeading>Research</RouteHeading>
      <Paper variant="outlined" sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          aria-label="Research views"
          onChange={(_, next: string) => setSelection({ query, tab: next })}
        >
          <Tab
            value="gemini"
            label="Stock analysis"
            id={`${id}-gemini-tab`}
            aria-controls={`${id}-gemini`}
          />
          <Tab
            value="saved"
            label="Saved research"
            id={`${id}-saved-tab`}
            aria-controls={`${id}-saved`}
          />
        </Tabs>
      </Paper>
      <div
        role="tabpanel"
        id={`${id}-gemini`}
        aria-labelledby={`${id}-gemini-tab`}
        hidden={tab !== "gemini"}
      >
        {tab === "gemini" && <StockResearch key={query} params={params} />}
      </div>
      <div
        role="tabpanel"
        id={`${id}-saved`}
        aria-labelledby={`${id}-saved-tab`}
        hidden={tab !== "saved"}
      >
        {tab === "saved" && (
          <Stack spacing={2}>
            <CompanyWorkspace key={query} generation={generation} />
            <details className="workspace-tools">
              <summary>Sources and filings</summary>
              <PrimarySources
                onEvent={() => setGeneration((value) => value + 1)}
              />
              <CompanyEvents generation={generation} />
              <FilingCalendar generation={generation} />
            </details>
            <details className="workspace-tools">
              <summary>Saved news links</summary>
              <News />
            </details>
            <details className="workspace-tools">
              <summary>Practice with a fictional event</summary>
              <EventReplay />
            </details>
          </Stack>
        )}
      </div>
    </section>
  );
}

function PrimarySources({ onEvent }: { onEvent: () => void }) {
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const sources = useResource("CompanySourcePage", `${path}?offset=${offset}`);
  function saved() {
    setOffset(0);
    setNotice("Source saved.");
    sources.reload();
  }
  return (
    <section className="detail-card">
      <h2>Primary sources</h2>
      <StagedPdfs />
      <p>
        Add a company’s filing or announcement as a reviewed HTTPS link, a text
        attachment, or both.
      </p>
      {notice && <p role="status">{notice}</p>}
      {sources.error ? (
        <p role="alert">
          {sources.error}{" "}
          <button type="button" onClick={sources.reload}>
            Retry
          </button>
        </p>
      ) : !sources.value ? (
        <p role="status">Loading sources…</p>
      ) : sources.value.items.length === 0 ? (
        <p>No company sources on this page.</p>
      ) : (
        <ul className="security-list">
          {sources.value.items.map((item) => (
            <li key={item.documentId}>
              <div>
                <strong>{item.title}</strong>
                <p>
                  {item.companyName} · {item.sourceName} · Version{" "}
                  {item.revision}
                </p>
                <button
                  type="button"
                  aria-expanded={open === item.documentId}
                  onClick={() =>
                    setOpen(open === item.documentId ? null : item.documentId)
                  }
                >
                  Versions of {item.title}
                </button>
                {open === item.documentId && (
                  <SourceVersions
                    key={`${item.documentId}-${item.revision}`}
                    item={item}
                    onEvent={onEvent}
                    onSave={saved}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {(offset > 0 || sources.value?.hasMore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => {
              setOffset(offset - 40);
              setOpen(null);
            }}
          >
            Previous sources
          </button>
          <button
            type="button"
            disabled={!sources.value?.hasMore}
            onClick={() => {
              setOffset(offset + 40);
              setOpen(null);
            }}
          >
            Next sources
          </button>
        </div>
      )}
      <SourceForm onSave={saved} />
    </section>
  );
}

function SourceVersions({
  item,
  onSave,
  onEvent,
}: {
  item: CompanySource;
  onSave: () => void;
  onEvent: () => void;
}) {
  const versions = useResource(
    "CompanySourceVersions",
    `${path}/${item.documentId}/versions`,
  );
  const [revision, setRevision] = useState(item.revision);
  const [editing, setEditing] = useState(false);
  const detail = useResource(
    "CompanySourceDetail",
    versionPath(item.documentId, revision),
  );
  return (
    <div className="settings-card">
      {versions.error ? (
        <p role="alert">{versions.error}</p>
      ) : !versions.value ? (
        <p role="status">Loading source versions…</p>
      ) : (
        <label>
          Source version{" "}
          <select
            value={revision}
            onChange={(event) => {
              setRevision(Number(event.target.value));
              setEditing(false);
            }}
          >
            {versions.value.items.map((version) => (
              <option key={version.revision} value={version.revision}>
                Version {version.revision} · {version.title}
              </option>
            ))}
          </select>
        </label>
      )}
      {detail.error ? (
        <p role="alert">{detail.error}</p>
      ) : !detail.value ? (
        <p role="status">Loading source…</p>
      ) : (
        <>
          <SourceEvidence detail={detail.value} />
          <EvidencePanel key={revision} source={detail.value.source} />
          <EventReview
            key={revision}
            source={detail.value.source}
            onSaved={onEvent}
          />
          {revision === item.revision && (
            <button type="button" onClick={() => setEditing(!editing)}>
              {editing ? "Close edit" : "Create a new source version"}
            </button>
          )}
          {editing && <SourceForm existing={detail.value} onSave={onSave} />}
        </>
      )}
    </div>
  );
}

function SourceForm({
  existing,
  onSave,
}: {
  existing?: CompanySourceDetail;
  onSave: () => void;
}) {
  const command = usePrivateCommand();
  const companies = useResource(
    "CatalogueCompanies",
    existing ? null : "/api/v1/catalog/companies",
  );
  const [companyId, setCompany] = useState(existing?.source.companyId ?? "");
  const [title, setTitle] = useState(existing?.source.title ?? "");
  const [sourceName, setSourceName] = useState(
    existing?.source.sourceName ?? "",
  );
  const [url, setUrl] = useState(existing?.source.url ?? "");
  const [published, setPublished] = useState(
    existing?.source.publishedAt ?? "",
  );
  const [attachment, setAttachment] = useState<string | null>(
    existing?.attachment ?? null,
  );
  const [pdf, setPdf] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const [fileLabel, setFileLabel] = useState(
    existing?.attachment
      ? "Existing text attachment"
      : existing?.source.hasPdf
        ? "Existing PDF"
        : "",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState("");
  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setValidation("");
    if (/\.pdf$/i.test(file.name)) {
      if (file.size > 3 * 1024 * 1024) {
        setValidation("Choose a PDF of up to 3 MiB.");
        return;
      }
      setAttachment(null);
      setPdf(file);
      setRemovePdf(false);
      setFileLabel(file.name);
      return;
    }
    if (!/\.txt$/i.test(file.name) || file.size > 49152) {
      setValidation("Choose a UTF-8 .txt file of up to 48 KiB.");
      return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      setAttachment(text);
      setPdf(null);
      setRemovePdf(false);
      setFileLabel(file.name);
    } catch {
      setValidation("This file could not be read as UTF-8 text.");
    }
  }
  return (
    <form
      className="settings-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setValidation("");
        let publishedAt: string | null = null;
        if (published) {
          const date = new Date(published);
          if (
            !/(Z|[+-][0-9]{2}:[0-9]{2})$/i.test(published) ||
            !Number.isFinite(date.getTime())
          ) {
            setValidation(
              "Enter the publication date and time with Z or a UTC offset.",
            );
            return;
          }
          publishedAt = date.toISOString();
        }
        if (
          !confirmed ||
          (!url.trim() &&
            !attachment &&
            !pdf &&
            !(existing?.source.hasPdf && !removePdf))
        ) {
          setValidation(
            "Add a source link or attachment and confirm permission.",
          );
          return;
        }
        const input: CompanySourceInput = {
          companyId,
          title,
          sourceName,
          url: url.trim() || null,
          attachment,
          publishedAt,
          rightsConfirmed: true,
          removePdf,
        };
        const endpoint = existing
          ? `${path}/${existing.source.documentId}`
          : path;
        const saved = await command.run(async (csrf) => {
          if (pdf) {
            const uploaded = await requestContract(
              "ResearchPdfUpload",
              "/api/v1/research/pdf",
              {
                method: "POST",
                csrf,
                raw: { data: pdf, contentType: "application/pdf" },
              },
            );
            input.pdfFileId = uploaded.fileId;
          }
          const body = existing
            ? { expectedRevision: existing.source.revision, source: input }
            : input;
          return requestContract("CompanySource", endpoint, {
            method: "POST",
            csrf,
            body,
          });
        });
        if (saved) {
          if (!existing) {
            setTitle("");
            setSourceName("");
            setUrl("");
            setPublished("");
            setAttachment(null);
            setPdf(null);
            setFileLabel("");
            setConfirmed(false);
          }
          onSave();
        }
      }}
    >
      <h3>{existing ? "Save a source revision" : "Add a primary source"}</h3>
      {existing ? (
        <p>{existing.source.companyName}</p>
      ) : (
        <>
          <label>
            Company{" "}
            <select
              required
              value={companyId}
              onChange={(event) => setCompany(event.target.value)}
            >
              <option value="">Choose a saved company</option>
              {companies.value?.map((company) => (
                <option key={company.companyId} value={company.companyId}>
                  {company.name}
                </option>
              ))}
            </select>
          </label>
          {companies.error && <p role="alert">{companies.error}</p>}
          {companies.value?.length === 0 && (
            <p>
              Add the company in <a href="#/instruments">Securities</a> first.
            </p>
          )}
        </>
      )}
      <label>
        Document title{" "}
        <input
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
        />
      </label>
      <label>
        Publisher or company source{" "}
        <input
          required
          value={sourceName}
          onChange={(event) => setSourceName(event.target.value)}
          maxLength={120}
        />
      </label>
      <label>
        Original HTTPS link{" "}
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          maxLength={1000}
        />
      </label>
      <label>
        Publication time (optional, include time zone offset)
        <input
          value={published}
          onChange={(event) => setPublished(event.target.value)}
          maxLength={32}
          placeholder="2026-01-01T15:30:00+05:30"
        />
      </label>
      <label>
        Attachment (PDF up to 3 MiB or UTF-8 text up to 48 KiB){" "}
        <input
          type="file"
          accept=".pdf,application/pdf,.txt,text/plain"
          onChange={(event) => void loadFile(event)}
        />
      </label>
      {fileLabel && (
        <p>
          {fileLabel}{" "}
          <button
            type="button"
            onClick={() => {
              setAttachment(null);
              setPdf(null);
              setRemovePdf(true);
              setFileLabel("");
            }}
          >
            Remove attachment
          </button>
        </p>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          required
        />
        I reviewed this source and may retain the link or attachment in my
        private workspace.
      </label>
      {(validation || command.error) && (
        <p role="alert">{validation || command.error}</p>
      )}
      <button type="submit" className="primary-button" disabled={command.busy}>
        Save source
      </button>
    </form>
  );
}
