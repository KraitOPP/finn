import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { Securities } from "./Securities.tsx";

const security = {
  securityId: "11111111-1111-4111-8111-111111111111",
  companyId: "22222222-2222-4222-8222-222222222222",
  companyName: "Fictional Company",
  name: "Fictional Equity",
  isin: null,
  reviewStatus: "USER_CONFIRMED",
};
const reply = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
const session = {
  contractVersion: contractMetadata.contractVersion,
  requestId: "fictional-catalogue-session",
  authenticated: true,
  user: { userId: "fictional-owner", displayName: "Fictional Investor" },
  csrf: {
    headerName: "X-CSRF-TOKEN",
    parameterName: "_csrf",
    token: "fictional-nonfunctional-token",
  },
};

it("requires an explicit result selection and keeps an unresolved exchange visible", async () => {
  const fetcher = vi.fn(async (path: unknown) => {
    const url = String(path);
    if (url === "/api/v1/session") return reply(session);
    if (url === "/api/v1/catalog/companies") return reply([]);
    if (url.includes("?"))
      return reply({
        items: [
          security,
          { ...security, securityId: "33333333-3333-4333-8333-333333333333" },
        ],
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    return reply({ security, listings: [] });
  });
  vi.stubGlobal("fetch", fetcher);
  render(
    <AuthProvider>
      <PrivateView>
        <Securities />
      </PrivateView>
    </AuthProvider>,
  );
  const choices = await screen.findAllByRole("button", {
    name: "Listings for Fictional Equity",
  });
  expect(choices).toHaveLength(2);
  expect(
    fetcher.mock.calls.some(([path]) =>
      String(path).endsWith(security.securityId),
    ),
  ).toBe(false);
  await userEvent.click(choices[1]);
  expect(
    await screen.findByText(/No exchange listing is confirmed/),
  ).toBeInTheDocument();
  expect(
    fetcher.mock.calls.some(([path]) =>
      String(path).endsWith("33333333-3333-4333-8333-333333333333"),
    ),
  ).toBe(true);
  expect(screen.queryByText("NSE · Fictional Equity")).not.toBeInTheDocument();
});

it("shows distinct venues and optional provider mapping without constructing a Yahoo symbol", async () => {
  const base = {
    listingId: "44444444-4444-4444-8444-444444444444",
    securityId: security.securityId,
    companyId: security.companyId,
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
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown) => {
      const url = String(path);
      return reply(
        url === "/api/v1/session"
          ? session
          : url === "/api/v1/catalog/companies"
            ? []
            : url.includes("?")
              ? { items: [security], limit: 50, offset: 0, hasMore: false }
              : {
                  security,
                  listings: [
                    base,
                    {
                      ...base,
                      listingId: "55555555-5555-4555-8555-555555555555",
                      exchange: "BSE",
                      symbol: "900001",
                    },
                  ],
                },
      );
    }),
  );
  render(
    <AuthProvider>
      <PrivateView>
        <Securities />
      </PrivateView>
    </AuthProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", {
      name: "Listings for Fictional Equity",
    }),
  );
  expect(await screen.findByText("NSE · DEMOALPHA")).toBeInTheDocument();
  expect(screen.getByText("BSE · 900001")).toBeInTheDocument();
  expect(screen.getAllByText(/Yahoo: Not mapped/)).toHaveLength(2);
});
