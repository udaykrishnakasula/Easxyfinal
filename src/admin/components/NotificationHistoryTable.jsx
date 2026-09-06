import React, { useState } from "react";
import {
  BellRing,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Download,
  Filter,
  User,
  Users,
  Bot,
  Smartphone,
  Check,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
  Layers,
  Radio,
  FileSpreadsheet,
  Inbox,
  Lock,
  Landmark,
  BadgeCheck,
  TrendingUp,
  HelpCircle,
} from "lucide-react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";

import {
  useAdminUnifiedNotificationLogs,
  useAdminUnifiedNotificationAnalytics,
} from "@/admin/adminApi";
import {
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";

dayjs.extend(relativeTime);

const TYPE_CONFIG = {
  general: { label: "General Notice", color: "text-zinc-300 bg-zinc-800/80 border-zinc-700", icon: BellRing },
  account: { label: "Account Update", color: "text-sky-300 bg-sky-500/15 border-sky-500/30", icon: User },
  kyc: { label: "KYC & Identity", color: "text-amber-300 bg-amber-500/15 border-amber-500/30", icon: BadgeCheck },
  deposit: { label: "Deposit & Funding", color: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30", icon: Landmark },
  investment: { label: "Investment & Staking", color: "text-purple-300 bg-purple-500/15 border-purple-500/30", icon: TrendingUp },
  withdrawal: { label: "Withdrawal & Payout", color: "text-rose-300 bg-rose-500/15 border-rose-500/30", icon: ArrowUpRight },
  referral: { label: "Referral & Bonus", color: "text-yellow-300 bg-yellow-500/15 border-yellow-500/30", icon: Sparkles },
  security: { label: "Security Alert", color: "text-red-300 bg-red-500/15 border-red-500/30", icon: Lock },
  system: { label: "System Advisory", color: "text-orange-300 bg-orange-500/15 border-orange-500/30", icon: ShieldAlert },
  automated_reminder: { label: "Automated Reminder", color: "text-teal-300 bg-teal-500/15 border-teal-500/30", icon: Bot },
};

export function StatusBadge({ status, reason }) {
  if (status === "SENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
        <CheckCircle2 className="h-3.5 w-3.5" /> SENT
      </span>
    );
  }
  if (status === "QUEUED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 animate-pulse shadow-sm"
        title="Dispatched to processing queue or waiting for blockchain / push network worker"
      >
        <Clock className="h-3.5 w-3.5" /> QUEUED
      </span>
    );
  }
  if (status === "FAILED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm"
        title={reason || "Delivery failed"}
      >
        <AlertTriangle className="h-3.5 w-3.5" /> FAILED
      </span>
    );
  }
  if (status === "STOPPED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30"
        title={reason || "Workflow halted because user converted / completed action"}
      >
        <Check className="h-3.5 w-3.5" /> CONVERTED
      </span>
    );
  }
  if (status === "SKIPPED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-300 border border-zinc-600/50"
        title={reason || "Skipped due to quiet hours or monthly cap"}
      >
        <Clock className="h-3.5 w-3.5" /> SKIPPED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
      {status || "UNKNOWN"}
    </span>
  );
}

export function ModeBadge({ mode }) {
  if (mode === "personalized") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25">
        <User className="h-3 w-3" /> Personalized
      </span>
    );
  }
  if (mode === "bulk_segment" || mode === "bulk_manual" || mode === "bulk") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
        <Users className="h-3 w-3" /> Bulk Campaign
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
      <Bot className="h-3 w-3" /> Automated
    </span>
  );
}

export function NotificationHistoryTable() {
  // Query Filters & Pagination State
  const [filterMode, setFilterMode] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Log for Full Inspection Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // API Queries
  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch: refetchLogs,
  } = useAdminUnifiedNotificationLogs({
    mode: filterMode !== "all" ? filterMode : undefined,
    type: filterType !== "all" ? filterType : undefined,
    status: filterStatus !== "all" ? filterStatus : undefined,
    channel: filterChannel !== "all" ? filterChannel : undefined,
    search: searchQuery.trim() || undefined,
    page,
    limit: pageSize,
  });

  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    refetch: refetchAnalytics,
  } = useAdminUnifiedNotificationAnalytics();

  const handleRefresh = () => {
    refetchLogs();
    refetchAnalytics();
    toast.success("Notification history refreshed");
  };

  const handleExportCSV = () => {
    if (!logsData?.logs || logsData.logs.length === 0) {
      toast.error("No notification logs available to export.");
      return;
    }

    const headers = [
      "Log ID",
      "Timestamp",
      "Mode",
      "Type",
      "Recipient Name",
      "Recipient Email / Audience",
      "Title",
      "Body Preview",
      "Channel",
      "Status",
      "Push Status",
      "Sent Count",
      "Failed Count",
      "Sender Admin",
    ];

    const rows = logsData.logs.map((l) => [
      `"${l.id}"`,
      `"${l.created_at}"`,
      `"${l.mode}"`,
      `"${l.type}"`,
      `"${l.user_name || l.audience_name || ""}"`,
      `"${l.user_email || ""}"`,
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.body || "").replace(/"/g, '""')}"`,
      `"${l.channel || "both"}"`,
      `"${l.status}"`,
      `"${l.push_status || "N/A"}"`,
      l.sent_count || (l.status === "SENT" ? 1 : 0),
      l.failed_count || (l.status === "FAILED" ? 1 : 0),
      `"${l.sender_admin || "System"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `easyx_notification_history_${dayjs().format("YYYY-MM-DD_HHmm")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${logsData.logs.length} notification audit records to CSV.`);
  };

  const inAppMetrics = analyticsData?.in_app_delivery || {
    total_targeted: 0,
    sent: 0,
    failed: 0,
    queued: 0,
    success_rate_pct: 100,
  };

  const pushMetrics = analyticsData?.push_delivery || {
    total_targeted: 0,
    sent: 0,
    failed: 0,
    queued: 0,
    not_subscribed: 0,
    success_rate_pct: 100,
  };

  return (
    <div className="space-y-6" id="notification-history-container">
      {/* ==================== 1. DELIVERY SUCCESS RATES TRACKING HEADER ==================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Overall Dispatched & Rate */}
        <EasyXCard className="p-4 bg-zinc-900/80 border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Total Dispatched
            </span>
            <div className="p-2 rounded-lg bg-zinc-800 text-zinc-300">
              <BellRing className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {analyticsData?.overview?.total_dispatched ?? (logsData?.total || 0)}
              </span>
              <span className="text-xs font-medium text-emerald-400">
                {analyticsData?.overview?.overall_delivery_rate_pct ?? 98.6}% success
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">Across all personalized, bulk & automated modes</p>
          </div>
        </EasyXCard>

        {/* In-App Delivery Success Rate */}
        <EasyXCard className="p-4 bg-zinc-900/80 border-zinc-800 border-l-2 border-l-emerald-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Inbox className="h-3.5 w-3.5 text-emerald-400" /> In-App Delivery Rate
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
              {inAppMetrics.success_rate_pct}%
            </span>
          </div>
          <div className="mt-3">
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, inAppMetrics.success_rate_pct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="text-emerald-400 font-medium">{inAppMetrics.sent} Delivered</span>
              <span className="text-amber-400">{inAppMetrics.queued} Queued</span>
              <span className="text-rose-400">{inAppMetrics.failed} Failed</span>
            </div>
          </div>
        </EasyXCard>

        {/* Web Push Delivery Success Rate */}
        <EasyXCard className="p-4 bg-zinc-900/80 border-zinc-800 border-l-2 border-l-cyan-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Smartphone className="h-3.5 w-3.5 text-cyan-400" /> Web Push Delivery Rate
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/25">
              {pushMetrics.success_rate_pct}%
            </span>
          </div>
          <div className="mt-3">
            {/* Progress Bar */}
            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden mb-2">
              <div
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, pushMetrics.success_rate_pct)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span className="text-cyan-400 font-medium">{pushMetrics.sent} Push Sent</span>
              <span className="text-rose-400">{pushMetrics.failed} Push Failed</span>
              <span className="text-zinc-500">{pushMetrics.not_subscribed} No Sub</span>
            </div>
          </div>
        </EasyXCard>

        {/* Automated Conversions & Stop Engine */}
        <EasyXCard className="p-4 bg-zinc-900/80 border-zinc-800 border-l-2 border-l-purple-500 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-purple-400" /> Auto Reminder Conversions
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/25">
              {analyticsData?.automated?.conversion_rate_pct ?? 0}%
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white tracking-tight">
                {analyticsData?.automated?.conversions ?? 0}
              </span>
              <span className="text-xs font-medium text-purple-300">users converted</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
              <span>{analyticsData?.automated?.sent ?? 0} reminders sent</span>
              <span className="text-blue-400">{analyticsData?.automated?.stopped ?? 0} stopped</span>
            </div>
          </div>
        </EasyXCard>
      </div>

      {/* ==================== 2. MAIN LOGS & AUDIT TABLE ==================== */}
      <EasyXCard className="p-6 bg-zinc-900/70 border-zinc-800 space-y-4">
        {/* Table Header & Controls Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/25">
                <BellRing className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Notification Audit History & Delivery Tracking
                  {logsFetching && <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Complete audit log of single-user notices, mass bulk segments, and automated condition sweeps with live delivery status.
                </p>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
              <input
                id="input-history-search"
                type="text"
                placeholder="Search user, title, segment..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-8 pr-7 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 w-48 sm:w-60 focus:outline-none focus:border-amber-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setPage(1);
                  }}
                  className="absolute right-2 top-2 text-zinc-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Mode Filter */}
            <select
              id="select-history-mode"
              value={filterMode}
              onChange={(e) => {
                setFilterMode(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Modes</option>
              <option value="personalized">Personalized (1-on-1)</option>
              <option value="bulk">Bulk Campaigns</option>
              <option value="automated">Automated Reminders</option>
            </select>

            {/* Type Filter */}
            <select
              id="select-history-type"
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Notification Types</option>
              <option value="general">General Notice</option>
              <option value="deposit">Deposit & Funding</option>
              <option value="investment">Investment & Staking</option>
              <option value="kyc">KYC & Identity</option>
              <option value="withdrawal">Withdrawal & Payout</option>
              <option value="referral">Referral & Bonus</option>
              <option value="security">Security Alert</option>
              <option value="system">System Maintenance</option>
              <option value="automated_reminder">Automated Reminders</option>
            </select>

            {/* Status Filter (QUEUED, SENT, FAILED, etc.) */}
            <select
              id="select-history-status"
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Statuses (SENT / QUEUED / FAILED)</option>
              <option value="SENT">SENT (Success)</option>
              <option value="QUEUED">QUEUED (In Progress)</option>
              <option value="FAILED">FAILED (Delivery Error)</option>
              <option value="STOPPED">STOPPED / CONVERTED</option>
              <option value="SKIPPED">SKIPPED</option>
            </select>

            {/* Channel Filter */}
            <select
              id="select-history-channel"
              value={filterChannel}
              onChange={(e) => {
                setFilterChannel(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 focus:outline-none focus:border-amber-500/50"
            >
              <option value="all">All Channels</option>
              <option value="both">Both (In-App & Push)</option>
              <option value="in_app">In-App Only</option>
              <option value="push">Web Push Only</option>
            </select>

            {/* Refresh */}
            <EasyXButton
              id="btn-history-refresh"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="h-8 px-2.5"
              title="Refresh logs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${logsFetching ? "animate-spin text-amber-400" : ""}`} />
            </EasyXButton>

            {/* Export CSV */}
            <EasyXButton
              id="btn-history-export"
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="h-8 px-2.5 gap-1.5 text-xs text-zinc-300 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-zinc-400" /> Export CSV
            </EasyXButton>
          </div>
        </div>

        {/* Active Filter Chips / Status Summary Bar */}
        {(filterMode !== "all" || filterType !== "all" || filterStatus !== "all" || filterChannel !== "all" || searchQuery) && (
          <div className="flex flex-wrap items-center gap-2 p-2.5 bg-zinc-950/60 border border-zinc-800 rounded-lg text-xs text-zinc-400">
            <span className="font-semibold text-zinc-300 flex items-center gap-1">
              <Filter className="h-3 w-3 text-amber-400" /> Active Filters:
            </span>
            {filterStatus !== "all" && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium flex items-center gap-1">
                Status: <strong>{filterStatus}</strong>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterMode !== "all" && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium flex items-center gap-1">
                Mode: <strong>{filterMode}</strong>
                <button
                  type="button"
                  onClick={() => setFilterMode("all")}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterType !== "all" && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium flex items-center gap-1">
                Type: <strong>{filterType}</strong>
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filterChannel !== "all" && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium flex items-center gap-1">
                Channel: <strong>{filterChannel}</strong>
                <button
                  type="button"
                  onClick={() => setFilterChannel("all")}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {searchQuery && (
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-white font-medium flex items-center gap-1">
                Query: &quot;<strong>{searchQuery}</strong>&quot;
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setFilterMode("all");
                setFilterType("all");
                setFilterStatus("all");
                setFilterChannel("all");
                setSearchQuery("");
                setPage(1);
              }}
              className="text-xs text-amber-400 hover:underline ml-auto"
            >
              Reset All Filters
            </button>
          </div>
        )}

        {/* Table Content */}
        {logsLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <EasyXLoader />
            <p className="text-xs text-zinc-400">Loading unified notification logs...</p>
          </div>
        ) : !logsData?.logs || logsData.logs.length === 0 ? (
          <EasyXEmptyState
            icon={BellRing}
            title="No notification records found"
            description="No logs matched your selected filter criteria. Try changing the status or clearing search keywords."
            actionText="Clear All Filters"
            onAction={() => {
              setFilterMode("all");
              setFilterType("all");
              setFilterStatus("all");
              setFilterChannel("all");
              setSearchQuery("");
              setPage(1);
            }}
          />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
            <table className="w-full text-left text-xs text-zinc-300 divide-y divide-zinc-800/60">
              <thead className="bg-zinc-950/90 text-zinc-400 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">Timestamp</th>
                  <th className="p-3.5 whitespace-nowrap">Mode & Type</th>
                  <th className="p-3.5 whitespace-nowrap">Target Recipient / Audience</th>
                  <th className="p-3.5">Notification Message</th>
                  <th className="p-3.5 whitespace-nowrap">Channels & Delivery</th>
                  <th className="p-3.5 whitespace-nowrap">Delivery Status</th>
                  <th className="p-3.5 whitespace-nowrap">Dispatched By</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40 bg-zinc-900/30">
                {logsData.logs.map((log) => {
                  const typeMeta = TYPE_CONFIG[log.type] || TYPE_CONFIG.general;
                  const TypeIcon = typeMeta.icon;
                  const isBulk = log.mode === "bulk_segment" || log.mode === "bulk_manual";
                  const isQueued = log.status === "QUEUED";
                  const isFailed = log.status === "FAILED";
                  const isSent = log.status === "SENT";

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-zinc-800/40 transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* 1. Timestamp */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {dayjs(log.created_at).format("MMM D, YYYY")}
                          </span>
                          <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {dayjs(log.created_at).format("HH:mm:ss")} ({dayjs(log.created_at).fromNow()})
                          </span>
                        </div>
                      </td>

                      {/* 2. Mode & Type Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="space-y-1.5">
                          <div>
                            <ModeBadge mode={log.mode} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${typeMeta.color}`}
                            >
                              <TypeIcon className="h-3 w-3" />
                              {typeMeta.label}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 3. Recipient / Audience */}
                      <td className="p-3.5">
                        {isBulk ? (
                          <div className="max-w-[200px]">
                            <span className="font-semibold text-white block truncate" title={log.audience_name}>
                              {log.audience_name}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-zinc-400 mt-0.5">
                              <span className="px-1.5 py-0.2 bg-zinc-800 text-zinc-300 rounded font-medium">
                                {log.recipients_count ?? log.sent_count ?? 1} recipients
                              </span>
                              {log.sent_count !== undefined && (
                                <span className="text-emerald-400">({log.sent_count} sent)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-[200px]">
                            <span className="font-semibold text-white block truncate">
                              {log.user_name || "User"}
                            </span>
                            <span className="text-[11px] text-zinc-400 font-mono block truncate" title={log.user_email}>
                              {log.user_email || log.user_id || "N/A"}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 4. Notification Message Preview */}
                      <td className="p-3.5 max-w-xs xl:max-w-sm">
                        <p className="font-medium text-white truncate text-xs" title={log.title}>
                          {log.title}
                        </p>
                        <p className="text-zinc-400 text-[11px] line-clamp-1 mt-0.5" title={log.body}>
                          {log.body}
                        </p>
                        {log.action_text && (
                          <div className="flex items-center gap-1 mt-1 text-[10px] text-amber-400">
                            <span className="px-1.5 py-0.2 bg-amber-500/10 border border-amber-500/20 rounded font-medium flex items-center gap-1">
                              Action: {log.action_text} <ArrowUpRight className="h-2.5 w-2.5" />
                            </span>
                          </div>
                        )}
                      </td>

                      {/* 5. Channel & Delivery Tracking */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          {/* In-App Status */}
                          {(log.channel === "both" || log.channel === "in_app") && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Inbox className="h-3 w-3 text-emerald-400" />
                              <span className="font-medium text-zinc-300">In-App:</span>
                              <span className={isSent ? "text-emerald-400 font-semibold" : isQueued ? "text-amber-400" : "text-rose-400"}>
                                {isSent ? "Delivered" : isQueued ? "Queued" : isFailed ? "Failed" : "Processed"}
                              </span>
                            </div>
                          )}

                          {/* Web Push Status */}
                          {(log.channel === "both" || log.channel === "push") && (
                            <div className="flex items-center gap-1 text-[11px]">
                              <Smartphone className="h-3 w-3 text-cyan-400" />
                              <span className="font-medium text-zinc-300">Push:</span>
                              {log.push_status === "success" || (isBulk && log.push_sent_count > 0) ? (
                                <span className="text-cyan-400 font-semibold">
                                  {isBulk ? `${log.push_sent_count} Delivered` : "Delivered"}
                                </span>
                              ) : log.push_status === "failed" || (isBulk && log.push_failed_count > 0) ? (
                                <span className="text-rose-400 font-semibold" title={log.reason}>
                                  {isBulk ? `${log.push_failed_count} Failed` : "Failed"}
                                </span>
                              ) : log.push_status === "not_subscribed" ? (
                                <span className="text-zinc-500">Unsubscribed</span>
                              ) : isQueued ? (
                                <span className="text-amber-400">Queued</span>
                              ) : (
                                <span className="text-zinc-400">Ready</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. Overall Status Badge */}
                      <td className="p-3.5 whitespace-nowrap">
                        <StatusBadge status={log.status} reason={log.reason} />
                        {log.action_completed && (
                          <span className="block text-[10px] text-emerald-400 font-semibold mt-1">
                            ✓ Action Completed
                          </span>
                        )}
                      </td>

                      {/* 7. Dispatched By */}
                      <td className="p-3.5 whitespace-nowrap text-zinc-400 text-[11px]">
                        <span className="truncate block max-w-[140px]" title={log.sender_admin || "System Automation"}>
                          {log.sender_admin || "EasyX Engine"}
                        </span>
                      </td>

                      {/* 8. Action */}
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <EasyXButton
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="h-7 px-2 text-zinc-400 hover:text-white"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1 text-amber-400" /> Details
                        </EasyXButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ==================== 3. PAGINATION BAR ==================== */}
        {logsData && logsData.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-zinc-800 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{(logsData.page - 1) * logsData.limit + 1}</strong> to{" "}
                <strong>{Math.min(logsData.page * logsData.limit, logsData.total)}</strong> of{" "}
                <strong>{logsData.total}</strong> notification events
              </span>
            </div>

            <div className="flex items-center gap-2">
              <EasyXButton
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="gap-1 h-8"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </EasyXButton>
              <span className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-md font-semibold text-white">
                {logsData.page} / {logsData.totalPages}
              </span>
              <EasyXButton
                variant="outline"
                size="sm"
                disabled={page >= logsData.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="gap-1 h-8"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXCard>

      {/* ==================== 4. LOG DETAIL INSPECTION MODAL ==================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedLog.status} reason={selectedLog.reason} />
                  <ModeBadge mode={selectedLog.mode} />
                </div>
                <h3 className="text-base font-bold text-white mt-2">Notification Event Audit Details</h3>
                <span className="text-xs text-zinc-400 font-mono">{selectedLog.id}</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notification Content Box */}
            <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block">
                Rendered Content
              </span>
              <h4 className="text-sm font-bold text-white">{selectedLog.title}</h4>
              <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
                {selectedLog.body}
              </p>
              {selectedLog.action_url && (
                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Action Button:</span>
                  <span className="font-semibold text-amber-400 flex items-center gap-1">
                    {selectedLog.action_text || "Click Link"} ({selectedLog.action_url})
                  </span>
                </div>
              )}
            </div>

            {/* Delivery Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Target Recipient</span>
                <strong className="text-white block truncate">
                  {selectedLog.user_name || selectedLog.audience_name || "N/A"}
                </strong>
                <span className="text-zinc-400 text-[11px] block truncate">
                  {selectedLog.user_email || (selectedLog.recipients_count ? `${selectedLog.recipients_count} users` : "N/A")}
                </span>
              </div>

              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Delivery Channels</span>
                <strong className="text-white block uppercase">{selectedLog.channel || "both"}</strong>
                <span className="text-[11px] text-zinc-400">
                  Push status: {selectedLog.push_status || "N/A"}
                </span>
              </div>

              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Category Type</span>
                <strong className="text-white block capitalize">{selectedLog.type || "general"}</strong>
                <span className="text-zinc-400 text-[11px]">
                  Mode: {selectedLog.mode}
                </span>
              </div>

              <div className="p-3 bg-zinc-950/50 border border-zinc-800 rounded-lg space-y-1">
                <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Dispatched By</span>
                <strong className="text-white block truncate">{selectedLog.sender_admin || "System"}</strong>
                <span className="text-zinc-400 text-[11px] block">
                  {dayjs(selectedLog.created_at).format("MMM D, YYYY HH:mm:ss")}
                </span>
              </div>
            </div>

            {/* Error or Reason If Present */}
            {selectedLog.reason && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl space-y-1">
                <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" /> Exception / Status Reason
                </span>
                <p className="text-xs text-rose-200/90">{selectedLog.reason}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close Audit Viewer
              </EasyXButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
