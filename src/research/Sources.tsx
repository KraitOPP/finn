import { type ChangeEvent, useState } from "react";
import type {
  CompanySource,
  CompanySourceDetail,
  CompanySourceInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { RouteHeading } from "../Navigation.tsx";

const path = "/api/v1/research/sources";
export const versionPath = (id: string, revision: number) =>
  `${path}/${id}/versions/${revision}`;

export function Research() {
  return (
    <section className="workspace-section">
      <RouteHeading>Research</RouteHeading>
      <PrimarySources />
    </section>
  );
}

function PrimarySources() {
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
}: {
  item: CompanySource;
  onSave: () => void;
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

export function SourceEvidence({ detail }: { detail: CompanySourceDetail }) {
  const source = detail.source;
  return (
    <div>
      <p>
        {source.sourceName} · {source.companyName} · Version {source.revision}
      </p>
      <p>
        Published{" "}
        {source.publishedAt ? (
          <LocalTime value={source.publishedAt} />
        ) : (
          "time unknown"
        )}{" "}
        · Saved <LocalTime value={source.ingestedAt} />
      </p>
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          Open original source
        </a>
      )}
      {detail.attachment && (
        <details>
          <summary>Read saved text</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {detail.attachment}
          </pre>
        </details>
      )}
      <details>
        <summary>Source checksum</summary>
        <code style={{ overflowWrap: "anywhere" }}>{source.checksum}</code>
      </details>
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
  const [fileLabel, setFileLabel] = useState(
    existing?.attachment ? "Existing text attachment" : "",
  );
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState("");
  async function loadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setValidation("");
    if (!/\.txt$/i.test(file.name) || file.size > 49152) {
      setValidation("Choose a UTF-8 .txt file of up to 48 KiB.");
      return;
    }
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(
        await file.arrayBuffer(),
      );
      setAttachment(text);
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
        if (!confirmed || (!url.trim() && !attachment)) {
          setValidation(
            "Add a source link or text attachment and confirm permission.",
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
        };
        const endpoint = existing
          ? `${path}/${existing.source.documentId}`
          : path;
        const body = existing
          ? { expectedRevision: existing.source.revision, source: input }
          : input;
        const saved = await command.run((csrf) =>
          requestContract("CompanySource", endpoint, {
            method: "POST",
            csrf,
            body,
          }),
        );
        if (saved) {
          if (!existing) {
            setTitle("");
            setSourceName("");
            setUrl("");
            setPublished("");
            setAttachment(null);
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
        Text attachment (optional, up to 48 KiB){" "}
        <input
          type="file"
          accept=".txt,text/plain"
          onChange={(event) => void loadFile(event)}
        />
      </label>
      {attachment && (
        <p>
          {fileLabel}{" "}
          <button
            type="button"
            onClick={() => {
              setAttachment(null);
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
        I reviewed this source and may retain the link or text in my private
        workspace.
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
