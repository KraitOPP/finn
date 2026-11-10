import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import type {
  InvestmentAccount,
  PortfolioSummary,
} from "../../contracts/generated/models.ts";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { Portfolios } from "./Portfolios.tsx";

it("creates an INR source account and restores an archived portfolio without losing its account", async () => {
  let portfolio: PortfolioSummary | null = null;
  const accounts: InvestmentAccount[] = [];
  const revisions: number[] = [];
  const reply = (value: unknown) =>
    new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json" },
    });
  const fetcher = vi.fn(async (path: unknown, options?: RequestInit) => {
    const url = String(path);
    if (url === "/api/v1/session")
      return reply({
        contractVersion: contractMetadata.contractVersion,
        requestId: "fictional-portfolio-session",
        authenticated: true,
        user: { userId: "fictional-owner", displayName: "Fictional Investor" },
        csrf: {
          headerName: "X-CSRF-TOKEN",
          parameterName: "_csrf",
          token: "fictional-nonfunctional-token",
        },
      });
    if (options?.method === "POST") {
      expect((options.headers as Record<string, string>)["X-CSRF-TOKEN"]).toBe(
        "fictional-nonfunctional-token",
      );
      const input = JSON.parse(String(options.body));
      if (url.endsWith("/archive")) {
        if (!portfolio) throw new Error("No test portfolio");
        revisions.push(input.revision);
        portfolio = {
          ...portfolio,
          archived: input.archived,
          revision: portfolio.revision + 1,
        };
        return reply(portfolio);
      }
      if (url.endsWith("/accounts")) {
        if (!portfolio) throw new Error("No test portfolio");
        const account: InvestmentAccount = {
          ...input,
          accountId: "22222222-2222-4222-8222-222222222222",
          portfolioId: portfolio.portfolioId,
          historyStatus: "UNKNOWN",
          historyStartDate: null,
        };
        accounts.push(account);
        return reply(account);
      }
      portfolio = {
        portfolioId: "11111111-1111-4111-8111-111111111111",
        name: input.name,
        currency: "INR",
        archived: false,
        revision: 0,
      };
      return reply(portfolio);
    }
    return reply(
      url === "/api/v1/portfolios"
        ? { items: portfolio ? [portfolio] : [] }
        : { portfolio, accounts },
    );
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <AuthProvider>
      <PrivateView>
        <Portfolios />
      </PrivateView>
    </AuthProvider>,
  );
  expect(
    await screen.findByRole("heading", { name: "Create your first portfolio" }),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByText("Create a portfolio", { exact: true }),
  );
  await userEvent.type(
    screen.getByLabelText("Portfolio name"),
    "Fictional long-term holdings",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Create portfolio" }),
  );
  expect(
    await screen.findByRole("heading", {
      name: "Fictional long-term holdings",
    }),
  ).toBeInTheDocument();
  await userEvent.click(
    screen.getByText("Add a source account", { exact: true }),
  );
  await userEvent.type(
    screen.getByLabelText("Account name"),
    "Fictional Groww source",
  );
  await userEvent.click(screen.getByRole("button", { name: "Add account" }));
  expect(
    await screen.findByRole("button", {
      name: "Open account Fictional Groww source",
    }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByText(/History coverage unknown/).length,
  ).toBeGreaterThan(0);
  await userEvent.click(
    screen.getByRole("button", { name: "Archive portfolio" }),
  );
  expect(
    await screen.findByRole("button", { name: "Restore portfolio" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Open account Fictional Groww source" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Add a source account", { exact: true }),
  ).not.toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Restore portfolio" }),
  );
  expect(
    await screen.findByText("Add a source account", { exact: true }),
  ).toBeInTheDocument();
  expect(revisions).toEqual([0, 1]);
  expect(accounts).toHaveLength(1);
  expect(accounts[0]).toMatchObject({
    source: "GROWW",
    currency: "INR",
    historyStatus: "UNKNOWN",
  });
});
