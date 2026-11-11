import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import emptyLedger from "../../contracts/fixtures/ledger.synthetic.json";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { PreferencesProvider } from "../preferences/PreferencesProvider.tsx";
import { LedgerPanel } from "./LedgerPanel.tsx";

const base =
  "/api/v1/portfolios/fictional-portfolio/accounts/fictional-account";
const session = {
  contractVersion: contractMetadata.contractVersion,
  requestId: "fictional-ledger-session",
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
  deliveryAvailable: true,
};
const reply = (value: unknown) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });
function view(onSaved: (message: string) => void, archived = false) {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <PrivateView>
          <LedgerPanel base={base} archived={archived} onSaved={onSaved} />
        </PrivateView>
      </PreferencesProvider>
    </AuthProvider>
  );
}

it("reviews exact decimal text before writing and retries the identical command after a lost response", async () => {
  const requests: string[] = [];
  const saved = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown, options?: RequestInit) => {
      const url = String(path);
      if (url.endsWith("/session")) return reply(session);
      if (url.endsWith("/preferences")) return reply(preferences);
      if (url.endsWith("/ledger")) return reply(emptyLedger);
      if (options?.method === "POST") {
        expect(
          (options.headers as Record<string, string>)["X-CSRF-TOKEN"],
        ).toBe("fictional-nonfunctional-token");
        requests.push(String(options.body));
        if (requests.length === 1) throw new Error("Synthetic lost response");
        return reply({
          commandId: "fictional-command",
          revision: 1,
          eventIds: ["fictional-event"],
          replayed: true,
        });
      }
      return reply({ items: [], nextBefore: null });
    }),
  );
  render(view(saved));
  await userEvent.click(
    await screen.findByRole("button", { name: "Record an entry" }),
  );
  await userEvent.selectOptions(
    screen.getByLabelText("Entry type"),
    "OPENING_CASH",
  );
  await userEvent.type(
    screen.getByLabelText("Closing cash baseline (INR)"),
    "250.50",
  );
  await userEvent.click(screen.getByRole("button", { name: "Review entry" }));
  expect(
    await screen.findByText(
      /Sets a recorded closing cash baseline of INR 250.50/,
    ),
  ).toBeInTheDocument();
  expect(requests).toHaveLength(0);
  await userEvent.click(screen.getByRole("button", { name: "Confirm record" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "couldn’t confirm",
  );
  await userEvent.click(
    screen.getByRole("button", { name: "Retry same submission" }),
  );
  await waitFor(() =>
    expect(saved).toHaveBeenCalledWith(
      "This record was already saved. No duplicate was added.",
    ),
  );
  expect(requests).toHaveLength(2);
  expect(requests[1]).toBe(requests[0]);
  expect(JSON.parse(requests[0]).event).toMatchObject({
    kind: "OPENING_CASH",
    amount: "250.50",
    fees: null,
  });
});

it("keeps unknown cost unavailable and archived records readable", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown) => {
      const url = String(path);
      if (url.endsWith("/session")) return reply(session);
      if (url.endsWith("/preferences")) return reply(preferences);
      if (url.endsWith("/ledger"))
        return reply({
          ...emptyLedger,
          revision: 1,
          historyStatus: "HOLDINGS_ONLY",
          coverageStart: "2020-01-02",
          positions: [
            {
              securityId: "fictional-security",
              securityName: "Fictional holding",
              quantity: "3",
              recordedCost: null,
              averageCost: null,
              costBasis: "UNKNOWN",
            },
          ],
        });
      return reply({ items: [], nextBefore: null });
    }),
  );
  render(view(vi.fn(), true));
  const table = await screen.findByRole("table", {
    name: "Open holdings by security",
  });
  expect(within(table).getByText("Fictional holding")).toBeInTheDocument();
  expect(within(table).getAllByText("Unavailable")).toHaveLength(2);
  expect(within(table).getByText("Cost incomplete")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Record an entry" }),
  ).not.toBeInTheDocument();
});
