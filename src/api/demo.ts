import { decodeContract } from "../../contracts/decode.ts";
import type { QuoteResponse } from "../../contracts/generated/models.ts";

export async function loadDemoQuote(
  signal: AbortSignal,
  refresh = false,
): Promise<QuoteResponse> {
  const response = await fetch("/api/v1/demo/quote", {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    cache: refresh ? "reload" : "default",
    signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("application/json")
  )
    throw new Error("Sample snapshot unavailable.");
  const text = await response.text();
  if (text.length > 262144) throw new Error("Sample snapshot unavailable.");
  const result = decodeContract("QuoteResponse", JSON.parse(text));
  if (
    result.availability === "AVAILABLE" &&
    (result.observation.provenance.provider !== "SYNTHETIC" ||
      result.observation.provenance.rights.mode !== "SYNTHETIC_PUBLIC_DEMO")
  )
    throw new Error("Sample snapshot unavailable.");
  return result;
}
