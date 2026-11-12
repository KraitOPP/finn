import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type { CatalogueListing } from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
export function ListingPicker({
  busy,
  onChoose,
  summary,
  action,
}: {
  busy: boolean;
  onChoose: (listing: CatalogueListing) => void;
  summary: string;
  action: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [offset, setOffset] = useState(0);
  const path =
    search === null
      ? null
      : `/api/v1/catalog/securities?${new URLSearchParams({ query: search, limit: "25", offset: String(offset) })}`;
  const results = useResource("CatalogueSecurityPage", path);
  const detail = useResource(
    "CatalogueSecurityDetail",
    selected ? `/api/v1/catalog/securities/${selected}` : null,
  );
  return (
    <details className="settings-card">
      <summary>{summary}</summary>
      <Stack spacing={2} sx={{ mt: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Search your saved catalogue. Add or verify listings in{" "}
          <Link href="#/instruments">Stocks</Link>.
        </Typography>
        <Stack
          component="form"
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(query);
            setSelected("");
            setOffset(0);
            results.reload();
          }}
        >
          <TextField
            id={`${id}-query`}
            label="Security name or ISIN"
            fullWidth
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <Button type="submit" variant="outlined" sx={{ flexShrink: 0 }}>
            Find saved securities
          </Button>
        </Stack>
        {results.error && <Alert severity="error">{results.error}</Alert>}
        {results.loading && (
          <LinearProgress aria-label="Searching your catalogue" />
        )}
        {results.value?.items.length === 0 && (
          <Alert severity="info">No saved securities match.</Alert>
        )}
        {results.value && results.value.items.length > 0 && (
          <>
            <TextField
              id={`${id}-security`}
              select
              fullWidth
              label="Choose a security"
              value={selected}
              slotProps={{
                select: { displayEmpty: true },
                inputLabel: { shrink: true },
              }}
              onChange={(event) => setSelected(event.target.value)}
            >
              <MenuItem value="">Select a security</MenuItem>
              {results.value.items.map((item) => (
                <MenuItem
                  key={item.securityId}
                  value={item.securityId}
                  sx={{ whiteSpace: "normal" }}
                >
                  {item.name} · {item.isin ?? "ISIN unknown"}
                </MenuItem>
              ))}
            </TextField>
            {(offset > 0 || results.value.hasMore) && (
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ flexWrap: "wrap" }}
              >
                <Button
                  type="button"
                  disabled={offset === 0}
                  onClick={() => {
                    setOffset(offset - 25);
                    setSelected("");
                  }}
                >
                  Previous securities
                </Button>
                <Button
                  type="button"
                  disabled={!results.value.hasMore}
                  onClick={() => {
                    setOffset(offset + 25);
                    setSelected("");
                  }}
                >
                  Next securities
                </Button>
              </Stack>
            )}
          </>
        )}
        {detail.error && <Alert severity="error">{detail.error}</Alert>}
        {detail.loading && (
          <LinearProgress aria-label="Loading reviewed listings" />
        )}
        {detail.value?.listings.length === 0 && (
          <Alert severity="info">
            This security needs a reviewed listing in Stocks.
          </Alert>
        )}
        {detail.value && detail.value.listings.length > 0 && (
          <Stack
            component="ul"
            spacing={1}
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {detail.value.listings.map((item) => (
              <li key={item.listingId}>
                <Button
                  disabled={busy}
                  type="button"
                  variant="outlined"
                  onClick={() => onChoose(item)}
                >
                  {action} {item.symbol} on {item.exchange}
                </Button>
              </li>
            ))}
          </Stack>
        )}
      </Stack>
    </details>
  );
}
