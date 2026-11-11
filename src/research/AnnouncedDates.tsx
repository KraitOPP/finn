import type { AnnouncedEventDate } from "../../contracts/generated/models.ts";

const labels = {
  MEETING: "Meeting",
  RESULTS: "Results",
  EX_DATE: "Ex-date",
  RECORD_DATE: "Record date",
  OTHER: "Other date",
} as const;
const types = [
  "MEETING",
  "RESULTS",
  "EX_DATE",
  "RECORD_DATE",
  "OTHER",
] as const;

export function AnnouncedDates({ dates }: { dates: AnnouncedEventDate[] }) {
  return (
    dates.length > 0 && (
      <ul>
        {dates.map((item) => (
          <li key={item.type}>
            {labels[item.type]} · {item.date} · {item.certainty.toLowerCase()}
          </li>
        ))}
      </ul>
    )
  );
}

export function EditAnnouncedDates({
  dates,
  onChange,
}: {
  dates: AnnouncedEventDate[];
  onChange: (dates: AnnouncedEventDate[]) => void;
}) {
  function set(
    type: AnnouncedEventDate["type"],
    date: string,
    certainty: AnnouncedEventDate["certainty"],
  ) {
    const others = dates.filter((item) => item.type !== type);
    onChange(date ? [...others, { type, date, certainty }] : others);
  }
  return (
    <details>
      <summary>Announced dates (optional)</summary>
      {types.map((type) => {
        const current = dates.find((date) => date.type === type);
        return (
          <div className="market-filters" key={type}>
            <label>
              {labels[type]}{" "}
              <input
                type="date"
                value={current?.date ?? ""}
                onChange={(event) =>
                  set(
                    type,
                    event.target.value,
                    current?.certainty ?? "TENTATIVE",
                  )
                }
              />
            </label>
            <label>
              {labels[type]} status{" "}
              <select
                disabled={!current}
                value={current?.certainty ?? "TENTATIVE"}
                onChange={(event) =>
                  set(
                    type,
                    current?.date ?? "",
                    event.target.value as AnnouncedEventDate["certainty"],
                  )
                }
              >
                <option value="TENTATIVE">Tentative</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </label>
          </div>
        );
      })}
    </details>
  );
}
