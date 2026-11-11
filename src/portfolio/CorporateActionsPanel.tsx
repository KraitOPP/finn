import { type FormEvent, useRef, useState } from "react";
import type {
  CorporateActionEffect,
  CorporateActionInput,
  CorporateActionRecord,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";

const labels: Record<CorporateActionInput["type"], string> = {
  SPLIT: "Split",
  BONUS: "Bonus shares",
  DIVIDEND: "Dividend credit",
  SYMBOL_CHANGE: "Symbol change",
  MERGER: "Merger",
  DEMERGER: "Demerger",
  RIGHTS: "Rights issue",
};
const reasons: Record<string, string> = {
  UNSUPPORTED_COMPLEX_ACTION:
    "This action needs manual review. It cannot change the ledger automatically.",
  FRACTIONAL_ACTION_UNSUPPORTED:
    "This ratio produces fractional units. Review the official allocation or cash-in-lieu before recording any change.",
  NO_ELIGIBLE_UNITS: "No eligible prior units are recorded for this date.",
};
const empty: CorporateActionInput = {
  type: "SPLIT",
  securityId: "",
  listingId: null,
  effectiveDate: "",
  ratioNumerator: null,
  ratioDenominator: null,
  netCash: null,
  sourceReference: "",
  sourceUrl: null,
  newSymbol: null,
  newProviderSymbol: null,
  correctsActionId: null,
};

export function CorporateActionsPanel({
  base,
  archived,
  onRecorded,
}: {
  base: string;
  archived: boolean;
  onRecorded: (record: CorporateActionRecord) => void;
}) {
  const path = `${base}/corporate-actions`,
    auth = useAuthentication();
  const records = useResource("CorporateActionList", path);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(empty);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [review, setReview] = useState<{
    action: CorporateActionInput;
    effect: CorporateActionEffect;
  } | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pending = useRef(false);
  const securities = useResource(
    "CatalogueSecurityPage",
    editing
      ? `/api/v1/catalog/securities?${new URLSearchParams({ query: search, limit: "100" })}`
      : null,
  );
  const detail = useResource(
    "CatalogueSecurityDetail",
    editing && draft.securityId
      ? `/api/v1/catalog/securities/${draft.securityId}`
      : null,
  );
  const unit = draft.type === "SPLIT" || draft.type === "BONUS",
    symbol = draft.type === "SYMBOL_CHANGE";
  const set = <K extends keyof CorporateActionInput>(
    key: K,
    value: CorporateActionInput[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));
  const safeError = (failure: unknown) => {
    if (
      failure instanceof ApiError &&
      (failure.status === 401 || failure.status === 403)
    )
      auth.refresh();
    setError(
      failure instanceof ApiError
        ? failure.message
        : "We couldn’t confirm this request. Retry with the same source reference.",
    );
  };
  const prepare = async (event: FormEvent) => {
    event.preventDefault();
    if (
      pending.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    const action = {
      ...draft,
      listingId: symbol ? draft.listingId : null,
      ratioNumerator: unit ? draft.ratioNumerator : null,
      ratioDenominator: unit ? draft.ratioDenominator : null,
      netCash: draft.type === "DIVIDEND" ? draft.netCash : null,
      newSymbol: symbol ? draft.newSymbol : null,
      newProviderSymbol: symbol ? draft.newProviderSymbol : null,
    };
    pending.current = true;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const effect = await requestContract(
        "CorporateActionEffect",
        `${path}/preview`,
        { method: "POST", body: action, csrf: auth.session.csrf },
      );
      setReview({ action, effect });
      setChecked(false);
    } catch (error) {
      safeError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const record = async () => {
    if (
      !review ||
      !checked ||
      pending.current ||
      archived ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await requestContract("CorporateActionRecord", path, {
        method: "POST",
        csrf: auth.session.csrf,
        body: {
          action: review.action,
          reviewed: true,
          expectedLedgerRevision: review.effect.ledgerRevision,
        },
      });
      setReview(null);
      setEditing(false);
      setDraft(empty);
      setNotice(
        result.state === "NEEDS_REVIEW"
          ? "Saved for manual review. The ledger did not change."
          : "Reviewed corporate action saved.",
      );
      records.reload();
      onRecorded(result);
    } catch (error) {
      safeError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="import-workspace" aria-label="Corporate actions">
      <h3>Corporate actions</h3>
      <p className="field-help">
        Record an action you have verified from its announcement or cash
        statement. This does not fetch or verify external notices.
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {records.error ? (
        <p role="alert">
          {records.error}{" "}
          <button type="button" onClick={records.reload}>
            Reload actions
          </button>
        </p>
      ) : !records.value ? (
        <p role="status">Loading corporate actions…</p>
      ) : records.value.items.length === 0 ? (
        <p>No reviewed actions yet.</p>
      ) : (
        <ul className="security-list">
          {records.value.items.map((item) => (
            <li key={item.actionId}>
              <div>
                <strong>
                  {item.securityName} · {labels[item.action.type]}
                </strong>
                <p>
                  {item.action.effectiveDate} ·{" "}
                  {item.state === "NEEDS_REVIEW"
                    ? "Manual review"
                    : item.state === "REVERSED"
                      ? "Reversed in journal"
                      : "Applied"}{" "}
                  · {item.action.sourceReference}
                </p>
                {item.action.sourceUrl && <p>{item.action.sourceUrl}</p>}
                {item.action.correctsActionId && <p>Linked correction</p>}
                <Effects effect={item.effect} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {!archived && !editing && (
        <button
          type="button"
          className="text-button"
          onClick={() => setEditing(true)}
        >
          Review a corporate action
        </button>
      )}
      {!archived && editing && !review && (
        <form className="settings-card" onSubmit={prepare}>
          <h4>Propose an action</h4>
          <label htmlFor="action-kind">Action type</label>
          <select
            id="action-kind"
            value={draft.type}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                type: event.target.value as CorporateActionInput["type"],
                correctsActionId: null,
              }))
            }
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor="action-search">Find a saved security</label>
          <div className="form-actions">
            <input
              id="action-search"
              maxLength={100}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="button" onClick={() => setSearch(query)}>
              Search securities
            </button>
          </div>
          {securities.error && <p role="alert">{securities.error}</p>}
          <label htmlFor="action-security">Security</label>
          <select
            id="action-security"
            required
            value={draft.securityId}
            onChange={(event) =>
              setDraft((previous) => ({
                ...previous,
                securityId: event.target.value,
                listingId: null,
                correctsActionId: null,
              }))
            }
          >
            <option value="">Choose a security</option>
            {securities.value?.items.map((item) => (
              <option key={item.securityId} value={item.securityId}>
                {item.name}
              </option>
            ))}
            {draft.securityId &&
              !securities.value?.items.some(
                (item) => item.securityId === draft.securityId,
              ) && (
                <option value={draft.securityId}>
                  {detail.value?.security.name ?? "Selected security"}
                </option>
              )}
          </select>
          <label htmlFor="action-date">
            {draft.type === "DIVIDEND" ? "Cash credit date" : "Effective date"}
          </label>
          <input
            type="date"
            id="action-date"
            required
            value={draft.effectiveDate}
            onChange={(event) => set("effectiveDate", event.target.value)}
          />
          {unit && (
            <>
              <p className="field-help">
                {draft.type === "SPLIT"
                  ? "Enter new total units per old units, such as 2 for every 1."
                  : "Enter additional bonus units per existing units, such as 1 for every 2."}
              </p>
              <label htmlFor="action-numerator">Ratio numerator</label>
              <input
                type="number"
                id="action-numerator"
                min={1}
                max={1000000}
                step={1}
                required
                value={draft.ratioNumerator ?? ""}
                onChange={(event) =>
                  set(
                    "ratioNumerator",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              />
              <label htmlFor="action-denominator">Ratio denominator</label>
              <input
                type="number"
                id="action-denominator"
                min={1}
                max={1000000}
                step={1}
                required
                value={draft.ratioDenominator ?? ""}
                onChange={(event) =>
                  set(
                    "ratioDenominator",
                    event.target.value ? Number(event.target.value) : null,
                  )
                }
              />
            </>
          )}
          {draft.type === "DIVIDEND" && (
            <>
              <label htmlFor="action-cash">Net credited cash (INR)</label>
              <input
                id="action-cash"
                inputMode="decimal"
                maxLength={31}
                required
                value={draft.netCash ?? ""}
                onChange={(event) => set("netCash", event.target.value || null)}
              />
              <p className="field-help">
                Enter the amount actually credited. FINN does not infer
                entitlement or taxes.
              </p>
            </>
          )}
          {symbol && (
            <>
              <label htmlFor="action-listing">Existing exchange listing</label>
              <select
                id="action-listing"
                required
                value={draft.listingId ?? ""}
                onChange={(event) =>
                  set("listingId", event.target.value || null)
                }
              >
                <option value="">Choose a listing</option>
                {detail.value?.listings.map((item) => (
                  <option key={item.listingId} value={item.listingId}>
                    {item.exchange} · {item.symbol}
                  </option>
                ))}
              </select>
              <label htmlFor="action-symbol">New exchange symbol</label>
              <input
                id="action-symbol"
                maxLength={64}
                required
                value={draft.newSymbol ?? ""}
                onChange={(event) =>
                  set("newSymbol", event.target.value.toUpperCase() || null)
                }
              />
              <label htmlFor="action-provider">
                New Yahoo mapping (optional)
              </label>
              <input
                id="action-provider"
                maxLength={72}
                value={draft.newProviderSymbol ?? ""}
                onChange={(event) =>
                  set(
                    "newProviderSymbol",
                    event.target.value.toUpperCase() || null,
                  )
                }
              />
              <p className="field-help">
                This updates the saved listing for your workspace and retains
                its history.
              </p>
            </>
          )}
          <label htmlFor="action-reference">Source reference</label>
          <input
            id="action-reference"
            maxLength={64}
            required
            value={draft.sourceReference}
            onChange={(event) => set("sourceReference", event.target.value)}
          />
          <p className="field-help">
            Use a stable announcement or cash entry reference, with letters,
            numbers, dots, colons, underscores or hyphens.
          </p>
          <label htmlFor="action-url">Evidence URL (optional HTTPS)</label>
          <input
            id="action-url"
            type="url"
            maxLength={512}
            value={draft.sourceUrl ?? ""}
            onChange={(event) => set("sourceUrl", event.target.value || null)}
          />
          <label htmlFor="action-correction">
            Prior action corrected (optional)
          </label>
          <select
            id="action-correction"
            value={draft.correctsActionId ?? ""}
            onChange={(event) =>
              set("correctsActionId", event.target.value || null)
            }
          >
            <option value="">No prior action</option>
            {records.value?.items
              .filter(
                (item) =>
                  item.action.securityId === draft.securityId &&
                  item.action.type === draft.type &&
                  (item.state !== "APPLIED" || symbol),
              )
              .map((item) => (
                <option value={item.actionId} key={item.actionId}>
                  {item.action.sourceReference}
                </option>
              ))}
          </select>
          <div className="form-actions">
            <button type="submit" className="primary-button" disabled={busy}>
              {busy ? "Checking…" : "Preview effects"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}
      {!archived && review && (
        <section className="review-card" aria-label="Review corporate action">
          <h4>
            {labels[review.action.type]} · {review.action.effectiveDate}
          </h4>
          <p>Source reference: {review.action.sourceReference}</p>
          <Effects effect={review.effect} />
          <label className="check-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            I reviewed the source, date and proposed effects.
          </label>
          <div className="form-actions">
            <button
              type="button"
              className="primary-button"
              disabled={busy || !checked}
              onClick={record}
            >
              {busy
                ? "Saving…"
                : review.effect.state === "APPLICABLE"
                  ? "Record reviewed action"
                  : "Save for manual review"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setReview(null);
                setError(null);
              }}
            >
              Back to action
            </button>
          </div>
        </section>
      )}
    </section>
  );
}

function Effects({ effect }: { effect: CorporateActionEffect }) {
  if (effect.state === "NEEDS_REVIEW")
    return (
      <p>
        {effect.reason && Object.hasOwn(reasons, effect.reason)
          ? reasons[effect.reason]
          : "Review is needed before any ledger change."}
      </p>
    );
  return (
    <div>
      {effect.previousSymbol && (
        <p>
          Symbol: {effect.previousSymbol} → {effect.newSymbol}
        </p>
      )}
      {effect.unitsBefore !== null && (
        <p>
          Units: {effect.unitsBefore} → {effect.unitsAfter}. Recorded cost:{" "}
          {effect.recordedCostBefore ?? "unknown"} →{" "}
          {effect.recordedCostAfter ?? "unknown"}.
        </p>
      )}
      {effect.cashDelta !== null && (
        <p>Recorded cash effect: INR {effect.cashDelta}.</p>
      )}
    </div>
  );
}
