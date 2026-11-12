import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import type { MarketDiagnostics } from "../../contracts/generated/models.ts";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { DataStatus } from "./DataStatus.tsx";

it("distinguishes an upstream failure, stale coverage and the app request limit", async () => {
  const outage: MarketDiagnostics = {
    yahooCapability: "PRIVATE_DAILY",
    officialFiles: "UNVERIFIED",
    streaming: "UNVERIFIED",
    providerDelay: "UNKNOWN",
    providerQuota: "UNKNOWN",
    lastSuccessfulAcquisition: "2026-01-05T09:00:00Z",
    sourceValidationFailuresLastDay: 0,
    failedRunsLastDay: 1,
    coverage: { trackedListings: 2, withClose: 1, recentClose: 0 },
    quota: {
      requestsLastHour: 8,
      hourlyLimit: 8,
      remaining: 0,
      pending: 0,
      pendingLimit: 3,
      status: "HOURLY_LIMIT_REACHED",
    },
    recentRuns: [
      {
        jobId: "fictional-job",
        listingId: "fictional-listing",
        exchange: "NSE",
        symbol: "FICTION.NS",
        state: "FAILED",
        failureCode: "PROVIDER_REQUEST_FAILED",
        rowsReturned: null,
        updatedAt: "2026-01-07T09:00:00Z",
      },
    ],
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input) =>
        new Response(
          JSON.stringify(
            String(input) === "/api/v1/market/status"
              ? outage
              : {
                  contractVersion: contractMetadata.contractVersion,
                  requestId: "fictional-session",
                  authenticated: false,
                  user: null,
                  csrf: null,
                },
          ),
        ),
    ),
  );
  const view = render(
    <AuthProvider>
      <DataStatus />
    </AuthProvider>,
  );
  const disclosure = view.container.querySelector("details");
  if (!disclosure) throw new Error("Missing status disclosure");
  disclosure.open = true;
  fireEvent(disclosure, new Event("toggle"));
  expect(
    await screen.findByText(/1 of 2 distinct watchlist listings/),
  ).toBeVisible();
  expect(screen.getByText(/Hourly limit reached/)).toBeVisible();
  expect(screen.getByText(/Last successful Yahoo download/)).toBeVisible();
  const recent = screen.getByText("Recent refresh details").closest("details");
  if (!recent) throw new Error("Missing refresh disclosure");
  recent.open = true;
  expect(
    screen.getByText("Yahoo was unavailable after retries."),
  ).toBeVisible();
});
