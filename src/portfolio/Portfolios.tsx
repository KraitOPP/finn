import { type FormEvent, useState } from "react";
import type { InvestmentAccount } from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useResource } from "../api/useResource.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import {
  AccountValuationPanel,
  PortfolioValuationPanel,
} from "../market/ValuationPanel.tsx";
import { RouteHeading } from "../Navigation.tsx";
import { CorporateActionsPanel } from "./CorporateActionsPanel.tsx";
import { HoldingsImportPanel } from "./HoldingsImportPanel.tsx";
import { LedgerPanel } from "./LedgerPanel.tsx";
import { receiptMessage } from "./ReviewOpening.tsx";

export function Portfolios() {
  const portfolios = useResource("PortfolioList", "/api/v1/portfolios");
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <section className="workspace-section">
      <RouteHeading>Portfolio</RouteHeading>
      <p className="muted-copy">
        Keep holdings and records organised by portfolio and source account.{" "}
        <a href="#/instruments">Review your securities</a>.
      </p>
      {portfolios.error ? (
        <LoadError message={portfolios.error} reload={portfolios.reload} />
      ) : !portfolios.value ? (
        <p role="status">Loading portfolios…</p>
      ) : portfolios.value.items.length === 0 ? (
        <div className="empty-state">
          <h2>Create your first portfolio</h2>
          <p>
            Add an INR portfolio, then a Groww or manual source account. No
            broker connection is required.
          </p>
        </div>
      ) : (
        <ul className="security-list">
          {portfolios.value.items.map((portfolio) => (
            <li key={portfolio.portfolioId}>
              <div>
                <strong>{portfolio.name}</strong>
                <p>INR · {portfolio.archived ? "Archived" : "Active"}</p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => setSelected(portfolio.portfolioId)}
                aria-pressed={selected === portfolio.portfolioId}
              >
                Open {portfolio.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <CreatePortfolio
        onCreated={(id) => {
          setSelected(id);
          portfolios.reload();
        }}
      />
      {selected && (
        <PortfolioDetail
          key={selected}
          id={selected}
          onChanged={portfolios.reload}
        />
      )}
    </section>
  );
}
function LoadError({
  message,
  reload,
}: {
  message: string;
  reload: () => void;
}) {
  return (
    <div className="empty-state" role="alert">
      <p>{message}</p>
      <button type="button" onClick={reload}>
        Try again
      </button>
    </div>
  );
}
function usePrivateCommand() {
  const authentication = useAuthentication();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    run: async <T,>(
      action: (
        csrf: NonNullable<typeof authentication.session>["csrf"],
      ) => Promise<T>,
    ): Promise<T | undefined> => {
      if (authentication.status !== "ready" || busy) return;
      setBusy(true);
      setError(null);
      try {
        return await action(authentication.session.csrf);
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        )
          authentication.refresh();
        setError(
          error instanceof ApiError
            ? error.message
            : "The change couldn’t be saved. Check your records before trying again.",
        );
      } finally {
        setBusy(false);
      }
    },
  };
}
function CreatePortfolio({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const command = usePrivateCommand();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const value = await command.run((csrf) =>
      requestContract("PortfolioSummary", "/api/v1/portfolios", {
        method: "POST",
        csrf,
        body: { name },
      }),
    );
    if (value) {
      setName("");
      onCreated(value.portfolioId);
    }
  };
  return (
    <details className="settings-card">
      <summary>Create a portfolio</summary>
      <form onSubmit={submit}>
        <label htmlFor="portfolio-name">Portfolio name</label>
        <input
          id="portfolio-name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="field-help">
          Currency: INR. Up to 100 portfolios, including archived records.
        </p>
        {command.error && <p role="alert">{command.error}</p>}
        <button
          type="submit"
          className="primary-button"
          disabled={command.busy}
        >
          {command.busy ? "Creating…" : "Create portfolio"}
        </button>
      </form>
    </details>
  );
}
function PortfolioDetail({
  id,
  onChanged,
}: {
  id: string;
  onChanged: () => void;
}) {
  const detail = useResource("PortfolioDetail", `/api/v1/portfolios/${id}`);
  const command = usePrivateCommand();
  const [accountId, setAccountId] = useState<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<string | null>(null);
  if (detail.error)
    return <LoadError message={detail.error} reload={detail.reload} />;
  if (!detail.value) return <p role="status">Loading portfolio accounts…</p>;
  const { portfolio, accounts } = detail.value;
  const archive = async () => {
    const value = await command.run((csrf) =>
      requestContract("PortfolioSummary", `/api/v1/portfolios/${id}/archive`, {
        method: "POST",
        csrf,
        body: { archived: !portfolio.archived, revision: portfolio.revision },
      }),
    );
    if (value) {
      detail.reload();
      onChanged();
    }
  };
  const selected = accounts.find((account) => account.accountId === accountId);
  return (
    <section className="detail-card">
      <div className="section-heading">
        <div>
          <h2>{portfolio.name}</h2>
          <p>
            {portfolio.archived
              ? "Archived · records remain readable"
              : "Active portfolio"}
          </p>
        </div>
        <button
          type="button"
          className="text-button"
          disabled={command.busy}
          onClick={archive}
        >
          {portfolio.archived ? "Restore portfolio" : "Archive portfolio"}
        </button>
      </div>
      {command.error && (
        <div role="alert">
          <p>{command.error}</p>
          <button type="button" onClick={detail.reload}>
            Reload portfolio
          </button>
        </div>
      )}
      <PortfolioValuationPanel id={id} />
      <h3>Source accounts</h3>
      {accounts.length === 0 ? (
        <p>No accounts yet. Add the source of your portfolio records.</p>
      ) : (
        <ul className="security-list">
          {accounts.map((account) => (
            <li key={account.accountId}>
              <div>
                <strong>{account.name}</strong>
                <p>
                  {account.source} · INR · {coverage(account)}
                </p>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setAccountId(account.accountId);
                  setAccountNotice(null);
                }}
                aria-pressed={accountId === account.accountId}
              >
                Open account {account.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {!portfolio.archived && (
        <CreateAccount
          portfolioId={id}
          onCreated={(account) => {
            setAccountId(account.accountId);
            setAccountNotice(null);
            detail.reload();
          }}
        />
      )}
      {selected && (
        <section
          className="account-workspace"
          aria-label={`Account ${selected.name}`}
        >
          <h3>{selected.name}</h3>
          <p>{coverage(selected)}</p>
          {accountNotice && <p role="status">{accountNotice}</p>}
          <AccountValuationPanel
            key={`valuation-${selected.accountId}`}
            base={`/api/v1/portfolios/${id}/accounts/${selected.accountId}`}
            archived={portfolio.archived}
          />
          <LedgerPanel
            key={selected.accountId}
            base={`/api/v1/portfolios/${id}/accounts/${selected.accountId}`}
            archived={portfolio.archived}
            onSaved={(message) => {
              setAccountNotice(message);
              detail.reload();
            }}
          />
          <CorporateActionsPanel
            key={`actions-${selected.accountId}`}
            base={`/api/v1/portfolios/${id}/accounts/${selected.accountId}`}
            archived={portfolio.archived}
            onRecorded={(record) => {
              if (record.ledgerEventId && !record.replayed) {
                setAccountNotice(
                  "Reviewed corporate action saved. The ledger was recalculated.",
                );
                detail.reload();
              }
            }}
          />
          {selected.source === "GROWW" && (
            <HoldingsImportPanel
              key={`import-${selected.accountId}`}
              base={`/api/v1/portfolios/${id}/accounts/${selected.accountId}`}
              archived={portfolio.archived}
              onAccepted={(receipt) => {
                if (receipt.outcome === "APPLIED") {
                  setAccountNotice(receiptMessage(receipt));
                  detail.reload();
                }
              }}
            />
          )}
        </section>
      )}
    </section>
  );
}
export function coverage(account: InvestmentAccount) {
  if (account.historyStatus === "UNKNOWN") return "History coverage unknown";
  return `${account.historyStatus === "HOLDINGS_ONLY" ? "Holdings snapshot only" : "Partial trade history"} · from ${account.historyStartDate ?? "unknown date"}`;
}
function CreateAccount({
  portfolioId,
  onCreated,
}: {
  portfolioId: string;
  onCreated: (account: InvestmentAccount) => void;
}) {
  const [name, setName] = useState("");
  const [source, setSource] = useState("GROWW");
  const command = usePrivateCommand();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const result = await command.run((csrf) =>
      requestContract(
        "InvestmentAccount",
        `/api/v1/portfolios/${portfolioId}/accounts`,
        { method: "POST", csrf, body: { name, source, currency: "INR" } },
      ),
    );
    if (result) {
      setName("");
      onCreated(result);
    }
  };
  return (
    <details className="settings-card">
      <summary>Add a source account</summary>
      <form onSubmit={submit}>
        <label htmlFor="account-name">Account name</label>
        <input
          id="account-name"
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="field-help">
          Use a friendly name. No account number or broker credentials are
          needed.
        </p>
        <label htmlFor="account-source">Record source</label>
        <select
          id="account-source"
          value={source}
          onChange={(event) => setSource(event.target.value)}
        >
          <option value="GROWW">Groww reports</option>
          <option value="MANUAL">Manual records</option>
          <option value="OTHER">Other reports</option>
        </select>
        <p className="field-help">
          INR cash equities. History coverage starts only when dated records are
          accepted.
        </p>
        {command.error && <p role="alert">{command.error}</p>}
        <button
          type="submit"
          className="primary-button"
          disabled={command.busy}
        >
          {command.busy ? "Creating…" : "Add account"}
        </button>
      </form>
    </details>
  );
}
