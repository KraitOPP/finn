import { lazy, Suspense, useEffect, useState } from "react";
import type { QuoteResponse } from "../contracts/generated/models.ts";
import { quotePresentation } from "../contracts/presentation.ts";
import { loadDemoQuote } from "./api/demo.ts";
import { AuthControls, SessionNotice } from "./auth/AuthControls.tsx";
import { useAuthentication } from "./auth/AuthProvider.tsx";
import { Securities } from "./instruments/Securities.tsx";
import { StockExplorer } from "./instruments/StockExplorer.tsx";
import { Watchlists } from "./market/Watchlists.tsx";
import {
  Navigation,
  PendingView,
  PrivateView,
  useRoute,
} from "./Navigation.tsx";
import {
  PreferencesProvider,
  usePreferences,
} from "./preferences/PreferencesProvider.tsx";
import { Settings } from "./preferences/Settings.tsx";

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

const Research = lazy(() =>
  import("./research/Sources.tsx").then((module) => ({
    default: module.Research,
  })),
);
const Discovery = lazy(() =>
  import("./research/Discovery.tsx").then((module) => ({
    default: module.Discovery,
  })),
);
const Portfolios = lazy(() =>
  import("./portfolio/Portfolios.tsx").then((module) => ({
    default: module.Portfolios,
  })),
);
const Inbox = lazy(() =>
  import("./monitoring/Inbox.tsx").then((module) => ({
    default: module.Inbox,
  })),
);
const Today = lazy(() =>
  import("./Today.tsx").then((module) => ({ default: module.Today })),
);

export function App() {
  return (
    <PreferencesProvider>
      <WorkspaceApp />
    </PreferencesProvider>
  );
}
function WorkspaceApp() {
  const route = useRoute();
  const auth = useAuthentication();
  const signedIn = auth.status === "ready" && auth.session.authenticated;
  const showDemo = route === "overview" && !signedIn;
  const preferences = usePreferences();
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>({ state: "loading" });
  useEffect(() => {
    if (!showDemo) return;
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
  }, [attempt, showDemo]);
  const presentation =
    snapshot.state === "ready"
      ? quotePresentation(snapshot.quote, "public-demo")
      : null;
  return (
    <>
      <button
        className="skip-link"
        type="button"
        onClick={() => {
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </button>
      <header className="topbar">
        <a href="/" className="brand">
          <span className="brand-mark" aria-hidden="true">
            f
          </span>
          finn<span className="brand-dot">.</span>
        </a>
        <span className="workspace-label">Portfolio &amp; research</span>
        {showDemo && (
          <span className="demo-badge">
            <span aria-hidden="true" />
            Synthetic demo
          </span>
        )}
        <AuthControls />
      </header>
      <Navigation route={route} signedIn={Boolean(signedIn)} />
      <main id="main" tabIndex={-1}>
        <SessionNotice />
        {route === "overview" && signedIn ? (
          <PrivateView>
            <Suspense fallback={<p role="status">Loading Today…</p>}>
              <Today />
            </Suspense>
          </PrivateView>
        ) : showDemo ? (
          <>
            <section className="intro">
              <h1>Manage your portfolio in one place.</h1>
              <p className="intro-copy">
                Import Groww holdings, find stocks by name, and keep your
                research and alerts together.
              </p>
            </section>
            <section
              className="snapshot-layout"
              aria-labelledby="snapshot-heading"
            >
              <article className="quote-card">
                <div className="card-heading">
                  <div>
                    <h2 id="snapshot-heading">Example stock snapshot</h2>
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
                          {snapshot.quote.listing.exchange} · Illustrative
                          example
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
                          <dd>
                            {snapshot.quote.observation.low ?? "Unavailable"}
                          </dd>
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
                <h2 id="context-heading">Price details</h2>
                <p>Check the source and session date before using a price.</p>
                <dl className="context-list">
                  <div className="context-row">
                    <dt>Source</dt>
                    <dd>
                      {presentation?.sourceText ?? "Synthetic demonstration"}
                    </dd>
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
            <p className="demo-note">This example uses fictional data.</p>
          </>
        ) : route === null ? (
          <PendingView title="Page not found">
            <p>Choose a page from the workspace navigation.</p>
            <a href="#/overview">Return to overview</a>
          </PendingView>
        ) : (
          <PrivateView key={route}>
            {route === "portfolio" ? (
              <Suspense fallback={<p role="status">Loading Portfolio…</p>}>
                <Portfolios />
              </Suspense>
            ) : route === "instruments" ? (
              <>
                <StockExplorer />
                <details className="workspace-tools">
                  <summary>Saved securities and listing history</summary>
                  <Securities embedded />
                </details>
              </>
            ) : route === "watchlists" ? (
              <Watchlists />
            ) : route === "inbox" ? (
              <Suspense fallback={<p role="status">Loading Inbox…</p>}>
                <Inbox />
              </Suspense>
            ) : route === "settings" ? (
              <Settings />
            ) : route === "discover" ? (
              <Suspense fallback={<p role="status">Loading Discover…</p>}>
                <Discovery />
              </Suspense>
            ) : (
              <Suspense fallback={<p role="status">Loading research…</p>}>
                <Research />
              </Suspense>
            )}
          </PrivateView>
        )}
      </main>
      <footer className="page-footer">
        <span>finn.</span>
        <span>
          India · INR · {preferences.value?.timeZone ?? "Asia/Kolkata"}
        </span>
      </footer>
    </>
  );
}
