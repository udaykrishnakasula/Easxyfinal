import React, { useEffect, useState, useMemo, useRef, useLayoutEffect } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import {
  BadgeCheck,
  FileImage,
  Check,
  X,
  Eye,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  ZoomIn,
  Download,
  CheckSquare,
  Square,
  MinusSquare,
  CheckCircle2,
  XCircle,
  Sparkles,
  Clock,
  RefreshCw,
  Search,
  MapPin,
  Copy,
  Home,
  FileText,
  Building,
  CheckCheck,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminKyc,
  useApproveKyc,
  useRejectKyc,
  useBatchApproveKyc,
  useBatchRejectKyc,
  fetchAdminKycDocUrl,
} from "@/admin/adminApi";
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
import { exportKycToCsv } from "@/admin/utils/csvExport";
import AdminBulkActionDropdown from "@/admin/components/AdminBulkActionDropdown";
import AdminEditKycModal from "@/admin/components/AdminEditKycModal";

const PRESET_REASONS = [
  "ID document image is blurry or unreadable",
  "Live selfie photo face does not match ID document",
  "Permanent address proof document is missing, expired, or unreadable",
  "Submitted identification document has expired",
  "Invalid document format or missing back side (address proof) of ID",
  "Address on ID document does not match submitted permanent address",
  "Incomplete details provided for identity and address verification",
];

function StatusPill({ status }) {
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

function CopyAddressButton({ address }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e) => {
    e.stopPropagation();
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Permanent address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[11px] font-medium text-ex-muted hover:text-white transition border border-white/10"
      title="Copy address to clipboard"
    >
      {copied ? (
        <>
          <CheckCheck className="h-3 w-3 text-emerald-400" />
          <span className="text-emerald-400 font-semibold">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          <span>Copy Address</span>
        </>
      )}
    </button>
  );
}

function DocPreview({ docId, label, onExpand }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  const [errorDetails, setErrorDetails] = useState(null);

  const isAddressProof = label === "id_back" || label === "address_proof";

  useEffect(() => {
    let active = true;
    let objectUrl = null;
    fetchAdminKycDocUrl(docId)
      .then((u) => {
        if (active) {
          objectUrl = u;
          setUrl(u);
        }
      })
      .catch((error) => {
        if (active) {
          setErr(true);
          const status = error?.response?.status || "Network Error";
          const msg = error?.response?.data?.detail || error.message || "Failed to load document";
          setErrorDetails({ status, msg });
          console.error(
            `[Admin KYC Image Error] Failed to fetch KYC document ID: ${docId} (Type: ${label}). HTTP Status: ${status}. Message: ${msg}`,
            error
          );
        }
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, label]);

  const displayLabel =
    label === "id_front"
      ? "Aadhaar / ID Front"
      : label === "id_back"
      ? "Permanent Address Proof (Aadhaar / ID Back)"
      : label === "address_proof"
      ? "Permanent Address Proof Document"
      : label === "selfie"
      ? "Live Selfie Photo"
      : label.replace("_", " ");

  const handleImageDomError = (e) => {
    console.error(
      `[Admin KYC Image Error] Browser failed to decode/render image for docId: ${docId} (${label}). URL: ${url}`,
      e
    );
    setErr(true);
  };

  return (
    <div className="flex flex-col gap-1.5 min-w-[170px] flex-1 sm:flex-initial">
      <div className="text-xs font-semibold text-ex-muted flex items-center justify-between gap-1">
        <span className="capitalize truncate">{displayLabel}</span>
        {isAddressProof && (
          <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Home className="h-2.5 w-2.5" /> Address Proof
          </span>
        )}
      </div>

      {err ? (
        <div className={`flex flex-col items-center justify-center h-36 w-full sm:w-52 rounded-ex-ctrl border ${
          isAddressProof ? "border-purple-500/40 bg-purple-950/30" : "border-purple-500/20 bg-purple-950/20"
        } text-ex-lav-200 text-xs p-3 text-center transition`}>
          <FileImage className="h-7 w-7 mb-1.5 text-ex-lav-300 opacity-80" />
          <span className="font-semibold">{displayLabel}</span>
          <span className="text-[10px] text-white/50 mt-0.5">
            {errorDetails ? `Load Error (${errorDetails.status})` : "Encrypted Document"}
          </span>
        </div>
      ) : url ? (
        <div className={`relative group rounded-ex-ctrl overflow-hidden border ${
          isAddressProof ? "border-purple-500/50 ring-1 ring-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.15)]" : "border-white/10"
        } bg-black/40 h-36 w-full sm:w-52`}>
          <img
            src={url}
            alt={label}
            onError={handleImageDomError}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            data-testid={`kyc-doc-${docId}`}
          />
          {isAddressProof && (
            <div className="absolute top-2 left-2 z-10">
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-purple-900/90 text-purple-200 border border-purple-400/40 backdrop-blur-sm shadow-sm flex items-center gap-1">
                <Home className="h-2.5 w-2.5 text-purple-300" /> Address Proof
              </span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => onExpand(url, displayLabel)}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Zoom & Inspect Document"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              title="Open full resolution"
            >
              <Eye className="h-4 w-4" />
            </a>
          </div>
        </div>
      ) : (
        <div className="grid h-36 w-full sm:w-52 place-items-center rounded-ex-ctrl border border-white/10 bg-white/5">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-ex-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}

export default function AdminKycPage() {
  const [filter, setFilter] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: list, isLoading, isRefetching, refetch } = useAdminKyc();
  const approve = useApproveKyc();
  const reject = useRejectKyc();
  const batchApprove = useBatchApproveKyc();
  const batchReject = useBatchRejectKyc();

  const [selectedIds, setSelectedIds] = useState([]);
  const [modal, setModal] = useState(null); // { type: 'reject'|'batch_approve'|'batch_reject', record? }
  const [editKycRecord, setEditKycRecord] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [lightbox, setLightbox] = useState(null); // { url, title }

  const rawKycRecords = useMemo(() => list || [], [list]);

  // Compute status counts for all tabs
  const counts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    rawKycRecords.forEach((r) => {
      if (r.status === "pending") pending++;
      else if (r.status === "approved") approved++;
      else if (r.status === "rejected") rejected++;
    });

    return {
      pending,
      approved,
      rejected,
      all: rawKycRecords.length,
    };
  }, [rawKycRecords]);

  // Filter list based on selected status tab and search term
  const displayedRecords = useMemo(() => {
    let result = rawKycRecords;

    // Filter by status tab
    if (filter && filter !== "all") {
      result = result.filter((r) => r.status === filter);
    }

    // Filter by search query (user name, email address, ID type, record ID, address, ID number, etc.)
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.id?.toLowerCase().includes(q) ||
          r.user_name?.toLowerCase().includes(q) ||
          r.user_email?.toLowerCase().includes(q) ||
          r.user?.name?.toLowerCase().includes(q) ||
          r.user?.email?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.user_id?.toLowerCase().includes(q) ||
          r.id_type?.toLowerCase().includes(q) ||
          r.id_number?.toLowerCase().includes(q) ||
          r.id_number_masked?.toLowerCase().includes(q) ||
          r.address?.toLowerCase().includes(q) ||
          r.permanent_address?.toLowerCase().includes(q) ||
          r.reject_reason?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [rawKycRecords, filter, searchTerm]);

  const selectableRecords = useMemo(() => {
    return displayedRecords.filter((r) => r.status === "pending");
  }, [displayedRecords]);

  // Virtualization ref and dynamic scroll margin for KYC records list
  const listRef = useRef(null);
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    if (listRef.current) {
      setScrollMargin(listRef.current.offsetTop || 0);
    }
  }, [displayedRecords.length, filter, searchTerm, selectedIds.length]);

  const virtualizer = useWindowVirtualizer({
    count: displayedRecords.length,
    estimateSize: () => 260,
    overscan: 6,
    scrollMargin,
  });

  // Reset or prune selection when list changes
  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => rawKycRecords.some((r) => r.id === id)));
  }, [rawKycRecords]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllToggle = () => {
    if (selectedIds.length === selectableRecords.length && selectableRecords.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableRecords.map((r) => r.id));
    }
  };

  const selectAllPending = () => {
    setSelectedIds(selectableRecords.map((r) => r.id));
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const openReject = (rec) => {
    setModal({ type: "reject", record: rec });
    setRejectReason("");
  };

  const openBatchApprove = () => {
    if (selectedIds.length === 0) return;
    setModal({ type: "batch_approve" });
  };

  const openBatchReject = () => {
    if (selectedIds.length === 0) return;
    setModal({ type: "batch_reject" });
    setRejectReason("");
  };

  const close = () => {
    setModal(null);
    setRejectReason("");
  };

  const doApprove = async (rec) => {
    try {
      await approve.mutateAsync({ id: rec.id });
      toast.success(`KYC identity verification approved for ${rec.user_name || rec.user_email}`);
      setSelectedIds((prev) => prev.filter((i) => i !== rec.id));
    } catch (e) {
      toast.error(apiError(e, "Could not approve KYC submission"));
    }
  };

  const doReject = async () => {
    if (rejectReason.trim().length < 3) {
      toast.error("Please enter a specific rejection reason (min 3 characters).");
      return;
    }
    try {
      await reject.mutateAsync({ id: modal.record.id, reason: rejectReason.trim() });
      toast.success("KYC submission rejected. Reason logged and user notified.");
      setSelectedIds((prev) => prev.filter((i) => i !== modal.record.id));
      close();
    } catch (e) {
      toast.error(apiError(e, "Could not reject KYC submission"));
    }
  };

  const doBatchApprove = async () => {
    try {
      const res = await batchApprove.mutateAsync({ ids: selectedIds });
      const count = res?.count || selectedIds.length;
      toast.success(`Successfully approved ${count} KYC identity verification${count === 1 ? "" : "s"}!`);
      clearSelection();
      close();
    } catch (e) {
      toast.error(apiError(e, "Batch approval failed. Please try again."));
    }
  };

  const doBatchReject = async () => {
    if (rejectReason.trim().length < 3) {
      toast.error("Please specify a rejection reason (min 3 characters).");
      return;
    }
    try {
      const res = await batchReject.mutateAsync({ ids: selectedIds, reason: rejectReason.trim() });
      const count = res?.count || selectedIds.length;
      toast.success(`Successfully rejected ${count} KYC submission${count === 1 ? "" : "s"}.`);
      clearSelection();
      close();
    } catch (e) {
      toast.error(apiError(e, "Batch rejection failed. Please try again."));
    }
  };

  const isAllSelected =
    selectableRecords.length > 0 && selectedIds.length === selectableRecords.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < selectableRecords.length;

  const selectedRecordsData = useMemo(() => {
    return rawKycRecords.filter((r) => selectedIds.includes(r.id));
  }, [rawKycRecords, selectedIds]);

  const handleExportCsv = (onlySelected = false) => {
    const recordsToExport =
      onlySelected && selectedIds.length > 0
        ? selectedRecordsData
        : displayedRecords;

    if (recordsToExport.length === 0) {
      toast.error("No KYC records available to export with current filters.");
      return;
    }

    const exportStatusTag =
      onlySelected && selectedIds.length > 0
        ? "selected"
        : filter || "all";

    const { filename, count } = exportKycToCsv(
      recordsToExport,
      exportStatusTag,
      searchTerm
    );

    toast.success(
      `Exported ${count} KYC record${count === 1 ? "" : "s"} to CSV (${filename})`
    );
  };

  const getEmptyStateDetails = () => {
    if (searchTerm.trim()) {
      return {
        title: "No matching KYC submissions",
        description: `No identity verification records matched your search query "${searchTerm}".`,
      };
    }
    if (filter === "pending") {
      return {
        title: "All KYC submissions cleared",
        description: "Great work! There are no pending identity verifications awaiting admin review.",
      };
    }
    if (filter === "approved") {
      return {
        title: "No approved KYC submissions",
        description: "Approved investor identity verifications will appear here.",
      };
    }
    if (filter === "rejected") {
      return {
        title: "No rejected KYC submissions",
        description: "No identity verification records have been rejected.",
      };
    }
    return {
      title: "No KYC submissions found",
      description: "No identity verification records exist on the platform.",
    };
  };

  return (
    <div className="space-y-6 pb-24" data-testid="admin-kyc-page">
      <PageHeading
        title="KYC & Identity Verification"
        subtitle="Review, inspect, batch-verify, or reject submitted National IDs, Aadhaar cards, and live selfie photos."
        icon={BadgeCheck}
      />

      {/* Interactive Status Tabs (Pending, Approved, Rejected, All) & KPI Cards */}
      <AdminStatusTabs
        activeTab={filter}
        onTabChange={(newTab) => {
          setFilter(newTab);
          clearSelection();
        }}
        counts={counts}
        cardType="kyc"
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by user name, email address, ID type..."
        filteredCount={displayedRecords.length}
        onExportCsv={() => handleExportCsv(false)}
        exportLabel="Export CSV"
        exportDisabled={isLoading || displayedRecords.length === 0}
        extraControls={
          <button
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/10 transition"
            title="Refresh KYC records"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-purple-400" : ""}`} />
            <span className="hidden sm:inline">{isRefetching ? "Syncing..." : "Refresh"}</span>
          </button>
        }
      />

      {/* Batch Selection Master Controls (shown when there are pending KYC records) */}
      {selectableRecords.length > 0 && (
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
                  ? `Selected (${selectedIds.length}/${selectableRecords.length})`
                  : `Select All Pending (${selectableRecords.length})`}
              </span>
            </label>

            {/* Bulk Action Dropdown next to the batch selection checkbox */}
            <AdminBulkActionDropdown
              selectedCount={selectedIds.length}
              totalCount={selectableRecords.length}
              isAllSelected={isAllSelected}
              onSelectAll={handleSelectAllToggle}
              onClearSelection={clearSelection}
              onExportSelected={() => handleExportCsv(true)}
              testId="kyc-bulk-action-dropdown"
              actions={[
                {
                  key: "approve",
                  label: "Set Status: Approved",
                  description: "Approve identity verifications and unlock user withdrawals",
                  icon: CheckCircle2,
                  color: "emerald",
                  onClick: () => {
                    setModal({ type: "batch_approve" });
                  },
                },
                {
                  key: "reject",
                  label: "Set Status: Rejected",
                  description: "Reject KYC documents and send rejection guidance to users",
                  icon: XCircle,
                  color: "rose",
                  isDanger: true,
                  onClick: () => {
                    setRejectReason(PRESET_REASONS[0]);
                    setModal({ type: "batch_reject" });
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
                onClick={() => handleExportCsv(true)}
                className="flex items-center gap-1 text-purple-300 hover:text-white transition font-medium"
                title="Export only selected KYC records to CSV"
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
      {isLoading ? (
        <EasyXLoader />
      ) : displayedRecords.length === 0 ? (
        <EasyXEmptyState
          icon={BadgeCheck}
          title={getEmptyStateDetails().title}
          description={getEmptyStateDetails().description}
        />
      ) : (
        <div
          ref={listRef}
          className="relative w-full"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
          data-testid="admin-kyc-list"
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const rec = displayedRecords[virtualRow.index];
            if (!rec) return null;
            const isSelected = selectedIds.includes(rec.id);
            const isPending = rec.status === "pending";

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
                  paddingBottom: "16px",
                }}
              >
                <EasyXCard
                  className={`p-5 border space-y-4 transition-all duration-200 ${
                    isSelected
                      ? "border-purple-500/60 bg-purple-950/20 ring-1 ring-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                      : "border-white/8 hover:border-white/16"
                  }`}
                  data-testid={`admin-kyc-row-${rec.id}`}
                >
                  {/* Header and User Details */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Item Selection Checkbox */}
                      {isPending ? (
                        <div className="pt-0.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(rec.id)}
                            data-testid={`admin-kyc-checkbox-${rec.id}`}
                            className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-500"
                            title="Select for batch action"
                          />
                        </div>
                      ) : (
                        <div className="pt-0.5 opacity-30">
                          <Square className="h-4 w-4 text-ex-muted" />
                        </div>
                      )}

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-bold text-ex-text">
                            {rec.user_name || "Investor"}
                          </span>
                          <StatusPill status={rec.status} />
                          {isSelected && (
                            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              Selected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-ex-muted flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>{rec.user_email}</span>
                          <span>·</span>
                          <span>
                            ID Type: <strong className="text-ex-text uppercase">{rec.id_type || "National ID"}</strong>
                          </span>
                          {rec.id_number || rec.id_number_masked ? (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400 font-mono font-medium">
                                ID No: {rec.id_number || rec.id_number_masked}
                              </span>
                            </>
                          ) : rec.id_number_present ? (
                            <>
                              <span>·</span>
                              <span className="text-emerald-400 font-medium">ID on File (Encrypted)</span>
                            </>
                          ) : null}
                        </div>
                        {(rec.permanent_address || rec.address) && (
                          <div className="text-xs text-ex-text/90 flex items-start gap-1.5 pt-1">
                            <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                            <span className="leading-snug">
                              <span className="text-ex-muted font-normal">Permanent Address:</span>{" "}
                              <span className="text-white font-medium">{rec.permanent_address || rec.address}</span>
                            </span>
                          </div>
                        )}
                        <div className="text-[11px] text-ex-muted pt-0.5">
                          Submitted: {rec.submitted_at ? dayjs(rec.submitted_at).format("DD MMM YYYY, HH:mm:ss") : "—"}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      {rec.status === "pending" && (
                        <>
                          <EasyXButton
                            variant="accent"
                            onClick={() => doApprove(rec)}
                            loading={approve.isPending}
                            data-testid={`admin-kyc-approve-${rec.id}`}
                            className="font-bold text-xs h-9"
                          >
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Approve KYC
                          </EasyXButton>
                          <EasyXButton
                            variant="ghost"
                            onClick={() => openReject(rec)}
                            data-testid={`admin-kyc-reject-open-${rec.id}`}
                            className="font-bold text-xs h-9 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20"
                          >
                            <X className="mr-1.5 h-3.5 w-3.5" /> Reject
                          </EasyXButton>
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditKycRecord(rec)}
                        data-testid={`admin-kyc-edit-btn-${rec.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-ex-ctrl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-semibold transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" /> Edit Details
                      </button>
                    </div>
                  </div>

                  {/* Permanent Address Proof Detailed Panel */}
                  <div className="p-3.5 rounded-ex-ctrl bg-purple-950/20 border border-purple-500/25 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                          <Home className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-2">
                            <span>Permanent Residential Address Proof</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                              {rec.documents?.some((d) => d.doc_type === "id_back" || d.doc_type === "address_proof")
                                ? "Proof Document Linked"
                                : "Address On Record"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {(rec.permanent_address || rec.address) && (
                          <CopyAddressButton address={rec.permanent_address || rec.address} />
                        )}
                        {rec.documents?.find((d) => d.doc_type === "id_back" || d.doc_type === "address_proof") && (
                          <button
                            type="button"
                            onClick={() => {
                              const docItem = rec.documents.find((d) => d.doc_type === "id_back" || d.doc_type === "address_proof");
                              fetchAdminKycDocUrl(docItem.id).then((url) => {
                                setLightbox({
                                  url,
                                  title: "Permanent Address Proof (Aadhaar / ID Back)",
                                  details: [
                                    { label: "Permanent Address", value: rec.permanent_address || rec.address || "—" },
                                    { label: "ID Type", value: (rec.id_type || "National ID").toUpperCase() },
                                    { label: "User", value: `${rec.user_name || "User"} (${rec.user_email})` },
                                  ],
                                });
                              });
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-purple-600/30 hover:bg-purple-600/50 text-[11px] font-semibold text-purple-200 hover:text-white transition border border-purple-500/40"
                          >
                            <ZoomIn className="h-3.5 w-3.5" /> Inspect Address Proof
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3 rounded bg-black/40 border border-white/8 flex items-start gap-2.5">
                      <MapPin className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-white break-words leading-relaxed">
                          {rec.permanent_address || rec.address || (
                            <span className="text-ex-muted italic font-normal">No permanent residential address submitted</span>
                          )}
                        </div>
                        <div className="text-[11px] text-ex-lav-300/80 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span>
                            Proof Source:{" "}
                            <strong className="text-white font-medium">
                              {rec.documents?.some((d) => d.doc_type === "id_back" || d.doc_type === "address_proof")
                                ? "Aadhaar / National ID Back Side (Address Proof)"
                                : "Primary ID Record"}
                            </strong>
                          </span>
                          <span>·</span>
                          <span className="text-emerald-400 font-medium">✓ Address text on file</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Document & Live Camera Selfie Inspection Section */}
                  <div className="p-3.5 rounded-ex-ctrl bg-black/20 border border-white/6 space-y-2">
                    <div className="text-xs font-semibold text-ex-muted flex items-center justify-between">
                      <span>Submitted Documents &amp; Live Camera Selfie</span>
                      <span className="text-[10px] text-ex-lav-300 font-mono">Manual Verification</span>
                    </div>

                    <div className="flex flex-wrap gap-4 pt-1">
                      {rec.documents && rec.documents.length > 0 ? (
                        rec.documents.map((d) => (
                          <DocPreview
                            key={d.id}
                            docId={d.id}
                            label={d.doc_type === "selfie" ? "Live Camera Selfie" : d.doc_type}
                            onExpand={(url, title) =>
                              setLightbox({
                                url,
                                title,
                                details: [
                                  { label: "Permanent Address", value: rec.permanent_address || rec.address || "—" },
                                  { label: "ID Type", value: (rec.id_type || "National ID").toUpperCase() },
                                  { label: "User", value: `${rec.user_name || "User"} (${rec.user_email})` },
                                ],
                              })
                            }
                          />
                        ))
                      ) : (
                        <div className="text-xs text-ex-muted italic">No documents attached.</div>
                      )}
                    </div>
                  </div>

                  {/* Rejection Reason display if rejected */}
                  {rec.status === "rejected" && rec.reject_reason && (
                    <div className="rounded-ex-ctrl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                      <div>
                        <span className="font-bold">Rejection Reason:</span> {rec.reject_reason}
                      </div>
                    </div>
                  )}
                </EasyXCard>
              </div>
            );
          })}
        </div>
      )}

      {/* FLOATING BATCH ACTIONS DOCK (Appears when >= 1 item is selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92vw] bg-neutral-900/95 border border-purple-500/40 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.25)] rounded-2xl px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600/30 text-purple-300 border border-purple-500/40">
              <CheckSquare className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>{selectedIds.length} KYC {selectedIds.length === 1 ? "Item" : "Items"} Selected</span>
              </div>
              <div className="text-[11px] text-ex-muted hidden sm:block">
                Batch apply verification decision
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EasyXButton
              variant="accent"
              onClick={openBatchApprove}
              loading={batchApprove.isPending}
              data-testid="admin-kyc-batch-approve-btn"
              className="h-9 px-3 sm:px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
            >
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Batch Approve ({selectedIds.length})
            </EasyXButton>

            <EasyXButton
              variant="ghost"
              onClick={openBatchReject}
              loading={batchReject.isPending}
              data-testid="admin-kyc-batch-reject-btn"
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

      {/* SINGLE REJECT MODAL */}
      <EasyXModal
        open={modal?.type === "reject"}
        onClose={close}
        title="Reject KYC Submission"
      >
        {modal?.record && (
          <div className="space-y-4 text-sm">
            <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4" />
                Mandatory Rejection Reason
              </div>
              <div className="mt-1 text-rose-200/90 leading-relaxed">
                Rejecting the identity verification for <strong>{modal.record.user_name || modal.record.user_email}</strong>{" "}
                requires a clear explanation so the investor can correct and re-upload valid documents.
              </div>
            </div>

            {/* Preset reasons chips */}
            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">Quick Reason Presets</label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REASONS.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setRejectReason(p)}
                    className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/10 transition text-left"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Rejection Reason (Sent to User &amp; Audit Log)
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. ID photo is blurry/unreadable, Selfie does not match National ID, Expired document"
                rows={3}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
                data-testid={`admin-kyc-reject-reason-${modal.record.id}`}
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
                data-testid={`admin-kyc-reject-confirm-${modal.record.id}`}
              >
                <X className="mr-1.5 h-4 w-4" /> Confirm Rejection
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* BATCH APPROVE CONFIRMATION MODAL */}
      <EasyXModal
        open={modal?.type === "batch_approve"}
        onClose={close}
        title={`Batch Approve (${selectedIds.length}) KYC Submissions`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-ex-card bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4" />
              Confirm Batch Verification
            </div>
            <div className="mt-1 text-emerald-200/90 leading-relaxed">
              You are about to approve <strong>{selectedIds.length}</strong> investor KYC verification submissions simultaneously. Their accounts will be unlocked for withdrawals immediately.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-ex-muted mb-2">Selected Submissions:</div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/40 border border-white/10">
              {selectedRecordsData.map((rec) => (
                <div key={rec.id} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-white/5">
                  <span className="font-medium text-white">{rec.user_name || "Investor"}</span>
                  <span className="text-ex-muted font-mono text-[11px]">{rec.user_email}</span>
                </div>
              ))}
            </div>
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
              data-testid="admin-kyc-batch-approve-confirm-btn"
            >
              <Check className="mr-1.5 h-4 w-4" /> Approve All {selectedIds.length}
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* BATCH REJECT MODAL */}
      <EasyXModal
        open={modal?.type === "batch_reject"}
        onClose={close}
        title={`Batch Reject (${selectedIds.length}) KYC Submissions`}
      >
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              Batch Rejection Reason
            </div>
            <div className="mt-1 text-rose-200/90 leading-relaxed">
              This rejection reason will be dispatched to all <strong>{selectedIds.length}</strong> selected users so they can fix issues with their document uploads.
            </div>
          </div>

          {/* Quick presets */}
          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Quick Reason Presets</label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRejectReason(p)}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/10 transition text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">
              Rejection Reason for All Selected Items
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter explanation for batch rejection..."
              rows={3}
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
              data-testid="admin-kyc-batch-reject-reason-input"
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
              data-testid="admin-kyc-batch-reject-confirm-btn"
            >
              <X className="mr-1.5 h-4 w-4" /> Reject All {selectedIds.length}
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* INTERACTIVE KYC IMAGE ZOOM & ROTATE INSPECTION MODAL */}
      <AdminImageZoomModal
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        imageUrl={lightbox?.url}
        title={lightbox?.title || "KYC Document Inspection"}
        subtitle="Use scroll wheel or controls to zoom, drag to pan across high-res details, or rotate orientation."
        details={lightbox?.details || []}
      />

      {/* ADMIN EDIT / UNLOCK KYC DETAILS MODAL */}
      <AdminEditKycModal
        open={Boolean(editKycRecord)}
        record={editKycRecord}
        onClose={() => setEditKycRecord(null)}
      />
    </div>
  );
}
