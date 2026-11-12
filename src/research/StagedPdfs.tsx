import { useState } from "react";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";

const path = "/api/v1/research/pdf";
export function StagedPdfs() {
  const [open, setOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const data = useResource(
    "StagedResearchPdfs",
    open ? `${path}/staged` : null,
  );
  const command = usePrivateCommand();
  return (
    <details
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        data.reload();
      }}
    >
      <summary>Unused PDF uploads</summary>
      <p>
        Discard an upload before it is attached. A new upload also clears unused
        files staged more than seven days ago.
      </p>
      {removed && <p role="status">Unused upload discarded.</p>}
      {data.loading && <p role="status">Checking unused uploads…</p>}
      {data.value?.items.length === 0 && <p>No unused PDF uploads.</p>}
      {data.value?.items.map((file) => (
        <div key={file.fileId}>
          <p>
            Staged <LocalTime value={file.stagedAt} /> · checksum ending{" "}
            {file.checksum.slice(-8)}
          </p>
          <button
            type="button"
            disabled={command.busy}
            onClick={async () => {
              const result = await command.run((csrf) =>
                requestContract(
                  "ResearchPdfDiscard",
                  `${path}/${file.fileId}/discard`,
                  { method: "POST", csrf },
                ),
              );
              if (result?.discarded) {
                setRemoved(true);
                data.reload();
              }
            }}
          >
            Discard unused upload
          </button>
        </div>
      ))}
      {(data.error || command.error) && (
        <p role="alert">{data.error || command.error}</p>
      )}
    </details>
  );
}
