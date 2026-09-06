import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  PiggyBank,
  Inbox,
  ArrowUpFromLine,
  BadgeCheck,
  Share2,
  Clock,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileText,
  Wallet,
  Download,
} from "lucide-react";

import {
  useAdminOverview,
  useAdminDeposits,
  useAdminWithdrawals,
  useAdminInvestments,
  useAdminKyc,
  useAdminAuditLogs,
} from "@/admin/adminApi";
import { downloadAdminUxAuditReport } from "@/admin/utils/downloadAuditReport";
import AdminActivityLog from "@/admin/components/AdminActivityLog";
import AdminGrowthDashboard from "@/admin/components/AdminGrowthDashboard";
import { PageHeading, EasyXCard, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

function StatCard({ label, value, sub, icon: Icon, accent, testId, linkTo }) {
  const content = (
    <EasyXCard
      className={`flex items-start justify-between gap-3 transition-all duration-300 ${
        linkTo ? "hover:border-white/20 hover:bg-white/[0.03] cursor-pointer" : ""
      }`}
      data-testid={testId}
    >
      <div className="flex items-start gap-3 min-w-0">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-ex-ctrl ${
            accent || "bg-white/5 text-ex-lav-300"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-ex-muted font-medium">{label}</div>
          <div className="text-xl font-extrabold text-ex-text tracking-tight mt-0.5 truncate">
            {value}
          </div>
          {sub ? <div className="text-[11px] text-ex-muted mt-1 leading-tight">{sub}</div> : null}
        </div>
      </div>
      {linkTo && <ChevronRight className="h-4 w-4 text-ex-muted/40 shrink-0 self-center" />}
    </EasyXCard>
  );

  if (linkTo) {
    return <Link to={linkTo} className="block">{content}</Link>;
  }
  return content;
}

export default function AdminOverviewPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useAdminOverview();
  const { data: rawDeposits } = useAdminDeposits();
  const { data: rawWithdrawals } = useAdminWithdrawals();
  const { data: rawInvestments } = useAdminInvestments();
  const { data: rawKycRecords } = useAdminKyc();
  const { data: rawAuditLogs } = useAdminAuditLogs();

  const deposits = Array.isArray(rawDeposits)
    ? rawDeposits
    : Array.isArray(rawDeposits?.deposits)
    ? rawDeposits.deposits
    : Array.isArray(rawDeposits?.data)
    ? rawDeposits.data
    : [];

  const withdrawals = Array.isArray(rawWithdrawals)
    ? rawWithdrawals
    : Array.isArray(rawWithdrawals?.withdrawals)
    ? rawWithdrawals.withdrawals
    : Array.isArray(rawWithdrawals?.data)
    ? rawWithdrawals.data
    : [];

  const investments = Array.isArray(rawInvestments)
    ? rawInvestments
    : Array.isArray(rawInvestments?.investments)
    ? rawInvestments.investments
    : Array.isArray(rawInvestments?.data)
    ? rawInvestments.data
    : [];

  const kycRecords = Array.isArray(rawKycRecords)
    ? rawKycRecords
    : Array.isArray(rawKycRecords?.kyc)
    ? rawKycRecords.kyc
    : Array.isArray(rawKycRecords?.records)
    ? rawKycRecords.records
    : Array.isArray(rawKycRecords?.data)
    ? rawKycRecords.data
    : [];

  const auditLogs = Array.isArray(rawAuditLogs)
    ? rawAuditLogs
    : Array.isArray(rawAuditLogs?.logs)
    ? rawAuditLogs.logs
    : Array.isArray(rawAuditLogs?.audit_logs)
    ? rawAuditLogs.audit_logs
    : Array.isArray(rawAuditLogs?.data)
    ? rawAuditLogs.data
    : [];

  const [activeTab, setActiveTab] = useState("deposits");

  if (isLoading || !data) {
    return <EasyXLoader />;
  }

  const pendingDeposits = data.deposits?.pending || 0;
  const pendingWithdrawals = data.withdrawals?.pending || 0;
  const pendingKyc = data.kyc?.pending || 0;

  return (
    <div className="space-y-8" data-testid="admin-overview-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeading
          title="Overview"
          subtitle="Real-time operations, liquidity, and platform analytics."
          icon={LayoutDashboard}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadAdminUxAuditReport("md")}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25 transition"
            title="Download UX/UI Audit & Improvement Proposal Report (.md)"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span>Download UX Audit (.md)</span>
          </button>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            System Live
          </span>
        </div>
      </div>

      {/* QUICK ACTIONS BAR */}
      <section>
        <div className="text-xs font-bold uppercase tracking-wider text-ex-muted mb-3">
          Quick Actions &amp; Work queues
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() => navigate("/admin/deposits")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-sky-500/15 text-sky-400">
                <Inbox className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  Deposits
                </div>
                <div className="text-[10px] text-ex-muted">
                  {pendingDeposits > 0 ? (
                    <span className="text-amber-400 font-semibold">{pendingDeposits} pending</span>
                  ) : (
                    "0 pending"
                  )}
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>

          <button
            onClick={() => navigate("/admin/withdrawals")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-amber-500/15 text-amber-400">
                <ArrowUpFromLine className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  Withdrawals
                </div>
                <div className="text-[10px] text-ex-muted">
                  {pendingWithdrawals > 0 ? (
                    <span className="text-amber-400 font-semibold">{pendingWithdrawals} pending</span>
                  ) : (
                    "0 pending"
                  )}
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>

          <button
            onClick={() => navigate("/admin/kyc")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-fuchsia-500/15 text-fuchsia-400">
                <BadgeCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  KYC Review
                </div>
                <div className="text-[10px] text-ex-muted">
                  {pendingKyc > 0 ? (
                    <span className="text-fuchsia-400 font-semibold">{pendingKyc} pending</span>
                  ) : (
                    "0 pending"
                  )}
                </div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>

          <button
            onClick={() => navigate("/admin/plans")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-emerald-500/15 text-emerald-400">
                <Layers className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  Plans
                </div>
                <div className="text-[10px] text-ex-muted">Tiers &amp; yields</div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>

          <button
            onClick={() => navigate("/admin/wallet")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-teal-500/15 text-teal-300">
                <Wallet className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  Wallet &amp; Ledger
                </div>
                <div className="text-[10px] text-ex-muted">Credits &amp; Debits</div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>

          <button
            onClick={() => navigate("/admin/users")}
            className="flex items-center justify-between p-3.5 rounded-ex-card bg-ex-surface2/90 border border-white/8 hover:border-white/20 hover:bg-white/[0.04] transition group text-left col-span-2 sm:col-span-1"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-ex-accent/15 text-ex-accent">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-ex-text group-hover:text-white truncate">
                  Users
                </div>
                <div className="text-[10px] text-ex-muted">{data.users?.total || 0} registered</div>
              </div>
            </div>
            <ArrowRight className="h-3.5 w-3.5 text-ex-muted/50 group-hover:text-white group-hover:translate-x-0.5 transition shrink-0" />
          </button>
        </div>
      </section>

      {/* KPI METRIC CARDS */}
      <section className="space-y-4">
        <div className="text-xs font-bold uppercase tracking-wider text-ex-muted">
          Platform KPIs &amp; Financial Summary
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* User Metrics */}
          <StatCard
            testId="kpi-users"
            label="Total Users"
            value={data.users?.total || 0}
            sub={`${data.users?.active || 0} active · ${data.users?.suspended || 0} suspended`}
            icon={Users}
            accent="bg-ex-accent/15 text-ex-accent"
            linkTo="/admin/users"
          />

          <StatCard
            testId="kpi-active-users"
            label="Active Users"
            value={data.users?.active || 0}
            sub={`${data.users?.suspended || 0} suspended accounts`}
            icon={CheckCircle2}
            accent="bg-emerald-500/15 text-emerald-300"
            linkTo="/admin/users"
          />

          <StatCard
            testId="kpi-suspended-users"
            label="Suspended Users"
            value={data.users?.suspended || 0}
            sub="Flagged or restricted accounts"
            icon={ShieldCheck}
            accent="bg-rose-500/15 text-rose-300"
            linkTo="/admin/users"
          />

          {/* Pending Queues */}
          <StatCard
            testId="kpi-deposits"
            label="Pending Deposits"
            value={data.deposits?.pending || 0}
            sub={`Approved total: ${data.deposits?.approved_total || "0.00"} USDT`}
            icon={Inbox}
            accent="bg-sky-500/15 text-sky-300"
            linkTo="/admin/deposits"
          />

          <StatCard
            testId="kpi-withdrawals"
            label="Pending Withdrawals"
            value={data.withdrawals?.pending || 0}
            sub={`${data.withdrawals?.approved || 0} approved · paid ${data.withdrawals?.paid_total || "0.00"} USDT`}
            icon={ArrowUpFromLine}
            accent="bg-amber-500/15 text-amber-300"
            linkTo="/admin/withdrawals"
          />

          <StatCard
            testId="kpi-kyc"
            label="Pending KYC"
            value={data.kyc?.pending || 0}
            sub="Awaiting identity review"
            icon={BadgeCheck}
            accent="bg-fuchsia-500/15 text-fuchsia-300"
            linkTo="/admin/kyc"
          />

          {/* Investment Metrics */}
          <StatCard
            testId="kpi-active-investments"
            label="Active Investments"
            value={data.investments?.active || 0}
            sub={`Principal: ${data.investments?.active_principal || "0.00"} USDT`}
            icon={PiggyBank}
            accent="bg-indigo-500/15 text-indigo-300"
            linkTo="/admin/investments"
          />

          <StatCard
            testId="kpi-maturing-soon"
            label="Maturing Soon"
            value={data.investments?.maturing_soon || 0}
            sub="Maturing within next 7 days"
            icon={Clock}
            accent="bg-amber-500/15 text-amber-300"
            linkTo="/admin/maturities"
          />

          <StatCard
            testId="kpi-matured-investments"
            label="Matured Investments"
            value={data.investments?.matured || 0}
            sub={`${data.investments?.cancelled || 0} cancelled investments`}
            icon={CheckCircle2}
            accent="bg-teal-500/15 text-teal-300"
            linkTo="/admin/maturities"
          />

          {/* Financial Totals */}
          <StatCard
            testId="kpi-total-deposits"
            label="Total Deposits"
            value={`${data.deposits?.total || data.deposits?.approved_total || "0.00"} USDT`}
            sub={`Approved: ${data.deposits?.approved_total || "0.00"} USDT`}
            icon={Inbox}
            accent="bg-emerald-500/15 text-emerald-300"
            linkTo="/admin/deposits"
          />

          <StatCard
            testId="kpi-total-withdrawals"
            label="Total Withdrawals"
            value={`${data.withdrawals?.total || data.withdrawals?.paid_total || "0.00"} USDT`}
            sub={`Paid: ${data.withdrawals?.paid_total || "0.00"} USDT`}
            icon={ArrowUpFromLine}
            accent="bg-rose-500/15 text-rose-300"
            linkTo="/admin/withdrawals"
          />

          <StatCard
            testId="kpi-referrals"
            label="Referral Commissions"
            value={`${data.referrals?.commissions_paid || "0.00"} USDT`}
            sub="Total affiliate payouts"
            icon={Share2}
            accent="bg-fuchsia-500/15 text-fuchsia-300"
            linkTo="/admin/referrals"
          />
        </div>
      </section>

      {/* PLATFORM GROWTH & RECHARTS ANALYTICS DASHBOARD */}
      <AdminGrowthDashboard />

      {/* RECENT ACTIVITY SECTION */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-bold uppercase tracking-wider text-ex-muted">
            Recent Platform Activity
          </div>
          {/* Activity Tabs */}
          <div className="flex items-center gap-1 p-1 bg-ex-surface2/80 rounded-ex-ctrl border border-white/8 text-xs overflow-x-auto">
            {[
              { id: "deposits", label: "Deposits" },
              { id: "withdrawals", label: "Withdrawals" },
              { id: "investments", label: "Investments" },
              { id: "kyc", label: "KYC Submissions" },
              { id: "actions", label: "Admin Actions" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md font-semibold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? "bg-ex-accent text-ex-ink shadow-sm"
                    : "text-ex-muted hover:text-ex-text hover:bg-white/5"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents with Real Data & Empty States */}
        <EasyXCard className="p-0 overflow-hidden">
          {activeTab === "deposits" && (
            <div>
              {deposits.length === 0 ? (
                <div className="p-8">
                  <EasyXEmptyState
                    icon={Inbox}
                    title="No deposits recorded"
                    description="User USDT deposits will appear here as soon as transactions are submitted."
                  />
                </div>
              ) : (
                <div className="divide-y divide-white/6 overflow-x-auto">
                  {deposits.slice(0, 6).map((d) => (
                    <div key={d.id} className="p-4 flex items-center justify-between gap-4 text-sm hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-sky-500/10 text-sky-400">
                          <Inbox className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ex-text truncate">
                            {d.user_name || d.user_email || "Investor"}
                          </div>
                          <div className="text-xs text-ex-muted truncate">
                            Network: {d.network} · TX: {d.tx_hash || "Pending verification"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-ex-text">{d.amount} USDT</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            d.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : d.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "withdrawals" && (
            <div>
              {withdrawals.length === 0 ? (
                <div className="p-8">
                  <EasyXEmptyState
                    icon={ArrowUpFromLine}
                    title="No withdrawals recorded"
                    description="Withdrawal payout requests will be listed here."
                  />
                </div>
              ) : (
                <div className="divide-y divide-white/6 overflow-x-auto">
                  {withdrawals.slice(0, 6).map((w) => (
                    <div key={w.id} className="p-4 flex items-center justify-between gap-4 text-sm hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-amber-500/10 text-amber-400">
                          <ArrowUpFromLine className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ex-text truncate">
                            {w.user_name || w.user_email || "Investor"}
                          </div>
                          <div className="text-xs text-ex-muted truncate">
                            {w.network} · {w.destination_address || "No address provided"}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-ex-text">{w.amount} USDT</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            w.status === "paid" || w.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : w.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {w.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "investments" && (
            <div>
              {investments.length === 0 ? (
                <div className="p-8">
                  <EasyXEmptyState
                    icon={PiggyBank}
                    title="No investments found"
                    description="Active tier purchases and portfolio plans will show up here."
                  />
                </div>
              ) : (
                <div className="divide-y divide-white/6 overflow-x-auto">
                  {investments.slice(0, 6).map((inv) => (
                    <div key={inv.id} className="p-4 flex items-center justify-between gap-4 text-sm hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-indigo-500/10 text-indigo-400">
                          <PiggyBank className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ex-text truncate">
                            {inv.plan_name} Plan · {inv.user_name || inv.user_email || "Investor"}
                          </div>
                          <div className="text-xs text-ex-muted truncate">
                            Lock: {inv.lock_days || 60}d · Maturity Payout: {inv.maturity_amount} USDT
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-ex-text">{inv.principal} USDT</div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                            inv.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "matured"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {inv.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "kyc" && (
            <div>
              {kycRecords.length === 0 ? (
                <div className="p-8">
                  <EasyXEmptyState
                    icon={BadgeCheck}
                    title="No KYC submissions"
                    description="User identity verifications and documents will appear here when submitted."
                  />
                </div>
              ) : (
                <div className="divide-y divide-white/6 overflow-x-auto">
                  {kycRecords.slice(0, 6).map((k) => (
                    <div key={k.id} className="p-4 flex items-center justify-between gap-4 text-sm hover:bg-white/[0.02] transition">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-ex-ctrl bg-fuchsia-500/10 text-fuchsia-400">
                          <BadgeCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-ex-text truncate">
                            {k.user_name || k.user_email || "User"}
                          </div>
                          <div className="text-xs text-ex-muted truncate">
                            Type: {k.id_type || "Passport / ID"} · Submitted: {new Date(k.submitted_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            k.status === "approved"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : k.status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {k.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "actions" && (
            <div className="p-2 sm:p-4">
              <AdminActivityLog
                limit={8}
                compact={false}
                showFilters={true}
                showSearch={true}
                linkToFull="/admin/audit"
                className="border-0 bg-transparent p-0"
              />
            </div>
          )}
        </EasyXCard>
      </section>

      {/* DEDICATED AUDIT & DECISION TRAIL SECTION */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-ex-muted">
            Decision Audit Trail &amp; Verification Logs
          </div>
          <Link
            to="/admin/audit"
            className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
          >
            <span>Full Audit Database</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <AdminActivityLog
          title="Recent Approval &amp; Rejection Audit Trail"
          subtitle="Real-time log of administrative decisions with verification details and user impacts."
          limit={6}
          linkToFull="/admin/audit"
        />
      </section>
    </div>
  );
}
