import React, { useRef } from "react";
import { toast } from "sonner";
import {
  ImagePlus,
  Paperclip,
  X,
  AlertCircle,
  FileImage,
  Sparkles,
} from "lucide-react";
import api from "@/shared/lib/api";

const MAX_FILES = 3;
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

/**
 * Uploads support attachments directly to the API
 */
export async function uploadSupportFiles(files, isAdmin = false) {
  if (!files || files.length === 0) return [];
  const formData = new FormData();
  for (const f of files) {
    formData.append("files", f);
  }
  const endpoint = isAdmin ? "/admin/support/attachments/upload" : "/support/attachments/upload";
  const res = await api.post(endpoint, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 60000, // 60s upload timeout
  });
  return res.data?.attachments || (res.data?.attachment ? [res.data.attachment] : []);
}

export default function SupportAttachmentUploader({
  files = [],
  onChange,
  maxFiles = MAX_FILES,
  maxSizeMb = 5,
  disabled = false,
  compact = false,
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length === 0) return;

    // Reset input value so same file can be re-selected if deleted
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    const currentCount = files.length;
    if (currentCount + selectedFiles.length > maxFiles) {
      toast.error(`You can only attach up to ${maxFiles} screenshots.`);
      return;
    }

    const validNewFiles = [];

    for (const f of selectedFiles) {
      // Validate size
      if (f.size > maxSizeMb * 1024 * 1024) {
        toast.error(`"${f.name}" exceeds the ${maxSizeMb} MB limit.`);
        continue;
      }

      // Validate MIME type
      const isAcceptedMime = ACCEPTED_TYPES.includes(f.type.toLowerCase());
      const hasAcceptedExt = ACCEPTED_EXTENSIONS.some((ext) =>
        f.name.toLowerCase().endsWith(ext)
      );

      if (!isAcceptedMime && !hasAcceptedExt) {
        toast.error(`"${f.name}" is not a supported format. Please upload JPG, PNG, or WEBP.`);
        continue;
      }

      // Create preview object
      const previewUrl = URL.createObjectURL(f);
      validNewFiles.push({
        rawFile: f,
        name: f.name,
        size: f.size,
        previewUrl,
      });
    }

    if (validNewFiles.length > 0) {
      onChange([...files, ...validNewFiles]);
    }
  };

  const handleRemove = (indexToRemove) => {
    const fileToRemove = files[indexToRemove];
    if (fileToRemove?.previewUrl) {
      try {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      } catch (err) {
        // ignore
      }
    }
    onChange(files.filter((_, idx) => idx !== indexToRemove));
  };

  const remainingSlots = maxFiles - files.length;

  return (
    <div className="space-y-2.5" data-testid="support-attachment-uploader">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || remainingSlots <= 0}
        data-testid="support-file-input"
      />

      {/* Selected Attachments Preview Strip */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2.5 pt-1">
          {files.map((item, idx) => (
            <div
              key={idx}
              className="relative group flex items-center gap-2 rounded-ex-ctrl border border-white/15 bg-white/5 p-1.5 pr-2.5 text-xs text-ex-text shadow-sm"
              data-testid={`pending-attachment-${idx}`}
            >
              {/* Thumbnail Image */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-black/40 border border-white/10 flex items-center justify-center">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileImage className="h-5 w-5 text-ex-lav-400" />
                )}
              </div>

              {/* Name & Size */}
              <div className="flex flex-col max-w-[120px] sm:max-w-[160px] overflow-hidden">
                <span className="truncate text-[11px] font-medium text-white/90" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[10px] text-ex-muted">
                  {(item.size / 1024).toFixed(0)} KB
                </span>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                disabled={disabled}
                className="ml-1 rounded-full p-1 text-white/50 hover:bg-red-500/20 hover:text-red-300 transition"
                title="Remove attachment"
                data-testid={`remove-attachment-btn-${idx}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Action Button & Help Hint */}
      {remainingSlots > 0 && (
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`inline-flex items-center gap-1.5 rounded-ex-ctrl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ex-lav-300 hover:border-ex-lav-400/50 hover:bg-white/10 hover:text-white transition disabled:opacity-50 ${
              compact ? "py-1 text-[11px]" : ""
            }`}
            data-testid="attach-images-btn"
          >
            <ImagePlus className="h-3.5 w-3.5" />
            <span>
              Attach Screenshots {files.length > 0 ? `(${files.length}/${maxFiles})` : ""}
            </span>
          </button>

          <span className="text-[10px] text-ex-muted/70">
            JPG, PNG, WEBP up to 5 MB ({remainingSlots} remaining)
          </span>
        </div>
      )}
    </div>
  );
}
