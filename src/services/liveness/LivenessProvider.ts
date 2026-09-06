import { BaseLivenessProvider } from "./BaseLivenessProvider";
import { LivenessVerificationResult } from "./types";
import { api } from "@/shared/lib/api";

/**
 * Isolated Development & Test Mode Provider.
 * - Explicitly identified as Test Mode
 * - Allows simulation of SUCCESS and FAILURE for automated and manual verification workflow tests
 * - NEVER represented as production verification
 */
export class TestModeLivenessProvider extends BaseLivenessProvider {
  readonly name = "test";
  readonly isTestMode = true;

  async performVerification(
    sessionId: string,
    options?: {
      videoElement?: HTMLVideoElement;
      simulatedOutcome?: "SUCCESS" | "FAILURE";
    }
  ): Promise<LivenessVerificationResult> {
    let selfieBlob: Blob | undefined;

    if (options?.videoElement) {
      try {
        selfieBlob = await this.captureFrameAsBlob(options.videoElement);
      } catch (err) {
        console.warn("Failed to capture frame in test mode:", err);
      }
    }

    // Submit verification to backend endpoint
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("simulatedOutcome", options?.simulatedOutcome || "SUCCESS");

    if (selfieBlob) {
      formData.append("selfie", selfieBlob, "liveness_selfie.jpg");
    }

    const res = await api.post("/kyc/liveness/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = res.data;

    return {
      verified: data.verified,
      sessionId: data.sessionId,
      verificationId: data.verificationId,
      provider: data.provider || "test",
      status: data.status,
      timestamp: data.timestamp,
      confidenceScore: data.confidenceScore,
      failureCategory: data.failureCategory,
      failureReason: data.failureReason,
      selfieBlob,
    };
  }
}

/**
 * Production Placeholder Provider for FaceTec / iProov / Veriff / Sumsub.
 * Ready for future production integration with vendor web SDKs.
 */
export class ProductionLivenessProvider extends BaseLivenessProvider {
  readonly name: string;
  readonly isTestMode = false;

  constructor(providerName: string = "production-provider") {
    super();
    this.name = providerName;
  }

  async initialize(): Promise<void> {
    // Future Vendor SDK Initialization (e.g., FaceTecSDK.initializeInDevelopmentMode or iProov.init)
    console.info(`[LivenessProvider] Initializing production provider adapter: ${this.name}`);
  }

  async performVerification(
    sessionId: string,
    options?: {
      videoElement?: HTMLVideoElement;
      simulatedOutcome?: "SUCCESS" | "FAILURE";
    }
  ): Promise<LivenessVerificationResult> {
    let selfieBlob: Blob | undefined;
    if (options?.videoElement) {
      selfieBlob = await this.captureFrameAsBlob(options.videoElement);
    }

    // Production provider forwards the 3D FaceScan payload / cryptographic challenge token to backend
    const formData = new FormData();
    formData.append("sessionId", sessionId);
    if (selfieBlob) {
      formData.append("selfie", selfieBlob, "liveness_selfie.jpg");
    }

    const res = await api.post("/kyc/liveness/verify", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    const data = res.data;

    return {
      verified: data.verified,
      sessionId: data.sessionId,
      verificationId: data.verificationId,
      provider: this.name,
      status: data.status,
      timestamp: data.timestamp,
      confidenceScore: data.confidenceScore,
      failureCategory: data.failureCategory,
      failureReason: data.failureReason,
      selfieBlob,
    };
  }
}

/**
 * Factory to get the configured liveness provider instance.
 */
let providerInstance: BaseLivenessProvider | null = null;

export function getLivenessProvider(providerName?: string, isTestMode?: boolean): BaseLivenessProvider {
  const mode = isTestMode !== undefined ? isTestMode : true; // Default to test mode in development
  const name = providerName || (mode ? "test" : "facetec");

  if (!providerInstance || providerInstance.name !== name || providerInstance.isTestMode !== mode) {
    if (mode || name === "test") {
      providerInstance = new TestModeLivenessProvider();
    } else {
      providerInstance = new ProductionLivenessProvider(name);
    }
  }

  return providerInstance;
}
