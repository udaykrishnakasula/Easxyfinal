import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  X,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Wallet as WalletIcon,
  PiggyBank,
  Share2,
  BadgeCheck,
  Eye,
  Calendar,
  Phone,
  Mail,
  AlertTriangle,
  Lock,
  Download,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminUsers, useSuspendUser, useUnsuspendUser, useBatchSetUserStatus } from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
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
import AdminBulkActionDropdown from "@/admin/components/AdminBulkActionDropdown";
import User360ViewModal from "@/admin/components/User360ViewModal";

const STATUS_FILTERS = [
  { key: "", label: "All Users" },
  { key: "active", label: "Active" },
  { key: "suspended", label: "Suspended" },
];

function StatusPill({ status }) {
  if (status === "suspended" || status === "banned") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <Ban className="h-3 w-3" />
        SUSPENDED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="h-3 w-3" />
      ACTIVE
    </span>
  );
}

function KycPill({ status }) {
  const map = {
    approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    rejected: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    none: "bg-white/5 text-ex-muted border border-white/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
        map[status] || map.none
      }`}
    >
      <BadgeCheck className="h-3 w-3" />
      {status || "NONE"}
    </span>
  );
}

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminUsersPage() {
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce search query so user can type naturally and get live filtered results
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQ(search.trim());
    }, 200);
    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useAdminUsers({ status, q: debouncedQ });
  const suspend = useSuspendUser();
  const unsuspend = useUnsuspendUser();
  const batchSetStatus = useBatchSetUserStatus();

  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkModal, setBulkModal] = useState(null); // { type: 'suspend' | 'active' | 'kyc_approved' | 'kyc_rejected' }
  const [bulkReason, setBulkReason] = useState("");

  const [suspendTarget, setSuspendTarget] = useState(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [detailUser, setDetailUser] = useState(null);

  const rawUsers = data?.users || [];
  const total = data?.total ?? 0;

  // Instant client-side matching on top of server query for instant response
  const users = useMemo(() => {
    if (!search.trim()) return rawUsers;
    const q = search.trim().toLowerCase();
    return rawUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.referral_code?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q) ||
        u.kyc_status?.toLowerCase().includes(q)
    );
  }, [rawUsers, search]);

  // Reset selectedIds when filter changes
  useEffect(() => {
    setSelectedIds([]);
  }, [status, debouncedQ]);

  const isAllSelected = users.length > 0 && selectedIds.length === users.length;
  const isPartiallySelected = selectedIds.length > 0 && selectedIds.length < users.length;

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const handleExportSelectedCsv = () => {
    const list = selectedIds.length > 0 ? users.filter((u) => selectedIds.includes(u.id)) : users;
    if (list.length === 0) {
      toast.error("No users available to export");
      return;
    }
    const headers = ["User ID", "Name", "Email", "Phone", "Referral Code", "Status", "KYC Status", "Wallet Balance", "Active Investments"];
    const rows = list.map((u) => [
      u.id,
      `"${(u.name || "").replace(/"/g, '""')}"`,
      `"${(u.email || "").replace(/"/g, '""')}"`,
      `"${(u.phone || "").replace(/"/g, '""')}"`,
      u.referral_code || "",
      u.status || "active",
      u.kyc_status || "none",
      u.wallet?.available_balance || "0.00",
      u.investments?.active || 0,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `easyx-users-selected-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${list.length} user records to CSV.`);
  };

  const executeBulkStatusChange = async (targetStatus, reason = "") => {
    if (selectedIds.length === 0) {
      toast.error("No users selected.");
      return;
    }
    try {
      const res = await batchSetStatus.mutateAsync({
        ids: selectedIds,
        status: targetStatus,
        reason: reason.trim(),
      });
      const count = res?.count || selectedIds.length;
      const statusLabels = {
        active: "activated / unsuspended",
        suspended: "suspended",
        kyc_approved: "KYC approved",
        kyc_rejected: "KYC rejected",
      };
      toast.success(`Successfully set ${count} user${count === 1 ? "" : "s"} to ${statusLabels[targetStatus] || targetStatus}.`);
      setBulkModal(null);
      setBulkReason("");
      clearSelection();
    } catch (err) {
      toast.error(apiError(err, "Failed to update users"));
    }
  };

  const onSearch = (e) => {
    e.preventDefault();
    setDebouncedQ(search.trim());
  };

  const clearSearch = () => {
    setSearch("");
    setDebouncedQ("");
  };

  const doSuspend = async () => {
    if (suspendReason.trim().length < 3) {
      toast.error("Please provide a valid suspension reason (min 3 chars).");
      return;
    }
    try {
      await suspend.mutateAsync({ id: suspendTarget.id, reason: suspendReason.trim() });
      toast.success(`${suspendTarget.name || suspendTarget.email} has been suspended.`);
      setSuspendTarget(null);
      setSuspendReason("");
    } catch (err) {
      toast.error(apiError(err, "Could not suspend user"));
    }
  };

  const doUnsuspend = async (u) => {
    try {
      await unsuspend.mutateAsync({ id: u.id });
      toast.success(`${u.name || u.email} has been reactivated.`);
      if (detailUser?.id === u.id) {
        setDetailUser((prev) => (prev ? { ...prev, status: "active" } : null));
      }
    } catch (err) {
      toast.error(apiError(err, "Could not reactivate user"));
    }
  };

  const columns = useMemo(
    () => [
      <label key="select-all" className="inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={isAllSelected}
          ref={(el) => {
            if (el) el.indeterminate = isPartiallySelected;
          }}
          onChange={handleSelectAllToggle}
          className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-500"
          title="Select all displayed users"
        />
      </label>,
      "User / Referral Code",
      "Contact",
      "Account Status",
      "KYC",
      "Wallet (USDT)",
      "Investments",
      "Referrals",
      "Actions",
    ],
    [isAllSelected, isPartiallySelected, users.length]
  );

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <PageHeading
        title="Users Management"
        subtitle={`${total} registered member${total === 1 ? "" : "s"} — search, monitor portfolios, review KYC, and manage account access.`}
        icon={Users}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2" data-testid="users-status-filters">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.key || "all"}
              onClick={() => setStatus(f.key)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                status === f.key
                  ? "bg-ex-accent text-ex-ink shadow-sm"
                  : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-ex-text"
              }`}
              data-testid={`users-filter-${f.key || "all"}`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <form onSubmit={onSearch} className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") clearSearch();
            }}
            placeholder="Search name, email, phone, code..."
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-8 py-2 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-accent focus:bg-white/[0.08] focus:outline-none transition shadow-inner"
            data-testid="users-search-input"
          />
          {search && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ex-muted hover:text-white rounded transition"
              title="Clear search (ESC)"
              data-testid="clear-users-search-btn"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </form>
      </div>

      {/* Batch Selection Master Controls & Bulk Action Dropdown */}
      {users.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none text-ex-muted hover:text-white transition">
              <input
                type="checkbox"
                checked={isAllSelected}
                ref={(el) => {
                  if (el) el.indeterminate = isPartiallySelected;
                }}
                onChange={handleSelectAllToggle}
                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-500"
              />
              <span className="font-semibold text-white">
                {isAllSelected
                  ? "Deselect All"
                  : isPartiallySelected
                  ? `Selected (${selectedIds.length}/${users.length})`
                  : `Select All Users (${users.length})`}
              </span>
            </label>

            {/* Bulk Action Dropdown next to the batch selection checkbox */}
            <AdminBulkActionDropdown
              selectedCount={selectedIds.length}
              totalCount={users.length}
              isAllSelected={isAllSelected}
              onSelectAll={handleSelectAllToggle}
              onClearSelection={clearSelection}
              onExportSelected={handleExportSelectedCsv}
              testId="users-bulk-action-dropdown"
              actions={[
                {
                  key: "active",
                  label: "Set Status: Active (Unsuspend)",
                  description: "Reactivate account login, investment, and withdrawal access",
                  icon: CheckCircle2,
                  color: "emerald",
                  onClick: () => {
                    setBulkModal({ type: "active" });
                  },
                },
                {
                  key: "suspended",
                  label: "Set Status: Suspended",
                  description: "Temporarily restrict account login and actions",
                  icon: Ban,
                  color: "rose",
                  isDanger: true,
                  onClick: () => {
                    setBulkReason("");
                    setBulkModal({ type: "suspended" });
                  },
                },
                {
                  key: "kyc_approved",
                  label: "Set Status: KYC Approved",
                  description: "Mark selected users as KYC verified for withdrawals",
                  icon: BadgeCheck,
                  color: "indigo",
                  onClick: () => {
                    setBulkModal({ type: "kyc_approved" });
                  },
                },
                {
                  key: "kyc_rejected",
                  label: "Set Status: KYC Rejected",
                  description: "Reset or reject KYC verification status",
                  icon: AlertTriangle,
                  color: "amber",
                  onClick: () => {
                    setBulkReason("");
                    setBulkModal({ type: "kyc_rejected" });
                  },
                },
              ]}
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-purple-300 font-mono font-bold">
                {selectedIds.length} Selected
              </span>
              <div className="h-3 w-[1px] bg-white/20" />
              <button
                type="button"
                onClick={handleExportSelectedCsv}
                className="flex items-center gap-1 text-purple-300 hover:text-white transition font-medium"
                title="Export selected users to CSV"
              >
                <Download className="h-3 w-3" />
                <span>Export Selected ({selectedIds.length})</span>
              </button>
              <div className="h-3 w-[1px] bg-white/20" />
              <button
                type="button"
                onClick={clearSelection}
                className="text-ex-lav-300 hover:text-white transition font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Search Sub-Banner */}
      {search && (
        <div
          className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 backdrop-blur-sm animate-in fade-in duration-200"
          data-testid="users-active-search-indicator"
        >
          <div className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span className="truncate">
              Filtering users by: <strong className="text-white font-mono">"{search}"</strong>
              <span className="ml-1.5 text-ex-muted">
                ({users.length} {users.length === 1 ? "user" : "users"} matched)
              </span>
            </span>
          </div>
          <button
            type="button"
            onClick={clearSearch}
            className="text-[11px] font-bold text-purple-300 hover:text-white underline underline-offset-2 shrink-0"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* Main Table / Loader */}
      {isLoading ? (
        <EasyXLoader />
      ) : users.length === 0 ? (
        <EasyXEmptyState
          icon={Users}
          title="No users found"
          description="No user accounts match the selected status filter or search term."
        />
      ) : (
        <EasyXCard className="p-0 overflow-hidden border border-white/8">
          <div className="overflow-x-auto">
            <EasyXTable columns={columns}>
              {users.map((u) => {
                const isSelected = selectedIds.includes(u.id);
                return (
                  <tr
                    key={u.id}
                    data-testid={`user-row-${u.id}`}
                    className={`transition divide-y divide-white/4 ${
                      isSelected ? "bg-purple-950/20 hover:bg-purple-950/30" : "hover:bg-white/[0.02]"
                    }`}
                  >
                    {/* Checkbox column */}
                    <td className="px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(u.id)}
                        className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-500"
                      />
                    </td>

                    {/* User name & code */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-ex-text">{u.name || "—"}</div>
                      <div className="text-xs text-ex-lav-300 font-mono mt-0.5">
                        Code: {u.referral_code || "—"}
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-ex-text flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-ex-muted shrink-0" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="text-xs text-ex-muted flex items-center gap-1.5 mt-0.5">
                        <Phone className="h-3 w-3 shrink-0" />
                        <span>{u.phone || "—"}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusPill status={u.status} />
                    </td>

                    {/* KYC */}
                    <td className="px-4 py-3.5">
                      <KycPill status={u.kyc_status} />
                    </td>

                    {/* Wallet Summary */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-ex-text">
                        {money(u.wallet?.available_balance)} USDT
                      </div>
                      <div className="text-[11px] text-ex-muted">
                        Locked: {money(u.wallet?.locked_investment)}
                      </div>
                    </td>

                    {/* Investment Summary */}
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-semibold text-ex-text">
                        {u.investments?.active || 0} active
                      </div>
                      <div className="text-[11px] text-ex-muted">
                        {money(u.investments?.active_principal)} USDT
                      </div>
                    </td>

                    {/* Referral Summary */}
                    <td className="px-4 py-3.5">
                      <div className="text-sm font-semibold text-ex-text">
                        {u.referrals?.total_referred || 0} invited
                      </div>
                      <div className="text-[11px] text-ex-muted">
                        Earned: {money(u.referrals?.commission_earned)} USDT
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailUser(u)}
                          className="px-2.5 py-1.5 rounded-ex-ctrl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-lav-200 hover:text-white transition flex items-center gap-1"
                          title="View Full Profile & Portfolios"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>View</span>
                        </button>

                        {u.status === "suspended" ? (
                          <button
                            onClick={() => doUnsuspend(u)}
                            disabled={unsuspend.isPending}
                            className="px-2.5 py-1.5 rounded-ex-ctrl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Unsuspend</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSuspendTarget(u);
                              setSuspendReason("");
                            }}
                            className="px-2.5 py-1.5 rounded-ex-ctrl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition flex items-center gap-1"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            <span>Suspend</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </EasyXTable>
          </div>
        </EasyXCard>
      )}

      {/* USER 360° ADMIN VIEW MODAL */}
      <User360ViewModal
        user={detailUser}
        open={Boolean(detailUser)}
        onClose={() => setDetailUser(null)}
        onUserUpdated={() => refetch()}
      />

      {/* SUSPENSION CONFIRMATION MODAL */}
      <EasyXModal
        open={Boolean(suspendTarget)}
        onClose={() => setSuspendTarget(null)}
        title="Confirm Account Suspension"
      >
        {suspendTarget && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-ex-card bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Important Suspension Policy
              </div>
              <div className="mt-1 leading-relaxed text-amber-200/90">
                Suspending <strong>{suspendTarget.name || suspendTarget.email}</strong> will prevent login,
                new investments, and withdrawals.
                <br />
                <span className="font-semibold text-white mt-1 block">
                  Existing active investments will NOT be cancelled and will continue toward scheduled maturity.
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Reason for Suspension (recorded in Audit Log)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Terms of service violation, duplicate identity review, requested by user"
                rows={3}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
              <button
                onClick={() => setSuspendTarget(null)}
                className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
              >
                Cancel
              </button>
              <EasyXButton
                onClick={doSuspend}
                loading={suspend.isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
              >
                <Ban className="h-4 w-4 mr-1.5" /> Confirm Suspension
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* BULK ACTION STATUS CONFIRMATION MODAL */}
      <EasyXModal
        open={Boolean(bulkModal)}
        onClose={() => {
          setBulkModal(null);
          setBulkReason("");
        }}
        title={`Batch Set Status (${selectedIds.length} Users Selected)`}
      >
        {bulkModal && (
          <div className="space-y-4 text-sm">
            {bulkModal.type === "suspended" && (
              <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-rose-400" />
                  Confirm Batch User Suspension
                </div>
                <div className="mt-1 leading-relaxed text-rose-200/90">
                  You are about to suspend <strong>{selectedIds.length} selected user accounts</strong>. They will be locked from logging in, depositing, and initiating withdrawals.
                </div>
              </div>
            )}

            {bulkModal.type === "active" && (
              <div className="p-3.5 rounded-ex-card bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Confirm Batch Account Activation
                </div>
                <div className="mt-1 leading-relaxed text-emerald-200/90">
                  You are activating <strong>{selectedIds.length} selected user accounts</strong>. Any previously suspended users in this selection will be restored to active status.
                </div>
              </div>
            )}

            {bulkModal.type === "kyc_approved" && (
              <div className="p-3.5 rounded-ex-card bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-indigo-400" />
                  Confirm Batch KYC Approval
                </div>
                <div className="mt-1 leading-relaxed text-indigo-200/90">
                  You are setting <strong>{selectedIds.length} user accounts</strong> to KYC Approved status.
                </div>
              </div>
            )}

            {bulkModal.type === "kyc_rejected" && (
              <div className="p-3.5 rounded-ex-card bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  Confirm Batch KYC Rejection
                </div>
                <div className="mt-1 leading-relaxed text-amber-200/90">
                  You are marking KYC verification for <strong>{selectedIds.length} user accounts</strong> as Rejected.
                </div>
              </div>
            )}

            {(bulkModal.type === "suspended" || bulkModal.type === "kyc_rejected") && (
              <div>
                <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                  Reason / Administrative Note (Optional)
                </label>
                <textarea
                  value={bulkReason}
                  onChange={(e) => setBulkReason(e.target.value)}
                  placeholder="e.g. Batch compliance review or policy update..."
                  rows={2}
                  className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-purple-400 focus:outline-none"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
              <button
                type="button"
                onClick={() => {
                  setBulkModal(null);
                  setBulkReason("");
                }}
                className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
              >
                Cancel
              </button>
              <EasyXButton
                onClick={() => executeBulkStatusChange(bulkModal.type, bulkReason)}
                loading={batchSetStatus.isPending}
                className={`font-semibold text-white ${
                  bulkModal.type === "suspended"
                    ? "bg-rose-500 hover:bg-rose-600"
                    : bulkModal.type === "active"
                    ? "bg-emerald-500 hover:bg-emerald-600"
                    : "bg-purple-600 hover:bg-purple-700"
                }`}
              >
                Confirm Apply to {selectedIds.length} Users
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>
    </div>
  );
}
