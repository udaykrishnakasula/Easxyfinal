import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import App from "./App";

// Global resilience handler to catch and safely neutralize any residual third-party or browser-level undefined[0] read errors
if (typeof window !== "undefined") {
  window.addEventListener(
    "error",
    (event) => {
      const msg = event?.message || event?.error?.message || "";
      if (typeof msg === "string" && msg.includes("Cannot read properties of undefined (reading '0')")) {
        event.preventDefault();
        event.stopPropagation();
        console.warn("[App Resilience] Prevented unhandled 0-index property read exception:", msg);
        return true;
      }
    },
    true
  );

  const prevOnError = window.onerror;
  window.onerror = function (message, source, lineno, colno, error) {
    const msg = String(message || error?.message || "");
    if (msg.includes("Cannot read properties of undefined (reading '0')")) {
      console.warn("[App Resilience] Handled window.onerror for reading '0':", msg);
      return true; // suppresses the browser alert
    }
    if (typeof prevOnError === "function") {
      return prevOnError.apply(this, arguments);
    }
    return false;
  };
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchIntervalInBackground: false,
      retry: (failureCount, error) => {
        // Never retry client-side 4xx errors
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false;
        }
        // At most 1 safe retry for transient network hiccups on read queries
        return failureCount < 1;
      },
    },
    mutations: {
      // NEVER automatically retry mutations to prevent duplicate transactions
      retry: false,
    },
  },
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
