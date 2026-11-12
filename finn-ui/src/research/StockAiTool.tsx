import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
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
import { searchSuggestionsFragment } from "./GoogleSearchSuggestions.tsx";
import { StockResearchReportView } from "./StockResearchReport.tsx";

const endpoint = "/api/v1/research/stock-ai";
const presets = {
  DEEP_DIVE: {
    label: "Complete stock analysis",
    description:
      "A factor-by-factor decision, recent news, source links and a critic review with Groq.",
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
        timeoutMs: selected === "DEEP_DIVE" && !usesGemini ? 90000 : 60000,
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
                {!news && selected === "DEEP_DIVE" && !usesGemini
                  ? "Gathering sources, assessing the stock and reviewing the draft. This can take up to 90 seconds…"
                  : "Checking public sources…"}
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
        <StockResearchReportView
          result={result}
          heading={news ? "News results" : presets[preset].label}
          chart={
            news ? undefined : (
              <StockHistoryChart listing={listing} initialRange="Y1" />
            )
          }
        />
      )}
    </Stack>
  );
}
