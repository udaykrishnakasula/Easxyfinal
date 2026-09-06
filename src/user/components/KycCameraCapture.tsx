import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  RefreshCw,
  Video,
  Info,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { EasyXButton } from "@/design/EasyX";
import {
  cameraManager,
  CameraFacingMode,
  ClassifiedCameraError,
} from "@/services/camera/cameraManager";

export type KycCameraStatus =
  | "NOT_REQUESTED"
  | "REQUESTING"
  | "CAMERA_ACTIVE"
  | "CAPTURED"
  | "PERMISSION_DENIED"
  | "CAMERA_UNAVAILABLE"
  | "BROWSER_UNSUPPORTED"
  | "CAMERA_ERROR";

interface KycCameraCaptureProps {
  onCaptureComplete: (blob: Blob | File, previewUrl: string) => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function KycCameraCapture({
  onCaptureComplete,
  onReset,
  disabled = false,
}: KycCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isMountedRef = useRef(true);

  const [status, setStatus] = useState<KycCameraStatus>("NOT_REQUESTED");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>("user");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Component mount / unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    const unregisterConsumer = cameraManager.registerConsumer();

    // Subscribe to browser permission state changes (e.g. if user updates site settings in address bar)
    const unsubscribePerm = cameraManager.subscribePermissionChanges((permState) => {
      if (!isMountedRef.current) return;
      if (permState === "granted" && status === "PERMISSION_DENIED") {
        setStatus("NOT_REQUESTED");
        setErrorMessage(null);
      } else if (permState === "denied" && status === "CAMERA_ACTIVE") {
        cameraManager.stopCamera();
        setStatus("PERMISSION_DENIED");
        setErrorMessage("Camera access was revoked in browser settings.");
      }
    });

    return () => {
      isMountedRef.current = false;
      unsubscribePerm();
      unregisterConsumer();
      // Ensure active camera tracks are stopped immediately upon navigating away
      cameraManager.stopCamera();
      if (capturedPreview && capturedPreview.startsWith("blob:")) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [status, capturedPreview]);

  /**
   * Start or restart camera stream
   */
  const startCameraStream = useCallback(
    async (targetMode: CameraFacingMode = facingMode) => {
      if (disabled) return;
      setErrorMessage(null);
      setStatus("REQUESTING");

      try {
        await cameraManager.startCamera(targetMode, videoRef.current);

        if (!isMountedRef.current) {
          // If unmounted while getUserMedia was resolving, stop immediately
          cameraManager.stopCamera();
          return;
        }

        setFacingMode(targetMode);
        setStatus("CAMERA_ACTIVE");

        // Inspect camera devices only AFTER camera has been granted
        cameraManager
          .hasMultipleCameras()
          .then((multiple) => {
            if (isMountedRef.current) {
              setHasMultipleCameras(multiple);
            }
          })
          .catch(() => {});
      } catch (err: any) {
        if (!isMountedRef.current) return;
        console.warn("[KycCameraCapture] Camera start issue:", err);

        const errorObj: ClassifiedCameraError =
          err.code && err.message ? err : cameraManager.classifyError(err);

        switch (errorObj.code) {
          case "PERMISSION_DENIED":
            setStatus("PERMISSION_DENIED");
            setErrorMessage(errorObj.message);
            break;
          case "CAMERA_UNAVAILABLE":
            setStatus("CAMERA_UNAVAILABLE");
            setErrorMessage(errorObj.message);
            break;
          case "BROWSER_UNSUPPORTED":
            setStatus("BROWSER_UNSUPPORTED");
            setErrorMessage(errorObj.message);
            break;
          default:
            setStatus("CAMERA_ERROR");
            setErrorMessage(errorObj.message);
            break;
        }
      }
    },
    [disabled, facingMode]
  );

  /**
   * User intentionally clicks "Open Camera & Take Photo"
   */
  const handleOpenClick = async () => {
    if (disabled || isProcessing || status === "REQUESTING" || status === "CAMERA_ACTIVE") return;
    await startCameraStream(facingMode);
  };

  /**
   * Switch between front ('user') and rear ('environment') cameras
   */
  const handleToggleFacingMode = async () => {
    const nextMode: CameraFacingMode = facingMode === "user" ? "environment" : "user";
    await startCameraStream(nextMode);
  };

  /**
   * Snap live photo from active video stream
   */
  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || isProcessing) return;

    try {
      setIsProcessing(true);
      const width = video.videoWidth || video.clientWidth || 640;
      const height = video.videoHeight || video.clientHeight || 480;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not initialize 2D context for selfie snapshot.");

      // Mirror horizontally for front-facing selfie
      if (facingMode === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (!blob) {
            setErrorMessage("Failed to encode selfie snapshot.");
            setStatus("CAMERA_ERROR");
            toast.error("Failed to process captured camera snapshot.");
            return;
          }

          const previewUrl = URL.createObjectURL(blob);
          setCapturedPreview(previewUrl);

          // Stop camera stream tracks immediately after snapshot is captured
          cameraManager.stopCamera();
          setStatus("CAPTURED");

          // Pass File to parent component
          const file = new File([blob], "live_selfie.jpg", { type: "image/jpeg" });
          onCaptureComplete(file, previewUrl);
          toast.success("Live identity selfie captured successfully!");
        },
        "image/jpeg",
        0.88
      );
    } catch (err: any) {
      setIsProcessing(false);
      console.warn("[KycCameraCapture] Snapshot capture error:", err);
      const msg = err?.message || "Could not capture camera snapshot.";
      setErrorMessage(msg);
      setStatus("CAMERA_ERROR");
      toast.error(`Capture failed: ${msg}`);
    }
  };

  /**
   * Reset / Retake photo
   */
  const handleRetake = () => {
    cameraManager.stopCamera();
    if (capturedPreview && capturedPreview.startsWith("blob:")) {
      URL.revokeObjectURL(capturedPreview);
    }
    setCapturedPreview(null);
    setStatus("NOT_REQUESTED");
    setErrorMessage(null);
    onReset();
  };

  return (
    <div className="space-y-3" data-testid="kyc-camera-capture-container">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ex-text flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-ex-lav-300" />
          Live Selfie Photo
        </label>

        {status === "CAMERA_ACTIVE" && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {facingMode === "user" ? "Front Camera (Selfie)" : "Rear Camera"}
          </span>
        )}
      </div>

      {/* State 1: NOT_REQUESTED - Camera is idle and no permissions have been requested yet */}
      {status === "NOT_REQUESTED" && (
        <div
          className="rounded-ex border border-dashed border-white/15 bg-white/[0.02] p-5 text-center transition hover:border-ex-accent/50"
          data-testid="kyc-camera-idle"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ex-lav-400/15 text-ex-lav-300 mb-3">
            <Video className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-ex-text">Live Camera Photo</h4>
          <p className="mt-1 text-xs text-ex-muted max-w-md mx-auto">
            Take a real-time live selfie photo using your device camera. Pre-recorded or uploaded files are strictly prohibited.
          </p>

          <div className="mt-4 flex items-center justify-center">
            <EasyXButton
              type="button"
              variant="accent"
              onClick={handleOpenClick}
              disabled={disabled}
              data-testid="btn-open-camera"
              className="px-6 py-2.5 text-xs font-bold shadow-lg shadow-purple-950/40"
            >
              <Camera className="mr-2 h-4 w-4" />
              Open Camera &amp; Take Photo
            </EasyXButton>
          </div>
        </div>
      )}

      {/* State 2: REQUESTING - Camera hardware is starting or browser prompt is displayed */}
      {status === "REQUESTING" && (
        <div
          className="rounded-ex border border-white/10 bg-white/[0.03] p-8 text-center"
          data-testid="kyc-camera-initializing"
        >
          <div className="h-7 w-7 border-2 border-ex-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm font-semibold text-ex-text">
            Connecting to {facingMode === "user" ? "Front" : "Rear"} Camera...
          </div>
          <p className="text-xs text-ex-muted mt-1">
            Please click <strong>&ldquo;Allow&rdquo;</strong> if your browser requests camera permission.
          </p>
        </div>
      )}

      {/* State 3: CAMERA_ACTIVE - Camera stream active, displaying live video */}
      {status === "CAMERA_ACTIVE" && (
        <div
          className="rounded-ex overflow-hidden border border-white/15 bg-black/70 relative"
          data-testid="kyc-camera-stream-active"
        >
          {/* Video Container with Oval Face Alignment Guide */}
          <div className="relative aspect-[4/3] w-full max-w-md mx-auto overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
              data-testid="kyc-live-video"
            />

            {/* Oval Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-48 h-60 sm:w-56 sm:h-72 rounded-[50%] border-2 border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
              <div className="mt-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-sm text-[11px] font-medium text-white/90 border border-white/10">
                Center your face in the oval
              </div>
            </div>

            {/* Flip / Switch Camera Button (when multiple cameras are available) */}
            {hasMultipleCameras && (
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition flex items-center gap-1 text-[11px] font-medium shadow-lg"
                title={`Switch to ${facingMode === "user" ? "Rear" : "Front"} Camera`}
                data-testid="btn-switch-camera"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{facingMode === "user" ? "Rear Camera" : "Front Camera"}</span>
              </button>
            )}
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-ex-card border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-ex-muted flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-ex-lav-300 shrink-0" />
              Look directly at the camera with clear lighting
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <EasyXButton
                type="button"
                variant="accent"
                onClick={handleCapturePhoto}
                loading={isProcessing}
                data-testid="btn-take-snapshot"
                className="flex-1 sm:flex-none text-xs font-bold px-6"
              >
                <Camera className="mr-1.5 h-4 w-4" /> Capture Photo
              </EasyXButton>

              <button
                type="button"
                onClick={handleRetake}
                className="p-2 rounded-ex-ctrl text-ex-muted hover:text-white hover:bg-white/5 transition"
                title="Cancel camera"
                data-testid="btn-close-camera"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 4: CAPTURED - Live selfie photo captured */}
      {status === "CAPTURED" && capturedPreview && (
        <div
          className="rounded-ex border border-emerald-500/30 bg-emerald-500/10 p-4 transition-all"
          data-testid="kyc-photo-captured"
        >
          <div className="flex items-center gap-3.5">
            <div className="h-16 w-16 shrink-0 rounded-ex overflow-hidden border border-emerald-500/40 relative">
              <img
                src={capturedPreview}
                alt="Captured live selfie"
                className="h-full w-full object-cover"
                data-testid="kyc-captured-selfie-preview"
              />
              <div className="absolute bottom-0 right-0 bg-emerald-500 text-black p-0.5 rounded-tl">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-emerald-200">Live Selfie Captured</h4>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  READY FOR SUBMISSION
                </span>
              </div>
              <p className="mt-0.5 text-xs text-emerald-200/80">
                Photo captured directly from device camera ({facingMode === "user" ? "Front Selfie" : "Rear Camera"}).
              </p>
            </div>

            <button
              type="button"
              onClick={handleRetake}
              data-testid="btn-retake-photo"
              className="text-xs text-emerald-300/90 hover:text-emerald-100 underline decoration-dotted ml-auto shrink-0 font-medium"
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/* State 5: PERMISSION_DENIED - Blocked or denied camera permission */}
      {status === "PERMISSION_DENIED" && (
        <div
          className="rounded-ex border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          data-testid="kyc-camera-blocked-banner"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <h4 className="text-sm font-semibold text-amber-200">
                Camera Access is Blocked
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {errorMessage ||
                  "Camera access is required for selfie verification. Please enable camera permission in your browser/site settings, then try again."}
              </p>

              {/* Step-by-step fix instructions */}
              <div className="rounded bg-black/30 p-2.5 text-[11px] text-amber-200/80 space-y-1.5 border border-amber-500/20">
                <div className="font-semibold text-amber-100">How to enable camera permissions:</div>
                <ol className="list-decimal list-inside space-y-1 text-white/80">
                  <li>Tap the <strong>tune/lock icon (🔒 or 🎛️)</strong> in your browser address bar.</li>
                  <li>Tap <strong>Permissions</strong> / <strong>Site settings</strong> and set <strong>Camera</strong> to <strong>&ldquo;Allow&rdquo;</strong>.</li>
                  <li>Tap <strong>&ldquo;Try Again&rdquo;</strong> below.</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
            <EasyXButton
              type="button"
              variant="accent"
              onClick={handleOpenClick}
              data-testid="btn-retry-open-camera"
              className="text-xs font-semibold h-8 px-4"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </EasyXButton>
          </div>
        </div>
      )}

      {/* State 6: CAMERA_UNAVAILABLE - Hardware missing or locked by another app */}
      {status === "CAMERA_UNAVAILABLE" && (
        <div
          className="rounded-ex border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          data-testid="kyc-camera-unavailable-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <h4 className="text-sm font-semibold text-amber-200">Camera Unavailable</h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {errorMessage ||
                  "No camera detected or the camera is in use by another application. Please check your camera hardware and try again."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
            <EasyXButton
              type="button"
              variant="accent"
              onClick={handleOpenClick}
              data-testid="btn-retry-open-camera"
              className="text-xs font-semibold h-8 px-4"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </EasyXButton>
          </div>
        </div>
      )}

      {/* State 7: BROWSER_UNSUPPORTED or CAMERA_ERROR */}
      {(status === "BROWSER_UNSUPPORTED" || status === "CAMERA_ERROR") && (
        <div
          className="rounded-ex border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
          data-testid="kyc-camera-error-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-300 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <h4 className="text-sm font-semibold text-amber-200">
                {status === "BROWSER_UNSUPPORTED" ? "Browser Not Supported" : "Camera Access Issue"}
              </h4>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                {errorMessage || "Unable to access camera on this browser."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-500/20">
            <EasyXButton
              type="button"
              variant="accent"
              onClick={handleOpenClick}
              data-testid="btn-retry-open-camera"
              className="text-xs font-semibold h-8 px-4"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </EasyXButton>
          </div>
        </div>
      )}
    </div>
  );
}
