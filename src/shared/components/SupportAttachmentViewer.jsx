import React, { useState } from "react";
import {
  Image as ImageIcon,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
} from "lucide-react";
import { getToken } from "@/shared/lib/api";

const formatBytes = (bytes) => {
  if (!bytes || isNaN(bytes)) return "";
  const num = Number(bytes);
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
};

export default function SupportAttachmentViewer({
  attachments = [],
  className = "",
  compact = false,
}) {
  const [activeLightboxIndex, setActiveLightboxIndex] = useState(null);

  if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
    return null;
  }

  const token = getToken();

  const getAttachmentUrl = (att, isDownload = false) => {
    if (!att) return "";
    const id = typeof att === "string" ? att : att.id;
    const base = typeof att === "object" && att.url ? att.url : `/api/support/attachments/${id}`;
    const params = new URLSearchParams();
    if (token) params.set("token", token);
    if (isDownload) params.set("download", "1");
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  const getAttachmentName = (att, idx) => {
    if (typeof att === "string") return `Screenshot-${idx + 1}.jpg`;
    return att.file_name || att.name || `Screenshot-${idx + 1}.jpg`;
  };

  const getAttachmentSize = (att) => {
    if (typeof att === "object") {
      return formatBytes(att.file_size || att.size);
    }
    return "";
  };

  const openLightbox = (index, e) => {
    e?.stopPropagation();
    setActiveLightboxIndex(index);
  };

  const closeLightbox = () => {
    setActiveLightboxIndex(null);
  };

  const prevImage = (e) => {
    e?.stopPropagation();
    setActiveLightboxIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
  };

  const nextImage = (e) => {
    e?.stopPropagation();
    setActiveLightboxIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className={`mt-2 ${className}`} data-testid="support-attachments-viewer">
      {/* Attachments Grid / Thumbnails */}
      <div className={`flex flex-wrap gap-2.5 ${compact ? "gap-1.5" : ""}`}>
        {attachments.map((att, idx) => {
          const name = getAttachmentName(att, idx);
          const sizeStr = getAttachmentSize(att);
          const imgUrl = getAttachmentUrl(att);

          return (
            <div
              key={idx}
              onClick={(e) => openLightbox(idx, e)}
              className="group relative cursor-pointer overflow-hidden rounded-ex-ctrl border border-white/15 bg-black/40 hover:border-ex-lav-400/60 transition shadow-sm"
              title={`${name} ${sizeStr ? `(${sizeStr})` : ""}`}
              data-testid={`attachment-thumbnail-${idx}`}
            >
              <div className="relative h-20 w-28 sm:h-24 sm:w-32 bg-white/[0.03] flex items-center justify-center overflow-hidden">
                <img
                  src={imgUrl}
                  alt={name}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    e.currentTarget.nextElementSibling?.classList.remove("hidden");
                  }}
                />
                <div className="hidden flex flex-col items-center justify-center p-2 text-center text-ex-muted">
                  <ImageIcon className="h-5 w-5 mb-1 text-ex-muted/70" />
                  <span className="text-[10px] line-clamp-1">{name}</span>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 text-white">
                  <Eye className="h-4 w-4 drop-shadow" />
                  <span className="text-[11px] font-semibold drop-shadow">View</span>
                </div>
              </div>

              {/* Caption */}
              <div className="bg-ex-surface/90 px-2 py-1 text-[10px] text-ex-muted border-t border-white/10 flex items-center justify-between gap-1 max-w-[128px]">
                <span className="truncate text-ex-text/90 font-medium">{name}</span>
                {sizeStr && <span className="shrink-0 text-white/50 text-[9px]">{sizeStr}</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox Modal */}
      {activeLightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-150"
          onClick={closeLightbox}
          data-testid="attachment-lightbox-modal"
        >
          <div
            className="relative flex flex-col max-w-4xl w-full max-h-[92vh] rounded-ex-surface bg-[#12111c] border border-white/15 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Lightbox Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/[0.03]">
              <div className="flex items-center gap-2 overflow-hidden">
                <ImageIcon className="h-4 w-4 text-ex-lav-400 shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-white truncate max-w-xs sm:max-w-md">
                  {getAttachmentName(attachments[activeLightboxIndex], activeLightboxIndex)}
                </span>
                {getAttachmentSize(attachments[activeLightboxIndex]) && (
                  <span className="text-[11px] text-white/50 bg-white/5 px-2 py-0.5 rounded">
                    {getAttachmentSize(attachments[activeLightboxIndex])}
                  </span>
                )}
                {attachments.length > 1 && (
                  <span className="text-xs text-white/40">
                    ({activeLightboxIndex + 1} of {attachments.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getAttachmentUrl(attachments[activeLightboxIndex], true)}
                  download={getAttachmentName(attachments[activeLightboxIndex], activeLightboxIndex)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 text-xs font-semibold transition"
                  title="Download Image"
                  data-testid="download-attachment-btn"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>

                <button
                  type="button"
                  onClick={closeLightbox}
                  className="p-1.5 rounded-ex-ctrl hover:bg-white/10 text-white/70 hover:text-white transition"
                  title="Close Lightbox"
                  data-testid="close-lightbox-btn"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Lightbox Image Stage */}
            <div className="relative flex-1 flex items-center justify-center p-3 sm:p-6 bg-black/60 min-h-[320px] max-h-[75vh] overflow-auto select-none">
              <img
                src={getAttachmentUrl(attachments[activeLightboxIndex])}
                alt={getAttachmentName(attachments[activeLightboxIndex], activeLightboxIndex)}
                className="max-h-full max-w-full object-contain rounded shadow-lg"
              />

              {/* Navigation Arrows for multi-images */}
              {attachments.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition shadow"
                    title="Previous Image"
                    data-testid="lightbox-prev-btn"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition shadow"
                    title="Next Image"
                    data-testid="lightbox-next-btn"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
