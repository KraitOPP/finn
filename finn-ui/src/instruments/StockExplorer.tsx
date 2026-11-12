import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { useEffect, useId, useRef, useState } from "react";
import type {
  StockLookupOpened,
  StockSuggestion,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingMarketDetail } from "../market/ListingHistory.tsx";
import { RouteHeading } from "../Navigation.tsx";
import { News } from "../research/News.tsx";

const lookup = "/api/v1/catalog/lookup";
const examples = ["Infosys", "Reliance", "TCS", "HDFC Bank"];
type Venue = "NSE" | "BSE";
type DetailView = "prices" | "news";
const stockKey = (stock: StockSuggestion) =>
  `${stock.exchange}:${stock.symbol}`;

export function StockExplorer({ home = false }: { home?: boolean }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [exchange, setExchange] = useState<Venue>("NSE");
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<DetailView>("prices");
  const [opened, setOpened] = useState<{
    stock: StockSuggestion;
    value: StockLookupOpened;
  } | null>(null);
  const searchInput = useRef<HTMLInputElement>(null);
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
  const unavailable = Boolean(
    search.error || search.value?.status === "UNAVAILABLE",
  );

  async function select(stock: StockSuggestion) {
    if (command.busy) return;
    setExpanded(false);
    const value = await command.run((csrf) =>
      requestContract("StockLookupOpened", lookup, {
        method: "POST",
        csrf,
        body: { exchange: stock.exchange, symbol: stock.symbol },
      }),
    );
    if (!value) return;
    setOpened({ stock, value });
    setView("prices");
    setQuery(stock.name);
  }

  function change(text: string) {
    setQuery(text);
    setExpanded(text.trim().length >= 2);
  }

  const listing = opened?.value.listing;
  return (
    <section className="stock-workspace">
      <RouteHeading>{home ? "Overview" : "Stocks"}</RouteHeading>
      <div className={home && !opened ? "stock-layout" : undefined}>
        <Paper
          component="section"
          variant="outlined"
          className="stock-search-card"
          aria-labelledby={`${id}-title`}
        >
          <h2 id={`${id}-title`}>Find a stock</h2>
          <p>Choose a company to see prices, saved news and research.</p>
          <ToggleButtonGroup
            aria-label="Stock exchange"
            exclusive
            value={exchange}
            size="small"
            sx={{ mb: 2 }}
            onChange={(_, venue: Venue | null) => {
              if (!venue) return;
              setExchange(venue);
              setExpanded(current.length >= 2);
              searchInput.current?.focus();
            }}
          >
            <ToggleButton value="NSE">NSE</ToggleButton>
            <ToggleButton value="BSE">BSE</ToggleButton>
          </ToggleButtonGroup>
          <Autocomplete
            id={id}
            fullWidth
            value={
              opened?.stock.exchange === exchange && opened.stock.name === query
                ? opened.stock
                : null
            }
            inputValue={query}
            open={expanded && current.length >= 2}
            openOnFocus
            options={search.value?.items ?? []}
            disabled={command.busy}
            loading={expanded && (current !== debounced || search.loading)}
            loadingText="Finding stocks…"
            noOptionsText={
              unavailable
                ? "Search is temporarily unavailable"
                : `No matching ${exchange} stocks`
            }
            filterOptions={(options) => options}
            getOptionLabel={(option) => option.name}
            getOptionKey={stockKey}
            isOptionEqualToValue={(option, value) =>
              stockKey(option) === stockKey(value)
            }
            onOpen={() => setExpanded(true)}
            onClose={() => setExpanded(false)}
            onInputChange={(_, text, reason) => {
              if (reason === "input" || reason === "clear") change(text);
            }}
            onChange={(_, option) => {
              if (option) void select(option);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={searchInput}
                label="Search stocks"
                placeholder="Company name or ticker"
                slotProps={{
                  ...params.slotProps,
                  htmlInput: { ...params.slotProps?.htmlInput, maxLength: 80 },
                }}
              />
            )}
            renderOption={({ key, ...props }, stock) => (
              <li key={key} {...props}>
                <span className="stock-option-copy">
                  <strong>{stock.name}</strong>
                  <small>
                    {stock.symbol} · {stock.exchange}
                  </small>
                </span>
              </li>
            )}
          />
          {command.busy && (
            <LinearProgress aria-label="Opening stock" sx={{ mt: 2 }} />
          )}
          {command.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {command.error}
            </Alert>
          )}
          {unavailable && expanded && (
            <Alert
              severity="warning"
              sx={{ mt: 2 }}
              action={
                <Button size="small" color="inherit" onClick={search.reload}>
                  Retry
                </Button>
              }
            >
              Stock search is temporarily unavailable.
            </Alert>
          )}
          {!current && (
            <div className="stock-examples">
              {examples.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  variant="outlined"
                  onClick={() => {
                    change(name);
                    searchInput.current?.focus();
                  }}
                />
              ))}
            </div>
          )}
        </Paper>
        {home && !opened && (
          <nav className="workspace-actions" aria-label="Workspace shortcuts">
            <Paper component="a" variant="outlined" href="#/portfolio">
              <strong>Portfolio</strong>
              <span>Holdings and Groww imports</span>
            </Paper>
            <Paper component="a" variant="outlined" href="#/research">
              <strong>Research</strong>
              <span>Ask about a company or review its filings</span>
            </Paper>
            <Paper component="a" variant="outlined" href="#/inbox">
              <strong>Inbox</strong>
              <span>Alerts and reminders</span>
            </Paper>
          </nav>
        )}
      </div>
      {opened && listing && (
        <Paper
          component="section"
          variant="outlined"
          className="stock-detail"
          aria-label={`${opened.stock.name} stock`}
        >
          <div className="section-heading">
            <div>
              <h2>{opened.stock.name}</h2>
              <p>
                {listing.symbol} · {listing.exchange} · INR
              </p>
            </div>
            <Button
              variant="contained"
              href={`#/research?company=${listing.companyId}`}
            >
              Open research
            </Button>
          </div>
          <Tabs
            value={view}
            onChange={(_, next: DetailView) => setView(next)}
            aria-label="Stock details"
          >
            <Tab
              label="Prices"
              value="prices"
              id={`${id}-prices-tab`}
              aria-controls={`${id}-prices-panel`}
            />
            <Tab
              label="News"
              value="news"
              id={`${id}-news-tab`}
              aria-controls={`${id}-news-panel`}
            />
          </Tabs>
          <div
            role="tabpanel"
            id={`${id}-prices-panel`}
            aria-labelledby={`${id}-prices-tab`}
            hidden={view !== "prices"}
          >
            {view === "prices" && (
              <ListingMarketDetail
                key={listing.listingId}
                listing={listing}
                compact
              />
            )}
          </div>
          <div
            role="tabpanel"
            id={`${id}-news-panel`}
            aria-labelledby={`${id}-news-tab`}
            hidden={view !== "news"}
          >
            {view === "news" && (
              <News key={listing.companyId} companyId={listing.companyId} />
            )}
          </div>
        </Paper>
      )}
    </section>
  );
}
