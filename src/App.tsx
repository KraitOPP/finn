import { useEffect, useState } from "react";
import type { QuoteResponse } from "../contracts/generated/models.ts";
import { quotePresentation } from "../contracts/presentation.ts";
import { loadDemoQuote } from "./api/demo.ts";

type Snapshot =
  | { state: "loading" }
  | { state: "error" }
  | { state: "ready"; quote: QuoteResponse };
const sessionLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(`${value}T00:00:00Z`))
    : "Session unavailable";

export function App() {
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({ state: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    setSnapshot({ state: "loading" });
    loadDemoQuote(controller.signal, attempt > 0)
      .then((quote) => {
        if (!controller.signal.aborted) setSnapshot({ state: "ready", quote });
      })
      .catch(() => {
        if (!controller.signal.aborted) setSnapshot({ state: "error" });
      });
    return () => controller.abort();
  }, [attempt]);
  const presentation =
    snapshot.state === "ready"
      ? quotePresentation(snapshot.quote, "public-demo")
      : null;
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="topbar">
        <a href="/" className="brand" aria-label="FINN home">
          <span className="brand-mark" aria-hidden="true">
            f
          </span>
          finn<span className="brand-dot">.</span>
        </a>
        <span className="workspace-label">Investment workspace</span>
        <span className="demo-badge">
          <span aria-hidden="true" />
          Synthetic demo
        </span>
      </header>
      <main id="main">
        <section className="intro">
          <p className="eyebrow">CLARITY, BEFORE THE NEXT MOVE</p>
          <h1>
            A clearer view
            <br />
            of your investments<span className="intro-emphasis">.</span>
          </h1>
          <p className="intro-copy">
            Keep the numbers and their context together. Explore a fictional
            stock snapshot to get started.
          </p>
        </section>
        <section className="snapshot-layout" aria-labelledby="snapshot-heading">
          <article className="quote-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">MARKET SNAPSHOT</p>
                <h2 id="snapshot-heading">A sample, with context</h2>
              </div>
              <span className="pill">Fictional security</span>
            </div>
            {snapshot.state === "loading" && (
              <div className="loading-state" role="status">
                <span className="spinner" aria-hidden="true" />
                Loading sample snapshot…
              </div>
            )}
            {snapshot.state === "error" && (
              <div className="error-state" role="alert">
                <h3>We couldn’t load the sample</h3>
                <p>Check the connection and try again.</p>
                <button
                  type="button"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  Try again <span aria-hidden="true">↗</span>
                </button>
              </div>
            )}
            {snapshot.state === "ready" && presentation && (
              <>
                <div className="security-heading">
                  <span className="security-monogram" aria-hidden="true">
                    D
                  </span>
                  <div>
                    <h3>{snapshot.quote.listing.symbol}</h3>
                    <p>
                      {snapshot.quote.listing.exchange} · Illustrative example
                    </p>
                  </div>
                </div>
                <div className="price-block">
                  <p className="field-label">Reported closing price</p>
                  <p className="price">{presentation.valueText}</p>
                  <p className="session">
                    Session: {sessionLabel(presentation.sessionDate)}
                  </p>
                </div>
                {snapshot.quote.availability === "AVAILABLE" && (
                  <dl className="price-grid">
                    <div className="price-stat">
                      <dt>Open</dt>
                      <dd>
                        {snapshot.quote.observation.open ?? "Unavailable"}
                      </dd>
                    </div>
                    <div className="price-stat">
                      <dt>High</dt>
                      <dd>
                        {snapshot.quote.observation.high ?? "Unavailable"}
                      </dd>
                    </div>
                    <div className="price-stat">
                      <dt>Low</dt>
                      <dd>{snapshot.quote.observation.low ?? "Unavailable"}</dd>
                    </div>
                  </dl>
                )}
                <div className="snapshot-footer">
                  <span>
                    <span className="status-dot" aria-hidden="true" />
                    {presentation.freshnessText}
                  </span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setAttempt((value) => value + 1)}
                  >
                    Refresh sample <span aria-hidden="true">↻</span>
                  </button>
                </div>
              </>
            )}
          </article>
          <aside className="context-card" aria-labelledby="context-heading">
            <div className="context-icon" aria-hidden="true">
              i
            </div>
            <p className="eyebrow">BEHIND THE NUMBER</p>
            <h2 id="context-heading">
              Know what
              <br />
              you’re looking at.
            </h2>
            <p>
              A recent download doesn’t necessarily mean a recent trade. Every
              snapshot keeps its source and timing in view.
            </p>
            <dl className="context-list">
              <div className="context-row">
                <dt>Source</dt>
                <dd>{presentation?.sourceText ?? "Synthetic demonstration"}</dd>
              </div>
              <div className="context-row">
                <dt>Frequency</dt>
                <dd>End of day</dd>
              </div>
              <div className="context-row">
                <dt>Source delay</dt>
                <dd>{presentation?.delayText ?? "Source delay unknown"}</dd>
              </div>
            </dl>
          </aside>
        </section>
        <p className="demo-note">
          All figures in this demonstration are fictional. No personal portfolio
          has been imported.
        </p>
      </main>
      <footer className="page-footer">
        <span>
          finn.{" "}
          <span className="footer-caption">A little more perspective.</span>
        </span>
        <span>India · INR · Asia/Kolkata</span>
      </footer>
    </>
  );
}
