import { type FormEvent, useEffect, useState } from "react";
import type {
  CatalogueListing,
  PrivateClose,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";

export function sessionOffset(days: number) {
  const session = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const date = new Date(`${session}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

const capabilities = {
  DISABLED: "Private Yahoo downloads are off",
  CONFIGURATION_REQUIRED: "Yahoo worker setup is incomplete",
  REVIEWED_MAPPING_REQUIRED: "Confirm a Yahoo symbol before refreshing",
  PRIVATE_DAILY: "Private Yahoo daily closes available on request",
} as const;

const failures: Record<string, string> = {
  NO_ROWS_RETURNED: "Yahoo returned no daily rows for this window.",
  SOURCE_VALIDATION_FAILED: "Yahoo returned data that failed validation.",
  PROVIDER_REQUEST_FAILED: "Yahoo was unavailable after retries.",
  REVIEWED_MAPPING_CHANGED:
    "The reviewed Yahoo mapping changed. Start a new refresh.",
  PRICE_WINDOW_EXPIRED: "The request aged out of the retention window.",
  LEASE_EXPIRED: "The worker did not finish in time.",
  YAHOO_NOT_CONFIGURED: "The Yahoo worker is disabled or not configured.",
};

export function capabilityText(capability: keyof typeof capabilities) {
  return capabilities[capability];
}

export function failureText(code: string) {
  return failures[code] ?? "The refresh did not complete.";
}
export function PriceSource({ price }: { price: PrivateClose }) {
  return (
    <span>
      {price.source === "MANUAL_REVIEWED"
        ? "Reviewed exchange close"
        : "Yahoo daily close (provider basis)"}
      {" · "}
      {price.sessionDate}
      {" · "}
      {price.freshness === "STALE" ? "Stale" : "Delay unknown"}
    </span>
  );
}

export function ListingPrices({
  listing,
  onChanged,
  compact = false,
}: {
  listing: CatalogueListing;
  onChanged?: () => void;
  compact?: boolean;
}) {
  const auth = useAuthentication();
  const path = `/api/v1/market/listings/${listing.listingId}`;
  const { value: feed, error, reload } = useResource("MarketFeed", path);
  const [date, setDate] = useState(() => sessionOffset(-1));
  const [close, setClose] = useState("");
  const [reference, setReference] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [job, setJob] = useState<string | null>(null);
  const activeJob =
    job ??
    (feed?.latestJobState === "QUEUED" || feed?.latestJobState === "RUNNING"
      ? feed.latestJobId
      : null);
  useEffect(() => {
    if (!activeJob) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function check() {
      try {
        const status = await requestContract(
          "AsyncJobStatus",
          `/api/v1/jobs/${activeJob}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (
          (status.state === "QUEUED" || status.state === "RUNNING") &&
          ++attempts < 65
        ) {
          timer = setTimeout(check, 2000);
          return;
        }
        setNotice(
          status.state === "SUCCEEDED"
            ? "The requested daily closes were checked."
            : status.state === "FAILED"
              ? (failures[status.failureCode ?? ""] ??
                "Refresh failed. See acquisition status.")
              : "The job may still be running. Check acquisition status for updates.",
        );
        if (status.state === "SUCCEEDED") onChanged?.();
      } catch {
        if (controller.signal.aborted) return;
        setNotice(
          "Couldn’t check the job. Refresh the acquisition status to see its latest state.",
        );
      }
      setJob(null);
      reload();
    }
    timer = setTimeout(check, 1200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [activeJob, reload, onChanged]);
  async function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy || auth.status !== "ready") return;
    setBusy(true);
    setFailure(null);
    setNotice(null);
    const csrf = auth.session.csrf;
    try {
      if (event) {
        await requestContract("PrivateClose", `${path}/reviewed-close`, {
          method: "POST",
          csrf,
          body: {
            sessionDate: date,
            close,
            sourceReference: reference,
            reviewed: confirmed,
          },
        });
        setNotice("Reviewed close saved.");
        setConfirmed(false);
        setClose("");
        reload();
        onChanged?.();
      } else {
        const endExclusive = sessionOffset(0);
        const start = [sessionOffset(-14), listing.validFrom].sort()[1];
        const result = await requestContract(
          "PriceFetchQueued",
          `${path}/refresh`,
          {
            method: "POST",
            csrf,
            body: { start, endExclusive },
          },
        );
        setNotice("Daily price refresh queued.");
        setJob(result.jobId);
        reload();
      }
    } catch (failure) {
      if (
        failure instanceof ApiError &&
        (failure.status === 401 || failure.status === 403)
      )
        auth.refresh();
      setFailure(
        failure instanceof ApiError && failure.status === 429
          ? "The refresh or storage limit was reached. Check the status before trying again."
          : failure instanceof ApiError &&
              failure.code === "REVIEWED_MAPPING_REQUIRED"
            ? "Confirm a Yahoo mapping effective throughout the requested window."
            : "Couldn’t save this request. Check the listing, completed session date and source details.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className={compact ? "detail-card compact-price" : "detail-card"}
      aria-label={`${listing.symbol} prices and availability`}
    >
      <h3>Closing prices</h3>
      {!compact && (
        <p className="muted-copy">
          Completed sessions only. Official exchange file imports and live
          streaming are awaiting source verification.
        </p>
      )}
      {error ? (
        <p role="alert">{error}</p>
      ) : !feed ? (
        <p role="status">Checking price coverage…</p>
      ) : (
        <>
          {(!compact || feed.yahoo !== "PRIVATE_DAILY") && (
            <p>{capabilities[feed.yahoo]}.</p>
          )}
          {feed.latest ? (
            <p>
              <strong className="stock-close">₹{feed.latest.close}</strong>
              {" · "}
              <PriceSource price={feed.latest} />
            </p>
          ) : activeJob ? (
            <p role="status">Loading recent daily closes…</p>
          ) : (
            <p>No closing price has been recorded for this listing.</p>
          )}
          {feed.latestJobState &&
            (!compact || feed.latestJobState === "FAILED") && (
              <p>
                Last refresh:{" "}
                {feed.latestJobState.toLowerCase().replaceAll("_", " ")}.
                {feed.failureCode
                  ? ` ${failures[feed.failureCode] ?? "See job status for details."}`
                  : ""}
              </p>
            )}
          {feed.lastSuccessAt && !compact && (
            <p>
              Last successful download: {feed.lastSuccessAt} · delay unknown
            </p>
          )}
          {feed.yahoo === "PRIVATE_DAILY" && (
            <button
              type="button"
              className={compact ? "stock-refresh" : undefined}
              disabled={
                busy ||
                activeJob !== null ||
                listing.validFrom >= sessionOffset(0)
              }
              onClick={() => void submit()}
            >
              {compact ? "Refresh prices" : "Refresh Yahoo daily closes"}
            </button>
          )}
        </>
      )}
      {!compact && (
        <button type="button" onClick={reload}>
          Check acquisition status
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
      {failure && <p role="alert">{failure}</p>}
      {!compact && (
        <details className="settings-card">
          <summary>Add a reviewed exchange close</summary>
          <form onSubmit={(event) => void submit(event)}>
            <label>
              Exchange session date{" "}
              <input
                type="date"
                max={sessionOffset(-1)}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
              />
            </label>
            <label>
              As-reported close in INR{" "}
              <input
                value={close}
                onChange={(event) => setClose(event.target.value)}
                inputMode="decimal"
                maxLength={25}
                required
              />
            </label>
            <label>
              Source reference{" "}
              <input
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                maxLength={240}
                required
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                required
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              I verified the closing price, date, currency and exchange against
              the source.
            </label>
            <button className="primary-button" disabled={busy} type="submit">
              Save reviewed close
            </button>
          </form>
        </details>
      )}
    </section>
  );
}
