/**
 * Centralized EasyX Camera & MediaStream Lifecycle Manager
 *
 * Enforces a strict, singleton camera lifecycle:
 *   NOT_REQUESTED -> REQUESTING -> GRANTED -> ACTIVE -> STOPPED
 *
 * Guarantees:
 * 1. Zero camera access or permission requests on app startup, navigation, or background processes.
 * 2. Only ONE active hardware MediaStream across the entire application (prevents duplicate streams).
 * 3. Idempotent requests (handles React Strict Mode double-invocations & rapid clicks safely).
 * 4. Checks browser Permissions API before requesting hardware access.
 * 5. Clean track teardown on capture, cancellation, or component unmount without revoking browser permission.
 * 6. Authoritative browser permission states ("granted" | "denied" | "prompt") without relying on localStorage.
 * 7. Eliminates redundant in-app permission popups before native browser prompts.
 */

export type CameraLifecycleState =
  | "NOT_REQUESTED"
  | "REQUESTING"
  | "GRANTED"
  | "ACTIVE"
  | "STOPPED"
  | "PERMISSION_DENIED"
  | "CAMERA_UNAVAILABLE"
  | "BROWSER_UNSUPPORTED"
  | "CAMERA_ERROR";

export type CameraFacingMode = "user" | "environment";

export interface ClassifiedCameraError {
  code:
    | "PERMISSION_DENIED"
    | "CAMERA_UNAVAILABLE"
    | "BROWSER_UNSUPPORTED"
    | "CAMERA_ERROR";
  message: string;
  originalError?: any;
}

class CameraManager {
  private activeStream: MediaStream | null = null;
  private activeFacingMode: CameraFacingMode = "user";
  private activeRequestPromise: Promise<MediaStream> | null = null;
  private currentState: CameraLifecycleState = "NOT_REQUESTED";
  private activeConsumerCount = 0;
  private permissionStatusObj: PermissionStatus | null = null;
  private permissionListeners = new Set<(state: "granted" | "denied" | "prompt") => void>();

  constructor() {
    // Deliberately empty: zero queries, listeners, or actions on app load or module import.
    // Permission checks and camera requests happen strictly after explicit user actions.
  }

  /**
   * Initializes non-intrusive permission status listener lazily only when requested.
   * Never prompts the user.
   */
  private async initPermissionWatcher() {
    if (this.permissionStatusObj || typeof navigator === "undefined" || !navigator.permissions?.query) {
      return;
    }
    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      this.permissionStatusObj = status;
      status.onchange = () => {
        const newState = status.state as "granted" | "denied" | "prompt";
        if (newState === "denied" && this.currentState === "ACTIVE") {
          this.stopCamera();
          this.currentState = "PERMISSION_DENIED";
        } else if (newState === "granted" && this.currentState === "PERMISSION_DENIED") {
          this.currentState = "GRANTED";
        }
        this.permissionListeners.forEach((listener) => {
          try {
            listener(newState);
          } catch (e) {
            console.warn("[CameraManager] Permission listener error:", e);
          }
        });
      };
    } catch {
      // Browsers like Safari / Firefox may reject query({ name: "camera" })
      this.permissionStatusObj = null;
    }
  }

  /**
   * Subscribe to browser permission state changes (e.g. if user updates site settings)
   */
  public subscribePermissionChanges(
    callback: (state: "granted" | "denied" | "prompt") => void
  ): () => void {
    this.initPermissionWatcher();
    this.permissionListeners.add(callback);
    return () => {
      this.permissionListeners.delete(callback);
    };
  }

  /**
   * Checks current browser permission state without prompting
   */
  public async checkBrowserPermission(): Promise<"granted" | "denied" | "prompt" | "unsupported"> {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
      return "unsupported";
    }
    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      return status.state as "granted" | "denied" | "prompt";
    } catch {
      return "unsupported";
    }
  }

  /**
   * Current lifecycle state
   */
  public getState(): CameraLifecycleState {
    return this.currentState;
  }

  /**
   * Returns whether a valid, live stream is currently flowing
   */
  public isStreamActive(): boolean {
    if (!this.activeStream) return false;
    const tracks = this.activeStream.getVideoTracks();
    return tracks.length > 0 && tracks.some((t) => t.readyState === "live");
  }

  /**
   * Get active MediaStream reference
   */
  public getActiveStream(): MediaStream | null {
    if (this.isStreamActive()) {
      return this.activeStream;
    }
    return null;
  }

  /**
   * Current facing mode of active camera
   */
  public getFacingMode(): CameraFacingMode {
    return this.activeFacingMode;
  }

  /**
   * Classify any MediaStream / getUserMedia error into a structured EasyX error
   */
  public classifyError(err: any): ClassifiedCameraError {
    const name = err?.name || "";
    const msg = String(err?.message || "").toLowerCase();

    // 1. Permission Denied / Blocked / Dismissed
    if (
      name === "NotAllowedError" ||
      name === "PermissionDeniedError" ||
      name === "SecurityError" ||
      msg.includes("permission denied") ||
      msg.includes("permission dismissed") ||
      msg.includes("not allowed")
    ) {
      return {
        code: "PERMISSION_DENIED",
        message:
          "Camera access is blocked or was denied. Please allow camera permission in your browser address bar / site settings and tap Try Again.",
        originalError: err,
      };
    }

    // 2. Hardware Missing / Not Found
    if (
      name === "NotFoundError" ||
      name === "DevicesNotFoundError" ||
      msg.includes("not found") ||
      msg.includes("no camera") ||
      msg.includes("requested device not found")
    ) {
      return {
        code: "CAMERA_UNAVAILABLE",
        message:
          "No camera detected on this device. Please connect a camera or open EasyX on a device with a front camera.",
        originalError: err,
      };
    }

    // 3. Camera Busy / Locked by another application
    if (
      name === "NotReadableError" ||
      name === "TrackStartError" ||
      msg.includes("in use") ||
      msg.includes("could not start video source") ||
      msg.includes("device in use") ||
      msg.includes("hardware error")
    ) {
      return {
        code: "CAMERA_UNAVAILABLE",
        message:
          "Your camera is currently in use by another application or browser tab. Please close other camera apps and try again.",
        originalError: err,
      };
    }

    // 4. Unsupported Browser or Insecure Context
    if (
      name === "BrowserNotSupportedError" ||
      name === "InsecureContextError" ||
      msg.includes("not supported") ||
      msg.includes("insecure context")
    ) {
      return {
        code: "BROWSER_UNSUPPORTED",
        message:
          "Direct camera access is not supported on this browser or requires a secure HTTPS connection. Please open EasyX in Google Chrome, Safari, or Edge.",
        originalError: err,
      };
    }

    // 5. General Error (Constraint error, AbortError, etc.)
    return {
      code: "CAMERA_ERROR",
      message:
        err?.message || "Failed to start camera. Please check your browser settings and try again.",
      originalError: err,
    };
  }

  /**
   * Requests or reuses a single camera stream.
   *
   * Rules:
   * - If stream is already active and matches target facing mode, reuse it immediately.
   * - If an in-flight request promise is already executing, return that exact promise.
   * - If browser permission is known to be 'denied', rejects immediately without calling getUserMedia.
   * - Handles React Strict Mode and component remounts safely.
   */
  public async startCamera(
    facingMode: CameraFacingMode = "user",
    videoElement?: HTMLVideoElement | null
  ): Promise<MediaStream> {
    // Check browser capability first
    const mediaDevices = typeof navigator !== "undefined" ? navigator.mediaDevices : null;
    if (!mediaDevices || typeof mediaDevices.getUserMedia !== "function") {
      this.currentState = "BROWSER_UNSUPPORTED";
      const err = this.classifyError(new Error("Browser does not support getUserMedia API"));
      throw err;
    }

    // If an existing stream is already live and facingMode matches, reuse it
    if (this.isStreamActive() && this.activeFacingMode === facingMode && this.activeStream) {
      this.currentState = "ACTIVE";
      if (videoElement) {
        this.attachStreamToVideo(this.activeStream, videoElement);
      }
      return this.activeStream;
    }

    // If a request is already in-flight, return the existing promise (concurrency guard)
    if (this.activeRequestPromise) {
      const stream = await this.activeRequestPromise;
      if (videoElement) {
        this.attachStreamToVideo(stream, videoElement);
      }
      return stream;
    }

    // If permission is known to be denied in browser settings, do not repeatedly call getUserMedia
    const currentPermission = await this.checkBrowserPermission();
    if (currentPermission === "denied") {
      this.currentState = "PERMISSION_DENIED";
      const err = this.classifyError({ name: "NotAllowedError" });
      throw err;
    }

    // If facing mode is changing, safely stop the previous stream first
    if (this.activeStream) {
      this.stopCamera();
    }

    this.currentState = "REQUESTING";

    this.activeRequestPromise = (async () => {
      try {
        let stream: MediaStream;

        // Try primary constraints with desired facing mode & HD resolutions
        try {
          stream = await mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 },
            },
            audio: false,
          });
        } catch (initialErr: any) {
          // If overconstrained, fallback to minimal unconstrained video
          if (
            initialErr?.name === "OverconstrainedError" ||
            initialErr?.name === "ConstraintNotSatisfiedError"
          ) {
            console.warn("[CameraManager] Constraints fallback: requesting basic video stream");
            stream = await mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
          } else {
            throw initialErr;
          }
        }

        this.activeStream = stream;
        this.activeFacingMode = facingMode;
        this.currentState = "ACTIVE";

        if (videoElement) {
          this.attachStreamToVideo(stream, videoElement);
        }

        return stream;
      } catch (rawErr: any) {
        const classified = this.classifyError(rawErr);
        this.currentState = classified.code;
        throw classified;
      } finally {
        this.activeRequestPromise = null;
      }
    })();

    return this.activeRequestPromise;
  }

  /**
   * Attaches a stream to an HTMLVideoElement and ensures autoplay initiates cleanly
   */
  public attachStreamToVideo(stream: MediaStream, videoElement: HTMLVideoElement): void {
    try {
      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
      videoElement.setAttribute("playsinline", "true");
      videoElement.setAttribute("webkit-playsinline", "true");
      videoElement.muted = true;
      videoElement.autoplay = true;

      const playPromise = videoElement.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn("[CameraManager] Video play promise note:", err);
          videoElement.onloadedmetadata = () => {
            videoElement.play().catch((e) => console.warn("[CameraManager] Play retry note:", e));
          };
        });
      }
    } catch (e) {
      console.warn("[CameraManager] Failed to attach stream to video element:", e);
    }
  }

  /**
   * Stops the active camera stream and frees hardware tracks.
   *
   * IMPORTANT:
   * Stopping the camera tracks turns off the camera hardware/indicator.
   * It does NOT revoke or reset the browser's site permission!
   */
  public stopCamera(): void {
    if (this.activeStream) {
      try {
        const tracks = this.activeStream.getTracks();
        tracks.forEach((track) => {
          try {
            track.stop();
          } catch (e) {
            console.warn("[CameraManager] Error stopping track:", e);
          }
        });
      } catch (e) {
        console.warn("[CameraManager] Error cleaning up stream:", e);
      }
      this.activeStream = null;
    }

    if (this.currentState === "ACTIVE" || this.currentState === "REQUESTING") {
      this.currentState = "STOPPED";
    }
  }

  /**
   * Register a component consumer mounting
   */
  public registerConsumer(): () => void {
    this.activeConsumerCount++;
    return () => {
      this.activeConsumerCount = Math.max(0, this.activeConsumerCount - 1);
      if (this.activeConsumerCount === 0) {
        this.stopCamera();
      }
    };
  }

  /**
   * Check if multiple video input devices exist on the system (e.g. front & back cameras)
   * Only called AFTER permission has been granted, never on startup.
   */
  public async hasMultipleCameras(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return false;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === "videoinput");
      return videoInputs.length > 1;
    } catch {
      return false;
    }
  }
}

// Global Singleton Instance
export const cameraManager = new CameraManager();
