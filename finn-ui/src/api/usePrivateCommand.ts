import { useState } from "react";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { ApiError } from "./request.ts";
export function usePrivateCommand(
  fallbackMessage = "The change couldn’t be saved. Check your records before trying again.",
) {
  const authentication = useAuthentication();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return {
    busy,
    error,
    clearError: () => setError(null),
    run: async <T>(
      action: (
        csrf: NonNullable<typeof authentication.session>["csrf"],
      ) => Promise<T>,
    ): Promise<T | undefined> => {
      if (
        authentication.status !== "ready" ||
        !authentication.session.authenticated ||
        busy
      )
        return;
      setBusy(true);
      setError(null);
      try {
        return await action(authentication.session.csrf);
      } catch (error) {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        )
          authentication.refresh();
        setError(error instanceof ApiError ? error.message : fallbackMessage);
      } finally {
        setBusy(false);
      }
    },
  };
}
