import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import "./styles.css";
import "./workspace.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("The application root is missing.");
createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
