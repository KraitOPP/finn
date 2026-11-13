import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import type {
  CompanyEvent,
  ReviewedOrderInput,
} from "../../contracts/generated/models.ts";
import { requestContract } from "../api/request.ts";
import { usePrivateCommand } from "../api/usePrivateCommand.ts";
import { useResource } from "../api/useResource.ts";
import { AnchorEvidence } from "./Evidence.tsx";
import { EvidencePicker, factAmount } from "./FinancialFacts.tsx";

const rupees = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});
const scales = [
  "ONES",
  "THOUSAND",
  "LAKH",
  "MILLION",
  "CRORE",
  "BILLION",
] as const;

export function OrderEvidence({
  event,
  editable = false,
}: {
  event: CompanyEvent;
  editable?: boolean;
}) {
  const path = `/api/v1/research/events/${event.eventId}/order`;
  const resource = useResource("OrderContext", path);
  const [editing, setEditing] = useState(false);
  const [anchor, setAnchor] = useState<string | null>(null);
  const order = resource.value?.order;
  return (
    <Stack spacing={1}>
      {resource.error && <Alert severity="warning">{resource.error}</Alert>}
      {order && (
        <>
          <Typography variant="subtitle2">Reviewed order size</Typography>
          <Typography variant="body2">
            {rupees.format(Number(order.amount))} ·{" "}
            {Number(order.percent).toFixed(2)}% of {factAmount(order.revenue)}{" "}
            consolidated revenue for the year ended{" "}
            {order.revenue.dimensions.periodEnd}.
          </Typography>
          <Typography variant="body2">
            Execution period · {order.execution}
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            spacing={1}
            sx={{ flexWrap: "wrap" }}
          >
            <Button
              onClick={() =>
                setAnchor(anchor === order.anchorId ? null : order.anchorId)
              }
            >
              Order passage
            </Button>
            <Button
              onClick={() =>
                setAnchor(
                  anchor === order.revenue.anchorId
                    ? null
                    : order.revenue.anchorId,
                )
              }
            >
              Revenue passage
            </Button>
          </Stack>
          {anchor && <AnchorEvidence key={anchor} id={anchor} />}
        </>
      )}
      {resource.value && !order && editable && (
        <>
          <Button
            variant="outlined"
            sx={{ alignSelf: "start" }}
            onClick={() => setEditing(!editing)}
          >
            {editing
              ? "Cancel order comparison"
              : "Compare order value with annual revenue"}
          </Button>
          {editing && (
            <OrderForm
              event={event}
              path={path}
              onSaved={() => {
                setEditing(false);
                resource.reload();
              }}
            />
          )}
        </>
      )}
    </Stack>
  );
}

function OrderForm({
  event,
  path,
  onSaved,
}: {
  event: CompanyEvent;
  path: string;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [scale, setScale] = useState<ReviewedOrderInput["scale"]>("CRORE");
  const [execution, setExecution] = useState("");
  const [anchorId, setAnchorId] = useState("");
  const [revenueId, setRevenueId] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const command = usePrivateCommand();
  const data = useResource(
    "EarningsReview",
    `/api/v1/research/companies/${event.companyId}/earnings?kind=FULL_YEAR`,
  );
  const revenue = data.value?.metrics.find(
    ({ actual }) => actual.dimensions.metric === "REVENUE",
  );
  const eligible = [revenue?.actual, revenue?.yearOverYear?.previous].filter(
    (fact) => fact !== undefined,
  );
  const selected = eligible.find((fact) => fact.factId === revenueId);
  return (
    <Stack
      component="form"
      spacing={1.5}
      onSubmit={async (change) => {
        change.preventDefault();
        if (!reviewed || !selected || !anchorId) return;
        const body: ReviewedOrderInput = {
          versionId: event.versionId,
          anchorId,
          revenueFactId: selected.factId,
          revenueRevision: selected.revision,
          amount: amount.trim(),
          scale,
          execution: execution.trim(),
          reviewed: true,
        };
        const saved = await command.run((csrf) =>
          requestContract("OrderContext", path, { method: "POST", csrf, body }),
        );
        if (saved) onSaved();
      }}
    >
      <Box className="radar-filters">
        <TextField
          label="Announced INR value"
          value={amount}
          required
          onChange={(change) => setAmount(change.target.value)}
        />
        <TextField
          select
          label="Scale"
          value={scale}
          onChange={(change) => setScale(change.target.value as typeof scale)}
        >
          {scales.map((value) => (
            <MenuItem key={value} value={value}>
              {value.toLowerCase()}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Disclosed execution period"
          value={execution}
          required
          onChange={(change) => setExecution(change.target.value)}
          slotProps={{ htmlInput: { maxLength: 160 } }}
        />
        <TextField
          select
          label="Reviewed annual revenue"
          value={revenueId}
          onChange={(change) => setRevenueId(change.target.value)}
        >
          <MenuItem value="">Choose a fiscal year</MenuItem>
          {eligible.map((fact) => (
            <MenuItem key={fact.factId} value={fact.factId}>
              {fact.dimensions.periodEnd} · {factAmount(fact)}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      {!data.loading && eligible.length === 0 && (
        <Alert severity="info">
          Add a reviewed consolidated full-year INR revenue figure first.
        </Alert>
      )}
      <EvidencePicker
        company={event.companyId}
        onChoose={(location) => setAnchorId(location.anchorId)}
      />
      {anchorId && (
        <Typography variant="body2">Order passage selected.</Typography>
      )}
      <label className="check-label">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(change) => setReviewed(change.target.checked)}
        />
        I checked the award amount and execution period in the cited filing.
      </label>
      {command.error && <Alert severity="warning">{command.error}</Alert>}
      <Button
        type="submit"
        variant="contained"
        sx={{ alignSelf: "start" }}
        disabled={!reviewed || !selected || !anchorId || command.busy}
      >
        Save order comparison
      </Button>
    </Stack>
  );
}
