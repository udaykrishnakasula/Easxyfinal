import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  Bug,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Layers,
  ChevronRight,
  Code,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  X,
  Smartphone,
  Shield,
  FileCode,
  Tag,
} from "lucide-react";
import {
  useAdminGroupedErrors,
  useAdminUpdateGroupedErrorStatus,
  useAdminUpdateErrorStatus,
} from "@/admin/adminApi";
import { EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

dayjs.extend(relativeTime);

export default function ErrorGroupsTab({ onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  const { data: groupedData, isLoading, isFetching, refetch } = useAdminGroupedErrors({
    q: searchQuery,
    status: statusFilter !== "all" ? statusFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
  });

  const updateGroupMutation = useAdminUpdateGroupedErrorStatus();

  const groups = groupedData?.groups || [];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleStatusChange = async (fingerprint, status) => {
    try {
      await updateGroupMutation.mutateAsync({ fingerprint, status });
      toast.success(`Group marked as ${status}.`);
      if (selectedGroup && selectedGroup.fingerprint === fingerprint) {
        setSelectedGroup((prev) => (prev ? { ...prev, status } : null));
      }
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const getSeverityBadge = (sev) => {
    switch (sev?.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      case "error":
        return "bg-orange-500/20 text-orange-300 border-orange-500/30";
      case "warning":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30";
      default:
        return "bg-blue-500/20 text-blue-300 border-blue-500/30";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "resolved":
        return "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
      case "investigating":
        return "bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "ignored":
        return "bg-white/5 text-ex-muted border-white/10";
      default:
        return "bg-red-500/10 text-red-300 border-red-500/20";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/[0.02] border border-white/5 p-3.5 rounded-2xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
          <input
            type="text"
            placeholder="Search error signatures, messages, routes, or fingerprints..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-ex-text placeholder:text-ex-muted focus:outline-none focus:border-purple-500/50"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-ex-text focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Statuses</option>
            <option value="unresolved">Unresolved Only</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="ignored">Ignored</option>
          </select>

          {/* Severity filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-ex-text focus:outline-none focus:border-purple-500/50"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-ex-muted hover:text-white transition"
            title="Refresh grouped errors"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* List / Table of Grouped Errors */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <EasyXLoader size="lg" />
          <p className="text-xs text-ex-muted mt-3">Analyzing and grouping error fingerprints...</p>
        </div>
      ) : groups.length === 0 ? (
        <EasyXEmptyState
          icon={CheckCircle2}
          title="No Matching Error Groups"
          description="There are currently no errors matching the selected filter criteria."
        />
      ) : (
        <div className="space-y-3">
          {groups.map((grp) => (
            <div
              key={grp.fingerprint}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/15 transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Tags */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${getSeverityBadge(
                        grp.severity
                      )}`}
                    >
                      {grp.severity || "ERROR"}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border uppercase ${getStatusBadge(
                        grp.status
                      )}`}
                    >
                      {grp.status || "unresolved"}
                    </span>

                    <span className="text-[11px] font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">
                      {grp.fingerprint}
                    </span>

                    <span className="text-[11px] text-ex-muted">
                      Source: <strong className="text-white">{grp.source || "application"}</strong>
                    </span>
                  </div>

                  {/* Title & Normalized Message */}
                  <h4 className="text-sm font-semibold text-ex-text group-hover:text-purple-300 transition truncate">
                    {grp.errorName}: {grp.message}
                  </h4>

                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-ex-muted flex-wrap">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3.5 w-3.5 text-purple-400" />
                      <strong className="text-white font-mono">{grp.count}</strong> occurrences
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-ex-muted" />
                      Last seen {dayjs(grp.lastSeen).fromNow()}
                    </span>

                    <span className="flex items-center gap-1">
                      <Smartphone className="h-3.5 w-3.5 text-ex-muted" />
                      {grp.affectedUsers?.length || 1} affected user(s)
                    </span>

                    <span className="truncate max-w-[200px]">
                      Routes: {grp.affectedRoutes?.slice(0, 2).join(", ") || "/"}
                    </span>
                  </div>
                </div>

                {/* Actions & Triage Controls */}
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                    <button
                      onClick={() => handleStatusChange(grp.fingerprint, "unresolved")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                        grp.status === "unresolved"
                          ? "bg-red-500/20 text-red-300"
                          : "text-ex-muted hover:text-white"
                      }`}
                    >
                      Unresolved
                    </button>
                    <button
                      onClick={() => handleStatusChange(grp.fingerprint, "investigating")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                        grp.status === "investigating"
                          ? "bg-purple-500/20 text-purple-300"
                          : "text-ex-muted hover:text-white"
                      }`}
                    >
                      Investigating
                    </button>
                    <button
                      onClick={() => handleStatusChange(grp.fingerprint, "resolved")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                        grp.status === "resolved"
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "text-ex-muted hover:text-white"
                      }`}
                    >
                      Resolved
                    </button>
                    <button
                      onClick={() => handleStatusChange(grp.fingerprint, "ignored")}
                      className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                        grp.status === "ignored"
                          ? "bg-white/10 text-white"
                          : "text-ex-muted hover:text-white"
                      }`}
                    >
                      Ignore
                    </button>
                  </div>

                  <button
                    onClick={() => setSelectedGroup(grp)}
                    className="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stack Trace & Error Details Modal */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-ex-card-bg border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase ${getSeverityBadge(
                      selectedGroup.severity
                    )}`}
                  >
                    {selectedGroup.severity}
                  </span>
                  <span className="text-[11px] font-mono text-purple-300">
                    {selectedGroup.fingerprint}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white break-all">
                  {selectedGroup.errorName}: {selectedGroup.message}
                </h3>
              </div>
              <button
                onClick={() => setSelectedGroup(null)}
                className="p-2 rounded-xl text-ex-muted hover:text-white hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-ex-muted uppercase block">Occurrences</span>
                  <span className="text-sm font-bold text-white font-mono">{selectedGroup.count}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-ex-muted uppercase block">First Seen</span>
                  <span className="text-[11px] text-white">
                    {dayjs(selectedGroup.firstSeen).format("MMM D, HH:mm")}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-ex-muted uppercase block">Last Seen</span>
                  <span className="text-[11px] text-white">
                    {dayjs(selectedGroup.lastSeen).format("MMM D, HH:mm")}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-ex-muted uppercase block">Status</span>
                  <span className="text-[11px] text-purple-300 capitalize font-semibold">
                    {selectedGroup.status || "unresolved"}
                  </span>
                </div>
              </div>

              {/* Affected Routes */}
              <div>
                <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider block mb-1">
                  Affected Routes
                </label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedGroup.affectedRoutes?.map((r, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 font-mono text-[11px] text-ex-text"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </div>

              {/* Affected Users & Quick Journey Link */}
              <div>
                <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider block mb-1">
                  Affected Users ({selectedGroup.affectedUsers?.length || 0})
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedGroup.affectedUsers?.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setSelectedGroup(null);
                        onSelectUser && onSelectUser(u);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-300 text-[11px] transition flex items-center gap-1"
                    >
                      <span>{u}</span>
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Stack Trace */}
              {selectedGroup.sampleStack && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider">
                      Sample Stack Trace
                    </label>
                    <button
                      onClick={() => handleCopy(selectedGroup.sampleStack, "stack")}
                      className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1"
                    >
                      {copiedKey === "stack" ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedKey === "stack" ? "Copied" : "Copy Stack"}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/60 border border-white/10 text-[11px] font-mono text-ex-muted overflow-x-auto max-h-56 leading-relaxed select-all">
                    {selectedGroup.sampleStack}
                  </pre>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleStatusChange(selectedGroup.fingerprint, "resolved")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Mark Resolved</span>
                </button>
                <button
                  onClick={() => handleStatusChange(selectedGroup.fingerprint, "investigating")}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition flex items-center gap-1.5"
                >
                  <span>Set Investigating</span>
                </button>
              </div>

              <button
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-medium border border-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
