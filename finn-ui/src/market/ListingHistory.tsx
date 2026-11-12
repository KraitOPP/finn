import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { lazy, Suspense, useCallback, useState } from "react";
import type {
  CatalogueListing,
  ChartRange,
  MarketChart,
} from "../../contracts/generated/models.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPrices } from "./ListingPrices.tsx";

const LineChart = lazy(() =>
  import("@mui/x-charts/LineChart").then((module) => ({
    default: module.LineChart,
  })),
);

const ranges: Record<ChartRange, string> = {
  D1: "1D",
  D7: "7D",
  M1: "1M",
  Y1: "1Y",
  Y5: "5Y",
  ALL: "All",
};
const price = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const dateLabel = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeZone: "Asia/Kolkata",
});
const timeLabel = new Intl.DateTimeFormat("en-IN", {
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: "Asia/Kolkata",
});
const shortDate = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  timeZone: "Asia/Kolkata",
});
const monthLabel = new Intl.DateTimeFormat("en-IN", {
  month: "short",
  year: "2-digit",
  timeZone: "Asia/Kolkata",
});
const yearLabel = new Intl.DateTimeFormat("en-IN", {
  year: "numeric",
  timeZone: "Asia/Kolkata",
});
const axisPrice = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});
const dateAndTime = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});
const displayDate = (date: string) => dateLabel.format(new Date(date));

export function ListingPriceDisclosure({
  listing,
}: {
  listing: CatalogueListing;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary>
        Prices for {listing.symbol} on {listing.exchange}
      </summary>
      {open && <ListingMarketDetail listing={listing} />}
    </details>
  );
}

export function ListingMarketDetail({
  listing,
  compact = false,
}: {
  listing: CatalogueListing;
  compact?: boolean;
}) {
  const [revision, setRevision] = useState(0);
  const updated = useCallback(() => setRevision((value) => value + 1), []);
  const saved = (
    <ListingPrices listing={listing} compact={compact} onChanged={updated} />
  );
  return (
    <Stack spacing={2} sx={{ mt: 2 }}>
      <StockHistoryChart listing={listing} revision={revision} />
      {compact ? (
        <details className="workspace-tools">
          <summary>Saved closes for portfolio and alerts</summary>
          {saved}
        </details>
      ) : (
        saved
      )}
    </Stack>
  );
}

export function StockHistoryChart({
  listing,
  initialRange = "M1",
  revision = 0,
}: {
  listing: CatalogueListing;
  initialRange?: ChartRange;
  revision?: number;
}) {
  const [range, setRange] = useState<ChartRange>(initialRange);
  const [reviewed, setReviewed] = useState(false);
  const params = new URLSearchParams({
    range,
    reviewed: String(reviewed),
    ...(reviewed || !listing.providerSymbol
      ? { revision: String(revision) }
      : {}),
  });
  const history = useResource(
    "MarketChart",
    `/api/v1/market/listings/${listing.listingId}/chart?${params}`,
    24000,
  );
  const value = history.value;
  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label={`${listing.symbol} price history`}
      sx={{ p: { xs: 2, sm: 3 }, minWidth: 0 }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Typography component="h3" variant="h6">
            Price history
          </Typography>
          {value && (
            <Chip
              size="small"
              variant="outlined"
              color={value.today.kind === "HOLIDAY" ? "warning" : "default"}
              label={value.today.label}
              sx={{ alignSelf: { xs: "start", sm: "center" } }}
            />
          )}
        </Stack>
        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={1}
          sx={{ alignItems: { md: "center" }, justifyContent: "space-between" }}
        >
          <ToggleButtonGroup
            exclusive
            size="small"
            aria-label="Price history range"
            value={range}
            sx={{
              alignSelf: "start",
              maxWidth: "100%",
              "& .MuiToggleButton-root": { px: { xs: 1, sm: 1.75 } },
            }}
            onChange={(_, next: ChartRange | null) => {
              if (next) setRange(next);
            }}
          >
            {Object.entries(ranges).map(([value, label]) => (
              <ToggleButton key={value} value={value}>
                {label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: "wrap" }}
          >
            {listing.providerSymbol && (
              <Button size="small" onClick={() => setReviewed(!reviewed)}>
                {reviewed ? "Show Yahoo prices" : "Show saved closes"}
              </Button>
            )}
            <Button
              size="small"
              onClick={history.reload}
              disabled={history.loading}
            >
              Refresh chart
            </Button>
          </Stack>
        </Stack>
        {history.loading && (
          <LinearProgress aria-label="Loading price history" />
        )}
        {history.error && (
          <Alert
            severity="warning"
            action={
              <Button size="small" color="inherit" onClick={history.reload}>
                Retry
              </Button>
            }
          >
            {history.error}
          </Alert>
        )}
        {value && (
          <>
            {value.points.length > 0 ? (
              <PriceSeries value={value} />
            ) : (
              <Alert severity="info">
                No prices are available in this range.
              </Alert>
            )}
            <Typography color="text.secondary" variant="body2">
              {value.source === "YAHOO_YFINANCE"
                ? value.interval === "5M"
                  ? "Yahoo Finance · 5-minute bars from the latest available session · Delay unknown"
                  : "Yahoo Finance · Daily closes · Provider price basis"
                : "Saved, reviewed exchange closes"}
              {value.points.length > 0 &&
                ` · Through ${displayDate(value.points[value.points.length - 1].date)} IST`}
            </Typography>
            {value.today.sourceUrl && (
              <details>
                <summary>{listing.exchange} market calendar</summary>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    {displayDate(value.today.date)} · {value.today.label}
                  </Typography>
                  {value.calendarEvents
                    .filter((event) => event.date !== value.today.date)
                    .map((event) => (
                      <Typography key={event.date} variant="body2">
                        {displayDate(event.date)} ·{" "}
                        {event.sourceUrl ? (
                          <Link
                            href={event.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {event.label}
                          </Link>
                        ) : (
                          event.label
                        )}
                      </Typography>
                    ))}
                  <Link
                    href={value.today.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Exchange calendar notice
                  </Link>
                </Stack>
              </details>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
}

function PriceSeries({ value }: { value: MarketChart }) {
  const { points } = value;
  const last = points[points.length - 1];
  const change = value.changePercent;
  const low = Number(value.low);
  const high = Number(value.high);
  const padding = Math.max((high - low) * 0.12, high * 0.002, 0.01);
  const calendarLabel =
    value.range === "ALL" || value.range === "Y5"
      ? yearLabel
      : value.range === "Y1"
        ? monthLabel
        : shortDate;
  const formatPoint = (point: MarketChart["points"][number]) =>
    point.time
      ? dateAndTime.format(new Date(point.time))
      : displayDate(point.date);
  const lineColor =
    change !== null && Number(change) < 0 ? "#b42318" : "#087f68";
  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: { xs: 2, sm: 4 },
          alignItems: "start",
        }}
      >
        <div>
          <Typography variant="caption" color="text.secondary">
            Latest price
          </Typography>
          <Typography variant="h5" component="p">
            {price.format(Number(last.close))}
          </Typography>
        </div>
        {change !== null && (
          <div>
            <Typography variant="caption" color="text.secondary">
              Range change
            </Typography>
            <Typography variant="h6" component="p" sx={{ color: lineColor }}>
              {Number(change) > 0 ? "+" : ""}
              {change}%
            </Typography>
          </div>
        )}
        {value.low && value.high && (
          <div>
            <Typography variant="caption" color="text.secondary">
              Lowest / highest close
            </Typography>
            <Typography variant="body1">
              {price.format(Number(value.low))} /{" "}
              {price.format(Number(value.high))}
            </Typography>
          </div>
        )}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Suspense
          fallback={
            <Box sx={{ height: 268 }}>
              <LinearProgress aria-label="Loading chart" />
            </Box>
          }
        >
          <LineChart
            title="Observed trading prices in Indian rupees"
            desc="Prices are plotted in trading order. Exact displayed observations are listed below."
            height={268}
            margin={{ top: 12, bottom: 8, right: 29, left: 4 }}
            skipAnimation
            sx={{ "& .MuiLineChart-area": { fillOpacity: 0.16 } }}
            xAxis={[
              {
                scaleType: "point",
                data: points.map((_, index) => index),
                disableTicks: true,
                tickLabelInterval: (index) =>
                  index === points.length - 1 ||
                  (index % Math.max(1, Math.ceil(points.length / 3)) === 0 &&
                    index < points.length * 0.8),
                valueFormatter: (index, context) => {
                  const point = points[index];
                  if (!point) return "";
                  if (context.location === "tooltip") return formatPoint(point);
                  return point.time
                    ? timeLabel.format(new Date(point.time))
                    : calendarLabel.format(new Date(point.date));
                },
              },
            ]}
            yAxis={[
              {
                width: 58,
                min: Math.max(0, low - padding),
                max: high + padding,
                tickNumber: 4,
                domainLimit: "strict",
                valueFormatter: (amount: number) => axisPrice.format(amount),
              },
            ]}
            series={[
              {
                data: points.map((point) => Number(point.close)),
                label: "Price",
                color: lineColor,
                area: true,
                baseline: "min",
                curve: "linear",
                showMark: points.length <= 8,
                valueFormatter: (amount) =>
                  amount === null ? "" : price.format(amount),
              },
            ]}
            grid={{ horizontal: true }}
            hideLegend
          />
        </Suspense>
      </Box>
      <details>
        <summary>View exact prices</summary>
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
          {value.count > points.length
            ? `${points.length} displayed observations out of ${value.count}.`
            : `${value.count} observations.`}
        </Typography>
        <div className="market-table">
          <table>
            <thead>
              <tr>
                <th scope="col">Session (IST)</th>
                <th scope="col">Price (INR)</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((point) => (
                <tr key={point.time ?? point.date}>
                  <th scope="row">{formatPoint(point)}</th>
                  <td>{point.close}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}
