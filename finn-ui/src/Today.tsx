import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";
import { requestContract } from "./api/request.ts";
import { usePrivateCommand } from "./api/usePrivateCommand.ts";
import { useResource } from "./api/useResource.ts";
import { StockExplorer } from "./instruments/StockExplorer.tsx";
import { LocalTime } from "./monitoring/LocalTime.tsx";
import { RouteHeading } from "./Navigation.tsx";
import { BriefRows, ResearchQuestions } from "./research/BriefingLists.tsx";
import { UpcomingEvents } from "./research/Radar.tsx";

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
                <ResearchQuestions items={brief.questions} />
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
