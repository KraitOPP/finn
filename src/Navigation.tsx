import { type ReactNode, useEffect, useRef, useState } from "react";
import { useAuthentication } from "./auth/AuthProvider.tsx";

export const destinations = [
  ["overview", "Overview"],
  ["portfolio", "Portfolio"],
  ["instruments", "Securities"],
  ["watchlists", "Watchlists"],
  ["inbox", "Inbox"],
  ["research", "Research"],
  ["discover", "Discover"],
  ["settings", "Settings"],
] as const;
export type Route = (typeof destinations)[number][0];

function readRoute() {
  const value =
    window.location.hash.replace(/^#\/?/, "").split("?", 1)[0] || "overview";
  return destinations.some(([route]) => route === value)
    ? (value as Route)
    : null;
}
export function useRoute() {
  const [route, setRoute] = useState<Route | null>(readRoute);
  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return route;
}

export function Navigation({ route }: { route: Route | null }) {
  return (
    <nav className="main-navigation" aria-label="Workspace">
      {destinations.map(([value, label]) => (
        <a
          key={value}
          href={`#/${value}`}
          aria-current={route === value ? "page" : undefined}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

export function RouteHeading({ children }: { children: ReactNode }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  return (
    <h1 ref={heading} tabIndex={-1} className="route-heading">
      {children}
    </h1>
  );
}

export function PrivateView({ children }: { children: ReactNode }) {
  const authentication = useAuthentication();
  if (authentication.status === "loading")
    return <p role="status">Connecting to your account…</p>;
  if (authentication.status === "unavailable")
    return (
      <div className="empty-state" role="alert">
        <RouteHeading>Your account is unavailable</RouteHeading>
        <p>Reconnect to open your private workspace.</p>
        <button type="button" onClick={authentication.refresh}>
          Reconnect
        </button>
      </div>
    );
  if (!authentication.session.authenticated)
    return (
      <div className="empty-state">
        <RouteHeading>Your private workspace</RouteHeading>
        <p>Sign in to manage your portfolio and saved preferences.</p>
        <a className="sign-in-button" href="/oauth2/authorization/finn">
          Sign in to continue
        </a>
      </div>
    );
  return <div key={authentication.session.user.userId}>{children}</div>;
}

export function PendingView({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="workspace-section">
      <RouteHeading>{title}</RouteHeading>
      <div className="empty-state">{children}</div>
    </section>
  );
}
