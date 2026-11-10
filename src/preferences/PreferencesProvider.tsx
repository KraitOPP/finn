import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type {
  Preferences,
  PreferencesUpdate,
} from "../../contracts/generated/models.ts";
import { ApiError, requestContract } from "../api/request.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";

type State = {
  owner: string;
  generation: number;
  value: Preferences | null;
  error: string | null;
};
type Context = {
  value: Preferences | null;
  error: string | null;
  reload: () => void;
  save: (input: PreferencesUpdate) => Promise<void>;
};
const PreferencesContext = createContext<Context | null>(null);
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const authentication = useAuthentication();
  const owner =
    authentication.status === "ready" && authentication.session.authenticated
      ? authentication.session.user.userId
      : null;
  const [state, setState] = useState<State | null>(null);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    setState(null);
    if (owner)
      requestContract("Preferences", "/api/v1/preferences", {
        signal: controller.signal,
      })
        .then((value) => {
          if (!controller.signal.aborted)
            setState({ owner, generation: attempt, value, error: null });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setState({
              owner,
              generation: attempt,
              value: null,
              error: "Your preferences couldn’t be loaded.",
            });
        });
    return () => controller.abort();
  }, [owner, attempt]);
  const save = async (input: PreferencesUpdate) => {
    if (!owner || authentication.status !== "ready") throw new ApiError(401);
    try {
      const value = await requestContract(
        "Preferences",
        "/api/v1/preferences",
        { method: "PUT", body: input, csrf: authentication.session.csrf },
      );
      setState({ owner, generation: attempt, value, error: null });
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      )
        authentication.refresh();
      throw error;
    }
  };
  const current =
    state && state.owner === owner && state.generation === attempt
      ? state
      : null;
  const value = current?.value ?? null;
  const error = current?.error ?? null;
  return (
    <PreferencesContext.Provider value={{ value, error, reload, save }}>
      {children}
    </PreferencesContext.Provider>
  );
}
export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error("Preferences provider is missing.");
  return context;
}
export function useDisplayInstant() {
  const { value } = usePreferences();
  return (instant: string) => {
    try {
      return new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: value?.timeZone ?? "Asia/Kolkata",
      }).format(new Date(instant));
    } catch {
      return "Time unavailable";
    }
  };
}
