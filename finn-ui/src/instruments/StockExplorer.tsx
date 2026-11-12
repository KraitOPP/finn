import { useEffect, useId, useState } from "react";
import type {
  StockLookupOpened,
  StockSuggestion,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingMarketDetail } from "../market/ListingHistory.tsx";
import { RouteHeading } from "../Navigation.tsx";

const lookup = "/api/v1/catalog/lookup";
const examples = ["Infosys", "Reliance", "TCS", "HDFC Bank"];

export function StockExplorer({ home = false }: { home?: boolean }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [exchange, setExchange] = useState<"NSE" | "BSE">("NSE");
  const [active, setActive] = useState(-1);
  const [expanded, setExpanded] = useState(true);
  const [opened, setOpened] = useState<{
    name: string;
    value: StockLookupOpened;
  } | null>(null);
  const id = useId();
  const command = usePrivateCommand();
  const current = query.trim();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(current), 250);
    return () => clearTimeout(timer);
  }, [current]);
  const search = useResource(
    "StockLookupResults",
    expanded && current.length >= 2 && current === debounced
      ? `${lookup}?${new URLSearchParams({ query: current, exchange })}`
      : null,
  );
  const suggestions = search.value?.items ?? [];
  const hasOptions = expanded && suggestions.length > 0;

  async function select(stock: StockSuggestion) {
    if (command.busy) return;
    const value = await command.run((csrf) =>
      requestContract("StockLookupOpened", lookup, {
        method: "POST",
        csrf,
        body: { exchange: stock.exchange, symbol: stock.symbol },
      }),
    );
    if (value) {
      setOpened({ name: stock.name, value });
      setQuery(stock.name);
      setExpanded(false);
      setActive(-1);
    }
  }

  function change(text: string) {
    setQuery(text);
    setActive(-1);
    setExpanded(true);
  }

  return (
    <section className="stock-workspace">
      <RouteHeading>{home ? "Overview" : "Stocks"}</RouteHeading>
      <div className={home && !opened ? "stock-layout" : undefined}>
        <section className="stock-search-card" aria-labelledby={`${id}-title`}>
          <h2 id={`${id}-title`}>Find a stock</h2>
          <p>Choose a company to see prices and open its research workspace.</p>
          <fieldset className="stock-exchange">
            <legend className="visually-hidden">Exchange</legend>
            {(["NSE", "BSE"] as const).map((venue) => (
              <button
                type="button"
                key={venue}
                aria-pressed={exchange === venue}
                onClick={() => {
                  setExchange(venue);
                  setActive(-1);
                  setExpanded(true);
                }}
              >
                {venue}
              </button>
            ))}
          </fieldset>
          <label htmlFor={id} className="visually-hidden">
            Search stocks
          </label>
          <input
            id={id}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={hasOptions}
            aria-controls={`${id}-results`}
            aria-activedescendant={
              hasOptions && active >= 0 ? `${id}-stock-${active}` : undefined
            }
            autoComplete="off"
            maxLength={80}
            placeholder="Search company name or ticker"
            value={query}
            onChange={(event) => change(event.target.value)}
            onFocus={() => setExpanded(true)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setExpanded(false);
                setActive(-1);
              }
              if (!hasOptions) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setActive(
                  event.key === "ArrowDown"
                    ? (active + 1) % suggestions.length
                    : active <= 0
                      ? suggestions.length - 1
                      : active - 1,
                );
              }
              if (event.key === "Enter") {
                event.preventDefault();
                const stock = suggestions[Math.max(active, 0)];
                if (stock) void select(stock);
              }
            }}
          />
          <div
            id={`${id}-results`}
            className="stock-options"
            role="listbox"
            aria-label="Matching stocks"
            hidden={!hasOptions}
          >
            {suggestions.map((stock, index) => (
              <div
                id={`${id}-stock-${index}`}
                role="option"
                tabIndex={-1}
                aria-selected={active === index}
                key={`${stock.exchange}:${stock.symbol}`}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => void select(stock)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ")
                    void select(stock);
                }}
              >
                <span>{stock.name}</span>
                <small>
                  {stock.symbol} · {stock.exchange}
                </small>
              </div>
            ))}
          </div>
          {command.busy && <p role="status">Opening stock…</p>}
          {command.error && <p role="alert">{command.error}</p>}
          {expanded &&
            current.length >= 2 &&
            (current !== debounced || search.loading) && (
              <p role="status">Finding stocks…</p>
            )}
          {expanded &&
            (search.error || search.value?.status === "UNAVAILABLE") && (
              <p role="alert">
                Stock search is temporarily unavailable.{" "}
                <button type="button" onClick={search.reload}>
                  Retry
                </button>
              </p>
            )}
          {expanded && search.value?.status === "READY" && !hasOptions && (
            <p role="status">No matching {exchange} stocks.</p>
          )}
          {!current && (
            <div className="stock-examples">
              {examples.map((name) => (
                <button key={name} type="button" onClick={() => change(name)}>
                  {name}
                </button>
              ))}
            </div>
          )}
        </section>
        {home && !opened && (
          <nav className="workspace-actions" aria-label="Workspace shortcuts">
            <a href="#/portfolio">
              <strong>Portfolio</strong>
              <span>Holdings and Groww imports</span>
            </a>
            <a href="#/research">
              <strong>Research</strong>
              <span>Ask about a company or review its filings</span>
            </a>
            <a href="#/inbox">
              <strong>Inbox</strong>
              <span>Alerts and reminders</span>
            </a>
          </nav>
        )}
      </div>
      {opened && (
        <section className="stock-detail" aria-label={`${opened.name} stock`}>
          <div className="section-heading">
            <div>
              <h2>{opened.name}</h2>
              <p>
                {opened.value.listing.symbol} · {opened.value.listing.exchange}{" "}
                · INR
              </p>
            </div>
            <a
              className="primary-button"
              href={`#/research?company=${opened.value.listing.companyId}`}
            >
              Open research
            </a>
          </div>
          <ListingMarketDetail
            key={opened.value.listing.listingId}
            listing={opened.value.listing}
            compact
          />
        </section>
      )}
    </section>
  );
}
