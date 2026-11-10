import { useAuthentication } from "./AuthProvider.tsx";

export function AuthControls() {
  const authentication = useAuthentication();
  if (authentication.status === "loading")
    return <span className="auth-status">Connecting…</span>;
  if (authentication.status === "unavailable")
    return (
      <button
        className="text-button auth-reconnect"
        type="button"
        onClick={authentication.refresh}
      >
        Reconnect sign-in
      </button>
    );
  const session = authentication.session;
  return (
    <div className="auth-controls">
      {session.authenticated ? (
        <>
          <span className="account-name" title={session.user.displayName}>
            {session.user.displayName}
          </span>
          <form method="post" action="/api/v1/logout">
            <input
              type="hidden"
              name={session.csrf.parameterName}
              value={session.csrf.token}
            />
            <button type="submit" className="sign-in-button">
              Sign out
            </button>
          </form>
        </>
      ) : (
        <a className="sign-in-button" href="/oauth2/authorization/finn">
          Sign in <span aria-hidden="true">↗</span>
        </a>
      )}
    </div>
  );
}

export function SessionNotice() {
  const authentication = useAuthentication();
  const signInFailed =
    new URLSearchParams(window.location.search).get("signin") === "failed";
  if (authentication.expired)
    return (
      <p className="session-notice" role="status">
        {authentication.status === "unavailable"
          ? "Reconnect to continue securely."
          : "Your session ended. Sign in again to continue."}
      </p>
    );
  if (signInFailed)
    return (
      <p className="session-notice" role="status">
        Sign-in couldn’t be completed. Please try again.
      </p>
    );
  return null;
}
