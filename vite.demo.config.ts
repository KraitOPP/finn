import { join } from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { externalWorkspace } from "./scripts/workspace.mjs";

const workspace = await externalWorkspace();
export default defineConfig({
  root: fileURLToPath(new URL("./demo", import.meta.url)),
  base: "./",
  publicDir: false,
  plugins: [react()],
  cacheDir: join(workspace, "cache/frontend/demo"),
  preview: { host: "127.0.0.1", port: 5180, strictPort: true },
  build: { outDir: join(workspace, "build/public-demo"), emptyOutDir: true },
});
