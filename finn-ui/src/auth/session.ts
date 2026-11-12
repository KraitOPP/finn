import { decodeContract } from "../../contracts/decode.ts";

export async function fetchSession(signal: AbortSignal) {
  const response = await fetch("/api/v1/session", {
    credentials: "same-origin",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (!response.ok) throw new Error("Session unavailable.");
  return decodeContract("SessionResponse", await response.json());
}
