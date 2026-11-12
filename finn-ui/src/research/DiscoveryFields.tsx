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
  return (
    <fieldset>
      <legend>Reporting period</legend>
      <label>
        Period type{" "}
        <select
          value={value.kind}
          onChange={(event) =>
            onChange({
              ...value,
              kind: event.target.value as DiscoveryPeriod["kind"],
            })
          }
        >
          <option value="FULL_YEAR">Full year</option>
          <option value="QUARTER">Quarter</option>
        </select>
      </label>
      <label>
        Start date{" "}
        <input
          required
          type="date"
          value={value.start}
          max={value.end || undefined}
          onChange={(event) =>
            onChange({ ...value, start: event.target.value })
          }
        />
      </label>
      <label>
        End date{" "}
        <input
          required
          type="date"
          value={value.end}
          min={value.start || undefined}
          onChange={(event) => onChange({ ...value, end: event.target.value })}
        />
      </label>
    </fieldset>
  );
}
