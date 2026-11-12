import { useState } from "react";
import type {
  ValuationTotals,
  ValuedHolding,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { PriceSource } from "./ListingPrices.tsx";

export function money(amount: string | null) {
  if (amount === null) return "Unavailable";
  return amount.startsWith("-") ? `−₹${amount.slice(1)}` : `₹${amount}`;
}

function Amounts({ totals }: { totals: ValuationTotals }) {
  const entries = [
    ["Holdings value", totals.holdingsValue],
    ["Recorded cash balance", totals.cashBalance],
    ["Holdings plus cash", totals.portfolioValue],
    ["Unrealised gain / loss", totals.unrealisedPnl],
    ["Realised gain / loss from recorded sales", totals.realisedPnl],
    [
      totals.recordedFeesComplete
        ? "Recorded fees"
        : "Known fees (coverage incomplete)",
      totals.recordedFees,
    ],
    ["Recorded dividends", totals.recordedDividends],
    ["Net contributions", totals.netContributions],
  ] as const;
  return (
    <>
      <p>
        {totals.priced} of {totals.positions} recorded positions priced ·{" "}
        {totals.stalePrices} stale · {totals.providerEstimates} Yahoo estimates.
      </p>
      <dl className="ledger-metrics">
        {entries.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{money(value)}</dd>
          </div>
        ))}
      </dl>
      {totals.holdingsValue === null && totals.knownHoldingsValue !== null && (
        <p>Priced positions only: {money(totals.knownHoldingsValue)}</p>
      )}
      {totals.unrealisedPnl === null && totals.knownUnrealisedPnl !== null && (
        <p>
          Unrealised gain / loss on positions with known cost and price:{" "}
          {money(totals.knownUnrealisedPnl)}
        </p>
      )}
      <p className="muted-copy">
        Figures cover recorded positions and cash. Contributions are separate
        from gains. Fees, dividends and gains reflect the records you have
        entered.
      </p>
    </>
  );
}

export function AccountValuationPanel({
  base,
  archived,
}: {
  base: string;
  archived: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Current account valuation</summary>
      {open && <AccountValuationContents base={base} archived={archived} />}
    </details>
  );
}

function AccountValuationContents({
  base,
  archived,
}: {
  base: string;
  archived: boolean;
}) {
  const data = useResource("AccountValuation", `${base}/valuation`);
  const [editing, setEditing] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      <button type="button" onClick={data.reload}>
        Recalculate from saved records
      </button>
      {notice && <p role="status">{notice}</p>}
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Calculating recorded value…</p>
      ) : (
        <>
          <p>
            As of {data.value.asOf} (India) · ledger revision{" "}
            {data.value.ledgerRevision}.
          </p>
          <Amounts totals={data.value.totals} />
          {data.value.holdings.length === 0 ? (
            <p>There are no recorded open positions.</p>
          ) : (
            <ul className="security-list">
              {data.value.holdings.map((row) => (
                <li key={row.securityId}>
                  <div>
                    <strong>{row.securityName}</strong>
                    <p>
                      {row.quantity} units · cost {money(row.recordedCost)} ·
                      value {money(row.value)} · gain / loss{" "}
                      {money(row.unrealisedPnl)}
                    </p>
                    <p>
                      {row.observation ? (
                        <PriceSource price={row.observation} />
                      ) : row.priceStatus === "LISTING_REQUIRED" ? (
                        "Choose a reviewed exchange listing."
                      ) : (
                        "No compatible close for the chosen listing."
                      )}
                    </p>
                    {!archived && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(row.securityId);
                          setNotice(null);
                        }}
                      >
                        Choose listing for {row.securityName}
                      </button>
                    )}
                    {editing === row.securityId && !archived && (
                      <ListingChoice
                        base={base}
                        row={row}
                        onSaved={() => {
                          setEditing(null);
                          setNotice("Valuation listing saved.");
                          data.reload();
                        }}
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}

function ListingChoice({
  base,
  row,
  onSaved,
}: {
  base: string;
  row: ValuedHolding;
  onSaved: () => void;
}) {
  const auth = useAuthentication();
  const data = useResource(
    "CatalogueSecurityDetail",
    `/api/v1/catalog/securities/${row.securityId}`,
  );
  const [listing, setListing] = useState(row.listingId ?? "");
  const [estimate, setEstimate] = useState(row.allowProviderEstimate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const isin = data.value?.security.isin;
  const matches = useResource(
    "StockLookupResults",
    isin && !data.value?.listings.length
      ? `/api/v1/catalog/lookup?${new URLSearchParams({ query: isin, exchange: "NSE" })}`
      : null,
  );
  const exact =
    matches.value?.items.filter((stock) => stock.isin === isin) ?? [];
  const match = exact.length === 1 ? exact[0] : undefined;
  async function save(automatic: boolean) {
    if (auth.status !== "ready" || busy) return;
    setBusy(true);
    setError(false);
    try {
      let selected = listing || null;
      let useYahoo = estimate;
      if (automatic && match) {
        const opened = await requestContract(
          "StockLookupOpened",
          "/api/v1/catalog/lookup",
          {
            method: "POST",
            csrf: auth.session.csrf,
            body: { exchange: match.exchange, symbol: match.symbol },
          },
        );
        if (opened.listing.securityId !== row.securityId)
          throw new Error("Stock does not match this holding.");
        selected = opened.listing.listingId;
        useYahoo = true;
      }
      await requestContract("ValuationListing", `${base}/valuation/listing`, {
        method: "POST",
        csrf: auth.session.csrf,
        body: {
          securityId: row.securityId,
          listingId: selected,
          allowProviderEstimate: selected !== null && useYahoo,
        },
      });
      onSaved();
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        (failure.status === 401 || failure.status === 403)
      )
        auth.refresh();
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="settings-card"
      onSubmit={async (event) => {
        event.preventDefault();
        await save(false);
      }}
    >
      {match && (
        <button
          type="button"
          className="primary-button"
          disabled={busy}
          onClick={() => void save(true)}
        >
          Use {match.symbol} on NSE
        </button>
      )}
      <label>
        Exchange listing
        <select
          value={listing}
          onChange={(event) => {
            setListing(event.target.value);
            setEstimate(false);
          }}
        >
          <option value="">No listing selected</option>
          {data.value?.listings.map((option) => (
            <option key={option.listingId} value={option.listingId}>
              {option.exchange} · {option.symbol}
            </option>
          ))}
        </select>
      </label>
      {!data.value && <p>{data.error ?? "Loading reviewed listings…"}</p>}
      {data.value?.listings.length === 0 && !match && (
        <p>
          {matches.loading
            ? "Looking for the matching stock…"
            : "No verified listing for this holding yet."}{" "}
          <a href="#/instruments">Find a stock</a>
        </p>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          disabled={!listing}
          checked={estimate}
          onChange={(event) => setEstimate(event.target.checked)}
        />
        Allow Yahoo daily closes for current estimates. Yahoo’s price basis may
        differ from the exchange close.
      </label>
      {error && (
        <p role="alert">
          The choice couldn’t be saved. Recheck the position and listing.
        </p>
      )}
      <button
        className="primary-button"
        type="submit"
        disabled={busy || !data.value}
      >
        Save listing choice
      </button>
    </form>
  );
}

export function PortfolioValuationPanel({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  const data = useResource(
    "PortfolioValuation",
    open ? `/api/v1/portfolios/${id}/valuation` : null,
  );
  return (
    <details
      className="detail-card"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Current value across accounts</summary>
      {open && (
        <>
          <button type="button" onClick={data.reload}>
            Recalculate portfolio value
          </button>
          {data.error ? (
            <p role="alert">{data.error}</p>
          ) : !data.value ? (
            <p role="status">Calculating account totals…</p>
          ) : (
            <>
              <p>As of {data.value.asOf} (India).</p>
              <Amounts totals={data.value.totals} />
              <ul className="security-list">
                {data.value.accounts.map((account) => (
                  <li key={account.accountId}>
                    {account.name} · {account.totals.priced}/
                    {account.totals.positions} positions priced · holdings{" "}
                    {money(account.totals.holdingsValue)}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </details>
  );
}
