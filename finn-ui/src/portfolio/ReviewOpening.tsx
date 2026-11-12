import { type FormEvent, useRef, useState } from "react";
import type {
  HoldingsAcceptanceInput,
  HoldingsAcceptanceReceipt,
  HoldingsPreviewPage,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";

export function receiptMessage(receipt: HoldingsAcceptanceReceipt) {
  if (receipt.outcome === "DUPLICATE")
    return `${receipt.duplicateRows} matching source rows reviewed. No new holdings were recorded.`;
  const count =
    receipt.acceptedRows === 1
      ? "1 opening holding"
      : `${receipt.acceptedRows} opening holdings`;
  return `${count} recorded ${receipt.costMode === "UNITS_ONLY" ? "with costs left unknown" : "using the reported row costs"}.${receipt.skippedRows ? ` ${receipt.skippedRows} zero-unit rows were skipped.` : ""}`;
}
export function ReviewOpening({
  page,
  path,
  archived,
  onAccepted,
  onReload,
}: {
  page: HoldingsPreviewPage;
  path: string;
  archived: boolean;
  onAccepted: (receipt: HoldingsAcceptanceReceipt) => void;
  onReload: () => void;
}) {
  const auth = useAuthentication();
  const [inr, setInr] = useState(false);
  const [unresolved, setUnresolved] = useState(false);
  const [differences, setDifferences] = useState(false);
  const [cost, setCost] =
    useState<HoldingsAcceptanceInput["costMode"]>("UNITS_ONLY");
  const [sent, setSent] = useState<HoldingsAcceptanceInput | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const review = page.review;
  if (review.receipt)
    return (
      <p className="session-notice" role="status">
        {receiptMessage(review.receipt)}
      </p>
    );
  if (!page.commitAvailable || archived) {
    return (
      <p className="session-notice">
        {review.state === "SOURCE_CONFLICT"
          ? `${review.conflictRows} source rows differ from the accepted opening. ${review.duplicateRows} match. This workbook won’t replace the ledger.`
          : review.state === "RECONCILIATION_ONLY"
            ? "This account already has equity records. Keep this workbook for comparison; a second opening cannot be posted."
            : review.state === "ROWS_BLOCKED"
              ? "The report has blocked rows or no positive holdings. Review the source before accepting."
              : "This portfolio is archived. The preview remains readable."}
      </p>
    );
  }
  const duplicate = review.state === "DUPLICATE";
  const ready =
    inr &&
    unresolved &&
    (!review.differencesRequireAcknowledgement || differences);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !ready ||
      inFlight.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    const input: HoldingsAcceptanceInput = sent ?? {
      confirmInr: true,
      retainUnresolvedListings: true,
      acknowledgeDifferences: differences,
      costMode: cost,
      expectedLedgerRevision: review.currentLedgerRevision,
    };
    inFlight.current = true;
    setSent(input);
    setBusy(true);
    setError(null);
    try {
      const receipt = await requestContract("HoldingsAcceptanceReceipt", path, {
        method: "POST",
        body: input,
        csrf: auth.session.csrf,
      });
      onAccepted(receipt);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        error instanceof ApiError
          ? error.message
          : "We couldn’t confirm the outcome. Retry this same decision or reload the preview to check its receipt.",
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return (
    <form
      className="settings-card acceptance-card"
      onSubmit={submit}
      aria-label="Review opening holdings"
    >
      <h4>
        {duplicate ? "Review matching rows" : "Accept an opening snapshot"}
      </h4>
      <p>
        {duplicate
          ? `${review.duplicateRows} source rows match the existing opening. Saving this review won’t add any holdings.`
          : `Record ${review.eligibleRows} opening holdings as of ${page.metadata.asOfDate}. This does not create prior purchases, cash or realised gains.`}
      </p>
      {review.currentLedgerRevision !== page.ledgerRevisionAtPreview && (
        <p className="field-help">
          The ledger changed after upload. This review uses its current records.
        </p>
      )}
      <fieldset disabled={busy || sent !== null}>
        <legend>Cost and mapping decisions</legend>
        {!duplicate && (
          <>
            <label className="check-label">
              <input
                type="radio"
                name="opening-cost"
                checked={cost === "UNITS_ONLY"}
                onChange={() => setCost("UNITS_ONLY")}
              />
              Keep opening costs unknown
            </label>
            <label className="check-label">
              <input
                type="radio"
                name="opening-cost"
                checked={cost === "REPORTED_ROW_COST"}
                disabled={!review.reportedCostAvailable}
                onChange={() => setCost("REPORTED_ROW_COST")}
              />
              Use reported row buy values
            </label>
            <p className="field-help">
              The reported cost choice keeps the individual row values. It
              doesn’t redistribute differences from the workbook summary or
              assume historical fees.
            </p>
          </>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={inr}
            onChange={(event) => setInr(event.target.checked)}
          />
          I confirm that the amounts in this workbook are in INR.
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={unresolved}
            onChange={(event) => setUnresolved(event.target.checked)}
          />
          Keep exchange listings unresolved. Unmatched ISINs can be added as
          securities that still need review.
        </label>
        {review.differencesRequireAcknowledgement && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={differences}
              onChange={(event) => setDifferences(event.target.checked)}
            />
            I reviewed the report and row differences and want to keep the
            source evidence as shown.
          </label>
        )}
      </fieldset>
      {error && <p role="alert">{error}</p>}
      <div className="form-actions">
        <button
          className="primary-button"
          type="submit"
          disabled={!ready || busy}
        >
          {busy
            ? "Recording…"
            : sent
              ? "Retry same decision"
              : duplicate
                ? "Save duplicate review"
                : "Accept opening holdings"}
        </button>
        {error && (
          <button type="button" onClick={onReload}>
            Reload preview
          </button>
        )}
      </div>
    </form>
  );
}
