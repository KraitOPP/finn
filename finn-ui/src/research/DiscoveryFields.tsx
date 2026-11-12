import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useId } from "react";
import type {
  DiscoveryPeriod,
  DiscoverySector,
} from "../../contracts/generated/models.ts";

export const sectors: Record<DiscoverySector, string> = {
  BANKING: "Banking",
  FINANCIAL_SERVICES: "Financial services",
  MANUFACTURING: "Manufacturing",
  TECHNOLOGY: "Technology",
  CONSUMER: "Consumer",
  ENERGY: "Energy",
  OTHER: "Other",
};
export const emptyPeriod: DiscoveryPeriod = {
  kind: "FULL_YEAR",
  start: "",
  end: "",
};

export function DiscoveryPeriodFields({
  value,
  onChange,
}: {
  value: DiscoveryPeriod;
  onChange: (period: DiscoveryPeriod) => void;
}) {
  const id = useId();
  return (
    <Box component="fieldset" sx={{ m: 0, p: 0, minWidth: 0, border: 0 }}>
      <Typography component="legend" variant="subtitle2" sx={{ mb: 1.5 }}>
        Reporting period
      </Typography>
      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        <TextField
          id={`${id}-kind`}
          select
          fullWidth
          label="Period type"
          value={value.kind}
          onChange={(event) =>
            onChange({
              ...value,
              kind: event.target.value as DiscoveryPeriod["kind"],
            })
          }
        >
          <MenuItem value="FULL_YEAR">Full year</MenuItem>
          <MenuItem value="QUARTER">Quarter</MenuItem>
        </TextField>
        <TextField
          id={`${id}-start`}
          fullWidth
          label="Start date"
          required
          type="date"
          value={value.start}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { max: value.end || undefined },
          }}
          onChange={(event) =>
            onChange({ ...value, start: event.target.value })
          }
        />
        <TextField
          id={`${id}-end`}
          fullWidth
          label="End date"
          required
          type="date"
          value={value.end}
          slotProps={{
            inputLabel: { shrink: true },
            htmlInput: { min: value.start || undefined },
          }}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
        />
      </Box>
    </Box>
  );
}
