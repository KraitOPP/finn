import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type {
  CompanyEventType,
  DiscoverySector,
  PortfolioHealth,
  RadarCalendarEntry,
  RadarEntry,
  RadarLeads,
  RadarStock,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { sectors } from "./DiscoveryFields.tsx";
import { eventTypes, eventLabel } from "./Events.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { factAmount } from "./FinancialFacts.tsx";
import { SourceEvidence, versionPath } from "./SourceEvidence.tsx";
import { OrderEvidence } from "./OrderEvidence.tsx";
import { RelatedNews } from "./RelatedNews.tsx";

const path = "/api/v1/discovery";
const scopes = {
  ALL: "All saved companies",
  HELD: "My holdings",
  WATCHLIST: "My watchlists",
} as const;
const kinds = {
  ALL: "Announcements and moves",
  ANNOUNCEMENTS: "Announcements",
  MOVES: "Unusual moves",
} as const;
const liquidityOptions = {
  ALL: "Any liquidity",
  TURNOVER_1_CRORE: "₹1 crore median turnover",
  TURNOVER_10_CRORE: "₹10 crore median turnover",
} as const;
const sizes = {
  ALL: "Any company size",
  BELOW_5000_CRORE: "Below ₹5,000 crore",
  FROM_5000_TO_20000_CRORE: "₹5,000 to under ₹20,000 crore",
  ABOVE_20000_CRORE: "₹20,000 crore and above",
} as const;
const dayFormat = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
export const sessionDate = (date: string) =>
  dayFormat.format(new Date(`${date}T00:00:00Z`));

export function companyResearch(stock: RadarStock, event?: string) {
  const params = new URLSearchParams({ company: stock.companyId });
  if (stock.listingId) params.set("listing", stock.listingId);
  if (event) params.set("event", event);
  return `#/research?${params}`;
}

export function Radar({
  portfolioId,
  impact,
}: {
  portfolioId?: string;
  impact?: PortfolioHealth["eventImpact"];
}) {
  const [days, setDays] = useState(7);
  const [scope, setScope] = useState<keyof typeof scopes>(
    portfolioId ? "HELD" : "ALL",
  );
  const [kind, setKind] = useState<keyof typeof kinds>("ALL");
  const [sector, setSector] = useState<DiscoverySector | "">("");
  const [eventType, setEventType] = useState<CompanyEventType | "">("");
  const [liquidity, setLiquidity] =
    useState<keyof typeof liquidityOptions>("ALL");
  const [size, setSize] = useState<keyof typeof sizes>("ALL");
  const query = new URLSearchParams({
    days: String(days),
    scope,
    kind,
    liquidity,
    size,
  });
  if (sector) query.set("sector", sector);
  if (eventType && kind !== "MOVES") query.set("eventType", eventType);
  if (portfolioId) query.set("portfolioId", portfolioId);
  const resource = useResource("MarketRadar", `${path}/radar?${query}`);
  return (
    <Stack spacing={2}>
      <Paper
        component="section"
        variant="outlined"
        sx={{ p: { xs: 2, sm: 3 } }}
        aria-label="Radar filters"
      >
        <Stack spacing={2}>
          <Box>
            <Typography component="h2" variant="h6">
              {portfolioId ? "Developments in your holdings" : "Market radar"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Reviewed announcements and unusual daily moves for saved
              companies.
            </Typography>
          </Box>
          <Box className="radar-filters">
            <TextField
              select
              label="Time window"
              value={days}
              onChange={(event) => setDays(Number(event.target.value))}
            >
              {[1, 7, 14, 30].map((value) => (
                <MenuItem key={value} value={value}>
                  {value === 1 ? "Today" : `Last ${value} days`}
                </MenuItem>
              ))}
            </TextField>
            {!portfolioId && (
              <TextField
                select
                label="Companies"
                value={scope}
                onChange={(event) =>
                  setScope(event.target.value as typeof scope)
                }
              >
                {Object.entries(scopes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              select
              label="Show"
              value={kind}
              onChange={(event) => setKind(event.target.value as typeof kind)}
            >
              {Object.entries(kinds).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Event type"
              value={eventType}
              disabled={kind === "MOVES"}
              onChange={(event) =>
                setEventType(event.target.value as typeof eventType)
              }
            >
              <MenuItem value="">Any event</MenuItem>
              {Object.entries(eventTypes).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Sector"
              value={sector}
              onChange={(event) =>
                setSector(event.target.value as typeof sector)
              }
            >
              <MenuItem value="">Any sector</MenuItem>
              {Object.entries(sectors).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Liquidity"
              value={liquidity}
              onChange={(event) =>
                setLiquidity(event.target.value as typeof liquidity)
              }
            >
              {Object.entries(liquidityOptions).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            {!portfolioId && (
              <TextField
                select
                label="Company size"
                value={size}
                onChange={(event) => setSize(event.target.value as typeof size)}
              >
                {Object.entries(sizes).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          </Box>
          {size !== "ALL" && (
            <Typography variant="caption" color="text.secondary">
              Size filters require a reviewed INR market cap dated within 90
              days.
            </Typography>
          )}
          {resource.value && (
            <Stack
              direction="row"
              sx={{
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
              }}
              useFlexGap
              spacing={1}
            >
              <Typography variant="body2" color="text.secondary">
                {resource.value.listingsWithRecentPrices} of{" "}
                {resource.value.listingsChecked} listings have a recent Yahoo
                daily close
                {" · "}
                {sessionDate(resource.value.asOf)}
                {resource.value.listingLimitReached
                  ? " · Listing limit reached"
                  : ""}
                {resource.value.holdingsCoverage === "PARTIAL"
                  ? " · Holdings coverage is partial"
                  : ""}
              </Typography>
              <Button onClick={resource.reload}>Refresh radar</Button>
            </Stack>
          )}
        </Stack>
      </Paper>
      {!portfolioId && (
        <PublicLeads
          days={days}
          eventType={kind === "MOVES" ? null : eventType || null}
        />
      )}
      {resource.loading && <LinearProgress aria-label="Loading market radar" />}
      {resource.error && (
        <Alert
          severity="error"
          action={<Button onClick={resource.reload}>Retry</Button>}
        >
          {resource.error}
        </Alert>
      )}
      {resource.value?.items.length === 0 && (
        <Alert severity="info">
          No reviewed events or qualifying moves match these filters.{" "}
          {portfolioId ? (
            "Upcoming dates and events appear as filings are reviewed."
          ) : (
            <Link href="#/instruments">
              Open a stock to fetch daily prices.
            </Link>
          )}
        </Alert>
      )}
      {resource.value?.items.map((item) => (
        <RadarCard
          key={item.announcement?.event.eventId ?? item.stock.companyId}
          item={item}
          equityWeight={
            impact?.find((row) => row.companyId === item.stock.companyId)
              ?.equityWeight
          }
        />
      ))}
      {resource.value?.truncated && (
        <Typography variant="body2">
          Showing the 50 highest-ranked matches. Narrow the filters to see a
          smaller group.
        </Typography>
      )}
    </Stack>
  );
}

function PublicLeads({
  days,
  eventType,
}: {
  days: number;
  eventType: CompanyEventType | null;
}) {
  const command = usePrivateCommand();
  const [leads, setLeads] = useState<RadarLeads | null>(null);
  const [request, setRequest] = useState<{
    days: number;
    eventType: CompanyEventType | null;
  } | null>(null);
  const current = request?.days === days && request?.eventType === eventType;
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={{ p: { xs: 2, sm: 3 } }}
      aria-label="Public NSE event search"
    >
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
          spacing={2}
        >
          <Box>
            <Typography component="h2" variant="h6">
              Find new companies
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Search public sources for recent NSE announcements. Results are
              leads for review.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            disabled={command.busy}
            onClick={async () => {
              setRequest({ days, eventType });
              setLeads(null);
              const result = await command.run((csrf) =>
                requestContract("RadarLeads", `${path}/radar/leads`, {
                  method: "POST",
                  csrf,
                  timeoutMs: 35000,
                  body: { days, eventType },
                }),
              );
              if (result) setLeads(result);
            }}
          >
            {command.busy ? "Searching…" : "Search recent events"}
          </Button>
        </Stack>
        {command.error && current && (
          <Alert severity="warning">{command.error}</Alert>
        )}
        {current && leads?.items.length === 0 && (
          <Typography variant="body2">
            No dated leads matched the NSE directory and source links.
          </Typography>
        )}
        {current &&
          leads?.items.map((item) => (
            <Paper
              variant="outlined"
              key={item.url}
              sx={{ p: 2, overflowWrap: "anywhere" }}
            >
              <Typography variant="caption" color="text.secondary">
                {item.symbol} · {eventTypes[item.eventType]} ·{" "}
                {sessionDate(item.publishedOn)}
              </Typography>
              <Typography
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                {item.headline}
              </Typography>
              <Typography variant="body2">{item.detail}</Typography>
              <Stack
                direction="row"
                spacing={1}
                useFlexGap
                sx={{ alignItems: "center", flexWrap: "wrap", mt: 1 }}
              >
                <Link href={item.url} target="_blank" rel="noreferrer">
                  Read source
                </Link>
                <Button
                  href={`#/research?symbol=${encodeURIComponent(item.symbol)}`}
                >
                  Research {item.companyName}
                </Button>
              </Stack>
            </Paper>
          ))}
      </Stack>
    </Paper>
  );
}

export function RadarCard({
  item,
  equityWeight,
}: {
  item: RadarEntry;
  equityWeight?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const { stock, announcement, movement, sectorMove } = item;
  const event = announcement?.event;
  const evidence = useResource(
    "CompanySourceDetail",
    open && event
      ? versionPath(event.documentId, event.documentRevision)
      : null,
  );
  return (
    <Paper
      component="article"
      variant="outlined"
      aria-labelledby={id}
      sx={{ p: { xs: 2, sm: 2.5 }, overflowWrap: "anywhere" }}
    >
      <Stack spacing={1.25}>
        <Stack
          direction="row"
          spacing={1}
          useFlexGap
          sx={{ flexWrap: "wrap", alignItems: "center" }}
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {stock.symbol
              ? `${stock.symbol} · ${stock.exchange}`
              : stock.companyName}
          </Typography>
          {stock.sector && (
            <Chip
              size="small"
              variant="outlined"
              label={sectors[stock.sector]}
            />
          )}
          {stock.held && <Chip size="small" color="primary" label="Held" />}
          {stock.watched && (
            <Chip size="small" variant="outlined" label="Watchlist" />
          )}
          {equityWeight && (
            <Chip
              size="small"
              variant="outlined"
              label={`${Number(equityWeight).toFixed(1)}% of equity`}
            />
          )}
          {event?.novelty === "CORRECTION" && (
            <Chip size="small" color="warning" label="Correction" />
          )}
        </Stack>
        <Typography id={id} component="h3" variant="h6">
          {event?.title ?? `Unusual trading in ${stock.companyName}`}
        </Typography>
        {announcement && (
          <Typography variant="body2" color="text.secondary">
            {eventTypes[announcement.event.subtype]} · {announcement.sourceName}{" "}
            ·{" "}
            {announcement.publishedAt ? (
              <LocalTime value={announcement.publishedAt} />
            ) : (
              "Publication date unavailable"
            )}
          </Typography>
        )}
        {movement && (
          <Stack
            direction="row"
            spacing={2}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {movement.changePercent !== null && (
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                {Number(movement.changePercent).toFixed(2)}% adjusted close
                change
              </Typography>
            )}
            {movement.volumeMultiple !== null && (
              <Typography variant="body2">
                {Number(movement.volumeMultiple).toFixed(2)}× typical volume
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {sessionDate(movement.session)} · Yahoo daily
            </Typography>
          </Stack>
        )}
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button
            href={companyResearch(stock, event?.eventId)}
            variant="outlined"
          >
            Open research
          </Button>
          {announcement?.sourceUrl && (
            <Button
              href={announcement.sourceUrl}
              target="_blank"
              rel="noreferrer"
            >
              Original announcement
            </Button>
          )}
        </Stack>
        <details onToggle={(change) => setOpen(change.currentTarget.open)}>
          <summary>Why this surfaced</summary>
          <ul>
            {item.reasons.map((reason) => (
              <li key={reason.label}>
                {reason.label} (+{reason.points})
              </li>
            ))}
          </ul>
          {sectorMove && (
            <p>
              Median move of {sectorMove.peers} saved same-sector peers on the
              same exchange and session:{" "}
              {Number(sectorMove.medianChangePercent).toFixed(2)}%.
            </p>
          )}
          {event && movement && (
            <p>
              The announcement and price move are shown together for context.
              The reason for the move is unverified.
            </p>
          )}
          {!event && (
            <p>
              Review recent filings to see whether a company development
              coincided with the move.
            </p>
          )}
          {evidence.loading && (
            <LinearProgress aria-label="Loading reviewed source" />
          )}
          {evidence.error && <Alert severity="warning">{evidence.error}</Alert>}
          {evidence.value && <SourceEvidence detail={evidence.value} />}
          {open && item.marketCapitalization && (
            <details>
              <summary>
                Reviewed market cap · {factAmount(item.marketCapitalization)}
              </summary>
              <AnchorEvidence id={item.marketCapitalization.anchorId} />
            </details>
          )}
          {open && event?.subtype === "ORDER" && (
            <OrderEvidence event={event} />
          )}
          {open && event && <RelatedNews event={event} />}
        </details>
      </Stack>
    </Paper>
  );
}

export function UpcomingEvents({ items }: { items: RadarCalendarEntry[] }) {
  return items.length === 0 ? (
    <Typography color="text.secondary" variant="body2">
      No upcoming dates in your reviewed filings.
    </Typography>
  ) : (
    <Stack spacing={1.25} component="ul" className="dashboard-list">
      {items.map(({ stock, event, date }) => (
        <li key={`${event.eventId}-${date.type}`}>
          <Typography variant="caption" color="text.secondary">
            {sessionDate(date.date)} · {stock.symbol ?? stock.companyName} ·{" "}
            {eventLabel(date.certainty)}
          </Typography>
          <Typography variant="body2">
            <Link href={companyResearch(stock, event.eventId)}>
              {event.title}
            </Link>
          </Typography>
        </li>
      ))}
    </Stack>
  );
}
