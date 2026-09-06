import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  Activity,
  Flame,
  MousePointerClick,
  AlertTriangle,
  Bug,
  ShieldCheck,
  TrendingDown,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Code,
  Smartphone,
  Eye,
  Check,
  Copy,
  SlidersHorizontal,
  X,
  PlayCircle,
  BarChart3,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from "recharts";

import {
  useAdminUxAnalyticsSummary,
  useAdminErrorLogs,
  useResolveErrorLog,
  useClearErrorLogs,
  useTriggerTestAnalyticsEvent,
} from "@/admin/adminApi";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";

import ErrorGroupsTab from "../components/monitoring/ErrorGroupsTab";
import UserJourneyModal from "../components/monitoring/UserJourneyModal";
import DataRetentionModal from "../components/monitoring/DataRetentionModal";
import FailedActionsTab from "../components/monitoring/FailedActionsTab";
import ErrorFrequencyVisualSummary from "../components/monitoring/ErrorFrequencyVisualSummary";

dayjs.extend(relativeTime);

export default function AdminAnalyticsPage() {
  const [activeTab, setActiveTab] = useState("hotspots"); // 'hotspots' | 'error_groups' | 'funnels' | 'failed_actions' | 'errors' | 'durations'
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all' | 'unresolved' | 'resolved'
  const [selectedError, setSelectedError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals
  const [isJourneyModalOpen, setIsJourneyModalOpen] = useState(false);
  const [inspectedUserId, setInspectedUserId] = useState("");
  const [isRetentionModalOpen, setIsRetentionModalOpen] = useState(false);

  // Queries
  const {
    data: summaryData,
    isLoading: isSummaryLoading,
    refetch: refetchSummary,
    isFetching: isSummaryFetching,
  } = useAdminUxAnalyticsSummary();

  const {
    data: errorsData,
    isLoading: isErrorsLoading,
    refetch: refetchErrors,
    isFetching: isErrorsFetching,
  } = useAdminErrorLogs({
    q: searchQuery,
    severity: severityFilter,
    status: statusFilter,
    limit: 50,
  });

  // Mutations
  const resolveMutation = useResolveErrorLog();
  const clearMutation = useClearErrorLogs();
  const testEventMutation = useTriggerTestAnalyticsEvent();

  const metrics = summaryData?.metrics || {
    totalEvents: 0,
    rageClicksCount: 0,
    deadClicksCount: 0,
    totalErrors: 0,
    unresolvedErrorsCount: 0,
    criticalErrorsCount: 0,
  };

  const hotspots = summaryData?.hotspots || [];
  const funnels = summaryData?.funnels || [];
  const pageDurations = summaryData?.pageDurations || [];
  const errorsList = errorsData?.errors || summaryData?.recentErrors || [];

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleResolve = async (errItem) => {
    try {
      await resolveMutation.mutateAsync({ id: errItem.id, resolved: !errItem.resolved });
      toast.success(errItem.resolved ? "Marked as unresolved" : "Error marked as resolved");
      if (selectedError?.id === errItem.id) {
        setSelectedError({ ...selectedError, resolved: !errItem.resolved });
      }
    } catch {
      toast.error("Failed to update error status");
    }
  };

  const handleClearErrors = async (resolvedOnly = false) => {
    if (!confirm(resolvedOnly ? "Clear all resolved error logs?" : "Clear all captured error logs?")) return;
    try {
      await clearMutation.mutateAsync({ resolvedOnly });
      toast.success("Error logs cleared");
      if (selectedError) setSelectedError(null);
    } catch {
      toast.error("Failed to clear error logs");
    }
  };

  const handleTriggerTest = async (type) => {
    try {
      await testEventMutation.mutateAsync({
        type,
        message:
          type === "ERROR"
            ? "Diagnostic test crash generated from Admin Panel"
            : undefined,
      });
      toast.success(`Simulated ${type} event dispatched to pipeline!`);
    } catch {
      toast.error("Failed to trigger simulation event");
    }
  };

  const refetchAll = () => {
    refetchSummary();
    refetchErrors();
    toast.success("Analytics refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Telemetry Active
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
              <ShieldCheck className="h-3 w-3" />
              Auto Data Masking Enforced
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1.5">
            UX & Error Analytics
          </h1>
          <p className="text-xs text-ex-muted mt-0.5">
            Passive rage/dead click detection, funnel drop-off analytics, and global crash monitoring.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* User Journey Inspector Button */}
          <button
            onClick={() => {
              setInspectedUserId("");
              setIsJourneyModalOpen(true);
            }}
            className="h-9 px-3.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-xs font-medium text-purple-300 flex items-center gap-1.5 transition"
          >
            <Smartphone className="h-3.5 w-3.5 text-purple-400" />
            <span>Journey Inspector</span>
          </button>

          {/* Retention & Export Settings */}
          <button
            onClick={() => setIsRetentionModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ex-text flex items-center gap-1.5 transition"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
            <span>Export & Retention</span>
          </button>

          {/* Test Trigger Dropdown / Buttons */}
          <div className="flex items-center rounded-xl bg-white/5 border border-white/10 p-1">
            <button
              onClick={() => handleTriggerTest("RAGE_CLICK")}
              disabled={testEventMutation.isPending}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-amber-300 hover:bg-amber-500/15 transition flex items-center gap-1"
              title="Test Rage Click Event"
            >
              <Flame className="h-3 w-3" />
              <span>Simulate Rage</span>
            </button>
            <button
              onClick={() => handleTriggerTest("DEAD_CLICK")}
              disabled={testEventMutation.isPending}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-rose-300 hover:bg-rose-500/15 transition flex items-center gap-1"
              title="Test Dead Click Event"
            >
              <MousePointerClick className="h-3 w-3" />
              <span>Simulate Dead Click</span>
            </button>
            <button
              onClick={() => handleTriggerTest("ERROR")}
              disabled={testEventMutation.isPending}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-red-400 hover:bg-red-500/15 transition flex items-center gap-1"
              title="Test Error Report"
            >
              <Bug className="h-3 w-3" />
              <span>Simulate Error</span>
            </button>
          </div>

          <button
            onClick={refetchAll}
            disabled={isSummaryFetching || isErrorsFetching}
            className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-ex-text flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSummaryFetching ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Rage Clicks */}
        <div className="rounded-2xl bg-ex-surface border border-amber-500/20 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-amber-400">
            <Flame className="h-16 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ex-muted">Rage Clicks</span>
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {metrics.rageClicksCount}
            </span>
            <span className="text-[11px] font-medium text-amber-400/90">
              {metrics.rageClicksCount > 0 ? "Friction hotspots" : "Zero friction detected"}
            </span>
          </div>
          <p className="text-[11px] text-ex-muted mt-1">
            3+ rapid clicks within 1.0s on the same interactive element.
          </p>
        </div>

        {/* Dead Clicks */}
        <div className="rounded-2xl bg-ex-surface border border-rose-500/20 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-rose-400">
            <MousePointerClick className="h-16 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ex-muted">Dead Clicks</span>
            <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <MousePointerClick className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {metrics.deadClicksCount}
            </span>
            <span className="text-[11px] font-medium text-rose-400/90">
              Unresponsive UI elements
            </span>
          </div>
          <p className="text-[11px] text-ex-muted mt-1">
            Clicks on interactive elements that trigger zero state/network/DOM updates.
          </p>
        </div>

        {/* Unresolved Crashes */}
        <div className="rounded-2xl bg-ex-surface border border-red-500/20 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-red-400">
            <Bug className="h-16 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ex-muted">Unresolved Errors</span>
            <span className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
              <Bug className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {metrics.unresolvedErrorsCount}
            </span>
            <span className="text-[11px] font-medium text-red-400/90">
              {metrics.criticalErrorsCount} Critical
            </span>
          </div>
          <p className="text-[11px] text-ex-muted mt-1">
            Unhandled React exceptions, promise rejections & failed API endpoints.
          </p>
        </div>

        {/* Funnel Conversions */}
        <div className="rounded-2xl bg-ex-surface border border-purple-500/20 p-5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition text-purple-400">
            <TrendingDown className="h-16 w-16" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-ex-muted">Funnel Completion</span>
            <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Activity className="h-4 w-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {funnels.length > 0
                ? `${Math.round(
                    funnels.reduce((acc, f) => acc + f.conversionRate, 0) / funnels.length
                  )}%`
                : "100%"}
            </span>
            <span className="text-[11px] font-medium text-purple-300">
              Avg conversion
            </span>
          </div>
          <p className="text-[11px] text-ex-muted mt-1">
            Deposit, KYC and Investment end-to-end completion rate.
          </p>
        </div>
      </div>

      {/* 7-Day Error Monitoring Frequency Visual Summary (Recharts Bar Chart) */}
      <ErrorFrequencyVisualSummary
        onSelectDay={(dayData) => {
          if (dayData && dayData.full_date) {
            toast.info(`Inspecting error telemetry for ${dayData.full_date}`);
          }
        }}
        onNavigateToLogs={(err) => {
          setActiveTab("error_logs");
          setSelectedError(err);
        }}
        onViewUserJourney={(userId) => {
          setInspectedUserId(userId);
          setIsJourneyModalOpen(true);
        }}
      />

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-white/10 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("hotspots")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "hotspots"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>Frustration Hotspots ({hotspots.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("error_groups")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "error_groups"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <Bug className="h-4 w-4" />
          <span>Error Groups & Triage</span>
        </button>

        <button
          onClick={() => setActiveTab("funnels")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "funnels"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <TrendingDown className="h-4 w-4" />
          <span>Drop-off Funnels</span>
        </button>

        <button
          onClick={() => setActiveTab("failed_actions")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "failed_actions"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <XCircle className="h-4 w-4" />
          <span>Failed Actions</span>
        </button>

        <button
          onClick={() => setActiveTab("errors")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "errors"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <Code className="h-4 w-4" />
          <span>Raw Error Logs ({metrics.unresolvedErrorsCount} new)</span>
        </button>

        <button
          onClick={() => setActiveTab("durations")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
            activeTab === "durations"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:text-white hover:bg-white/5"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Screen Durations</span>
        </button>
      </div>

      {/* TAB: ERROR GROUPS & TRIAGE */}
      {activeTab === "error_groups" && (
        <ErrorGroupsTab
          onSelectUser={(uId) => {
            setInspectedUserId(uId);
            setIsJourneyModalOpen(true);
          }}
        />
      )}

      {/* TAB: FAILED ACTIONS BREAKDOWN */}
      {activeTab === "failed_actions" && (
        <FailedActionsTab
          onSelectUser={(uId) => {
            setInspectedUserId(uId);
            setIsJourneyModalOpen(true);
          }}
        />
      )}

      {/* ==================== TAB 1: FRUSTRATION HOTSPOTS ==================== */}
      {activeTab === "hotspots" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-ex-surface border border-white/10 p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  UI Friction & Frustration Hotspot Ranking
                </h2>
                <p className="text-xs text-ex-muted mt-0.5">
                  Elements sorted by cumulative friction score (Rage Clicks × 2 + Dead Clicks × 1.5).
                </p>
              </div>
            </div>

            {hotspots.length === 0 ? (
              <EasyXEmptyState
                icon={CheckCircle2}
                title="No UI Friction Detected"
                description="Your users haven't encountered rage clicks or dead clicks yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-ex-muted font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-3">Target Element & Selector</th>
                      <th className="py-3 px-3">Page Route</th>
                      <th className="py-3 px-3 text-center">Rage Clicks</th>
                      <th className="py-3 px-3 text-center">Dead Clicks</th>
                      <th className="py-3 px-3 text-center">Friction Score</th>
                      <th className="py-3 px-3 text-right">Last Detected</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {hotspots.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3">
                          <div className="font-medium text-white flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-purple-300">
                              {item.element?.split(".")?.[0] || "element"}
                            </span>
                            <span className="truncate max-w-xs">{item.elementText || item.element}</span>
                          </div>
                          <div className="text-[10px] font-mono text-ex-muted truncate max-w-sm mt-0.5">
                            {item.element}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[11px] font-mono text-ex-text">
                            {item.route}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.rageClicks > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <Flame className="h-3 w-3" />
                              {item.rageClicks}
                            </span>
                          ) : (
                            <span className="text-ex-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {item.deadClicks > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              <MousePointerClick className="h-3 w-3" />
                              {item.deadClicks}
                            </span>
                          ) : (
                            <span className="text-ex-muted">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="font-mono font-bold text-purple-400">
                            {item.totalFrictionScore.toFixed(1)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-ex-muted whitespace-nowrap">
                          {dayjs(item.lastDetected).fromNow()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 2: DROP-OFF FUNNELS ==================== */}
      {activeTab === "funnels" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {funnels.map((f) => (
              <div
                key={f.funnelName}
                className="rounded-2xl bg-ex-surface border border-white/10 p-5 md:p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      {f.funnelName} Funnel
                    </span>
                    <span className="text-xs text-ex-muted flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      avg {f.avgDurationSeconds}s
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-black tracking-tight text-white">
                      {f.conversionRate}%
                    </span>
                    <span className="text-xs font-medium text-emerald-400">
                      {f.completed} Completed
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="h-3 w-full rounded-full bg-white/5 overflow-hidden flex mb-4">
                    <div
                      style={{ width: `${f.conversionRate}%` }}
                      className="h-full bg-emerald-500 transition-all duration-500"
                      title={`Completed: ${f.completed}`}
                    />
                    <div
                      style={{ width: `${f.dropOffRate}%` }}
                      className="h-full bg-rose-500/80 transition-all duration-500"
                      title={`Abandoned: ${f.abandoned}`}
                    />
                  </div>

                  {/* Funnel Metrics Breakdown */}
                  <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-xl bg-black/20 border border-white/5 mb-4">
                    <div>
                      <div className="text-[10px] text-ex-muted uppercase font-semibold">Starts</div>
                      <div className="text-sm font-bold text-white mt-0.5">{f.starts}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-emerald-400 uppercase font-semibold">Success</div>
                      <div className="text-sm font-bold text-emerald-300 mt-0.5">{f.completed}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-rose-400 uppercase font-semibold">Drop-off</div>
                      <div className="text-sm font-bold text-rose-300 mt-0.5">{f.abandoned}</div>
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-ex-muted pt-3 border-t border-white/8 flex items-center justify-between">
                  <span>Drop-off Rate:</span>
                  <span className="font-semibold text-rose-400">{f.dropOffRate}%</span>
                </div>
              </div>
            ))}
          </div>

          {/* Funnel Explanation & Best Practices */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/8 p-5 flex items-start gap-3.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-xs text-ex-muted leading-relaxed">
              <strong className="text-white block text-sm mb-1">
                How EasyX Funnel Analytics Works
              </strong>
              The tracker automatically observes route entries for critical actions (e.g.{" "}
              <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">/deposit</code>,{" "}
              <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">/kyc</code>,{" "}
              <code className="text-purple-300 bg-white/5 px-1 py-0.5 rounded">/investments</code>) and
              tracks completion vs. abandonment when users navigate away or close modals before
              submission.
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: ERROR & CRASH LOGS ==================== */}
      {activeTab === "errors" && (
        <div className="space-y-5">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-ex-surface p-4 rounded-2xl border border-white/10">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
              <input
                type="text"
                placeholder="Search error message, stack, route, user..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-ex-muted focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-ex-text focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-xs text-ex-text focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Statuses</option>
                <option value="unresolved">Unresolved Only</option>
                <option value="resolved">Resolved Only</option>
              </select>

              <button
                onClick={() => handleClearErrors(false)}
                className="py-2 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Logs</span>
              </button>
            </div>
          </div>

          {/* Error Table */}
          <div className="rounded-2xl bg-ex-surface border border-white/10 overflow-hidden">
            {isErrorsLoading ? (
              <div className="p-12 flex justify-center">
                <EasyXLoader label="Loading error diagnostics..." />
              </div>
            ) : errorsList.length === 0 ? (
              <div className="p-8">
                <EasyXEmptyState
                  icon={CheckCircle2}
                  title="No Errors Found"
                  description="No exception reports match your active filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 text-ex-muted font-semibold uppercase tracking-wider text-[10px] bg-white/[0.02]">
                      <th className="py-3 px-4">Severity & Status</th>
                      <th className="py-3 px-4">Error Name & Message</th>
                      <th className="py-3 px-4">Route</th>
                      <th className="py-3 px-4">User</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {errorsList.map((errItem) => (
                      <tr
                        key={errItem.id}
                        className={`hover:bg-white/[0.02] transition cursor-pointer ${
                          errItem.resolved ? "opacity-60" : ""
                        }`}
                        onClick={() => setSelectedError(errItem)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                errItem.severity === "critical"
                                  ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                  : errItem.severity === "warning"
                                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                                  : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              {errItem.severity}
                            </span>
                            {errItem.resolved ? (
                              <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Resolved
                              </span>
                            ) : (
                              <span className="text-amber-400 text-[10px] font-semibold">New</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 max-w-md">
                          <div className="font-semibold text-white truncate">{errItem.errorName}</div>
                          <div className="text-[11px] text-ex-muted truncate mt-0.5">
                            {errItem.message}
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-[11px] font-mono text-purple-300">
                            {errItem.route || "/"}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="text-white font-medium truncate max-w-[140px]">
                            {errItem.user?.email || "anonymous"}
                          </div>
                          <div className="text-[10px] text-ex-muted font-mono uppercase">
                            {errItem.user?.role || "guest"}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-ex-muted whitespace-nowrap">
                          {dayjs(errItem.timestamp).fromNow()}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleResolve(errItem)}
                              className={`p-1.5 rounded-lg border text-xs transition ${
                                errItem.resolved
                                  ? "bg-white/5 border-white/10 text-ex-muted hover:text-white"
                                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              }`}
                              title={errItem.resolved ? "Reopen issue" : "Mark as resolved"}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedError(errItem)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-ex-text transition"
                              title="Inspect Stack Trace & Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== TAB 4: SCREEN DURATIONS ==================== */}
      {activeTab === "durations" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-ex-surface border border-white/10 p-5 md:p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-400" />
              Screen View Duration & Traffic Distribution
            </h2>
            <p className="text-xs text-ex-muted mb-5">
              Average user dwell time across different sections of the EasyX application.
            </p>

            {pageDurations.length === 0 ? (
              <EasyXEmptyState
                icon={Clock}
                title="No Screen Duration Logs"
                description="Screen durations will be calculated as users navigate through pages."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {pageDurations.map((p) => (
                  <div
                    key={p.route}
                    className="p-4 rounded-xl bg-black/20 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono text-xs font-semibold text-purple-300">
                        {p.route}
                      </span>
                      <div className="text-[11px] text-ex-muted mt-1">{p.visits} recorded sessions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{p.avgDurationSec}s</div>
                      <div className="text-[10px] text-ex-muted uppercase">Avg Dwell Time</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== ERROR INSPECTOR MODAL ==================== */}
      {selectedError && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-ex-surface border border-white/15 p-6 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl ${
                    selectedError.severity === "critical"
                      ? "bg-red-500/15 text-red-400 border border-red-500/30"
                      : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                  }`}
                >
                  <Bug className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {selectedError.errorName}
                  </h3>
                  <p className="text-xs text-ex-muted">
                    Ref ID: <span className="font-mono text-purple-300">{selectedError.id}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedError(null)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
              {/* Message */}
              <div>
                <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider block mb-1">
                  Error Message
                </label>
                <div className="p-3 rounded-xl bg-black/40 border border-white/8 text-xs font-mono text-red-300 select-all">
                  {selectedError.message}
                </div>
              </div>

              {/* Context Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-ex-muted uppercase">Route</div>
                  <div className="text-xs font-mono font-medium text-white truncate mt-0.5">
                    {selectedError.route || "/"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-ex-muted uppercase">Source</div>
                  <div className="text-xs font-mono font-medium text-white truncate mt-0.5">
                    {selectedError.source}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-ex-muted uppercase">User Email</div>
                  <div className="text-xs font-medium text-white truncate mt-0.5">
                    {selectedError.user?.email || "anonymous"}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                  <div className="text-[10px] text-ex-muted uppercase">Time</div>
                  <div className="text-xs font-medium text-white truncate mt-0.5">
                    {dayjs(selectedError.timestamp).format("MMM D, HH:mm:ss")}
                  </div>
                </div>
              </div>

              {/* Stack Trace */}
              {selectedError.stack && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider">
                      Stack Trace
                    </label>
                    <button
                      onClick={() => handleCopy(selectedError.stack, "stack")}
                      className="text-[11px] text-purple-300 hover:text-purple-200 flex items-center gap-1"
                    >
                      {copiedKey === "stack" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedKey === "stack" ? "Copied" : "Copy Stack"}</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-black/50 border border-white/8 text-[11px] font-mono text-ex-muted overflow-x-auto max-h-44 leading-relaxed select-all">
                    {selectedError.stack}
                  </pre>
                </div>
              )}

              {/* Component Stack */}
              {selectedError.componentStack && (
                <div>
                  <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider block mb-1">
                    React Component Tree
                  </label>
                  <pre className="p-3 rounded-xl bg-black/50 border border-white/8 text-[11px] font-mono text-purple-300 overflow-x-auto max-h-32 select-all">
                    {selectedError.componentStack}
                  </pre>
                </div>
              )}

              {/* User Agent */}
              <div>
                <label className="text-[10px] font-semibold text-ex-muted uppercase tracking-wider block mb-1">
                  Client Environment
                </label>
                <div className="text-[11px] font-mono text-ex-muted truncate">
                  {selectedError.userAgent || "N/A"}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-3">
              <button
                onClick={() => handleToggleResolve(selectedError)}
                className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  selectedError.resolved
                    ? "bg-white/5 text-ex-muted hover:text-white border border-white/10"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>{selectedError.resolved ? "Reopen Diagnostic" : "Mark as Resolved"}</span>
              </button>

              <button
                onClick={() => setSelectedError(null)}
                className="py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-medium border border-white/10 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Journey Modal */}
      <UserJourneyModal
        isOpen={isJourneyModalOpen}
        onClose={() => setIsJourneyModalOpen(false)}
        initialUserId={inspectedUserId}
      />

      {/* Retention & Export Modal */}
      <DataRetentionModal
        isOpen={isRetentionModalOpen}
        onClose={() => setIsRetentionModalOpen(false)}
      />
    </div>
  );
}
