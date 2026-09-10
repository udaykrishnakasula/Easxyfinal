/**
 * EasyX Frontend Monitoring & Observability Client
 * 
 * Provides:
 * - Safe session tracking with persistent session_id
 * - Unified activity tracking for key user journeys (Auth, KYC, Deposit, Investment, Withdrawal, Support)
 * - Failed action capture
 * - Client environment telemetry (device type, browser, OS)
 * - Deep privacy masking via dataMasker
 * - Non-blocking event queuing and batch flushing
 * - Correlation ID injection for API tracing
 */

import { maskSensitiveData, sanitizeUrl, safeJsonStringify } from "./dataMasker";

const MONITORING_SESSION_KEY = "easyx_monitoring_session_id";
const MONITORING_QUEUE_KEY = "easyx_monitoring_event_queue";
const MAX_LOCAL_QUEUE = 100;

class MonitoringClient {
  constructor() {
    this.sessionId = this.getOrCreateSessionId();
    this.userContext = { id: "anonymous", email: "anonymous@easyx.io", role: "guest" };
    this.currentRoute = typeof window !== "undefined" ? window.location.pathname : "/";
    this.eventQueue = [];
    this.flushTimeout = null;
    this.deviceInfo = this.detectDeviceInfo();
    this.initialized = false;

    if (typeof window !== "undefined") {
      this.initListeners();
    }
  }

  // --- Session Management ---
  getOrCreateSessionId() {
    if (typeof window === "undefined") return "sess_ssr";
    try {
      let sId = sessionStorage.getItem(MONITORING_SESSION_KEY);
      if (!sId) {
        sId = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
        sessionStorage.setItem(MONITORING_SESSION_KEY, sId);
      }
      return sId;
    } catch {
      return "sess_" + Math.random().toString(36).substring(2, 9);
    }
  }

  // --- Device & Environment Detection ---
  detectDeviceInfo() {
    if (typeof window === "undefined" || !navigator) {
      return { device_type: "unknown", browser: "unknown", operating_system: "unknown" };
    }

    const ua = navigator.userAgent || "";
    let device_type = "desktop";
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
      device_type = "tablet";
    } else if (
      /Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(
        ua
      )
    ) {
      device_type = "mobile";
    }

    let browser = "Chrome";
    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";

    let operating_system = "Unknown OS";
    if (ua.includes("Win")) operating_system = "Windows";
    else if (ua.includes("Mac")) operating_system = "macOS";
    else if (ua.includes("Linux")) operating_system = "Linux";
    else if (ua.includes("Android")) operating_system = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) operating_system = "iOS";

    return { device_type, browser, operating_system, user_agent: ua.slice(0, 200) };
  }

  // --- Correlation ID ---
  generateCorrelationId() {
    return "req_corr_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
  }

  // --- User Identification ---
  setUser(user) {
    if (!user) {
      this.userContext = { id: "anonymous", email: "anonymous@easyx.io", role: "guest" };
      return;
    }
    this.userContext = {
      id: user.id || "anonymous",
      email: user.email || "anonymous@easyx.io",
      role: user.role || "user",
    };
  }

  // --- Core Tracking Methods ---
  trackUserActivity({
    event_name,
    event_category = "GENERAL",
    action,
    page,
    success = true,
    error_id = null,
    correlation_id = null,
    metadata = {},
    duration_seconds = null,
    element = null,
    element_text = null,
    funnel_name = null,
    step = null,
  }) {
    try {
      const payload = {
        id: "evt_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        user: { ...this.userContext },
        session_id: this.sessionId,
        event_name: String(event_name || action || "EVENT").slice(0, 80),
        event_category: String(event_category).toUpperCase().slice(0, 40),
        action: String(action || event_name || "ACTION").slice(0, 80),
        page: sanitizeUrl(page || this.currentRoute),
        success: Boolean(success),
        error_id: error_id ? String(error_id) : null,
        correlation_id: correlation_id || this.generateCorrelationId(),
        device_type: this.deviceInfo.device_type,
        browser: this.deviceInfo.browser,
        operating_system: this.deviceInfo.operating_system,
        duration_seconds: typeof duration_seconds === "number" ? duration_seconds : null,
        element: element ? String(element).slice(0, 250) : null,
        element_text: element_text ? String(element_text).slice(0, 100) : null,
        funnel_name: funnel_name ? String(funnel_name).slice(0, 60) : null,
        step: step ? String(step).slice(0, 60) : null,
        metadata: maskSensitiveData(metadata || {}),
      };

      this.enqueueEvent(payload);
      return payload;
    } catch (err) {
      console.warn("[MonitoringClient] Track activity failed silently:", err);
      return null;
    }
  }

  // --- Track Action Failure Helper ---
  trackActionFailure({
    page,
    action,
    error,
    http_status = null,
    metadata = {},
  }) {
    const errorId = "err_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    const correlationId = this.generateCorrelationId();

    // 1. Record Failed Activity Event
    this.trackUserActivity({
      event_name: `${action.toUpperCase().replace(/\s+/g, "_")}_FAILED`,
      event_category: this.getCategoryFromRoute(page || this.currentRoute),
      action: action,
      page: page || this.currentRoute,
      success: false,
      error_id: errorId,
      correlation_id: correlationId,
      metadata: {
        ...metadata,
        errorMessage: error?.message || String(error || "Action failed"),
        http_status,
      },
    });

    // 2. Record Error Log
    this.trackError({
      id: errorId,
      error_name: error?.name || `ActionFailure:${action}`,
      message: error?.message || String(error || "Unknown action error"),
      stack: error?.stack || null,
      page: page || this.currentRoute,
      source: "action_failure",
      severity: http_status && http_status >= 500 ? "critical" : "error",
      http_status,
      correlation_id: correlationId,
      metadata,
    });
  }

  // --- Track Error Helper ---
  trackError({
    id,
    error_name = "Error",
    message = "An error occurred",
    stack = null,
    component_stack = null,
    page = null,
    source = "frontend_runtime",
    severity = "error",
    endpoint = null,
    http_status = null,
    correlation_id = null,
    metadata = {},
  }) {
    try {
      const errPayload = {
        id: id || "err_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        user: { ...this.userContext },
        session_id: this.sessionId,
        page: sanitizeUrl(page || this.currentRoute),
        source,
        severity: ["critical", "error", "warning", "info"].includes(severity) ? severity : "error",
        error_name: String(error_name).slice(0, 100),
        message: maskSensitiveData(String(message).slice(0, 1500)),
        stack: stack ? maskSensitiveData(String(stack).slice(0, 4000)) : null,
        component_stack: component_stack ? maskSensitiveData(String(component_stack).slice(0, 3000)) : null,
        endpoint: endpoint ? String(endpoint).slice(0, 200) : null,
        http_status: typeof http_status === "number" ? http_status : null,
        correlation_id: correlation_id || this.generateCorrelationId(),
        device_type: this.deviceInfo.device_type,
        browser: this.deviceInfo.browser,
        operating_system: this.deviceInfo.operating_system,
        user_agent: this.deviceInfo.user_agent,
        metadata: maskSensitiveData(metadata || {}),
        resolved: false,
      };

      this.sendErrorBatch([errPayload]);
      return errPayload;
    } catch (err) {
      console.warn("[MonitoringClient] Track error failed silently:", err);
      return null;
    }
  }

  // --- Funnel Helper ---
  trackFunnelStep(funnelName, stepName, metadata = {}) {
    this.trackUserActivity({
      event_name: `${funnelName.toUpperCase()}_STEP_${stepName.toUpperCase()}`,
      event_category: funnelName.toUpperCase(),
      action: stepName,
      funnel_name: funnelName,
      step: stepName,
      page: this.currentRoute,
      success: true,
      metadata,
    });
  }

  // --- Page View Helper ---
  trackPageView(page, metadata = {}) {
    this.currentRoute = page;
    this.trackUserActivity({
      event_name: "PAGE_VIEW",
      event_category: "NAVIGATION",
      action: "PAGE_VIEW",
      page,
      success: true,
      metadata,
    });
  }

  getCategoryFromRoute(route = "") {
    const r = route.toLowerCase();
    if (r.includes("/deposit")) return "DEPOSIT";
    if (r.includes("/kyc")) return "KYC";
    if (r.includes("/invest")) return "INVESTMENT";
    if (r.includes("/withdraw")) return "WITHDRAWAL";
    if (r.includes("/support")) return "SUPPORT";
    if (r.includes("/login") || r.includes("/register") || r.includes("/auth")) return "AUTH";
    if (r.includes("/dashboard") || r.includes("/home")) return "DASHBOARD";
    if (r.includes("/notifications")) return "NOTIFICATIONS";
    return "GENERAL";
  }

  // --- Queue and Batching ---
  enqueueEvent(evt) {
    this.eventQueue.push(evt);
    if (this.eventQueue.length > MAX_LOCAL_QUEUE) {
      this.eventQueue.shift();
    }
    this.scheduleFlush();
  }

  scheduleFlush() {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flushEvents();
    }, 2500);
  }

  async flushEvents() {
    this.flushTimeout = null;
    if (!this.eventQueue.length) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (typeof window !== "undefined" && typeof fetch === "function") {
        await fetch("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ events: batch }),
        });
      }
    } catch {
      // Non-blocking silently ignore
    }
  }

  async sendErrorBatch(errors) {
    try {
      if (typeof window !== "undefined" && typeof fetch === "function") {
        await fetch("/api/analytics/errors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: safeJsonStringify({ errors }),
        });
      }
    } catch {
      // Non-blocking
    }
  }

  // --- Global Listeners ---
  initListeners() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Global JS Runtime Errors
    window.addEventListener("error", (e) => {
      // Ignore benign resize observer or websocket errors
      if (e.message && (e.message.includes("ResizeObserver") || e.message.includes("websocket"))) {
        return;
      }
      // Check for DOM element load errors (e.g. <img> or <video> fail to load)
      if (e.target && typeof Element !== "undefined" && e.target instanceof Element && e.target !== window) {
        const tag = e.target.tagName ? e.target.tagName.toLowerCase() : "resource";
        const src = e.target.src || e.target.currentSrc || null;
        this.trackError({
          error_name: "ResourceLoadError",
          message: `Failed to load <${tag}> resource: ${src || "unknown source"}`,
          page: window.location.pathname,
          source: "resource_load",
          severity: "warning",
          metadata: {
            tagName: tag,
            src: src ? String(src).slice(0, 300) : null,
          },
        });
        return;
      }

      this.trackError({
        error_name: e.error?.name || "UncaughtException",
        message: e.message || "Uncaught window error",
        stack: e.error?.stack || null,
        page: window.location.pathname,
        source: "frontend_runtime",
        severity: "error",
      });
    });

    // 2. Unhandled Promise Rejections
    window.addEventListener("unhandledrejection", (e) => {
      const reason = e.reason;
      let msg = "Unhandled Promise Rejection";
      let errName = "UnhandledPromiseRejection";
      let stack = null;

      if (reason instanceof Error) {
        errName = reason.name;
        msg = reason.message;
        stack = reason.stack;
      } else if (typeof reason === "string") {
        msg = reason;
      } else if (typeof Element !== "undefined" && reason instanceof Element) {
        msg = `Promise rejected with <${reason.tagName?.toLowerCase() || "element"}> element`;
      } else if (reason && typeof reason === "object") {
        msg = reason.message || reason.detail || safeJsonStringify(reason);
      }

      this.trackError({
        error_name: errName,
        message: msg,
        stack,
        page: window.location.pathname,
        source: "unhandled_promise",
        severity: "error",
      });
    });

    // 3. Unload flush
    window.addEventListener("beforeunload", () => {
      if (this.eventQueue.length && navigator?.sendBeacon) {
        try {
          navigator.sendBeacon("/api/analytics/events", safeJsonStringify({ events: this.eventQueue }));
          this.eventQueue = [];
        } catch {
          // ignore
        }
      }
    });
  }
}

export const monitoringClient = new MonitoringClient();
export default monitoringClient;
