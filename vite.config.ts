import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { externalWorkspace } from "./scripts/workspace.mjs";

const root = await externalWorkspace();
const origin = new URL(
  process.env.FINN_BACKEND_ORIGIN ?? "http://127.0.0.1:8080",
);
if (
  !["http:", "https:"].includes(origin.protocol) ||
  origin.username ||
  origin.password ||
  origin.pathname !== "/" ||
  origin.search ||
  origin.hash
) {
  throw new Error(
    "FINN_BACKEND_ORIGIN must be an HTTP(S) origin without credentials, query or path.",
  );
}

export default defineConfig({
  plugins: [react()],
  cacheDir: join(root, "cache/frontend/vite"),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true,
    proxy: { "/api": { target: origin.origin } },
  },
  build: { outDir: join(root, "build/frontend"), emptyOutDir: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    restoreMocks: true,
    unstubGlobals: true,
    maxWorkers: 2,
    coverage: { reportsDirectory: join(root, "artifacts/frontend/coverage") },
  },
});
