import type {
  FinancialDimensions,
  ReportedFactInput,
} from "../../contracts/generated/models.ts";
import { metricLabels } from "./FinancialFacts.tsx";

export const emptyTarget: FinancialDimensions = {
  metric: "REVENUE",
  basis: "CONSOLIDATED",
  periodKind: "QUARTER",
  periodStart: "",
  periodEnd: "",
  unit: "MONEY",
  currency: "INR",
};
export const targetScales = [
  "ONES",
  "THOUSAND",
  "LAKH",
  "MILLION",
  "CRORE",
  "BILLION",
] as const;
export type TargetScale = ReportedFactInput["scale"];
const currencies = ["INR", "USD", "EUR", "GBP", "JPY"] as const;
const periods = {
  QUARTER: "Quarter",
  YTD: "Year to date",
  FULL_YEAR: "Full year",
  AS_OF: "As of",
} as const;

export function MetricTargetFields({
  value,
  scale,
  onChange,
  required = true,
}: {
  value: FinancialDimensions;
  scale: TargetScale;
  onChange: (value: FinancialDimensions, scale: TargetScale) => void;
  required?: boolean;
}) {
  const stock = ["TOTAL_DEBT", "TOTAL_EQUITY", "MARKET_CAP"].includes(
    value.metric,
  );
  function changeMetric(metric: FinancialDimensions["metric"]) {
    const unit =
      metric === "OPERATING_MARGIN"
        ? "PERCENT"
        : metric === "EPS_BASIC"
          ? "PER_SHARE"
          : "MONEY";
    const isStock = ["TOTAL_DEBT", "TOTAL_EQUITY", "MARKET_CAP"].includes(
      metric,
    );
    onChange(
      {
        ...value,
        metric,
        unit,
        currency: unit === "PERCENT" ? null : (value.currency ?? "INR"),
        periodKind: isStock ? "AS_OF" : stock ? "QUARTER" : value.periodKind,
        periodStart: isStock ? value.periodEnd : value.periodStart,
      },
      unit === "MONEY" ? scale : "ONES",
    );
  }
  return (
    <fieldset className="workspace-fieldset">
      <legend>Reporting context</legend>
      <label>
        Metric{" "}
        <select
          value={value.metric}
          onChange={(event) =>
            changeMetric(event.target.value as FinancialDimensions["metric"])
          }
        >
          {Object.entries(metricLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Statement basis{" "}
        <select
          value={value.basis}
          onChange={(event) =>
            onChange(
              {
                ...value,
                basis: event.target.value as FinancialDimensions["basis"],
              },
              scale,
            )
          }
        >
          <option value="CONSOLIDATED">Consolidated</option>
          <option value="STANDALONE">Standalone</option>
        </select>
      </label>
      {stock ? (
        <p>As of a single date</p>
      ) : (
        <label>
          Reporting period{" "}
          <select
            value={value.periodKind}
            onChange={(event) =>
              onChange(
                {
                  ...value,
                  periodKind: event.target
                    .value as FinancialDimensions["periodKind"],
                },
                scale,
              )
            }
          >
            <option value="QUARTER">Quarter</option>
            <option value="YTD">Year to date</option>
            <option value="FULL_YEAR">Full year</option>
          </select>
        </label>
      )}
      {!stock && (
        <label>
          Period start{" "}
          <input
            required={required}
            type="date"
            value={value.periodStart}
            onChange={(event) =>
              onChange({ ...value, periodStart: event.target.value }, scale)
            }
          />
        </label>
      )}
      <label>
        {stock ? "As-of date" : "Period end"}{" "}
        <input
          required={required}
          type="date"
          value={value.periodEnd}
          onChange={(event) => {
            const periodEnd = event.target.value;
            onChange(
              {
                ...value,
                periodEnd,
                periodStart: stock ? periodEnd : value.periodStart,
              },
              scale,
            );
          }}
        />
      </label>
      {value.currency && (
        <label>
          Currency{" "}
          <select
            value={value.currency}
            onChange={(event) =>
              onChange(
                {
                  ...value,
                  currency: event.target
                    .value as FinancialDimensions["currency"],
                },
                scale,
              )
            }
          >
            {currencies.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
      )}
      {value.unit === "MONEY" && (
        <label>
          Scale{" "}
          <select
            value={scale}
            onChange={(event) =>
              onChange(value, event.target.value as TargetScale)
            }
          >
            {targetScales.map((item) => (
              <option key={item} value={item}>
                {item.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
      )}
    </fieldset>
  );
}

export function TargetContext({ value }: { value: FinancialDimensions }) {
  return (
    <p>
      {metricLabels[value.metric]} ·{" "}
      {value.basis === "CONSOLIDATED" ? "Consolidated" : "Standalone"}
      {" · "}
      {periods[value.periodKind]} ·{" "}
      {value.periodStart === value.periodEnd
        ? value.periodEnd
        : `${value.periodStart} to ${value.periodEnd}`}
    </p>
  );
}

export function TargetAmount({
  value,
  amount,
  scale,
}: {
  value: FinancialDimensions;
  amount: string;
  scale: TargetScale;
}) {
  if (value.unit === "PERCENT") return <>{amount}%</>;
  return (
    <>
      {value.currency} {amount}
      {scale === "ONES" ? "" : ` ${scale.toLowerCase()}`}
      {value.unit === "PER_SHARE" ? " per share" : ""}
    </>
  );
}
