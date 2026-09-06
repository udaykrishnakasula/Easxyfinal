import React, { useState } from "react";
import { Inbox, Check, X } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminDeposits,
  useApproveDeposit,
  useRejectDeposit,
} from "./adminApi";
import { money } from "@/features/dashboard/api";
import { apiError } from "@/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
  EasyXStatusBadge,
  EasyXModal,
} from "@/design/EasyX";

const FILTERS = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "", label: "All" },
];

export default function AdminDepositsPage() {
  const [filter, setFilter] = useState("pending");
  const { data: deposits, isLoading } = useAdminDeposits(filter);
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();

  const [modal, setModal] = useState(null); // { type: 'approve'|'reject', deposit }
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const openApprove = (d) => {
    setModal({ type: "approve", deposit: d });
    setAmount(String(d.amount));
    setNote("");
  };
  const openReject = (d) => {
    setModal({ type: "reject", deposit: d });
    setNote("");
  };
  const close = () => setModal(null);

  const doApprove = async () => {
    try {
      await approve.mutateAsync({ id: modal.deposit.id, approved_amount: amount, note });
      toast.success(`Deposit approved — ${money(amount)} credited`);
      close();
    } catch (e) {
      toast.error(apiError(e, "Could not approve deposit"));
    }
  };
  const doReject = async () => {
    try {
      await reject.mutateAsync({ id: modal.deposit.id, note });
      toast.success("Deposit rejected");
      close();
    } catch (e) {
      toast.error(apiError(e, "Could not reject deposit"));
    }
  };

  return (
    <div data-testid="admin-deposits-page">
      <PageHeading title="Deposits" subtitle="Manually verify user USDT deposits." icon={Inbox} />

      <div className="mt-5 inline-flex rounded-ex-ctrl bg-white/5 p-1" data-testid="admin-deposit-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key || "all"}
            onClick={() => setFilter(f.key)}
            data-testid={`admin-filter-${f.key || "all"}`}
            className={`px-4 py-2 rounded-ex-ctrl text-sm font-medium transition ${
              filter === f.key ? "bg-ex-accent text-ex-ink shadow-ex-btn" : "text-ex-muted hover:text-ex-text"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {isLoading ? (
          <EasyXLoader />
        ) : !deposits || deposits.length === 0 ? (
          <EasyXEmptyState icon={Inbox} title="No deposits" note="Nothing to review in this view." />
        ) : (
          <div className="space-y-3">
            {deposits.map((d) => (
              <EasyXCard key={d.id} className="p-4" data-testid={`admin-deposit-${d.id}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="ex-display text-lg font-bold text-ex-text">{money(d.amount)} USDT</span>
                      <span className="text-xs text-ex-muted">· {d.network}</span>
                      <EasyXStatusBadge status={d.status} />
                    </div>
                    <div className="mt-1 text-xs text-ex-muted">
                      {d.user?.name || "—"} · {d.user?.email || d.user_id}
                    </div>
                    <div className="mt-1 break-all text-[11px] text-ex-muted">
                      tx: {d.tx_hash}
                    </div>
                    <div className="text-[11px] text-ex-muted">{dayjs(d.created_at).format("DD MMM YYYY, HH:mm")}</div>
                    {d.status === "approved" && d.approved_amount && (
                      <div className="mt-1 text-[11px] text-emerald-300">credited {money(d.approved_amount)}</div>
                    )}
                    {d.admin_note && <div className="mt-1 text-[11px] text-ex-muted">note: {d.admin_note}</div>}
                  </div>

                  {d.status === "pending" && (
                    <div className="flex gap-2">
                      <EasyXButton variant="accent" className="h-9 px-3" onClick={() => openApprove(d)} data-testid={`admin-approve-${d.id}`}>
                        <Check className="mr-1 h-4 w-4" /> Approve
                      </EasyXButton>
                      <EasyXButton variant="ghost" className="h-9 px-3" onClick={() => openReject(d)} data-testid={`admin-reject-${d.id}`}>
                        <X className="mr-1 h-4 w-4" /> Reject
                      </EasyXButton>
                    </div>
                  )}
                </div>
              </EasyXCard>
            ))}
          </div>
        )}
      </div>

      {/* Approve modal */}
      <EasyXModal
        open={modal?.type === "approve"}
        onOpenChange={(o) => !o && close()}
        title="Approve deposit"
        description="Credit the exact received amount to the user's wallet."
        testId="admin-approve-modal"
        footer={
          <div className="flex w-full gap-2">
            <EasyXButton variant="ghost" className="flex-1" onClick={close}>Cancel</EasyXButton>
            <EasyXButton variant="accent" className="flex-1" onClick={doApprove} loading={approve.isPending} data-testid="admin-approve-confirm">
              Approve & credit
            </EasyXButton>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-ex-muted">Amount to credit (USDT)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
              data-testid="admin-approve-amount"
            />
            <p className="mt-1 text-[11px] text-ex-muted">Defaults to the amount the user submitted ({money(modal?.deposit?.amount || 0)}).</p>
          </div>
          <div>
            <label className="text-xs text-ex-muted">Note (optional)</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
            />
          </div>
        </div>
      </EasyXModal>

      {/* Reject modal */}
      <EasyXModal
        open={modal?.type === "reject"}
        onOpenChange={(o) => !o && close()}
        title="Reject deposit"
        description="No funds will be credited to the user."
        testId="admin-reject-modal"
        footer={
          <div className="flex w-full gap-2">
            <EasyXButton variant="ghost" className="flex-1" onClick={close}>Cancel</EasyXButton>
            <EasyXButton variant="primary" className="flex-1" onClick={doReject} loading={reject.isPending} data-testid="admin-reject-confirm">
              Reject deposit
            </EasyXButton>
          </div>
        }
      >
        <div>
          <label className="text-xs text-ex-muted">Reason (optional)</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. transaction not found on-chain"
            className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
          />
        </div>
      </EasyXModal>
    </div>
  );
}
