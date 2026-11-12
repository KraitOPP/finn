import { ThemeProvider } from "@mui/material/styles";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import { workspaceTheme } from "./theme.ts";
import "./styles.css";
import "./workspace.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The application root is missing.");
createRoot(rootElement).render(
  <StrictMode>
    <ThemeProvider theme={workspaceTheme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
);
