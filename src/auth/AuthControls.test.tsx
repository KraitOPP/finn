import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AuthControls, SessionNotice } from "./AuthControls.tsx";
import { AuthProvider } from "./AuthProvider.tsx";

const payload = (authenticated: boolean) => ({
  contractVersion: "0.6.0",
  requestId: "synthetic-auth-request",
  authenticated,
  user: authenticated
    ? {
        userId: "synthetic-user",
        displayName: "<script>fictional name</script>",
      }
    : null,
  csrf: {
    headerName: "X-CSRF-TOKEN",
    parameterName: "_csrf",
    token: "nonfunctional-synthetic-token",
  },
});
const reply = (authenticated: boolean) =>
  new Response(JSON.stringify(payload(authenticated)), {
    headers: { "content-type": "application/json" },
  });
afterEach(() => vi.useRealTimers());

it("renders the sign-in link without exposing provider configuration", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(false)));
  render(
    <AuthProvider>
      <AuthControls />
    </AuthProvider>,
  );
  expect(await screen.findByRole("link", { name: /sign in/i })).toHaveAttribute(
    "href",
    "/oauth2/authorization/finn",
  );
});

it("renders user text safely and submits logout using the session CSRF parameter", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(true)));
  render(
    <AuthProvider>
      <AuthControls />
    </AuthProvider>,
  );
  expect(
    await screen.findByText("<script>fictional name</script>"),
  ).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
  const form = screen.getByRole("button", { name: "Sign out" }).closest("form");
  expect(form).toHaveAttribute("method", "post");
  expect(form).toHaveAttribute("action", "/api/v1/logout");
  expect(form?.querySelector("input[name='_csrf']")).toHaveValue(
    "nonfunctional-synthetic-token",
  );
});

it("removes the account controls when the server reports session expiry", async () => {
  vi.useFakeTimers();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(reply(true))
    .mockResolvedValueOnce(reply(false));
  vi.stubGlobal("fetch", fetcher);
  render(
    <AuthProvider>
      <AuthControls />
      <SessionNotice />
    </AuthProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(
    screen.queryByRole("button", { name: "Sign out" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("Your session ended");
});
