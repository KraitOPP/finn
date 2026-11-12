import { useState } from "react";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";

const path = "/api/v1/research/news";

export function News({ companyId }: { companyId?: string }) {
  const [offset, setOffset] = useState(0);
  const [notice, setNotice] = useState("");
  const filters = new URLSearchParams({ offset: String(offset) });
  if (companyId) filters.set("companyId", companyId);
  const data = useResource("CompanyNewsPage", `${path}?${filters}`);
  return (
    <section className="detail-card">
      <h2>{companyId ? "Saved stock news" : "News context"}</h2>
      <p>
        Manually saved headlines and publisher links. Primary company filings
        appear in the sources section.
      </p>
      {notice && <p role="status">{notice}</p>}
      {data.error ? (
        <p role="alert">
          {data.error}{" "}
          <button type="button" onClick={data.reload}>
            Retry
          </button>
        </p>
      ) : !data.value ? (
        <p role="status">Loading news context…</p>
      ) : data.value.items.length === 0 ? (
        <p>
          {companyId
            ? "No news links saved for this company."
            : "No news links on this page."}
        </p>
      ) : (
        <ul className="security-list">
          {data.value.items.map((cluster) => (
            <li key={cluster.clusterId}>
              <div>
                <strong>{cluster.headline}</strong>
                <p>
                  {cluster.companyName} · {cluster.date} (India) ·{" "}
                  {cluster.sources.length}{" "}
                  {cluster.sources.length === 1 ? "link" : "related links"}
                </p>
                <ul>
                  {cluster.sources.map((item) => (
                    <li key={item.documentId}>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {item.sourceName}
                        </a>
                      )}
                      {" · "}
                      {item.publishedAt ? (
                        <LocalTime value={item.publishedAt} />
                      ) : (
                        "Publication time unknown"
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
      )}
      {(offset > 0 || data.value?.hasMore) && (
        <div className="pagination">
          <button
            type="button"
            disabled={offset === 0}
            onClick={() => setOffset(offset - 25)}
          >
            Previous news
          </button>
          <button
            type="button"
            disabled={!data.value?.hasMore}
            onClick={() => setOffset(offset + 25)}
          >
            Next news
          </button>
        </div>
      )}
      {!companyId && (
        <NewsForm
          onSave={() => {
            setOffset(0);
            setNotice("News link saved.");
            data.reload();
          }}
        />
      )}
    </section>
  );
}

function NewsForm({ onSave }: { onSave: () => void }) {
  const companies = useResource(
    "CatalogueCompanies",
    "/api/v1/catalog/companies",
  );
  const command = usePrivateCommand();
  const [companyId, setCompany] = useState("");
  const [headline, setHeadline] = useState("");
  const [publisher, setPublisher] = useState("");
  const [url, setUrl] = useState("");
  const [published, setPublished] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [validation, setValidation] = useState("");
  return (
    <form
      className="settings-card workspace-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setValidation("");
        let publishedAt: string | null = null;
        if (published) {
          const date = new Date(published);
          if (
            !/(Z|[+-][0-9]{2}:[0-9]{2})$/i.test(published) ||
            !Number.isFinite(date.getTime())
          ) {
            setValidation(
              "Include Z or a UTC offset with the publication time.",
            );
            return;
          }
          publishedAt = date.toISOString();
        }
        if (!confirmed) return;
        const result = await command.run((csrf) =>
          requestContract("CompanySource", path, {
            method: "POST",
            csrf,
            body: {
              companyId,
              headline,
              publisher,
              url,
              publishedAt,
              rightsConfirmed: true,
            },
          }),
        );
        if (result) {
          setHeadline("");
          setPublisher("");
          setUrl("");
          setPublished("");
          setConfirmed(false);
          onSave();
        }
      }}
    >
      <h3>Add a news link</h3>
      <label>
        Company{" "}
        <select
          required
          value={companyId}
          onChange={(event) => setCompany(event.target.value)}
        >
          <option value="">Choose a saved company</option>
          {companies.value?.map((item) => (
            <option key={item.companyId} value={item.companyId}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      {companies.error && <p role="alert">{companies.error}</p>}
      <label>
        Headline{" "}
        <input
          required
          maxLength={120}
          value={headline}
          onChange={(event) => setHeadline(event.target.value)}
        />
      </label>
      <label>
        Publisher{" "}
        <input
          required
          maxLength={120}
          value={publisher}
          onChange={(event) => setPublisher(event.target.value)}
        />
      </label>
      <label>
        Article HTTPS link{" "}
        <input
          required
          type="url"
          maxLength={1000}
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </label>
      <label>
        Publication time (optional, include time zone offset)
        <input
          maxLength={32}
          value={published}
          onChange={(event) => setPublished(event.target.value)}
          placeholder="2026-01-01T15:30:00+05:30"
        />
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
          required
        />
        I reviewed the headline, publisher and link.
      </label>
      {(validation || command.error) && (
        <p role="alert">{validation || command.error}</p>
      )}
      <button className="primary-button" type="submit" disabled={command.busy}>
        Save news link
      </button>
    </form>
  );
}
