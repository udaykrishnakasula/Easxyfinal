import React, { useMemo, useState } from "react";
import { PiggyBank, Search, XCircle } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { useAdminInvestments, useCancelInvestment } from "./adminApi";
import { apiError } from "@/lib/api";
import {
  PageHeading, EasyXCard, EasyXButton, EasyXLoader, EasyXTable,
  EasyXStatusBadge, EasyXEmptyState, EasyXModal,
} from "@/design/EasyX";

const FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "matured", label: "Matured" },
  { key: "cancelled", label: "Cancelled" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0";
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
  const columns = useMemo(() => ["Investor", "Plan", "Principal", "Status", "Started", "Action"], []);

  const openCancel = (inv) => {
    setTarget(inv);
    setRefund(inv.principal);
    setReason("");
  };

  const doCancel = async () => {
    const refundNum = parseFloat(refund);
    const principalNum = parseFloat(target.principal);
    if (isNaN(refundNum) || refundNum < 0 || refundNum > principalNum) {
      toast.error(`Refund must be between 0 and ${money(principalNum)} USDT`);
      return;
    }
    if (reason.trim().length < 3) {
      toast.error("Please provide a cancellation reason.");
      return;
    }
    try {
      await cancel.mutateAsync({ id: target.id, refund_amount: String(refund), reason: reason.trim() });
      toast.success("Investment cancelled");
      setTarget(null);
    } catch (err) {
      toast.error(apiError(err, "Could not cancel investment"));
    }
  };

  return (
    <div data-testid="admin-investments-page">
      <PageHeading title="Investments" subtitle="View and cancel investments. Cancelling refunds a chosen amount; profit is never paid." icon={PiggyBank} />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.key || "all"} onClick={() => setStatus(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${status === f.key ? "bg-ex-accent text-ex-ink" : "bg-white/5 text-ex-muted hover:bg-white/10"}`}
              data-testid={`inv-filter-${f.key || "all"}`}>
              {f.label}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); }} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search investor name or email"
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
            data-testid="inv-search-input" />
        </form>
      </div>

      {isLoading ? (
        <EasyXLoader />
      ) : rows.length === 0 ? (
        <div className="mt-5"><EasyXEmptyState icon={PiggyBank} title="No investments found" note="Try a different filter." /></div>
      ) : (
        <div className="mt-5">
          <EasyXTable columns={columns}>
            {rows.map((inv) => (
              <tr key={inv.id} data-testid={`inv-row-${inv.id}`} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium text-ex-text">{inv.user?.name || "—"}</div>
                  <div className="text-[11px] text-ex-muted">{inv.user?.email}</div>
                </td>
                <td className="px-4 py-3 text-ex-text">{inv.plan_name}</td>
                <td className="px-4 py-3 text-ex-text">{money(inv.principal)} USDT</td>
                <td className="px-4 py-3">
                  <EasyXStatusBadge status={inv.status} />
                  {inv.status === "cancelled" && inv.refund_amount != null && (
                    <div className="mt-1 text-[11px] text-ex-muted">refunded {money(inv.refund_amount)}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-ex-muted whitespace-nowrap">{inv.start_at ? dayjs(inv.start_at).format("DD MMM YYYY") : "—"}</td>
                <td className="px-4 py-3">
                  {inv.status === "active" ? (
                    <button onClick={() => openCancel(inv)}
                      className="inline-flex items-center gap-1.5 rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      data-testid={`inv-cancel-open-${inv.id}`}>
                      <XCircle className="h-3.5 w-3.5" /> Cancel
                    </button>
                  ) : (
                    <span className="text-[11px] text-ex-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </EasyXTable>
        </div>
      )}

      <EasyXModal
        open={!!target}
        onOpenChange={(o) => { if (!o) setTarget(null); }}
        title="Cancel investment"
        description={target ? `Cancelling ${target.user?.email}'s ${target.plan_name} investment (principal ${money(target.principal)} USDT). Profit is never paid. Any referral commission already paid is not reversed.` : ""}
        testId="inv-cancel-modal"
        footer={
          <div className="flex gap-2">
            <EasyXButton variant="secondary" onClick={() => setTarget(null)}>Keep investment</EasyXButton>
            <EasyXButton className="!bg-red-500 !text-white hover:!bg-red-600" loading={cancel.isPending} onClick={doCancel} data-testid="inv-cancel-confirm">
              Confirm cancellation
            </EasyXButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ex-muted">Refund amount (USDT) — 0 up to principal</label>
            <input type="number" step="0.01" min="0" max={target?.principal} value={refund} onChange={(e) => setRefund(e.target.value)}
              className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
              data-testid="inv-cancel-refund" />
          </div>
          <div>
            <label className="text-xs text-ex-muted">Cancellation reason (required)</label>
            <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
              data-testid="inv-cancel-reason" />
          </div>
        </div>
      </EasyXModal>
    </div>
  );
}
