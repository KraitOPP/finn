import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import preview from "../../contracts/fixtures/holdings-preview.synthetic.json";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { PreferencesProvider } from "../preferences/PreferencesProvider.tsx";
import { HoldingsImportPanel } from "./HoldingsImportPanel.tsx";

const base =
  "/api/v1/portfolios/fictional-portfolio/accounts/fictional-account";
const media =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const session = {
  contractVersion: contractMetadata.contractVersion,
  requestId: "fictional-import-session",
  authenticated: true,
  user: { userId: "fictional-owner", displayName: "Fictional Investor" },
  csrf: {
    headerName: "X-CSRF-TOKEN",
    parameterName: "_csrf",
    token: "fictional-nonfunctional-token",
  },
};
const preferences = {
  timeZone: "Asia/Kolkata",
  currency: "INR",
  inAppNotifications: true,
  emailNotifications: false,
  revision: 0,
  deliveryAvailable: false,
};
const created = "2020-11-10T10:00:00Z",
  finished = "2020-11-10T10:00:01Z";
const reply = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
const job = (state: "SUCCEEDED" | "FAILED", failureCode: string | null) => ({
  contractVersion: contractMetadata.contractVersion,
  requestId: "fictional-status",
  jobId: preview.jobId,
  revision: 3,
  state,
  createdAt: created,
  updatedAt: finished,
  startedAt: created,
  finishedAt: finished,
  failureCode,
});
function mount() {
  render(
    <AuthProvider>
      <PreferencesProvider>
        <PrivateView>
          <HoldingsImportPanel base={base} archived={false} />
        </PrivateView>
      </PreferencesProvider>
    </AuthProvider>,
  );
}

it("previews raw bytes and posts only after explicit review, with unknown costs by default", async () => {
  let sent = false;
  let accepted = false;
  let reviewed = false;
  const receipt = {
    importId: preview.importId,
    outcome: "APPLIED",
    costMode: "UNITS_ONLY",
    acceptedRows: 2,
    skippedRows: 0,
    duplicateRows: 0,
    ledgerRevision: 2,
    originalImportId: null,
    replayed: false,
    acceptedAt: finished,
  };
  const fetcher = vi.fn(async (path: unknown, options?: RequestInit) => {
    const url = String(path);
    if (url.endsWith("/session")) return reply(session);
    if (url.endsWith("/preferences")) return reply(preferences);
    if (url.includes("/jobs/")) return reply(job("SUCCEEDED", null));
    if (url.includes("/reconciliation")) {
      if (options?.method === "POST") {
        expect(JSON.parse(String(options.body))).toEqual({
          reviewed: true,
          expectedLedgerRevision: 2,
        });
        reviewed = true;
        return reply({
          importId: preview.importId,
          ledgerRevision: 2,
          reviewedAt: finished,
        });
      }
      return reply({
        importId: preview.importId,
        reportDate: "2020-11-09",
        ledgerRevision: 2,
        state: "COMPARABLE",
        coverageStart: "2020-11-09",
        historyStatus: "HOLDINGS_ONLY",
        rowCount: 1,
        issueCount: 1,
        rows: [
          {
            sourceRow: 12,
            securityId: "fictional-security",
            name: "Fictional Alpha Equity",
            isin: "ZZ0000000016",
            reportedUnits: "3",
            recordedUnits: "3",
            reportedCost: "30.75",
            recordedCost: null,
            unitDifference: "0",
            costDifference: null,
            issues: ["COST_UNAVAILABLE"],
          },
        ],
        nextOffset: null,
        reviewedAt: reviewed ? finished : null,
      });
    }
    if (url.includes("/preview?"))
      return reply(
        accepted
          ? {
              ...preview,
              commitAvailable: false,
              review: {
                ...preview.review,
                state: "ALREADY_ACCEPTED",
                currentLedgerRevision: 2,
                receipt,
              },
            }
          : preview,
      );
    if (url.endsWith("/accept")) {
      expect(options?.method).toBe("POST");
      expect(JSON.parse(String(options?.body))).toEqual({
        confirmInr: true,
        retainUnresolvedListings: true,
        acknowledgeDifferences: true,
        costMode: "UNITS_ONLY",
        expectedLedgerRevision: 0,
      });
      accepted = true;
      return reply(receipt);
    }
    if (options?.method === "POST") {
      expect(options.body).toBeInstanceOf(File);
      expect(options.headers).toMatchObject({
        "Content-Type": media,
        "X-CSRF-TOKEN": "fictional-nonfunctional-token",
      });
      expect(options.headers).not.toHaveProperty("X-Filename");
      sent = true;
      return reply({
        importId: preview.importId,
        jobId: preview.jobId,
        duplicate: false,
      });
    }
    return reply({
      items: sent
        ? [
            {
              importId: preview.importId,
              jobId: preview.jobId,
              state: "SUCCEEDED",
              createdAt: created,
              sizeBytes: 400,
              failureCode: null,
            },
          ]
        : [],
    });
  });
  vi.stubGlobal("fetch", fetcher);
  mount();
  await userEvent.upload(
    await screen.findByLabelText("Groww holdings workbook (.xlsx)"),
    new File([new Uint8Array([80, 75, 3, 4])], "fictional.xlsx", {
      type: media,
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Upload for preview" }),
  );
  const summary = await screen.findByRole("table", {
    name: "Report summary compared with source rows",
  });
  expect(within(summary).getByText("50.00")).toBeInTheDocument();
  expect(within(summary).getByText("48.75")).toBeInTheDocument();
  expect(within(summary).getAllByText("Review difference")).toHaveLength(2);
  expect(screen.getByText(/Your ledger has not changed/)).toBeInTheDocument();
  expect(
    screen.getByRole("link", { name: "Download original" }),
  ).toHaveAttribute("href", `${base}/imports/${preview.importId}/original`);
  expect(
    fetcher.mock.calls.filter(([, init]) => init?.method === "POST"),
  ).toHaveLength(1);
  const accept = screen.getByRole("button", {
    name: "Accept opening holdings",
  });
  expect(accept).toBeDisabled();
  await userEvent.click(
    screen.getByRole("checkbox", { name: /confirm that the amounts/i }),
  );
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: /keep exchange listings unresolved/i,
    }),
  );
  expect(accept).toBeDisabled();
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: /reviewed the report and row differences/i,
    }),
  );
  await userEvent.click(accept);
  expect(
    (
      await screen.findAllByText(
        /2 opening holdings recorded with costs left unknown/,
      )
    ).length,
  ).toBeGreaterThan(0);
  expect(
    fetcher.mock.calls.filter(
      ([url, init]) =>
        String(url).endsWith("/accept") && init?.method === "POST",
    ),
  ).toHaveLength(1);
  await userEvent.click(
    await screen.findByRole("button", { name: "Compare with ledger" }),
  );
  expect(
    await screen.findByText("Cost comparison unavailable"),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Save comparison review" }),
  ).toBeDisabled();
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: /reviewed the differences, currency context/i,
    }),
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Save comparison review" }),
  );
  expect(await screen.findByText(/Comparison reviewed/)).toBeInTheDocument();
  expect(screen.getByText("Cost comparison unavailable")).toBeInTheDocument();
});

it("does not offer downloads or retries for a workbook rejected as active content", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown) => {
      const url = String(path);
      if (url.endsWith("/session")) return reply(session);
      if (url.endsWith("/preferences")) return reply(preferences);
      if (url.includes("/jobs/"))
        return reply(job("FAILED", "UNSUPPORTED_PACKAGE_CONTENT"));
      return reply({
        items: [
          {
            importId: preview.importId,
            jobId: preview.jobId,
            state: "FAILED",
            createdAt: created,
            sizeBytes: 400,
            failureCode: "UNSUPPORTED_PACKAGE_CONTENT",
          },
        ],
      });
    }),
  );
  mount();
  await userEvent.click(
    await screen.findByRole("button", { name: "Open preview" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "active or unsupported content",
  );
  expect(
    screen.queryByRole("button", { name: "Retry preview" }),
  ).not.toBeInTheDocument();
  expect(
    screen.queryByRole("link", { name: "Download original" }),
  ).not.toBeInTheDocument();
});
