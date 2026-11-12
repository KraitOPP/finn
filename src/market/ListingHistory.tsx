import { useCallback, useState } from "react";
import type { CatalogueListing } from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
import { calendarDates, GapChart } from "./GapChart.tsx";
import { ListingPrices, sessionOffset } from "./ListingPrices.tsx";

export function ListingPriceDisclosure({
  listing,
}: {
  listing: CatalogueListing;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        Prices for {listing.symbol} on {listing.exchange}
      </summary>
      {open && <ListingMarketDetail listing={listing} />}
    </details>
  );
}

export function ListingMarketDetail({
  listing,
  compact = false,
}: {
  listing: CatalogueListing;
  compact?: boolean;
}) {
  const [generation, setGeneration] = useState(0);
  const updated = useCallback(() => setGeneration((value) => value + 1), []);
  return (
    <>
      <ListingPrices listing={listing} onChanged={updated} compact={compact} />
      <ListingHistory key={generation} listing={listing} compact={compact} />
    </>
  );
}

function ListingHistory({
  listing,
  compact,
}: {
  listing: CatalogueListing;
  compact: boolean;
}) {
  const [period, setPeriod] = useState("14");
  const [basis, setBasis] = useState(
    listing.providerSymbol ? "YAHOO_YFINANCE" : "MANUAL_REVIEWED",
  );
  const start = sessionOffset(-Number(period));
  const endExclusive = sessionOffset(0);
  const params = new URLSearchParams({ start, endExclusive });
  const data = useResource(
    "PrivateCloseHistory",
    `/api/v1/market/listings/${listing.listingId}/history?${params}`,
  );
  const observations = new Map(
    data.value?.observations
      .filter((price) => price.source === basis)
      .map((price) => [price.sessionDate, price]),
  );
  const days = calendarDates(start, endExclusive);
  const label =
    basis === "YAHOO_YFINANCE"
      ? "Yahoo closes (provider basis)"
      : "Reviewed as-reported closes";
  return (
    <section
      className="detail-card"
      aria-label={`${listing.symbol} price history`}
    >
      <h3>Price history</h3>
      {!compact && (
        <div className="market-filters">
          <label>
            Price period{" "}
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
          <label>
            Price source{" "}
            <select
              value={basis}
              onChange={(event) => setBasis(event.target.value)}
            >
              <option value="YAHOO_YFINANCE">Yahoo daily closes</option>
              <option value="MANUAL_REVIEWED">Reviewed exchange closes</option>
            </select>
          </label>
          <button type="button" onClick={data.reload}>
            Update chart from saved prices
          </button>
        </div>
      )}
      {!compact && (
        <p className="muted-copy">
          Sources are charted separately. A gap can mean no trading session, no
          coverage or no saved close.
        </p>
      )}
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading price history…</p>
      ) : observations.size === 0 ? (
        <p>No daily closes in this window yet.</p>
      ) : (
        <>
          <GapChart
            label={label}
            points={days.map((date) => ({
              date,
              amount: observations.get(date)?.close ?? null,
            }))}
          />
          <details>
            <summary>View exact prices by date</summary>
            <section
              className="market-table"
              aria-label="Closing prices by date"
            >
              <table>
                <caption>{label}</caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Close (INR)</th>
                    <th scope="col">Source reference</th>
                  </tr>
                </thead>
                <tbody>
                  {days.map((date) => (
                    <tr key={date}>
                      <th scope="row">{date}</th>
                      <td>{observations.get(date)?.close ?? "Unavailable"}</td>
                      <td>{observations.get(date)?.sourceReference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </details>
        </>
      )}
    </section>
  );
}
