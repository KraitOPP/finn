import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type {
  CatalogueListing,
  DiscoveryCompany,
  DiscoveryMember,
  DiscoverySector,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPicker } from "../instruments/ListingPicker.tsx";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { RouteHeading } from "../Navigation.tsx";
import {
  DiscoveryPeriodFields,
  emptyPeriod,
  sectors,
} from "./DiscoveryFields.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { FactLabels, factAmount, metricLabels } from "./FinancialFacts.tsx";
import { SavedScreens } from "./SavedScreens.tsx";
import { factReasons } from "./ThesisConditions.tsx";

const path = "/api/v1/discovery";
export function Discovery() {
  const id = useId();
  const directory = useResource("DiscoveryDirectory", `${path}/universe`);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState(emptyPeriod);
  const coverage = useResource(
    "DiscoverySnapshot",
    query ? `${path}/universe/coverage?${query}` : null,
  );
  const activeCount = directory.value?.members.filter(
    (member) => member.active,
  ).length;
  return (
    <section className="workspace-section">
      <RouteHeading>Discover</RouteHeading>
      <Typography color="text.secondary" sx={{ maxWidth: "68ch", mb: 3 }}>
        Build a stock shortlist from companies you add and financial figures you
        review in Research. Check a reporting period, save filters for a sector,
        and compare companies from the same run.
      </Typography>
      <Stack spacing={2}>
        <Paper
          component="section"
          variant="outlined"
          aria-labelledby={`${id}-universe`}
          sx={{ p: { xs: 2, sm: 3 } }}
        >
          <Stack spacing={2}>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ alignItems: "center", flexWrap: "wrap" }}
            >
              <Typography component="h2" variant="h6" id={`${id}-universe`}>
                Research universe
              </Typography>
              {activeCount !== undefined && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${activeCount} active ${activeCount === 1 ? "company" : "companies"}`}
                />
              )}
            </Stack>
            {directory.error && (
              <Alert severity="error">{directory.error}</Alert>
            )}
            {directory.loading && (
              <LinearProgress aria-label="Loading the research universe" />
            )}
            {directory.value && (
              <>
                <Typography color="text.secondary" variant="body2">
                  {directory.value.members.length === 0
                    ? "Choose a saved exchange listing to add your first company."
                    : "Include up to 30 companies and assign a sector to each."}
                </Typography>
                <UniverseEditor
                  members={directory.value.members}
                  onSaved={() => {
                    directory.reload();
                    setQuery("");
                  }}
                />
                <details>
                  <summary>Supported metrics and sectors</summary>
                  <p>
                    Coverage uses reviewed consolidated figures. Balance sheet
                    equity uses the period-end date.
                  </p>
                  <ul>
                    {directory.value.metrics.map((item) => (
                      <li key={item.metric}>
                        {metricLabels[item.metric]} ·{" "}
                        {item.sectors
                          .map((sector) => sectors[sector])
                          .join(", ")}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            )}
          </Stack>
        </Paper>
        <Paper
          component="section"
          variant="outlined"
          aria-labelledby={`${id}-coverage`}
          sx={{ p: { xs: 2, sm: 3 } }}
        >
          <Stack spacing={2.5}>
            <div>
              <Typography component="h2" variant="h6" id={`${id}-coverage`}>
                Check reporting coverage
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                See which reviewed figures are available for the same reporting
                period.
              </Typography>
            </div>
            <Stack
              component="form"
              spacing={2}
              onSubmit={(event) => {
                event.preventDefault();
                const next = new URLSearchParams(period).toString();
                if (next === query) coverage.reload();
                setQuery(next);
              }}
            >
              <DiscoveryPeriodFields value={period} onChange={setPeriod} />
              <Button
                type="submit"
                variant="contained"
                disabled={coverage.loading}
                sx={{ alignSelf: { sm: "start" } }}
              >
                Check covered figures
              </Button>
            </Stack>
            {coverage.error && <Alert severity="error">{coverage.error}</Alert>}
            {coverage.loading && (
              <LinearProgress aria-label="Checking reviewed figures" />
            )}
            {coverage.value && (
              <Stack spacing={1}>
                <Typography color="text.secondary" variant="body2">
                  Captured <LocalTime value={coverage.value.capturedAt} /> ·{" "}
                  {coverage.value.period.start} to {coverage.value.period.end}
                </Typography>
                {coverage.value.companies.length === 0 && (
                  <Alert severity="info">
                    Include a company in the research universe to check its
                    coverage.
                  </Alert>
                )}
                {coverage.value.companies.map((item) => (
                  <CompanyCoverage key={item.member.companyId} item={item} />
                ))}
              </Stack>
            )}
          </Stack>
        </Paper>
      </Stack>
      {directory.value && <SavedScreens metrics={directory.value.metrics} />}
    </section>
  );
}

function UniverseEditor({
  members,
  onSaved,
}: {
  members: DiscoveryMember[];
  onSaved: () => void;
}) {
  const [company, setCompany] = useState("");
  const [listing, setListing] = useState<CatalogueListing | null>(null);
  const [sector, setSector] = useState<DiscoverySector>("OTHER");
  const [active, setActive] = useState(true);
  const command = usePrivateCommand();
  const current = members.find((item) => item.companyId === company);
  const listingId = listing?.listingId ?? current?.listingId;
  function edit(member?: DiscoveryMember) {
    setListing(null);
    setCompany(member?.companyId ?? "");
    setSector(member?.sector ?? "OTHER");
    setActive(member?.active ?? true);
  }
  return (
    <>
      {members.length > 0 && (
        <Stack component="ul" className="security-list" sx={{ m: 0 }}>
          {members.map((member) => (
            <li key={member.companyId}>
              <div>
                <strong>{member.name}</strong>
                <p>
                  {member.exchange} {member.symbol} · {sectors[member.sector]} ·{" "}
                  {member.active ? "Included" : "Inactive"}
                </p>
                <button type="button" onClick={() => edit(member)}>
                  Review membership
                </button>
              </div>
            </li>
          ))}
        </Stack>
      )}
      <ListingPicker
        busy={command.busy}
        summary="Choose a listing from Securities"
        action="Select"
        onChoose={(chosen) => {
          edit(members.find((member) => member.companyId === chosen.companyId));
          setListing(chosen);
        }}
      />
      {listingId && (
        <form
          className="workspace-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await command.run((csrf) =>
              requestContract("DiscoveryMember", `${path}/universe`, {
                method: "POST",
                csrf,
                body: {
                  listingId,
                  sector,
                  active,
                  expectedRevision: current?.revision ?? null,
                },
              }),
            );
            if (result) {
              edit();
              onSaved();
            }
          }}
        >
          <p>
            Selected {listing?.symbol ?? current?.symbol} on{" "}
            {listing?.exchange ?? current?.exchange}
          </p>
          <label>
            Sector{" "}
            <select
              value={sector}
              onChange={(event) =>
                setSector(event.target.value as DiscoverySector)
              }
            >
              {Object.entries(sectors).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              checked={active}
              onChange={(event) => setActive(event.target.checked)}
            />{" "}
            Include in discovery
          </label>
          <button type="submit" disabled={command.busy}>
            Save membership
          </button>
          <button type="button" onClick={() => edit()}>
            Cancel
          </button>
        </form>
      )}
      {command.error && <p role="alert">{command.error}</p>}
    </>
  );
}

export function CompanyCoverage({ item }: { item: DiscoveryCompany }) {
  const [anchor, setAnchor] = useState("");
  const ready = item.readings.filter((reading) => reading.fact !== null).length;
  return (
    <Paper component="details" variant="outlined" sx={{ px: 1.5, py: 0.5 }}>
      <summary>
        {item.member.name} · {sectors[item.member.sector]} · {ready} covered
        figures
      </summary>
      <p>
        <a href={`#/research?company=${item.member.companyId}`}>
          Open company research
        </a>
      </p>
      <ul>
        {item.readings.map((reading) => (
          <li key={reading.metric}>
            <strong>{metricLabels[reading.metric]}</strong>
            {" · "}
            {reading.fact ? (
              <>
                {factAmount(reading.fact)}
                <FactLabels fact={reading.fact} />
                <button
                  type="button"
                  aria-expanded={anchor === reading.fact.anchorId}
                  onClick={() =>
                    setAnchor(
                      anchor === reading.fact?.anchorId
                        ? ""
                        : (reading.fact?.anchorId ?? ""),
                    )
                  }
                >
                  Source and lines
                </button>
                {anchor === reading.fact.anchorId && (
                  <AnchorEvidence id={anchor} />
                )}
              </>
            ) : reading.reason === "SECTOR_INELIGIBLE" ? (
              "Outside this sector's metric policy"
            ) : (
              factReasons[reading.reason]
            )}
          </li>
        ))}
      </ul>
    </Paper>
  );
}
