import React, { Component } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import errorTracker from "./errorTracker";

/**
 * SectionErrorBoundary isolates runtime crashes within sub-components or route outlets.
 * It prevents a single broken component from unmounting the parent layout or logging the user out.
 */
export class SectionErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      reportId: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const report = errorTracker.captureError({
      source: "section_error_boundary",
      severity: "warning",
      errorName: error?.name || "SectionRenderError",
      message: error?.message || "Sub-component crashed during render",
      stack: error?.stack || null,
      componentStack: errorInfo?.componentStack || null,
      metadata: {
        section: this.props.name || "SectionComponent",
      },
    });

    this.setState({
      reportId: report?.id || "ERR-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
    });

    if (process.env.NODE_ENV !== "production") {
      console.warn(`[SectionErrorBoundary: ${this.props.name || "Section"}]`, error);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, reportId: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
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
          data-testid="section-error-boundary"
          className="my-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-ex-text backdrop-blur-sm"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-400 shrink-0">
                <AlertCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {this.props.title || "This section encountered an issue"}
                </h3>
                <p className="text-xs text-ex-muted mt-0.5">
                  Your session and navigation remain active. You can retry loading this content.
                </p>
              </div>
            </div>

            <button
              onClick={this.handleReset}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-all active:scale-95 border border-white/10 shrink-0"
              data-testid="section-error-retry"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Try Again</span>
            </button>
          </div>

          {process.env.NODE_ENV !== "production" && this.state.error && (
            <div className="mt-3 overflow-x-auto rounded bg-black/40 p-2 text-[11px] font-mono text-red-300">
              {this.state.error.message}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default SectionErrorBoundary;
