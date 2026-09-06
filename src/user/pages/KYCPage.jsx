import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Clock,
  XCircle,
  FileImage,
  Camera,
  Lightbulb,
  AlertCircle,
  Check,
  Trash2,
  FileText,
  FileCheck,
  CreditCard,
  MapPin,
  Lock,
  LifeBuoy,
  MessageSquare,
  ExternalLink,
  HelpCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useKyc, useSubmitKyc, useSupportTickets } from "@/user/api";
import { apiError } from "@/shared/lib/api";
import { compressKycDocument } from "@/shared/utils/imageCompressor";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXStatusBadge,
} from "@/design/EasyX";
import KycCameraCapture from "@/user/components/KycCameraCapture";
import CreateTicketModal from "@/user/components/CreateTicketModal";
import { SupportStatusBadge } from "@/user/components/SupportStatusBadge";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card (India)", placeholder: "e.g. 1234 5678 9012", helper: "12-digit unique Aadhaar number (Front & Back required)" },
  { value: "national_id", label: "National ID Card", placeholder: "e.g. ID-894729104", helper: "Official government-issued national identity number" },
  { value: "passport", label: "International Passport", placeholder: "e.g. A1234567", helper: "6 to 9 alphanumeric characters" },
  { value: "driving_license", label: "Driver's License", placeholder: "e.g. DL-1420110012345", helper: "Official state/national driver's license number" },
  { value: "other", label: "Other Government ID", placeholder: "e.g. GOV-98765432", helper: "4 to 32 alphanumeric characters" },
];

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const MIN_BYTES = 100; // 100 Bytes
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

/** Format bytes to human readable format */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/** Validate document file on client side */
function validateFileObject(f) {
  if (!f) return null;
  const mime = f.type ? f.type.toLowerCase() : "";
  const name = f.name ? f.name.toLowerCase() : "";
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  
  if (mime && !ALLOWED_MIME_TYPES.includes(mime) && !hasValidExt) {
    return "Invalid file format. Only JPG, PNG, WebP, or PDF documents are accepted.";
  }
  if (!mime && !hasValidExt) {
    return "Please choose a valid JPG, PNG, WebP, or PDF file.";
  }
  if (f.size > MAX_BYTES) {
    return `File is too large (${formatBytes(f.size)}). Maximum allowed size is 10 MB.`;
  }
  if (f.size < MIN_BYTES) {
    return "File appears empty or corrupted. Please choose a valid file.";
  }
  return null;
}

/** Validate ID document number format based on selected ID type (MANDATORY) */
function validateIdNumberFormat(type, value) {
  if (!value || !value.trim()) return "ID document number is mandatory and required.";
  const val = value.trim();

  if (type === "aadhaar") {
    const digitsOnly = val.replace(/[\s-]/g, "");
    if (!/^\d{12}$/.test(digitsOnly)) {
      return "Aadhaar number must contain exactly 12 digits.";
    }
    if (/^(\d)\1{11}$/.test(digitsOnly)) {
      return "Aadhaar number cannot consist of repetitive single digits.";
    }
    return null;
  }

  if (type === "passport") {
    const clean = val.replace(/[\s-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{6,9}$/.test(clean)) {
      return "Passport number must be 6 to 9 alphanumeric characters (e.g. A1234567).";
    }
    return null;
  }

  if (val.length < 4 || val.length > 32) {
    return "ID number must be between 4 and 32 characters in length.";
  }
  if (!/^[a-zA-Z0-9\s\-/_.]+$/.test(val)) {
    return "ID number contains invalid special characters.";
  }

  return null;
}

/** Validate Residential Address (MANDATORY) */
function validateAddressFormat(value) {
  if (!value || !value.trim()) {
    return "Residential address is mandatory and required.";
  }
  if (value.trim().length < 5) {
    return "Address must be at least 5 characters in length.";
  }
  return null;
}

/** Component for uploading and validating a document file */
function FileField({ label, file, onPick, onRemove, testId, hint, error, required = true }) {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optStats, setOptStats] = useState(null);

  // Generate instant image preview URL
  useEffect(() => {
    if (file && file.type && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
    return undefined;
  }, [file]);

  const handleFileChange = async (incoming) => {
    if (!incoming) return;

    // Immediately set and validate user's chosen file with zero delay
    setOptStats(null);
    const initialErr = validateFileObject(incoming);
    if (initialErr) {
      toast.error(initialErr);
    }
    onPick(incoming);

    // Run high-performance background compression for camera photos and large images
    const isImage = incoming.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(incoming.name || "");
    if (isImage && incoming.size > 250 * 1024) {
      setIsOptimizing(true);
      try {
        const result = await compressKycDocument(incoming);
        setIsOptimizing(false);
        if (result && result.wasCompressed && result.file) {
          const savings = Math.round(((result.originalSize - result.compressedSize) / result.originalSize) * 100);
          setOptStats({ original: result.originalSize, compressed: result.compressedSize, savings });
          onPick(result.file);
        }
      } catch (e) {
        console.warn("Background optimization notice:", e);
        setIsOptimizing(false);
      }
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      handleFileChange(droppedFile);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const isPdf = file?.type === "application/pdf" || file?.name?.toLowerCase().endsWith(".pdf");

  return (
    <div className="space-y-1.5" data-testid={`${testId}-container`}>
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-ex-text flex items-center gap-1.5">
          {label}
          {required && <span className="text-rose-400 font-bold">*</span>}
        </label>
        <div className="flex items-center gap-2">
          {isOptimizing && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full animate-pulse border border-amber-500/20">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Optimizing for fast upload...
            </span>
          )}
          {optStats && !error && (
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Sparkles className="h-2.5 w-2.5 text-emerald-400" />
              Fast-Upload ({formatBytes(optStats.original)} → {formatBytes(optStats.compressed)}, -{optStats.savings}%)
            </span>
          )}
          {file && !error && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
              <Check className="h-3 w-3" /> Valid ({formatBytes(file.size)})
            </span>
          )}
        </div>
      </div>

      <div
        onClick={() => inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative flex items-center gap-3.5 p-3 rounded-ex-ctrl border cursor-pointer select-none transition-all ${
          error
            ? "border-rose-500/60 bg-rose-500/[0.04]"
            : file
            ? "border-emerald-500/40 bg-emerald-500/[0.03]"
            : isDragOver
            ? "border-purple-400 bg-purple-500/10 scale-[1.005]"
            : "border-white/10 bg-white/[0.03] hover:border-purple-400/50"
        }`}
      >
        {/* Preview Thumbnail */}
        <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
          {preview ? (
            <img
              src={preview}
              alt="Document preview"
              className="h-full w-full object-cover"
              data-testid={`${testId}-preview`}
            />
          ) : isPdf ? (
            <FileText className="h-6 w-6 text-purple-300" />
          ) : file ? (
            <FileImage className="h-6 w-6 text-emerald-300" />
          ) : (
            <Camera className="h-6 w-6 text-ex-muted/60" />
          )}
        </div>

        {/* Info & Select Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="block truncate text-xs font-semibold text-ex-text group-hover:text-purple-300 transition">
              {file ? file.name : "Choose or drag ID document file"}
            </span>
            <span className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 shrink-0">
              {file ? "Change" : "Browse"}
            </span>
          </div>
          <span className="block text-[11px] text-ex-muted truncate mt-0.5">
            {file ? `${file.type || "Document"} · ${formatBytes(file.size)}` : hint}
          </span>
        </div>

        {/* Remove Button if file selected */}
        {file && onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOptStats(null);
              onRemove();
            }}
            title="Remove document"
            className="p-1.5 rounded-lg text-ex-muted hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
            data-testid={`${testId}-remove`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/jpg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => {
          handleFileChange(e.target.files?.[0] || null);
          e.target.value = ""; // Reset so re-picking the same file triggers change
        }}
      />

      {/* Inline Field Error */}
      {error && (
        <div
          className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-0.5"
          data-testid={`${testId}-error`}
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

const SELFIE_TIPS = [
  "Use clear, natural lighting — face the light source directly",
  "Position your face completely inside the camera oval frame",
  "Remove sunglasses, hats, or face coverings before taking photo",
  "Hold device steady at eye level for sharp facial focus",
];

function SelfieTips() {
  return (
    <div className="rounded-ex-ctrl border border-purple-500/20 bg-purple-500/[0.05] p-3.5" data-testid="kyc-selfie-tips">
      <div className="flex items-center gap-2 text-xs font-semibold text-purple-200">
        <Lightbulb className="h-4 w-4 text-purple-400 shrink-0" /> Requirements for Live Identity Selfie
      </div>
      <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SELFIE_TIPS.map((t) => (
          <li key={t} className="flex items-start gap-2 text-[11px] text-ex-muted leading-relaxed">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBanner({ kyc }) {
  const s = kyc.status;
  if (s === "approved") {
    return (
      <div className="flex items-start gap-3.5 rounded-ex border border-emerald-500/30 bg-emerald-500/10 p-4" data-testid="kyc-status-approved">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-emerald-200">Identity Verification Approved</div>
          <div className="text-xs text-emerald-200/80 mt-0.5">
            Your KYC identity verification is verified and active. All account withdrawals and full platform features are unlocked.
          </div>
          {kyc.id_type && (
            <div className="mt-2 text-[11px] text-emerald-300 font-mono">
              Verified ID Type: {kyc.id_type.toUpperCase()} {kyc.id_number_masked ? `· ${kyc.id_number_masked}` : ""}
            </div>
          )}
        </div>
      </div>
    );
  }
  if (s === "pending") {
    return (
      <div className="flex items-start gap-3.5 rounded-ex border border-amber-500/30 bg-amber-500/10 p-4" data-testid="kyc-status-pending">
        <Clock className="h-5 w-5 shrink-0 text-amber-400 mt-0.5 animate-pulse" />
        <div>
          <div className="text-sm font-bold text-amber-200">Verification Under Admin Review</div>
          <div className="text-xs text-amber-200/80 mt-0.5">
            Your uploaded government ID documents and camera selfie have been received and are currently queued for manual compliance review.
          </div>
          <div className="mt-2 text-[11px] text-amber-300/80">
            Average review turnaround: Under 2 to 6 business hours.
          </div>
        </div>
      </div>
    );
  }
  if (s === "rejected") {
    return (
      <div className="flex items-start gap-3.5 rounded-ex border border-rose-500/30 bg-rose-500/10 p-4" data-testid="kyc-status-rejected">
        <XCircle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
        <div>
          <div className="text-sm font-bold text-rose-200">Verification Rejected — Resubmission Required</div>
          <div className="text-xs text-rose-200/90 mt-1">
            <strong>Reason provided:</strong> {kyc.reject_reason || "The submitted ID documents or selfie photo were unclear, expired, or failed verification."}
          </div>
          <p className="text-[11px] text-rose-300/70 mt-1">
            Please review the guidelines below, provide high-resolution images, and retake your camera selfie.
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export default function KYCPage() {
  const navigate = useNavigate();
  const { data: kyc, isLoading } = useKyc();
  const submitKyc = useSubmitKyc();
  const { data: ticketsData, refetch: refetchTickets } = useSupportTickets();

  // Form Field States
  const [idType, setIdType] = useState("aadhaar");
  const [idNumber, setIdNumber] = useState("");
  
  // Mandatory Residential Address State
  const [address, setAddress] = useState("");
  const [addressTouched, setAddressTouched] = useState(false);

  // Single document for non-Aadhaar IDs (National ID, Passport, Other)
  const [idDoc, setIdDoc] = useState(null);

  // Two separate documents specifically for Aadhaar
  const [idFrontDoc, setIdFrontDoc] = useState(null);
  const [idBackDoc, setIdBackDoc] = useState(null);

  // Live camera selfie blob (strictly camera-based)
  const [selfieBlob, setSelfieBlob] = useState(null);

  // Touched state to trigger error states cleanly
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [idNumberTouched, setIdNumberTouched] = useState(false);
  const [serverErrors, setServerErrors] = useState({});

  // Support Ticket Modal for Approved KYC Modifications
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Upload Progress & Stage Tracking for Instant User Feedback
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStage, setUploadStage] = useState("");

  // Pre-populate fields from previously submitted / rejected KYC record so user can edit cleanly
  useEffect(() => {
    if (!kyc) return;
    if (kyc.id_type) {
      setIdType(kyc.id_type);
    }
    if (kyc.id_number) {
      setIdNumber(kyc.id_number);
    }
    const existingAddr = kyc.permanent_address || kyc.address;
    if (existingAddr) {
      setAddress(existingAddr);
    }
  }, [kyc?.id_type, kyc?.id_number, kyc?.permanent_address, kyc?.address]);

  // Filter user's KYC-related tickets
  const kycTickets = useMemo(() => {
    const list = ticketsData?.tickets || (Array.isArray(ticketsData) ? ticketsData : []);
    return list.filter((t) => (t.category || "").toUpperCase() === "KYC");
  }, [ticketsData]);

  const selectedTypeConfig = useMemo(() => {
    return ID_TYPES?.find((t) => t.value === idType) || ID_TYPES?.[0] || { label: "National ID", min: 4, max: 20, format: "Alphanumeric", placeholder: "ID Number" };
  }, [idType]);

  const isAadhaar = idType === "aadhaar";

  // Real-time Field Validations
  const idNumberError = useMemo(() => {
    return validateIdNumberFormat(idType, idNumber);
  }, [idType, idNumber]);

  const addressError = useMemo(() => {
    return validateAddressFormat(address);
  }, [address]);

  const idDocError = useMemo(() => {
    if (isAadhaar) return null;
    if (!idDoc) {
      return hasAttemptedSubmit ? "Government ID document (Front) is required." : null;
    }
    return validateFileObject(idDoc);
  }, [isAadhaar, idDoc, hasAttemptedSubmit]);

  const idFrontError = useMemo(() => {
    if (!isAadhaar) return null;
    if (!idFrontDoc) {
      return hasAttemptedSubmit ? "Aadhaar Front Side document is required." : null;
    }
    return validateFileObject(idFrontDoc);
  }, [isAadhaar, idFrontDoc, hasAttemptedSubmit]);

  const idBackError = useMemo(() => {
    if (!isAadhaar) return null;
    if (!idBackDoc) {
      return hasAttemptedSubmit ? "Aadhaar Back Side document is required." : null;
    }
    return validateFileObject(idBackDoc);
  }, [isAadhaar, idBackDoc, hasAttemptedSubmit]);

  const selfieError = useMemo(() => {
    if (!selfieBlob) {
      return hasAttemptedSubmit ? "Live camera selfie is required to verify identity." : null;
    }
    return null;
  }, [selfieBlob, hasAttemptedSubmit]);

  // Overall validity check
  const hasValidDocs = isAadhaar
    ? Boolean(idFrontDoc && !validateFileObject(idFrontDoc) && idBackDoc && !validateFileObject(idBackDoc))
    : Boolean(idDoc && !validateFileObject(idDoc));

  const isFormValid = Boolean(
    idType &&
    idNumber.trim() &&
    !idNumberError &&
    address.trim() &&
    !addressError &&
    hasValidDocs &&
    selfieBlob
  );

  // Handlers for File Selection
  const handlePickSingleId = (f) => {
    setServerErrors((prev) => ({ ...prev, id_document: undefined, id_front_document: undefined }));
    setIdDoc(f);
    if (f) {
      const err = validateFileObject(f);
      if (!err) {
        toast.success(`Selected ID document: ${f.name}`);
      }
    }
  };

  const handlePickFrontId = (f) => {
    setServerErrors((prev) => ({ ...prev, id_front_document: undefined, id_document: undefined }));
    setIdFrontDoc(f);
    if (f) {
      const err = validateFileObject(f);
      if (!err) {
        toast.success(`Selected Aadhaar Front: ${f.name}`);
      }
    }
  };

  const handlePickBackId = (f) => {
    setServerErrors((prev) => ({ ...prev, id_back_document: undefined }));
    setIdBackDoc(f);
    if (f) {
      const err = validateFileObject(f);
      if (!err) {
        toast.success(`Selected Aadhaar Back: ${f.name}`);
      }
    }
  };

  const handleCaptureComplete = (blob) => {
    setServerErrors((prev) => ({ ...prev, selfie: undefined }));
    setSelfieBlob(blob);
    toast.success("Live identity selfie captured and validated!");
  };

  const handleCameraReset = () => {
    setSelfieBlob(null);
    toast.info("Selfie photo cleared. Please take a new live photo.");
  };

  // Format helper for Aadhaar typing
  const handleIdNumberChange = (e) => {
    setServerErrors((prev) => ({ ...prev, id_number: undefined }));
    let val = e.target.value;
    if (idType === "aadhaar") {
      // Allow only numbers and spaces
      const cleanDigits = val.replace(/\D/g, "").slice(0, 12);
      // Group in 4s: XXXX XXXX XXXX
      const parts = cleanDigits.match(/.{1,4}/g) || [];
      val = parts.join(" ");
    } else if (idType === "passport") {
      val = val.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 9);
    }
    setIdNumber(val);
  };

  const handleAddressChange = (e) => {
    setServerErrors((prev) => ({ ...prev, address: undefined }));
    setAddress(e.target.value);
  };

  const submit = async (e) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setServerErrors({});

    // Client-side Mandatory ID Number Check
    if (!idNumber.trim()) {
      toast.error("ID document number is mandatory. Please enter your ID number.");
      return;
    }
    if (idNumberError) {
      toast.error(`Invalid ID Number: ${idNumberError}`);
      return;
    }

    // Client-side Mandatory Address Check
    if (!address.trim()) {
      toast.error("Residential address is mandatory. Please enter your address.");
      return;
    }
    if (addressError) {
      toast.error(`Invalid Address: ${addressError}`);
      return;
    }

    if (isAadhaar) {
      if (!idFrontDoc) {
        toast.error("Please upload Aadhaar Front Side document.");
        return;
      }
      const frontErr = validateFileObject(idFrontDoc);
      if (frontErr) {
        toast.error(`Aadhaar Front Error: ${frontErr}`);
        return;
      }

      if (!idBackDoc) {
        toast.error("Please upload Aadhaar Back Side document.");
        return;
      }
      const backErr = validateFileObject(idBackDoc);
      if (backErr) {
        toast.error(`Aadhaar Back Error: ${backErr}`);
        return;
      }
    } else {
      if (!idDoc) {
        toast.error("Please upload your government ID document.");
        return;
      }
      const docErr = validateFileObject(idDoc);
      if (docErr) {
        toast.error(`Document Error: ${docErr}`);
        return;
      }
    }

    if (!selfieBlob) {
      toast.error("Please take a live selfie with your camera before submitting.");
      return;
    }

    try {
      setUploadProgress(15);
      setUploadStage("Validating and optimizing documents...");

      let readyFront = idFrontDoc;
      let readyBack = idBackDoc;
      let readyDoc = idDoc;

      // Ensure any document not already compressed is quickly optimized
      if (isAadhaar) {
        if (readyFront?.type?.startsWith("image/") && readyFront.size > 200 * 1024) {
          const res = await compressKycDocument(readyFront);
          if (res.wasCompressed) readyFront = res.file;
        }
        if (readyBack?.type?.startsWith("image/") && readyBack.size > 200 * 1024) {
          const res = await compressKycDocument(readyBack);
          if (res.wasCompressed) readyBack = res.file;
        }
      } else {
        if (readyDoc?.type?.startsWith("image/") && readyDoc.size > 200 * 1024) {
          const res = await compressKycDocument(readyDoc);
          if (res.wasCompressed) readyDoc = res.file;
        }
      }

      setUploadProgress(30);
      setUploadStage("Fast-uploading encrypted verification documents...");

      const onUploadProgress = (p) => {
        const mapped = Math.round(30 + (p * 0.6));
        setUploadProgress(mapped);
        if (mapped >= 85) {
          setUploadStage("Finalizing compliance & verification checks...");
        }
      };

      if (isAadhaar) {
        await submitKyc.mutateAsync({
          idType,
          idNumber: idNumber.trim(),
          address: address.trim(),
          idFrontDocument: readyFront,
          idBackDocument: readyBack,
          selfie: selfieBlob,
          onProgress: onUploadProgress,
        });
      } else {
        await submitKyc.mutateAsync({
          idType,
          idNumber: idNumber.trim(),
          address: address.trim(),
          idDocument: readyDoc,
          selfie: selfieBlob,
          onProgress: onUploadProgress,
        });
      }
      setUploadProgress(100);
      setUploadStage("Verification submitted successfully!");
      toast.success("KYC submitted successfully — pending manual admin review!");
      setIdNumber("");
      setIdDoc(null);
      setIdFrontDoc(null);
      setIdBackDoc(null);
      setSelfieBlob(null);
      setHasAttemptedSubmit(false);
    } catch (err) {
      setUploadProgress(0);
      setUploadStage("");
      const respData = err?.response?.data;
      if (respData?.field) {
        setServerErrors({ [respData.field]: respData.detail || respData.message });
      }
      toast.error(apiError(err, "Could not submit KYC verification"));
    }
  };

  const canSubmitForm = kyc && (kyc.status === "none" || kyc.status === "rejected");

  return (
    <div data-testid="kyc-page" className="pb-16">
      <PageHeading
        title="Identity Verification (KYC)"
        subtitle="Verify your identity with official government ID, residential address, and live camera photo to unlock withdrawals."
        icon={ShieldCheck}
        actions={kyc && kyc.status !== "none" ? <EasyXStatusBadge status={kyc.status} /> : null}
      />

      {isLoading || !kyc ? (
        <EasyXLoader />
      ) : (
        <div className="mt-5 max-w-2xl space-y-4">
          {kyc.status !== "none" && <StatusBanner kyc={kyc} />}

          {canSubmitForm ? (
            <EasyXCard>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <div className="text-sm font-semibold text-ex-text">
                    {kyc.status === "rejected" ? "Resubmit Identity Verification" : "Submit Identity Verification"}
                  </div>
                  <p className="mt-0.5 text-xs text-ex-muted">
                    Ensure all document photos are sharp, unaltered, and completely legible.
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 text-[11px] font-medium border border-purple-500/20">
                  <CreditCard className="h-3 w-3" /> Tier 1 Verification
                </span>
              </div>

              {/* Requirement Checklist Badges */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
                <div
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                    idType
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-ex-muted"
                  }`}
                >
                  <FileCheck className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">1. ID Type</span>
                </div>

                <div
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                    idNumber.trim() && !idNumberError
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-ex-muted"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">2. ID Number</span>
                </div>

                <div
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                    address.trim() && !addressError
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-ex-muted"
                  }`}
                >
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">3. Address</span>
                </div>

                <div
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                    isAadhaar
                      ? idFrontDoc && !idFrontError && idBackDoc && !idBackError
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                        : "border-white/10 bg-white/[0.02] text-ex-muted"
                      : idDoc && !idDocError
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-ex-muted"
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">4. ID Docs</span>
                </div>

                <div
                  className={`p-2 rounded-xl border flex items-center gap-1.5 transition ${
                    selfieBlob
                      ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
                      : "border-white/10 bg-white/[0.02] text-ex-muted"
                  }`}
                >
                  <Camera className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">5. Selfie</span>
                </div>
              </div>

              <form onSubmit={submit} className="mt-5 space-y-4" data-testid="kyc-form" noValidate>
                {/* ID Type Selector */}
                <div>
                  <label className="text-xs font-medium text-ex-text flex items-center gap-1.5">
                    Government ID Document Type <span className="text-rose-400 font-bold">*</span>
                  </label>
                  <select
                    value={idType}
                    onChange={(e) => {
                      setIdType(e.target.value);
                      setIdNumber("");
                      setServerErrors({});
                    }}
                    data-testid="kyc-id-type"
                    className="mt-1.5 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3.5 py-2.5 text-xs text-ex-text focus:border-purple-400 focus:outline-none transition shadow-inner"
                  >
                    {ID_TYPES.map((t) => (
                      <option key={t.value} value={t.value} className="bg-[#17161d] text-ex-text">
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] text-purple-300/80">{selectedTypeConfig.helper}</p>
                </div>

                {/* ID Number Input with Realtime Validation (MANDATORY) */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ex-text flex items-center gap-1.5">
                      Mandatory ID Document Number <span className="text-rose-400 font-bold">*</span>
                    </label>
                    {idNumber.trim() && !idNumberError && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Check className="h-3 w-3" /> Valid Format
                      </span>
                    )}
                  </div>
                  <div className="relative mt-1.5">
                    <input
                      type="text"
                      value={idNumber}
                      onChange={handleIdNumberChange}
                      onBlur={() => setIdNumberTouched(true)}
                      placeholder={selectedTypeConfig.placeholder}
                      data-testid="kyc-id-number"
                      className={`w-full rounded-ex-ctrl bg-white/5 border px-3.5 py-2.5 text-xs text-ex-text placeholder:text-ex-muted/50 focus:outline-none transition shadow-inner ${
                        (idNumberTouched || hasAttemptedSubmit) && idNumberError
                          ? "border-rose-500/60 focus:border-rose-500"
                          : idNumber.trim() && !idNumberError
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-white/10 focus:border-purple-400"
                      }`}
                    />
                  </div>

                  {(idNumberTouched || hasAttemptedSubmit) && idNumberError && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-400 font-medium" data-testid="kyc-id-number-error">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{idNumberError}</span>
                    </div>
                  )}

                  {serverErrors.id_number && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{serverErrors.id_number}</span>
                    </div>
                  )}

                  <p className="mt-1 text-[11px] text-ex-muted">
                    Stored with military-grade encryption — accessible solely to authorized compliance officers.
                  </p>
                </div>

                {/* Permanent Residential Address Section (MANDATORY & USER EDITABLE BEFORE SUBMISSION) */}
                <div className="space-y-3.5 rounded-xl border border-white/5 bg-white/[0.01] p-3.5" data-testid="kyc-address-section">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-ex-text flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-purple-400" /> Permanent Residential Address <span className="text-rose-400 font-bold">*</span>
                    </div>
                    {address.trim().length >= 5 && !addressError && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                        <Check className="h-3 w-3" /> Address Added
                      </span>
                    )}
                  </div>

                  {/* Manual Type & Update Address */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-ex-text flex items-center gap-1.5">
                        Type Permanent Address <span className="text-rose-400 font-bold">*</span>
                      </label>
                    </div>
                    <textarea
                      rows={3}
                      value={address}
                      onChange={handleAddressChange}
                      onBlur={() => setAddressTouched(true)}
                      placeholder="Enter full permanent address: Flat/House No, Building name, Street, Area/Landmark, City, State, Postal Code, Country..."
                      data-testid="kyc-address-input"
                      className={`w-full rounded-ex-ctrl bg-white/5 border px-3.5 py-2.5 text-xs text-ex-text placeholder:text-ex-muted/50 focus:outline-none transition shadow-inner resize-none ${
                        (addressTouched || hasAttemptedSubmit) && addressError
                          ? "border-rose-500/60 focus:border-rose-500"
                          : address.trim().length >= 5 && !addressError
                          ? "border-emerald-500/50 focus:border-emerald-500"
                          : "border-white/10 focus:border-purple-400"
                      }`}
                    />

                    {(addressTouched || hasAttemptedSubmit) && addressError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium" data-testid="kyc-address-error">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{addressError}</span>
                      </div>
                    )}

                    {serverErrors.address && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium">
                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                        <span>{serverErrors.address}</span>
                      </div>
                    )}

                    <p className="text-[11px] text-ex-muted">
                      You can type and update your permanent address freely now. <span className="text-amber-300 font-medium">After submit, the address cannot be edited.</span>
                    </p>
                  </div>
                </div>

                {/* Aadhaar Dual Upload vs Standard Single Upload */}
                {isAadhaar ? (
                  <div className="space-y-3.5 rounded-xl border border-white/5 bg-white/[0.01] p-3.5" data-testid="aadhaar-upload-section">
                    <div className="text-xs font-semibold text-ex-text flex items-center gap-2">
                      <FileCheck className="h-4 w-4 text-purple-400" /> Aadhaar Card Dual-Sided Verification
                    </div>
                    <FileField
                      label="Aadhaar Front Side (Showing Photo & Name)"
                      file={idFrontDoc}
                      onPick={handlePickFrontId}
                      onRemove={() => {
                        setIdFrontDoc(null);
                        setServerErrors((prev) => ({ ...prev, id_front_document: undefined, id_document: undefined }));
                      }}
                      testId="kyc-id-front-upload"
                      hint="JPG, PNG, WebP or PDF · max 5 MB"
                      error={idFrontDoc ? validateFileObject(idFrontDoc) : (serverErrors.id_front_document || idFrontError)}
                      required={true}
                    />

                    <FileField
                      label="Aadhaar Back Side (Showing Address & QR)"
                      file={idBackDoc}
                      onPick={handlePickBackId}
                      onRemove={() => {
                        setIdBackDoc(null);
                        setServerErrors((prev) => ({ ...prev, id_back_document: undefined }));
                      }}
                      testId="kyc-id-back-upload"
                      hint="JPG, PNG, WebP or PDF · max 5 MB"
                      error={idBackDoc ? validateFileObject(idBackDoc) : (serverErrors.id_back_document || idBackError)}
                      required={true}
                    />
                  </div>
                ) : (
                  <div className="space-y-3.5 rounded-xl border border-white/5 bg-white/[0.01] p-3.5">
                    <FileField
                      label={`${selectedTypeConfig.label} Document`}
                      file={idDoc}
                      onPick={handlePickSingleId}
                      onRemove={() => {
                        setIdDoc(null);
                        setServerErrors((prev) => ({ ...prev, id_document: undefined, id_front_document: undefined }));
                      }}
                      testId="kyc-id-upload"
                      hint="JPG, PNG, WebP or PDF · max 5 MB"
                      error={idDoc ? validateFileObject(idDoc) : (serverErrors.id_document || idDocError)}
                      required={true}
                    />
                  </div>
                )}

                {/* Guidelines Tips */}
                <SelfieTips />

                {/* Direct Camera-Only Selfie */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-ex-text flex items-center gap-1.5">
                      Live Camera Face Photo <span className="text-rose-400 font-bold">*</span>
                    </label>
                    {selfieBlob && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
                        <Check className="h-3 w-3" /> Live Selfie Captured
                      </span>
                    )}
                  </div>
                  <KycCameraCapture
                    onCaptureComplete={handleCaptureComplete}
                    onReset={handleCameraReset}
                    disabled={submitKyc.isPending}
                  />
                  {(serverErrors.selfie || selfieError) && (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-rose-400 font-medium" data-testid="kyc-selfie-error">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      <span>{serverErrors.selfie || selfieError}</span>
                    </div>
                  )}
                </div>

                {/* Form Summary Alert if Invalid on Submit Attempt */}
                {hasAttemptedSubmit && !isFormValid && (
                  <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 space-y-1 animate-in fade-in duration-200">
                    <div className="font-semibold flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                      Please complete the following required items:
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 pl-1">
                      {(!idNumber.trim() || idNumberError) && <li>Provide a valid ID document number</li>}
                      {(!address.trim() || addressError) && <li>Provide your full residential address (minimum 5 characters)</li>}
                      {isAadhaar && !idFrontDoc && <li>Upload Aadhaar Front Side document</li>}
                      {isAadhaar && !idBackDoc && <li>Upload Aadhaar Back Side document</li>}
                      {!isAadhaar && !idDoc && <li>Upload your official Government ID document</li>}
                      {!selfieBlob && <li>Take a live camera selfie to verify your face</li>}
                    </ul>
                  </div>
                )}

                {/* Real-time Fast Upload Progress Card */}
                {submitKyc.isPending && (
                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/40 backdrop-blur space-y-2.5 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-purple-200 flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-purple-400" />
                        {uploadStage || "Uploading KYC documents..."}
                      </span>
                      <span className="font-bold text-purple-300 font-mono text-sm">{uploadProgress}%</span>
                    </div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-400 transition-all duration-300 ease-out rounded-full"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-purple-300/80 pt-0.5">
                      <span className="flex items-center gap-1 text-emerald-300 font-medium">
                        <Sparkles className="h-3 w-3 text-emerald-400" /> Fast-Upload compression active
                      </span>
                      <span className="text-ex-muted font-medium">Encrypted SSL Transmission</span>
                    </div>
                  </div>
                )}

                {/* Submit Action */}
                <EasyXButton
                  type="submit"
                  className="w-full py-3"
                  disabled={submitKyc.isPending}
                  loading={submitKyc.isPending}
                  data-testid="kyc-submit"
                >
                  {kyc.status === "rejected" ? "Resubmit for Manual Review" : "Submit for Manual Review"}
                </EasyXButton>
              </form>
            </EasyXCard>
          ) : (
            <EasyXCard>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-ex-text">
                      {kyc.status === "pending" ? "Verification In Progress" : "Identity Verified"}
                    </div>
                    <p className="text-xs text-ex-muted mt-0.5">
                      {kyc.status === "pending"
                        ? "Your submitted documents, residential address, and live selfie are currently under manual review by compliance admins. You will receive an alert once approved."
                        : "Your identity has been successfully verified. You now have unrestricted access to fund withdrawals and platform services."}
                    </p>
                  </div>
                </div>

                {/* Submitted Verification Summary Details - Non-editable / Locked */}
                <div className="p-3.5 rounded-xl bg-black/30 border border-white/10 space-y-3 text-xs" data-testid="kyc-submitted-details">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <span className="font-semibold text-ex-text flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4 text-purple-400" /> Submitted Verification Details
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                      <Lock className="h-3 w-3" /> Locked (Cannot be edited)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    <div>
                      <span className="text-[11px] text-ex-muted block">Document Type</span>
                      <strong className="text-white uppercase font-medium mt-0.5 block">{kyc.id_type || "Government ID"}</strong>
                    </div>
                    {(kyc.id_number || kyc.id_number_masked) && (
                      <div>
                        <span className="text-[11px] text-ex-muted block">ID Document Number</span>
                        <strong className="text-emerald-400 font-mono mt-0.5 block">{kyc.id_number || kyc.id_number_masked}</strong>
                      </div>
                    )}
                  </div>

                  {(kyc.permanent_address || kyc.address) && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[11px] text-ex-muted flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-purple-400" /> Permanent Residential Address (Immutable)
                      </span>
                      <p className="text-white/90 text-xs bg-white/[0.02] p-2.5 rounded-lg border border-white/5 mt-1 whitespace-pre-wrap leading-relaxed">
                        {kyc.permanent_address || kyc.address}
                      </p>
                    </div>
                  )}

                  {kyc.documents && kyc.documents.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <span className="text-[11px] text-ex-muted block mb-1.5">Submitted Documents ({kyc.documents.length})</span>
                      <div className="flex flex-wrap gap-1.5">
                        {kyc.documents.map((d) => (
                          <span key={d.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[11px] text-purple-200">
                            <FileCheck className="h-3 w-3 text-purple-400" />
                            {d.doc_type === "id_front"
                              ? "ID Front"
                              : d.doc_type === "id_back"
                              ? "Aadhaar Back"
                              : d.doc_type === "address_proof"
                              ? "Address Proof"
                              : d.doc_type === "selfie"
                              ? "Camera Selfie"
                              : "Document"}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* APPROVED KYC: SUPPORT TICKET ASSISTANCE CARD */}
                {kyc.status === "approved" && (
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 mt-0.5">
                        <LifeBuoy className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          Need to Change or Update Verified KYC Details?
                        </h4>
                        <p className="text-xs text-ex-muted leading-relaxed">
                          To protect your account against identity fraud and ensure regulatory compliance, verified KYC details cannot be edited directly by users. If you have legally changed your name, moved to a new residential address, or renewed your government ID, please raise a Support Ticket with valid proof. Our compliance administrators will review and update your records upon approval.
                        </p>
                      </div>
                    </div>

                    {/* Active KYC Support Tickets Tracking */}
                    {kycTickets.length > 0 && (
                      <div className="p-3 rounded-lg bg-black/40 border border-white/10 space-y-2 text-xs">
                        <div className="font-semibold text-ex-text flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare className="h-3.5 w-3.5 text-purple-400" />
                            Your KYC Modification Requests ({kycTickets.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate("/support")}
                            className="text-[11px] text-purple-300 hover:text-white flex items-center gap-1 transition"
                          >
                            View in Support Desk <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="space-y-1.5">
                          {kycTickets.slice(0, 3).map((t) => (
                            <div
                              key={t.id}
                              onClick={() => navigate(`/support?ticket=${t.id}`)}
                              className="p-2 rounded bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between gap-2 cursor-pointer transition"
                            >
                              <div className="truncate">
                                <span className="font-mono text-purple-300 font-bold mr-1.5">#{t.id.slice(0, 8)}</span>
                                <span className="text-white font-medium">{t.subject}</span>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <SupportStatusBadge status={t.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-purple-500/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="text-[11px] text-purple-300/80">
                        Average compliance update review: 12–24 business hours.
                      </div>
                      <EasyXButton
                        onClick={() => setShowTicketModal(true)}
                        className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4"
                        data-testid="raise-kyc-ticket-btn"
                      >
                        <LifeBuoy className="h-3.5 w-3.5 mr-1.5" /> Raise KYC Update Ticket
                      </EasyXButton>
                    </div>
                  </div>
                )}
              </div>
            </EasyXCard>
          )}
        </div>
      )}

      {/* SUPPORT TICKET CREATION MODAL FOR KYC MODIFICATION */}
      <CreateTicketModal
        open={showTicketModal}
        onOpenChange={setShowTicketModal}
        defaultCategory="KYC"
        defaultPriority="HIGH"
        defaultSubject="Request to Update Verified KYC Details"
        defaultMessage={`Hello Compliance Support,\n\nI would like to request an update to my verified KYC identity details:\n- Current Verified ID Type: ${(kyc?.id_type || "National ID").toUpperCase()}\n- Current ID Number: ${kyc?.id_number_masked || kyc?.id_number || "On file"}\n- Current Address: ${kyc?.permanent_address || kyc?.address || "On file"}\n\nReason for Update Request:\n[Please describe: e.g. Relocated to new residential address / Legal name change / Renewal of expired document]\n\nRequested New Information:\n[Enter new legal details / address here]\n\nI have attached / will provide supporting official documentation for compliance verification.`}
        onTicketCreated={() => {
          if (refetchTickets) refetchTickets();
          toast.success("Support ticket created. Our compliance team will review your KYC update request.");
        }}
      />
    </div>
  );
}
