import {
  LivenessProvider,
  LivenessSessionInitParams,
  LivenessSessionResponse,
  LivenessVerificationResult,
} from "./types";
import { api } from "@/shared/lib/api";
import { cameraManager } from "@/services/camera/cameraManager";

/**
 * Base Abstract Adapter for Liveness Providers.
 * Handles common hardware camera lifecycle (front-facing stream, track teardown, frame capture).
 */
export abstract class BaseLivenessProvider implements LivenessProvider {
  abstract readonly name: string;
  abstract readonly isTestMode: boolean;

  protected activeStream: MediaStream | null = null;
  protected activeVideoElement: HTMLVideoElement | null = null;

  async initialize(): Promise<void> {
    // Default hook for provider SDK configuration
    return Promise.resolve();
  }

  async startSession(params: LivenessSessionInitParams): Promise<LivenessSessionResponse> {
    const res = await api.post("/kyc/liveness/session", params);
    return res.data;
  }

  async startCamera(
    videoElement: HTMLVideoElement,
    facingMode: "user" | "environment" = "user"
  ): Promise<MediaStream> {
    try {
      const stream = await cameraManager.startCamera(facingMode, videoElement);
      this.activeStream = stream;
      this.activeVideoElement = videoElement;
      return stream;
    } catch (err: any) {
      if (err.code === "PERMISSION_DENIED") {
        const error = new Error("Camera permission was denied. Please allow camera access in browser settings.");
        (error as any).code = "CAMERA_PERMISSION_DENIED";
        throw error;
      }
      if (err.code === "CAMERA_UNAVAILABLE") {
        const error = new Error("Camera is unavailable or in use by another application.");
        (error as any).code = "CAMERA_UNAVAILABLE";
        throw error;
      }
      throw err;
    }
  }

  stopCamera(): void {
    cameraManager.stopCamera();
    this.activeStream = null;

    if (this.activeVideoElement) {
      try {
        this.activeVideoElement.srcObject = null;
      } catch {
        // ignore
      }
      this.activeVideoElement = null;
    }
  }

  /**
   * Helper: Grab a clean, cropped still JPEG frame directly from the running video element.
   */
  protected captureFrameAsBlob(video: HTMLVideoElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement("canvas");
        const w = video.videoWidth || 640;
        const h = video.videoHeight || 480;
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Unable to create canvas context"));
          return;
        }

        // Draw image directly
        ctx.drawImage(video, 0, 0, w, h);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to capture frame as image blob"));
          },
          "image/jpeg",
          0.92
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  abstract performVerification(
    sessionId: string,
    options?: {
      videoElement?: HTMLVideoElement;
      simulatedOutcome?: "SUCCESS" | "FAILURE";
    }
  ): Promise<LivenessVerificationResult>;

  async getResult(sessionId: string): Promise<LivenessVerificationResult> {
    const res = await api.get(`/kyc/liveness/session/${sessionId}`);
    return res.data;
  }

  async cancelSession(sessionId: string): Promise<void> {
    this.stopCamera();
    try {
      await api.post(`/kyc/liveness/session/${sessionId}/cancel`, {});
    } catch {
      // Ignore cancellation failures
    }
  }
}
