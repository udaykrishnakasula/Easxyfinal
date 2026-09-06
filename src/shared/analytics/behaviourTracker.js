/**
 * EasyX Passive Behaviour, Friction & Funnel Drop-Off Tracker
 * Tracks:
 * - Rage clicks (3+ rapid clicks within 1s on same target)
 * - Dead clicks (clicks on interactive elements that trigger zero state/network/DOM updates)
 * - Screen view duration & Funnel drop-offs (Deposits, KYC, Investments)
 */

import { maskSensitiveData, sanitizeUrl } from "./dataMasker";

const EVENTS_STORAGE_KEY = "easyx_analytics_events_v1";
const FUNNELS_STORAGE_KEY = "easyx_active_funnels_v1";
const MAX_LOCAL_EVENTS = 200;

class BehaviourTracker {
  constructor() {
    this.userContext = { id: "anonymous", email: "anonymous@easyx.io", role: "guest" };
    this.isInitialized = false;
    this.eventQueue = [];
    this.flushTimeout = null;

    // Rage click state
    this.clickHistory = []; // { x, y, targetId, time, elInfo }

    // Dead click state
    this.pendingClicks = [];
    this.mutationObserved = false;
    this.mutationObserver = null;
    this.mutationDisconnectTimeout = null;
    this.lastNetworkCallTime = 0;
    this.lastLocationChangeTime = 0;

    // Listeners for cleanup
    this.clickHandler = null;
    this.beforeUnloadHandler = null;

    // Screen view state
    this.currentRoute = typeof window !== "undefined" ? window.location.pathname : "/";
    this.routeEntryTime = Date.now();

    // Active Funnel tracking
    this.activeFunnels = new Map(); // funnelName -> { startTime, currentStep, metadata }
  }

  setUserContext(user) {
    if (user) {
      this.userContext = {
        id: user.id || user.user_id || "anonymous",
        email: user.email || "anonymous@easyx.io",
        role: user.role || "user",
      };
    } else {
      this.userContext = { id: "anonymous", email: "anonymous@easyx.io", role: "guest" };
    }
  }

  init() {
    if (this.isInitialized || typeof window === "undefined") return;
    this.isInitialized = true;

    this.currentRoute = window.location.pathname;
    this.routeEntryTime = Date.now();

    // Setup global listeners
    this.setupClickListener();
    this.setupNetworkInterceptor();
    this.setupLifecycleListeners();
    this.seedInitialAnalyticsDataIfEmpty();
  }

  getElementDescriptor(el) {
    if (!el || !(el instanceof Element)) return { tag: "UNKNOWN", text: "", id: "", classList: "" };
    
    // Find closest interactive element if clicked on inner icon or span
    const interactive = el.closest("button, a, input, select, textarea, [role='button'], [data-clickable='true']") || el;
    
    const tag = interactive.tagName.toLowerCase();
    const id = interactive.id ? `#${interactive.id}` : "";
    const testId = interactive.getAttribute("data-testid") ? `[data-testid='${interactive.getAttribute("data-testid")}']` : "";
    const role = interactive.getAttribute("role") ? `[role='${interactive.getAttribute("role")}']` : "";
    
    let text = (interactive.innerText || interactive.getAttribute("aria-label") || interactive.getAttribute("title") || interactive.getAttribute("name") || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 50);

    const classNames = Array.from(interactive.classList || []).slice(0, 4).join(".");
    const selector = `${tag}${id}${testId || (classNames ? `.${classNames}` : "")}`;

    return {
      tag,
      selector,
      id: interactive.id || null,
      testId: interactive.getAttribute("data-testid") || null,
      text: maskSensitiveData(text),
      isInteractive: Boolean(
        tag === "button" ||
        tag === "a" ||
        tag === "input" ||
        tag === "select" ||
        role === "[role='button']" ||
        interactive.classList.contains("btn") ||
        interactive.classList.contains("clickable") ||
        interactive.getAttribute("onclick") ||
        window.getComputedStyle(interactive).cursor === "pointer"
      ),
    };
  }

  setupClickListener() {
    if (typeof document === "undefined") return;

    this.clickHandler = (e) => {
      const now = Date.now();
      const target = e.target;
      if (!target) return;
      const x = e.clientX;
      const y = e.clientY;
      const elInfo = this.getElementDescriptor(target);
      const targetId = target.id || target.getAttribute?.("data-testid") || elInfo.selector;

      // --- 1. RAGE CLICK DETECTION ---
      // Keep clicks in the last 1000ms - store lightweight targetId instead of raw DOM node
      this.clickHistory = this.clickHistory.filter((c) => now - c.time <= 1000);
      this.clickHistory.push({ x, y, targetId, time: now, elInfo });

      // Check if 3+ clicks happened on the same target or within 25px radius
      const nearbyClicks = this.clickHistory.filter(
        (c) =>
          (targetId && c.targetId === targetId) ||
          Math.hypot(c.x - x, c.y - y) <= 25 ||
          (c.elInfo.selector && c.elInfo.selector === elInfo.selector)
      );

      if (nearbyClicks.length === 3) {
        // Trigger rage click event on the 3rd rapid click
        this.trackFrictionEvent({
          type: "RAGE_CLICK",
          element: elInfo.selector,
          elementText: elInfo.text,
          clickCount: nearbyClicks.length,
          coordinates: { x, y },
          route: this.currentRoute,
          metadata: {
            durationMs: nearbyClicks[0]?.time ? now - nearbyClicks[0].time : 0,
            tag: elInfo.tag,
            testId: elInfo.testId,
          },
        });
      }

      // --- 2. DEAD CLICK DETECTION ---
      // Only test elements that appear interactive
      if (elInfo.isInteractive) {
        const snapshotUrl = window.location.pathname;
        const snapshotTime = now;
        
        // Scope mutation observation ONLY to this 450ms window
        this.observeMutationWindow(450);

        // Queue check after 450ms
        setTimeout(() => {
          const urlChanged = window.location.pathname !== snapshotUrl;
          const networkHappened = this.lastNetworkCallTime > snapshotTime;
          const mutationHappened = this.mutationObserved;
          const activeTag = document.activeElement?.tagName;
          const isInputFocus = Boolean(
            activeTag === "INPUT" ||
            activeTag === "TEXTAREA" ||
            activeTag === "SELECT" ||
            (targetId && document.activeElement?.id === targetId)
          );

          // If none of these happened on an interactive button/link, flag DEAD CLICK
          if (!urlChanged && !networkHappened && !mutationHappened && !isInputFocus) {
            this.trackFrictionEvent({
              type: "DEAD_CLICK",
              element: elInfo.selector,
              elementText: elInfo.text,
              coordinates: { x, y },
              route: this.currentRoute,
              metadata: {
                tag: elInfo.tag,
                testId: elInfo.testId,
                note: "No route change, network request, or DOM mutation observed after 450ms",
              },
            });
          }
        }, 450);
      }
    };

    document.addEventListener("click", this.clickHandler, true);
  }

  /**
   * Scoped mutation observer: only runs for durationMs following an interactive click,
   * observing childList only, and disconnects immediately upon detection or timeout.
   */
  observeMutationWindow(durationMs = 450) {
    if (typeof MutationObserver === "undefined") return;
    this.mutationObserved = false;

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    if (this.mutationDisconnectTimeout) {
      clearTimeout(this.mutationDisconnectTimeout);
      this.mutationDisconnectTimeout = null;
    }

    try {
      this.mutationObserver = new MutationObserver(() => {
        this.mutationObserved = true;
        if (this.mutationObserver) {
          this.mutationObserver.disconnect();
          this.mutationObserver = null;
        }
      });
      const root = document.body || document.documentElement;
      if (root) {
        this.mutationObserver.observe(root, {
          childList: true,
          subtree: true,
        });
      }
      this.mutationDisconnectTimeout = setTimeout(() => {
        if (this.mutationObserver) {
          this.mutationObserver.disconnect();
          this.mutationObserver = null;
        }
      }, durationMs);
    } catch {
      // Safe fallback
    }
  }

  setupNetworkInterceptor() {
    // Intercept native fetch safely without throwing if window.fetch has only a getter
    try {
      if (typeof window !== "undefined" && typeof window.fetch === "function") {
        const originalFetch = window.fetch;
        const tracker = this;
        const wrappedFetch = function (...args) {
          try {
            const url = typeof args[0] === "string" ? args[0] : args[0]?.url || "";
            if (!url.includes("/api/analytics/")) {
              tracker.lastNetworkCallTime = Date.now();
            }
          } catch {
            // ignore
          }
          return originalFetch.apply(window, args);
        };

        try {
          window.fetch = wrappedFetch;
        } catch {
          try {
            Object.defineProperty(window, "fetch", {
              value: wrappedFetch,
              writable: true,
              configurable: true,
            });
          } catch {
            // Read-only / getter-only in sandboxed environment - silently skip
          }
        }
      }
    } catch {
      // Safe fallback
    }

    // Also track XMLHttpRequest if available
    try {
      if (typeof window !== "undefined" && window.XMLHttpRequest && window.XMLHttpRequest.prototype) {
        const originalOpen = window.XMLHttpRequest.prototype.open;
        const tracker = this;
        window.XMLHttpRequest.prototype.open = function (method, url, ...rest) {
          try {
            if (typeof url === "string" && !url.includes("/api/analytics/")) {
              tracker.lastNetworkCallTime = Date.now();
            }
          } catch {
            // ignore
          }
          return originalOpen.apply(this, [method, url, ...rest]);
        };
      }
    } catch {
      // Safe fallback
    }
  }

  setupLifecycleListeners() {
    if (typeof window === "undefined") return;
    this.beforeUnloadHandler = () => {
      this.handleScreenExit(this.currentRoute);
      this.handleTabCloseFunnels();
      this.flushQueueSync();
    };
    window.addEventListener("beforeunload", this.beforeUnloadHandler);
  }

  cleanup() {
    if (typeof window === "undefined") return;

    if (this.clickHandler) {
      document.removeEventListener("click", this.clickHandler, true);
      this.clickHandler = null;
    }

    if (this.beforeUnloadHandler) {
      window.removeEventListener("beforeunload", this.beforeUnloadHandler);
      this.beforeUnloadHandler = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }

    if (this.mutationDisconnectTimeout) {
      clearTimeout(this.mutationDisconnectTimeout);
      this.mutationDisconnectTimeout = null;
    }

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    this.clickHistory = [];
    this.isInitialized = false;
  }

  /**
   * Called on route transition
   */
  handleRouteChange(newRoute) {
    if (!newRoute || newRoute === this.currentRoute) return;

    const previousRoute = this.currentRoute;
    const durationSec = Math.round((Date.now() - this.routeEntryTime) / 1000);

    // Track Screen Duration on leave
    this.recordEvent({
      category: "SCREEN_DURATION",
      action: "PAGE_LEAVE",
      route: previousRoute,
      durationSeconds: durationSec,
      metadata: {
        toRoute: newRoute,
        formattedDuration: `${durationSec}s`,
      },
    });

    // Check if exiting a funnel route without completion
    this.checkRouteBasedFunnelAbandonment(previousRoute, newRoute);

    // Track Screen View on enter
    this.currentRoute = newRoute;
    this.routeEntryTime = Date.now();
    this.lastLocationChangeTime = Date.now();

    this.recordEvent({
      category: "NAVIGATION",
      action: "PAGE_VIEW",
      route: newRoute,
      metadata: {
        fromRoute: previousRoute,
      },
    });

    // Auto-detect funnel entries
    if (newRoute.includes("/deposit")) {
      this.startFunnel("Deposit", "view_deposit_page");
    } else if (newRoute.includes("/kyc")) {
      this.startFunnel("KYC", "view_kyc_page");
    } else if (newRoute.includes("/investments")) {
      this.startFunnel("Investment", "view_plans_catalog");
    }
  }

  handleScreenExit(route) {
    const durationSec = Math.round((Date.now() - this.routeEntryTime) / 1000);
    this.recordEvent({
      category: "SCREEN_DURATION",
      action: "PAGE_LEAVE",
      route,
      durationSeconds: durationSec,
      metadata: {
        reason: "window_unload",
      },
    });
  }

  // --- FUNNEL TRACKING API ---

  startFunnel(funnelName, initialStep = "start", metadata = {}) {
    const funnelKey = funnelName.toLowerCase();
    const existing = this.activeFunnels.get(funnelKey);
    if (existing && existing.currentStep === initialStep) return;

    const funnelData = {
      funnelName,
      funnelKey,
      startTime: Date.now(),
      currentStep: initialStep,
      stepsCompleted: [initialStep],
      metadata: maskSensitiveData(metadata),
    };

    this.activeFunnels.set(funnelKey, funnelData);

    this.recordEvent({
      category: "FUNNEL",
      action: "FUNNEL_START",
      funnelName,
      step: initialStep,
      route: this.currentRoute,
      metadata: funnelData.metadata,
    });
  }

  stepFunnel(funnelName, stepName, metadata = {}) {
    const funnelKey = funnelName.toLowerCase();
    const existing = this.activeFunnels.get(funnelKey);
    if (!existing) {
      this.startFunnel(funnelName, stepName, metadata);
      return;
    }

    existing.currentStep = stepName;
    if (!existing.stepsCompleted.includes(stepName)) {
      existing.stepsCompleted.push(stepName);
    }
    existing.metadata = { ...existing.metadata, ...maskSensitiveData(metadata) };

    this.recordEvent({
      category: "FUNNEL",
      action: "FUNNEL_STEP",
      funnelName,
      step: stepName,
      route: this.currentRoute,
      metadata: existing.metadata,
    });
  }

  completeFunnel(funnelName, metadata = {}) {
    const funnelKey = funnelName.toLowerCase();
    const existing = this.activeFunnels.get(funnelKey);
    const durationSec = existing ? Math.round((Date.now() - existing.startTime) / 1000) : 0;

    this.recordEvent({
      category: "FUNNEL",
      action: "FUNNEL_COMPLETE",
      funnelName,
      step: "completed",
      durationSeconds: durationSec,
      route: this.currentRoute,
      metadata: {
        ...(existing?.metadata || {}),
        ...maskSensitiveData(metadata),
        totalSteps: existing ? existing.stepsCompleted.length : 1,
      },
    });

    this.activeFunnels.delete(funnelKey);
  }

  abandonFunnel(funnelName, reason = "user_navigated_away", metadata = {}) {
    const funnelKey = funnelName.toLowerCase();
    const existing = this.activeFunnels.get(funnelKey);
    if (!existing) return;

    const durationSec = Math.round((Date.now() - existing.startTime) / 1000);

    this.recordEvent({
      category: "FUNNEL",
      action: "FUNNEL_ABANDON",
      funnelName,
      step: existing.currentStep,
      durationSeconds: durationSec,
      route: this.currentRoute,
      metadata: {
        ...existing.metadata,
        ...maskSensitiveData(metadata),
        abandonReason: reason,
        lastCompletedStep: existing.currentStep,
      },
    });

    this.activeFunnels.delete(funnelKey);
  }

  checkRouteBasedFunnelAbandonment(fromRoute, toRoute) {
    if (fromRoute.includes("/deposit") && !toRoute.includes("/deposit")) {
      this.abandonFunnel("Deposit", "navigated_away_from_deposit_page");
    }
    if (fromRoute.includes("/kyc") && !toRoute.includes("/kyc")) {
      this.abandonFunnel("KYC", "navigated_away_from_kyc_page");
    }
  }

  handleTabCloseFunnels() {
    for (const [key, funnel] of this.activeFunnels.entries()) {
      this.abandonFunnel(funnel.funnelName, "browser_closed_or_reloaded");
    }
  }

  // --- FRICTION & EVENT RECORDING ---

  trackFrictionEvent({ type, element, elementText, clickCount, coordinates, route, metadata }) {
    this.recordEvent({
      category: "UX_FRICTION",
      action: type, // 'RAGE_CLICK' | 'DEAD_CLICK'
      element: maskSensitiveData(element),
      elementText: maskSensitiveData(elementText),
      clickCount: clickCount || 1,
      coordinates: coordinates || null,
      route: sanitizeUrl(route || this.currentRoute),
      metadata: maskSensitiveData(metadata || {}),
    });
  }

  recordEvent(event) {
    try {
      const payload = {
        id: "evt_" + Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
        timestamp: new Date().toISOString(),
        user: { ...this.userContext },
        route: sanitizeUrl(event.route || this.currentRoute),
        category: event.category || "GENERAL",
        action: event.action,
        element: event.element || null,
        elementText: event.elementText || null,
        funnelName: event.funnelName || null,
        step: event.step || null,
        durationSeconds: event.durationSeconds || null,
        clickCount: event.clickCount || null,
        coordinates: event.coordinates || null,
        metadata: maskSensitiveData(event.metadata || {}),
      };

      this.saveEventToStorage(payload);
      this.eventQueue.push(payload);
      this.scheduleFlush();

      return payload;
    } catch (err) {
      console.warn("[BehaviourTracker] Failed to record event:", err);
      return null;
    }
  }

  saveEventToStorage(event) {
    if (typeof window === "undefined") return;
    try {
      const stored = this.getStoredEvents();
      stored.unshift(event);
      const trimmed = stored.slice(0, MAX_LOCAL_EVENTS);
      localStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      // Storage restricted
    }
  }

  getStoredEvents() {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(EVENTS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  seedInitialAnalyticsDataIfEmpty() {
    const stored = this.getStoredEvents();
    if (stored.length === 0) {
      const sampleEvents = [
        {
          id: "evt_sample_1",
          timestamp: new Date(Date.now() - 22 * 60000).toISOString(),
          user: { id: "u_demo_1", email: "alice@easyx.io", role: "user" },
          route: "/deposit",
          category: "FUNNEL",
          action: "FUNNEL_COMPLETE",
          funnelName: "Deposit",
          step: "completed",
          durationSeconds: 48,
          metadata: { network: "TRC20", amount: "500.00" },
        },
        {
          id: "evt_sample_2",
          timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
          user: { id: "u_demo_2", email: "bob@easyx.io", role: "user" },
          route: "/kyc",
          category: "FUNNEL",
          action: "FUNNEL_COMPLETE",
          funnelName: "KYC",
          step: "completed",
          durationSeconds: 112,
          metadata: { documentType: "PASSPORT" },
        },
        {
          id: "evt_sample_3",
          timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
          user: { id: "u_demo_3", email: "carol@easyx.io", role: "user" },
          route: "/deposit",
          category: "FUNNEL",
          action: "FUNNEL_ABANDON",
          funnelName: "Deposit",
          step: "awaiting_wallet_confirmation",
          durationSeconds: 32,
          metadata: { abandonReason: "navigated_away_from_deposit_page" },
        },
        {
          id: "evt_sample_4",
          timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
          user: { id: "u_demo_4", email: "david@easyx.io", role: "user" },
          route: "/investments",
          category: "UX_FRICTION",
          action: "DEAD_CLICK",
          element: "button[data-testid='filter-closed-plans']",
          elementText: "Closed Plans",
          coordinates: { x: 420, y: 210 },
          metadata: { note: "No route change or state change observed" },
        },
        {
          id: "evt_sample_5",
          timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
          user: { id: "u_demo_5", email: "eva@easyx.io", role: "user" },
          route: "/wallet",
          category: "UX_FRICTION",
          action: "RAGE_CLICK",
          element: "button#refresh-balance-btn",
          elementText: "Refresh Balance",
          clickCount: 4,
          coordinates: { x: 815, y: 140 },
          metadata: { durationMs: 640 },
        },
      ];
      sampleEvents.forEach((evt) => this.saveEventToStorage(evt));
    }
  }

  scheduleFlush() {
    if (this.flushTimeout) return;
    this.flushTimeout = setTimeout(() => {
      this.flushQueue();
    }, 2500);
  }

  async flushQueue() {
    this.flushTimeout = null;
    if (!this.eventQueue.length) return;

    const batch = [...this.eventQueue];
    this.eventQueue = [];

    try {
      if (typeof window !== "undefined") {
        fetch("/api/analytics/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events: batch }),
        }).catch(() => {
          // ignore
        });
      }
    } catch {
      // ignore
    }
  }

  flushQueueSync() {
    if (!this.eventQueue.length || typeof navigator === "undefined" || !navigator.sendBeacon) return;
    try {
      const batch = JSON.stringify({ events: this.eventQueue });
      navigator.sendBeacon("/api/analytics/events", batch);
      this.eventQueue = [];
    } catch {
      // ignore
    }
  }

  clearLocalEvents() {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(EVENTS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

export const behaviourTracker = new BehaviourTracker();
export default behaviourTracker;
