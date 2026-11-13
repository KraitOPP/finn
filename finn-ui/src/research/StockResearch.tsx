import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import type { CatalogueListing } from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { StockSearch } from "../instruments/StockSearch.tsx";
import { StockAiTool } from "./StockAiTool.tsx";

export function StockResearch({ params }: { params: URLSearchParams }) {
  const [selected, setSelected] = useState<CatalogueListing | null>(null);
  const [venue, setVenue] = useState<string | null>(null);
  const company = params.get("company");
  const linkedListing = params.get("listing");
  const security = params.get("security");
  const symbol = params.get("symbol");
  const fromRadar =
    symbol && /^[A-Z0-9][A-Z0-9&._-]{0,35}$/.test(symbol) ? symbol : null;
  const openListing = usePrivateCommand();
  const holding = useResource(
    "CatalogueSecurityDetail",
    !selected && !company && security && /^[0-9a-f-]{36}$/i.test(security)
      ? `/api/v1/catalog/securities/${security}`
      : null,
  );
  const listings = useResource(
    "StockResearchListings",
    !selected && company && /^[0-9a-f-]{36}$/i.test(company)
      ? `/api/v1/research/stock-ai/listings?${new URLSearchParams({ company })}`
      : null,
  );
  const options = listings.value?.items ?? holding.value?.listings ?? [];
  const listing =
    selected ??
    options.find((option) => option.listingId === (venue ?? linkedListing)) ??
    options.find((option) => option.exchange === "NSE") ??
    options[0];

  return (
    <Stack spacing={2}>
      <StockSearch
        description="Search by company name or ticker to start a research report."
        onOpen={(_, result) => setSelected(result.listing)}
      />
      {fromRadar && !listing && (
        <Button
          variant="contained"
          sx={{ alignSelf: "start" }}
          disabled={openListing.busy}
          onClick={async () => {
            const opened = await openListing.run((csrf) =>
              requestContract("StockLookupOpened", "/api/v1/catalog/lookup", {
                method: "POST",
                csrf,
                body: { symbol: fromRadar, exchange: "NSE" },
              }),
            );
            if (opened) setSelected(opened.listing);
          }}
        >
          {openListing.busy ? "Opening…" : `Open ${fromRadar} on NSE`}
        </Button>
      )}
      {openListing.error && (
        <Alert severity="warning">{openListing.error}</Alert>
      )}
      {(listings.loading || holding.loading) && (
        <LinearProgress aria-label="Loading company listings" />
      )}
      {(listings.error || holding.error) && (
        <Alert severity="warning">{listings.error ?? holding.error}</Alert>
      )}
      {!selected && (listings.value || holding.value) && !listing && (
        <Alert severity="info">Choose a listed stock to run research.</Alert>
      )}
      {!selected && options.length > 1 && listing && (
        <TextField
          select
          label="Exchange listing"
          value={listing.listingId}
          sx={{ alignSelf: "start", minWidth: 185 }}
          onChange={(event) => setVenue(event.target.value)}
        >
          {options.map((option) => (
            <MenuItem key={option.listingId} value={option.listingId}>
              {option.symbol} · {option.exchange}
            </MenuItem>
          ))}
        </TextField>
      )}
      {listing && <StockAiTool key={listing.listingId} listing={listing} />}
    </Stack>
  );
}
