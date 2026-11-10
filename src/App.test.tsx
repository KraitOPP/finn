import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import fixture from "../contracts/fixtures/quote.synthetic.json";
import { App } from "./App.tsx";

const response = (value: unknown = fixture) =>
  new Response(JSON.stringify(value), {
    headers: { "content-type": "application/json" },
  });

describe("synthetic workspace", () => {
  it("loads a typed backend snapshot with source, freshness and demo labels", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response()));
    render(<App />);
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
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error("internal detail must not render"))
      .mockResolvedValueOnce(response());
    vi.stubGlobal("fetch", fetcher);
    render(<App />);
    const retry = await screen.findByRole("button", { name: /try again/i });
    expect(screen.getByRole("alert")).not.toHaveTextContent("internal detail");
    retry.focus();
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText(fixture.listing.symbol)).toBeInTheDocument();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects incompatible or private provider payloads instead of showing them", async () => {
    const privateValue = structuredClone(fixture);
    privateValue.observation.provenance.provider = "YAHOO_YFINANCE";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(privateValue)));
    render(<App />);
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(
      screen.queryByText(`INR ${fixture.observation.close}`),
    ).not.toBeInTheDocument();
  });
});
