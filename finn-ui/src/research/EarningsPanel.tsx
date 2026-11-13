import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import LinearProgress from "@mui/material/LinearProgress";
import Link from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  EarningsBasis,
  EarningsChange,
  EarningsCurrency,
  EarningsInput,
  EarningsPeriod,
  EarningsReview,
  FinancialFact,
  ReviewedEarningsInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { LocalTime } from "../monitoring/LocalTime.tsx";
import { AnchorEvidence } from "./Evidence.tsx";
import { EvidencePicker, factAmount, metricLabels } from "./FinancialFacts.tsx";
import { DeliveryComparison } from "./GuidanceDelivery.tsx";
import { sessionDate } from "./Radar.tsx";

const qualityMetrics = [
  "OPERATING_PROFIT",
  "EXCEPTIONAL_ITEMS",
  "OTHER_INCOME",
  "TAX_EXPENSE",
  "CASH_FROM_OPERATIONS",
  "PROFIT_AFTER_TAX",
];
const inputMetrics = [
  "REVENUE",
  "OPERATING_PROFIT",
  "PROFIT_AFTER_TAX",
  "EPS_BASIC",
] as const;
const scales = [
  "ONES",
  "THOUSAND",
  "LAKH",
  "MILLION",
  "CRORE",
  "BILLION",
] as const;
const currencies = ["INR", "USD", "EUR", "GBP", "JPY"] as const;

export function EarningsPanel({ company }: { company: string }) {
  const [basis, setBasis] = useState<EarningsBasis>("CONSOLIDATED");
  const [kind, setKind] = useState<EarningsPeriod>("QUARTER");
  const [currency, setCurrency] = useState<EarningsCurrency>("INR");
  const [periodEnd, setPeriodEnd] = useState("");
  const [appliedEnd, setAppliedEnd] = useState("");
  const [anchor, setAnchor] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const path = `/api/v1/research/companies/${company}/earnings`;
  const query = new URLSearchParams({
    basis,
    kind,
    currency,
    ...(appliedEnd ? { periodEnd: appliedEnd } : {}),
  });
  const data = useResource("EarningsReview", `${path}?${query}`);
  const report = data.value;
  const drivers =
    report?.metrics.filter(({ actual }) =>
      qualityMetrics.includes(actual.dimensions.metric),
    ) ?? [];
  function changeContext() {
    setEditing(false);
    setAppliedEnd("");
    setPeriodEnd("");
  }

  return (
    <Paper
      variant="outlined"
      component="section"
      aria-label="Earnings change report"
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography component="h3" variant="h6">
            Earnings change report
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Compare figures from reviewed filings for the same reporting basis
            and currency.
          </Typography>
        </Box>
        <Box
          component="form"
          className="radar-filters"
          onSubmit={(event) => {
            event.preventDefault();
            setAppliedEnd(periodEnd);
            setEditing(false);
          }}
        >
          <TextField
            select
            label="Reporting basis"
            value={basis}
            onChange={(event) => {
              changeContext();
              setBasis(event.target.value as EarningsBasis);
            }}
          >
            <MenuItem value="CONSOLIDATED">Consolidated</MenuItem>
            <MenuItem value="STANDALONE">Standalone</MenuItem>
          </TextField>
          <TextField
            select
            label="Reporting period"
            value={kind}
            onChange={(event) => {
              changeContext();
              setKind(event.target.value as EarningsPeriod);
            }}
          >
            <MenuItem value="QUARTER">Quarter</MenuItem>
            <MenuItem value="FULL_YEAR">Full year</MenuItem>
          </TextField>
          <TextField
            select
            label="Currency"
            value={currency}
            onChange={(event) => {
              changeContext();
              setCurrency(event.target.value as EarningsCurrency);
            }}
          >
            {currencies.map((code) => (
              <MenuItem key={code} value={code}>
                {code}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            type="date"
            label="Period end"
            value={periodEnd}
            onChange={(event) => setPeriodEnd(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Button type="submit" variant="outlined">
            Apply period
          </Button>
        </Box>
        {data.loading && (
          <LinearProgress aria-label="Loading reviewed earnings" />
        )}
        {data.error && (
          <Alert
            severity="warning"
            action={<Button onClick={data.reload}>Retry</Button>}
          >
            {data.error}
          </Alert>
        )}
        {report && !report.current && (
          <Alert severity="info">
            No reviewed filings have matching figures yet. Add figures under
            Sources &amp; facts.
          </Alert>
        )}
        {report?.current && (
          <>
            <Stack
              direction="row"
              spacing={1}
              useFlexGap
              sx={{ flexWrap: "wrap" }}
            >
              <Chip
                size="small"
                label={`Period ending ${sessionDate(report.current.end)}`}
              />
              <Chip
                size="small"
                variant="outlined"
                label={basis === "CONSOLIDATED" ? "Consolidated" : "Standalone"}
              />
              <Chip size="small" variant="outlined" label={currency} />
            </Stack>
            {report.metrics.length ? (
              <section
                className="data-table research-table"
                aria-label="Reviewed figures and changes"
                // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard scrolling when the table exceeds the viewport.
                tabIndex={0}
              >
                <table>
                  <caption>Reviewed figures and changes</caption>
                  <thead>
                    <tr>
                      <th scope="col">Metric</th>
                      <th scope="col">Reported</th>
                      <th scope="col">Year over year</th>
                      {kind === "QUARTER" && (
                        <th scope="col">Quarter over quarter</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {report.metrics.map(
                      ({ actual, yearOverYear, quarterOverQuarter }) => (
                        <tr key={actual.factId}>
                          <th scope="row">
                            {metricLabels[actual.dimensions.metric]}
                          </th>
                          <td>
                            <FactButton fact={actual} open={setAnchor} />
                          </td>
                          <td>
                            <ChangeCell value={yearOverYear} open={setAnchor} />
                          </td>
                          {kind === "QUARTER" && (
                            <td>
                              <ChangeCell
                                value={quarterOverQuarter}
                                open={setAnchor}
                              />
                            </td>
                          )}
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </section>
            ) : (
              <Alert severity="info">
                Figures for this period need a current source and verified
                publication date.
              </Alert>
            )}
            <Box>
              <Typography
                component="h4"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                Earnings quality
              </Typography>
              {drivers.length ? (
                <Typography variant="body2" color="text.secondary">
                  Review{" "}
                  {drivers
                    .map(({ actual }) =>
                      metricLabels[actual.dimensions.metric].toLowerCase(),
                    )
                    .join(", ")}{" "}
                  in the table. A comparison describes changes in reported
                  lines. An earnings bridge requires a complete reconciliation
                  from the filing.
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Operating profit, cash flow, tax, other income and exceptional
                  items appear as reviewed figures become available.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography
                component="h4"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                Management guidance
              </Typography>
              {report.guidance?.length ? (
                report.guidance.map((item) => (
                  <Paper
                    variant="outlined"
                    key={item.guidanceId}
                    sx={{ p: 1.5, mt: 1 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 650 }}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.statementDate && sessionDate(item.statementDate)} ·
                      Version {item.revision} ·{" "}
                      {item.stage === "WITHDRAWN" ? "Withdrawn" : "Confirmed"}
                    </Typography>
                    <Button
                      size="small"
                      onClick={() => setAnchor(item.anchorId)}
                    >
                      Statement passage
                    </Button>
                    <DeliveryComparison item={item} />
                  </Paper>
                ))
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No reviewed guidance for this reporting period.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography
                component="h4"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                Segment performance
              </Typography>
              {report.segments.length ? (
                <Stack component="ul" className="dashboard-list" spacing={1}>
                  {report.segments.map(({ actual, previous, percent }) => (
                    <li key={actual.inputId}>
                      <Typography variant="body2">
                        {actual.label} · {metricLabels[actual.metric]} ·{" "}
                        <InputValue value={actual} open={setAnchor} />
                        {previous && (
                          <>
                            {" "}
                            · Prior year{" "}
                            <InputValue value={previous} open={setAnchor} />
                          </>
                        )}
                        {percent !== null && (
                          <> · {Number(percent).toFixed(2)}%</>
                        )}
                      </Typography>
                    </li>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No segment figures reviewed for this period.
                </Typography>
              )}
            </Box>
            <Box>
              <Typography
                component="h4"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                Reported versus expectations
              </Typography>
              {report.expectations.length ? (
                <Stack component="ul" className="dashboard-list" spacing={1}>
                  {report.expectations.map(
                    ({ actual, estimate, result, percent }) => (
                      <li key={estimate.inputId}>
                        <Typography variant="body2">
                          {metricLabels[actual.dimensions.metric]} ·{" "}
                          {result === "MET"
                            ? "Matched"
                            : result === "ABOVE"
                              ? "Above"
                              : "Below"}{" "}
                          reviewed consensus
                          {percent !== null && (
                            <> · {Number(percent).toFixed(2)}%</>
                          )}{" "}
                          · <FactButton fact={actual} open={setAnchor} />
                          {" vs "}
                          <InputValue value={estimate} open={setAnchor} /> ·{" "}
                          {estimate.label} ·{" "}
                          <LocalTime value={estimate.publishedAt} />
                        </Typography>
                      </li>
                    ),
                  )}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No compatible, sourced estimate dated before the results.
                </Typography>
              )}
            </Box>
            <Button
              variant="outlined"
              sx={{ alignSelf: "start" }}
              onClick={() => setEditing(!editing)}
            >
              {editing
                ? "Close input editor"
                : "Review a segment or consensus figure"}
            </Button>
            {editing && (
              <InputEditor
                company={company}
                report={report}
                path={path}
                onSaved={() => {
                  setEditing(false);
                  data.reload();
                }}
              />
            )}
            {report.truncated && (
              <Typography variant="caption">
                This report reached the reviewed-input limit for the selected
                periods.
              </Typography>
            )}
          </>
        )}
      </Stack>
      <Dialog
        open={anchor !== null}
        onClose={() => setAnchor(null)}
        fullWidth
        maxWidth="md"
        aria-labelledby="earnings-citation-title"
      >
        <DialogTitle id="earnings-citation-title">Filing passage</DialogTitle>
        <DialogContent>
          {anchor && <AnchorEvidence id={anchor} />}
        </DialogContent>
        <Button onClick={() => setAnchor(null)} sx={{ alignSelf: "end", m: 1 }}>
          Close
        </Button>
      </Dialog>
    </Paper>
  );
}

function FactButton({
  fact,
  open,
}: {
  fact: FinancialFact;
  open: (id: string) => void;
}) {
  return (
    <Link component="button" type="button" onClick={() => open(fact.anchorId)}>
      {factAmount(fact)}
    </Link>
  );
}

function ChangeCell({
  value,
  open,
}: {
  value: EarningsChange | null;
  open: (id: string) => void;
}) {
  if (!value) return <span className="muted-copy">Unavailable</span>;
  const delta =
    value.percent !== null
      ? `${Number(value.percent).toFixed(2)}%`
      : value.unit === "PERCENT"
        ? `${Number(value.difference).toFixed(2)} pp`
        : value.difference === "0"
          ? "Flat"
          : Number(value.difference) > 0
            ? "Higher"
            : "Lower";
  return (
    <>
      <strong>{delta}</strong>
      <br />
      <span className="muted-copy">
        From <FactButton fact={value.previous} open={open} />
      </span>
    </>
  );
}

function InputValue({
  value,
  open,
}: {
  value: EarningsInput;
  open: (id: string) => void;
}) {
  const text = `${value.currency} ${value.amount}${value.scale === "ONES" ? "" : ` ${value.scale.toLowerCase()}`}`;
  if (value.anchorId) {
    const id = value.anchorId;
    return (
      <Link component="button" type="button" onClick={() => open(id)}>
        {text}
      </Link>
    );
  }
  return value.sourceUrl ? (
    <Link href={value.sourceUrl} target="_blank" rel="noreferrer">
      {text}
    </Link>
  ) : (
    text
  );
}

function InputEditor({
  company,
  report,
  path,
  onSaved,
}: {
  company: string;
  report: EarningsReview;
  path: string;
  onSaved: () => void;
}) {
  const [kind, setKind] = useState<ReviewedEarningsInput["kind"]>("SEGMENT");
  const [label, setLabel] = useState("");
  const [metric, setMetric] =
    useState<ReviewedEarningsInput["metric"]>("REVENUE");
  const [amount, setAmount] = useState("");
  const [scale, setScale] = useState<ReviewedEarningsInput["scale"]>("CRORE");
  const [anchorId, setAnchorId] = useState("");
  const [sourceUrl, setUrl] = useState("");
  const [publishedAt, setPublished] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const command = usePrivateCommand();
  const period = report.current;
  if (!period) return null;
  const isSegment = kind === "SEGMENT";
  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!reviewed || (isSegment && !anchorId)) return;
        const publication = !isSegment
          ? new Date(`${publishedAt}:00+05:30`).toISOString()
          : null;
        const body: ReviewedEarningsInput = {
          kind,
          label: label.trim(),
          metric,
          currency: report.currency,
          amount: amount.trim(),
          scale,
          anchorId: isSegment ? anchorId : null,
          sourceUrl: isSegment ? null : sourceUrl.trim(),
          publishedAt: publication,
          reviewed: true,
          basis: report.basis,
          periodKind: report.kind,
          periodStart: period.start,
          periodEnd: period.end,
        };
        const saved = await command.run((csrf) =>
          requestContract("EarningsInput", `${path}/inputs`, {
            method: "POST",
            csrf,
            body,
          }),
        );
        if (saved) onSaved();
      }}
    >
      <Box className="radar-filters">
        <TextField
          select
          label="Figure type"
          value={kind}
          onChange={(event) => {
            setKind(event.target.value as typeof kind);
            setMetric("REVENUE");
            setScale("CRORE");
            setReviewed(false);
          }}
        >
          <MenuItem value="SEGMENT">Reported segment</MenuItem>
          <MenuItem value="CONSENSUS">Published consensus</MenuItem>
        </TextField>
        <TextField
          label={isSegment ? "Segment name" : "Consensus publisher"}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          required
          slotProps={{ htmlInput: { maxLength: 100 } }}
        />
        <TextField
          select
          label="Metric"
          value={metric}
          onChange={(event) => {
            const next = event.target.value as typeof metric;
            setMetric(next);
            if (next === "EPS_BASIC") setScale("ONES");
          }}
        >
          {inputMetrics.slice(0, isSegment ? 2 : 4).map((item) => (
            <MenuItem key={item} value={item}>
              {metricLabels[item]}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Reported amount"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          required
        />
        <TextField
          select
          label="Scale"
          value={scale}
          disabled={metric === "EPS_BASIC"}
          onChange={(event) => setScale(event.target.value as typeof scale)}
        >
          {scales.map((item) => (
            <MenuItem key={item} value={item}>
              {item.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {isSegment ? (
        <>
          <EvidencePicker
            company={company}
            onChoose={(location) => setAnchorId(location.anchorId)}
          />
          {anchorId && (
            <Typography variant="body2">Filing passage selected.</Typography>
          )}
        </>
      ) : (
        <Box className="radar-filters">
          <TextField
            label="Published consensus URL"
            type="url"
            required
            value={sourceUrl}
            onChange={(event) => setUrl(event.target.value)}
          />
          <TextField
            label="Publication time (India)"
            type="datetime-local"
            required
            value={publishedAt}
            onChange={(event) => setPublished(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(event) => setReviewed(event.target.checked)}
        />
        I checked the source, value and reporting period.
      </label>
      {command.error && <Alert severity="warning">{command.error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        disabled={!reviewed || command.busy || (isSegment && !anchorId)}
        sx={{ alignSelf: "start" }}
      >
        Save reviewed figure
      </Button>
    </Stack>
  );
}
