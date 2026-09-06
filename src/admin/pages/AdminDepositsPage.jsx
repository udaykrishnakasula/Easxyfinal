import React, { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  Inbox,
  Check,
  X,
  Eye,
  Calendar,
  Layers,
  ArrowUpRight,
  Copy,
  CheckCheck,
  ShieldCheck,
  AlertCircle,
  Hash,
  FileImage,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  RefreshCw,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminDeposits,
  useApproveDeposit,
  useRejectDeposit,
  useBatchApproveDeposits,
  useBatchRejectDeposits,
} from "@/admin/adminApi";
import { money } from "@/user/api";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
  EasyXModal,
} from "@/design/EasyX";
import { AdminImageZoomModal } from "@/admin/components/AdminImageZoomModal";
import AdminStatusTabs from "@/admin/components/AdminStatusTabs";
import { exportDepositsToCsv } from "@/admin/utils/csvExport";
import AdminBulkActionDropdown from "@/admin/components/AdminBulkActionDropdown";

const PRESET_DEPOSIT_REASONS = [
  "Transaction hash could not be verified on blockchain",
  "Incorrect blockchain network used (e.g. sent BEP20 instead of TRC20)",
  "Payment proof screenshot is illegible, corrupted, or duplicate",
  "Received amount on-chain does not match submitted deposit amount",
  "Wallet address discrepancy with official platform deposit address",
];

function StatusBadge({ status }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <Check className="h-3 w-3" /> APPROVED
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <X className="h-3 w-3" /> REJECTED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
      PENDING
    </span>
  );
}

function DepositProofThumb({ img, idx, title, onOpen, className = "h-14 w-20" }) {
  const [hasError, setHasError] = useState(false);

  const handleImageError = (e) => {
    console.error(
      `[Admin Deposit Proof Error] Failed to load deposit proof image #${idx + 1}. Source: ${
        typeof img === "string" ? img.substring(0, 100) : typeof img
      }`,
      e
    );
    setHasError(true);
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(img, title)}
      className={`group relative rounded border border-white/20 bg-black/50 overflow-hidden hover:border-ex-accent transition ${className}`}
      title={`Click to inspect proof #${idx + 1}`}
    >
      {hasError ? (
        <div className="h-full w-full flex flex-col items-center justify-center bg-purple-950/40 text-ex-lav-300 p-1 border border-purple-500/20">
          <FileImage className="h-4 w-4 mb-0.5 opacity-80 text-rose-300" />
          <span className="text-[9px] font-mono">Proof #{idx + 1}</span>
        </div>
      ) : (
        <img
          src={img}
          alt={`Proof ${idx + 1}`}
          onError={handleImageError}
          className="h-full w-full object-cover group-hover:scale-105 transition duration-200"
        />
      )}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition">
        <Eye className="h-4 w-4" />
      </div>
      <div className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/80 text-[9px] font-bold text-white">
        #{idx + 1}
      </div>
    </button>
  );
}

function NetworkBadge({ network }) {
  const isTrc = network === "TRC20";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${
        isTrc
          ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
          : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
      }`}
    >
      {network}
    </span>
  );
}

export default function AdminDepositsPage() {
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: deposits, isLoading, isRefetching, refetch } = useAdminDeposits();
  const approve = useApproveDeposit();
  const reject = useRejectDeposit();
  const batchApprove = useBatchApproveDeposits();
  const batchReject = useBatchRejectDeposits();

  const [selectedIds, setSelectedIds] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'approve'|'reject'|'view'|'batch_approve'|'batch_reject', deposit? }
  const [lightbox, setLightbox] = useState(null); // { url, title }
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [copiedHash, setCopiedHash] = useState(false);

  const rawDepositList = useMemo(() => deposits || [], [deposits]);

  // Compute status counts & total sums
  const { counts, amounts, pendingDeposits } = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let pendingSum = 0;
    let approvedSum = 0;
    let rejectedSum = 0;
    let totalSum = 0;
    const pendingList = [];

    rawDepositList.forEach((d) => {
      const amt = Number(d.amount) || 0;
      totalSum += amt;
      if (d.status === "pending") {
        pending++;
        pendingSum += amt;
        pendingList.push(d);
      } else if (d.status === "approved") {
        approved++;
        approvedSum += Number(d.approved_amount || d.amount) || 0;
      } else if (d.status === "rejected") {
        rejected++;
        rejectedSum += amt;
      }
    });

    return {
      counts: {
        pending,
        approved,
        rejected,
        all: rawDepositList.length,
      },
      amounts: {
        pending: pendingSum,
        approved: approvedSum,
        rejected: rejectedSum,
        total: totalSum,
      },
      pendingDeposits: pendingList,
    };
  }, [rawDepositList]);

  // Filtered deposits based on Active Status Tab & Search term
  const displayedDeposits = useMemo(() => {
    let list = rawDepositList;

    // Filter by status tab
    if (filter && filter !== "all") {
      list = list.filter((d) => d.status === filter);
    }

    // Filter by search query (user name, email address, tx hash, deposit ID, network, etc.)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.id?.toLowerCase().includes(q) ||
          d.tx_hash?.toLowerCase().includes(q) ||
          d.network?.toLowerCase().includes(q) ||
          d.user?.name?.toLowerCase().includes(q) ||
          d.user?.email?.toLowerCase().includes(q) ||
          d.user_name?.toLowerCase().includes(q) ||
          d.user_email?.toLowerCase().includes(q) ||
          d.user_id?.toLowerCase().includes(q) ||
          d.admin_note?.toLowerCase().includes(q) ||
          String(d.amount).includes(q) ||
          (d.approved_amount && String(d.approved_amount).includes(q))
      );
    }

    return list;
  }, [rawDepositList, filter, searchTerm]);

  const selectableDeposits = useMemo(() => {
    return displayedDeposits.filter((d) => d.status === "pending");
  }, [displayedDeposits]);

  // Virtualization ref and scroll margin calculation for window virtualizer
  const listRef = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop || 0);
    }
  }, [displayedDeposits.length, filter, searchTerm, selectedIds.length]);

  const virtualizer = useWindowVirtualizer({
    count: displayedDeposits.length,
    estimateSize: () => 200,
    overscan: 6,
    scrollMargin,
  });

  // Prune selection when data changes
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rawDepositList.some((d) => d.id === id)));
  }, [rawDepositList]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === selectableDeposits.length && selectableDeposits.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableDeposits.map((d) => d.id));
    }
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const openApprove = (d) => {
    setModal({ type: "approve", deposit: d });
    setAmount(String(d.amount));
    setNote("");
  };

  const openReject = (d) => {
    setModal({ type: "reject", deposit: d });
    setNote("");
  };

  const openView = (d) => {
    setModal({ type: "view", deposit: d });
    setCopiedHash(false);
  };

  const openBatchApprove = () => {
    if (selectedIds.length === 0) return;
    setModal({ type: "batch_approve" });
    setNote("Confirmed & verified on blockchain");
  };

  const openBatchReject = () => {
    if (selectedIds.length === 0) return;
    setModal({ type: "batch_reject" });
    setNote("");
  };

  const close = () => {
    setModal(null);
    setNote("");
  };

  const doApprove = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid deposit amount.");
      return;
    }
    try {
      await approve.mutateAsync({ id: modal.deposit.id, approved_amount: amount, note });
      toast.success(`Deposit approved: ${money(amount)} USDT credited to user wallet`);
      setSelectedIds((prev) => prev.filter((id) => id !== modal.deposit.id));
      close();
    } catch (e) {
      toast.error(apiError(e, "Could not approve deposit"));
    }
  };

  const doReject = async () => {
    try {
      await reject.mutateAsync({ id: modal.deposit.id, note });
      toast.success("Deposit rejected. No wallet funds credited.");
      setSelectedIds((prev) => prev.filter((id) => id !== modal.deposit.id));
      close();
    } catch (e) {
      toast.error(apiError(e, "Could not reject deposit"));
    }
  };

  const doBatchApprove = async () => {
    try {
      const res = await batchApprove.mutateAsync({ ids: selectedIds, note });
      const count = res?.count || selectedIds.length;
      toast.success(`Successfully approved ${count} deposit${count === 1 ? "" : "s"} and credited wallets!`);
      clearSelection();
      close();
    } catch (e) {
      toast.error(apiError(e, "Batch approval failed. Please try again."));
    }
  };

  const doBatchReject = async () => {
    if (note.trim().length < 3) {
      toast.error("Please specify a rejection reason (min 3 characters).");
      return;
    }
    try {
      const res = await batchReject.mutateAsync({ ids: selectedIds, reason: note.trim() });
      const count = res?.count || selectedIds.length;
      toast.success(`Successfully rejected ${count} deposit${count === 1 ? "" : "s"}.`);
      clearSelection();
      close();
    } catch (e) {
      toast.error(apiError(e, "Batch rejection failed. Please try again."));
    }
  };

  const copyTxHash = (hash) => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopiedHash(true);
    toast.success("Transaction hash copied to clipboard");
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const isAllSelected =
    selectableDeposits.length > 0 && selectedIds.length === selectableDeposits.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < selectableDeposits.length;

  const selectedDepositsData = useMemo(() => {
    return rawDepositList.filter((d) => selectedIds.includes(d.id));
  }, [rawDepositList, selectedIds]);

  const selectedTotalAmount = useMemo(() => {
    return selectedDepositsData.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
  }, [selectedDepositsData]);

  const handleExportCsv = (onlySelected = false) => {
    const recordsToExport =
      onlySelected && selectedIds.length > 0
        ? selectedDepositsData
        : displayedDeposits;

    if (recordsToExport.length === 0) {
      toast.error("No deposit records available to export with current filters.");
      return;
    }

    const exportStatusTag =
      onlySelected && selectedIds.length > 0
        ? "selected"
        : filter || "all";

    const { filename, count } = exportDepositsToCsv(
      recordsToExport,
      exportStatusTag,
      searchTerm
    );

    toast.success(
      `Exported ${count} deposit record${count === 1 ? "" : "s"} to CSV (${filename})`
    );
  };

  const getEmptyStateDetails = () => {
    if (searchTerm.trim()) {
      return {
        title: "No matching deposits",
        description: `No deposit records matched your search query "${searchTerm}".`,
      };
    }
    if (filter === "pending") {
      return {
        title: "All pending deposits cleared",
        description: "Great job! There are currently no pending blockchain deposits awaiting admin review.",
      };
    }
    if (filter === "approved") {
      return {
        title: "No approved deposits",
        description: "Approved deposit transactions will appear here once verified.",
      };
    }
    if (filter === "rejected") {
      return {
        title: "No rejected deposits",
        description: "No deposit records have been rejected.",
      };
    }
    return {
      title: "No deposits found",
      description: "No deposit records found on the platform.",
    };
  };

  return (
    <div className="space-y-6 pb-24" data-testid="admin-deposits-page">
      <PageHeading
        title="Deposit Verification"
        subtitle="Review, batch-approve, or reject incoming USDT blockchain deposits with user payment proofs."
        icon={Inbox}
      />

      {/* Interactive Status Tabs (Pending, Approved, Rejected, All) & KPI Cards */}
      <AdminStatusTabs
        activeTab={filter}
        onTabChange={(newTab) => {
          setFilter(newTab);
          clearSelection();
        }}
        counts={counts}
        amounts={amounts}
        cardType="deposits"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by user name, email address, TXID..."
        filteredCount={displayedDeposits.length}
        onExportCsv={() => handleExportCsv(false)}
        exportLabel="Export CSV"
        exportDisabled={isLoading || displayedDeposits.length === 0}
        extraControls={
          <button
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/10 transition"
            title="Refresh deposits"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-purple-400" : ""}`} />
            <span className="hidden sm:inline">{isRefetching ? "Syncing..." : "Refresh"}</span>
          </button>
        }
      />

      {/* Batch Selection Master Controls (shown when there are pending deposits) */}
      {selectableDeposits.length > 0 && (
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
                  ? `Selected (${selectedIds.length}/${selectableDeposits.length})`
                  : `Select All Pending (${selectableDeposits.length})`}
              </span>
            </label>

            {/* Bulk Action Dropdown next to the batch selection checkbox */}
            <AdminBulkActionDropdown
              selectedCount={selectedIds.length}
              totalCount={selectableDeposits.length}
              isAllSelected={isAllSelected}
              onSelectAll={handleSelectAllToggle}
              onClearSelection={clearSelection}
              onExportSelected={() => handleExportCsv(true)}
              testId="deposits-bulk-action-dropdown"
              actions={[
                {
                  key: "approve",
                  label: "Set Status: Approved",
                  description: "Batch verify and credit USDT balance to investor wallets",
                  icon: CheckCircle2,
                  color: "emerald",
                  onClick: () => {
                    setNote("");
                    setModal({ type: "batch_approve" });
                  },
                },
                {
                  key: "reject",
                  label: "Set Status: Rejected",
                  description: "Reject deposits and send notification reason to investors",
                  icon: XCircle,
                  color: "rose",
                  isDanger: true,
                  onClick: () => {
                    setNote("");
                    setModal({ type: "batch_reject" });
                  },
                },
              ]}
            />
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-emerald-400 font-mono font-bold">
                {money(selectedTotalAmount)} USDT Total
              </span>
              <div className="h-3 w-[1px] bg-white/20" />
              <button
                type="button"
                onClick={() => handleExportCsv(true)}
                className="flex items-center gap-1 text-purple-300 hover:text-white transition font-medium"
                title="Export only selected deposits to CSV"
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

      {/* Main List */}
      <div>
        {isLoading ? (
          <EasyXLoader />
        ) : displayedDeposits.length === 0 ? (
          <EasyXEmptyState
            icon={Inbox}
            title={getEmptyStateDetails().title}
            description={getEmptyStateDetails().description}
          />
        ) : (
          <div
            ref={listRef}
            className="relative w-full"
            style={{ height: `${virtualizer.getTotalSize()}px` }}
            data-testid="admin-deposits-list"
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const d = displayedDeposits[virtualRow.index];
              if (!d) return null;
              const isSelected = selectedIds.includes(d.id);
              const isPending = d.status === "pending";

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start - (virtualizer.options.scrollMargin ?? 0)}px)`,
                    paddingBottom: "12px",
                  }}
                >
                  <EasyXCard
                    className={`p-5 border transition-all duration-200 ${
                      isSelected
                        ? "border-purple-500/60 bg-purple-950/20 ring-1 ring-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                        : "border-white/8 hover:border-white/16"
                    }`}
                    data-testid={`admin-deposit-${d.id}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      {/* Left Column: Details */}
                      <div className="space-y-3 min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          {/* Item Selection Checkbox */}
                          {isPending ? (
                            <div className="pt-0.5">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(d.id)}
                                data-testid={`admin-deposit-checkbox-${d.id}`}
                                className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-500"
                                title="Select for batch action"
                              />
                            </div>
                          ) : (
                            <div className="pt-0.5 opacity-30">
                              <Square className="h-4 w-4 text-ex-muted" />
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="text-xl font-extrabold text-ex-text">
                              {money(d.amount)} USDT
                            </span>
                            <NetworkBadge network={d.network} />
                            <StatusBadge status={d.status} />
                            {isSelected && (
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Selected
                              </span>
                            )}
                            {d.status === "approved" && d.approved_amount && (
                              <span className="text-xs font-semibold text-emerald-400">
                                (Credited: {money(d.approved_amount)} USDT)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 text-xs text-ex-muted pl-7 sm:pl-7">
                          <div>
                            <span className="text-ex-muted/60">User:</span>{" "}
                            <strong className="text-ex-text font-medium">
                              {d.user?.name || "—"}
                            </strong>{" "}
                            <span className="text-[11px] block truncate">{d.user?.email || d.user_id}</span>
                          </div>

                          <div>
                            <span className="text-ex-muted/60">Deposit ID:</span>{" "}
                            <span className="font-mono text-[11px] text-ex-lav-200 block truncate">
                              {d.id}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <span className="text-ex-muted/60">Tx Hash:</span>
                            {d.tx_hash ? (
                              <div className="font-mono text-[11px] text-ex-text truncate flex items-center gap-1">
                                <span className="truncate">{d.tx_hash}</span>
                                <button
                                  onClick={() => copyTxHash(d.tx_hash)}
                                  className="text-ex-lav-300 hover:text-white shrink-0 p-0.5"
                                  title="Copy Tx Hash"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="text-[11px] text-ex-muted/70 italic">
                                Transaction hash: Not provided
                              </div>
                            )}
                          </div>

                          <div>
                            <span className="text-ex-muted/60">Submitted Date:</span>
                            <div className="text-ex-text font-medium">
                              {dayjs(d.created_at).format("DD MMM YYYY, HH:mm")}
                            </div>
                          </div>
                        </div>

                        {/* Payment Proof Images Thumbnails on Card */}
                        <div className="pt-1 pl-7 sm:pl-7">
                          <div className="text-xs text-ex-muted/70 mb-1.5 flex items-center gap-1.5">
                            <FileImage className="h-3.5 w-3.5 text-ex-lav-300" />
                            <span className="font-semibold text-ex-text">
                              Payment Proof ({d.proof_images?.length || 0} image{d.proof_images?.length === 1 ? "" : "s"}):
                            </span>
                            {(!d.proof_images || d.proof_images.length === 0) && (
                              <span className="text-[11px] text-ex-muted italic">None</span>
                            )}
                          </div>

                          {d.proof_images && d.proof_images.length > 0 && (
                            <div className="flex flex-wrap items-center gap-2">
                              {d.proof_images.map((img, idx) => (
                                <DepositProofThumb
                                  key={idx}
                                  img={img}
                                  idx={idx}
                                  title={`Payment Proof #${idx + 1} — ${d.user?.name || d.user?.email || "User"} (${money(d.amount)} USDT ${d.network})`}
                                  onOpen={(url, title) => setLightbox({ url, title })}
                                />
                              ))}
                            </div>
                          )}
                        </div>

                        {d.admin_note && (
                          <div className="text-xs p-2 rounded-md bg-white/[0.03] border border-white/6 text-ex-muted ml-7">
                            <span className="font-semibold text-ex-text">Admin Note:</span> {d.admin_note}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Actions */}
                      <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                        <button
                          onClick={() => openView(d)}
                          className="px-3 py-2 rounded-ex-ctrl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-text transition flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> View Details
                        </button>

                        {d.status === "pending" && (
                          <>
                            <EasyXButton
                              variant="accent"
                              className="h-9 px-3.5 text-xs font-bold"
                              onClick={() => openApprove(d)}
                              data-testid={`admin-approve-${d.id}`}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" /> Approve
                            </EasyXButton>
                            <EasyXButton
                              variant="ghost"
                              className="h-9 px-3.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
                              onClick={() => openReject(d)}
                              data-testid={`admin-reject-${d.id}`}
                            >
                              <X className="mr-1 h-3.5 w-3.5" /> Reject
                            </EasyXButton>
                          </>
                        )}
                      </div>
                    </div>
                  </EasyXCard>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOATING BATCH ACTIONS DOCK (Appears when >= 1 item is selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-2xl w-[94vw] bg-neutral-900/95 border border-purple-500/40 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.25)] rounded-2xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                <span>{selectedIds.length} Deposits Selected</span>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  {money(selectedTotalAmount)} USDT
                </span>
              </div>
              <div className="text-[11px] text-ex-muted hidden sm:block">
                Batch credit investor wallets or reject
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EasyXButton
              variant="accent"
              onClick={openBatchApprove}
              loading={batchApprove.isPending}
              data-testid="admin-deposits-batch-approve-btn"
              className="h-9 px-3 sm:px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Batch Approve ({selectedIds.length})
            </EasyXButton>

            <EasyXButton
              variant="ghost"
              onClick={openBatchReject}
              loading={batchReject.isPending}
              data-testid="admin-deposits-batch-reject-btn"
              className="h-9 px-3 sm:px-4 text-xs font-bold text-rose-300 hover:text-white bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30"
            >
              <XCircle className="mr-1.5 h-3.5 w-3.5" /> Batch Reject ({selectedIds.length})
            </EasyXButton>

            <button
              type="button"
              onClick={clearSelection}
              className="p-2 rounded-lg text-ex-muted hover:text-white hover:bg-white/10 transition"
              title="Deselect all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* BATCH APPROVE MODAL */}
      <EasyXModal
        open={modal?.type === "batch_approve"}
        onClose={close}
        title={`Batch Approve (${selectedIds.length}) Deposits`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-ex-card bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <div className="font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Wallet Balance Credit Confirmation
              </span>
              <span className="font-mono text-sm font-extrabold text-emerald-400">
                Total: {money(selectedTotalAmount)} USDT
              </span>
            </div>
            <div className="mt-1 text-emerald-200/90 leading-relaxed">
              Approving these <strong>{selectedIds.length}</strong> deposits will instantly credit each user's wallet with their requested USDT amount and create notifications.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ex-muted mb-2">Selected Deposits to Credit:</div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-white/10">
              {selectedDepositsData.map((d) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded hover:bg-white/5 border-b border-white/5 last:border-0">
                  <div>
                    <span className="font-medium text-white">{d.user?.name || d.user?.email || "Investor"}</span>
                    <span className="text-ex-muted text-[11px] block">{d.network} · {dayjs(d.created_at).format("DD MMM, HH:mm")}</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    +{money(d.amount)} USDT
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">
              Admin Note (Optional, recorded in audit logs)
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Batch verified on chain"
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-emerald-400 focus:outline-none"
              data-testid="admin-deposits-batch-approve-note"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-white/8">
            <button
              onClick={close}
              className="flex-1 px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
            >
              Cancel
            </button>
            <EasyXButton
              onClick={doBatchApprove}
              loading={batchApprove.isPending}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
              data-testid="admin-deposits-batch-approve-confirm-btn"
            >
              <Check className="mr-1.5 h-4 w-4" /> Approve &amp; Credit ({money(selectedTotalAmount)} USDT)
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* BATCH REJECT MODAL */}
      <EasyXModal
        open={modal?.type === "batch_reject"}
        onClose={close}
        title={`Batch Reject (${selectedIds.length}) Deposits`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Batch Rejection Notice
            </div>
            <div className="mt-1 text-rose-200/90 leading-relaxed">
              Rejecting <strong>{selectedIds.length}</strong> deposits will mark them as rejected without crediting wallet balances. The reason will be sent to the affected investors.
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Quick Reason Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_DEPOSIT_REASONS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNote(p)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/10 transition text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">
              Rejection Reason for Selected Deposits
            </label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Unverified transaction hash on chain, invalid payment proof"
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-rose-400 focus:outline-none"
              data-testid="admin-deposits-batch-reject-reason-input"
            />
          </div>

          <div className="flex gap-2 pt-3 border-t border-white/8">
            <button
              onClick={close}
              className="flex-1 px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
            >
              Cancel
            </button>
            <EasyXButton
              onClick={doBatchReject}
              loading={batchReject.isPending}
              className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold"
              data-testid="admin-deposits-batch-reject-confirm-btn"
            >
              <X className="mr-1.5 h-4 w-4" /> Reject All {selectedIds.length}
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* DETAIL INSPECTION MODAL */}
      <EasyXModal
        open={modal?.type === "view"}
        onClose={close}
        title="Deposit Transaction Inspection"
      >
        {modal?.deposit && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between p-3.5 rounded-ex-card bg-white/[0.03] border border-white/8">
              <div>
                <div className="text-xs text-ex-muted">Submitted Amount</div>
                <div className="text-xl font-extrabold text-ex-text mt-0.5">
                  {money(modal.deposit.amount)} USDT
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <NetworkBadge network={modal.deposit.network} />
                <StatusBadge status={modal.deposit.status} />
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-ex-ctrl bg-white/[0.02] border border-white/6 flex justify-between">
                <span className="text-ex-muted">User</span>
                <span className="font-semibold text-ex-text">
                  {modal.deposit.user?.name || "—"} ({modal.deposit.user?.email || modal.deposit.user_id})
                </span>
              </div>

              <div className="p-2.5 rounded-ex-ctrl bg-white/[0.02] border border-white/6 flex justify-between items-center">
                <span className="text-ex-muted">Deposit ID</span>
                <span className="font-mono text-ex-lav-200">{modal.deposit.id}</span>
              </div>

              {/* Transaction Hash */}
              <div className="p-2.5 rounded-ex-ctrl bg-white/[0.02] border border-white/6">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-ex-muted">Transaction Hash</span>
                  {modal.deposit.tx_hash && (
                    <button
                      onClick={() => copyTxHash(modal.deposit.tx_hash)}
                      className="text-ex-accent hover:underline flex items-center gap-1 font-semibold"
                    >
                      {copiedHash ? <CheckCheck className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {copiedHash ? "Copied" : "Copy"}
                    </button>
                  )}
                </div>
                {modal.deposit.tx_hash ? (
                  <div className="font-mono text-ex-text break-all bg-black/40 p-2 rounded border border-white/6">
                    {modal.deposit.tx_hash}
                  </div>
                ) : (
                  <div className="text-ex-muted/70 italic py-1">
                    Transaction hash: Not provided
                  </div>
                )}
              </div>

              {/* Payment Proof Images in Modal */}
              <div className="p-3 rounded-ex-ctrl bg-white/[0.02] border border-white/6 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ex-text text-xs flex items-center gap-1.5">
                    <FileImage className="h-3.5 w-3.5 text-ex-lav-300" />
                    Payment Proof Images ({modal.deposit.proof_images?.length || 0} uploaded)
                  </span>
                  {modal.deposit.proof_images?.length > 0 && (
                    <span className="text-[11px] text-ex-muted">Click image to inspect</span>
                  )}
                </div>

                {modal.deposit.proof_images && modal.deposit.proof_images.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {modal.deposit.proof_images.map((img, idx) => (
                      <DepositProofThumb
                        key={idx}
                        img={img}
                        idx={idx}
                        className="aspect-video w-full"
                        title={`Payment Proof #${idx + 1} — ${modal.deposit.user?.name || modal.deposit.user?.email || "User"} (${money(modal.deposit.amount)} USDT)`}
                        onOpen={(url, title) => setLightbox({ url, title })}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-ex-muted/70 italic py-1">No payment proof uploaded.</div>
                )}
              </div>

              <div className="p-2.5 rounded-ex-ctrl bg-white/[0.02] border border-white/6 flex justify-between">
                <span className="text-ex-muted">Submitted Date</span>
                <span className="text-ex-text">
                  {dayjs(modal.deposit.created_at).format("DD MMM YYYY, HH:mm:ss")}
                </span>
              </div>

              {modal.deposit.decided_at && (
                <div className="p-2.5 rounded-ex-ctrl bg-white/[0.02] border border-white/6 flex justify-between">
                  <span className="text-ex-muted">Decision Date</span>
                  <span className="text-ex-text">
                    {dayjs(modal.deposit.decided_at).format("DD MMM YYYY, HH:mm:ss")}
                  </span>
                </div>
              )}
            </div>

            {modal.deposit.status === "pending" && (
              <div className="flex gap-2 pt-3 border-t border-white/8">
                <EasyXButton
                  variant="ghost"
                  className="flex-1 text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
                  onClick={() => openReject(modal.deposit)}
                >
                  <X className="mr-1.5 h-4 w-4" /> Reject
                </EasyXButton>
                <EasyXButton
                  variant="accent"
                  className="flex-1 font-bold"
                  onClick={() => openApprove(modal.deposit)}
                >
                  <Check className="mr-1.5 h-4 w-4" /> Approve Deposit
                </EasyXButton>
              </div>
            )}
          </div>
        )}
      </EasyXModal>

      {/* APPROVE MODAL */}
      <EasyXModal
        open={modal?.type === "approve"}
        onClose={close}
        title="Approve & Credit Deposit"
      >
        {modal?.deposit && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-ex-card bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                Wallet Ledger Transaction
              </div>
              <div className="mt-1 text-emerald-200/90 leading-relaxed">
                Approving will create an immutable credit ledger entry of exactly{" "}
                <strong>{money(amount || 0)} USDT</strong> to the user's available wallet balance.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Amount to Credit (USDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
                data-testid="admin-approve-amount"
              />
              <p className="mt-1 text-[11px] text-ex-muted">
                Submitted user amount: {money(modal.deposit.amount)} USDT.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Admin Note (Optional)
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Verified on Tronscan / BscScan / Screenshot confirmed"
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/8">
              <button
                onClick={close}
                className="flex-1 px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
              >
                Cancel
              </button>
              <EasyXButton
                variant="accent"
                className="flex-1 font-bold"
                onClick={doApprove}
                loading={approve.isPending}
                data-testid="admin-approve-confirm"
              >
                <Check className="mr-1.5 h-4 w-4" /> Confirm & Credit
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* REJECT MODAL */}
      <EasyXModal
        open={modal?.type === "reject"}
        onClose={close}
        title="Reject Deposit"
      >
        {modal?.deposit && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                No Wallet Funds Will Be Credited
              </div>
              <div className="mt-1 text-rose-200/90 leading-relaxed">
                Rejecting deposit <strong>{modal.deposit.id}</strong> will mark it as rejected.
                An audit log and in-app user notification will be created.
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Rejection Reason
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Invalid proof screenshot, incorrect amount, or unconfirmed funds"
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/8">
              <button
                onClick={close}
                className="flex-1 px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text hover:bg-white/5"
              >
                Cancel
              </button>
              <EasyXButton
                onClick={doReject}
                loading={reject.isPending}
                className="flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold"
                data-testid="admin-reject-confirm"
              >
                <X className="mr-1.5 h-4 w-4" /> Confirm Rejection
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* INTERACTIVE ENLARGED PROOF IMAGE ZOOM & ROTATE INSPECTION MODAL */}
      <AdminImageZoomModal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        imageUrl={lightbox?.url}
        title={lightbox?.title || "Payment Proof Inspection"}
        subtitle="Zoom in to inspect transaction IDs, hashes, amounts, timestamps, and wallet address details."
      />
    </div>
  );
}

