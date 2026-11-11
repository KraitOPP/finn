import { useEffect, useRef, useState } from "react";
import type {
  CompanySource,
  ResearchLocation,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { versionPath } from "./SourceEvidence.tsx";

const states = {
  LINK_ONLY:
    "This source is available as a link. Attach a file in a new version to extract evidence.",
  NOT_STARTED: "Evidence has not been extracted from this version yet.",
  QUEUED: "Extraction queued.",
  RUNNING: "Extracting evidence.",
  READY: "Evidence is available for the extracted pages.",
  PARTIAL:
    "Some pages or lines could not be indexed. Review the original for complete context.",
  NO_TEXT:
    "No readable text was found. A scanned file may need an OCR text layer.",
  UNSUPPORTED: "This PDF could not be extracted with the configured reader.",
  FAILED: "Extraction failed. Check the original and try again.",
  CANCELLED: "Extraction cancelled.",
};
const reasons: Record<string, string> = {
  PDF_EXTRACTOR_UNCONFIGURED:
    "Configure the local PDF extractor to process this attachment.",
  ENCRYPTED_PDF: "Use an authorized, unencrypted copy.",
  MALFORMED_PDF: "The reader could not parse the PDF structure.",
  PDF_PAGE_LIMIT: "The document exceeds the reader’s page limit.",
  UNREADABLE_PAGES: "The reader encountered pages with unreadable content.",
};
const pageStates = {
  TEXT: "Text available",
  TRUNCATED: "Partial text",
  NO_TEXT: "No text layer",
  UNREADABLE: "Unreadable",
};

export function EvidencePanel({ source }: { source: CompanySource }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="settings-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Extracted evidence</summary>
      {open && <EvidenceContent source={source} />}
    </details>
  );
}

function EvidenceContent({ source }: { source: CompanySource }) {
  const root = versionPath(source.documentId, source.revision);
  const status = useResource("ResearchExtraction", `${root}/extraction`);
  const command = usePrivateCommand();
  const attempts = useRef(0);
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const pending =
    status.value?.state === "QUEUED" || status.value?.state === "RUNNING";
  const reload = status.reload;
  useEffect(() => {
    if (!pending || attempts.current >= 36) return;
    const timer = setTimeout(() => {
      attempts.current += 1;
      reload();
    }, 1500);
    return () => clearTimeout(timer);
  }, [pending, reload]);
  const indexed =
    status.value?.state === "READY" || status.value?.state === "PARTIAL";
  const anchors = useResource(
    "ResearchLocations",
    indexed ? `${root}/anchors?offset=${offset}` : null,
  );
  return (
    <div>
      {status.error ? (
        <p role="alert">{status.error}</p>
      ) : !status.value ? (
        <p role="status">Loading extraction state…</p>
      ) : (
        <>
          <p role="status">{states[status.value.state]}</p>
          {status.value.reason && reasons[status.value.reason] && (
            <p>{reasons[status.value.reason]}</p>
          )}
          {status.value.totalPages > 0 && (
            <p>
              {status.value.pages.length} of {status.value.totalPages} pages
              inspected.
            </p>
          )}
          {status.value.pages.some((page) => page.state !== "TEXT") && (
            <ul>
              {status.value.pages
                .filter((page) => page.state !== "TEXT")
                .map((page) => (
                  <li key={page.page}>
                    Page {page.page} · {pageStates[page.state]}
                  </li>
                ))}
            </ul>
          )}
          {status.value.canRequest && (
            <button
              type="button"
              disabled={command.busy}
              onClick={async () => {
                const result = await command.run((csrf) =>
                  requestContract("ResearchExtraction", `${root}/extraction`, {
                    method: "POST",
                    csrf,
                  }),
                );
                if (result) {
                  attempts.current = 0;
                  reload();
                }
              }}
            >
              {status.value.jobId ? "Retry extraction" : "Extract evidence"}
            </button>
          )}
          {status.value.jobId && (
            <button
              type="button"
              onClick={() => {
                attempts.current = 0;
                reload();
              }}
            >
              Refresh extraction status
            </button>
          )}
        </>
      )}
      {command.error && <p role="alert">{command.error}</p>}
      {anchors.error && <p role="alert">{anchors.error}</p>}
      {anchors.value && (
        <>
          <ul className="security-list">
            {anchors.value.items.map((location) => (
              <li key={location.anchorId}>
                <div>
                  <strong>
                    {location.kind === "TABLE_ROW" ? "Table row" : "Passage"} ·
                    Page {location.page} · Lines {location.lineStart}–
                    {location.lineEnd}
                  </strong>
                  <pre
                    style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                  >
                    {location.quote}
                  </pre>
                  <button
                    type="button"
                    aria-expanded={open === location.anchorId}
                    onClick={() =>
                      setOpen(
                        open === location.anchorId ? null : location.anchorId,
                      )
                    }
                  >
                    Open source location
                  </button>
                  {open === location.anchorId && (
                    <SourceLocation location={location} />
                  )}
                </div>
              </li>
            ))}
          </ul>
          {(offset > 0 || anchors.value.hasMore) && (
            <div className="pagination">
              <button
                type="button"
                disabled={offset === 0}
                onClick={() => {
                  setOffset(offset - 40);
                  setOpen(null);
                }}
              >
                Previous passages
              </button>
              <button
                type="button"
                disabled={!anchors.value.hasMore}
                onClick={() => {
                  setOffset(offset + 40);
                  setOpen(null);
                }}
              >
                Next passages
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function AnchorEvidence({ id }: { id: string }) {
  const data = useResource(
    "ResearchLocation",
    `/api/v1/research/evidence/${id}`,
  );
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading cited evidence…</p>;
  return <SourceLocation location={data.value} />;
}

export function SourceLocation({ location }: { location: ResearchLocation }) {
  const root = versionPath(location.documentId, location.documentRevision);
  const data = useResource(
    "ResearchTextPage",
    `${root}/pages/${location.page}`,
  );
  const source = useResource("CompanySourceDetail", root);
  const lines = data.value?.content.split("\n");
  return (
    <div className="settings-card">
      <p>
        {location.sourceTitle} · Version {location.documentRevision} · Page{" "}
        {location.page} · Lines {location.lineStart}–{location.lineEnd}
      </p>
      <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
        {location.quote}
      </pre>
      {source.value?.source.hasPdf && (
        <a href={`${root}/pdf`}>Download original PDF</a>
      )}
      {source.value?.source.url && (
        <>
          {" "}
          <a
            href={source.value.source.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open original source
          </a>
        </>
      )}
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : (
        lines && (
          <details>
            <summary>Show extracted page with cited lines</summary>
            <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
              {lines.map((line, index) => {
                const number = index + 1;
                const text = `${number}  ${line}\n`;
                return number >= location.lineStart &&
                  number <= location.lineEnd ? (
                  <mark key={number}>{text}</mark>
                ) : (
                  <span key={number}>{text}</span>
                );
              })}
            </pre>
          </details>
        )
      )}
    </div>
  );
}
