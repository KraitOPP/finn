import { type FormEvent, useEffect, useState } from "react";
import type {
  CatalogueCompanies,
  CatalogueSecurityDetail,
  CatalogueSecurityPage,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { ListingPriceDisclosure } from "../market/ListingHistory.tsx";
import { RouteHeading } from "../Navigation.tsx";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function Securities() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    page: CatalogueSecurityPage;
    companies: CatalogueCompanies;
    generation: number;
  } | null>(null);
  const page = result?.generation === attempt ? result.page : null;
  const companies = result?.companies ?? [];
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setResult(null);
    Promise.all([
      requestContract(
        "CatalogueSecurityPage",
        `/api/v1/catalog/securities?${new URLSearchParams({ query: search, limit: "50", offset: String(offset) })}`,
        { signal: controller.signal },
      ),
      requestContract("CatalogueCompanies", "/api/v1/catalog/companies", {
        signal: controller.signal,
      }),
    ])
      .then(([page, companies]) => {
        if (!controller.signal.aborted)
          setResult({ page, companies, generation: attempt });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [search, offset, attempt]);
  const reload = () => setAttempt((value) => value + 1);
  return (
    <section className="workspace-section">
      <RouteHeading>Securities</RouteHeading>
      <p className="muted-copy">
        Your manually reviewed catalogue. A company, a security and an exchange
        listing have separate identities. This search covers your saved records.
      </p>
      <form
        className="search-form"
        onSubmit={(event) => {
          event.preventDefault();
          setOffset(0);
          setSelected(null);
          setSearch(query);
          reload();
        }}
      >
        <label htmlFor="security-search">Search name or ISIN</label>
        <div>
          <input
            id="security-search"
            value={query}
            maxLength={100}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit" className="primary-button">
            Search
          </button>
        </div>
      </form>
      {error ? (
        <div className="empty-state" role="alert">
          <p>Your catalogue couldn’t be loaded.</p>
          <button type="button" onClick={reload}>
            Try again
          </button>
        </div>
      ) : !page ? (
        <p role="status">Loading securities…</p>
      ) : (
        <>
          {page.items.length === 0 ? (
            <div className="empty-state">
              <h2>No matching securities</h2>
              <p>
                Add a reviewed security below. An ISIN does not select NSE or
                BSE automatically.
              </p>
            </div>
          ) : (
            <ul className="security-list">
              {page.items.map((security) => (
                <li key={security.securityId}>
                  <div>
                    <strong>{security.name}</strong>
                    <p>
                      {security.companyName} · {security.isin ?? "ISIN unknown"}{" "}
                      ·{" "}
                      {security.reviewStatus === "UNRESOLVED"
                        ? "Needs review"
                        : "Manually confirmed"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setSelected(security.securityId)}
                  >
                    Listings for {security.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="pagination">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => {
                setOffset((value) => Math.max(0, value - 50));
                setSelected(null);
              }}
            >
              Previous
            </button>
            <span>Showing from {offset + 1}</span>
            <button
              type="button"
              disabled={!page.hasMore}
              onClick={() => {
                setOffset((value) => value + 50);
                setSelected(null);
              }}
            >
              Next
            </button>
          </div>
        </>
      )}
      {selected && <SecurityDetail key={selected} id={selected} />}
      <CreateSecurity
        companies={companies}
        onCreated={(id) => {
          setSelected(id);
          reload();
        }}
      />
    </section>
  );
}

function CreateSecurity({
  companies,
  onCreated,
}: {
  companies: CatalogueCompanies;
  onCreated: (id: string) => void;
}) {
  const authentication = useAuthentication();
  const [company, setCompany] = useState("new");
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [isin, setIsin] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (authentication.status !== "ready") return;
    setBusy(true);
    setError(null);
    try {
      const csrf = authentication.session.csrf;
      let companyId = company;
      if (company === "new") {
        const result = await requestContract(
          "CatalogueCompany",
          "/api/v1/catalog/companies",
          { method: "POST", body: { name: companyName }, csrf },
        );
        companyId = result.companyId;
        setCompany(companyId);
      }
      const security = await requestContract(
        "CatalogueSecurity",
        "/api/v1/catalog/securities",
        {
          method: "POST",
          body: { companyId, name, isin: isin || null, confirmed },
          csrf,
        },
      );
      setName("");
      setIsin("");
      setConfirmed(false);
      onCreated(security.securityId);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        authentication.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "The security couldn’t be saved. Review your catalogue before retrying.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="settings-card">
      <summary>Add a security</summary>
      <form onSubmit={submit}>
        <label htmlFor="company-choice">Company</label>
        <select
          id="company-choice"
          value={company}
          onChange={(event) => setCompany(event.target.value)}
        >
          <option value="new">Record a new company</option>
          {companies.map((value) => (
            <option key={value.companyId} value={value.companyId}>
              {value.name}
            </option>
          ))}
          {company !== "new" &&
            !companies.some((value) => value.companyId === company) && (
              <option value={company}>{companyName}</option>
            )}
        </select>
        {company === "new" && (
          <>
            <label htmlFor="company-name">Company name</label>
            <input
              id="company-name"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              maxLength={120}
              required
            />
          </>
        )}
        <label htmlFor="security-name">Security name</label>
        <input
          id="security-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={120}
          required
        />
        <label htmlFor="security-isin">ISIN (optional)</label>
        <input
          id="security-isin"
          value={isin}
          onChange={(event) => setIsin(event.target.value.toUpperCase())}
          minLength={12}
          maxLength={12}
        />
        <p className="field-help">
          Unknown ISIN is allowed. No exchange or provider symbol will be
          inferred.
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
          />
          I have reviewed this company and security identity.
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="primary-button">
          {busy ? "Saving…" : "Save security"}
        </button>
      </form>
    </details>
  );
}

function SecurityDetail({ id }: { id: string }) {
  const [result, setResult] = useState<{
    value: CatalogueSecurityDetail;
    generation: number;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const value = result?.generation === attempt ? result.value : null;
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError(false);
    requestContract(
      "CatalogueSecurityDetail",
      `/api/v1/catalog/securities/${id}`,
      { signal: controller.signal },
    )
      .then((value) => {
        if (!controller.signal.aborted)
          setResult({ value, generation: attempt });
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(true);
      });
    return () => controller.abort();
  }, [id, attempt]);
  if (error)
    return (
      <div className="empty-state" role="alert">
        <p>This security is unavailable to your account.</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Try again
        </button>
      </div>
    );
  if (!value) return <p role="status">Loading exchange listings…</p>;
  return (
    <section className="detail-card">
      <h2>{value.security.name}</h2>
      <p>
        {value.security.isin ?? "ISIN unknown"} · {value.security.reviewStatus}
      </p>
      {value.listings.length === 0 ? (
        <p>
          No exchange listing is confirmed. Holdings can retain security
          identity while valuation remains unavailable.
        </p>
      ) : (
        <ul className="security-list">
          {value.listings.map((listing) => (
            <li key={listing.listingId}>
              <div>
                <strong>
                  {listing.exchange} · {listing.symbol}
                </strong>
                <p>
                  Series/group {listing.series} · INR · effective from{" "}
                  {listing.validFrom}
                </p>
                <p>
                  Yahoo: {listing.providerSymbol ?? "Not mapped"} · manually
                  confirmed
                </p>
                <ListingPriceDisclosure listing={listing} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <AddListing id={id} onAdded={() => setAttempt((value) => value + 1)} />
    </section>
  );
}

function AddListing({ id, onAdded }: { id: string; onAdded: () => void }) {
  const authentication = useAuthentication();
  const [exchange, setExchange] = useState("NSE");
  const [series, setSeries] = useState("");
  const [symbol, setSymbol] = useState("");
  const [provider, setProvider] = useState("");
  const [from, setFrom] = useState(today);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (authentication.status !== "ready") return;
    setBusy(true);
    setError(null);
    try {
      await requestContract(
        "CatalogueListing",
        `/api/v1/catalog/securities/${id}/listings`,
        {
          method: "POST",
          body: {
            exchange,
            series,
            symbol,
            providerSymbol: provider || null,
            validFrom: from,
            confirmed,
          },
          csrf: authentication.session.csrf,
        },
      );
      onAdded();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        authentication.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "The listing couldn’t be saved.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <details className="settings-card">
      <summary>Confirm an exchange listing</summary>
      <form onSubmit={submit}>
        <p className="field-help">
          Check the exchange, series/group and symbol against your source. Yahoo
          mapping is optional and must be entered explicitly.
        </p>
        <label htmlFor="listing-exchange">Exchange</label>
        <select
          id="listing-exchange"
          value={exchange}
          onChange={(event) => setExchange(event.target.value)}
        >
          <option>NSE</option>
          <option>BSE</option>
        </select>
        <label htmlFor="listing-series">Series/group</label>
        <input
          id="listing-series"
          required
          maxLength={16}
          value={series}
          onChange={(event) => setSeries(event.target.value.toUpperCase())}
        />
        <label htmlFor="listing-symbol">Exchange symbol</label>
        <input
          id="listing-symbol"
          required
          maxLength={64}
          value={symbol}
          onChange={(event) => setSymbol(event.target.value.toUpperCase())}
        />
        <label htmlFor="listing-provider-symbol">Yahoo symbol (optional)</label>
        <input
          id="listing-provider-symbol"
          maxLength={72}
          value={provider}
          onChange={(event) => setProvider(event.target.value.toUpperCase())}
        />
        <label htmlFor="listing-from">Mapping valid from</label>
        <input
          id="listing-from"
          type="date"
          required
          max={today()}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        <label className="check-label">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
            required
          />
          I reviewed this exchange listing and its mapping.
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={busy} className="primary-button">
          {busy ? "Saving…" : "Confirm listing"}
        </button>
      </form>
    </details>
  );
}
