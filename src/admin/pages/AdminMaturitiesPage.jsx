import React, { useMemo, useState } from "react";
import {
  CalendarClock,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  XCircle,
  Timer,
  Lock,
} from "lucide-react";
import dayjs from "dayjs";
import { useAdminInvestments } from "@/admin/adminApi";
import {
  PageHeading,
  EasyXCard,
  EasyXLoader,
  EasyXTable,
  EasyXStatusBadge,
  EasyXEmptyState,
} from "@/design/EasyX";

const MATURITY_FILTERS = [
  { key: "all", label: "All Records" },
  { key: "maturing_soon", label: "Maturing Soon (≤ 7 Days)" },
  { key: "matured", label: "Matured" },
  { key: "active", label: "Active" },
  { key: "cancelled", label: "Cancelled" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminMaturitiesPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  const { data, isLoading } = useAdminInvestments({ q });
  const allRows = data || [];

  // Categorize and filter rows
  const { filteredRows, metrics } = useMemo(() => {
    const now = Date.now();

    const activeList = allRows.filter((i) => i.status === "active");
    const maturedList = allRows.filter((i) => i.status === "matured");
    const cancelledList = allRows.filter((i) => i.status === "cancelled");

    // Maturing soon = active and maturity_at within 7 days
    const maturingSoonList = activeList.filter((i) => {
      if (!i.maturity_at) return false;
      const diffMs = new Date(i.maturity_at).getTime() - now;
      const diffDays = diffMs / 86400000;
      return diffDays >= 0 && diffDays <= 7;
    });

    let result = allRows;
    if (filter === "maturing_soon") {
      result = maturingSoonList;
    } else if (filter === "matured") {
      result = maturedList;
    } else if (filter === "active") {
      result = activeList;
    } else if (filter === "cancelled") {
      result = cancelledList;
    }

    // Sort: if maturing soon or active, sort by nearest maturity date
    result = [...result].sort((a, b) => {
      if (a.status === "active" && b.status === "active") {
        return new Date(a.maturity_at || 0).getTime() - new Date(b.maturity_at || 0).getTime();
      }
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    const maturingSoonPayout = maturingSoonList.reduce(
      (sum, i) => sum + Number(i.maturity_amount || 0),
      0
    );
    const maturedPayout = maturedList.reduce(
      (sum, i) => sum + Number(i.maturity_amount || 0),
      0
    );
    const activePayout = activeList.reduce(
      (sum, i) => sum + Number(i.maturity_amount || 0),
      0
    );

    return {
      filteredRows: result,
      metrics: {
        total: allRows.length,
        maturingSoonCount: maturingSoonList.length,
        maturingSoonPayout,
        maturedCount: maturedList.length,
        maturedPayout,
        activeCount: activeList.length,
        activePayout,
        cancelledCount: cancelledList.length,
      },
    };
  }, [allRows, filter]);

  const columns = useMemo(
    () => [
      "Investment ID",
      "User / Investor",
      "Plan",
      "Principal",
      "Profit",
      "Maturity Payout",
      "Purchase Date",
      "Maturity Date",
      "Countdown / Status",
      "Maturity Mode",
    ],
    []
  );

  return (
    <div className="space-y-6" data-testid="admin-maturities-page">
      <PageHeading
        title="Maturity Lifecycle Management"
        subtitle="Monitor automatic maturity executions, track contracts maturing soon, and audit payout schedules."
        icon={CalendarClock}
      />

      {/* System Notice regarding automated maturity as Source of Truth */}
      <div className="rounded-ex border border-ex-lav-400/30 bg-ex-lav-400/10 p-4 text-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-ex-lav-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-ex-text flex items-center gap-2">
              <span>Automatic Maturity Engine — Source of Truth</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE &amp; AUTOMATED
              </span>
            </div>
            <p className="text-ex-muted text-[11px] leading-relaxed">
              Maturity payouts (principal + fixed profit yield) are executed automatically by the background engine exactly when each 60-day term elapses. Manual maturity overrides are strictly locked to prevent duplicate credits and preserve deterministic audit trails.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Maturing Soon */}
        <EasyXCard
          className={`p-4 cursor-pointer transition border ${
            filter === "maturing_soon" ? "border-amber-400/50 bg-amber-400/5" : "hover:border-white/20"
          }`}
          onClick={() => setFilter("maturing_soon")}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">
              Maturing Soon
            </span>
            <Timer className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-maturing-soon-count">
            {metrics.maturingSoonCount}
          </div>
          <div className="text-[11px] text-amber-300/80 mt-0.5 font-mono">
            ${money(metrics.maturingSoonPayout)} due ≤ 7d
          </div>
        </EasyXCard>

        {/* Matured */}
        <EasyXCard
          className={`p-4 cursor-pointer transition border ${
            filter === "matured" ? "border-emerald-500/50 bg-emerald-500/5" : "hover:border-white/20"
          }`}
          onClick={() => setFilter("matured")}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
              Matured
            </span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-matured-total-count">
            {metrics.maturedCount}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">
            ${money(metrics.maturedPayout)} settled
          </div>
        </EasyXCard>

        {/* Active */}
        <EasyXCard
          className={`p-4 cursor-pointer transition border ${
            filter === "active" ? "border-ex-lav-400/50 bg-ex-lav-400/5" : "hover:border-white/20"
          }`}
          onClick={() => setFilter("active")}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-ex-lav-300 uppercase tracking-wider">
              Active
            </span>
            <Clock className="h-4 w-4 text-ex-lav-300" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-active-total-count">
            {metrics.activeCount}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5 font-mono">
            ${money(metrics.activePayout)} future payout
          </div>
        </EasyXCard>

        {/* Cancelled */}
        <EasyXCard
          className={`p-4 cursor-pointer transition border ${
            filter === "cancelled" ? "border-red-500/50 bg-red-500/5" : "hover:border-white/20"
          }`}
          onClick={() => setFilter("cancelled")}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-red-300 uppercase tracking-wider">
              Cancelled
            </span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-cancelled-total-count">
            {metrics.cancelledCount}
          </div>
          <div className="text-[11px] text-red-400/80 mt-0.5">voided / refunded</div>
        </EasyXCard>
      </div>

      {/* Filter Chips & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {MATURITY_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f.key
                  ? "bg-ex-accent text-ex-ink"
                  : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-white"
              }`}
              data-testid={`maturity-filter-${f.key}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(search.trim());
          }}
          className="relative w-full sm:w-80"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user name or email..."
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
            data-testid="maturity-search-input"
          />
        </form>
      </div>

      {/* Table */}
      {isLoading ? (
        <EasyXLoader />
      ) : filteredRows.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState
            icon={CalendarClock}
            title="No investments found"
            note={
              q
                ? `No maturity records matching "${q}".`
                : "No investments in this maturity category."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-ex border border-white/10 bg-white/[0.02]">
          <EasyXTable columns={columns}>
            {filteredRows.map((inv) => {
              const startFormatted = inv.start_at || inv.created_at
                ? dayjs(inv.start_at || inv.created_at).format("DD MMM YYYY")
                : "—";
              const maturityFormatted = inv.maturity_at
                ? dayjs(inv.maturity_at).format("DD MMM YYYY")
                : "—";

              const isMaturingSoon =
                inv.status === "active" &&
                inv.remaining_days != null &&
                inv.remaining_days <= 7;

              return (
                <tr
                  key={inv.id}
                  data-testid={`maturity-row-${inv.id}`}
                  className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                    isMaturingSoon ? "bg-amber-500/[0.03]" : ""
                  }`}
                >
                  {/* Investment ID */}
                  <td className="px-4 py-3.5 font-mono text-xs text-ex-lav-300">
                    <span title={inv.id}>#{String(inv.id).slice(0, 8)}</span>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-xs text-ex-text">
                      {inv.user?.name || "Investor"}
                    </div>
                    <div className="text-[11px] font-mono text-ex-muted">{inv.user?.email || "—"}</div>
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-white/5 text-ex-text border border-white/10">
                      {inv.plan_name}
                    </span>
                  </td>

                  {/* Principal */}
                  <td className="px-4 py-3.5 text-xs font-mono font-semibold text-ex-text">
                    ${money(inv.principal)}
                  </td>

                  {/* Profit */}
                  <td className="px-4 py-3.5 text-xs font-mono font-semibold text-emerald-400">
                    +${money(inv.profit_amount)}
                  </td>

                  {/* Maturity Amount */}
                  <td className="px-4 py-3.5 text-xs font-mono font-bold text-ex-accent">
                    ${money(inv.maturity_amount)}
                  </td>

                  {/* Purchase Date */}
                  <td className="px-4 py-3.5 text-xs text-ex-muted whitespace-nowrap">
                    {startFormatted}
                  </td>

                  {/* Maturity Date */}
                  <td className="px-4 py-3.5 text-xs text-ex-muted whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-ex-lav-300 shrink-0" />
                      <span>{maturityFormatted}</span>
                    </div>
                  </td>

                  {/* Countdown / Status */}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <EasyXStatusBadge status={inv.status} />
                      {inv.status === "active" && (
                        <span
                          className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded ${
                            isMaturingSoon
                              ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                              : "bg-white/5 text-ex-lav-300"
                          }`}
                        >
                          {inv.remaining_days}d left
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Maturity Mode */}
                  <td className="px-4 py-3.5 text-right">
                    {inv.status === "matured" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> Auto-Settled
                      </span>
                    ) : inv.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ex-muted bg-white/5 px-2 py-0.5 rounded border border-white/10">
                        <Lock className="h-3 w-3 text-ex-lav-300" /> Automated Cron
                      </span>
                    ) : (
                      <span className="text-xs text-ex-muted">Cancelled</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </EasyXTable>
        </div>
      )}
    </div>
  );
}
