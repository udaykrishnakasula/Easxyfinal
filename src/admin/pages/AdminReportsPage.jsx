import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  FileSpreadsheet,
  FileText,
  Download,
  ScrollText,
  Search,
  Filter,
  Calendar,
  RefreshCw,
  Users,
  Inbox,
  PiggyBank,
  CheckCircle2,
  ArrowUpFromLine,
  Share2,
  Wallet,
  BadgeCheck,
  XCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
} from "lucide-react";

import {
  useAdminReportData,
  downloadReport,
  useAdminAuditLogs,
} from "@/admin/adminApi";
import {
  downloadProductionAuditReport,
  downloadAdminUxAuditReport,
} from "@/admin/utils/downloadAuditReport";
import AdminGrowthDashboard from "@/admin/components/AdminGrowthDashboard";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXTable,
  EasyXEmptyState,
  EasyXStatusBadge,
} from "@/design/EasyX";

const REPORT_TABS = [
  { id: "users", label: "Users", icon: Users, desc: "Investor accounts, roles, KYC status & balances" },
  { id: "deposits", label: "Deposits", icon: Inbox, desc: "Crypto deposit transactions & approvals" },
  { id: "investments", label: "Investments", icon: PiggyBank, desc: "Active & completed investment plans" },
  { id: "maturities", label: "Maturities", icon: CheckCircle2, desc: "Matured packages & payout releases" },
  { id: "withdrawals", label: "Withdrawals", icon: ArrowUpFromLine, desc: "Withdrawal requests & blockchain status" },
  { id: "referral_commissions", label: "Referrals", icon: Share2, desc: "Affiliate commissions & bonus payouts" },
  { id: "wallet_transactions", label: "Wallet Ledger", icon: Wallet, desc: "Double-entry ledger & admin adjustments" },
  { id: "kyc", label: "KYC", icon: BadgeCheck, desc: "Identity verifications & document status" },
];

const STATUS_OPTIONS = {
  users: [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "suspended", label: "Suspended" },
    { value: "approved", label: "KYC Approved" },
    { value: "pending", label: "KYC Pending" },
  ],
  deposits: [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ],
  investments: [
    { value: "all", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "matured", label: "Matured" },
    { value: "cancelled", label: "Cancelled" },
  ],
  maturities: [
    { value: "all", label: "All Maturities" },
  ],
  withdrawals: [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending Review" },
    { value: "processing", label: "Processing" },
    { value: "completed", label: "Completed" },
    { value: "rejected", label: "Rejected" },
  ],
  referral_commissions: [
    { value: "all", label: "All Statuses" },
    { value: "credited", label: "Credited" },
    { value: "pending", label: "Pending" },
    { value: "paid", label: "Paid" },
  ],
  wallet_transactions: [
    { value: "all", label: "All Types / Directions" },
    { value: "credit", label: "Credits" },
    { value: "debit", label: "Debits" },
    { value: "admin_adjustment", label: "Admin Adjustments" },
    { value: "deposit", label: "Deposits" },
    { value: "investment_payout", label: "Payouts" },
    { value: "withdrawal_lock", label: "Withdrawals" },
    { value: "referral_commission", label: "Commissions" },
  ],
  kyc: [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ],
};

const ACTION_LABELS = {
  "admin.login": "Admin login",
  "user.suspend": "User suspended",
  "user.unsuspend": "User unsuspended",
  "deposit.approve": "Deposit approved",
  "deposit.reject": "Deposit rejected",
  "kyc.approve": "KYC approved",
  "kyc.reject": "KYC rejected",
  "withdrawal.approve": "Withdrawal approved",
  "withdrawal.reject": "Withdrawal rejected",
  "withdrawal.process": "Withdrawal processed",
  "investment.cancel": "Investment cancelled / refunded",
  "wallet.adjust": "Wallet adjustment",
  "plan.update": "Plan changed",
  "maintenance.update": "Maintenance changed",
  "report.export": "Report exported",
};

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function metaSummary(meta) {
  if (!meta || typeof meta !== "object") return "";
  const parts = [];
  if (meta.amount != null) parts.push(`amount: $${meta.amount}`);
  if (meta.approved_amount != null) parts.push(`approved: $${meta.approved_amount}`);
  if (meta.direction) parts.push(meta.direction);
  if (meta.reason) parts.push(`reason: ${meta.reason}`);
  if (meta.format) parts.push(`format: ${meta.format.toUpperCase()} (${meta.row_count ?? 0} rows)`);
  if (meta.tx_hash) parts.push(`tx: ${String(meta.tx_hash).slice(0, 12)}…`);
  return parts.join(" · ");
}

export default function AdminReportsPage() {
  const [activeTab, setActiveTab] = useState("users");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exportingFormat, setExportingFormat] = useState(null); // "csv" | "xlsx" | null
  const [showAuditLogs, setShowAuditLogs] = useState(false);
  const [showGrowthCharts, setShowGrowthCharts] = useState(false);
  const [auditActionFilter, setAuditActionFilter] = useState("");

  // Query Real Backend Data
  const { data: reportResult, isLoading, refetch } = useAdminReportData({
    dataset: activeTab,
    q,
    status: statusFilter === "all" ? "" : statusFilter,
    from_date: fromDate,
    to_date: toDate,
  });

  const { data: auditData, isLoading: loadingLogs } = useAdminAuditLogs({
    action: auditActionFilter || undefined,
  });

  const logs = auditData?.logs || (Array.isArray(auditData) ? auditData : []);

  const rows = reportResult?.rows || [];
  const summary = reportResult?.summary || {};

  const handleTabChange = (newTab) => {
    setActiveTab(newTab);
    setStatusFilter("all");
  };

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    setQ(search.trim());
  };

  const handlePresetDate = (preset) => {
    const today = dayjs().format("YYYY-MM-DD");
    if (preset === "all") {
      setFromDate("");
      setToDate("");
    } else if (preset === "today") {
      setFromDate(today);
      setToDate(today);
    } else if (preset === "7days") {
      setFromDate(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
      setToDate(today);
    } else if (preset === "30days") {
      setFromDate(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
      setToDate(today);
    } else if (preset === "this_month") {
      setFromDate(dayjs().startOf("month").format("YYYY-MM-DD"));
      setToDate(today);
    }
  };

  const handleExport = async (format) => {
    if (exportingFormat) return;
    setExportingFormat(format);
    try {
      const fileName = await downloadReport(activeTab, format, {
        q,
        status: statusFilter,
        from_date: fromDate,
        to_date: toDate,
      });
      toast.success(`Successfully exported ${fileName}`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to export ${format.toUpperCase()} report`);
    } finally {
      setExportingFormat(null);
    }
  };

  // Dynamic Table Columns per active dataset
  const tableColumns = useMemo(() => {
    switch (activeTab) {
      case "users":
        return ["ID / Code", "Investor Name", "Email / Phone", "Role", "Status", "KYC", "Balance", "Joined At"];
      case "deposits":
        return ["Deposit ID", "Investor", "Network", "Amount (USDT)", "Approved", "Status", "TX Hash", "Submitted"];
      case "investments":
        return ["ID / Plan", "Investor", "Principal", "Est. Profit", "Maturity Total", "Status", "Created At", "Maturity Date"];
      case "maturities":
        return ["ID / Plan", "Investor", "Principal Repaid", "Profit Paid", "Total Payout", "Status", "Started", "Matured At"];
      case "withdrawals":
        return ["ID / Destination", "Investor", "Network", "Amount", "Fee", "Status", "TX Hash", "Requested"];
      case "referral_commissions":
        return ["ID / Plan", "Referrer (Earner)", "Referee (Investor)", "Commission", "Status", "Earned At"];
      case "wallet_transactions":
        return ["Tx ID / Type", "Investor", "Direction", "Amount", "Balance After", "Status / Note", "Recorded At"];
      case "kyc":
        return ["ID / Doc Type", "Investor", "Country", "ID Number", "Status", "Rejection Reason", "Submitted At"];
      default:
        return [];
    }
  }, [activeTab]);

  return (
    <div className="space-y-6" data-testid="admin-reports-page">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Reports & Analytics"
          subtitle="Generate, filter, and export administrative financial, user, and audit reports with real backend data."
          icon={Download}
        />

        {/* Global Export Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <EasyXButton
            variant={showGrowthCharts ? "primary" : "secondary"}
            onClick={() => setShowGrowthCharts(!showGrowthCharts)}
            data-testid="btn-toggle-growth-charts"
            className="text-xs !bg-purple-600 hover:!bg-purple-500 text-white"
          >
            <TrendingUp className="h-4 w-4 mr-1.5" />
            {showGrowthCharts ? "Hide Visual Trends" : "Visual Growth Analytics"}
          </EasyXButton>

          <EasyXButton
            variant="secondary"
            onClick={() => downloadAdminUxAuditReport("md")}
            data-testid="btn-export-ux-audit-md"
            className="text-xs !bg-purple-500/15 !text-purple-300 !border-purple-500/30 hover:!bg-purple-500/25"
          >
            <ShieldCheck className="h-4 w-4 mr-1.5 text-purple-400" />
            UX Audit Report (.md)
          </EasyXButton>

          <EasyXButton
            variant="secondary"
            onClick={() => downloadProductionAuditReport("md")}
            data-testid="btn-export-audit-md"
            className="text-xs !bg-amber-500/10 !text-amber-300 !border-amber-500/30 hover:!bg-amber-500/20"
          >
            <Download className="h-4 w-4 mr-1.5 text-amber-400" />
            Full Audit Report (.md)
          </EasyXButton>

          <EasyXButton
            variant="secondary"
            onClick={() => handleExport("csv")}
            disabled={exportingFormat !== null}
            data-testid="btn-export-csv"
            className="text-xs"
          >
            <FileText className="h-4 w-4 mr-1.5 text-ex-lav-300" />
            {exportingFormat === "csv" ? "Exporting CSV…" : "Export CSV"}
          </EasyXButton>
          <EasyXButton
            onClick={() => handleExport("xlsx")}
            disabled={exportingFormat !== null}
            data-testid="btn-export-xlsx"
            className="text-xs !bg-emerald-500 !text-black font-bold hover:!bg-emerald-400"
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            {exportingFormat === "xlsx" ? "Exporting Excel…" : "Export Excel (.xlsx)"}
          </EasyXButton>
        </div>
      </div>

      {/* EXPANDABLE GROWTH VISUALIZER */}
      {showGrowthCharts && (
        <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-950/10 backdrop-blur-md">
          <AdminGrowthDashboard />
        </div>
      )}

      {/* Dataset Selection Tabs */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-thin">
        {REPORT_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 rounded-ex-card text-xs font-semibold whitespace-nowrap transition border ${
                isActive
                  ? "bg-ex-accent text-ex-ink border-ex-accent shadow-sm"
                  : "bg-white/5 text-ex-muted border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              data-testid={`report-tab-${tab.id}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary KPI Cards for Active Dataset */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">
            Total Records
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-total-records">
            {summary.total_records ?? rows.length}
          </div>
          <div className="text-[10px] text-ex-muted mt-0.5">Matching current filters</div>
        </EasyXCard>

        {activeTab === "users" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Active Users
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400">
                {summary.active_users ?? 0}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Suspended: {summary.suspended_users ?? 0}</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-lav-300 uppercase tracking-wider">
                KYC Approved
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-lav-300">
                {summary.kyc_approved ?? 0}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Verified identities</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-accent uppercase tracking-wider">
                Total Available Balances
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-accent font-mono">
                ${money(summary.total_available_balance)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">USDT in user wallets</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "deposits" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-accent uppercase tracking-wider">
                Total Deposit Volume
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-accent font-mono">
                ${money(summary.total_volume)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">All incoming deposits</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Approved Volume
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                ${money(summary.approved_volume)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Approved: {summary.approved_count ?? 0}</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                Pending Review
              </div>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {summary.pending_count ?? 0}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Rejected: {summary.rejected_count ?? 0}</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "investments" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-lav-300 uppercase tracking-wider">
                Total Principal Staked
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-lav-300 font-mono">
                ${money(summary.total_principal)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Invested capital</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Expected Payouts
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                ${money(summary.total_maturity_volume)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Principal + Profits</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-text uppercase tracking-wider">
                Plan Statuses
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-text">
                {summary.active_count ?? 0} <span className="text-xs text-ex-muted font-normal">Active</span>
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Matured: {summary.matured_count ?? 0}</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "maturities" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-lav-300 uppercase tracking-wider">
                Principal Repaid
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-lav-300 font-mono">
                ${money(summary.total_principal_repaid)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Returned to investors</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Total Profit Paid
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                +${money(summary.total_profit_paid)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Yield distributions</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-accent uppercase tracking-wider">
                Total Maturity Volume
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-accent font-mono">
                ${money(summary.total_payout_volume)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Completed cycles</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "withdrawals" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-rose-300 uppercase tracking-wider">
                Total Requested
              </div>
              <div className="mt-1.5 text-xl font-bold text-rose-300 font-mono">
                ${money(summary.total_volume)}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Withdrawal volume</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Completed Volume
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                ${money(summary.completed_volume)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Completed: {summary.completed_count ?? 0}</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                Pending / Processing
              </div>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {(summary.pending_count ?? 0) + (summary.processing_count ?? 0)}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Rejected: {summary.rejected_count ?? 0}</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "referral_commissions" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Total Commissions
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                ${money(summary.total_commissions_amount)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Affiliate bonuses</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-ex-lav-300 uppercase tracking-wider">
                Credited Payouts
              </div>
              <div className="mt-1.5 text-xl font-bold text-ex-lav-300">
                {summary.credited_count ?? 0}
              </div>
              <div className="text-[10px] text-ex-muted mt-0.5">Paid into wallets</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                Pending Payouts
              </div>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {summary.pending_count ?? 0}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Awaiting release</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "wallet_transactions" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Total Credited
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400 font-mono">
                +${money(summary.total_credited)}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Inflow to wallets</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-rose-300 uppercase tracking-wider">
                Total Debited
              </div>
              <div className="mt-1.5 text-xl font-bold text-rose-300 font-mono">
                -${money(summary.total_debited)}
              </div>
              <div className="text-[10px] text-rose-300/80 mt-0.5">Outflow / locks</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                Admin Adjustments
              </div>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {summary.adjustments_count ?? 0}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Manual ledger events</div>
            </EasyXCard>
          </>
        )}

        {activeTab === "kyc" && (
          <>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
                Approved KYC
              </div>
              <div className="mt-1.5 text-xl font-bold text-emerald-400">
                {summary.approved_count ?? 0}
              </div>
              <div className="text-[10px] text-emerald-400/80 mt-0.5">Passed verification</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
                Pending Submissions
              </div>
              <div className="mt-1.5 text-xl font-bold text-amber-300">
                {summary.pending_count ?? 0}
              </div>
              <div className="text-[10px] text-amber-300/80 mt-0.5">Awaiting manual check</div>
            </EasyXCard>
            <EasyXCard className="p-4">
              <div className="text-[11px] font-medium text-rose-400 uppercase tracking-wider">
                Rejected Submissions
              </div>
              <div className="mt-1.5 text-xl font-bold text-rose-400">
                {summary.rejected_count ?? 0}
              </div>
              <div className="text-[10px] text-rose-400/80 mt-0.5">Action required</div>
            </EasyXCard>
          </>
        )}
      </div>

      {/* Filter Control Bar */}
      <EasyXCard className="p-4 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by ID, name, email, tx hash, referral code..."
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
              data-testid="input-report-search"
            />
          </form>

          {/* Status Filter */}
          {STATUS_OPTIONS[activeTab]?.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-ex-muted whitespace-nowrap">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none"
                data-testid="select-report-status"
              >
                {STATUS_OPTIONS[activeTab].map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-ex-surface text-ex-text">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range Inputs */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-ex-muted flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Range:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-ex-ctrl bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-ex-text focus:border-ex-accent focus:outline-none"
              data-testid="input-from-date"
            />
            <span className="text-ex-muted">to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-ex-ctrl bg-white/5 border border-white/10 px-2.5 py-1.5 text-xs text-ex-text focus:border-ex-accent focus:outline-none"
              data-testid="input-to-date"
            />
          </div>
        </div>

        {/* Quick Date Presets & Filter Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-ex-muted mr-1 font-medium">Quick Presets:</span>
            <button
              type="button"
              onClick={() => handlePresetDate("all")}
              className="px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 text-ex-text transition"
            >
              All Time
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate("today")}
              className="px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 text-ex-text transition"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate("7days")}
              className="px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 text-ex-text transition"
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate("30days")}
              className="px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 text-ex-text transition"
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => handlePresetDate("this_month")}
              className="px-2.5 py-1 text-[11px] rounded bg-white/5 hover:bg-white/10 text-ex-text transition"
            >
              This Month
            </button>
          </div>

          {(q || statusFilter !== "all" || fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setQ("");
                setStatusFilter("all");
                setFromDate("");
                setToDate("");
              }}
              className="text-[11px] text-rose-300 hover:text-rose-200 flex items-center gap-1"
              data-testid="btn-reset-filters"
            >
              <XCircle className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>
      </EasyXCard>

      {/* Main Report Table */}
      {isLoading ? (
        <EasyXLoader />
      ) : rows.length === 0 ? (
        <EasyXEmptyState
          icon={Download}
          title={`No ${activeTab.replace(/_/g, " ")} found`}
          note={
            q || statusFilter !== "all" || fromDate || toDate
              ? "Try broadening your search or resetting date and status filters."
              : "No entries recorded in the system yet."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-ex border border-white/10 bg-white/[0.02]">
          <EasyXTable columns={tableColumns}>
            {rows.map((row) => {
              return (
                <tr
                  key={row.id}
                  data-testid={`report-row-${row.id}`}
                  className="border-b border-white/5 transition hover:bg-white/[0.02]"
                >
                  {/* Users */}
                  {activeTab === "users" && (
                    <>
                      <td className="px-4 py-3 text-xs font-mono">
                        <div className="font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <div className="text-[10px] text-ex-muted">{row.referral_code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-ex-text">{row.name}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-ex-text font-mono">{row.email}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {row.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.kyc_status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-emerald-400">
                        ${money(row.available_balance)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Deposits */}
                  {activeTab === "deposits" && (
                    <>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-ex-lav-300">
                        #{String(row.id).slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-ex-text">
                        {row.network}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-400">
                        ${money(row.amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-text">
                        {row.approved_amount !== "—" ? `$${money(row.approved_amount)}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-muted max-w-[140px] truncate" title={row.tx_hash}>
                        {row.tx_hash && row.tx_hash !== "—" ? `${String(row.tx_hash).slice(0, 12)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Investments */}
                  {activeTab === "investments" && (
                    <>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <span className="text-[10px] uppercase font-bold text-ex-accent">{row.plan_key}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-ex-text">
                        ${money(row.principal)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-emerald-400 font-semibold">
                        +${money(row.profit_amount)}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-ex-accent">
                        ${money(row.maturity_amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.matures_at ? dayjs(row.matures_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Maturities */}
                  {activeTab === "maturities" && (
                    <>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <span className="text-[10px] uppercase font-bold text-ex-accent">{row.plan_key}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-ex-text">
                        ${money(row.principal)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-400">
                        +${money(row.profit_amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-ex-accent">
                        ${money(row.maturity_amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY") : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-emerald-400 font-mono whitespace-nowrap">
                        {row.matures_at ? dayjs(row.matures_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Withdrawals */}
                  {activeTab === "withdrawals" && (
                    <>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <div className="text-[10px] font-mono text-ex-muted truncate max-w-[120px]" title={row.to_address}>
                          {row.to_address ? `${row.to_address.slice(0, 10)}…` : "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-semibold text-ex-text">
                        {row.network}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-rose-400">
                        ${money(row.amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-muted">
                        ${money(row.fee)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-muted max-w-[120px] truncate" title={row.tx_hash}>
                        {row.tx_hash && row.tx_hash !== "—" ? `${String(row.tx_hash).slice(0, 10)}…` : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Referral Commissions */}
                  {activeTab === "referral_commissions" && (
                    <>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <span className="text-[10px] uppercase font-bold text-ex-accent">{row.plan_key}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-emerald-400">{row.referrer_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.referrer_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.referee_name}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-emerald-400">
                        +${money(row.amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* Wallet Transactions */}
                  {activeTab === "wallet_transactions" && (
                    <>
                      <td className="px-4 py-3 text-xs font-mono">
                        <div className="font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-bold">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-bold">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border ${
                            row.direction === "credit"
                              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                              : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                          }`}
                        >
                          {row.direction === "credit" ? (
                            <ArrowDownLeft className="h-3 w-3" />
                          ) : (
                            <ArrowUpRight className="h-3 w-3" />
                          )}
                          {row.direction?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold">
                        <span className={row.direction === "credit" ? "text-emerald-400" : "text-rose-400"}>
                          {row.direction === "credit" ? "+" : "-"}${money(row.amount)} USDT
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-text">
                        ${money(row.balance_after)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[180px]">
                        <div className="truncate text-ex-text" title={row.note}>
                          {row.note}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.created_at ? dayjs(row.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}

                  {/* KYC */}
                  {activeTab === "kyc" && (
                    <>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-mono font-semibold text-ex-lav-300">#{String(row.id).slice(0, 8)}</div>
                        <span className="text-[10px] uppercase font-mono text-ex-muted">{row.id_type}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="font-semibold text-ex-text">{row.user_name}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{row.user_email}</div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-text font-semibold">
                        {row.country}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-muted">
                        {row.id_number_masked}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <EasyXStatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3 text-xs text-rose-300 max-w-[150px] truncate" title={row.rejection_reason}>
                        {row.rejection_reason}
                      </td>
                      <td className="px-4 py-3 text-xs text-ex-muted font-mono whitespace-nowrap">
                        {row.submitted_at ? dayjs(row.submitted_at).format("DD MMM YYYY, HH:mm") : "—"}
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </EasyXTable>
        </div>
      )}

      {/* Immutable Audit Trail Section */}
      <EasyXCard className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-ex-accent" />
            <h2 className="ex-display text-base font-bold text-white">Immutable Administrative Audit Trail</h2>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-ex-muted">
              <Filter className="h-3.5 w-3.5" />
              <select
                value={auditActionFilter}
                onChange={(e) => setAuditActionFilter(e.target.value)}
                className="rounded-ex-ctrl border border-white/10 bg-ex-surface px-2.5 py-1.5 text-xs text-ex-text focus:outline-none"
                data-testid="audit-action-filter"
              >
                <option value="">All Actions</option>
                {Object.keys(ACTION_LABELS).map((a) => (
                  <option key={a} value={a} className="bg-ex-surface text-ex-text">
                    {ACTION_LABELS[a]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <p className="mt-1 text-xs text-ex-muted">
          All export actions and administrative operations are recorded for compliance and security auditing.
        </p>

        {loadingLogs ? (
          <EasyXLoader className="py-8" />
        ) : !logs || logs.length === 0 ? (
          <div className="mt-4">
            <EasyXEmptyState icon={ScrollText} title="No audit entries" note="Administrative events will be logged here." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs" data-testid="audit-log-table">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ex-muted/70 border-b border-white/5">
                  <th className="pb-2.5 pr-4 font-medium">Action</th>
                  <th className="pb-2.5 pr-4 font-medium">Admin Actor</th>
                  <th className="pb-2.5 pr-4 font-medium">Target Entity</th>
                  <th className="pb-2.5 pr-4 font-medium">Audit Details</th>
                  <th className="pb-2.5 font-medium">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="align-top hover:bg-white/[0.02]" data-testid="audit-log-row">
                    <td className="py-2.5 pr-4 font-semibold text-white">
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="py-2.5 pr-4 text-ex-muted font-mono">
                      {log.actor_email || log.actor_id || "system"}
                    </td>
                    <td className="py-2.5 pr-4 text-ex-muted font-mono">
                      {log.entity_type ? `${log.entity_type} (${String(log.entity_id).slice(0, 8)})` : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-ex-muted max-w-[280px] truncate" title={metaSummary(log.meta)}>
                      {metaSummary(log.meta) || "—"}
                    </td>
                    <td className="py-2.5 whitespace-nowrap text-ex-muted font-mono">
                      {log.created_at ? dayjs(log.created_at).format("DD MMM YYYY, HH:mm:ss") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EasyXCard>
    </div>
  );
}
