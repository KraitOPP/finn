import { useCallback, useEffect, useState } from "react";
import type { ContractTypes } from "../../contracts/generated/models.ts";
import { useAuthentication } from "../auth/AuthProvider.tsx";
import { ApiError, requestContract } from "./request.ts";

type Result<T> = { path: string; revision: number } & (
  | { status: "ready"; value: T }
  | { status: "error"; error: string }
);
export function useResource<K extends keyof ContractTypes>(
  name: K,
  path: string | null,
  timeoutMs?: number,
) {
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  const [result, setResult] = useState<Result<ContractTypes[K]> | null>(null);
  const { refresh } = useAuthentication();
  useEffect(() => {
    const controller = new AbortController();
    if (path)
      requestContract(name, path, { signal: controller.signal, timeoutMs })
        .then((value) => {
          if (!controller.signal.aborted)
            setResult({ path, revision, status: "ready", value });
        })
        .catch((error) => {
          if (controller.signal.aborted) return;
          if (
            error instanceof ApiError &&
            (error.status === 401 || error.status === 403)
          )
            refresh();
          setResult({
            path,
            revision,
            status: "error",
            error:
              error instanceof ApiError
                ? error.message
                : "This view couldn’t be loaded. Try again.",
          });
        });
    return () => controller.abort();
  }, [name, path, revision, refresh, timeoutMs]);
  const current =
    result?.path === path && result.revision === revision ? result : null;
  return {
    value: current?.status === "ready" ? current.value : null,
    error: current?.status === "error" ? current.error : null,
    loading: path !== null && current === null,
    reload,
  };
}
