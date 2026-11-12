type Point = { date: string; amount: string | null };

export function GapChart({
  points,
  label,
  unitPrefix = "₹",
}: {
  points: Point[];
  label: string;
  unitPrefix?: string;
}) {
  const values = points.flatMap((point) => {
    const value = Number(point.amount);
    return point.amount !== null && Number.isFinite(value) ? [value] : [];
  });
  if (values.length === 0) return <p>No values available for this period.</p>;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const range = high - low;
  const width = 640;
  const height = 180;
  const padding = 20;
  let previous = false;
  const plotted = points.flatMap((point, index) => {
    if (point.amount === null) {
      previous = false;
      return [];
    }
    const number = Number(point.amount);
    if (!Number.isFinite(number)) {
      previous = false;
      return [];
    }
    const x =
      points.length === 1
        ? width / 2
        : padding + (index * (width - 2 * padding)) / (points.length - 1);
    const y =
      range === 0
        ? height / 2
        : height - padding - ((number - low) * (height - 2 * padding)) / range;
    const command = previous ? "L" : "M";
    previous = true;
    return [{ ...point, x, y, command }];
  });
  return (
    <svg
      role="img"
      aria-label={`${label}. Exact values and missing dates appear in the table below.`}
      className="market-chart"
      viewBox={`0 0 ${width} ${height}`}
    >
      <path
        d={plotted.map(({ command, x, y }) => `${command}${x},${y}`).join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      {plotted.map(({ date, amount, x, y }) => (
        <circle key={date} cx={x} cy={y} r="3" fill="currentColor">
          <title>
            {date}: {unitPrefix}
            {amount}
          </title>
        </circle>
      ))}
    </svg>
  );
}

export function calendarDates(start: string, endExclusive: string) {
  const date = new Date(`${start}T00:00:00Z`);
  const end = Date.parse(`${endExclusive}T00:00:00Z`);
  const days: string[] = [];
  while (date.getTime() < end && days.length < 90) {
    days.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return days;
}
