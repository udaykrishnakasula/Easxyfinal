import React from "react";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  X,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { money } from "@/user/api";

const DEFAULT_COLOR_MAP = {
  pending: {
    tabActive: "bg-amber-500 text-black shadow-md shadow-amber-950/40",
    tabInactive: "text-amber-300/80 hover:text-amber-200 hover:bg-amber-500/10",
    badgeActive: "bg-black/30 text-black font-extrabold",
    badgeInactive: "bg-amber-500/20 text-amber-300 border border-amber-500/30",
    cardBorder: "border-amber-500/30 hover:border-amber-500/50",
    cardActive: "ring-2 ring-amber-500/50 bg-amber-950/20",
    cardBg: "bg-amber-500/5",
    iconBg: "bg-amber-500/15 text-amber-400 border border-amber-500/25",
    dot: "bg-amber-400",
  },
  approved: {
    tabActive: "bg-emerald-600 text-white shadow-md shadow-emerald-950/40",
    tabInactive: "text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-500/10",
    badgeActive: "bg-emerald-950/40 text-white font-extrabold",
    badgeInactive: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
    cardBorder: "border-emerald-500/30 hover:border-emerald-500/50",
    cardActive: "ring-2 ring-emerald-500/50 bg-emerald-950/20",
    cardBg: "bg-emerald-500/5",
    iconBg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    dot: "bg-emerald-400",
  },
  rejected: {
    tabActive: "bg-rose-600 text-white shadow-md shadow-rose-950/40",
    tabInactive: "text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10",
    badgeActive: "bg-rose-950/40 text-white font-extrabold",
    badgeInactive: "bg-rose-500/20 text-rose-300 border border-rose-500/30",
    cardBorder: "border-rose-500/30 hover:border-rose-500/50",
    cardActive: "ring-2 ring-rose-500/50 bg-rose-950/20",
    cardBg: "bg-rose-500/5",
    iconBg: "bg-rose-500/15 text-rose-400 border border-rose-500/25",
    dot: "bg-rose-400",
  },
  all: {
    tabActive: "bg-purple-600 text-white shadow-md shadow-purple-950/40",
    tabInactive: "text-ex-muted hover:text-white hover:bg-white/10",
    badgeActive: "bg-purple-950/40 text-white font-extrabold",
    badgeInactive: "bg-white/10 text-ex-lav-200 border border-white/15",
    cardBorder: "border-white/10 hover:border-white/20",
    cardActive: "ring-2 ring-purple-500/50 bg-purple-950/20",
    cardBg: "bg-white/[0.02]",
    iconBg: "bg-purple-500/15 text-purple-400 border border-purple-500/25",
    dot: "bg-purple-400",
  },
};

export default function AdminStatusTabs({
  activeTab = "pending",
  onTabChange,
  counts = {},
  amounts = {},
  showCards = true,
  cardType = "deposits", // 'deposits' | 'kyc'
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search by user name or email address...",
  filteredCount = null,
  onExportCsv = null,
  exportLabel = "Export CSV",
  exportDisabled = false,
  extraControls = null,
  tabs = [
    { key: "pending", label: "Pending Review", icon: Clock, color: "pending" },
    { key: "approved", label: "Approved", icon: CheckCircle2, color: "approved" },
    { key: "rejected", label: "Rejected", icon: XCircle, color: "rejected" },
    { key: "all", label: "All Records", icon: Layers, color: "all" },
  ],
}) {
  const pendingCount = counts.pending ?? 0;
  const approvedCount = counts.approved ?? 0;
  const rejectedCount = counts.rejected ?? 0;
  const totalCount = counts.all ?? (pendingCount + approvedCount + rejectedCount);

  return (
    <div className="space-y-4" data-testid="admin-status-tabs-container">
      {/* Optional Interactive Summary KPI Cards */}
      {showCards && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Pending Review Card */}
          <div
            onClick={() => onTabChange("pending")}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent ${
              activeTab === "pending"
                ? "ring-2 ring-amber-400/80 border-amber-400/80 shadow-lg shadow-amber-950/30 scale-[1.01]"
                : "border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
            }`}
            data-testid="status-kpi-pending"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                <span className="h-2 w-2 rounded-full bg-amber-400 absolute" />
                <span className="ml-1">Pending Review</span>
              </span>
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Clock className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {pendingCount}
              </div>
              {amounts.pending !== undefined && (
                <div className="text-xs font-mono font-bold text-amber-300">
                  {money(amounts.pending)} USDT
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-amber-200/60 truncate">
              {cardType === "deposits"
                ? "Awaiting blockchain confirmation"
                : "Pending identity inspection"}
            </p>
          </div>

          {/* 2. Approved Card */}
          <div
            onClick={() => onTabChange("approved")}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent ${
              activeTab === "approved"
                ? "ring-2 ring-emerald-400/80 border-emerald-400/80 shadow-lg shadow-emerald-950/30 scale-[1.01]"
                : "border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/10"
            }`}
            data-testid="status-kpi-approved"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/90 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Approved</span>
              </span>
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {approvedCount}
              </div>
              {amounts.approved !== undefined && (
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {money(amounts.approved)} USDT
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-emerald-200/60 truncate">
              {cardType === "deposits"
                ? "Credited to investor wallets"
                : "Verified & approved accounts"}
            </p>
          </div>

          {/* 3. Rejected Card */}
          <div
            onClick={() => onTabChange("rejected")}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent ${
              activeTab === "rejected"
                ? "ring-2 ring-rose-400/80 border-rose-400/80 shadow-lg shadow-rose-950/30 scale-[1.01]"
                : "border-rose-500/20 hover:border-rose-500/40 hover:bg-rose-500/10"
            }`}
            data-testid="status-kpi-rejected"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300/90 flex items-center gap-1.5">
                <XCircle className="h-3.5 w-3.5 text-rose-400" />
                <span>Rejected</span>
              </span>
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                <AlertCircle className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {rejectedCount}
              </div>
              {amounts.rejected !== undefined && (
                <div className="text-xs font-mono font-bold text-rose-300">
                  {money(amounts.rejected)} USDT
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-rose-200/60 truncate">
              {cardType === "deposits"
                ? "Declined with feedback reasons"
                : "Declined document submissions"}
            </p>
          </div>

          {/* 4. Total Records Card */}
          <div
            onClick={() => onTabChange("all")}
            className={`cursor-pointer rounded-2xl p-4 transition-all duration-200 border bg-gradient-to-br from-purple-500/10 via-white/[0.02] to-transparent ${
              activeTab === "all"
                ? "ring-2 ring-purple-400/80 border-purple-400/80 shadow-lg shadow-purple-950/30 scale-[1.01]"
                : "border-white/10 hover:border-white/20 hover:bg-white/5"
            }`}
            data-testid="status-kpi-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-ex-lav-200 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-purple-400" />
                <span>Total Submissions</span>
              </span>
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-ex-lav-300 border border-white/15">
                <TrendingUp className="h-3.5 w-3.5" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="text-2xl font-extrabold text-white tracking-tight">
                {totalCount}
              </div>
              {amounts.total !== undefined && (
                <div className="text-xs font-mono font-bold text-ex-lav-300">
                  {money(amounts.total)} USDT
                </div>
              )}
            </div>
            <p className="mt-1 text-[11px] text-ex-muted/70 truncate">
              Complete historical record stream
            </p>
          </div>
        </div>
      )}

      {/* Main Segmented Status Tabs & Search Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-1.5 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-md">
        {/* Status Tabs Navigation */}
        <div className="flex flex-wrap items-center gap-1.5" data-testid="status-navigation-tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key;
            const style = DEFAULT_COLOR_MAP[tab.color || "all"] || DEFAULT_COLOR_MAP.all;
            const Icon = tab.icon || Layers;
            const count =
              tab.key === "pending"
                ? pendingCount
                : tab.key === "approved"
                ? approvedCount
                : tab.key === "rejected"
                ? rejectedCount
                : totalCount;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onTabChange(tab.key)}
                data-testid={`admin-status-tab-${tab.key}`}
                className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer select-none ${
                  isActive ? style.tabActive : style.tabInactive
                }`}
              >
                {/* Active Indicator or Icon */}
                {tab.key === "pending" && (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  </span>
                )}
                {tab.key !== "pending" && <Icon className="h-3.5 w-3.5" />}

                <span>{tab.label}</span>

                {/* Counter Badge */}
                <span
                  className={`ml-0.5 px-2 py-0.5 rounded-full text-[11px] font-mono transition ${
                    isActive ? style.badgeActive : style.badgeInactive
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Action Controls */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
          {onSearchChange && (
            <div className="relative flex-1 sm:w-72 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ex-lav-300/70" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onSearchChange("");
                }}
                className="w-full pl-8 pr-7 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-ex-text placeholder:text-ex-muted/60 focus:border-purple-400 focus:bg-white/[0.08] focus:outline-none transition shadow-inner"
                data-testid="admin-search-input"
              />
              {searchValue && (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ex-muted hover:text-white rounded transition"
                  title="Clear search (ESC)"
                  data-testid="clear-search-btn"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )}

          {onExportCsv && (
            <button
              type="button"
              onClick={onExportCsv}
              disabled={exportDisabled}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border transition ${
                exportDisabled
                  ? "bg-white/5 text-ex-muted/40 border-white/5 cursor-not-allowed"
                  : "bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 hover:text-white border-purple-500/30 shadow-sm cursor-pointer"
              }`}
              title="Download currently filtered records as CSV spreadsheet"
              data-testid="btn-export-csv"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{exportLabel}</span>
            </button>
          )}

          {extraControls}
        </div>
      </div>

      {/* Active Search Filter Sub-Banner */}
      {searchValue && (
        <div
          className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 backdrop-blur-sm animate-in fade-in duration-200"
          data-testid="active-search-indicator"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-purple-400 flex-shrink-0" />
            <span className="truncate">
              Filtering by: <strong className="text-white font-mono">"{searchValue}"</strong>
              {filteredCount !== null && (
                <span className="ml-1.5 text-ex-muted">
                  ({filteredCount} {filteredCount === 1 ? "record" : "records"} matched)
                </span>
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onSearchChange("")}
            className="text-[11px] font-bold text-purple-300 hover:text-white underline underline-offset-2 flex-shrink-0"
          >
            Clear Filter
          </button>
        </div>
      )}
    </div>
  );
}
