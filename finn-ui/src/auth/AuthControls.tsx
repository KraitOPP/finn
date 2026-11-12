import Button from "@mui/material/Button";
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
          <form
            method="post"
            action="/api/v1/logout"
            onSubmit={authentication.signalSignOut}
          >
            <input
              type="hidden"
              name={session.csrf.parameterName}
              value={session.csrf.token}
            />
            <Button type="submit" className="sign-in-button" variant="outlined">
              Sign out
            </Button>
          </form>
        </>
      ) : (
        <Button
          className="sign-in-button"
          href="/oauth2/authorization/finn"
          variant="outlined"
        >
          Sign in <span aria-hidden="true">↗</span>
        </Button>
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
