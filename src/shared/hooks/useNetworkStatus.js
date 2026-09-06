import { useState, useEffect, useCallback, useRef } from "react";

// Global singleton state so multiple hooks share identical synchronized status
let globalOnlineState = typeof navigator !== "undefined" ? navigator.onLine : true;
let globalWasOffline = false;
let globalShowRestored = false;
let restoredTimer = null;
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach((callback) => {
    try {
      callback({
        isOnline: globalOnlineState,
        isOffline: !globalOnlineState,
        showRestored: globalShowRestored,
      });
    } catch {
      // ignore subscriber errors
    }
  });
}

export function setNetworkOffline() {
  if (globalOnlineState) {
    globalOnlineState = false;
    globalWasOffline = true;
    globalShowRestored = false;
    if (restoredTimer) {
      clearTimeout(restoredTimer);
      restoredTimer = null;
    }
    notifySubscribers();
  }
}

export function setNetworkOnline() {
  if (!globalOnlineState) {
    globalOnlineState = true;
    if (globalWasOffline) {
      globalShowRestored = true;
      if (restoredTimer) clearTimeout(restoredTimer);
      restoredTimer = setTimeout(() => {
        globalShowRestored = false;
        globalWasOffline = false;
        notifySubscribers();
      }, 4000);
    }
    notifySubscribers();
  }
}

export function dismissRestoredBanner() {
  globalShowRestored = false;
  globalWasOffline = false;
  if (restoredTimer) {
    clearTimeout(restoredTimer);
    restoredTimer = null;
  }
  notifySubscribers();
}

/**
 * useNetworkStatus Hook
 * Provides reactive online/offline detection with clean transition alerts.
 */
export function useNetworkStatus() {
  const [status, setStatus] = useState({
    isOnline: globalOnlineState,
    isOffline: !globalOnlineState,
    showRestored: globalShowRestored,
  });
  const [isChecking, setIsChecking] = useState(false);
  const checkingRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setNetworkOnline();
    };

    const handleOffline = () => {
      setNetworkOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const unsubscribe = () => {
      subscribers.delete(setStatus);
    };
    subscribers.add(setStatus);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      unsubscribe();
    };
  }, []);

  /**
   * Active connectivity verification:
   * Tests whether the backend API server is truly reachable.
   */
  const checkConnection = useCallback(async () => {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setIsChecking(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        setNetworkOnline();
        return true;
      } else {
        // Backend returned non-200 (e.g. 500/503), but browser network layer is functional
        if (typeof navigator !== "undefined" && navigator.onLine) {
          // Browser is online, server has an issue
          return false;
        } else {
          setNetworkOffline();
          return false;
        }
      }
    } catch {
      // Abort or network failure
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setNetworkOffline();
      }
      return false;
    } finally {
      checkingRef.current = false;
      setIsChecking(false);
    }
  }, []);

  return {
    isOnline: status.isOnline,
    isOffline: status.isOffline,
    showRestored: status.showRestored,
    isChecking,
    checkConnection,
    dismissRestored: dismissRestoredBanner,
  };
}

export default useNetworkStatus;
