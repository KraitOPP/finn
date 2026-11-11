import { useEffect, useRef, useState } from "react";
import type { LedgerExportInput } from "../../contracts/generated/models.ts";
import { ApiError, readBoundedResponse } from "../api/request.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";

export function LedgerExport({
  base,
  revision,
}: {
  base: string;
  revision: number;
}) {
  const auth = useAuthentication();
  const controller = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  const download = async () => {
    if (
      busy ||
      controller.current ||
      auth.status !== "ready" ||
      !auth.session.authenticated
    )
      return;
    const active = new AbortController();
    controller.current = active;
    setBusy(true);
    setError(null);
    setStarted(false);
    try {
      const input: LedgerExportInput = { expectedLedgerRevision: revision };
      const csrf = auth.session.csrf;
      const response = await fetch(`${base}/transactions/export`, {
        method: "POST",
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
        signal: AbortSignal.any([active.signal, AbortSignal.timeout(15000)]),
        headers: {
          Accept: "text/csv",
          "Content-Type": "application/json",
          [csrf.headerName]: csrf.token,
        },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new ApiError(response.status);
      if (
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .startsWith("text/csv")
      )
        throw new ApiError(502);
      const bytes = await readBoundedResponse(response, 12 * 1024 * 1024);
      if (active.signal.aborted) return;
      const url = URL.createObjectURL(
        new Blob([bytes.buffer], { type: "text/csv;charset=UTF-8" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "finn-ledger.csv";
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStarted(true);
    } catch (error) {
      if (active.signal.aborted) return;
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        auth.refresh();
      setError(
        error instanceof ApiError && error.status === 409
          ? "The ledger changed since you opened it. Reload the ledger before exporting."
          : "The CSV could not be downloaded. Try again.",
      );
    } finally {
      controller.current = null;
      if (!active.signal.aborted) setBusy(false);
    }
  };
  return (
    <details className="ledger-export">
      <summary>Export transaction history</summary>
      <p className="field-help">
        The CSV contains this account’s journal, including original and reversed
        records. Use the effective column to identify entries that still affect
        the ledger. Import money columns as text to preserve all decimal places.
        This is a private tracking export.
      </p>
      <button
        type="button"
        className="primary-button"
        disabled={busy}
        onClick={download}
      >
        {busy ? "Preparing CSV…" : "Download this journal as CSV"}
      </button>
      {started && <p role="status">CSV download started.</p>}
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
