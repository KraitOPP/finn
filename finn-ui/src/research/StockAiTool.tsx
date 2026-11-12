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
import { useState } from "react";
import type {
  CatalogueListing,
  StockAiResult,
  StockResearchPreset,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { StockHistoryChart } from "../market/ListingHistory.tsx";
import {
  GoogleSearchSuggestions,
  searchSuggestionsFragment,
} from "./GoogleSearchSuggestions.tsx";

const endpoint = "/api/v1/research/stock-ai";
const presets = {
  DEEP_DIVE: {
    label: "Complete stock analysis",
    description:
      "Business, competition, financials, valuation, governance and upcoming catalysts.",
  },
  FINANCIALS: {
    label: "Results and financial health",
    description:
      "Quarterly and annual results, margins, cash flow, capex and leverage.",
  },
  VALUATION: {
    label: "Valuation and peers",
    description:
      "Comparable companies, dated valuation multiples, growth and key assumptions.",
  },
  RISKS: {
    label: "Risks and catalysts",
    description:
      "Downside risks, regulatory changes, upcoming events and what to watch.",
  },
} as const;
type ResearchPreset = keyof typeof presets;

export function StockAiTool({
  listing,
  news = false,
}: {
  listing: CatalogueListing;
  news?: boolean;
}) {
  const capability = useResource("StockAiCapability", `${endpoint}/capability`);
  const command = usePrivateCommand();
  const [preset, setPreset] = useState<ResearchPreset>("DEEP_DIVE");
  const [result, setResult] = useState<StockAiResult | null>(null);
  const [invalidSuggestions, setInvalidSuggestions] = useState(false);
  const selected: StockResearchPreset = news ? "NEWS" : preset;
  const usesGemini = capability.value?.provider === "GEMINI";

  async function run() {
    setResult(null);
    setInvalidSuggestions(false);
    const next = await command.run((csrf) =>
      requestContract("StockAiResult", endpoint, {
        method: "POST",
        csrf,
        timeoutMs: 60000,
        body: { listingId: listing.listingId, preset: selected },
      }),
    );
    if (!next) return;
    if (
      next.report.searchSuggestions &&
      !searchSuggestionsFragment(next.report.searchSuggestions)
    ) {
      setInvalidSuggestions(true);
      return;
    }
    setResult(next);
  }

  return (
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      <Paper
        variant="outlined"
        component="section"
        sx={{ p: { xs: 2, sm: 3 } }}
      >
        <Stack spacing={2}>
          <Stack
            direction="row"
            sx={{ alignItems: "center", flexWrap: "wrap" }}
            spacing={1}
            useFlexGap
          >
            <Typography component="h3" variant="h6">
              {news ? "Recent news" : "Analyze stock"}
            </Typography>
            <Chip
              variant="outlined"
              size="small"
              label={`${listing.symbol} · ${listing.exchange}`}
            />
          </Stack>
          {news && (
            <Typography color="text.secondary" variant="body2">
              Search the past 30 days for company news and exchange
              announcements.
            </Typography>
          )}
          {!news && (
            <TextField
              select
              fullWidth
              label="Research preset"
              value={preset}
              disabled={command.busy}
              helperText={presets[preset].description}
              onChange={(event) => {
                setPreset(event.target.value as ResearchPreset);
                setResult(null);
                setInvalidSuggestions(false);
              }}
            >
              {Object.entries(presets).map(([id, option]) => (
                <MenuItem key={id} value={id}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          )}
          {capability.loading && (
            <LinearProgress aria-label="Checking research provider" />
          )}
          {capability.error && (
            <Alert
              severity="warning"
              action={
                <Button color="inherit" onClick={capability.reload}>
                  Retry
                </Button>
              }
            >
              {capability.error}
            </Alert>
          )}
          {capability.value?.configured === false && (
            <Alert severity="info">
              Set <code>{usesGemini ? "GEMINI_API_KEY" : "GROQ_API_KEY"}</code>{" "}
              on the FINN backend and restart it.
            </Alert>
          )}
          <Button
            variant="contained"
            disabled={!capability.value?.configured || command.busy}
            sx={{ alignSelf: "start" }}
            onClick={() => void run()}
          >
            {news ? "Find recent news" : "Run analysis"}
          </Button>
          {command.busy && (
            <>
              <LinearProgress aria-label="Searching public sources" />
              <Typography role="status" variant="body2">
                Checking public sources…
              </Typography>
            </>
          )}
          {command.error && <Alert severity="warning">{command.error}</Alert>}
          {invalidSuggestions && (
            <Alert severity="warning">
              Google Search returned an unreadable suggestions panel. Try again.
            </Alert>
          )}
        </Stack>
      </Paper>
      {result && (
        <>
          <GroundedReport result={result} />
          {!news && <StockHistoryChart listing={listing} initialRange="Y1" />}
        </>
      )}
    </Stack>
  );
}

function GroundedReport({ result }: { result: StockAiResult }) {
  const { provider, report } = result;
  const news = report.preset === "NEWS";
  const date = new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeZone: "Asia/Kolkata",
  });
  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Stack spacing={0.5}>
          <Typography component="h3" variant="h6">
            {news
              ? "News results"
              : presets[report.preset as ResearchPreset].label}
          </Typography>
          <Typography color="text.secondary" variant="body2">
            {provider === "GROQ"
              ? "GPT-OSS 120B via Groq Browser Search"
              : "Gemini with Google Search"}{" "}
            · {date.format(new Date(report.asOf))}
          </Typography>
        </Stack>
        {report.items.length === 0 && (
          <Alert severity="info">
            No recent items with a publication date and a matching source were
            found.
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: news ? "minmax(0, 1fr)" : "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {report.items.map((item) => (
            <Paper
              key={item.title}
              component="article"
              variant="outlined"
              sx={{ p: 2, overflowWrap: "anywhere" }}
            >
              <Stack spacing={1}>
                {item.publishedOn && (
                  <Typography variant="caption" color="text.secondary">
                    {date.format(new Date(item.publishedOn))}
                  </Typography>
                )}
                <Typography
                  component="h4"
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  {item.title}
                </Typography>
                <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                  {item.detail}
                </Typography>
                {item.sourceIds.length === 0 && (
                  <Typography variant="caption" color="text.secondary">
                    No citation was supplied for this section.
                  </Typography>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {report.sources
                    .filter((source) => item.sourceIds.includes(source.id))
                    .map((source) => (
                      <Link
                        key={source.id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        variant="body2"
                      >
                        {source.title}
                      </Link>
                    ))}
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Box>
        {report.sources.length > 0 && (
          <details>
            <summary>Sources for this result</summary>
            <ul>
              {report.sources.map((source) => (
                <li key={source.id}>
                  <Link href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        )}
        {report.searchSuggestions && (
          <GoogleSearchSuggestions html={report.searchSuggestions} />
        )}
      </Stack>
    </Paper>
  );
}
