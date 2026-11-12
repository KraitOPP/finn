import { useState } from "react";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { SourceLocation } from "./Evidence.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";

export function SearchEvidence({ company }: { company: string }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState("ALL");
  const [from, setFrom] = useState("");
  const [through, setThrough] = useState("");
  const [earlier, setEarlier] = useState(false);
  const [filters, setFilters] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState("");
  const data = useResource(
    "ResearchSearchResult",
    filters
      ? `/api/v1/research/companies/${company}/search?${filters}&offset=${offset}`
      : null,
  );
  return (
    <details>
      <summary>Search sources and passages</summary>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const search = new URLSearchParams({
            query: query.trim(),
            kind,
            earlier: String(earlier),
          });
          if (from) search.set("from", from);
          if (through) search.set("through", through);
          setSelected("");
          setOffset(0);
          const next = search.toString();
          if (next === filters) data.reload();
          setFilters(next);
        }}
      >
        <label>
          Keywords{" "}
          <input
            maxLength={160}
            required
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          Source type{" "}
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
          >
            <option value="ALL">All registered sources</option>
            <option value="PRIMARY">Primary documents</option>
            <option value="NEWS">News references</option>
          </select>
        </label>
        <label>
          Published from (UTC){" "}
          <input
            type="date"
            value={from}
            max={through || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label>
          Published through (UTC){" "}
          <input
            type="date"
            value={through}
            min={from || undefined}
            onChange={(event) => setThrough(event.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={earlier}
            onChange={(event) => setEarlier(event.target.checked)}
          />{" "}
          Include earlier source versions
        </label>
        <button type="submit" disabled={!query.trim()}>
          Search company evidence
        </button>
      </form>
      {data.error && <p role="alert">{data.error}</p>}
      {filters && !data.value && !data.error && (
        <p role="status">Searching company evidence…</p>
      )}
      {data.value && (
        <>
          <h4>Matching document titles and publishers</h4>
          {data.value.documents.length === 0 && (
            <p>No matching documents on this page.</p>
          )}
          {data.value.documents.map((item) => {
            const key = versionPath(item.documentId, item.revision);
            return (
              <div key={key}>
                <button
                  type="button"
                  aria-expanded={selected === key}
                  onClick={() => setSelected(selected === key ? "" : key)}
                >
                  {item.title} · version {item.revision}
                </button>
                <p>
                  {item.sourceType === "NEWS"
                    ? "News reference"
                    : "Primary document"}{" "}
                  ·{" "}
                  {item.publishedAt ? (
                    <LocalTime value={item.publishedAt} />
                  ) : (
                    "Publication date unknown"
                  )}
                </p>
                {selected === key && <DocumentResult path={key} />}
              </div>
            );
          })}
          <h4>Matching primary passages</h4>
          {data.value.passages.length === 0 && (
            <p>No matching passages on this page.</p>
          )}
          {data.value.passages.map((item) => (
            <div key={item.anchorId}>
              <button
                type="button"
                aria-expanded={selected === item.anchorId}
                onClick={() =>
                  setSelected(selected === item.anchorId ? "" : item.anchorId)
                }
              >
                {item.sourceTitle} · v{item.documentRevision} · page {item.page}
                , line {item.lineStart}
              </button>
              {selected === item.anchorId ? (
                <SourceLocation location={item} />
              ) : (
                <p>
                  {item.quote.slice(0, 180)}
                  {item.quote.length > 180 ? "…" : ""}
                </p>
              )}
            </div>
          ))}
          {offset > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelected("");
                setOffset(offset - 20);
              }}
            >
              Previous results
            </button>
          )}
          {(data.value.moreDocuments || data.value.morePassages) &&
            offset < 1200 && (
              <button
                type="button"
                onClick={() => {
                  setSelected("");
                  setOffset(offset + 20);
                }}
              >
                Next results
              </button>
            )}
          {(data.value.moreDocuments || data.value.morePassages) &&
            offset === 1200 && (
              <p>Narrow the search to see additional matches.</p>
            )}
        </>
      )}
    </details>
  );
}

function DocumentResult({ path }: { path: string }) {
  const data = useResource("CompanySourceDetail", path);
  if (data.error) return <p role="alert">{data.error}</p>;
  if (!data.value) return <p role="status">Loading document version…</p>;
  return <SourceEvidence detail={data.value} />;
}
