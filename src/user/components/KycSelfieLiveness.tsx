import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
  Video,
  Sparkles,
  Info,
} from "lucide-react";
import { EasyXButton, EasyXCard } from "@/design/EasyX";
import { getLivenessProvider } from "@/services/liveness/LivenessProvider";
import { LivenessStatus, LivenessVerificationResult } from "@/services/liveness/types";
import { useAuth } from "@/context/AuthContext";

interface KycSelfieLivenessProps {
  onVerificationComplete: (result: {
    sessionId: string;
    verificationId: string;
    verified: boolean;
    selfieBlob?: Blob;
  }) => void;
  onReset: () => void;
  disabled?: boolean;
}

export default function KycSelfieLiveness({
  onVerificationComplete,
  onReset,
  disabled = false,
}: KycSelfieLivenessProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [provider] = useState(() => getLivenessProvider());
  const [status, setStatus] = useState<LivenessStatus>("NOT_STARTED");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<LivenessVerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      provider.stopCamera();
      if (capturedPreview) {
        URL.revokeObjectURL(capturedPreview);
      }
    };
  }, [provider, capturedPreview]);

  // 1. Start Verification Session and Camera
  const handleStartVerification = async () => {
    try {
      setErrorMessage(null);
      setStatus("INITIALIZING");

      // Initialize provider SDK if needed
      await provider.initialize();

      // Request secure server-side session
      const session = await provider.startSession({
        userId: user?.id || "user",
      });

      setSessionId(session.sessionId);
      setStatus("IN_PROGRESS");

      // Request camera access and mount into video element
      setTimeout(async () => {
        if (videoRef.current) {
          try {
            await provider.startCamera(videoRef.current, "user");
            setStatus("READY");
          } catch (camErr: any) {
            console.warn("Camera access diagnostic:", camErr?.message || camErr);
            if (camErr.code === "CAMERA_PERMISSION_DENIED") {
              setStatus("CAMERA_PERMISSION_DENIED");
              setErrorMessage("Camera permission was denied. Please allow camera access in your browser settings to verify your identity.");
            } else if (camErr.code === "CAMERA_UNAVAILABLE") {
              setStatus("CAMERA_UNAVAILABLE");
              setErrorMessage("No active camera found or device camera is already in use by another app.");
            } else {
              setStatus("CAMERA_UNAVAILABLE");
              setErrorMessage(camErr.message || "Failed to initialize device camera.");
            }
          }
        }
      }, 50);
    } catch (err: any) {
      console.warn("Liveness session start diagnostic:", err?.message || err);
      setStatus("SERVICE_UNAVAILABLE");
      setErrorMessage("Verification service is temporarily unavailable. Please try again.");
    }
  };

  // 2. Perform Liveness Check & Capture
  const handlePerformCheck = async (simulateFailure = false) => {
    if (!sessionId || !videoRef.current) return;

    try {
      setIsCapturing(true);
      setStatus("VERIFYING");
      setErrorMessage(null);

      // Perform provider verification
      const result = await provider.performVerification(sessionId, {
        videoElement: videoRef.current,
        simulatedOutcome: simulateFailure ? "FAILURE" : "SUCCESS",
      });

      setVerificationResult(result);
      provider.stopCamera();

      if (result.verified && result.status === "LIVENESS_VERIFIED") {
        setStatus("LIVENESS_VERIFIED");

        if (result.selfieBlob) {
          const previewUrl = URL.createObjectURL(result.selfieBlob);
          setCapturedPreview(previewUrl);
        }

        onVerificationComplete({
          sessionId: result.sessionId,
          verificationId: result.verificationId,
          verified: true,
          selfieBlob: result.selfieBlob,
        });
      } else {
        setStatus("LIVENESS_FAILED");
        setErrorMessage(result.failureReason || "Liveness verification failed. Please align your face inside the frame and ensure bright lighting.");
      }
    } catch (err: any) {
      console.warn("Liveness verification diagnostic:", err?.message || err);
      setStatus("LIVENESS_FAILED");
      setErrorMessage(err.message || "Verification request encountered an error.");
      provider.stopCamera();
    } finally {
      setIsCapturing(false);
    }
  };

  // 3. Retry / Reset
  const handleRetry = () => {
    provider.stopCamera();
    if (capturedPreview) {
      URL.revokeObjectURL(capturedPreview);
      setCapturedPreview(null);
    }
    setStatus("NOT_STARTED");
    setSessionId(null);
    setVerificationResult(null);
    setErrorMessage(null);
    onReset();
  };

  return (
    <div className="space-y-3" data-testid="kyc-selfie-liveness-container">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-ex-text flex items-center gap-1.5">
          <Camera className="h-4 w-4 text-ex-lav-300" />
          Live Selfie & Liveness Verification
        </label>
        {provider.isTestMode && (
          <span
            className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
            data-testid="liveness-test-mode-badge"
          >
            <Sparkles className="h-3 w-3" />
            Test Mode
          </span>
        )}
      </div>

      {/* State 1: NOT_STARTED */}
      {status === "NOT_STARTED" && (
        <div
          className="rounded-ex border border-dashed border-white/15 bg-white/[0.02] p-5 text-center transition hover:border-ex-accent/50"
          data-testid="liveness-not-started"
        >
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ex-lav-400/15 text-ex-lav-300 mb-3">
            <Video className="h-6 w-6" />
          </div>
          <h4 className="text-sm font-semibold text-ex-text">Camera Verification Required</h4>
          <p className="mt-1 text-xs text-ex-muted max-w-md mx-auto">
            To prevent fraud and protect your wallet, we require a direct camera check to confirm you are live and present.
            File uploads and existing gallery photos are disabled.
          </p>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2">
            <EasyXButton
              type="button"
              variant="accent"
              onClick={handleStartVerification}
              disabled={disabled}
              data-testid="btn-start-liveness"
              className="w-full sm:w-auto px-6 py-2.5 text-xs font-bold"
            >
              <Camera className="mr-2 h-4 w-4" /> Start Selfie Verification
            </EasyXButton>
          </div>
        </div>
      )}

      {/* State 2: INITIALIZING / LOADING */}
      {status === "INITIALIZING" && (
        <div className="rounded-ex border border-white/10 bg-white/[0.03] p-8 text-center" data-testid="liveness-initializing">
          <RefreshCw className="h-7 w-7 text-ex-accent animate-spin mx-auto mb-3" />
          <div className="text-sm font-semibold text-ex-text">Initializing Camera Session...</div>
          <p className="text-xs text-ex-muted mt-1">Connecting to verification layer. Please allow camera permissions if prompted.</p>
        </div>
      )}

      {/* State 3: ACTIVE CAMERA STREAM (READY / IN_PROGRESS / VERIFYING) */}
      {(status === "READY" || status === "IN_PROGRESS" || status === "VERIFYING") && (
        <div className="rounded-ex overflow-hidden border border-white/15 bg-black/60 relative" data-testid="liveness-camera-active">
          {/* Video Container with Oval Guide Overlay */}
          <div className="relative aspect-[4/3] w-full max-w-md mx-auto overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover scale-x-[-1]"
              data-testid="liveness-video-feed"
            />

            {/* Oval Face Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div
                className={`w-48 h-60 sm:w-56 sm:h-72 rounded-[50%] border-2 transition-all duration-300 ${
                  status === "VERIFYING"
                    ? "border-ex-accent animate-pulse shadow-[0_0_25px_rgba(202,240,248,0.4)]"
                    : "border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
                }`}
              />
              <div className="mt-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-sm text-[11px] font-medium text-white/90 border border-white/10">
                {status === "VERIFYING" ? "Verifying liveness..." : "Center your face within the oval"}
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="p-4 bg-ex-card border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-ex-muted flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-ex-lav-300" />
              Ensure good lighting and face camera directly
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <EasyXButton
                type="button"
                variant="accent"
                onClick={() => handlePerformCheck(false)}
                loading={isCapturing || status === "VERIFYING"}
                data-testid="btn-capture-liveness"
                className="flex-1 sm:flex-none text-xs font-bold px-5"
              >
                <Camera className="mr-1.5 h-4 w-4" /> Capture & Verify
              </EasyXButton>

              {/* Test Mode Simulation Trigger for Development/Automated QA */}
              {provider.isTestMode && (
                <button
                  type="button"
                  onClick={() => handlePerformCheck(true)}
                  disabled={isCapturing || status === "VERIFYING"}
                  data-testid="btn-simulate-liveness-fail"
                  className="px-3 py-2 rounded-ex-ctrl text-[11px] font-medium border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 transition"
                  title="Simulate failure for QA testing only"
                >
                  Test Fail
                </button>
              )}

              <button
                type="button"
                onClick={handleRetry}
                className="p-2 rounded-ex-ctrl text-ex-muted hover:text-white hover:bg-white/5 transition"
                title="Cancel camera"
                data-testid="btn-cancel-camera"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 4: LIVENESS_VERIFIED (SUCCESS) */}
      {status === "LIVENESS_VERIFIED" && verificationResult && (
        <div
          className="rounded-ex border border-emerald-500/30 bg-emerald-500/10 p-4 transition-all"
          data-testid="liveness-success-banner"
        >
          <div className="flex items-start gap-3.5">
            {capturedPreview ? (
              <div className="h-16 w-16 shrink-0 rounded-ex overflow-hidden border border-emerald-500/40 relative">
                <img
                  src={capturedPreview}
                  alt="Verified live selfie"
                  className="h-full w-full object-cover scale-x-[-1]"
                  data-testid="liveness-verified-selfie-preview"
                />
                <div className="absolute bottom-0 right-0 bg-emerald-500 text-black p-0.5 rounded-tl">
                  <CheckCircle2 className="h-3 w-3" />
                </div>
              </div>
            ) : (
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-emerald-200">Liveness Verified</h4>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {verificationResult.verificationId}
                </span>
              </div>
              <p className="mt-1 text-xs text-emerald-200/80">
                Live biometric presence check passed. Your verification reference is ready for submission.
              </p>
              <div className="mt-2 text-[11px] text-emerald-300/70 flex items-center gap-3">
                <span>Provider: <strong>{verificationResult.provider}</strong></span>
                {verificationResult.confidenceScore && (
                  <span>Confidence: <strong>{(Number(verificationResult.confidenceScore) * 100).toFixed(1)}%</strong></span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleRetry}
              data-testid="btn-retake-liveness"
              className="text-xs text-emerald-300/80 hover:text-emerald-200 underline decoration-dotted ml-auto shrink-0"
            >
              Retake
            </button>
          </div>
        </div>
      )}

      {/* State 5: FAILURE / PERMISSION ERROR / CAMERA UNAVAILABLE */}
      {(status === "LIVENESS_FAILED" ||
        status === "CAMERA_PERMISSION_DENIED" ||
        status === "CAMERA_UNAVAILABLE" ||
        status === "SERVICE_UNAVAILABLE") && (
        <div
          className="rounded-ex border border-rose-500/30 bg-rose-500/10 p-4 space-y-3"
          data-testid="liveness-failure-banner"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-rose-300 shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-200">
                {status === "CAMERA_PERMISSION_DENIED"
                  ? "Camera Permission Denied"
                  : status === "CAMERA_UNAVAILABLE"
                  ? "Camera Unavailable"
                  : status === "SERVICE_UNAVAILABLE"
                  ? "Verification Service Unavailable"
                  : "Liveness Check Unsuccessful"}
              </h4>
              <p className="mt-1 text-xs text-rose-200/80">
                {errorMessage || "Unable to confirm liveness. Please face the camera directly in a well-lit room."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-rose-500/20">
            <EasyXButton
              type="button"
              variant="outline"
              onClick={handleRetry}
              data-testid="btn-retry-liveness"
              className="text-xs font-semibold h-8 border-rose-500/30 text-rose-200 hover:bg-rose-500/15"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try Again
            </EasyXButton>
          </div>
        </div>
      )}
    </div>
  );
}
