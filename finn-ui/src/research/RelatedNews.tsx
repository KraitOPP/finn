import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type { CompanyEvent } from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";

export function RelatedNews({ event }: { event: CompanyEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(change) => setOpen(change.currentTarget.open)}>
      <summary>Related news coverage</summary>
      {open && <Coverage event={event} />}
    </details>
  );
}

function Coverage({ event }: { event: CompanyEvent }) {
  const [link, setLink] = useState("");
  const [adding, setAdding] = useState(false);
  const [offset, setOffset] = useState(0);
  const path = `/api/v1/research/events/${event.eventId}/news`;
  const data = useResource("RelatedEventNews", path);
  const saved = useResource(
    "CompanyNewsPage",
    adding
      ? `/api/v1/research/news?companyId=${event.companyId}&offset=${offset}`
      : null,
  );
  const options =
    saved.value?.items
      .flatMap(({ sources }) => sources)
      .filter(
        (source) =>
          !data.value?.items.some(
            (item) =>
              item.documentId === source.documentId &&
              item.revision === source.revision,
          ),
      ) ?? [];
  const selected = options.find((source) => source.documentId === link);
  const command = usePrivateCommand();
  return (
    <Stack spacing={1} sx={{ mt: 1 }}>
      {data.error && <Alert severity="warning">{data.error}</Alert>}
      {data.loading && (
        <Typography role="status" variant="body2">
          Loading related articles…
        </Typography>
      )}
      {data.value?.items.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No articles linked to this event.
        </Typography>
      )}
      {data.value?.items.map((item) => (
        <Typography variant="body2" key={item.documentId}>
          <Link href={item.url ?? undefined} target="_blank" rel="noreferrer">
            {item.title}
          </Link>{" "}
          · {item.sourceName}
          {item.publishedAt && (
            <>
              {" "}
              · <LocalTime value={item.publishedAt} />
            </>
          )}
        </Typography>
      ))}
      <Button sx={{ alignSelf: "start" }} onClick={() => setAdding(!adding)}>
        {adding ? "Close article picker" : "Link a saved article"}
      </Button>
      {adding && (
        <Stack
          component="form"
          spacing={1}
          onSubmit={async (change) => {
            change.preventDefault();
            if (!selected) return;
            const attached = await command.run((csrf) =>
              requestContract("RelatedEventNews", path, {
                method: "POST",
                csrf,
                body: {
                  documentId: selected.documentId,
                  revision: selected.revision,
                },
              }),
            );
            if (attached) {
              data.reload();
              setLink("");
            }
          }}
        >
          {saved.error && <Alert severity="warning">{saved.error}</Alert>}
          <TextField
            select
            label="Saved article"
            value={link}
            onChange={(change) => setLink(change.target.value)}
          >
            <MenuItem value="">Choose related coverage</MenuItem>
            {options.map((item) => (
              <MenuItem key={item.documentId} value={item.documentId}>
                {item.title} · {item.sourceName}
              </MenuItem>
            ))}
          </TextField>
          {saved.value && options.length === 0 && (
            <Typography variant="body2">
              Save a link for this company in Research → Saved news links.
            </Typography>
          )}
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              type="submit"
              variant="outlined"
              disabled={!selected || command.busy}
            >
              Link article
            </Button>
            {offset > 0 && (
              <Button
                onClick={() => {
                  setOffset(offset - 25);
                  setLink("");
                }}
              >
                Previous articles
              </Button>
            )}
            {saved.value?.hasMore && offset < 200 && (
              <Button
                onClick={() => {
                  setOffset(offset + 25);
                  setLink("");
                }}
              >
                More articles
              </Button>
            )}
          </Stack>
          {command.error && <Alert severity="warning">{command.error}</Alert>}
        </Stack>
      )}
    </Stack>
  );
}
