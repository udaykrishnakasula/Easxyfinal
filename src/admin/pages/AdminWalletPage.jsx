import React, { useMemo, useState } from "react";
import {
  Wallet,
  Search,
  PlusCircle,
  MinusCircle,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Lock,
  History,
  FileText,
  User,
  DollarSign,
  Info,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import {
  useAdminUsers,
  useAdminWalletTransactions,
  useAdminAdjustWallet,
} from "@/admin/adminApi";
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

const LEDGER_FILTERS = [
  { key: "all", label: "All Ledger Tx" },
  { key: "ADMIN_ADJUSTMENT", label: "Admin Adjustments" },
  { key: "deposit", label: "Deposits" },
  { key: "investment_payout", label: "Maturity Payouts" },
  { key: "withdrawal_lock", label: "Withdrawals" },
  { key: "referral_commission", label: "Commissions" },
];

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminWalletPage() {
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [directionFilter, setDirectionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");

  // Adjustment Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [direction, setDirection] = useState("credit"); // "credit" | "debit"
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [isConfirmed, setIsConfirmed] = useState(false);

  // Queries
  const { data: usersData, isLoading: usersLoading } = useAdminUsers({ q: "" });
  const allUsers = usersData?.users || [];

  const { data: txData, isLoading: txLoading, refetch } = useAdminWalletTransactions({
    type: selectedFilter === "all" ? "" : selectedFilter,
    direction: directionFilter,
    q,
  });

  const adjustMutation = useAdminAdjustWallet();

  const transactions = txData?.transactions || [];
  const stats = txData?.stats || {
    total_ledger_tx: 0,
    total_adjustments: 0,
    total_adjusted_credited: "0.00",
    total_adjusted_debited: "0.00",
  };

  // Filtered users for user picker
  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return allUsers.slice(0, 10);
    const lower = userSearchQuery.toLowerCase().trim();
    return allUsers.filter(
      (u) =>
        u.name?.toLowerCase().includes(lower) ||
        u.email?.toLowerCase().includes(lower) ||
        u.phone?.toLowerCase().includes(lower) ||
        u.referral_code?.toLowerCase().includes(lower) ||
        u.id?.toLowerCase().includes(lower)
    );
  }, [allUsers, userSearchQuery]);

  const selectedUser = useMemo(
    () => allUsers.find((u) => u.id === selectedUserId),
    [allUsers, selectedUserId]
  );

  const selectedUserBalance = Number(selectedUser?.wallet?.available_balance || 0);
  const numericAmount = Number(amount) || 0;

  // New balance preview
  const newBalancePreview = useMemo(() => {
    if (!selectedUser || isNaN(numericAmount) || numericAmount <= 0) return null;
    if (direction === "credit") {
      return selectedUserBalance + numericAmount;
    } else {
      return selectedUserBalance - numericAmount;
    }
  }, [selectedUser, selectedUserBalance, numericAmount, direction]);

  const isDebitOverdraft = direction === "debit" && numericAmount > selectedUserBalance;

  const handleOpenAdjustment = (prefillUserId = "", prefillDirection = "credit") => {
    setSelectedUserId(prefillUserId);
    setDirection(prefillDirection);
    setAmount("");
    setReason("");
    setIsConfirmed(false);
    setUserSearchQuery("");
    setIsModalOpen(true);
  };

  const handleExecuteAdjustment = async (e) => {
    e?.preventDefault();

    if (!selectedUserId) {
      toast.error("Please select a target user account.");
      return;
    }

    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Please enter a valid positive adjustment amount.");
      return;
    }

    if (direction === "debit" && numericAmount > selectedUserBalance) {
      toast.error(
        `Cannot debit $${money(numericAmount)} USDT. User only has $${money(selectedUserBalance)} USDT available.`
      );
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please provide an explicit adjustment reason (minimum 3 characters).");
      return;
    }

    if (!isConfirmed) {
      toast.error("You must check the confirmation acknowledgment before submitting.");
      return;
    }

    try {
      const idempotencyKey = `admin_adj_${selectedUserId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      await adjustMutation.mutateAsync({
        user_id: selectedUserId,
        amount: String(numericAmount),
        direction,
        reason: reason.trim(),
        idempotency_key: idempotencyKey,
      });

      toast.success(
        `Successfully ${direction === "credit" ? "credited" : "debited"} $${money(numericAmount)} USDT for ${
          selectedUser?.name || selectedUser?.email
        }.`
      );
      setIsModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(apiError(err, "Failed to execute manual wallet adjustment"));
    }
  };

  const columns = useMemo(
    () => [
      "Ledger ID / Type",
      "User / Investor",
      "Direction",
      "Amount (USDT)",
      "Balance After",
      "Reason / Note",
      "Timestamp",
      "Audit Trail",
    ],
    []
  );

  return (
    <div className="space-y-6" data-testid="admin-wallet-page">
      {/* Heading */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Wallet & Ledger Management"
          subtitle="Execute double-entry manual credits/debits with strict audit logs and inspect immutable ledger entries."
          icon={Wallet}
        />

        <div className="flex items-center gap-2">
          <EasyXButton
            onClick={() => handleOpenAdjustment("", "credit")}
            className="!bg-emerald-500 !text-black font-bold hover:!bg-emerald-400"
            data-testid="btn-manual-credit"
          >
            <PlusCircle className="h-4 w-4 mr-1.5" /> Manual Credit
          </EasyXButton>
          <EasyXButton
            onClick={() => handleOpenAdjustment("", "debit")}
            className="!bg-rose-500/20 !text-rose-300 border border-rose-500/40 font-bold hover:!bg-rose-500/30"
            data-testid="btn-manual-debit"
          >
            <MinusCircle className="h-4 w-4 mr-1.5" /> Manual Debit
          </EasyXButton>
        </div>
      </div>

      {/* Compliance / Financial Integrity Banner */}
      <div className="rounded-ex border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
        <div className="flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-ex-text flex items-center gap-2">
              <span>Deterministic Double-Entry Ledger Enforced</span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ADMIN_ADJUSTMENT
              </span>
            </div>
            <p className="text-ex-muted text-[11px] leading-relaxed">
              Every manual credit or debit directly posts an immutable <code>ADMIN_ADJUSTMENT</code> transaction to the ledger, recalculates user wallet balance atomically, prevents negative balances on debits, and creates a traceable administrator audit log. Direct balance overwriting without ledger recording is strictly disabled.
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">
            Total Ledger Tx
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-text" data-testid="metric-total-ledger">
            {stats.total_ledger_tx}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5">all platform events</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-ex-muted uppercase tracking-wider">
            Manual Adjustments
          </div>
          <div className="mt-1.5 text-xl font-bold text-ex-lav-300" data-testid="metric-total-adjustments">
            {stats.total_adjustments}
          </div>
          <div className="text-[11px] text-ex-muted mt-0.5">admin adjustments</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">
            Total Credited
          </div>
          <div className="mt-1.5 text-xl font-bold text-emerald-400" data-testid="metric-total-credited">
            +${money(stats.total_adjusted_credited)}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-0.5 font-mono">admin adjustments</div>
        </EasyXCard>

        <EasyXCard className="p-4">
          <div className="text-[11px] font-medium text-rose-300 uppercase tracking-wider">
            Total Debited
          </div>
          <div className="mt-1.5 text-xl font-bold text-rose-300" data-testid="metric-total-debited">
            -${money(stats.total_adjusted_debited)}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-0.5 font-mono">admin adjustments</div>
        </EasyXCard>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {LEDGER_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setSelectedFilter(f.key)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                selectedFilter === f.key
                  ? "bg-ex-accent text-ex-ink shadow-sm"
                  : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-white"
              }`}
              data-testid={`filter-${f.key}`}
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
            placeholder="Search tx ID, user, reason, note..."
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
            data-testid="input-search-ledger"
          />
        </form>
      </div>

      {/* Ledger Table */}
      {txLoading ? (
        <EasyXLoader />
      ) : transactions.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState
            icon={Wallet}
            title="No ledger records found"
            note={
              q
                ? `No transactions matching "${q}".`
                : "No transactions recorded for this ledger filter."
            }
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-ex border border-white/10 bg-white/[0.02]">
          <EasyXTable columns={columns}>
            {transactions.map((tx) => {
              const isCredit = tx.direction === "credit";
              const isAdjustment = tx.type === "ADMIN_ADJUSTMENT";

              return (
                <tr
                  key={tx.id}
                  data-testid={`tx-row-${tx.id}`}
                  className={`border-b border-white/5 transition hover:bg-white/[0.02] ${
                    isAdjustment ? "bg-ex-lav-400/[0.02]" : ""
                  }`}
                >
                  {/* Ledger ID & Type */}
                  <td className="px-4 py-3.5">
                    <div className="font-mono text-xs text-ex-lav-300 font-semibold">
                      #{String(tx.id).slice(0, 10)}
                    </div>
                    <div className="mt-0.5">
                      <span
                        className={`inline-block text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isAdjustment
                            ? "bg-amber-400/20 text-amber-300 border-amber-400/30"
                            : "bg-white/5 text-ex-muted border-white/10"
                        }`}
                      >
                        {tx.type}
                      </span>
                    </div>
                  </td>

                  {/* User */}
                  <td className="px-4 py-3.5">
                    {tx.user ? (
                      <div>
                        <div className="font-semibold text-xs text-ex-text">{tx.user.name}</div>
                        <div className="text-[11px] font-mono text-ex-muted">{tx.user.email}</div>
                      </div>
                    ) : (
                      <span className="text-xs font-mono text-ex-muted">
                        User #{String(tx.user_id).slice(0, 8)}
                      </span>
                    )}
                  </td>

                  {/* Direction */}
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded border ${
                        isCredit
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : "bg-rose-500/15 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {isCredit ? "CREDIT" : "DEBIT"}
                    </span>
                  </td>

                  {/* Amount */}
                  <td className="px-4 py-3.5 text-xs font-mono font-bold">
                    <span className={isCredit ? "text-emerald-400" : "text-rose-400"}>
                      {isCredit ? "+" : "-"}${money(tx.amount)} USDT
                    </span>
                  </td>

                  {/* Balance After */}
                  <td className="px-4 py-3.5 text-xs font-mono text-ex-text">
                    ${money(tx.balance_after)} USDT
                  </td>

                  {/* Reason / Note */}
                  <td className="px-4 py-3.5 text-xs max-w-[200px]">
                    <div className="truncate text-ex-text font-medium" title={tx.note || "No note"}>
                      {tx.note || "—"}
                    </div>
                    {tx.ref_type && (
                      <div className="text-[10px] text-ex-muted font-mono">
                        Ref: {tx.ref_type}
                      </div>
                    )}
                  </td>

                  {/* Timestamp */}
                  <td className="px-4 py-3.5 text-xs text-ex-muted whitespace-nowrap font-mono">
                    {tx.created_at ? dayjs(tx.created_at).format("DD MMM YYYY, HH:mm:ss") : "—"}
                  </td>

                  {/* Audit Trail */}
                  <td className="px-4 py-3.5 text-right">
                    {isAdjustment ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-ex-accent bg-ex-accent/10 px-2 py-0.5 rounded border border-ex-accent/20">
                        <ShieldCheck className="h-3 w-3" /> Audited
                      </span>
                    ) : (
                      <span className="text-[10px] text-ex-muted">System</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </EasyXTable>
        </div>
      )}

      {/* Manual Credit / Debit Adjustment Modal */}
      <EasyXModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) setIsModalOpen(false);
        }}
        title={`Execute Manual Wallet ${direction === "credit" ? "Credit" : "Debit"}`}
        description="Creates an immutable ADMIN_ADJUSTMENT ledger entry with mandatory reason and verification checks."
        testId="admin-adjust-modal"
        footer={
          <div className="flex gap-2 w-full justify-end">
            <EasyXButton
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={adjustMutation.isPending}
            >
              Cancel
            </EasyXButton>
            <EasyXButton
              className={`font-bold ${
                direction === "credit"
                  ? "!bg-emerald-500 !text-black hover:!bg-emerald-400"
                  : "!bg-rose-500 !text-white hover:!bg-rose-600"
              }`}
              loading={adjustMutation.isPending}
              disabled={
                !selectedUserId ||
                !amount ||
                numericAmount <= 0 ||
                isDebitOverdraft ||
                !reason.trim() ||
                reason.trim().length < 3 ||
                !isConfirmed
              }
              onClick={handleExecuteAdjustment}
              data-testid="btn-confirm-adjust"
            >
              Confirm &amp; Execute {direction === "credit" ? "Credit" : "Debit"}
            </EasyXButton>
          </div>
        }
      >
        <form onSubmit={handleExecuteAdjustment} className="space-y-4">
          {/* Direction Toggle */}
          <div>
            <label className="text-xs font-semibold text-ex-text block mb-1.5">
              Adjustment Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDirection("credit")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-ex-ctrl text-xs font-bold transition border ${
                  direction === "credit"
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                    : "bg-white/5 text-ex-muted border-white/10 hover:bg-white/10 hover:text-white"
                }`}
                data-testid="toggle-direction-credit"
              >
                <PlusCircle className="h-4 w-4" /> Credit (Add Funds)
              </button>
              <button
                type="button"
                onClick={() => setDirection("debit")}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-ex-ctrl text-xs font-bold transition border ${
                  direction === "debit"
                    ? "bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm"
                    : "bg-white/5 text-ex-muted border-white/10 hover:bg-white/10 hover:text-white"
                }`}
                data-testid="toggle-direction-debit"
              >
                <MinusCircle className="h-4 w-4" /> Debit (Deduct Funds)
              </button>
            </div>
          </div>

          {/* User Selection */}
          <div>
            <label className="text-xs font-semibold text-ex-text block mb-1">
              Select Target User <span className="text-red-400">*</span>
            </label>

            {selectedUser ? (
              <div className="flex items-center justify-between p-3 rounded-ex-ctrl bg-white/5 border border-white/10">
                <div>
                  <div className="text-xs font-bold text-ex-text">{selectedUser.name}</div>
                  <div className="text-[11px] font-mono text-ex-muted">{selectedUser.email}</div>
                  <div className="text-[11px] text-emerald-400 mt-1 font-mono">
                    Available Balance: ${money(selectedUserBalance)} USDT
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUserId("")}
                  className="text-xs text-ex-muted hover:text-white px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Filter users by name, email, or code..."
                  className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
                  data-testid="input-user-search"
                />
                <div className="max-h-36 overflow-y-auto space-y-1 border border-white/10 rounded-ex-ctrl p-1 bg-black/20">
                  {filteredUsers.length === 0 ? (
                    <div className="p-2 text-xs text-ex-muted text-center">No users match search</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedUserId(u.id)}
                        className="w-full text-left p-2 rounded hover:bg-white/10 flex items-center justify-between transition text-xs"
                      >
                        <div>
                          <div className="font-semibold text-ex-text">{u.name}</div>
                          <div className="text-[11px] text-ex-muted font-mono">{u.email}</div>
                        </div>
                        <div className="text-right font-mono text-[11px] text-emerald-400">
                          ${money(u.wallet?.available_balance || 0)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Adjustment Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-ex-text">
                Amount (USDT) <span className="text-red-400">*</span>
              </label>
              {direction === "debit" && selectedUser && (
                <span className="text-[11px] text-ex-muted">
                  Max: ${money(selectedUserBalance)} USDT
                </span>
              )}
            </div>
            <div className="relative">
              <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ex-muted" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={direction === "debit" && selectedUser ? selectedUserBalance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`w-full rounded-ex-ctrl bg-white/5 border pl-9 pr-3 py-2 text-xs font-mono text-ex-text focus:outline-none ${
                  isDebitOverdraft
                    ? "border-rose-500 text-rose-300 focus:border-rose-500"
                    : "border-white/10 focus:border-ex-accent"
                }`}
                data-testid="input-adjust-amount"
              />
            </div>
            {isDebitOverdraft && (
              <div className="mt-1 text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Debit amount exceeds user's available balance ($${money(selectedUserBalance)} USDT).
              </div>
            )}
          </div>

          {/* Balance Preview Card */}
          {selectedUser && numericAmount > 0 && !isDebitOverdraft && (
            <div className="rounded-ex-ctrl bg-white/[0.03] border border-white/10 p-3 text-xs space-y-1.5 font-mono">
              <div className="text-[11px] text-ex-muted uppercase tracking-wider font-semibold font-sans">
                Balance Simulation
              </div>
              <div className="flex justify-between text-ex-muted">
                <span>Current Balance:</span>
                <span>${money(selectedUserBalance)} USDT</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className={direction === "credit" ? "text-emerald-400" : "text-rose-400"}>
                  {direction === "credit" ? "Credit Addition:" : "Debit Deduction:"}
                </span>
                <span className={direction === "credit" ? "text-emerald-400" : "text-rose-400"}>
                  {direction === "credit" ? "+" : "-"}${money(numericAmount)} USDT
                </span>
              </div>
              <div className="flex justify-between font-bold text-ex-text pt-1.5 border-t border-white/10">
                <span>Resulting Balance:</span>
                <span className="text-ex-accent">${money(newBalancePreview)} USDT</span>
              </div>
            </div>
          )}

          {/* Mandatory Reason */}
          <div>
            <label className="text-xs font-semibold text-ex-text block mb-1">
              Operational Reason (Required for Audit Trail) <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Deposit reconciliation ticket #892, compensation bonus, correction of duplicate charge..."
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-xs text-ex-text focus:border-ex-accent focus:outline-none placeholder:text-ex-muted/60"
              data-testid="input-adjust-reason"
            />
            <div className="text-[10px] text-ex-muted mt-0.5">
              Minimum 3 characters. Stored in immutable audit logs and shown to user in notification.
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="pt-2 border-t border-white/10">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-white/20 bg-white/5 text-ex-accent focus:ring-0"
                data-testid="checkbox-confirm-adjust"
              />
              <span className="text-ex-muted">
                I verify that this <strong className="text-ex-text">{direction.toUpperCase()}</strong> of{" "}
                <strong className="text-ex-text">${money(numericAmount)} USDT</strong> for{" "}
                <strong className="text-ex-text">{selectedUser?.email || "selected user"}</strong> is authorized and complies with internal compliance policies.
              </span>
            </label>
          </div>
        </form>
      </EasyXModal>
    </div>
  );
}
