import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { contractMetadata } from "../../contracts/generated/schema.ts";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import { CorporateActionsPanel } from "./CorporateActionsPanel.tsx";

it("shows the server's proposed split and requires review before recording", async () => {
  const security = {
    securityId: "fictional-equity",
    companyId: "fictional-issuer",
    companyName: "Fictional issuer",
    name: "Fictional equity",
    isin: null,
    reviewStatus: "USER_CONFIRMED",
  };
  const effect = {
    state: "APPLICABLE",
    reason: null,
    ledgerRevision: 2,
    unitsBefore: "10",
    unitsAfter: "20",
    recordedCostBefore: "100",
    recordedCostAfter: "100",
    cashDelta: "0",
    previousSymbol: null,
    newSymbol: null,
  };
  const session = {
    contractVersion: contractMetadata.contractVersion,
    requestId: "fictional-action-session",
    authenticated: true,
    user: { userId: "fictional-owner", displayName: "Fictional Investor" },
    csrf: {
      headerName: "X-CSRF-TOKEN",
      parameterName: "_csrf",
      token: "fictional-nonfunctional-token",
    },
  };
  const reply = (value: unknown) =>
    new Response(JSON.stringify(value), {
      headers: { "content-type": "application/json" },
    });
  const saved = vi.fn();
  let submitted = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown, options?: RequestInit) => {
      const url = String(path);
      if (url.endsWith("/session")) return reply(session);
      if (url.includes("/catalog/securities?"))
        return reply({
          items: [security],
          limit: 100,
          offset: 0,
          hasMore: false,
        });
      if (url.includes("/catalog/securities/"))
        return reply({ security, listings: [] });
      if (url.endsWith("/preview")) return reply(effect);
      if (options?.method === "POST") {
        const approval = JSON.parse(String(options.body));
        submitted++;
        expect(approval).toMatchObject({
          reviewed: true,
          expectedLedgerRevision: 2,
          action: {
            type: "SPLIT",
            ratioNumerator: 2,
            ratioDenominator: 1,
            sourceReference: "FICT-SPLIT",
          },
        });
        return reply({
          actionId: "fictional-action",
          securityName: security.name,
          action: approval.action,
          effect,
          state: "APPLIED",
          ledgerEventId: "fictional-event",
          ledgerRevision: 3,
          recordedAt: "2020-01-03T01:02:03Z",
          replayed: false,
        });
      }
      return reply({ items: [] });
    }),
  );
  render(
    <AuthProvider>
      <PrivateView>
        <CorporateActionsPanel
          base="/api/v1/portfolios/fictional/accounts/fictional"
          archived={false}
          onRecorded={saved}
        />
      </PrivateView>
    </AuthProvider>,
  );
  await userEvent.click(
    await screen.findByRole("button", { name: "Review a corporate action" }),
  );
  await screen.findByRole("option", { name: "Fictional equity" });
  await userEvent.selectOptions(
    screen.getByLabelText("Security"),
    "fictional-equity",
  );
  fireEvent.change(screen.getByLabelText("Effective date"), {
    target: { value: "2020-01-03" },
  });
  await userEvent.type(screen.getByLabelText("Ratio numerator"), "2");
  await userEvent.type(screen.getByLabelText("Ratio denominator"), "1");
  await userEvent.type(screen.getByLabelText("Source reference"), "FICT-SPLIT");
  await userEvent.click(
    screen.getByRole("button", { name: "Preview effects" }),
  );
  expect(
    await screen.findByText(/Units: 10 → 20. Recorded cost: 100 → 100/),
  ).toBeInTheDocument();
  expect(submitted).toBe(0);
  const record = screen.getByRole("button", { name: "Record reviewed action" });
  expect(record).toBeDisabled();
  await userEvent.click(
    screen.getByRole("checkbox", {
      name: /reviewed the source, date and proposed effects/i,
    }),
  );
  await userEvent.click(record);
  expect(
    await screen.findByText("Reviewed corporate action saved."),
  ).toBeInTheDocument();
  expect(saved).toHaveBeenCalledOnce();
  expect(submitted).toBe(1);
});
