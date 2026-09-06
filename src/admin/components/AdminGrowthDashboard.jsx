import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  Users,
  Inbox,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  RefreshCw,
  Sliders,
  DollarSign,
  PieChart as PieIcon,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Maximize2,
} from "lucide-react";
import { useAdminAnalyticsTrends } from "@/admin/adminApi";
import { EasyXCard, EasyXButton, EasyXLoader, EasyXStatusBadge } from "@/design/EasyX";

// Formatting utility for money
function formatMoney(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return "0.00";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCompact(num) {
  const n = Number(num);
  if (Number.isNaN(n)) return "0";
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

// Custom Glassmorphic Dark Tooltip for Recharts
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="rounded-xl border border-white/15 bg-ex-surface2/95 p-3.5 shadow-2xl backdrop-blur-xl text-xs space-y-2 min-w-[200px] z-50">
      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="font-bold text-ex-text flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-ex-lav-300" />
          {label}
        </span>
      </div>

      <div className="space-y-1.5 pt-0.5">
        {payload.map((item, idx) => {
          const isCurrency =
            item.dataKey?.includes("deposit") ||
            item.dataKey?.includes("amount") ||
            item.dataKey?.includes("volume") ||
            item.name?.toLowerCase().includes("usdt") ||
            item.name?.toLowerCase().includes("deposit");

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || item.fill || item.stroke }}
                />
                <span className="text-ex-muted truncate">{item.name || item.dataKey}:</span>
              </div>
              <span className="font-mono font-bold text-ex-text">
                {isCurrency
                  ? `${formatMoney(item.value)} USDT`
                  : `${Number(item.value).toLocaleString()} ${item.name?.toLowerCase().includes("user") ? "users" : ""}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Custom Tooltip for Pie / Donut Charts
function CustomPieTooltip({ active, payload }) {
  if (!active || !payload || !Array.isArray(payload) || !payload.length || !payload[0]) return null;
  const data = payload[0];

  return (
    <div className="rounded-xl border border-white/15 bg-ex-surface2/95 p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 z-50">
      <div className="flex items-center gap-2">
        <span
          className="h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: data.payload?.color || data.color }}
        />
        <span className="font-bold text-ex-text">{data.name}</span>
      </div>
      <div className="text-ex-muted flex justify-between gap-4">
        <span>Volume:</span>
        <span className="font-mono font-bold text-emerald-400">
          {formatMoney(data.value)} USDT
        </span>
      </div>
      {data.payload?.count != null && (
        <div className="text-ex-muted flex justify-between gap-4">
          <span>Transactions:</span>
          <span className="font-mono font-bold text-ex-text">{data.payload.count}</span>
        </div>
      )}
      {data.payload?.percentage != null && (
        <div className="text-ex-muted flex justify-between gap-4">
          <span>Share:</span>
          <span className="font-mono font-bold text-purple-300">{data.payload.percentage}%</span>
        </div>
      )}
    </div>
  );
}

export default function AdminGrowthDashboard() {
  const [period, setPeriod] = useState("30d");
  const [activeView, setActiveView] = useState("combined"); // 'combined', 'deposits', 'users', 'distributions'
  const [metricMode, setMetricMode] = useState("interval"); // 'interval' (Daily/Monthly volume) or 'cumulative' (Cumulative Total)
  const [chartType, setChartType] = useState("area"); // 'area', 'bar', 'line'

  const { data, isLoading, isFetching, refetch } = useAdminAnalyticsTrends(period);

  const summary = data?.summary || {};
  const timeSeries = data?.time_series || [];
  const networkBreakdown = data?.network_breakdown || [];
  const planBreakdown = data?.plan_breakdown || [];
  const kycFunnel = data?.kyc_funnel || [];

  // Export CSV of the current trend dataset
  const exportTrendCSV = () => {
    if (!timeSeries.length) return;
    const headers = [
      "Date",
      "Full Date",
      "New Users",
      "Cumulative Users",
      "KYC Verified Users",
      "Approved Deposits (USDT)",
      "Pending Deposits (USDT)",
      "Total Deposits (USDT)",
      "Cumulative Deposits (USDT)",
      "Deposit Count",
      "Avg Deposit (USDT)",
    ];

    const rows = timeSeries.map((row) => [
      row.date,
      `"${row.full_date}"`,
      row.new_users,
      row.cumulative_users,
      row.kyc_verified,
      row.approved_deposits,
      row.pending_deposits,
      row.total_deposits,
      row.cumulative_deposits,
      row.deposit_count,
      row.avg_deposit,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `easyx_platform_growth_${period}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <section className="space-y-6" data-testid="admin-growth-dashboard">
      {/* SECTION HEADER & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1 border-b border-white/6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-purple-500/15 text-purple-400 border border-purple-500/30">
              <TrendingUp className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-ex-text tracking-tight flex items-center gap-2">
                Platform Growth &amp; Trajectory Analytics
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-widest">
                  Live Visualizer
                </span>
              </h2>
              <p className="text-xs text-ex-muted">
                Real-time time-series modeling of investor acquisition, liquidity inflows, and capital velocity.
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Range Selector */}
          <div className="flex items-center bg-ex-surface2/90 rounded-lg p-1 border border-white/10 text-xs">
            {[
              { id: "7d", label: "7D" },
              { id: "30d", label: "30D" },
              { id: "90d", label: "90D" },
              { id: "1y", label: "1Y" },
              { id: "all", label: "All Time" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setPeriod(t.id)}
                data-testid={`growth-period-${t.id}`}
                className={`px-3 py-1 rounded-md font-semibold transition text-xs ${
                  period === t.id
                    ? "bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]"
                    : "text-ex-muted hover:text-ex-text hover:bg-white/5"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            title="Refresh analytics data"
            className="p-2 rounded-lg bg-ex-surface2/90 border border-white/10 text-ex-muted hover:text-white hover:bg-white/10 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
          </button>

          {/* Export CSV button */}
          <button
            onClick={exportTrendCSV}
            title="Download CSV report"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ex-surface2/90 border border-white/10 text-xs font-semibold text-ex-text hover:text-white hover:bg-white/10 transition"
          >
            <Download className="h-3.5 w-3.5 text-purple-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* TOP GROWTH KPI METRIC HIGHLIGHTS */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* User Acquisition KPI */}
        <EasyXCard className="p-4 border border-white/8 relative overflow-hidden bg-gradient-to-br from-ex-surface2 to-purple-950/20">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-ex-muted">User Registrations</span>
            <div className="grid h-7 w-7 place-items-center rounded-md bg-purple-500/15 text-purple-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-ex-text tracking-tight">
              +{summary.period_new_users ?? 0}
            </span>
            <span className="text-xs text-ex-muted">in period</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {summary.user_growth_rate >= 0 ? (
              <span className="inline-flex items-center text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                +{summary.user_growth_rate}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[11px]">
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                {summary.user_growth_rate}%
              </span>
            )}
            <span className="text-ex-muted/70 text-[11px]">vs prior cycle</span>
          </div>
          <div className="mt-1 text-[11px] text-ex-muted/60">
            Total registered: <strong className="text-ex-text">{summary.total_users ?? 0}</strong>
          </div>
        </EasyXCard>

        {/* Deposit Volume KPI */}
        <EasyXCard className="p-4 border border-white/8 relative overflow-hidden bg-gradient-to-br from-ex-surface2 to-emerald-950/20">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-ex-muted">Approved Deposits</span>
            <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500/15 text-emerald-400">
              <Inbox className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 tracking-tight">
              ${formatCompact(summary.period_approved_deposits || 0)}
            </span>
            <span className="text-xs text-ex-muted">USDT</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1.5 text-xs">
            {summary.deposit_growth_rate >= 0 ? (
              <span className="inline-flex items-center text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 text-[11px]">
                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                +{summary.deposit_growth_rate}%
              </span>
            ) : (
              <span className="inline-flex items-center text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20 text-[11px]">
                <ArrowDownRight className="h-3 w-3 mr-0.5" />
                {summary.deposit_growth_rate}%
              </span>
            )}
            <span className="text-ex-muted/70 text-[11px]">capital growth</span>
          </div>
          <div className="mt-1 text-[11px] text-ex-muted/60">
            All-time: <strong className="text-emerald-400">${summary.total_approved_deposits || "0.00"} USDT</strong>
          </div>
        </EasyXCard>

        {/* Deposit Conversion Rate KPI */}
        <EasyXCard className="p-4 border border-white/8 relative overflow-hidden bg-gradient-to-br from-ex-surface2 to-sky-950/20">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-ex-muted">Deposit Conversion</span>
            <div className="grid h-7 w-7 place-items-center rounded-md bg-sky-500/15 text-sky-400">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-sky-300 tracking-tight">
              {summary.deposit_conversion_rate ?? 0}%
            </span>
            <span className="text-xs text-ex-muted">of user base</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-xs text-ex-muted">
            <span className="text-emerald-400 font-semibold">{summary.active_investors_count ?? 0}</span>
            <span>active investors funded</span>
          </div>
          <div className="mt-1 text-[11px] text-ex-muted/60">
            Avg ticket: <strong className="text-ex-text">${summary.avg_deposit_amount || "0.00"} USDT</strong>
          </div>
        </EasyXCard>

        {/* Velocity / Peak Volume Inflow */}
        <EasyXCard className="p-4 border border-white/8 relative overflow-hidden bg-gradient-to-br from-ex-surface2 to-amber-950/20">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-ex-muted">Peak Inflow Spike</span>
            <div className="grid h-7 w-7 place-items-center rounded-md bg-amber-500/15 text-amber-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 tracking-tight truncate">
              ${formatCompact(summary.peak_deposit_day?.amount || 0)}
            </span>
            <span className="text-xs text-ex-muted">USDT</span>
          </div>
          <div className="mt-2.5 flex items-center gap-1 text-xs text-ex-muted">
            <span>Peak Date:</span>
            <strong className="text-amber-400">{summary.peak_deposit_day?.date || "—"}</strong>
          </div>
          <div className="mt-1 text-[11px] text-ex-muted/60">
            Peak signups: <strong className="text-ex-text">{summary.peak_registration_day?.count || 0}</strong> on{" "}
            {summary.peak_registration_day?.date || "—"}
          </div>
        </EasyXCard>
      </div>

      {/* MAIN CHART CONTAINER CARD */}
      <EasyXCard className="p-5 border border-white/10 space-y-5 bg-ex-surface/80 shadow-2xl">
        {/* Chart View Switcher & Customizer */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/6">
          {/* Main Visual Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/8 text-xs">
            {[
              { id: "combined", label: "Dual Growth Trajectory", icon: TrendingUp },
              { id: "deposits", label: "Deposit Volumes (USDT)", icon: Inbox },
              { id: "users", label: "User Registrations", icon: Users },
              { id: "distributions", label: "Network & Plan Share", icon: PieIcon },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id)}
                  data-testid={`growth-tab-${tab.id}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap ${
                    activeView === tab.id
                      ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                      : "text-ex-muted hover:text-ex-text hover:bg-white/5"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub Controls: Metric Toggle & Chart Type (only for time-series views) */}
          {activeView !== "distributions" && (
            <div className="flex items-center gap-2 self-end md:self-auto text-xs">
              {/* Cumulative vs Interval toggle */}
              <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/8">
                <button
                  onClick={() => setMetricMode("interval")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    metricMode === "interval"
                      ? "bg-white/15 text-white"
                      : "text-ex-muted hover:text-ex-text"
                  }`}
                >
                  Interval Flow
                </button>
                <button
                  onClick={() => setMetricMode("cumulative")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    metricMode === "cumulative"
                      ? "bg-white/15 text-white"
                      : "text-ex-muted hover:text-ex-text"
                  }`}
                >
                  Cumulative Total
                </button>
              </div>

              {/* Chart Type Toggle */}
              <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/8">
                <button
                  onClick={() => setChartType("area")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    chartType === "area"
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                      : "text-ex-muted hover:text-white"
                  }`}
                >
                  Area
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    chartType === "bar"
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                      : "text-ex-muted hover:text-white"
                  }`}
                >
                  Bar
                </button>
                <button
                  onClick={() => setChartType("line")}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                    chartType === "line"
                      ? "bg-purple-500/30 text-purple-300 border border-purple-500/40"
                      : "text-ex-muted hover:text-white"
                  }`}
                >
                  Line
                </button>
              </div>
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {isLoading ? (
          <div className="h-80 flex flex-col items-center justify-center gap-3">
            <EasyXLoader />
            <span className="text-xs text-ex-muted">Rendering Recharts visual model...</span>
          </div>
        ) : timeSeries.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-xs text-ex-muted">
            No analytics data points found for this range.
          </div>
        ) : (
          <div>
            {/* VIEW 1: COMBINED DUAL GROWTH OVERVIEW */}
            {activeView === "combined" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-ex-text">Platform Expansion Velocity</span>
                    <span className="text-ex-muted ml-2">
                      New User Onboarding (Left Axis) vs Total Approved USDT Deposits (Right Axis)
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px]">
                    <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      {metricMode === "cumulative" ? "Cumulative User Base" : "New User Signups"}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      {metricMode === "cumulative" ? "Cumulative USDT Inflow" : "USDT Deposit Volume"}
                    </span>
                  </div>
                </div>

                <div className="h-[360px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={timeSeries}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <defs>
                        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} vertical={false} />
                      
                      <XAxis
                        dataKey="formatted_date"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={{ stroke: "#3f3f46" }}
                        dy={8}
                      />

                      {/* Left Y Axis: Users */}
                      <YAxis
                        yAxisId="usersAxis"
                        orientation="left"
                        stroke="#a855f7"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                        tickFormatter={(v) => Number(v).toLocaleString()}
                      />

                      {/* Right Y Axis: Deposits in USDT */}
                      <YAxis
                        yAxisId="depositsAxis"
                        orientation="right"
                        stroke="#10b981"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${formatCompact(v)}`}
                      />

                      <Tooltip content={<CustomChartTooltip />} />

                      {/* User Registrations Visual */}
                      {metricMode === "cumulative" ? (
                        <Line
                          yAxisId="usersAxis"
                          type="monotone"
                          dataKey="cumulative_users"
                          name="Total Users"
                          stroke="#c084fc"
                          strokeWidth={2.5}
                          dot={{ r: 3, fill: "#c084fc", strokeWidth: 1, stroke: "#ffffff" }}
                          activeDot={{ r: 6, fill: "#c084fc", stroke: "#ffffff", strokeWidth: 2 }}
                        />
                      ) : (
                        <Bar
                          yAxisId="usersAxis"
                          dataKey="new_users"
                          name="New Users"
                          fill="#a855f7"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={28}
                          opacity={0.85}
                        />
                      )}

                      {/* Deposit Flow Visual */}
                      {metricMode === "cumulative" ? (
                        <Area
                          yAxisId="depositsAxis"
                          type="monotone"
                          dataKey="cumulative_deposits"
                          name="Total Inflow (USDT)"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#emeraldGrad)"
                          dot={{ r: 3, fill: "#10b981", strokeWidth: 1, stroke: "#ffffff" }}
                          activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                        />
                      ) : (
                        <Area
                          yAxisId="depositsAxis"
                          type="monotone"
                          dataKey="approved_deposits"
                          name="Approved Deposits"
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#emeraldGrad)"
                          dot={{ r: 2.5, fill: "#10b981" }}
                          activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                        />
                      )}
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VIEW 2: DEPOSIT INFLOWS & CAPITAL OVER TIME */}
            {activeView === "deposits" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-ex-text">Deposit Capital Inflows</span>
                    <span className="text-ex-muted ml-2">
                      USDT volume breakdown across approved, pending, and total submitted transactions
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Approved
                    </span>
                    <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pending Review
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      Cumulative Inflow
                    </span>
                  </div>
                </div>

                <div className="h-[360px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                      <BarChart
                        data={timeSeries}
                        margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} vertical={false} />
                        <XAxis
                          dataKey="formatted_date"
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          dy={8}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${formatCompact(v)}`}
                        />
                        <Tooltip content={<CustomChartTooltip />} />
                        <Bar
                          dataKey={metricMode === "cumulative" ? "cumulative_deposits" : "approved_deposits"}
                          name="Approved Deposits"
                          fill="#10b981"
                          radius={[4, 4, 0, 0]}
                          maxBarSize={32}
                        />
                        {metricMode === "interval" && (
                          <Bar
                            dataKey="pending_deposits"
                            name="Pending Deposits"
                            fill="#f59e0b"
                            radius={[4, 4, 0, 0]}
                            maxBarSize={32}
                          />
                        )}
                      </BarChart>
                    ) : (
                      <AreaChart
                        data={timeSeries}
                        margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                      >
                        <defs>
                          <linearGradient id="depGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="pendingGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} vertical={false} />
                        <XAxis
                          dataKey="formatted_date"
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          dy={8}
                        />
                        <YAxis
                          stroke="#71717a"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `$${formatCompact(v)}`}
                        />
                        <Tooltip content={<CustomChartTooltip />} />

                        <Area
                          type="monotone"
                          dataKey={metricMode === "cumulative" ? "cumulative_deposits" : "approved_deposits"}
                          name={metricMode === "cumulative" ? "Total Inflow" : "Approved Deposits"}
                          stroke="#10b981"
                          strokeWidth={2.5}
                          fill="url(#depGrad)"
                          dot={{ r: 2.5, fill: "#10b981" }}
                          activeDot={{ r: 6, fill: "#10b981", stroke: "#ffffff", strokeWidth: 2 }}
                        />

                        {metricMode === "interval" && (
                          <Area
                            type="monotone"
                            dataKey="pending_deposits"
                            name="Pending Review"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            fill="url(#pendingGrad)"
                            dot={{ r: 2, fill: "#f59e0b" }}
                          />
                        )}
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VIEW 3: USER REGISTRATIONS & ONBOARDING TRENDS */}
            {activeView === "users" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-ex-text">Investor Onboarding Curve</span>
                    <span className="text-ex-muted ml-2">
                      New signups, cumulative investor accounts, and verified KYC compliance
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-purple-500" />
                      New Signups
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      KYC Verified
                    </span>
                    <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                      <span className="h-2 w-2 rounded-full bg-sky-500" />
                      Total Cumulative Base
                    </span>
                  </div>
                </div>

                <div className="h-[360px] w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={timeSeries}
                      margin={{ top: 10, right: 20, left: 10, bottom: 25 }}
                    >
                      <defs>
                        <linearGradient id="userAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#a855f7" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="kycGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" opacity={0.4} vertical={false} />
                      <XAxis
                        dataKey="formatted_date"
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        dy={8}
                      />
                      <YAxis
                        stroke="#71717a"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomChartTooltip />} />

                      {metricMode === "cumulative" ? (
                        <Area
                          type="monotone"
                          dataKey="cumulative_users"
                          name="Total Registered Users"
                          stroke="#c084fc"
                          strokeWidth={2.5}
                          fill="url(#userAreaGrad)"
                          dot={{ r: 3, fill: "#c084fc" }}
                          activeDot={{ r: 6, fill: "#c084fc", stroke: "#ffffff", strokeWidth: 2 }}
                        />
                      ) : (
                        <>
                          <Area
                            type="monotone"
                            dataKey="new_users"
                            name="New Registrations"
                            stroke="#a855f7"
                            strokeWidth={2.5}
                            fill="url(#userAreaGrad)"
                            dot={{ r: 3, fill: "#a855f7" }}
                            activeDot={{ r: 6, fill: "#a855f7", stroke: "#ffffff", strokeWidth: 2 }}
                          />
                          <Area
                            type="monotone"
                            dataKey="kyc_verified"
                            name="KYC Verified"
                            stroke="#0ea5e9"
                            strokeWidth={2}
                            fill="url(#kycGrad)"
                            dot={{ r: 2, fill: "#0ea5e9" }}
                          />
                        </>
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* VIEW 4: NETWORK & ASSET DISTRIBUTIONS */}
            {activeView === "distributions" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* 1. Deposit Volume by Blockchain Network */}
                <div className="rounded-xl border border-white/8 bg-black/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ex-text">Deposit Volume by Blockchain</span>
                    <span className="text-[11px] text-ex-muted">USDT Protocol Share</span>
                  </div>

                  <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={networkBreakdown}
                          dataKey="volume"
                          nameKey="network"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          stroke="#18181b"
                          strokeWidth={2}
                        >
                          {networkBreakdown.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center KPI in Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-ex-muted uppercase font-bold tracking-wider">
                        Total Volume
                      </span>
                      <span className="text-sm font-extrabold text-ex-text">
                        ${formatCompact(summary.total_approved_deposits || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Network Legend Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/6 text-xs">
                    {networkBreakdown.map((n) => (
                      <div key={n.network} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: n.color }} />
                          <span className="font-bold text-ex-text">{n.network}</span>
                        </div>
                        <span className="font-mono font-semibold text-ex-muted">{n.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 2. Capital Inflow by Investment Tier */}
                <div className="rounded-xl border border-white/8 bg-black/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ex-text">Capital Share by Investment Tier</span>
                    <span className="text-[11px] text-ex-muted">Package Popularity</span>
                  </div>

                  <div className="h-64 w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Pie
                          data={planBreakdown}
                          dataKey="volume"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          paddingAngle={4}
                          stroke="#18181b"
                          strokeWidth={2}
                        >
                          {planBreakdown.map((entry, index) => (
                            <Cell key={`cell-plan-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Center KPI in Donut */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] text-ex-muted uppercase font-bold tracking-wider">
                        Invested
                      </span>
                      <span className="text-sm font-extrabold text-purple-300">
                        ${formatCompact(planBreakdown.reduce((sum, p) => sum + p.volume, 0))}
                      </span>
                    </div>
                  </div>

                  {/* Plan Legend Breakdown */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/6 text-xs">
                    {planBreakdown.map((p) => (
                      <div key={p.key} className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02]">
                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="font-bold text-ex-text truncate">{p.name?.split(" ")?.[0] || p.key || "Plan"}</span>
                        </div>
                        <span className="font-mono font-semibold text-ex-muted">{p.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </EasyXCard>
    </section>
  );
}
