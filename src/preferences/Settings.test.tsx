import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { AuthProvider } from "../auth/AuthProvider.tsx";
import { PrivateView } from "../Navigation.tsx";
import {
  PreferencesProvider,
  useDisplayInstant,
} from "./PreferencesProvider.tsx";
import { Settings } from "./Settings.tsx";

const defaults = {
  timeZone: "Asia/Kolkata",
  currency: "INR",
  inAppNotifications: true,
  emailNotifications: false,
  revision: 0,
  deliveryAvailable: false,
};
const session = (authenticated = true) => ({
  contractVersion: "0.14.0",
  requestId: "fictional-session",
  authenticated,
  user: authenticated
    ? { userId: "fictional-settings-owner", displayName: "Fictional Investor" }
    : null,
  csrf: {
    headerName: "X-CSRF-TOKEN",
    parameterName: "_csrf",
    token: "fictional-nonfunctional-token",
  },
});
const reply = (value: unknown, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
function DisplayTime() {
  const format = useDisplayInstant();
  return (
    <output aria-label="Example instant">
      {format("2030-01-02T00:00:00Z")}
    </output>
  );
}
function View() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <PrivateView>
          <Settings />
          <DisplayTime />
        </PrivateView>
      </PreferencesProvider>
    </AuthProvider>
  );
}

it("saves with CSRF and revision, updates display time and clears private settings when the session ends", async () => {
  let authenticated = true;
  let written: Record<string, unknown> | null = null;
  const fetcher = vi.fn(async (path: unknown, options?: RequestInit) => {
    if (String(path) === "/api/v1/session")
      return reply(session(authenticated));
    if (options?.method === "PUT") {
      written = JSON.parse(String(options.body));
      expect((options.headers as Record<string, string>)["X-CSRF-TOKEN"]).toBe(
        "fictional-nonfunctional-token",
      );
      return reply({ ...written, revision: 1, deliveryAvailable: false });
    }
    return reply(defaults);
  });
  vi.stubGlobal("fetch", fetcher);
  render(<View />);
  const zone = await screen.findByLabelText("Display time zone");
  expect(zone).toHaveValue("Asia/Kolkata");
  expect(screen.getByLabelText("Example instant")).toHaveTextContent("5:30");
  await userEvent.clear(zone);
  await userEvent.type(zone, "UTC");
  await userEvent.click(screen.getByLabelText("Email notifications"));
  await userEvent.click(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  expect(await screen.findByText("Preferences saved.")).toBeInTheDocument();
  expect(written).toMatchObject({
    timeZone: "UTC",
    revision: 0,
    emailNotifications: true,
  });
  expect(screen.getByLabelText("Example instant")).toHaveTextContent("12:00");
  expect(screen.getByText(/not enabled yet/)).toBeInTheDocument();
  authenticated = false;
  await act(async () => window.dispatchEvent(new Event("focus")));
  expect(
    await screen.findByRole("heading", { name: "Your private workspace" }),
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("Display time zone")).not.toBeInTheDocument();
});

it("preserves edits and offers reload after an update conflict without rendering server details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: unknown, options?: RequestInit) =>
      String(path) === "/api/v1/session"
        ? reply(session())
        : options?.method === "PUT"
          ? reply({ detail: "private error must stay hidden" }, 409)
          : reply(defaults),
    ),
  );
  render(<View />);
  const zone = await screen.findByLabelText("Display time zone");
  await userEvent.clear(zone);
  await userEvent.type(zone, "UTC");
  await userEvent.click(
    screen.getByRole("button", { name: "Save preferences" }),
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Reload and review",
  );
  expect(screen.getByRole("alert")).not.toHaveTextContent("private error");
  expect(zone).toHaveValue("UTC");
  await userEvent.click(
    screen.getByRole("button", { name: "Reload saved preferences" }),
  );
  expect(await screen.findByLabelText("Display time zone")).toHaveValue(
    "Asia/Kolkata",
  );
});
