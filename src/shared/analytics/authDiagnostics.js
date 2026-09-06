/**
 * EasyX Authentication & Session Diagnostics
 * Safely tracks authentication transitions and session lifecycle events.
 * 
 * Strict Privacy Rules:
 * - NEVER log passwords, plain JWT tokens, refresh tokens, access credentials,
 *   Aadhaar numbers, or financial account details.
 */

const MAX_HISTORY = 50;
const authHistory = [];

export const AUTH_TRANSITION = {
  AUTH_INITIALIZING: "AUTH_INITIALIZING",
  AUTHENTICATED: "AUTHENTICATED",
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  SESSION_REFRESH: "SESSION_REFRESH",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  AUTH_ERROR: "AUTH_ERROR",
  LOGOUT: "LOGOUT",
};

/**
 * Strips any sensitive fields before recording or logging
 */
function sanitizeMeta(meta = {}) {
  const sanitized = { ...meta };
  const sensitiveKeys = [
    "password",
    "pass",
    "token",
    "access_token",
    "refresh_token",
    "secret",
    "key",
    "private_key",
    "aadhaar",
    "pan",
    "document",
    "cookie",
  ];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((s) => lowerKey.includes(s))) {
      delete sanitized[key];
    }
  }

  return sanitized;
}

export const authDiagnostics = {
  /**
   * Records an auth transition event
   * @param {string} transition One of AUTH_TRANSITION
   * @param {object} meta Non-sensitive context (e.g., userId, role, status code, route)
   */
  logTransition(transition, meta = {}) {
    const event = {
      transition,
      timestamp: new Date().toISOString(),
      route: typeof window !== "undefined" ? window.location.pathname : "/",
      meta: sanitizeMeta(meta),
    };

    authHistory.push(event);
    if (authHistory.length > MAX_HISTORY) {
      authHistory.shift();
    }

    if (process.env.NODE_ENV !== "production") {
      // Safe development diagnostic log
      console.log(`[EasyX AuthDiagnostics] [${event.timestamp}] ${transition}`, event.meta);
    }

    return event;
  },

  /**
   * Retrieves the recent history of auth transitions for diagnostics
   */
  getHistory() {
    return [...authHistory];
  },

  /**
   * Gets the last known transition
   */
  getLastTransition() {
    return authHistory[authHistory.length - 1] || null;
  },
};

export default authDiagnostics;
