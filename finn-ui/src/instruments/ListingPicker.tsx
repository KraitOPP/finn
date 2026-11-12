import { useState } from "react";
import type { CatalogueListing } from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
export function ListingPicker({
  busy,
  onChoose,
  summary,
  action,
}: {
  busy: boolean;
  onChoose: (listing: CatalogueListing) => void;
  summary: string;
  action: string;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [offset, setOffset] = useState(0);
  const path =
    search === null
      ? null
      : `/api/v1/catalog/securities?${new URLSearchParams({ query: search, limit: "25", offset: String(offset) })}`;
  const results = useResource("CatalogueSecurityPage", path);
  const detail = useResource(
    "CatalogueSecurityDetail",
    selected ? `/api/v1/catalog/securities/${selected}` : null,
  );
  return (
    <details className="settings-card">
      <summary>{summary}</summary>
      <p>
        Search your saved catalogue. Add new securities or verify their listings
        in <a href="#/instruments">Securities</a>.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setSearch(query);
          setSelected("");
          setOffset(0);
          results.reload();
        }}
      >
        <label>
          Security name or ISIN{" "}
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={100}
          />
        </label>
        <button type="submit">Find saved securities</button>
      </form>
      {results.error && <p role="alert">{results.error}</p>}
      {results.loading && <p role="status">Searching your catalogue…</p>}
      {results.value?.items.length === 0 && <p>No saved securities match.</p>}
      {results.value && results.value.items.length > 0 && (
        <>
          <label>
            Choose a security{" "}
            <select
              value={selected}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="">Select a security</option>
              {results.value.items.map((item) => (
                <option key={item.securityId} value={item.securityId}>
                  {item.name} · {item.isin ?? "ISIN unknown"}
                </option>
              ))}
            </select>
          </label>
          <div className="pagination">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => {
                setOffset(offset - 25);
                setSelected("");
              }}
            >
              Previous securities
            </button>
            <button
              type="button"
              disabled={!results.value.hasMore}
              onClick={() => {
                setOffset(offset + 25);
                setSelected("");
              }}
            >
              Next securities
            </button>
          </div>
        </>
      )}
      {detail.error && <p role="alert">{detail.error}</p>}
      {detail.loading && <p role="status">Loading reviewed listings…</p>}
      {detail.value?.listings.length === 0 && (
        <p>
          This security has no reviewed listing. Add one in Securities first.
        </p>
      )}
      {detail.value && (
        <ul className="security-list">
          {detail.value.listings.map((item) => (
            <li key={item.listingId}>
              <button
                disabled={busy}
                type="button"
                onClick={() => onChoose(item)}
              >
                {action} {item.symbol} on {item.exchange}
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
