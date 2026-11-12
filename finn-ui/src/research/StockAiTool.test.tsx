import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type {
  CatalogueListing,
  StockAiResult,
} from "../../contracts/generated/models.ts";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { StockAiTool } from "./StockAiTool.tsx";

vi.mock("../market/ListingHistory.tsx", () => ({
  StockHistoryChart: () => null,
}));

const endpoint = "/api/v1/research/stock-ai";
const listing: CatalogueListing = {
  listingId: "fictional-listing",
  securityId: "fictional-security",
  companyId: "fictional-company",
  exchange: "NSE",
  segment: "CASH_EQUITY",
  series: "EQ",
  symbol: "DEMOALPHA",
  currency: "INR",
  isin: null,
  providerSymbol: null,
  reviewStatus: "USER_CONFIRMED",
  source: "MANUAL_USER",
  validFrom: "2020-01-01",
};
const session = {
  contractVersion: contractMetadata.contractVersion,
  requestId: "fictional-research-session",
  authenticated: true,
  user: { userId: "fictional-owner", displayName: "Fictional Investor" },
  csrf: {
    headerName: "X-CSRF-TOKEN",
    parameterName: "_csrf",
    token: "fictional-nonfunctional-token",
  },
};

function report(title: string) {
  const result: StockAiResult = {
    provider: "GROQ",
    report: {
      preset: "DEEP_DIVE",
      model: "openai/gpt-oss-120b",
      asOf: "2026-11-12",
      items: [
        {
          title,
          detail: "Fictional company results.",
          publishedOn: "2026-11-01",
          sourceIds: [0],
        },
      ],
      sources: [
        {
          id: 0,
          title: "Fictional results",
          url: "https://example.invalid/results",
        },
      ],
      searchSuggestions: null,
    },
  };
  return Response.json(result);
}

function problem(status: number, code: string, headers?: HeadersInit) {
  return Response.json(
    {
      type: "urn:finn:problem:request",
      title: "Request could not be completed",
      status,
      detail: "Check the request or sign in again.",
      instance: "/api",
      code,
      traceId: "fictional-research-error",
    },
    { status, headers },
  );
}

function openResearch(...responses: Array<() => Response | Promise<Response>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown) => {
      if (path === "/api/v1/session") return Response.json(session);
      if (path === `${endpoint}/capability`)
        return Response.json({
          configured: true,
          provider: "GROQ",
          model: "openai/gpt-oss-120b",
        });
      const response = path === endpoint ? responses.shift() : undefined;
      if (!response) throw new Error("Unexpected test request");
      return response();
    }),
  );
  render(
    <AuthProvider>
      <PrivateView>
        <StockAiTool listing={listing} />
      </PrivateView>
    </AuthProvider>,
  );
}

it("shows the provider failure, keeps the previous report and retries on demand", async () => {
  let failRerun: (response: Response) => void = () => {};
  const rerun = new Promise<Response>((resolve) => {
    failRerun = resolve;
  });
  openResearch(
    () => report("First results"),
    () => rerun,
    () => report("Fresh results"),
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Run analysis" }));
  expect(
    await screen.findByRole("heading", { name: "First results" }),
  ).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Run analysis" }));
  expect(screen.getByRole("heading", { name: "First results" })).toBeVisible();
  failRerun(problem(502, "GROQ_SEARCH_FAILED"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Groq Browser Search couldn’t collect sources for this request. Your previous report is still shown below.",
  );
  expect(screen.getByRole("heading", { name: "First results" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Retry analysis" }));
  expect(
    await screen.findByRole("heading", { name: "Fresh results" }),
  ).toBeVisible();
  expect(
    screen.queryByRole("heading", { name: "First results" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

it("shows the provider’s quota wait and clears it when the preset changes", async () => {
  openResearch(() => problem(429, "GROQ_QUOTA", { "Retry-After": "552" }));
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Run analysis" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Groq’s usage limit has been reached. Try again in about 10 minutes.",
  );
  await user.click(screen.getByRole("combobox", { name: "Research preset" }));
  await user.click(
    screen.getByRole("option", { name: "Results and financial health" }),
  );
  expect(screen.getByRole("button", { name: "Run analysis" })).toBeEnabled();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
