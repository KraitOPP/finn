import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useId, useState } from "react";
import type {
  StockLookupOpened,
  StockSuggestion,
} from "../../contracts/generated/models.ts";
import { ListingMarketDetail } from "../market/ListingHistory.tsx";
import { RouteHeading } from "../Navigation.tsx";
import { News } from "../research/News.tsx";
import { StockAiTool } from "../research/StockAiTool.tsx";
import { StockSearch } from "./StockSearch.tsx";

type DetailView = "prices" | "news";

export function StockExplorer({ home = false }: { home?: boolean }) {
  const [view, setView] = useState<DetailView>("prices");
  const [opened, setOpened] = useState<{
    stock: StockSuggestion;
    value: StockLookupOpened;
  } | null>(null);
  const id = useId();
  const listing = opened?.value.listing;
  return (
    <section className="stock-workspace">
      <RouteHeading>{home ? "Overview" : "Stocks"}</RouteHeading>
      <div className={home && !opened ? "stock-layout" : undefined}>
        <StockSearch
          description="Choose a company to see prices, news and research."
          onOpen={(stock, value) => {
            setOpened({ stock, value });
            setView("prices");
          }}
        />
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
              href={`#/research?company=${listing.companyId}&listing=${listing.listingId}`}
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
              <>
                <div className="stock-news-panel">
                  <StockAiTool key={listing.listingId} listing={listing} news />
                </div>
                <details className="workspace-tools">
                  <summary>Saved news links</summary>
                  <News companyId={listing.companyId} />
                </details>
              </>
            )}
          </div>
        </Paper>
      )}
    </section>
  );
}
