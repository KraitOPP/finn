import { useDisplayInstant } from "../preferences/PreferencesProvider.tsx";

export function LocalTime({ value }: { value: string }) {
  const format = useDisplayInstant();
  return <time dateTime={value}>{format(value)}</time>;
}
