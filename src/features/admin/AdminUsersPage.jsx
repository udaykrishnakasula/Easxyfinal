import React, { useMemo, useState } from "react";
import { Users, Search, Ban, ShieldCheck, Wallet as WalletIcon } from "lucide-react";
import { toast } from "sonner";

import { useAdminUsers, useSuspendUser, useUnsuspendUser } from "./adminApi";
import { apiError } from "@/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXTable,
  EasyXBadge,
  EasyXEmptyState,
  EasyXModal,
} from "@/design/EasyX";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

function StatusPill({ status }) {
  const map = {
    active: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
    suspended: "bg-red-500/15 text-red-300 border border-red-500/30",
    banned: "bg-red-500/15 text-red-300 border border-red-500/30",
  };
  return (
    <EasyXBadge className={map[status] || "bg-white/10 text-white/60 border border-white/10"}>
      {(status || "").toUpperCase()}
    </EasyXBadge>
  );
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const { data, isLoading } = useAdminUsers({ status, q });
  const suspend = useSuspendUser();
  const unsuspend = useUnsuspendUser();

  const [target, setTarget] = useState(null); // user being suspended
  const [reason, setReason] = useState("");

  const users = data?.users || [];
  const total = data?.total ?? 0;

  const onSearch = (e) => {
    e.preventDefault();
    setQ(search.trim());
  };

  const doSuspend = async () => {
    if (reason.trim().length < 3) {
      toast.error("Please provide a reason (min 3 characters).");
      return;
    }
    try {
      await suspend.mutateAsync({ id: target.id, reason: reason.trim() });
      toast.success(`${target.name || target.email} suspended`);
      setTarget(null);
      setReason("");
    } catch (err) {
      toast.error(apiError(err, "Could not suspend user"));
    }
  };

  const doUnsuspend = async (u) => {
    try {
      await unsuspend.mutateAsync({ id: u.id });
      toast.success(`${u.name || u.email} reactivated`);
    } catch (err) {
      toast.error(apiError(err, "Could not reactivate user"));
    }
  };

  const columns = useMemo(
    () => ["User", "Contact", "Status", "Wallet (USDT)", "Joined", "Actions"],
    []
  );

  return (
    <div data-testid="admin-users-page">
      <PageHeading
        title="Users"
        subtitle={`${total} member${total === 1 ? "" : "s"} \u2014 view, suspend and reactivate accounts.`}
        icon={Users}
      />

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" data-testid="users-status-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                status === f.key
                  ? "bg-ex-accent text-ex-ink"
                  : "bg-white/5 text-ex-muted hover:bg-white/10"
              }`}
              data-testid={`users-filter-${f.key || "all"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form onSubmit={onSearch} className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, code"
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
            data-testid="users-search-input"
          />
        </form>
      </div>

      {isLoading ? (
        <EasyXLoader />
      ) : users.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState icon={Users} title="No users found" note="Try a different filter or search." />
        </div>
      ) : (
        <div className="mt-5">
          <EasyXTable columns={columns}>
            {users.map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.id}`} className="hover:bg-white/[0.02]">
                <td className="px-4 py-3">
                  <div className="font-medium text-ex-text">{u.name || "\u2014"}</div>
                  <div className="text-[11px] text-ex-muted font-mono">{u.referral_code}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-ex-text">{u.email}</div>
                  <div className="text-[11px] text-ex-muted">{u.phone}</div>
                </td>
                <td className="px-4 py-3"><StatusPill status={u.status} /></td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 text-ex-text">
                    <WalletIcon className="h-3.5 w-3.5 text-ex-muted" />
                    {money(u.wallet?.available_balance)}
                  </span>
                </td>
                <td className="px-4 py-3 text-ex-muted whitespace-nowrap">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : "\u2014"}
                </td>
                <td className="px-4 py-3">
                  {u.status === "suspended" ? (
                    <EasyXButton
                      variant="secondary"
                      className="!py-1.5 !px-3 text-xs"
                      loading={unsuspend.isPending}
                      onClick={() => doUnsuspend(u)}
                      data-testid={`user-unsuspend-${u.id}`}
                    >
                      <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                    </EasyXButton>
                  ) : (
                    <button
                      onClick={() => { setTarget(u); setReason(""); }}
                      className="inline-flex items-center gap-1.5 rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
                      data-testid={`user-suspend-open-${u.id}`}
                    >
                      <Ban className="h-3.5 w-3.5" /> Suspend
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </EasyXTable>
        </div>
      )}

      <EasyXModal
        open={!!target}
        onOpenChange={(o) => { if (!o) { setTarget(null); setReason(""); } }}
        title="Suspend account"
        description={target ? `${target.name || target.email} will be unable to log in, invest, deposit or withdraw. Existing active investments keep running toward maturity.` : ""}
        testId="user-suspend-modal"
        footer={
          <div className="flex gap-2">
            <EasyXButton variant="secondary" onClick={() => { setTarget(null); setReason(""); }}>
              Cancel
            </EasyXButton>
            <EasyXButton
              variant="primary"
              className="!bg-red-500 !text-white hover:!bg-red-600"
              loading={suspend.isPending}
              onClick={doSuspend}
              data-testid="user-suspend-confirm"
            >
              Confirm suspension
            </EasyXButton>
          </div>
        }
      >
        <div>
          <label className="text-xs text-ex-muted">Reason (required)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Suspicious activity / policy violation"
            className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
            data-testid="user-suspend-reason"
          />
        </div>
      </EasyXModal>
    </div>
  );
}
