import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useResource } from "../api/useResource.ts";
import { Radar, UpcomingEvents } from "../research/Radar.tsx";

export function PortfolioDevelopments({ portfolio }: { portfolio: string }) {
  const data = useResource(
    "RadarCalendar",
    `/api/v1/discovery/portfolio-calendar?portfolioId=${portfolio}`,
  );
  const health = useResource(
    "PortfolioHealth",
    `/api/v1/portfolios/${portfolio}/health`,
  );
  return (
    <Stack spacing={2}>
      <Paper
        variant="outlined"
        component="section"
        aria-label="Portfolio event calendar"
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={1.25}>
          <Typography component="h3" variant="h6">
            Portfolio event calendar
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Reviewed company dates in the next 60 days.
          </Typography>
          {data.loading && (
            <LinearProgress aria-label="Loading portfolio event calendar" />
          )}
          {data.error && (
            <Alert
              severity="warning"
              action={<Button onClick={data.reload}>Retry</Button>}
            >
              {data.error}
            </Alert>
          )}
          {data.value?.holdingsCoverage === "PARTIAL" && (
            <Typography variant="caption">
              Recorded holdings coverage is partial.
            </Typography>
          )}
          {data.value && <UpcomingEvents items={data.value.items} />}
          <Link href="#/inbox?view=alerts" variant="body2">
            Create a holdings alert
          </Link>
        </Stack>
      </Paper>
      {health.value && health.value.state !== "READY" && (
        <Alert severity="info">
          Equity weights require current prices from the same session for all
          holdings.
        </Alert>
      )}
      {health.error && (
        <Alert
          severity="warning"
          action={<Button onClick={health.reload}>Retry</Button>}
        >
          {health.error}
        </Alert>
      )}
      <Radar portfolioId={portfolio} impact={health.value?.eventImpact} />
    </Stack>
  );
}
