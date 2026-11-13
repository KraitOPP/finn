import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
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
  ResearchAlertCadence,
  ResearchAlertPreview,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";

const path = "/api/v1/monitoring/research-alerts";
const examples = [
  [
    "Credit downgrade",
    "Alert me when any holding reports a credit-rating downgrade.",
  ],
  [
    "Large order",
    "Notify me if a watchlisted company announces a significant order.",
  ],
  ["Guidance cut", "Tell me when management reduces its guidance."],
  [
    "Revenue and margin",
    "Find companies reporting revenue growth above 20% with improving operating margins.",
  ],
] as const;
const cadences: Record<ResearchAlertCadence, string> = {
  IMMEDIATE: "When reviewed",
  DAILY: "Daily digest",
  WEEKLY: "Weekly digest",
};

export function ResearchAlertRules() {
  const [sentence, setSentence] = useState("");
  const [cadence, setCadence] = useState<ResearchAlertCadence>("IMMEDIATE");
  const [preview, setPreview] = useState<ResearchAlertPreview | null>(null);
  const [notice, setNotice] = useState("");
  const data = useResource("ResearchAlertIndex", path);
  const command = usePrivateCommand();

  function reset() {
    setPreview(null);
    setNotice("");
    command.clearError();
  }

  return (
    <Paper
      component="section"
      variant="outlined"
      aria-label="Plain-language alerts"
      sx={{ p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={2}>
        <Box>
          <Typography component="h2" variant="h6">
            Plain-language alerts
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Preview the exact rule, then turn it on. Rules evaluate new reviewed
            filings and figures.
          </Typography>
        </Box>
        <Stack
          direction="row"
          spacing={0.75}
          useFlexGap
          sx={{ flexWrap: "wrap" }}
        >
          {examples.map(([label, value]) => (
            <Button
              key={label}
              variant="outlined"
              size="small"
              disabled={command.busy}
              onClick={() => {
                setSentence(value);
                reset();
              }}
            >
              {label}
            </Button>
          ))}
        </Stack>
        <Stack
          component="form"
          spacing={1.5}
          onSubmit={async (event) => {
            event.preventDefault();
            reset();
            const result = await command.run((csrf) =>
              requestContract("ResearchAlertPreview", `${path}/preview`, {
                method: "POST",
                csrf,
                body: { sentence, cadence },
              }),
            );
            if (result) setPreview(result);
          }}
        >
          <TextField
            label="Describe an alert"
            value={sentence}
            onChange={(event) => {
              setSentence(event.target.value);
              reset();
            }}
            required
            fullWidth
            disabled={command.busy}
            slotProps={{ htmlInput: { maxLength: 240 } }}
          />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <TextField
              select
              label="Notify"
              value={cadence}
              disabled={command.busy}
              sx={{ minWidth: 155 }}
              onChange={(event) => {
                setCadence(event.target.value as ResearchAlertCadence);
                reset();
              }}
            >
              {Object.entries(cadences).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <Button
              type="submit"
              variant="outlined"
              disabled={command.busy || !sentence.trim()}
            >
              Preview rule
            </Button>
          </Stack>
        </Stack>
        {preview && (
          <Paper
            variant="outlined"
            sx={{ bgcolor: "background.default", p: 2 }}
          >
            <Stack spacing={1}>
              <Typography
                component="h3"
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                {preview.summary}
              </Typography>
              <Typography variant="body2">{preview.schedule}</Typography>
              <Typography variant="body2" color="text.secondary">
                {preview.coverage}
              </Typography>
              <Button
                variant="contained"
                sx={{ alignSelf: "start" }}
                disabled={command.busy}
                onClick={async () => {
                  const saved = await command.run((csrf) =>
                    requestContract("ResearchAlertRule", path, {
                      method: "POST",
                      csrf,
                      body: {
                        sentence: preview.sentence,
                        cadence: preview.criteria.cadence,
                        criteria: preview.criteria,
                      },
                    }),
                  );
                  if (saved) {
                    setPreview(null);
                    setSentence("");
                    setNotice("Research alert is active.");
                    data.reload();
                  }
                }}
              >
                Activate alert
              </Button>
            </Stack>
          </Paper>
        )}
        {notice && <Alert severity="success">{notice}</Alert>}
        {command.error && <Alert severity="warning">{command.error}</Alert>}
        {data.loading && (
          <LinearProgress aria-label="Loading research alerts" />
        )}
        {data.error && (
          <Alert
            severity="warning"
            action={<Button onClick={data.reload}>Retry</Button>}
          >
            {data.error}
          </Alert>
        )}
        {data.value?.items.map((item) => (
          <Paper key={item.ruleId} variant="outlined" sx={{ p: 1.75 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={1.5}
              sx={{
                justifyContent: "space-between",
                alignItems: { sm: "center" },
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 650 }}>
                  {item.preview.summary}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.preview.schedule}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Chip
                  size="small"
                  variant="outlined"
                  label={item.enabled ? "Active" : "Paused"}
                />
                <Button
                  disabled={command.busy}
                  onClick={async () => {
                    const saved = await command.run((csrf) =>
                      requestContract(
                        "ResearchAlertRule",
                        `${path}/${item.ruleId}`,
                        {
                          method: "POST",
                          csrf,
                          body: { enabled: !item.enabled },
                        },
                      ),
                    );
                    if (saved) {
                      setNotice("");
                      data.reload();
                    }
                  }}
                >
                  {item.enabled ? "Pause" : "Resume"}
                </Button>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Paper>
  );
}
