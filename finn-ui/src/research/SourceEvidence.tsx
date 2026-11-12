import type { CompanySourceDetail } from "../../contracts/generated/models.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
export const versionPath = (id: string, revision: number) =>
  `/api/v1/research/sources/${id}/versions/${revision}`;

export function SourceEvidence({ detail }: { detail: CompanySourceDetail }) {
  const source = detail.source;
  return (
    <div>
      <p>
        {source.sourceName} · {source.companyName} · Version {source.revision}
      </p>
      <p>
        Published{" "}
        {source.publishedAt ? (
          <LocalTime value={source.publishedAt} />
        ) : (
          "time unknown"
        )}{" "}
        · Saved <LocalTime value={source.ingestedAt} />
      </p>
      {source.url && (
        <a href={source.url} target="_blank" rel="noopener noreferrer">
          Open original source
        </a>
      )}
      {source.hasPdf && (
        <p>
          <a href={`${versionPath(source.documentId, source.revision)}/pdf`}>
            Download saved PDF
          </a>
        </p>
      )}
      {detail.attachment && (
        <details>
          <summary>Read saved text</summary>
          <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {detail.attachment}
          </pre>
        </details>
      )}
      <details>
        <summary>Source checksum</summary>
        <code style={{ overflowWrap: "anywhere" }}>{source.checksum}</code>
      </details>
    </div>
  );
}
