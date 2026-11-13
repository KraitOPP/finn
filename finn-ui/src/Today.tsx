import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import type { RadarEntry } from "../contracts/generated/models.ts";
import { requestContract } from "./api/request.ts";
import { usePrivateCommand } from "./api/usePrivateCommand.ts";
import { useResource } from "./api/useResource.ts";
import { StockExplorer } from "./instruments/StockExplorer.tsx";
import { LocalTime } from "./monitoring/LocalTime.tsx";
import { RouteHeading } from "./Navigation.tsx";
import { eventTypes } from "./research/Events.tsx";
import {
  companyResearch,
  sessionDate,
  UpcomingEvents,
} from "./research/Radar.tsx";

const path = "/api/v1/briefing";

export function Today() {
  const data = useResource("TodayBriefing", path);
  const command = usePrivateCommand();
  const brief = data.value;
  const count = brief
    ? brief.holdings.length + brief.watchlist.length + brief.candidates.length
    : 0;
  return (
    <section className="today-workspace">
      <div className="today-heading">
        <div>
          <RouteHeading>Today</RouteHeading>
          <Typography color="text.secondary">
            {brief?.lastReviewedThrough ? (
              <>
                Changes since <LocalTime value={brief.lastReviewedThrough} />
              </>
            ) : (
              "Your latest portfolio and research developments."
            )}
          </Typography>
        </div>
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          <Button href="#/discover" variant="contained">
            Open market radar
          </Button>
          <Button href="#/inbox?view=briefs" variant="outlined">
            Briefing schedule
          </Button>
        </Stack>
      </div>
      {data.loading && <LinearProgress aria-label="Loading your briefing" />}
      {data.error && (
        <Alert
          severity="warning"
          action={<Button onClick={data.reload}>Retry</Button>}
        >
          {data.error}
        </Alert>
      )}
      {command.error && <Alert severity="warning">{command.error}</Alert>}
      {brief && (
        <>
          <div className="brief-metrics">
            <BriefMetric
              label="Holding developments"
              value={brief.holdings.length}
            />
            <BriefMetric
              label="Watchlist developments"
              value={brief.watchlist.length}
            />
            <BriefMetric
              label="Research candidates"
              value={brief.candidates.length}
            />
            <BriefMetric label="Upcoming dates" value={brief.upcoming.length} />
          </div>
          <div className="today-grid">
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Section
                title="What changed"
                action={
                  <Button
                    size="small"
                    disabled={command.busy || count === 0}
                    onClick={async () => {
                      const saved = await command.run((csrf) =>
                        requestContract(
                          "TodayBriefingReceipt",
                          `${path}/reviewed`,
                          {
                            method: "POST",
                            csrf,
                            body: { through: brief.through },
                          },
                        ),
                      );
                      if (saved) data.reload();
                    }}
                  >
                    Mark briefing reviewed
                  </Button>
                }
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="p"
                  sx={{ mb: 1.25 }}
                >
                  <LocalTime value={brief.from} /> to{" "}
                  <LocalTime value={brief.through} />
                </Typography>
                {brief.holdings.length === 0 && brief.watchlist.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No new reviewed developments in your holdings or watchlists.
                  </Typography>
                ) : (
                  <>
                    <BriefRows label="Holdings" items={brief.holdings} />
                    <BriefRows label="Watchlist" items={brief.watchlist} />
                  </>
                )}
              </Section>
              <Section
                title="Stocks to investigate"
                action={
                  <Button href="#/discover" size="small">
                    View radar
                  </Button>
                }
              >
                {brief.candidates.length ? (
                  <BriefRows items={brief.candidates} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Check Market radar for recent announcements and new company
                    leads.
                  </Typography>
                )}
              </Section>
            </Stack>
            <Stack spacing={2} sx={{ minWidth: 0 }}>
              <Section title="Upcoming events">
                <UpcomingEvents items={brief.upcoming} />
              </Section>
              <Section title="Open research questions">
                {brief.questions.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    Save a question in a company’s Sources &amp; facts tab to
                    see it here.
                  </Typography>
                ) : (
                  <Stack
                    component="ul"
                    className="dashboard-list"
                    spacing={1.25}
                  >
                    {brief.questions.map((question) => (
                      <li key={question.noteId}>
                        <Typography variant="caption" color="text.secondary">
                          {question.companyName}
                        </Typography>
                        <Typography variant="body2">
                          <Link
                            href={`#/research?company=${question.companyId}&view=questions`}
                          >
                            {question.title}
                          </Link>
                        </Typography>
                      </li>
                    ))}
                  </Stack>
                )}
              </Section>
            </Stack>
          </div>
          <Typography variant="caption" color="text.secondary" component="p">
            Recent Yahoo closes for {brief.recentPrices} of{" "}
            {brief.checkedListings} checked listings.{" "}
            {brief.holdingsCoverage === "PARTIAL"
              ? "Recorded holdings coverage is partial."
              : "Company developments are based on reviewed filings."}
          </Typography>
        </>
      )}
      <StockExplorer embedded />
    </section>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Paper
      component="section"
      variant="outlined"
      className="today-card"
      aria-label={title}
    >
      <Stack
        direction="row"
        useFlexGap
        spacing={1}
        sx={{
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mb: 1.5,
        }}
      >
        <Typography component="h2" variant="h6">
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

function BriefMetric({ label, value }: { label: string; value: number }) {
  return (
    <Paper variant="outlined" className="brief-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </Paper>
  );
}

function BriefRows({ label, items }: { label?: string; items: RadarEntry[] }) {
  if (!items.length) return null;
  return (
    <Box sx={{ mb: 1 }}>
      {label && (
        <Typography component="h3" variant="subtitle2" sx={{ mb: 0.75 }}>
          {label}
        </Typography>
      )}
      <ul className="brief-rows">
        {items.map((item) => {
          const event = item.announcement?.event;
          return (
            <li key={event?.eventId ?? item.stock.companyId}>
              <Stack
                direction="row"
                useFlexGap
                spacing={1}
                sx={{ alignItems: "center", flexWrap: "wrap" }}
              >
                <Typography variant="caption" color="text.secondary">
                  {item.stock.symbol ?? item.stock.companyName}
                </Typography>
                {event?.novelty === "CORRECTION" && (
                  <Chip size="small" color="warning" label="Correction" />
                )}
              </Stack>
              <Typography variant="body2" sx={{ fontWeight: 650 }}>
                <Link
                  underline="hover"
                  href={companyResearch(item.stock, event?.eventId)}
                >
                  {event?.title ??
                    `Unusual trading in ${item.stock.companyName}`}
                </Link>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {event ? (
                  <>
                    {eventTypes[event.subtype]} · Reviewed{" "}
                    <LocalTime value={event.reviewedAt} />
                  </>
                ) : (
                  item.movement && (
                    <>{sessionDate(item.movement.session)} · Yahoo daily</>
                  )
                )}
              </Typography>
            </li>
          );
        })}
      </ul>
    </Box>
  );
}
