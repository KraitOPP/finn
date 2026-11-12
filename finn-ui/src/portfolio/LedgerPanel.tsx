import { type FormEvent, useRef, useState } from "react";
import type {
  LedgerCorrectInput,
  LedgerEntryInput,
  LedgerEventView,
  LedgerRecordInput,
  LedgerReverseInput,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { useDisplayInstant } from "../preferences/PreferencesProvider.tsx";
import { LedgerExport } from "./LedgerExport.tsx";

const labels: Record<LedgerEventView["kind"], string> = {
  BUY: "Buy",
  SELL: "Sell",
  FEE: "Fee",
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  OPENING_POSITION: "Opening holding",
  OPENING_CASH: "Opening cash",
  SPLIT: "Split",
  BONUS: "Bonus shares",
  DIVIDEND: "Dividend credit",
  REVERSAL: "Reversal",
};
const kinds: LedgerEntryInput["kind"][] = [
  "BUY",
  "SELL",
  "FEE",
  "DEPOSIT",
  "WITHDRAWAL",
  "OPENING_POSITION",
  "OPENING_CASH",
];
const manualKind = (
  kind: LedgerEventView["kind"],
): kind is LedgerEntryInput["kind"] => kinds.some((value) => value === kind);
const money = (value: string | null) =>
  value === null ? "Unavailable" : `INR ${value}`;
const today = () => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((part) => part.type === type)?.value)
    .join("-");
};
type Draft = LedgerEntryInput;
type Pending = {
  path: string;
  body: LedgerRecordInput | LedgerReverseInput | LedgerCorrectInput;
  entry: Draft | null;
  original: LedgerEventView | null;
};
const basisLabels = {
  RECORDED_TRADES: "Recorded trade costs",
  REPORTED_OPENING_COST: "Reported opening cost",
  MIXED_RECORDED_COST: "Opening and recorded trade costs",
  UNKNOWN: "Cost incomplete",
};
const warningLabels: Record<string, string> = {
  STARTING_CASH_UNKNOWN:
    "Starting cash is unknown. Recorded movements don’t establish a balance.",
  HOLDINGS_SNAPSHOT_IS_NOT_TRADE_HISTORY:
    "Opening holdings establish units on the report date. They don’t establish purchase dates or earlier returns.",
  HISTORICAL_FEES_UNKNOWN: "Fees before opening holdings are unknown.",
  RECORDED_TRADE_FEES_UNKNOWN: "Some recorded trade fees are unknown.",
  REALISED_PNL_INCOMPLETE:
    "Realised gains are incomplete because a sale lacks cost or fee information.",
  RECORDED_COST_UNKNOWN: "Some holdings have unknown recorded cost.",
  RECORDED_CASH_NEGATIVE_REVIEW_REQUIRED:
    "Recorded cash is negative. Check for missing cash movements or an incorrect starting balance.",
  COMPLETE_HISTORICAL_RETURNS_UNAVAILABLE:
    "Complete historical returns are unavailable for these records.",
};

export function LedgerPanel({
  base,
  archived,
  onSaved,
}: {
  base: string;
  archived: boolean;
  onSaved: (message: string) => void;
}) {
  const auth = useAuthentication();
  const displayInstant = useDisplayInstant();
  const ledger = useResource("LedgerView", `${base}/ledger`);
  const [before, setBefore] = useState<number | null>(null);
  const journal = useResource(
    "LedgerPage",
    `${base}/transactions${before === null ? "" : `?before=${before}`}`,
  );
  const [editor, setEditor] = useState<"NEW" | LedgerEventView | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [failure, setFailure] = useState<{
    message: string;
    uncertain: boolean;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const submit = async () => {
    if (
      !pending ||
      archived ||
      inFlight.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    inFlight.current = true;
    setBusy(true);
    setFailure(null);
    try {
      const receipt = await requestContract("LedgerReceipt", pending.path, {
        method: "POST",
        body: pending.body,
        csrf: auth.session.csrf,
      });
      setPending(null);
      setEditor(null);
      setBefore(null);
      ledger.reload();
      journal.reload();
      onSaved(
        receipt.replayed
          ? "This record was already saved. No duplicate was added."
          : pending.original
            ? "Correction recorded. The original remains in history."
            : "Ledger entry recorded.",
      );
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setFailure({
        message:
          error instanceof ApiError
            ? error.message
            : "We couldn’t confirm whether the record was saved. Retry this same submission or check your history.",
        uncertain:
          !(error instanceof ApiError) ||
          error.status >= 500 ||
          error.code === "IDEMPOTENCY_CONFLICT",
      });
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const prepare = (entry: Draft) => {
    setFailure(null);
    const idempotencyKey = crypto.randomUUID();
    if (editor && editor !== "NEW")
      setPending({
        path: `${base}/transactions/${editor.eventId}/correct`,
        body: { idempotencyKey, replacement: entry, reference: null },
        entry,
        original: editor,
      });
    else
      setPending({
        path: `${base}/transactions`,
        body: { idempotencyKey, event: entry },
        entry,
        original: null,
      });
  };
  const reverse = (original: LedgerEventView) => {
    setEditor(null);
    setFailure(null);
    setPending({
      path: `${base}/transactions/${original.eventId}/reverse`,
      body: { idempotencyKey: crypto.randomUUID(), reference: null },
      entry: null,
      original,
    });
  };
  return (
    <div className="ledger-workspace">
      <h3>Ledger & holdings</h3>
      {ledger.error ? (
        <div role="alert">
          <p>{ledger.error}</p>
          <button type="button" onClick={ledger.reload}>
            Reload ledger
          </button>
        </div>
      ) : !ledger.value ? (
        <p role="status">Loading ledger…</p>
      ) : ledger.value.revision === 0 ? (
        <p>
          No entries yet. Record a transaction or review an opening balance to
          begin.
        </p>
      ) : (
        <>
          <dl className="ledger-totals">
            <div>
              <dt>Recorded cash balance</dt>
              <dd>{money(ledger.value.cashBalance)}</dd>
            </div>
            <div>
              <dt>Recorded realised gain/loss</dt>
              <dd>{money(ledger.value.realisedPnl)}</dd>
            </div>
            <div>
              <dt>Recorded fees</dt>
              <dd>
                {money(ledger.value.recordedFees)}
                {ledger.value.recordedFeesComplete ? "" : " · incomplete"}
              </dd>
            </div>
            <div>
              <dt>Net deposits and withdrawals</dt>
              <dd>{money(ledger.value.netContributions)}</dd>
            </div>
            <div>
              <dt>Recorded dividends</dt>
              <dd>{money(ledger.value.recordedDividends)}</dd>
            </div>
          </dl>
          {ledger.value.positions.length === 0 ? (
            <p>No open holdings in the recorded history.</p>
          ) : (
            <div className="data-table">
              <table>
                <caption>Open holdings by security</caption>
                <thead>
                  <tr>
                    <th scope="col">Security</th>
                    <th scope="col">Units</th>
                    <th scope="col">Recorded cost</th>
                    <th scope="col">Cost per unit</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.value.positions.map((position) => (
                    <tr key={position.securityId}>
                      <th scope="row">
                        {position.securityName ?? "Unresolved security"}
                        {position.securityName && (
                          <small>
                            <a
                              href={`#/research?security=${encodeURIComponent(position.securityId)}`}
                            >
                              Research thesis
                            </a>
                          </small>
                        )}
                      </th>
                      <td>{position.quantity}</td>
                      <td>
                        {money(position.recordedCost)}
                        <small>{basisLabels[position.costBasis]}</small>
                      </td>
                      <td>{money(position.averageCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <details>
            <summary>Accounting coverage</summary>
            <p>
              Moving weighted-average recorded cost. Holdings are grouped by
              security across exchanges. This view doesn’t apply market prices
              or calculate tax lots.
            </p>
            <p>
              {ledger.value.coverageStart
                ? `Recorded equity coverage starts ${ledger.value.coverageStart}.`
                : "Equity history coverage is unknown."}
            </p>
            <ul>
              {ledger.value.warnings.map((warning) => (
                <li key={warning}>
                  {warningLabels[warning] ??
                    "Review coverage before using these figures."}
                </li>
              ))}
            </ul>
          </details>
          <LedgerExport base={base} revision={ledger.value.revision} />
        </>
      )}
      {!archived && !editor && !pending && (
        <button
          type="button"
          className="primary-button"
          onClick={() => setEditor("NEW")}
        >
          Record an entry
        </button>
      )}
      {!archived && editor && (
        <div hidden={pending !== null}>
          <EntryForm
            key={editor === "NEW" ? "new" : editor.eventId}
            original={editor === "NEW" ? null : editor}
            onReview={prepare}
            onCancel={() => setEditor(null)}
          />
        </div>
      )}
      {!archived && pending && (
        <section className="review-card" aria-label="Review ledger entry">
          <h4>
            {pending.original
              ? pending.entry
                ? "Review replacement"
                : "Review reversal"
              : "Review ledger entry"}
          </h4>
          {pending.original && (
            <p>
              Original record #{pending.original.sequence} (
              {labels[pending.original.kind]}, {pending.original.effectiveDate})
              will remain visible. Later records will be recalculated.
            </p>
          )}
          {pending.entry ? (
            <>
              <p>
                <strong>{labels[pending.entry.kind]}</strong> ·{" "}
                {pending.entry.effectiveDate}
              </p>
              <EntryEffect entry={pending.entry} />
            </>
          ) : (
            <p>
              This removes the original record’s effect. FINN will reject the
              reversal if it makes a later balance invalid.
            </p>
          )}
          <p className="field-help">
            This records portfolio history. It does not place an order.
          </p>
          {failure && <p role="alert">{failure.message}</p>}
          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              disabled={busy}
              onClick={submit}
            >
              {busy
                ? "Recording…"
                : failure
                  ? "Retry same submission"
                  : "Confirm record"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (failure?.uncertain) {
                  setEditor(null);
                  setBefore(null);
                  journal.reload();
                  ledger.reload();
                }
                setPending(null);
                setFailure(null);
              }}
            >
              {failure?.uncertain ? "Close and check history" : "Back"}
            </button>
          </div>
        </section>
      )}
      <h4>Transaction history</h4>
      <p className="field-help">
        Newest recorded first. Effective dates and recording times are shown
        separately.
      </p>
      {journal.error ? (
        <div role="alert">
          <p>{journal.error}</p>
          <button type="button" onClick={journal.reload}>
            Reload history
          </button>
        </div>
      ) : !journal.value ? (
        <p role="status">Loading transaction history…</p>
      ) : journal.value.items.length === 0 ? (
        <p>No recorded transactions.</p>
      ) : (
        <>
          <div className="data-table">
            <table>
              <caption>Immutable account journal</caption>
              <thead>
                <tr>
                  <th scope="col">Record</th>
                  <th scope="col">Security or cash</th>
                  <th scope="col">Amounts</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {journal.value.items.map((event) => (
                  <tr key={event.eventId}>
                    <th scope="row">
                      #{event.sequence} · {labels[event.kind]}
                      <small>Effective {event.effectiveDate}</small>
                      <small>
                        Recorded{" "}
                        <time dateTime={event.recordedAt}>
                          {displayInstant(event.recordedAt)}
                        </time>
                      </small>
                    </th>
                    <td>
                      {event.securityName ??
                        (event.kind === "REVERSAL"
                          ? "Linked correction"
                          : "Cash account")}
                      {event.securityId && (
                        <small>
                          {event.exchange ?? "Exchange not recorded"}
                        </small>
                      )}
                      {event.reference && <small>{event.reference}</small>}
                    </td>
                    <td>
                      {event.quantity && <span>{event.quantity} units</span>}
                      {event.ratioNumerator !== null && (
                        <small>
                          Ratio: {event.ratioNumerator}:{event.ratioDenominator}
                        </small>
                      )}
                      {event.price && (
                        <small>{money(event.price)} per unit</small>
                      )}
                      {event.amount !== null && (
                        <small>{money(event.amount)}</small>
                      )}
                      {(event.kind === "BUY" || event.kind === "SELL") && (
                        <small>
                          Fees:{" "}
                          {event.fees === null ? "unknown" : money(event.fees)}
                        </small>
                      )}
                    </td>
                    <td>
                      {event.reversedBy
                        ? "Reversed · original retained"
                        : event.reversalOf
                          ? "Reversal recorded"
                          : event.replacesEventId
                            ? "Replacement recorded"
                            : "Recorded"}
                      {event.source === "GROWW_HOLDINGS" && (
                        <small>Groww holdings snapshot</small>
                      )}
                      {!archived &&
                        !pending &&
                        !editor &&
                        !event.reversedBy &&
                        event.kind !== "REVERSAL" && (
                          <div className="journal-actions">
                            {manualKind(event.kind) && (
                              <button
                                className="text-button"
                                type="button"
                                onClick={() => setEditor(event)}
                              >
                                Review correction
                              </button>
                            )}
                            <button
                              className="text-button"
                              type="button"
                              onClick={() => reverse(event)}
                            >
                              Review reversal
                            </button>
                          </div>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button
              type="button"
              disabled={before === null}
              onClick={() => setBefore(null)}
            >
              Newest
            </button>
            <button
              type="button"
              disabled={journal.value.nextBefore === null}
              onClick={() => setBefore(journal.value?.nextBefore ?? null)}
            >
              Older records
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function EntryEffect({ entry }: { entry: Draft }) {
  if (entry.kind === "BUY" || entry.kind === "SELL")
    return (
      <p>
        {entry.kind === "BUY" ? "Adds" : "Removes"} {entry.quantity} units at{" "}
        {money(entry.price)} per unit.{" "}
        {entry.kind === "BUY"
          ? "Cash decreases by the purchase amount and fees."
          : "The cash effect is the sale amount less fees."}{" "}
        {entry.fees === null
          ? "Fees are unknown, so the full cash effect is unavailable."
          : `Recorded fees: ${money(entry.fees)}.`}
      </p>
    );
  if (entry.kind === "OPENING_POSITION")
    return (
      <p>
        Establishes {entry.quantity} units at the close of this date.{" "}
        {entry.amount === null
          ? "Starting cost is unknown."
          : `Reported total starting cost: ${money(entry.amount)}.`}{" "}
        No historical purchase is created.
      </p>
    );
  if (entry.kind === "OPENING_CASH")
    return (
      <p>
        Sets a recorded closing cash baseline of {money(entry.amount)}. It does
        not count as a deposit or gain.
      </p>
    );
  return (
    <p>
      {entry.kind === "DEPOSIT" ? "Adds" : "Removes"} {money(entry.amount)} in
      recorded cash.{" "}
      {entry.kind === "FEE"
        ? "This is a separate fee."
        : "This movement does not count as a gain or loss."}
    </p>
  );
}

function EntryForm({
  original,
  onReview,
  onCancel,
}: {
  original: LedgerEventView | null;
  onReview: (entry: Draft) => void;
  onCancel: () => void;
}) {
  const [entry, setEntry] = useState<Draft>({
    kind: original?.kind && manualKind(original.kind) ? original.kind : "BUY",
    effectiveDate: original?.effectiveDate ?? today(),
    securityId: original?.securityId ?? null,
    listingId: original?.listingId ?? null,
    quantity: original?.quantity ?? null,
    price: original?.price ?? null,
    amount: original?.amount ?? null,
    fees: original?.fees ?? null,
    reference: original?.reference ?? null,
  });
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const trade = entry.kind === "BUY" || entry.kind === "SELL";
  const holding = entry.kind === "OPENING_POSITION";
  const securities = useResource(
    "CatalogueSecurityPage",
    trade || holding
      ? `/api/v1/catalog/securities?${new URLSearchParams({ query: search, limit: "100" })}`
      : null,
  );
  const listing = useResource(
    "CatalogueSecurityDetail",
    (trade || holding) && entry.securityId
      ? `/api/v1/catalog/securities/${entry.securityId}`
      : null,
  );
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setEntry((previous) => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onReview({
      ...entry,
      securityId: trade || holding ? entry.securityId : null,
      listingId: trade || holding ? entry.listingId : null,
      quantity: trade || holding ? entry.quantity : null,
      price: trade ? entry.price : null,
      fees: trade ? entry.fees : null,
      amount: trade ? null : entry.amount,
    });
  };
  const decimal = "(?:0|[1-9][0-9]{0,21})(?:\\.[0-9]{1,8})?";
  return (
    <form className="settings-card entry-form" onSubmit={submit}>
      <h4>
        {original
          ? `Replace record #${original.sequence}`
          : "Record an investment entry"}
      </h4>
      <p className="field-help">
        Enter an existing transaction or reviewed opening balance. This is
        record keeping.
      </p>
      <label htmlFor="entry-kind">Entry type</label>
      <select
        id="entry-kind"
        value={entry.kind}
        onChange={(event) => set("kind", event.target.value as Draft["kind"])}
      >
        {kinds.map((kind) => (
          <option value={kind} key={kind}>
            {labels[kind]}
          </option>
        ))}
      </select>
      <label htmlFor="entry-date">Effective date</label>
      <input
        type="date"
        id="entry-date"
        max={today()}
        value={entry.effectiveDate}
        onChange={(event) => set("effectiveDate", event.target.value)}
        required
      />
      {(trade || holding) && (
        <>
          <label htmlFor="entry-search">Find a saved security</label>
          <div className="form-actions">
            <input
              id="entry-search"
              value={query}
              maxLength={100}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={() => setSearch(query)}>
              Search catalogue
            </button>
          </div>
          {securities.error && (
            <p role="alert">
              {securities.error}{" "}
              <button type="button" onClick={securities.reload}>
                Retry search
              </button>
            </p>
          )}
          <label htmlFor="entry-security">Security</label>
          <select
            id="entry-security"
            required
            value={entry.securityId ?? ""}
            onChange={(event) =>
              setEntry((previous) => ({
                ...previous,
                securityId: event.target.value || null,
                listingId: null,
              }))
            }
          >
            <option value="">Choose a security</option>
            {securities.value?.items.map((value) => (
              <option value={value.securityId} key={value.securityId}>
                {value.name} {value.isin ? `· ${value.isin}` : ""}
              </option>
            ))}
            {entry.securityId &&
              !securities.value?.items.some(
                (item) => item.securityId === entry.securityId,
              ) && (
                <option value={entry.securityId}>
                  {listing.value?.security.name ??
                    original?.securityName ??
                    "Selected security"}
                </option>
              )}
          </select>
          <p className="field-help">
            Search your saved catalogue.{" "}
            <a href="#/instruments">Add or review a security</a> if it is
            missing.
          </p>
          <label htmlFor="entry-listing">Exchange listing (optional)</label>
          <select
            id="entry-listing"
            value={entry.listingId ?? ""}
            onChange={(event) => set("listingId", event.target.value || null)}
          >
            <option value="">Exchange not recorded</option>
            {listing.value?.listings.map((value) => (
              <option value={value.listingId} key={value.listingId}>
                {value.exchange} · {value.symbol}
              </option>
            ))}
            {entry.listingId &&
              !listing.value?.listings.some(
                (value) => value.listingId === entry.listingId,
              ) && (
                <option value={entry.listingId}>
                  {original?.exchange ?? "Recorded exchange"}
                </option>
              )}
          </select>
          <label htmlFor="entry-quantity">Whole units</label>
          <input
            id="entry-quantity"
            inputMode="numeric"
            pattern="[1-9][0-9]{0,12}"
            value={entry.quantity ?? ""}
            onChange={(event) => set("quantity", event.target.value || null)}
            required
          />
        </>
      )}
      {trade ? (
        <>
          <label htmlFor="entry-price">Price per unit (INR)</label>
          <input
            id="entry-price"
            inputMode="decimal"
            pattern={decimal}
            value={entry.price ?? ""}
            onChange={(event) => set("price", event.target.value || null)}
            required
          />
          <label htmlFor="entry-fees">Trade fees (INR)</label>
          <input
            id="entry-fees"
            inputMode="decimal"
            pattern={decimal}
            value={entry.fees ?? ""}
            onChange={(event) => set("fees", event.target.value || null)}
          />
          <p className="field-help">
            Leave blank if unknown. Enter 0 only if you know there were no fees.
          </p>
        </>
      ) : (
        <>
          <label htmlFor="entry-amount">
            {holding
              ? "Reported total opening cost (INR, optional)"
              : entry.kind === "OPENING_CASH"
                ? "Closing cash baseline (INR)"
                : "Amount (INR)"}
          </label>
          <input
            id="entry-amount"
            inputMode="decimal"
            pattern={decimal}
            value={entry.amount ?? ""}
            onChange={(event) => set("amount", event.target.value || null)}
            required={!holding}
          />
        </>
      )}
      <label htmlFor="entry-reference">Note (optional)</label>
      <input
        id="entry-reference"
        maxLength={120}
        value={entry.reference ?? ""}
        onChange={(event) => set("reference", event.target.value || null)}
      />
      <div className="form-actions">
        <button type="submit" className="primary-button">
          Review entry
        </button>
        <button type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
