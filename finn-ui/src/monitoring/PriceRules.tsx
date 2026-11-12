import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId, useState } from "react";
import type {
  CatalogueListing,
  PriceRule,
  PriceRuleSettings,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { ListingPicker } from "../instruments/ListingPicker.tsx";
import { StockSearch } from "../instruments/StockSearch.tsx";

import { PriceEvaluations } from "./PriceEvaluations.tsx";

const path = "/api/v1/monitoring/rules";
const comparisons: Record<PriceRuleSettings["comparison"], string> = {
  ABOVE: "Closes above",
  BELOW: "Closes below",
  CROSS_ABOVE: "Crosses above between closes",
  CROSS_BELOW: "Crosses below between closes",
  MOVE_UP: "Rises between closes by at least",
  MOVE_DOWN: "Falls between closes by at least",
};

export function PriceRules() {
  const rules = useResource("PriceRuleList", path);
  const [editing, setEditing] = useState<PriceRule | null>(null);
  const [evaluations, setEvaluations] = useState<string | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);
  return (
    <section className="detail-card">
      <h2>Price alerts</h2>
      <p>
        FINN checks saved daily closes about once a minute. Refresh Yahoo prices
        or add a reviewed close to supply new observations.
      </p>
      {rules.error ? (
        <p role="alert">
          {rules.error}{" "}
          <button type="button" onClick={rules.reload}>
            Retry
          </button>
        </p>
      ) : !rules.value ? (
        <p role="status">Loading price rules…</p>
      ) : rules.value.items.length === 0 ? (
        <p>No price rules saved.</p>
      ) : (
        <ul className="security-list">
          {rules.value.items.map((rule) => (
            <li key={rule.ruleId}>
              <div>
                <strong>{rule.settings.name}</strong>
                <p>
                  {rule.exchange} · {rule.symbol} ·{" "}
                  {comparisons[rule.settings.comparison]}{" "}
                  {rule.settings.comparison.startsWith("MOVE_")
                    ? `${rule.settings.threshold}%`
                    : `₹${rule.settings.threshold}`}{" "}
                  · {rule.settings.enabled ? "Enabled" : "Paused"} · Version{" "}
                  {rule.revision}
                </p>
                <button type="button" onClick={() => setEditing(rule)}>
                  Edit {rule.settings.name}
                </button>{" "}
                <button
                  type="button"
                  onClick={() =>
                    setHistory(history === rule.ruleId ? null : rule.ruleId)
                  }
                >
                  Versions of {rule.settings.name}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEvaluations(
                      evaluations === rule.ruleId ? null : rule.ruleId,
                    )
                  }
                >
                  Evaluations of {rule.settings.name}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {evaluations && <PriceEvaluations key={evaluations} id={evaluations} />}
      {history && <RuleHistory key={history} id={history} />}
      {saved > 0 && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Price alert saved.
        </Alert>
      )}
      <RuleForm
        key={editing ? `${editing.ruleId}-${editing.revision}` : saved}
        rule={editing}
        onCancel={() => setEditing(null)}
        onSave={() => {
          setEditing(null);
          setHistory(null);
          setSaved((value) => value + 1);
          rules.reload();
        }}
      />
    </section>
  );
}

function RuleHistory({ id }: { id: string }) {
  const data = useResource("PriceRuleList", `${path}/${id}/versions`);
  return (
    <section className="settings-card">
      <h3>Saved rule versions</h3>
      {data.error ? (
        <p role="alert">{data.error}</p>
      ) : !data.value ? (
        <p role="status">Loading versions…</p>
      ) : (
        <ul>
          {data.value.items.map((rule) => (
            <li key={rule.revision}>
              Version {rule.revision} · {rule.settings.name} ·{" "}
              {comparisons[rule.settings.comparison]} {rule.settings.threshold}{" "}
              · {rule.settings.enabled ? "Enabled" : "Paused"} ·{" "}
              {rule.createdAt}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RuleForm({
  rule,
  onSave,
  onCancel,
}: {
  rule: PriceRule | null;
  onSave: () => void;
  onCancel: () => void;
}) {
  const command = usePrivateCommand();
  const [settings, setSettings] = useState<PriceRuleSettings>(
    rule?.settings ?? {
      listingId: "",
      name: "",
      source: "MANUAL_REVIEWED",
      comparison: "ABOVE",
      threshold: "",
      maxAgeDays: 4,
      cooldownMinutes: 1440,
      rearm: true,
      enabled: true,
      expiresOn: null,
    },
  );
  const [listingName, setListingName] = useState(
    rule ? `${rule.symbol} · ${rule.exchange}` : "",
  );
  const id = useId();
  function change<K extends keyof PriceRuleSettings>(
    key: K,
    value: PriceRuleSettings[K],
  ) {
    setSettings((old) => ({ ...old, [key]: value }));
  }
  function choose(listing: CatalogueListing) {
    setListingName(`${listing.symbol} · ${listing.exchange}`);
    setSettings((old) => ({
      ...old,
      listingId: listing.listingId,
      source: rule
        ? old.source
        : listing.providerSymbol
          ? "YAHOO_YFINANCE"
          : "MANUAL_REVIEWED",
    }));
  }
  const move = settings.comparison.startsWith("MOVE_");

  return (
    <Paper component="section" variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
      <Stack spacing={2}>
        <Typography component="h3" variant="h6">
          {rule ? "Edit price alert" : "Create a price alert"}
        </Typography>
        {!rule && (
          <StockSearch onOpen={(_, result) => choose(result.listing)} />
        )}
        {listingName && (
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {listingName}
          </Typography>
        )}
        <Stack
          component="form"
          spacing={2}
          onSubmit={async (event) => {
            event.preventDefault();
            const values = {
              ...settings,
              name:
                settings.name.trim() ||
                `${listingName} ${comparisons[settings.comparison]} ${settings.threshold}`.slice(
                  0,
                  80,
                ),
            };
            const result = await command.run((csrf) =>
              requestContract(
                "PriceRule",
                rule ? `${path}/${rule.ruleId}` : path,
                {
                  method: "POST",
                  csrf,
                  body: rule
                    ? { expectedRevision: rule.revision, settings: values }
                    : values,
                },
              ),
            );
            if (result) onSave();
          }}
        >
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              select
              label="Condition"
              value={settings.comparison}
              sx={{ flex: 2 }}
              onChange={(event) =>
                change(
                  "comparison",
                  event.target.value as PriceRuleSettings["comparison"],
                )
              }
            >
              {Object.entries(comparisons).map(([key, label]) => (
                <MenuItem key={key} value={key}>
                  {label}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label={move ? "Move (%)" : "Target price (₹)"}
              value={settings.threshold}
              required
              sx={{ flex: 1 }}
              slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 25 } }}
              onChange={(event) => change("threshold", event.target.value)}
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Checks{" "}
            {settings.source === "YAHOO_YFINANCE"
              ? "saved Yahoo daily closes"
              : "saved, reviewed exchange closes"}
            .
          </Typography>
          <Accordion variant="outlined" disableGutters>
            <AccordionSummary
              id={`${id}-advanced`}
              aria-controls={`${id}-settings`}
              expandIcon={<span aria-hidden="true">⌄</span>}
            >
              Alert settings
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2}>
                <TextField
                  label="Alert name"
                  value={settings.name}
                  slotProps={{ htmlInput: { maxLength: 80 } }}
                  onChange={(event) => change("name", event.target.value)}
                />
                <TextField
                  select
                  label="Price source"
                  value={settings.source}
                  onChange={(event) =>
                    change(
                      "source",
                      event.target.value === "YAHOO_YFINANCE"
                        ? "YAHOO_YFINANCE"
                        : "MANUAL_REVIEWED",
                    )
                  }
                >
                  <MenuItem value="MANUAL_REVIEWED">
                    Reviewed exchange closes
                  </MenuItem>
                  <MenuItem value="YAHOO_YFINANCE">Yahoo daily closes</MenuItem>
                </TextField>
                <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
                  <TextField
                    label="Maximum close age (days)"
                    type="number"
                    value={settings.maxAgeDays}
                    required
                    slotProps={{ htmlInput: { min: 1, max: 4 } }}
                    onChange={(event) =>
                      change("maxAgeDays", Number(event.target.value))
                    }
                  />
                  <TextField
                    label="Cooldown (minutes)"
                    type="number"
                    value={settings.cooldownMinutes}
                    required
                    slotProps={{ htmlInput: { min: 0, max: 10080 } }}
                    onChange={(event) =>
                      change("cooldownMinutes", Number(event.target.value))
                    }
                  />
                  <TextField
                    label="Expiry date (IST)"
                    type="date"
                    value={settings.expiresOn ?? ""}
                    slotProps={{ inputLabel: { shrink: true } }}
                    onChange={(event) =>
                      change("expiresOn", event.target.value || null)
                    }
                  />
                </Stack>
                <FormControlLabel
                  label="Repeat after the condition resets and the cooldown ends"
                  control={
                    <Checkbox
                      checked={settings.rearm}
                      onChange={(event) =>
                        change("rearm", event.target.checked)
                      }
                    />
                  }
                />
                <FormControlLabel
                  label="Enabled"
                  control={
                    <Checkbox
                      checked={settings.enabled}
                      onChange={(event) =>
                        change("enabled", event.target.checked)
                      }
                    />
                  }
                />
              </Stack>
            </AccordionDetails>
          </Accordion>
          {command.error && <Alert severity="error">{command.error}</Alert>}
          <Stack direction="row" spacing={1}>
            <Button
              type="submit"
              variant="contained"
              disabled={command.busy || !settings.listingId}
            >
              {rule ? "Save changes" : "Create alert"}
            </Button>
            {rule && <Button onClick={onCancel}>Cancel</Button>}
          </Stack>
        </Stack>
        <ListingPicker
          busy={command.busy}
          summary="Choose from saved listings"
          action="Select"
          onChoose={choose}
        />
      </Stack>
    </Paper>
  );
}
