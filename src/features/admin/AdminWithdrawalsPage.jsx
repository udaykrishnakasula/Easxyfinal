import React, { useMemo, useState } from "react";
import { ArrowUpFromLine, Check, X, Send } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { useAdminWithdrawals, useWithdrawalAction } from "./adminApi";
import { apiError } from "@/lib/api";
import {
  PageHeading, EasyXCard, EasyXButton, EasyXLoader, EasyXTable,
  EasyXStatusBadge, EasyXEmptyState, EasyXModal,
} from "@/design/EasyX";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "paid", label: "Paid" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("pending");
  const { data, isLoading } = useAdminWithdrawals({ status });
  const action = useWithdrawalAction();

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processTarget, setProcessTarget] = useState(null);
  const [txHash, setTxHash] = useState("");

  const rows = data || [];
  const columns = useMemo(() => ["User", "Amount", "Destination", "Status", "Requested", "Actions"], []);

  const approve = async (w) => {
    try {
      await action.mutateAsync({ id: w.id, action: "approve" });
      toast.success("Withdrawal approved");
    } catch (err) {
      toast.error(apiError(err, "Could not approve"));
    }
  };

  const doReject = async () => {
    if (rejectReason.trim().length < 3) {
      toast.error("Please provide a reason.");
      return;
    }
    try {
      await action.mutateAsync({ id: rejectTarget.id, action: "reject", body: { reason: rejectReason.trim() } });
      toast.success("Withdrawal rejected — amount returned to user");
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      toast.error(apiError(err, "Could not reject"));
    }
  };

  const doProcess = async () => {
    if (txHash.trim().length < 8) {
      toast.error("Enter a valid transaction hash.");
      return;
    }
    try {
      await action.mutateAsync({ id: processTarget.id, action: "process", body: { tx_hash: txHash.trim() } });
      toast.success("Withdrawal marked as paid");
      setProcessTarget(null);
      setTxHash("");
    } catch (err) {
      toast.error(apiError(err, "Could not process"));
    }
  };

  return (
    <div data-testid="admin-withdrawals-page">
      <PageHeading title="Withdrawals" subtitle="Approve, reject and process on-chain withdrawals." icon={ArrowUpFromLine} />

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button key={f.key || "all"} onClick={() => setStatus(f.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${status === f.key ? "bg-ex-accent text-ex-ink" : "bg-white/5 text-ex-muted hover:bg-white/10"}`}
            data-testid={`wd-filter-${f.key || "all"}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <EasyXLoader />
      ) : rows.length === 0 ? (
        <div className="mt-5"><EasyXEmptyState icon={ArrowUpFromLine} title="No withdrawals" note="Nothing in this view." /></div>
      ) : (
        <div className="mt-5">
          <EasyXTable columns={columns}>
            {rows.map((w) => (
              <tr key={w.id} data-testid={`wd-row-${w.id}`} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium text-ex-text">{w.user?.name || "—"}</div>
                  <div className="text-[11px] text-ex-muted">{w.user?.email}</div>
                </td>
                <td className="px-4 py-3 text-ex-text">{money(w.amount)} USDT<div className="text-[11px] text-ex-muted">{w.network}</div></td>
                <td className="px-4 py-3">
                  <div className="truncate max-w-[180px] text-[11px] text-ex-muted">{w.to_address}</div>
                  {w.tx_hash && <div className="truncate max-w-[180px] text-[11px] text-emerald-300">TX: {w.tx_hash}</div>}
                </td>
                <td className="px-4 py-3"><EasyXStatusBadge status={w.status} /></td>
                <td className="px-4 py-3 text-ex-muted whitespace-nowrap">{dayjs(w.created_at).format("DD MMM, HH:mm")}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {w.status === "pending" && (
                      <>
                        <button onClick={() => approve(w)} data-testid={`wd-approve-${w.id}`}
                          className="inline-flex items-center gap-1 rounded-ex-ctrl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => { setRejectTarget(w); setRejectReason(""); }} data-testid={`wd-reject-open-${w.id}`}
                          className="inline-flex items-center gap-1 rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20">
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {w.status === "approved" && (
                      <>
                        <button onClick={() => { setProcessTarget(w); setTxHash(""); }} data-testid={`wd-process-open-${w.id}`}
                          className="inline-flex items-center gap-1 rounded-ex-ctrl border border-ex-accent/40 bg-ex-accent/10 px-2.5 py-1.5 text-xs font-medium text-ex-accent hover:bg-ex-accent/20">
                          <Send className="h-3.5 w-3.5" /> Process
                        </button>
                        <button onClick={() => { setRejectTarget(w); setRejectReason(""); }} data-testid={`wd-reject-open-${w.id}`}
                          className="inline-flex items-center gap-1 rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20">
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {(w.status === "paid" || w.status === "rejected") && <span className="text-[11px] text-ex-muted">—</span>}
                  </div>
                </td>
              </tr>
            ))}
          </EasyXTable>
        </div>
      )}

      <EasyXModal open={!!rejectTarget} onOpenChange={(o) => { if (!o) setRejectTarget(null); }}
        title="Reject withdrawal"
        description={rejectTarget ? `The held ${money(rejectTarget.amount)} USDT will be returned to ${rejectTarget.user?.email}'s wallet.` : ""}
        testId="wd-reject-modal"
        footer={
          <div className="flex gap-2">
            <EasyXButton variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</EasyXButton>
            <EasyXButton className="!bg-red-500 !text-white hover:!bg-red-600" loading={action.isPending} onClick={doReject} data-testid="wd-reject-confirm">Confirm reject</EasyXButton>
          </div>
        }>
        <label className="text-xs text-ex-muted">Reason (required)</label>
        <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
          className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
          data-testid="wd-reject-reason" />
      </EasyXModal>

      <EasyXModal open={!!processTarget} onOpenChange={(o) => { if (!o) setProcessTarget(null); }}
        title="Process withdrawal"
        description={processTarget ? `Mark ${money(processTarget.amount)} USDT (${processTarget.network}) as sent. Enter the on-chain transaction hash.` : ""}
        testId="wd-process-modal"
        footer={
          <div className="flex gap-2">
            <EasyXButton variant="secondary" onClick={() => setProcessTarget(null)}>Cancel</EasyXButton>
            <EasyXButton loading={action.isPending} onClick={doProcess} data-testid="wd-process-confirm">Mark as paid</EasyXButton>
          </div>
        }>
        <label className="text-xs text-ex-muted">Blockchain transaction hash</label>
        <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="0x..."
          className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
          data-testid="wd-process-txhash" />
      </EasyXModal>
    </div>
  );
}
