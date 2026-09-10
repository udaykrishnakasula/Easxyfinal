import React, { useEffect, useState } from "react";
import { BadgeCheck, FileImage, Check, X, ZoomIn, MapPin } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminKyc,
  useApproveKyc,
  useRejectKyc,
  fetchAdminKycDocUrl,
} from "@/features/admin/adminApi";
import { apiError } from "@/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXStatusBadge,
  EasyXEmptyState,
} from "@/design/EasyX";
import { AdminImageZoomModal } from "@/admin/components/AdminImageZoomModal";

const FILTERS = ["pending", "approved", "rejected", "all"];

function DocThumb({ docId, label, onZoom }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  const [errStatus, setErrStatus] = useState(null);

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
          setErrStatus(status);
          console.error(
            `[Admin KYC Image Error] Failed to fetch KYC document ID: ${docId} (Type: ${label}). HTTP Status: ${status}`,
            error
          );
        }
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId, label]);

  const displayLabel = label.replace("_", " ");

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[11px] text-ex-muted capitalize">{displayLabel}</div>
      {err ? (
        <div className="flex flex-col items-center justify-center h-28 w-28 rounded-ex border border-purple-500/20 bg-purple-950/20 text-ex-lav-200 text-xs p-2 text-center">
          <FileImage className="h-6 w-6 mb-1 text-ex-lav-300 opacity-80" />
          <span className="text-[10px] text-white/50">{errStatus ? `Error (${errStatus})` : "Encrypted"}</span>
        </div>
      ) : url ? (
        <div
          onClick={() => onZoom?.(url, `${displayLabel.toUpperCase()} Document`)}
          className="group relative h-28 w-28 cursor-pointer rounded-ex overflow-hidden border border-white/10 hover:border-ex-accent transition"
          title="Click to zoom and inspect"
        >
          <img
            src={url}
            alt={label}
            onError={(e) => {
              console.error(`[Admin KYC Image Error] Failed rendering image in DocThumb for docId: ${docId}`, e?.target?.src || "image_error");
              setErr(true);
            }}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            data-testid={`kyc-doc-${docId}`}
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
            <ZoomIn className="h-4 w-4" /> Zoom
          </div>
        </div>
      ) : (
        <div className="grid h-28 w-28 place-items-center rounded-ex border border-white/10 bg-white/5">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-ex-accent border-t-transparent" />
        </div>
      )}
    </div>
  );
}

function KycRow({ rec, onZoom }) {
  const approve = useApproveKyc();
  const reject = useRejectKyc();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const isPending = rec.status === "pending";

  const doApprove = async () => {
    try {
      await approve.mutateAsync({ id: rec.id });
      toast.success(`KYC approved for ${rec.user_email}`);
    } catch (e) { toast.error(apiError(e, "Could not approve")); }
  };
  const doReject = async () => {
    if (reason.trim().length < 3) { toast.error("Please enter a rejection reason."); return; }
    try {
      await reject.mutateAsync({ id: rec.id, reason: reason.trim() });
      toast.success("KYC rejected");
      setShowReject(false); setReason("");
    } catch (e) { toast.error(apiError(e, "Could not reject")); }
  };

  return (
    <EasyXCard className="space-y-3" data-testid={`admin-kyc-row-${rec.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ex-text">{rec.user_name || "User"}</div>
          <div className="text-[11px] text-ex-muted">{rec.user_email}</div>
          <div className="mt-1 text-[11px] text-ex-muted flex flex-wrap items-center gap-x-2">
            <span>ID type: <span className="capitalize text-ex-text font-medium">{rec.id_type || "—"}</span></span>
            {(rec.id_number || rec.id_number_masked) ? (
              <span className="text-emerald-400 font-mono font-medium">· ID: {rec.id_number || rec.id_number_masked}</span>
            ) : rec.id_number_present ? (
              <span className="text-emerald-300">· ID on file (encrypted)</span>
            ) : null}
          </div>
          {(rec.permanent_address || rec.address) && (
            <div className="mt-1 text-[11px] text-ex-text/90 flex items-start gap-1">
              <MapPin className="h-3 w-3 text-purple-400 shrink-0 mt-0.5" />
              <span><span className="text-ex-muted">Permanent Address:</span> <span className="text-white font-medium">{rec.permanent_address || rec.address}</span></span>
            </div>
          )}
          <div className="text-[11px] text-ex-muted mt-0.5">Submitted {rec.submitted_at ? dayjs(rec.submitted_at).format("DD MMM YYYY, HH:mm") : "—"}</div>
        </div>
        <EasyXStatusBadge status={rec.status} />
      </div>

      <div className="flex flex-wrap gap-4">
        {rec.documents.map((d) => (
          <DocThumb
            key={d.id}
            docId={d.id}
            label={d.doc_type}
            onZoom={(url, title) => onZoom?.(url, `${title} — ${rec.user_name || rec.user_email}`)}
          />
        ))}
      </div>

      {rec.status === "rejected" && rec.reject_reason && (
        <div className="rounded-ex-ctrl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-200">
          Rejected: {rec.reject_reason}
        </div>
      )}

      {isPending && (
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <EasyXButton variant="accent" onClick={doApprove} loading={approve.isPending} data-testid={`admin-kyc-approve-${rec.id}`}>
            <Check className="mr-1.5 h-4 w-4" /> Approve
          </EasyXButton>
          {!showReject ? (
            <EasyXButton variant="ghost" onClick={() => setShowReject(true)} data-testid={`admin-kyc-reject-open-${rec.id}`}>
              <X className="mr-1.5 h-4 w-4" /> Reject
            </EasyXButton>
          ) : (
            <div className="flex flex-1 items-center gap-2 min-w-[240px]">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason for rejection"
                data-testid={`admin-kyc-reject-reason-${rec.id}`}
                className="flex-1 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-accent focus:outline-none"
              />
              <EasyXButton variant="ghost" onClick={doReject} loading={reject.isPending} data-testid={`admin-kyc-reject-confirm-${rec.id}`}>
                Confirm
              </EasyXButton>
            </div>
          )}
        </div>
      )}
    </EasyXCard>
  );
}

export default function AdminKycPage() {
  const [filter, setFilter] = useState("pending");
  const { data: list, isLoading } = useAdminKyc(filter === "all" ? undefined : filter);
  const [zoomModal, setZoomModal] = useState(null); // { url, title }

  return (
    <div data-testid="admin-kyc-page">
      <PageHeading title="KYC Review" subtitle="Review and verify user identity submissions." icon={BadgeCheck} />

      <div className="mt-4 inline-flex rounded-ex-ctrl bg-white/5 p-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            data-testid={`admin-kyc-filter-${f}`}
            data-active={filter === f ? "true" : "false"}
            className={`px-4 py-2 rounded-ex-ctrl text-sm font-medium capitalize transition ${
              filter === f ? "bg-ex-accent text-ex-ink shadow-ex-btn" : "text-ex-muted hover:text-ex-text"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <EasyXLoader />
      ) : !list || list.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState icon={BadgeCheck} title="Nothing here" note={`No ${filter} KYC submissions.`} />
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-1 gap-4" data-testid="admin-kyc-list">
          {list.map((rec) => (
            <KycRow
              key={rec.id}
              rec={rec}
              onZoom={(url, title) => setZoomModal({ url, title })}
            />
          ))}
        </div>
      )}

      {/* INTERACTIVE KYC ZOOM & ROTATE INSPECTION MODAL */}
      <AdminImageZoomModal
        open={Boolean(zoomModal)}
        onClose={() => setZoomModal(null)}
        imageUrl={zoomModal?.url}
        title={zoomModal?.title || "KYC Document Inspection"}
        subtitle="Zoom in to inspect government ID numbers, holograms, photo details, and selfie liveness."
      />
    </div>
  );
}
