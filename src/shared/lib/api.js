import axios from "axios";
import errorTracker from "@/shared/analytics/errorTracker";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // In browser: if import.meta.env or window env is set use it, otherwise empty string so /api is relative to current origin
    const envUrl =
      (typeof import.meta !== "undefined" &&
        import.meta.env &&
        (import.meta.env.VITE_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL)) ||
      (typeof process !== "undefined" &&
        process.env &&
        (process.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL));
    return envUrl ? String(envUrl).replace(/\/+$/, "") : "";
  }
  return "";
};

const BASE = getBaseUrl();

export const TOKEN_KEY = "easyx_token";
const LEGACY_TOKEN_KEY = "token";

/**
 * Validates whether a given string is a syntactically valid JWT token (3 dot-separated base64 segments)
 */
function isValidJwtFormat(token) {
  if (!token || typeof token !== "string") return false;
  const clean = token.trim();
  if (clean === "undefined" || clean === "null" || clean === "[object Object]" || clean === "") return false;
  const parts = clean.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

function sanitizeTokenString(raw) {
  if (!raw || typeof raw !== "string") return null;
  let clean = raw.trim();
  if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
    clean = clean.slice(1, -1).trim();
  }
  if (clean.startsWith("Bearer ")) {
    clean = clean.slice(7).trim();
  }
  return clean;
}

export const getToken = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    let t = localStorage.getItem(TOKEN_KEY);
    if (!t) {
      t = localStorage.getItem(LEGACY_TOKEN_KEY);
    }
    const clean = sanitizeTokenString(t);
    if (!clean || !isValidJwtFormat(clean)) {
      if (t) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(LEGACY_TOKEN_KEY);
      }
      return null;
    }
    return clean;
  } catch {
    return null;
  }
};

export const setToken = (t) => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    const clean = sanitizeTokenString(t);
    if (!clean || !isValidJwtFormat(clean)) {
      clearToken();
      return;
    }
    localStorage.setItem(TOKEN_KEY, clean);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // ignore storage exceptions
  }
};

export const clearToken = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
  } catch {
    // ignore storage exceptions
  }
};

/**
 * Standard API instance with reasonable default timeout (15s)
 * Custom timeouts can be provided per request (e.g. 60s for file uploads).
 */
export const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 45000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // If request data is FormData (multipart uploads), delete static Content-Type
  // so Axios / Browser sets the correct multipart/form-data boundary header
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers["Content-Type"];
      delete config.headers["content-type"];
    }
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;

    // Log to EasyX Error Tracking & Monitoring Service (with automatic privacy masking)
    try {
      if (errorTracker && typeof errorTracker.captureApiError === "function") {
        errorTracker.captureApiError(error);
      }
    } catch {
      // ignore tracker recording errors
    }

    if (status === 401) {
      const url = error?.config?.url || "";
      // Only clear token if the dedicated session verification endpoint confirms token rejection
      if (url.includes("/auth/me") || url.includes("/auth/refresh")) {
        clearToken();
      }
    }

    return Promise.reject(error);
  },
);

/**
 * Patterns indicating sensitive backend tracebacks or internal database structures
 */
const SENSITIVE_ERROR_PATTERNS = [
  /traceback/i,
  /\bat\s+[a-zA-Z0-9_$.]+\s+\(/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE)\b.*\b(TABLE|RELATION|COLUMN)\b/i,
  /relation\s+["'].*["']\s+does not exist/i,
  /syntax error at or near/i,
  /password_hash|jwt_secret|api_key|private_key/i,
  /node_modules/i,
  /server\.ts:\d+/i,
];

function isSensitiveErrorMessage(msg) {
  if (!msg || typeof msg !== "string") return false;
  return SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(msg));
}

/**
 * Helpers to identify specific categories of network and server failures
 */
export const isOffline = () => typeof navigator !== "undefined" && !navigator.onLine;

export const isTimeoutError = (error) =>
  error?.code === "ECONNABORTED" ||
  error?.message?.toLowerCase()?.includes("timeout") ||
  error?.message?.toLowerCase()?.includes("taking too long");

export const isNetworkError = (error) =>
  !error?.response &&
  (error?.code === "ERR_NETWORK" ||
    error?.message === "Network Error" ||
    error?.message?.toLowerCase()?.includes("network") ||
    !error?.status);

export const isServerError = (error) => {
  const status = error?.response?.status;
  return status >= 500 && status <= 599;
};

/**
 * Normalizes API and Network errors to clear, safe, user-friendly feedback strings.
 * Never exposes stack traces, SQL errors, secrets, or internal paths.
 */
export const apiError = (error, fallback = "Something went wrong. Please try again.", options = {}) => {
  // 1. Check if user's device is currently offline
  if (isOffline()) {
    return "No internet connection. Please check your connection and try again.";
  }

  // 2. Check for request timeout
  if (isTimeoutError(error)) {
    return "The request is taking too long. Please check your connection and try again.";
  }

  const status = error?.response?.status;

  // 3. Upload-specific context handling
  if (options?.isUpload) {
    if (!status || status >= 500) {
      return "Upload failed. Please check your connection and try again.";
    }
  }

  // 4. Financial-specific context handling
  if (options?.isFinancial) {
    if (!status || status >= 500) {
      return "Unable to complete the request. Please check your connection and verify the transaction status before trying again.";
    }
  }

  // 5. Check for general network failure / server unreachable without response
  if (isNetworkError(error)) {
    if (isOffline()) {
      return "No internet connection. Please check your connection and try again.";
    }
    return "Service temporarily unavailable. Please try again shortly.";
  }

  // 6. HTTP 502 / 503 / 504 (Gateway / Service Unavailable)
  if (status === 502 || status === 503 || status === 504) {
    return "Service temporarily unavailable. Please try again shortly.";
  }

  // 7. HTTP 500 (Internal Server Error)
  if (status === 500) {
    const detail = error?.response?.data?.detail;
    if (typeof detail === "string" && !isSensitiveErrorMessage(detail) && detail.length < 150) {
      return detail;
    }
    return "Something went wrong. Please try again.";
  }

  // 8. Normal 4xx client errors (400, 401, 403, 404, 409, 422, 429)
  const data = error?.response?.data;
  const detail = data?.detail || data?.message || (typeof data?.error === "string" && data.error !== "validation_error" ? data.error : null);
  if (typeof detail === "string") {
    if (isSensitiveErrorMessage(detail)) {
      return fallback;
    }
    return detail;
  }
  if (data?.detail && typeof data.detail === "object" && !Array.isArray(data.detail) && data.detail.message) {
    if (typeof data.detail.message === "string" && !isSensitiveErrorMessage(data.detail.message)) {
      return data.detail.message;
    }
    return fallback;
  }
  if (Array.isArray(data?.detail) && data.detail.length) {
    const firstMsg = data.detail[0]?.msg || data.detail[0]?.message;
    if (typeof firstMsg === "string" && !isSensitiveErrorMessage(firstMsg)) {
      return firstMsg;
    }
    return fallback;
  }

  return fallback;
};

export default api;
