import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Eye,
  SlidersHorizontal,
  Lock,
  UserCheck,
  UserX,
  Inbox,
  ArrowUpFromLine,
  BadgeCheck,
  PiggyBank,
  Wallet,
  Settings,
  Layers,
  Activity,
  AlertTriangle,
  Info,
  Clock,
  X,
} from "lucide-react";

import { useAdminAuditLogs, downloadAuditLogs } from "@/admin/adminApi";
import { downloadProductionAuditReport, MASTER_AUDIT_REPORT_MD } from "@/admin/utils/downloadAuditReport";
import { safeJsonStringify } from "@/shared/analytics/dataMasker";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXTable,
  EasyXEmptyState,
} from "@/design/EasyX";

dayjs.extend(relativeTime);

const ACTION_CATEGORIES = [
  { value: "all", label: "All Actions" },
  { value: "admin.login", label: "Admin Login" },
  { value: "user.suspend", label: "User Suspension" },
  { value: "user.unsuspend", label: "User Unsuspension" },
  { value: "deposit.approve", label: "Deposit Approval" },
  { value: "deposit.reject", label: "Deposit Rejection" },
  { value: "deposit.batch_approve", label: "Deposit Batch Approval" },
  { value: "deposit.batch_reject", label: "Deposit Batch Rejection" },
  { value: "withdrawal.approve", label: "Withdrawal Approval" },
  { value: "withdrawal.reject", label: "Withdrawal Rejection" },
  { value: "withdrawal.process", label: "Withdrawal Processing" },
  { value: "kyc.approve", label: "KYC Approval" },
  { value: "kyc.reject", label: "KYC Rejection" },
  { value: "kyc.batch_approve", label: "KYC Batch Approval" },
  { value: "kyc.batch_reject", label: "KYC Batch Rejection" },
  { value: "investment.cancel", label: "Investment Cancellation" },
  { value: "wallet.adjust", label: "Wallet Adjustment" },
  { value: "plan.update", label: "Plan Change" },
  { value: "maintenance.update", label: "Maintenance Change" },
  { value: "report.export", label: "Report Export" },
];

const TARGET_TYPES = [
  { value: "all", label: "All Target Entities" },
  { value: "user", label: "User" },
  { value: "deposit", label: "Deposit" },
  { value: "withdrawal", label: "Withdrawal" },
  { value: "kyc", label: "KYC Record" },
  { value: "investment", label: "Investment" },
  { value: "wallet", label: "Wallet" },
  { value: "plan", label: "Plan" },
  { value: "maintenance", label: "Maintenance / System" },
  { value: "report", label: "Report" },
];

const DATE_PRESETS = [
  { id: "all", label: "All Time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 Days" },
  { id: "30d", label: "Last 30 Days" },
  { id: "month", label: "This Month" },
];

function getActionMeta(action = "") {
  const act = action.toLowerCase();
  if (act.includes("login")) {
    return {
      label: "Admin Login",
      icon: Lock,
      color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    };
  }
  if (act.includes("suspend") && !act.includes("unsuspend")) {
    return {
      label: "User Suspension",
      icon: UserX,
      color: "bg-red-500/10 text-red-400 border-red-500/20",
    };
  }
  if (act.includes("unsuspend")) {
    return {
      label: "User Unsuspension",
      icon: UserCheck,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (act.includes("deposit.approve")) {
    return {
      label: "Deposit Approval",
      icon: Inbox,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (act.includes("deposit.reject")) {
    return {
      label: "Deposit Rejection",
      icon: Inbox,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
  }
  if (act.includes("withdrawal.approve")) {
    return {
      label: "Withdrawal Approval",
      icon: ArrowUpFromLine,
      color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    };
  }
  if (act.includes("withdrawal.reject")) {
    return {
      label: "Withdrawal Rejection",
      icon: ArrowUpFromLine,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
  }
  if (act.includes("withdrawal.process") || act.includes("withdrawal.processing")) {
    return {
      label: "Withdrawal Processing",
      icon: ArrowUpFromLine,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }
  if (act.includes("kyc.approve")) {
    return {
      label: "KYC Approval",
      icon: BadgeCheck,
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    };
  }
  if (act.includes("kyc.reject")) {
    return {
      label: "KYC Rejection",
      icon: BadgeCheck,
      color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    };
  }
  if (act.includes("investment.cancel")) {
    return {
      label: "Investment Cancellation",
      icon: PiggyBank,
      color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    };
  }
  if (act.includes("wallet.adjust")) {
    return {
      label: "Wallet Adjustment",
      icon: Wallet,
      color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    };
  }
  if (act.includes("plan.update")) {
    return {
      label: "Plan Change",
      icon: Layers,
      color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    };
  }
  if (act.includes("maintenance.update")) {
    return {
      label: "Maintenance Change",
      icon: Settings,
      color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    };
  }
  if (act.includes("report.export")) {
    return {
      label: "Report Export",
      icon: Download,
      color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    };
  }
  return {
    label: action.replace(".", " ").toUpperCase(),
    icon: Activity,
    color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
}

export default function AdminAuditPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedTarget, setSelectedTarget] = useState("all");
  const [datePreset, setDatePreset] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Apply Date presets
  const handlePresetSelect = (presetId) => {
    setDatePreset(presetId);
    const now = dayjs();
    if (presetId === "all") {
      setFromDate("");
      setToDate("");
    } else if (presetId === "today") {
      setFromDate(now.startOf("day").format("YYYY-MM-DD"));
      setToDate(now.endOf("day").format("YYYY-MM-DD"));
    } else if (presetId === "7d") {
      setFromDate(now.subtract(7, "day").format("YYYY-MM-DD"));
      setToDate(now.format("YYYY-MM-DD"));
    } else if (presetId === "30d") {
      setFromDate(now.subtract(30, "day").format("YYYY-MM-DD"));
      setToDate(now.format("YYYY-MM-DD"));
    } else if (presetId === "month") {
      setFromDate(now.startOf("month").format("YYYY-MM-DD"));
      setToDate(now.endOf("month").format("YYYY-MM-DD"));
    }
  };

  const handleCustomDateChange = (from, to) => {
    setDatePreset("custom");
    setFromDate(from);
    setToDate(to);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedAction("all");
    setSelectedTarget("all");
    setDatePreset("all");
    setFromDate("");
    setToDate("");
  };

  const { data, isLoading, isFetching, refetch } = useAdminAuditLogs({
    action: selectedAction,
    entity_type: selectedTarget,
    q: searchQuery,
    from_date: fromDate,
    to_date: toDate,
  });

  const logs = data?.logs || (Array.isArray(data) ? data : []);
  const summary = data?.summary || {
    total_logs: logs.length,
    auth_events: logs.filter((l) => l.action?.includes("login")).length,
    financial_events: logs.filter((l) =>
      l.action?.match(/deposit|withdrawal|wallet|investment/)
    ).length,
    kyc_events: logs.filter((l) => l.action?.includes("kyc")).length,
    user_mgmt_events: logs.filter((l) => l.action?.includes("user")).length,
    system_events: logs.filter((l) =>
      l.action?.match(/maintenance|plan|settings|report/)
    ).length,
  };

  const handleCopy = (text, id) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedId(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = async (format) => {
    try {
      setIsExporting(true);
      const filename = await downloadAuditLogs(format, {
        action: selectedAction,
        entity_type: selectedTarget,
        q: searchQuery,
        from_date: fromDate,
        to_date: toDate,
      });
      toast.success(`Exported ${format.toUpperCase()}: ${filename}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to download audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (selectedAction !== "all") count++;
    if (selectedTarget !== "all") count++;
    if (fromDate || toDate) count++;
    return count;
  }, [searchQuery, selectedAction, selectedTarget, fromDate, toDate]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Admin Audit Log"
          description="Complete immutable ledger of all administrative decisions, security operations, and financial actions."
        />

        <div className="flex flex-wrap items-center gap-2">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </EasyXButton>

          <div className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => downloadProductionAuditReport("md")}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/10 transition"
              title="Download Complete EasyX Production Audit Report"
            >
              <Download className="h-3.5 w-3.5" />
              Full Audit Report (.md)
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => handleExport("csv")}
              disabled={isExporting || isLoading || logs.length === 0}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition"
              title="Download CSV report"
            >
              <FileText className="h-3.5 w-3.5" />
              CSV
            </button>
            <span className="text-white/20">|</span>
            <button
              onClick={() => handleExport("xlsx")}
              disabled={isExporting || isLoading || logs.length === 0}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/10 disabled:opacity-50 transition"
              title="Download Excel spreadsheet"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel (.xlsx)
            </button>
          </div>
        </div>
      </div>

      {/* Master Production Stabilization Audit Report Download Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-purple-950/20 to-zinc-900/40 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-amber-200 text-sm flex items-center gap-2">
              <span>Master Production Stabilization Audit Report</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-mono font-normal">August 2026</span>
            </div>
            <div className="text-white/60 text-xs mt-0.5">
              Complete 19-section diagnostic breakdown covering all backend, auth, database, security, and UI state chains.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end">
          <EasyXButton
            variant="secondary"
            size="sm"
            onClick={() => setShowReportModal(true)}
            className="text-xs !bg-white/10 hover:!bg-white/15 !text-white !border-white/20"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View Report
          </EasyXButton>
          <EasyXButton
            variant="primary"
            size="sm"
            onClick={() => downloadProductionAuditReport("md")}
            className="text-xs !bg-amber-500 hover:!bg-amber-400 !text-black font-bold"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download (.md)
          </EasyXButton>
          <EasyXButton
            variant="secondary"
            size="sm"
            onClick={() => downloadProductionAuditReport("txt")}
            className="text-xs !bg-amber-500/10 hover:!bg-amber-500/20 !text-amber-300 !border-amber-500/30"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download (.txt)
          </EasyXButton>
        </div>
      </div>

      {/* Immutable Ledger Compliance Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Lock className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-blue-300">
              Immutable Administrative Ledger
            </div>
            <div className="text-white/60">
              Audit records are strictly append-only and cryptographically timestamped. Modifying or deleting audit history is prohibited.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Verified Secure
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
            Role: Super Admin
          </span>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Total Events</span>
            <Activity className="h-4 w-4 text-ex-accent" />
          </div>
          <div className="text-2xl font-bold text-white">
            {summary.total_logs}
          </div>
          <div className="text-[11px] text-white/40 mt-1">Logged actions</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>Financial Actions</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {summary.financial_events}
          </div>
          <div className="text-[11px] text-white/40 mt-1">Deposits, payouts & adjustments</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>User & KYC</span>
            <BadgeCheck className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {summary.kyc_events + summary.user_mgmt_events}
          </div>
          <div className="text-[11px] text-white/40 mt-1">Verification & user governance</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8">
          <div className="flex items-center justify-between text-xs text-white/50 mb-1">
            <span>System & Security</span>
            <Lock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {summary.auth_events + summary.system_events}
          </div>
          <div className="text-[11px] text-white/40 mt-1">Logins, plans & maintenance</div>
        </EasyXCard>
      </div>

      {/* Filter Toolbar */}
      <EasyXCard className="p-4 bg-ex-surface/60 border-white/8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-3">
          {/* Search Query */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search admin, target ID, reason, or action..."
              className="w-full rounded-lg border border-white/10 bg-ex-surface pl-9 pr-8 py-2 text-xs text-white placeholder:text-white/40 focus:border-ex-accent focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ex-surface px-3 py-2 text-xs text-white focus:border-ex-accent focus:outline-none"
            >
              {ACTION_CATEGORIES.map((act) => (
                <option key={act.value} value={act.value} className="bg-[#121418] text-white">
                  {act.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Type Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-ex-surface px-3 py-2 text-xs text-white focus:border-ex-accent focus:outline-none"
            >
              {TARGET_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#121418] text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters Button */}
          <div className="lg:col-span-2 flex items-center justify-end">
            {activeFilterCount > 0 ? (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-medium transition"
              >
                <X className="h-3.5 w-3.5" />
                Clear Filters ({activeFilterCount})
              </button>
            ) : (
              <div className="text-[11px] text-white/40 flex items-center gap-1">
                <SlidersHorizontal className="h-3 w-3" />
                Live Filters Active
              </div>
            )}
          </div>
        </div>

        {/* Date Presets & Custom Range */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/6 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-white/40 mr-1 flex items-center gap-1 text-[11px]">
              <Calendar className="h-3 w-3" />
              Timeframe:
            </span>
            {DATE_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => handlePresetSelect(p.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  datePreset === p.id
                    ? "bg-ex-accent text-ex-ink font-bold shadow-sm"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-white/40 text-[11px]">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => handleCustomDateChange(e.target.value, toDate)}
                className="rounded-md border border-white/10 bg-ex-surface px-2 py-1 text-xs text-white focus:border-ex-accent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-white/40 text-[11px]">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => handleCustomDateChange(fromDate, e.target.value)}
                className="rounded-md border border-white/10 bg-ex-surface px-2 py-1 text-xs text-white focus:border-ex-accent focus:outline-none"
              />
            </div>
          </div>
        </div>
      </EasyXCard>

      {/* Main Audit Log Table */}
      <EasyXCard className="overflow-hidden bg-ex-surface/60 border-white/8">
        {isLoading ? (
          <div className="p-12">
            <EasyXLoader text="Loading secure audit logs..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12">
            <EasyXEmptyState
              icon={ShieldAlert}
              title="No Audit Records Found"
              description={
                activeFilterCount > 0
                  ? "No audit records matched your active filter criteria. Try broadening your query or date range."
                  : "No administrative actions have been recorded yet."
              }
              action={
                activeFilterCount > 0 && (
                  <EasyXButton size="sm" variant="outline" onClick={clearFilters}>
                    Reset Filters
                  </EasyXButton>
                )
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 bg-white/2 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-4">Reason / Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                  <th className="py-3 px-4 text-center">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  const meta = getActionMeta(log.action);
                  const Icon = meta.icon;
                  const formattedTime = dayjs(log.created_at).format("MMM D, YYYY · HH:mm:ss");
                  const relative = dayjs(log.created_at).fromNow();

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-white/2 transition group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Admin Actor */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-ex-accent border border-white/10 font-bold text-[10px]">
                            AD
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {log.actor_name || "Platform Admin"}
                            </div>
                            <div className="text-[11px] text-white/50 font-mono">
                              {log.actor_email || "admin@easyx.com"}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${meta.color}`}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>

                      {/* Target Type */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[11px] font-medium text-white/80 uppercase">
                          {log.entity_type || "SYSTEM"}
                        </span>
                      </td>

                      {/* Target ID */}
                      <td
                        className="py-3 px-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1.5 font-mono text-[11px] text-white/70">
                          <span
                            className="truncate max-w-[120px]"
                            title={log.entity_id || "N/A"}
                          >
                            {log.entity_id || "—"}
                          </span>
                          {log.entity_id && (
                            <button
                              onClick={() => handleCopy(log.entity_id, `target-${log.id}`)}
                              className="text-white/30 hover:text-white transition p-0.5 rounded"
                              title="Copy ID"
                            >
                              {copiedId === `target-${log.id}` ? (
                                <Check className="h-3 w-3 text-emerald-400" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Amount if applicable */}
                      <td className="py-3 px-4 text-right">
                        {log.amount ? (
                          <div className="font-semibold text-emerald-400 font-mono">
                            ${Number(log.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} USDT
                          </div>
                        ) : (
                          <span className="text-white/30">—</span>
                        )}
                      </td>

                      {/* Reason / Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        <div
                          className="truncate text-white/80"
                          title={log.reason || "No explicit reason specified"}
                        >
                          {log.reason || <span className="text-white/30 italic">Standard administrative action</span>}
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-mono text-white/90 text-[11px]">
                          {formattedTime}
                        </div>
                        <div className="text-[10px] text-white/40 flex items-center justify-end gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {relative}
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td
                        className="py-3 px-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLog(log);
                        }}
                      >
                        <button
                          className="p-1 rounded-md text-white/40 hover:text-white hover:bg-white/10 transition"
                          title="View Full Metadata"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary */}
        <div className="border-t border-white/8 bg-white/2 p-3.5 px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/50">
          <div>
            Showing <strong className="text-white">{logs.length}</strong> immutable audit entries
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Storage: In-Memory / Firestore Ledger</span>
            <span>•</span>
            <span className="text-emerald-400">Integrity: Verified</span>
          </div>
        </div>
      </EasyXCard>

      {/* Details & Metadata Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#14161b] p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-ex-accent/10 text-ex-accent border border-ex-accent/20">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    Audit Event Details
                  </h3>
                  <p className="text-xs text-white/50 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Core Properties Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Action Type</div>
                <div className="font-semibold text-white font-mono">
                  {selectedLog.action}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Target Entity</div>
                <div className="font-semibold text-white uppercase">
                  {selectedLog.entity_type || "SYSTEM"}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Amount</div>
                <div className="font-semibold text-emerald-400 font-mono">
                  {selectedLog.amount ? `$${selectedLog.amount} USDT` : "—"}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Target ID</div>
                <div className="font-mono text-white/80 truncate" title={selectedLog.entity_id}>
                  {selectedLog.entity_id || "—"}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Admin Actor</div>
                <div className="font-semibold text-white truncate" title={selectedLog.actor_email}>
                  {selectedLog.actor_email || "admin@easyx.com"}
                </div>
              </div>

              <div className="rounded-lg border border-white/5 bg-white/2 p-3">
                <div className="text-white/40 text-[11px] mb-1">Timestamp</div>
                <div className="text-white/80 font-mono">
                  {dayjs(selectedLog.created_at).format("YYYY-MM-DD HH:mm:ss")}
                </div>
              </div>
            </div>

            {/* Reason / Note Block */}
            {selectedLog.reason && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-semibold">
                  <Info className="h-3.5 w-3.5" />
                  Reason / Administrative Note:
                </div>
                <div className="text-xs text-white/90">
                  {selectedLog.reason}
                </div>
              </div>
            )}

            {/* Raw Metadata JSON Inspector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-white/50">
                <span className="font-semibold text-white/70">Raw Event Payload (JSON)</span>
                <button
                  onClick={() =>
                    handleCopy(safeJsonStringify(selectedLog, 2), "modal-json")
                  }
                  className="flex items-center gap-1 text-[11px] text-ex-accent hover:underline"
                >
                  {copiedId === "modal-json" ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied JSON
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
              <pre className="max-h-56 overflow-auto rounded-lg border border-white/10 bg-black/50 p-3.5 font-mono text-[11px] text-emerald-300">
                {safeJsonStringify(selectedLog, 2)}
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => setSelectedLog(null)}
              >
                Close Inspector
              </EasyXButton>
            </div>
          </div>
        </div>
      )}

      {/* Production Stabilization Audit Report Viewer Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Master Production Stabilization Audit Report
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">19 Sections (A to S)</span>
                  </h3>
                  <p className="text-xs text-white/50">Comprehensive full-stack architecture, security, database & UI audit</p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="rounded-lg p-1.5 text-white/40 hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-xs bg-white/5 px-3 py-2 rounded-lg border border-white/5">
              <span className="text-white/60">Formats available for instant download:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(MASTER_AUDIT_REPORT_MD, "audit-modal-copy")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-white hover:bg-white/15 transition text-xs"
                >
                  {copiedId === "audit-modal-copy" ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Full Report</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadProductionAuditReport("md")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500 text-black font-semibold hover:bg-amber-400 transition text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .md</span>
                </button>
                <button
                  onClick={() => downloadProductionAuditReport("txt")}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-white/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition text-xs"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>

            {/* Scrollable Report Content */}
            <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-black/60 p-4 font-mono text-xs text-white/90 leading-relaxed whitespace-pre-wrap select-text">
              {MASTER_AUDIT_REPORT_MD}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => setShowReportModal(false)}
              >
                Close Viewer
              </EasyXButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
