import React, { useRef, useState } from "react";
import {
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  RefreshCw,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileImage,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { EasyXModal, EasyXButton } from "@/design/EasyX";

const SUPPORTED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGES = 3;
const MAX_FILE_SIZE_MB = 10;

/**
 * Resizes and converts an image file to a clean base64 data URL
 */
const processImageFile = (file) => {
  return new Promise((resolve, reject) => {
    if (!SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
      reject(new Error("Supported formats are JPG, PNG, and WEBP only."));
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      reject(new Error(`File size must be under ${MAX_FILE_SIZE_MB}MB.`));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (!result) {
        reject(new Error("Failed to read image file."));
        return;
      }

      // If image is reasonable size, return directly
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1800;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(String(result));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.9));
        } else {
          resolve(String(result));
        }
      };
      img.onerror = () => resolve(String(result));
      img.src = String(result);
    };
    reader.onerror = () => reject(new Error("Error reading file."));
    reader.readAsDataURL(file);
  });
};

export default function DepositProofUploader({
  images = [],
  onChange,
  disabled = false,
  onUploadingChange,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const [replacingIndex, setReplacingIndex] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  const setUploadState = (uploading, slot = null) => {
    setIsUploading(uploading);
    setUploadingSlot(slot);
    onUploadingChange?.(uploading);
  };

  // Handle files chosen from gallery/file picker
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum limit reached. You can upload up to ${MAX_IMAGES} payment proof images.`);
      return;
    }

    setUploadState(true, images.length + 1);
    setUploadError(null);

    try {
      const filesToProcess = files.slice(0, remainingSlots);
      const newImages = [];
      let lastErrMsg = null;

      for (const file of filesToProcess) {
        try {
          const dataUrl = await processImageFile(file);
          newImages.push(dataUrl);
        } catch (err) {
          lastErrMsg = err.message || "Could not process image.";
          toast.error(`Upload failed for "${file.name}": ${lastErrMsg}`);
        }
      }

      if (newImages.length > 0) {
        onChange([...images, ...newImages]);
        toast.success(
          newImages.length === 1
            ? `Payment proof #${images.length + 1} uploaded successfully!`
            : `Uploaded ${newImages.length} payment proof images successfully!`
        );
      } else if (lastErrMsg) {
        setUploadError(lastErrMsg);
      }
    } finally {
      setUploadState(false, null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  // Handle photo taken via camera
  const handleCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (images.length >= MAX_IMAGES) {
      toast.error(`Maximum limit reached. You can upload up to ${MAX_IMAGES} payment proof images.`);
      return;
    }

    setUploadState(true, images.length + 1);
    setUploadError(null);

    try {
      const dataUrl = await processImageFile(file);
      onChange([...images, dataUrl]);
      toast.success(`Payment proof #${images.length + 1} captured and uploaded successfully!`);
    } catch (err) {
      const msg = err.message || "Could not process captured photo.";
      setUploadError(msg);
      toast.error(`Camera upload failed: ${msg}`);
    } finally {
      setUploadState(false, null);
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  // Handle replace specific image
  const handleReplaceSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || replacingIndex === null) return;

    const targetIdx = replacingIndex;
    setUploadState(true, targetIdx + 1);
    setUploadError(null);

    try {
      const dataUrl = await processImageFile(file);
      const updated = [...images];
      updated[targetIdx] = dataUrl;
      onChange(updated);
      toast.success(`Payment proof #${targetIdx + 1} updated successfully!`);
    } catch (err) {
      const msg = err.message || "Could not process image.";
      setUploadError(msg);
      toast.error(`Failed to replace proof #${targetIdx + 1}: ${msg}`);
    } finally {
      setReplacingIndex(null);
      setUploadState(false, null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
    }
  };

  const triggerReplace = (index) => {
    if (disabled || isUploading) return;
    setReplacingIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  const removeImage = (index) => {
    if (disabled || isUploading) return;
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
    toast.info(`Removed proof #${index + 1}.`);
  };

  return (
    <div className="space-y-2.5" data-testid="deposit-proof-uploader">
      {/* Hidden File Inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFilesSelected}
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        data-testid="proof-gallery-input"
      />
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleCameraCapture}
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        className="hidden"
        data-testid="proof-camera-input"
      />
      <input
        type="file"
        ref={replaceInputRef}
        onChange={handleReplaceSelected}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        data-testid="proof-replace-input"
      />

      {/* Label and Count Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ex-text flex items-center gap-1.5">
          <FileImage className="h-3.5 w-3.5 text-ex-lav-300" />
          <span>Payment Proof</span>
          <span className="text-rose-400 font-bold">*</span>
          <span className="text-[11px] font-normal text-ex-muted">(Proof #1 required, #2 & #3 optional)</span>
        </label>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            images.length >= 1
              ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/25"
              : "bg-amber-500/15 text-amber-300 border border-amber-500/25"
          }`}
          data-testid="proof-count-badge"
        >
          {images.length} / {MAX_IMAGES} uploaded {images.length === 0 && "(Proof #1 required)"}
        </span>
      </div>

      <p className="text-[11px] text-ex-muted leading-relaxed">
        Upload clear screenshots of your transaction confirmation, receipt, or wallet transfer.
        Supported formats: <strong>JPG, PNG, WEBP</strong> (max 10MB each).
      </p>

      {/* Upload Error Banner if image processing failed */}
      {uploadError && (
        <div className="flex items-center justify-between gap-2 rounded-ex-ctrl border border-rose-500/30 bg-rose-500/10 p-2.5 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <span>Upload failed: {uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="text-[11px] font-semibold text-rose-300 hover:text-white underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Proof Images List & Add Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Render uploaded image cards */}
        {images.map((imgUrl, index) => (
          <div
            key={index}
            className="group relative rounded-ex-card overflow-hidden border border-white/15 bg-black/40 p-2 flex flex-col justify-between transition hover:border-ex-accent/50"
            data-testid={`proof-card-${index}`}
          >
            {/* Image Preview Container */}
            <div
              onClick={() => setPreviewImage({ url: imgUrl, title: `Payment Proof #${index + 1}` })}
              className="relative aspect-video w-full overflow-hidden rounded bg-black/60 cursor-pointer flex items-center justify-center"
            >
              <img
                src={imgUrl}
                alt={`Proof ${index + 1}`}
                className="h-full w-full object-cover transition duration-200 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold">
                <Eye className="h-4 w-4" /> View
              </div>
              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white border border-white/10">
                Proof #{index + 1} {index === 0 ? "(Required)" : "(Optional)"}
              </div>
              <div className="absolute bottom-1.5 right-1.5 p-1 rounded-full bg-emerald-500 text-black">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-2 flex items-center justify-between gap-1 pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => triggerReplace(index)}
                disabled={disabled || isUploading}
                className="text-[11px] font-medium text-ex-lav-200 hover:text-white flex items-center gap-1 transition px-1.5 py-1 rounded hover:bg-white/5 disabled:opacity-40"
                data-testid={`btn-replace-proof-${index}`}
              >
                <RefreshCw className="h-3 w-3" /> Replace
              </button>
              <button
                type="button"
                onClick={() => removeImage(index)}
                disabled={disabled || isUploading}
                className="text-[11px] font-medium text-rose-400 hover:text-rose-300 flex items-center gap-1 transition px-1.5 py-1 rounded hover:bg-rose-500/10 disabled:opacity-40"
                data-testid={`btn-remove-proof-${index}`}
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        ))}

        {/* Uploading state slot */}
        {isUploading && (
          <div
            className="rounded-ex-card border border-dashed border-ex-accent/60 bg-ex-accent/[0.08] p-4 flex flex-col items-center justify-center text-center transition min-h-[140px]"
            data-testid="proof-uploading-slot"
          >
            <div className="grid h-10 w-10 place-items-center rounded-full bg-ex-accent/20 text-ex-lav-200 mb-2">
              <Loader2 className="h-5 w-5 animate-spin text-ex-accent" />
            </div>
            <div className="text-xs font-semibold text-ex-text mb-0.5">
              Uploading Proof #{uploadingSlot || images.length + 1}...
            </div>
            <div className="text-[10px] text-ex-muted">
              Processing and verifying screenshot...
            </div>
          </div>
        )}

        {/* Empty Slot / Add Options (if images < 3 and not uploading) */}
        {!isUploading && images.length < MAX_IMAGES && (
          <div
            className={`rounded-ex-card border border-dashed p-3.5 flex flex-col items-center justify-center text-center transition ${
              images.length === 0
                ? "border-amber-500/40 bg-amber-500/[0.04] hover:border-amber-400/70"
                : "border-white/15 bg-white/[0.02] hover:border-white/30"
            }`}
            data-testid="proof-upload-slot"
          >
            <div className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-ex-lav-300 mb-2">
              <Upload className="h-4 w-4" />
            </div>
            <div className="text-xs font-semibold text-ex-text mb-1">
              {images.length === 0
                ? "Add Proof #1 *"
                : images.length === 1
                ? "Add Proof #2 (Optional)"
                : "Add Proof #3 (Optional)"}
            </div>
            <div className="text-[10px] text-ex-muted mb-3">
              {images.length === 0
                ? "Required proof (transfer screenshot / receipt)"
                : "Optional additional proof"}
            </div>

            <div className="w-full flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="w-full py-1.5 px-2.5 rounded-ex-ctrl bg-white/10 hover:bg-white/15 text-white text-[11px] font-semibold flex items-center justify-center gap-1.5 transition border border-white/10 disabled:opacity-50"
                data-testid="btn-take-proof-photo"
              >
                <Camera className="h-3.5 w-3.5 text-ex-accent" /> Take Photo
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
                className="w-full py-1.5 px-2.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-text text-[11px] font-medium flex items-center justify-center gap-1.5 transition border border-white/10 disabled:opacity-50"
                data-testid="btn-choose-proof-file"
              >
                <ImageIcon className="h-3.5 w-3.5 text-ex-lav-200" /> Choose File / Gallery
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Validation status / requirement guide below cards */}
      {images.length === 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 pt-0.5" data-testid="proof-status-hint">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
          <span>At least one proof of payment is required (Proof #1). Proofs #2 and #3 are optional.</span>
        </div>
      )}
      {images.length === 1 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 pt-0.5" data-testid="proof-status-hint">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>Required Proof #1 uploaded. You can submit now, or optionally add Proof #2 and #3.</span>
        </div>
      )}
      {images.length === 2 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 pt-0.5" data-testid="proof-status-hint">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>Proof #1 and #2 uploaded. You can submit now, or optionally add Proof #3.</span>
        </div>
      )}
      {images.length === 3 && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400/90 pt-0.5" data-testid="proof-status-hint">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
          <span>All 3 payment proofs uploaded. Ready to submit.</span>
        </div>
      )}

      {/* Lightbox / Large Preview Modal */}
      <EasyXModal
        open={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title || "Payment Proof Inspection"}
      >
        {previewImage && (
          <div className="space-y-3 text-center">
            <div className="overflow-hidden rounded-ex-card bg-black/80 flex items-center justify-center border border-white/10 p-1 max-h-[70vh]">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
            <div className="flex justify-end pt-2">
              <EasyXButton
                variant="ghost"
                onClick={() => setPreviewImage(null)}
                className="text-xs"
              >
                Close Preview
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>
    </div>
  );
}
