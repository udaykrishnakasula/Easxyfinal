/**
 * EasyX Liveness Provider Interface & Abstraction Layer
 *
 * This contract standardizes KYC selfie & liveness verification operations,
 * decoupling the UI and business workflows from specific vendors (e.g., FaceTec, iProov, Veriff, Sumsub).
 */

export type LivenessStatus =
  | "NOT_STARTED"
  | "INITIALIZING"
  | "READY"
  | "IN_PROGRESS"
  | "VERIFYING"
  | "LIVENESS_VERIFIED"
  | "LIVENESS_FAILED"
  | "CAMERA_PERMISSION_DENIED"
  | "CAMERA_UNAVAILABLE"
  | "SERVICE_UNAVAILABLE"
  | "EXPIRED"
  | "CANCELLED";

export interface LivenessSessionInitParams {
  userId: string;
  idType?: string;
  clientNonce?: string;
}

export interface LivenessSessionResponse {
  sessionId: string;
  provider: string;
  isTestMode: boolean;
  expiresAt: string;
  token?: string;
  challengeData?: any;
}

export interface LivenessVerificationRequest {
  sessionId: string;
  payload?: any; // Provider-specific payload (e.g. encrypted 3D face scan, or captured selfie blob in test mode)
  simulatedOutcome?: "SUCCESS" | "FAILURE"; // Allowed ONLY when isTestMode === true
  failureReason?: string;
}

export interface LivenessVerificationResult {
  verified: boolean;
  sessionId: string;
  verificationId: string;
  provider: string;
  status: "LIVENESS_VERIFIED" | "LIVENESS_FAILED";
  timestamp: string;
  confidenceScore?: number;
  failureCategory?: string;
  failureReason?: string;
  selfieBlob?: Blob; // Captured selfie blob associated with the session for KYC review
}

export interface LivenessProvider {
  readonly name: string;
  readonly isTestMode: boolean;

  /**
   * Initialize provider SDK / client resources
   */
  initialize(): Promise<void>;

  /**
   * Request a new server-backed verification session
   */
  startSession(params: LivenessSessionInitParams): Promise<LivenessSessionResponse>;

  /**
   * Request device camera stream and attach to video element
   */
  startCamera(videoElement: HTMLVideoElement, facingMode?: "user" | "environment"): Promise<MediaStream>;

  /**
   * Stop camera and release device media streams
   */
  stopCamera(): void;

  /**
   * Perform client-side verification or capture and submit to backend verification endpoint
   */
  performVerification(
    sessionId: string,
    options?: {
      videoElement?: HTMLVideoElement;
      simulatedOutcome?: "SUCCESS" | "FAILURE";
    }
  ): Promise<LivenessVerificationResult>;

  /**
   * Retrieve current verification status for a session
   */
  getResult(sessionId: string): Promise<LivenessVerificationResult>;

  /**
   * Cancel an in-flight verification session
   */
  cancelSession(sessionId: string): Promise<void>;
}
