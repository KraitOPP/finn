import { useState } from "react";
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
  const directory = useResource("DiscoveryDirectory", `${path}/universe`);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState(emptyPeriod);
  const coverage = useResource(
    "DiscoverySnapshot",
    query ? `${path}/universe/coverage?${query}` : null,
  );
  return (
    <section className="workspace-section">
      <RouteHeading>Discover</RouteHeading>
      <section className="detail-card">
        <h2>Research universe</h2>
        <p>
          Coverage comes from your reviewed listings and primary-source
          financial figures. A capture uses the current saved revisions for a
          chosen reporting period.
        </p>
        {directory.error && <p role="alert">{directory.error}</p>}
        {directory.loading && (
          <p role="status">Loading the research universe…</p>
        )}
        {directory.value && (
          <>
            <p>
              {directory.value.members.filter((member) => member.active).length}{" "}
              active companies · up to 30 saved companies
            </p>
            <details>
              <summary>Supported metrics and sectors</summary>
              <p>
                Reviewed consolidated figures in INR or percentage points.
                Balance sheet equity uses the period-end date.
              </p>
              <ul>
                {directory.value.metrics.map((item) => (
                  <li key={item.metric}>
                    {metricLabels[item.metric]} ·{" "}
                    {item.sectors.map((sector) => sectors[sector]).join(", ")}
                  </li>
                ))}
              </ul>
            </details>
            <UniverseEditor
              members={directory.value.members}
              onSaved={() => {
                directory.reload();
                setQuery("");
              }}
            />
          </>
        )}
      </section>
      <section className="detail-card">
        <h2>Check reporting coverage</h2>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const next = new URLSearchParams(period).toString();
            if (next === query) coverage.reload();
            setQuery(next);
          }}
        >
          <DiscoveryPeriodFields value={period} onChange={setPeriod} />
          <button type="submit">Check covered figures</button>
        </form>
        {coverage.error && <p role="alert">{coverage.error}</p>}
        {coverage.loading && <p role="status">Checking reviewed figures…</p>}
        {coverage.value && (
          <>
            <p>
              Captured <LocalTime value={coverage.value.capturedAt} /> ·{" "}
              {coverage.value.period.start} to {coverage.value.period.end}
            </p>
            {coverage.value.companies.length === 0 && (
              <p>Add a reviewed listing to check company coverage.</p>
            )}
            {coverage.value.companies.map((item) => (
              <CompanyCoverage key={item.member.companyId} item={item} />
            ))}
          </>
        )}
      </section>
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
      <ul className="security-list">
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
      </ul>
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
    <details>
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
    </details>
  );
}
