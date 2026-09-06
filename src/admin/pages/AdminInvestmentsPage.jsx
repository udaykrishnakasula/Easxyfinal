import React, { useMemo, useState } from "react";
import { PiggyBank, Search, XCircle, Clock, Calendar, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { useAdminInvestments, useCancelInvestment } from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXTable,
  EasyXStatusBadge,
  EasyXEmptyState,
  EasyXModal,
} from "@/design/EasyX";

const FILTERS = [
  { key: "", label: "All Investments" },
  { key: "active", label: "Active" },
  { key: "matured", label: "Matured" },
  { key: "cancelled", label: "Cancelled" },
];

const PLANS_CONFIG = [
  { name: "Silver", price: "$300", days: "60 days", returnPct: "60%", payout: "$480", badge: "bg-slate-400/20 text-slate-300 border-slate-400/30" },
  { name: "Gold", price: "$1,000", days: "60 days", returnPct: "60%", payout: "$1,600", badge: "bg-amber-400/20 text-amber-300 border-amber-400/30" },
  { name: "Platinum", price: "$5,000", days: "60 days", returnPct: "100%", payout: "$10,000", badge: "bg-purple-400/20 text-purple-300 border-purple-400/30" },
  { name: "Diamond", price: "$10,000", days: "60 days", returnPct: "100%", payout: "$20,000", badge: "bg-cyan-400/20 text-cyan-300 border-cyan-400/30" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminInvestmentsPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useAdminInvestments({ status, q });
  const cancel = useCancelInvestment();

  const [target, setTarget] = useState(null);
  const [refund, setRefund] = useState("");
  const [reason, setReason] = useState("");

  const rows = data || [];

  // Summary Metrics
  const metrics = useMemo(() => {
    const all = rows;
    const active = all.filter((i) => i.status === "active");
    const matured = all.filter((i) => i.status === "matured");
    const cancelled = all.filter((i) => i.status === "cancelled");

    const totalPrincipal = all.reduce((sum, i) => sum + Number(i.principal || 0), 0);
    const activePrincipal = active.reduce((sum, i) => sum + Number(i.principal || 0), 0);
    const totalProfitExpected = active.reduce((sum, i) => sum + Number(i.profit_amount || 0), 0);
    const totalRefunded = cancelled.reduce((sum, i) => sum + Number(i.refund_amount || 0), 0);

    return {
      totalCount: all.length,
      activeCount: active.length,
      maturedCount: matured.length,
      cancelledCount: cancelled.length,
      totalPrincipal,
      activePrincipal,
      totalProfitExpected,
      totalRefunded,
    };
  }, [rows]);

  const columns = useMemo(
    () => [
      "Investment ID",
      "User / Investor",
      "Plan",
      "Principal",
      "Profit",
      "Purchase Date",
      "Maturity Date",
      "Status",
      "Action",
    ],
    []
  );

  const openCancel = (inv) => {
    setTarget(inv);
    setRefund(inv.principal);
    setReason("");
  };

  const doCancel = async () => {
    if (!target) return;
    const refundNum = parseFloat(refund);
    const principalNum = parseFloat(target.principal);
    if (isNaN(refundNum) || refundNum < 0 || refundNum > principalNum) {
      toast.error(`Refund must be between $0.00 and $${money(principalNum)} USDT`);
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Please provide a valid cancellation reason.");
      return;
    }
    try {
      await cancel.mutateAsync({
        id: target.id,
        refund_amount: String(refundNum),
        reason: reason.trim(),
      });
      toast.success(`Investment cancelled. $${money(refundNum)} USDT refunded.`);
      setTarget(null);
    } catch (err) {
      toast.error(apiError(err, "Could not cancel investment"));
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-investments-page">
      <PageHeading
        title="Investment Management"
        subtitle="View all user investments, track lock periods, and handle administrative cancellations."
        icon={PiggyBank}
      />

      {/* Plan Reference Grid */}
      <div className="rounded-ex border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-ex-muted flex items-center gap-1.5">
            <PiggyBank className="h-3.5 w-3.5 text-ex-accent" /> Active Investment Plans
          </div>
          <span className="text-[11px] text-ex-muted">60-Day Fixed Term</span>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS_CONFIG.map((p) => (
            <div
              key={p.name}
              className="rounded-ex-ctrl border border-white/5 bg-white/[0.02] p-3 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${p.badge}`}>
                  {p.name}
                </span>
                <span className="text-xs font-mono font-bold text-ex-text">{p.price}</span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-xs">
                <span className="text-ex-muted">Yield ({p.returnPct}):</span>
                <span className="font-semibold text-emerald-400">+{money(Number(p.payout.replace(/[^0-9]/g, '')) - Number(p.price.replace(/[^0-9]/g, '')))} USDT</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-xs pt-1 border-t border-white/5">
                <span className="text-ex-muted font-medium">Maturity Return:</span>
                <span className="font-bold text-ex-text">{p.payout} USDT</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">Active Investments</div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-active-count">
            {metrics.activeCount}
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5">${money(metrics.activePrincipal)} locked</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">Expected Yield</div>
          <div className="mt-1.5 text-xl font-bold text-emerald-400" data-testid="metric-expected-profit">
            +${money(metrics.totalProfitExpected)}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5">profit on maturity</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">Matured Count</div>
          <div className="mt-1.5 text-xl font-bold text-ex-lav-300" data-testid="metric-matured-count">
            {metrics.maturedCount}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5">fully paid out</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">Cancelled / Refunded</div>
          <div className="mt-1.5 text-xl font-bold text-amber-300" data-testid="metric-cancelled-count">
            {metrics.cancelledCount}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5">${money(metrics.totalRefunded)} refunded</div>
        </EasyXCard>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                status === f.key
                  ? "bg-ex-accent text-ex-ink"
                  : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-white"
              }`}
              data-testid={`inv-filter-${f.key || "all"}`}
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
            placeholder="Search investor name or email..."
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
            data-testid="inv-search-input"
          />
        </form>
      </div>

      {/* Table */}
      {isLoading ? (
        <EasyXLoader />
      ) : rows.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState
            icon={PiggyBank}
            title="No investments found"
            note={q ? `No investments matching "${q}".` : "No investment records under this filter."}
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-ex border border-white/10 bg-white/[0.02]">
          <EasyXTable columns={columns}>
            {rows.map((inv) => {
              const startFormatted = inv.start_at || inv.created_at
                ? dayjs(inv.start_at || inv.created_at).format("DD MMM YYYY")
                : "—";
              const maturityFormatted = inv.maturity_at
                ? dayjs(inv.maturity_at).format("DD MMM YYYY")
                : "—";

              return (
                <tr
                  key={inv.id}
                  data-testid={`inv-row-${inv.id}`}
                  className="hover:bg-white/[0.02] border-b border-white/5 transition"
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
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold bg-white/5 text-ex-text border border-white/10">
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

                  {/* Purchase Date */}
                  <td className="px-4 py-3.5 text-xs text-ex-muted whitespace-nowrap">
                    {startFormatted}
                  </td>

                  {/* Maturity Date */}
                  <td className="px-4 py-3.5 text-xs text-ex-muted whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 text-ex-lav-300 shrink-0" />
                      <span>{maturityFormatted}</span>
                    </div>
                    {inv.status === "active" && inv.remaining_days != null && (
                      <span className="text-[10px] text-ex-lav-300 block mt-0.5 font-mono">
                        {inv.remaining_days} days remaining
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5">
                    <EasyXStatusBadge status={inv.status} />
                    {inv.status === "cancelled" && inv.refund_amount != null && (
                      <div className="mt-1 text-[10px] text-amber-300/90 font-mono">
                        Refunded: ${money(inv.refund_amount)}
                      </div>
                    )}
                    {inv.status === "cancelled" && inv.cancel_reason && (
                      <div className="text-[10px] text-ex-muted truncate max-w-[140px]" title={inv.cancel_reason}>
                        Reason: {inv.cancel_reason}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3.5 text-right">
                    {inv.status === "active" ? (
                      <button
                        onClick={() => openCancel(inv)}
                        className="inline-flex items-center gap-1.5 rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20 transition"
                        data-testid={`inv-cancel-open-${inv.id}`}
                      >
                        <XCircle className="h-3.5 w-3.5" /> Cancel
                      </button>
                    ) : (
                      <span className="text-xs text-ex-muted">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </EasyXTable>
        </div>
      )}

      {/* Cancellation Modal */}
      <EasyXModal
        open={!!target}
        onOpenChange={(o) => {
          if (!o) setTarget(null);
        }}
        title="Cancel Active Investment"
        description={
          target
            ? `Admin cancellation for ${target.user?.email || "user"}'s ${target.plan_name} plan.`
            : ""
        }
        testId="inv-cancel-modal"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <EasyXButton variant="secondary" onClick={() => setTarget(null)}>
              Keep Active
            </EasyXButton>
            <EasyXButton
              className="!bg-red-500 !text-white hover:!bg-red-600 font-bold"
              loading={cancel.isPending}
              onClick={doCancel}
              data-testid="inv-cancel-confirm"
            >
              Confirm Cancellation
            </EasyXButton>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Rules Banner */}
          <div className="rounded-ex bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-200/90 space-y-1">
            <div className="font-semibold text-amber-100 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" /> Cancellation Business Rules:
            </div>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-200/80">
              <li>Profit is <strong>NOT</strong> paid on cancellation.</li>
              <li>Refund amount must be between <strong>$0.00</strong> and original principal (<strong>${money(target?.principal)} USDT</strong>).</li>
              <li>Already-paid referral commission is <strong>NOT</strong> reversed.</li>
              <li>An immutable audit log and user notification will be created.</li>
            </ul>
          </div>

          <div>
            <label className="text-xs font-semibold text-ex-text flex items-center justify-between">
              <span>Refund Amount (USDT)</span>
              <span className="text-ex-muted font-normal">Max: ${money(target?.principal)} USDT</span>
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max={target?.principal}
                value={refund}
                onChange={(e) => setRefund(e.target.value)}
                placeholder="0.00"
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-xs font-mono text-ex-text focus:border-ex-accent focus:outline-none"
                data-testid="inv-cancel-refund"
              />
              <button
                type="button"
                onClick={() => setRefund(target?.principal || "0")}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-ex-text rounded-ex-ctrl border border-white/10 whitespace-nowrap"
              >
                Full Principal
              </button>
              <button
                type="button"
                onClick={() => setRefund("0")}
                className="px-3 py-1.5 text-xs font-medium bg-white/5 hover:bg-white/10 text-ex-text rounded-ex-ctrl border border-white/10 whitespace-nowrap"
              >
                $0 Refund
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-ex-text">
              Cancellation Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a clear operational reason for audit logs and user notice (e.g., Requested by user via ticket #402, compliance review, etc.)"
              className="mt-1.5 w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
              data-testid="inv-cancel-reason"
            />
          </div>
        </div>
      </EasyXModal>
    </div>
  );
}
