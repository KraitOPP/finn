import { useState } from "react";
import type { WatchlistItem } from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { ListingPicker } from "../instruments/ListingPicker.tsx";
import { RouteHeading } from "../Navigation.tsx";
import { DataStatus } from "./DataStatus.tsx";
import { ListingMarketDetail } from "./ListingHistory.tsx";
import { PriceSource } from "./ListingPrices.tsx";

export function Watchlists() {
  const auth = useAuthentication();
  const lists = useResource("WatchlistIndex", "/api/v1/watchlists");
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <section className="workspace-section">
      <RouteHeading>Watchlists</RouteHeading>
      <DataStatus />
      <p className="muted-copy">
        Follow reviewed exchange listings, even if you don’t own the stocks.
        Prices are saved daily closes with their source and date.
      </p>
      <form
        className="settings-card"
        onSubmit={async (event) => {
          event.preventDefault();
          if (busy || auth.status !== "ready") return;
          setBusy(true);
          setError("");
          try {
            const result = await requestContract(
              "WatchlistSummary",
              "/api/v1/watchlists",
              {
                method: "POST",
                body: { name },
                csrf: auth.session.csrf,
              },
            );
            setName("");
            setSelected(result.watchlistId);
            lists.reload();
          } catch (error) {
            if (
              error instanceof ApiError &&
              (error.status === 401 || error.status === 403)
            )
              auth.refresh();
            setError(
              "Couldn’t create the watchlist. Check its name and try again.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Watchlist name{" "}
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            required
          />
        </label>
        <button className="primary-button" type="submit" disabled={busy}>
          Create watchlist
        </button>
      </form>
      {error && <p role="alert">{error}</p>}
      {lists.error ? (
        <p role="alert">
          {lists.error}{" "}
          <button type="button" onClick={lists.reload}>
            Try again
          </button>
        </p>
      ) : !lists.value ? (
        <p role="status">Loading watchlists…</p>
      ) : lists.value.items.length === 0 ? (
        <p>Create a watchlist to start following exchange listings.</p>
      ) : (
        <ul className="security-list">
          {lists.value.items.map((list) => (
            <li key={list.watchlistId}>
              <button
                className="text-button"
                type="button"
                aria-pressed={selected === list.watchlistId}
                onClick={() => setSelected(list.watchlistId)}
              >
                Open {list.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && <WatchlistDetails key={selected} id={selected} />}
    </section>
  );
}

function WatchlistDetails({ id }: { id: string }) {
  const auth = useAuthentication();
  const path = `/api/v1/watchlists/${id}`;
  const data = useResource("WatchlistDetail", path);
  const [detail, setDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function track(listingId: string, tracked: boolean) {
    if (busy || auth.status !== "ready") return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestContract("WatchlistDetail", `${path}/items`, {
        method: "POST",
        csrf: auth.session.csrf,
        body: { listingId, tracked },
      });
      if (!tracked && listingId === detail) setDetail(null);
      setNotice(
        tracked ? "Listing saved to this watchlist." : "Listing removed.",
      );
      data.reload();
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        "Couldn’t update the watchlist. Check the listing and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const open = data.value?.items.find((item) => item.listingId === detail);
  return (
    <section className="detail-card">
      {data.value && <h2>{data.value.watchlist.name}</h2>}
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {data.error ? (
        <p role="alert">
          {data.error}{" "}
          <button type="button" onClick={data.reload}>
            Try again
          </button>
        </p>
      ) : !data.value ? (
        <p role="status">Loading tracked listings…</p>
      ) : (
        <>
          <button type="button" onClick={data.reload}>
            Reload saved closes
          </button>
          {data.value.items.length === 0 ? (
            <p>No listings tracked yet.</p>
          ) : (
            <ul className="security-list">
              {data.value.items.map((item) => (
                <li key={item.listingId}>
                  <div>
                    <strong>
                      {item.securityName} · {item.exchange} · {item.symbol}
                    </strong>
                    {item.latest ? (
                      <p>
                        ₹{item.latest.close} ·{" "}
                        <PriceSource price={item.latest} />
                      </p>
                    ) : (
                      <p>
                        No saved close. Open the listing to see its available
                        sources.
                      </p>
                    )}
                    <button
                      className="text-button"
                      type="button"
                      aria-expanded={detail === item.listingId}
                      onClick={() =>
                        setDetail(
                          detail === item.listingId ? null : item.listingId,
                        )
                      }
                    >
                      Details for {item.symbol} on {item.exchange}
                    </button>{" "}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void track(item.listingId, false)}
                    >
                      Remove {item.symbol} on {item.exchange}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {open && <WatchedListing key={open.listingId} item={open} />}
      <ListingPicker
        busy={busy}
        summary="Add a listing to this watchlist"
        action="Track"
        onChoose={(listing) => void track(listing.listingId, true)}
      />
    </section>
  );
}

function WatchedListing({ item }: { item: WatchlistItem }) {
  const data = useResource(
    "CatalogueSecurityDetail",
    `/api/v1/catalog/securities/${item.securityId}`,
  );
  const listing = data.value?.listings.find(
    (value) => value.listingId === item.listingId,
  );
  return (
    <section
      className="detail-card"
      aria-label={`${item.symbol} on ${item.exchange} details`}
    >
      <h3>
        {item.securityName} · {item.exchange} · {item.symbol}
      </h3>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading the listing…</p>
      ) : listing ? (
        <>
          <p>
            INR · series/group {listing.series} · Yahoo mapping{" "}
            {listing.providerSymbol ?? "not confirmed"}.
          </p>
          <ListingMarketDetail listing={listing} />
        </>
      ) : (
        <p>This listing’s details are unavailable.</p>
      )}
    </section>
  );
}
