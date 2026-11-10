import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { SessionResponse } from "../../contracts/generated/models.ts";
import { fetchSession } from "./session.ts";

type State =
  | { status: "loading"; session: null; expired: boolean }
  | { status: "unavailable"; session: null; expired: boolean }
  | { status: "ready"; session: SessionResponse; expired: boolean };
type Authentication = State & { refresh: () => void };
const AuthContext = createContext<Authentication | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({
    status: "loading",
    session: null,
    expired: false,
  });
  const controller = useRef<AbortController | null>(null);
  const previouslyAuthenticated = useRef(false);
  const lastActivity = useRef(Date.now());
  const refresh = useCallback(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    fetchSession(current.signal)
      .then((session) => {
        if (current.signal.aborted) return;
        const expired =
          previouslyAuthenticated.current && !session.authenticated;
        previouslyAuthenticated.current = session.authenticated;
        setState({ status: "ready", session, expired });
      })
      .catch(() => {
        if (!current.signal.aborted)
          setState({ status: "unavailable", session: null, expired: false });
      });
  }, []);
  useEffect(() => {
    refresh();
    const activity = () => {
      lastActivity.current = Date.now();
    };
    const focus = () => {
      activity();
      refresh();
    };
    const interval = window.setInterval(() => {
      const idle = Date.now() - lastActivity.current;
      if (idle >= 30 * 60000 && previouslyAuthenticated.current) {
        setState({ status: "unavailable", session: null, expired: true });
      } else if (idle < 120000) refresh();
    }, 60000);
    window.addEventListener("focus", focus);
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      controller.current?.abort();
    };
  }, [refresh]);
  return (
    <AuthContext.Provider value={{ ...state, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthentication() {
  const authentication = useContext(AuthContext);
  if (!authentication) throw new Error("Authentication provider is missing.");
  return authentication;
}
