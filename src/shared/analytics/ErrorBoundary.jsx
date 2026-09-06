import React, { Component } from "react";
import { AlertTriangle, RotateCcw, Home, Copy, Check, ShieldAlert, Bug } from "lucide-react";
import errorTracker from "./errorTracker";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      reportId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const report = errorTracker.captureError({
      source: "react_error_boundary",
      severity: "critical",
      errorName: error?.name || "ReactRenderCrash",
      message: error?.message || "Unhandled React component rendering exception",
      stack: error?.stack || null,
      componentStack: errorInfo?.componentStack || null,
      metadata: {
        boundaryName: this.props.name || "GlobalErrorBoundary",
      },
    });

    this.setState({
      errorInfo,
      reportId: report?.id || "ERR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    console.error("[EasyX ErrorBoundary Caught Crash]", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, reportId: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleCopyDetails = () => {
    const { error, errorInfo, reportId } = this.state;
    const details = `EasyX Crash Report (${reportId})
Timestamp: ${new Date().toISOString()}
Error: ${error?.name}: ${error?.message}
Stack: ${error?.stack || "N/A"}
Component Stack: ${errorInfo?.componentStack || "N/A"}`;

    navigator.clipboard.writeText(details);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2500);
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.error,
          resetErrorBoundary: this.handleReset,
        });
      }

      return (
        <div
          className="min-h-screen bg-ex-bg text-ex-text flex items-center justify-center p-4 selection:bg-purple-500 selection:text-white"
          data-testid="error-boundary-screen"
        >
          <div className="max-w-lg w-full rounded-2xl bg-ex-surface/90 border border-red-500/30 p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Ambient Red/Purple Glow */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3.5 mb-5">
              <div className="h-12 w-12 rounded-xl bg-red-500/15 border border-red-500/30 grid place-items-center text-red-400 shrink-0 shadow-inner">
                <AlertTriangle className="h-6 w-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Application Encountered an Error
                </h1>
                <p className="text-xs text-ex-muted mt-0.5">
                  Report Ref:{" "}
                  <span className="font-mono text-purple-300">
                    {this.state.reportId || "AUTO_LOGGED"}
                  </span>
                </p>
              </div>
            </div>

            <p className="text-sm text-ex-text/80 leading-relaxed mb-4">
              An unexpected interface issue occurred. Our telemetry engine has captured this diagnostic
              report for inspection. You can reload the component or navigate back safely.
            </p>

            {/* Error Message Box */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/8 text-xs font-mono text-red-300 mb-5 overflow-x-auto select-all max-h-32">
              <div className="font-semibold text-red-400 mb-1 flex items-center gap-1.5">
                <Bug className="h-3.5 w-3.5" />
                <span>{this.state.error?.name || "Error"}</span>
              </div>
              <div>{this.state.error?.message || "Unknown rendering exception"}</div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <button
                onClick={this.handleReset}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-purple-900/30"
                data-testid="error-try-again-btn"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Try Again</span>
              </button>

              <button
                onClick={() => {
                  let target = "/";
                  try {
                    const hasToken = typeof localStorage !== "undefined" && Boolean(localStorage.getItem("easyx_token"));
                    if (hasToken) {
                      const rawUser = localStorage.getItem("easyx_user");
                      const parsedUser = rawUser ? JSON.parse(rawUser) : null;
                      target = parsedUser?.role === "admin" ? "/admin" : "/dashboard";
                    }
                  } catch {
                    target = "/";
                  }
                  window.location.assign(target);
                }}
                className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-semibold flex items-center justify-center gap-2 border border-white/10 transition-all"
                data-testid="error-home-btn"
              >
                <Home className="h-4 w-4" />
                <span>Return to App</span>
              </button>

              <button
                onClick={this.handleCopyDetails}
                title="Copy Error Debug Details"
                className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 border border-white/10 transition-all"
                data-testid="error-copy-debug-btn"
              >
                {this.state.copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] text-emerald-300">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span className="text-[11px]">Details</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
