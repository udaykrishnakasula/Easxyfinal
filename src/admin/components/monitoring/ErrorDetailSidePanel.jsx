import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  X,
  Bug,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  Smartphone,
  Globe,
  User,
  ShieldAlert,
  ShieldCheck,
  Activity,
  ArrowRight,
  Info,
  Calendar,
  Share2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Hash,
  Cpu,
} from "lucide-react";
import {
  useAdminUpdateErrorStatus,
  useResolveErrorLog,
  useAdminErrorLogs,
} from "@/admin/adminApi";
import { EasyXButton, EasyXEmptyState, EasyXLoader } from "@/design/EasyX";

dayjs.extend(relativeTime);

// Severity styling configurations
const SEVERITY_CONFIG = {
  critical: {
    bg: "bg-red-500/15",
    border: "border-red-500/30",
    text: "text-red-400",
    badge: "bg-red-500 text-white shadow-red-500/20",
    dot: "bg-red-500",
    label: "Critical",
  },
  error: {
    bg: "bg-orange-500/15",
    border: "border-orange-500/30",
    text: "text-orange-400",
    badge: "bg-orange-500 text-white shadow-orange-500/20",
    dot: "bg-orange-500",
    label: "Error",
  },
  warning: {
    bg: "bg-amber-500/15",
    border: "border-amber-500/30",
    text: "text-amber-400",
    badge: "bg-amber-500 text-white shadow-amber-500/20",
    dot: "bg-amber-500",
    label: "Warning",
  },
  info: {
    bg: "bg-purple-500/15",
    border: "border-purple-500/30",
    text: "text-purple-400",
    badge: "bg-purple-500 text-white shadow-purple-500/20",
    dot: "bg-purple-500",
    label: "Info",
  },
};

const STATUS_CONFIG = {
  resolved: {
    bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    label: "Resolved",
    icon: CheckCircle2,
  },
  investigating: {
    bg: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    label: "Investigating",
    icon: Activity,
  },
  unresolved: {
    bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    label: "Unresolved",
    icon: XCircle,
  },
  new: {
    bg: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    label: "New",
    icon: AlertTriangle,
  },
  ignored: {
    bg: "bg-white/10 text-white/60 border-white/15",
    label: "Ignored",
    icon: Info,
  },
};

export default function ErrorDetailSidePanel({
  isOpen,
  onClose,
  dayData,
  onNavigateToLogs,
  onViewUserJourney,
}) {
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedKey, setCopiedKey] = useState(null);
  const [isStackExpanded, setIsStackExpanded] = useState(true);
  const [isComponentStackExpanded, setIsComponentStackExpanded] = useState(false);
  const [isMetadataExpanded, setIsMetadataExpanded] = useState(true);

  const updateStatusMutation = useAdminUpdateErrorStatus();
  const resolveMutation = useResolveErrorLog();

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when panel is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Extract raw error logs from dayData or default empty list
  const rawErrors = useMemo(() => {
    if (!dayData) return [];
    if (Array.isArray(dayData.errors) && dayData.errors.length > 0) {
      return dayData.errors;
    }
    return [];
  }, [dayData]);

  // Filter errors by search query and filter chips
  const filteredErrors = useMemo(() => {
    return rawErrors.filter((err) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (err.error_name && err.error_name.toLowerCase().includes(q)) ||
        (err.message && err.message.toLowerCase().includes(q)) ||
        (err.page && err.page.toLowerCase().includes(q)) ||
        (err.endpoint && err.endpoint.toLowerCase().includes(q)) ||
        (err.user?.email && err.user.email.toLowerCase().includes(q)) ||
        (err.http_status && String(err.http_status).includes(q)) ||
        (err.correlation_id && err.correlation_id.toLowerCase().includes(q)) ||
        (err.stack && err.stack.toLowerCase().includes(q));

      const matchesSeverity =
        severityFilter === "all" ||
        (err.severity || "error").toLowerCase() === severityFilter.toLowerCase();

      const currentStatus =
        err.status || (err.resolved ? "resolved" : "unresolved");
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "resolved" && (err.resolved || currentStatus === "resolved")) ||
        (statusFilter === "unresolved" && (!err.resolved && currentStatus !== "resolved")) ||
        currentStatus.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [rawErrors, searchQuery, severityFilter, statusFilter]);

  // Auto-select first error if none selected or selected is filtered out
  useEffect(() => {
    if (filteredErrors.length > 0) {
      if (!selectedErrorId || !filteredErrors.some((e) => e.id === selectedErrorId)) {
        setSelectedErrorId(filteredErrors[0].id);
      }
    } else {
      setSelectedErrorId(null);
    }
  }, [filteredErrors, selectedErrorId]);

  // Currently inspected active error
  const activeError = useMemo(() => {
    if (!selectedErrorId) return filteredErrors[0] || null;
    return rawErrors.find((e) => e.id === selectedErrorId) || filteredErrors[0] || null;
  }, [rawErrors, filteredErrors, selectedErrorId]);

  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === "object" ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = async (errorId, newStatus) => {
    try {
      if (newStatus === "resolved") {
        await resolveMutation.mutateAsync({ id: errorId, resolved: true });
      } else if (newStatus === "unresolved") {
        await resolveMutation.mutateAsync({ id: errorId, resolved: false });
      } else {
        await updateStatusMutation.mutateAsync({ id: errorId, status: newStatus });
      }
      toast.success(`Error marked as ${newStatus}`);
    } catch (err) {
      toast.error("Failed to update error status");
    }
  };

  if (!isOpen) return null;

  const totalDayErrors = dayData?.total || rawErrors.length;
  const criticalCount = dayData?.critical || rawErrors.filter((e) => e.severity === "critical").length;
  const errorCount = dayData?.error || rawErrors.filter((e) => e.severity === "error").length;
  const warningCount = dayData?.warning || rawErrors.filter((e) => e.severity === "warning").length;
  const infoCount = dayData?.info || rawErrors.filter((e) => e.severity === "info").length;
  const resolvedCount = dayData?.resolved || rawErrors.filter((e) => e.resolved || e.status === "resolved").length;

  return (
    <div
      id="error-detail-side-panel-container"
      className="fixed inset-0 z-50 overflow-hidden"
      aria-labelledby="slide-over-title"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Drawer content positioned on the right */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-12">
        <div className="w-screen max-w-3xl sm:max-w-4xl bg-[#0E091D] border-l border-white/15 shadow-2xl flex flex-col h-full transform transition ease-in-out duration-300">
          {/* Top Panel Header */}
          <div className="px-5 py-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shadow-inner">
                <Bug className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 font-mono flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {dayData?.day_name || "Daily"} Incident Inspector
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-xs text-ex-muted font-mono">
                    {dayData?.full_date || dayData?.formatted_date || "Past 24h"}
                  </span>
                </div>
                <h2
                  id="slide-over-title"
                  className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2 mt-0.5"
                >
                  <span>Error Stack Trace & Telemetry Breakdown</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10 text-white font-mono">
                    {totalDayErrors} {totalDayErrors === 1 ? "Log" : "Logs"}
                  </span>
                </h2>
              </div>
            </div>

            {/* Quick Actions & Close */}
            <div className="flex items-center gap-2">
              <button
                id="btn-copy-day-summary"
                onClick={() =>
                  handleCopy(
                    {
                      day: dayData?.full_date || dayData?.date,
                      total: totalDayErrors,
                      critical: criticalCount,
                      error: errorCount,
                      warning: warningCount,
                      resolved: resolvedCount,
                      errors: rawErrors,
                    },
                    "day-json"
                  )
                }
                className="h-9 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/90 flex items-center gap-1.5 transition"
                title="Export Day JSON"
              >
                {copiedKey === "day-json" ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-ex-muted" />
                    <span className="hidden sm:inline">Export Day JSON</span>
                  </>
                )}
              </button>

              <button
                id="btn-close-error-side-panel"
                onClick={onClose}
                className="p-2 rounded-xl text-ex-muted hover:text-white hover:bg-white/10 border border-white/10 transition"
                title="Close Drawer (Esc)"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="px-5 py-2.5 bg-black/40 border-b border-white/5 flex items-center justify-between flex-wrap gap-2 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-ex-muted text-[11px]">Day Summary:</span>
              {criticalCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                  {criticalCount} Critical
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30 text-[11px] font-semibold flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                  {errorCount} Error
                </span>
              )}
              {warningCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {warningCount} Warning
                </span>
              )}
              {infoCount > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  {infoCount} Info
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold flex items-center gap-1 font-mono">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                {resolvedCount} / {totalDayErrors} Resolved
              </span>
            </div>

            <div className="text-[11px] text-ex-muted font-mono">
              Displaying {filteredErrors.length} of {rawErrors.length} matching logs
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-white/5 bg-black/20 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
              <input
                id="input-search-panel-errors"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search error name, stack trace, route, user email, HTTP status..."
                className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-ex-muted focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400 transition font-mono"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ex-muted hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Severity Filter Chips */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["all", "critical", "error", "warning", "info"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition whitespace-nowrap ${
                    severityFilter === sev
                      ? "bg-purple-500 text-white shadow-sm"
                      : "bg-white/5 text-ex-muted hover:text-white hover:bg-white/10"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              {["all", "unresolved", "resolved"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition whitespace-nowrap ${
                    statusFilter === st
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "bg-white/5 text-ex-muted hover:text-white hover:bg-white/10"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Main Body Area: Left Log Picker + Right Deep Stack Trace & Metadata */}
          <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
            {/* Left: Error List Picker */}
            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-white/10 overflow-y-auto bg-black/10 shrink-0 max-h-56 md:max-h-none">
              {filteredErrors.length === 0 ? (
                <div className="p-6 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-white">No Errors Found</p>
                  <p className="text-[11px] text-ex-muted mt-1">
                    {searchQuery || severityFilter !== "all" || statusFilter !== "all"
                      ? "No logs match the current search filters."
                      : "Zero errors recorded for this date."}
                  </p>
                  {(searchQuery || severityFilter !== "all" || statusFilter !== "all") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSeverityFilter("all");
                        setStatusFilter("all");
                      }}
                      className="mt-3 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-xs text-white transition"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {filteredErrors.map((err) => {
                    const isSelected = err.id === activeError?.id;
                    const sevStyle = SEVERITY_CONFIG[err.severity] || SEVERITY_CONFIG.error;
                    const isResolved = err.resolved || err.status === "resolved";

                    return (
                      <button
                        key={err.id}
                        onClick={() => setSelectedErrorId(err.id)}
                        className={`w-full text-left p-3.5 transition flex flex-col gap-1.5 relative ${
                          isSelected
                            ? "bg-purple-500/15 border-l-4 border-purple-400"
                            : "hover:bg-white/[0.04] opacity-90 hover:opacity-100"
                        }`}
                      >
                        {/* Status + Severity + Time */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase font-mono ${sevStyle.badge}`}
                            >
                              {err.severity || "error"}
                            </span>
                            {err.http_status && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-white/10 text-white font-mono">
                                HTTP {err.http_status}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-ex-muted font-mono shrink-0">
                            {dayjs(err.timestamp).format("HH:mm:ss")}
                          </span>
                        </div>

                        {/* Error Name */}
                        <div className="font-mono text-xs font-bold text-white truncate" title={err.error_name}>
                          {err.error_name || "Error"}
                        </div>

                        {/* Error Message Snippet */}
                        <div className="text-[11px] text-ex-muted line-clamp-2 leading-relaxed" title={err.message}>
                          {err.message || "Unknown error occurred"}
                        </div>

                        {/* Route / User Footer */}
                        <div className="flex items-center justify-between text-[10px] text-ex-muted/80 pt-1">
                          <span className="truncate max-w-[140px] font-mono text-purple-300/90" title={err.page || err.endpoint}>
                            {err.page || err.endpoint || "/"}
                          </span>
                          <span className="flex items-center gap-1">
                            {isResolved ? (
                              <span className="text-emerald-400 font-medium">✓ Resolved</span>
                            ) : (
                              <span className="text-rose-400 font-medium">● Open</span>
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Right: Selected Log Deep Dive (Stack Trace & Complete Metadata) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0C0819]">
              {!activeError ? (
                <div className="h-full flex items-center justify-center p-8">
                  <EasyXEmptyState
                    icon={Bug}
                    title="Select an Error Log"
                    description="Choose an incident record from the list on the left to inspect its stack trace, network telemetry, client device metadata, and remediation options."
                  />
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Top Highlight Banner */}
                  <div
                    className={`rounded-2xl p-4 border ${
                      SEVERITY_CONFIG[activeError.severity]?.border || "border-white/10"
                    } ${SEVERITY_CONFIG[activeError.severity]?.bg || "bg-white/5"} relative overflow-hidden`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono ${
                              SEVERITY_CONFIG[activeError.severity]?.badge || "bg-red-500 text-white"
                            }`}
                          >
                            {activeError.severity || "error"}
                          </span>

                          {activeError.http_status && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-white font-mono">
                              HTTP {activeError.http_status}
                            </span>
                          )}

                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border font-mono ${
                              STATUS_CONFIG[activeError.status || (activeError.resolved ? "resolved" : "unresolved")]
                                ?.bg || "bg-white/10 text-white"
                            }`}
                          >
                            {STATUS_CONFIG[activeError.status || (activeError.resolved ? "resolved" : "unresolved")]
                              ?.label || "Open"}
                          </span>

                          <span className="text-xs text-ex-muted font-mono flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {dayjs(activeError.timestamp).format("YYYY-MM-DD HH:mm:ss UTC")} (
                            {dayjs(activeError.timestamp).fromNow()})
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-white font-mono break-all pt-1">
                          {activeError.error_name || "UnhandledException"}
                        </h3>
                      </div>

                      {/* Triage / Resolution Dropdown & Status Switcher */}
                      <div className="flex items-center gap-1.5 shrink-0 bg-black/40 p-1.5 rounded-xl border border-white/10">
                        <button
                          id="btn-mark-resolved"
                          onClick={() => handleStatusChange(activeError.id, "resolved")}
                          disabled={activeError.resolved}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                            activeError.resolved
                              ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                              : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                          }`}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>{activeError.resolved ? "Resolved" : "Mark Resolved"}</span>
                        </button>

                        <button
                          id="btn-mark-investigating"
                          onClick={() => handleStatusChange(activeError.id, "investigating")}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-amber-300 border border-amber-500/20 transition"
                        >
                          Investigating
                        </button>

                        {activeError.resolved && (
                          <button
                            id="btn-mark-unresolved"
                            onClick={() => handleStatusChange(activeError.id, "unresolved")}
                            className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition"
                          >
                            Re-open
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Full Error Message Box */}
                    <div className="mt-3 p-3 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-rose-200 leading-relaxed break-words select-text">
                      {activeError.message || "No error message provided."}
                    </div>
                  </div>

                  {/* Specific Stack Trace Section */}
                  <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Terminal className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Error Stack Trace
                        </span>
                        <span className="text-[10px] text-ex-muted font-mono">
                          ({activeError.source || "application"})
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          id="btn-copy-stack-trace"
                          onClick={() => handleCopy(activeError.stack || activeError.message, "stack-trace")}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition"
                          title="Copy Full Stack Trace"
                        >
                          {copiedKey === "stack-trace" ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400 font-medium">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-ex-muted" />
                              <span>Copy Stack</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => setIsStackExpanded(!isStackExpanded)}
                          className="p-1 rounded-lg text-ex-muted hover:text-white hover:bg-white/10 transition"
                          title={isStackExpanded ? "Collapse" : "Expand"}
                        >
                          {isStackExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {isStackExpanded && (
                      <div className="p-4 bg-black/80 font-mono text-xs text-rose-200/90 leading-relaxed overflow-x-auto whitespace-pre selection:bg-purple-500/30 selection:text-white max-h-80 overflow-y-auto">
                        {activeError.stack ? (
                          activeError.stack
                        ) : (
                          <span className="text-ex-muted italic">
                            No native stack trace captured for this log. (Severity: {activeError.severity})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Component Stack Trace (React Error Boundary) if available */}
                  {activeError.component_stack && (
                    <div className="rounded-2xl bg-black/40 border border-white/10 overflow-hidden">
                      <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/10 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Code2 className="h-4 w-4 text-ex-accent" />
                          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                            React Component Hierarchy Stack
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopy(activeError.component_stack, "comp-stack")}
                            className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-white flex items-center gap-1 transition"
                          >
                            {copiedKey === "comp-stack" ? (
                              <span className="text-emerald-400">Copied!</span>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 text-ex-muted" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => setIsComponentStackExpanded(!isComponentStackExpanded)}
                            className="p-1 rounded text-ex-muted hover:text-white transition"
                          >
                            {isComponentStackExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isComponentStackExpanded && (
                        <div className="p-3.5 bg-black/80 font-mono text-xs text-purple-200/90 leading-relaxed overflow-x-auto whitespace-pre max-h-60 overflow-y-auto">
                          {activeError.component_stack}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contextual Telemetry & Metadata Explorer */}
                  <div className="rounded-2xl bg-black/30 border border-white/10 overflow-hidden">
                    <div className="px-4 py-3 bg-white/[0.03] border-b border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="h-4 w-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                          Error Telemetry & Contextual Metadata
                        </span>
                      </div>

                      <button
                        onClick={() => setIsMetadataExpanded(!isMetadataExpanded)}
                        className="p-1 rounded-lg text-ex-muted hover:text-white hover:bg-white/10 transition"
                      >
                        {isMetadataExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>

                    {isMetadataExpanded && (
                      <div className="p-4 space-y-4 text-xs">
                        {/* Network & Route Grid */}
                        <div>
                          <div className="text-[11px] font-bold text-ex-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-ex-accent" />
                            <span>Route & Network Parameters</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Page / Route</span>
                              <div className="font-mono text-white break-all">{activeError.page || "/"}</div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Backend Endpoint</span>
                              <div className="font-mono text-white break-all">
                                {activeError.endpoint || "N/A (Client-Side)"}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Request / Correlation ID</span>
                              <div className="font-mono text-purple-300 flex items-center justify-between gap-1 break-all">
                                <span>{activeError.correlation_id || `req_${activeError.id.substring(0, 10)}`}</span>
                                <button
                                  onClick={() => handleCopy(activeError.correlation_id || activeError.id, "req-id")}
                                  className="text-ex-muted hover:text-white"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Incident Fingerprint</span>
                              <div className="font-mono text-amber-300 flex items-center justify-between gap-1 break-all">
                                <span>{activeError.fingerprint || "fp_unassigned"}</span>
                                <button
                                  onClick={() => handleCopy(activeError.fingerprint, "fp-id")}
                                  className="text-ex-muted hover:text-white"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Client Device & Runtime Environment */}
                        <div className="border-t border-white/5 pt-3">
                          <div className="text-[11px] font-bold text-ex-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <Smartphone className="h-3.5 w-3.5 text-purple-400" />
                            <span>Client Runtime & Device Environment</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Device Type</span>
                              <div className="font-mono text-white capitalize">{activeError.device_type || "Desktop"}</div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Browser</span>
                              <div className="font-mono text-white">{activeError.browser || "Chrome / V8"}</div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">Operating System</span>
                              <div className="font-mono text-white">{activeError.operating_system || "Web / Host"}</div>
                            </div>
                          </div>

                          {/* Full User Agent */}
                          <div className="mt-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-1">
                            <div className="flex items-center justify-between text-[10px] text-ex-muted uppercase">
                              <span>Full User-Agent String</span>
                              <button
                                onClick={() => handleCopy(activeError.user_agent, "ua-string")}
                                className="text-ex-muted hover:text-white flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copy UA</span>
                              </button>
                            </div>
                            <div className="font-mono text-[11px] text-white/80 break-all">
                              {activeError.user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
                            </div>
                          </div>
                        </div>

                        {/* User Identity & Session Context */}
                        <div className="border-t border-white/5 pt-3">
                          <div className="text-[11px] font-bold text-ex-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-emerald-400" />
                            <span>Authenticated User & Session Context</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">User Email</span>
                              <div className="font-mono text-white break-all">
                                {activeError.user?.email || "anonymous@easyx.io"}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5">
                              <span className="text-[10px] text-ex-muted uppercase">User Role</span>
                              <div className="font-mono text-white capitalize">
                                {activeError.user?.role || "guest"}
                              </div>
                            </div>

                            <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-0.5 sm:col-span-2">
                              <span className="text-[10px] text-ex-muted uppercase">Session Identifier</span>
                              <div className="font-mono text-white/90 break-all">
                                {activeError.session_id || "sess_live_default"}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Custom Attached Metadata (if present) */}
                        {activeError.metadata && Object.keys(activeError.metadata).length > 0 && (
                          <div className="border-t border-white/5 pt-3">
                            <div className="text-[11px] font-bold text-ex-muted uppercase tracking-wider mb-2 flex items-center justify-between">
                              <span className="flex items-center gap-1.5">
                                <Cpu className="h-3.5 w-3.5 text-purple-400" />
                                <span>Custom Metadata Payload</span>
                              </span>
                              <button
                                onClick={() => handleCopy(activeError.metadata, "custom-metadata")}
                                className="text-ex-muted hover:text-white flex items-center gap-1"
                              >
                                <Copy className="h-3 w-3" />
                                <span>Copy JSON</span>
                              </button>
                            </div>
                            <div className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-purple-200 overflow-x-auto whitespace-pre">
                              {JSON.stringify(activeError.metadata, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action Bar Footer */}
                  <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-copy-full-error-json"
                        onClick={() => handleCopy(activeError, "full-error-json")}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center gap-1.5 transition"
                      >
                        {copiedKey === "full-error-json" ? (
                          <>
                            <Check className="h-4 w-4 text-emerald-400" />
                            <span className="text-emerald-400">Full JSON Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 text-ex-muted" />
                            <span>Copy Full Error JSON</span>
                          </>
                        )}
                      </button>

                      {onViewUserJourney && activeError.user?.id && (
                        <button
                          onClick={() => {
                            onClose();
                            onViewUserJourney(activeError.user.id);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-semibold text-purple-300 flex items-center gap-1.5 transition"
                        >
                          <Activity className="h-4 w-4" />
                          <span>View User Activity Journey</span>
                        </button>
                      )}
                    </div>

                    {onNavigateToLogs && (
                      <button
                        onClick={() => {
                          onClose();
                          onNavigateToLogs(activeError);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ex-lav-300 flex items-center gap-1.5 transition"
                      >
                        <span>Inspect in Global Logs Tab</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
