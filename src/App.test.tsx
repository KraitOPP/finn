import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import fixture from "../contracts/fixtures/quote.synthetic.json";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";

const anonymous = () =>
  new Response(
    JSON.stringify({
      contractVersion: "0.3.0",
      requestId: "synthetic-session",
      authenticated: false,
      user: null,
      csrf: {
        headerName: "X-CSRF-TOKEN",
        parameterName: "_csrf",
        token: "nonfunctional-synthetic-token",
      },
    }),
    { headers: { "content-type": "application/json" } },
  );
const response = (value: unknown = fixture) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

describe("synthetic workspace", () => {
  it("loads a typed backend snapshot with source, freshness and demo labels", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        Promise.resolve(
          String(url) === "/api/v1/session" ? anonymous() : response(),
        ),
      ),
    );
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Loading sample snapshot",
    );
    expect(await screen.findByText(fixture.listing.symbol)).toBeInTheDocument();
    expect(
      screen.getByText(`INR ${fixture.observation.close}`),
    ).toBeInTheDocument();
    expect(screen.getByText("Synthetic demo")).toBeInTheDocument();
    expect(
      screen.getByText("Current for the expected completed session"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/live price/i)).not.toBeInTheDocument();
  });

  it("provides a keyboard-operable retry after a network failure", async () => {
    let attempts = 0;
    const fetcher = vi.fn((url) => {
      if (String(url) === "/api/v1/session")
        return Promise.resolve(anonymous());
      attempts += 1;
      return attempts === 1
        ? Promise.reject(new Error("internal detail must not render"))
        : Promise.resolve(response());
    });
    vi.stubGlobal("fetch", fetcher);
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    const retry = await screen.findByRole("button", { name: /try again/i });
    expect(screen.getByRole("alert")).not.toHaveTextContent("internal detail");
    retry.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(fixture.listing.symbol)).toBeInTheDocument();
    expect(
      fetcher.mock.calls.filter(
        ([url]) => String(url) === "/api/v1/demo/quote",
      ),
    ).toHaveLength(2);
  });

  it("rejects incompatible or private provider payloads instead of showing them", async () => {
    const privateValue = structuredClone(fixture);
    privateValue.observation.provenance.provider = "YAHOO_YFINANCE";
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        Promise.resolve(
          String(url) === "/api/v1/session"
            ? anonymous()
            : response(privateValue),
        ),
      ),
    );
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByText(`INR ${fixture.observation.close}`),
    ).not.toBeInTheDocument();
  });

  it("navigates to private pages without revealing account content and recovers unknown routes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url) =>
        Promise.resolve(
          String(url) === "/api/v1/session" ? anonymous() : response(),
        ),
      ),
    );
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    );
    await screen.findByRole("link", { name: /^sign in$/i });
    await userEvent.click(screen.getByRole("link", { name: "Portfolio" }));
    expect(
      await screen.findByRole("heading", { name: "Your private workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Portfolio" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    window.location.hash = "#/missing";
    expect(
      await screen.findByRole("heading", { name: "Page not found" }),
    ).toHaveFocus();
    await userEvent.click(
      screen.getByRole("link", { name: "Return to overview" }),
    );
    await waitFor(() =>
      expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute(
        "aria-current",
        "page",
      ),
    );
    window.location.hash = "";
  });
});
