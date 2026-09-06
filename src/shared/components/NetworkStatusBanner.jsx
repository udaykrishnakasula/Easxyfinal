import React from "react";
import { WifiOff, Wifi, RefreshCw, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";

/**
 * NetworkStatusBanner:
 * Global, non-blocking network connection detection banner.
 * Displays when internet connectivity is lost or just restored.
 */
export default function NetworkStatusBanner() {
  const { isOffline, showRestored, isChecking, checkConnection, dismissRestored } = useNetworkStatus();

  // If online and not in restored notification window, do not render
  if (!isOffline && !showRestored) {
    return null;
  }

  return (
    <div
      data-testid="network-status-banner"
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[9999] pointer-events-auto shadow-2xl transition-all duration-300 ease-in-out"
    >
      {isOffline && (
        <div
          data-testid="offline-banner"
          className="border-b border-rose-500/40 bg-[#1A0D10]/95 backdrop-blur-md px-4 py-2.5 sm:px-6 text-white"
        >
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5 sm:gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <WifiOff className="h-4 w-4 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-[#1A0D10]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-rose-200 tracking-tight">
                    No internet connection
                  </span>
                  <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Offline Mode
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-rose-300/80 leading-tight truncate sm:whitespace-normal">
                  Please check your connection and try again.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={checkConnection}
                disabled={isChecking}
                data-testid="offline-retry-btn"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 transition disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
                <span>{isChecking ? "Checking..." : "Check connection"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {!isOffline && showRestored && (
        <div
          data-testid="connection-restored-banner"
          className="border-b border-emerald-500/40 bg-[#0A1610]/95 backdrop-blur-md px-4 py-2 sm:px-6 text-white"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-semibold text-emerald-200">
                  Connection restored
                </span>
                <span className="hidden sm:inline text-xs text-emerald-300/70 ml-2">
                  — You are back online.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissRestored}
              className="rounded-lg p-1 text-emerald-300/60 hover:text-emerald-200 hover:bg-emerald-500/10 transition"
              title="Dismiss notification"
              data-testid="dismiss-restored-btn"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
