/**
 * EasyX Privacy & Data Masking Engine
 * Automatically redacts sensitive fields (passwords, bank accounts, KYC numbers, auth tokens, cards)
 * before storing or transmitting analytics events and error reports.
 */

const SENSITIVE_KEY_PATTERNS = [
  /pass(word)?/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /jwt/i,
  /bearer/i,
  /pin/i,
  /cvv|cvc|security_code/i,
  /card_?number|credit_?card|pan/i,
  /bank_?acc(ount)?|account_?number|iban|routing/i,
  /ssn|tax_?id|national_?id|passport|id_?number/i,
  /private_?key|seed_?phrase|mnemonic/i,
];

// Regex for patterns in text/strings
const CARD_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
const BEARER_REGEX = /Bearer\s+[a-zA-Z0-9._\-]+/gi;
const EMAIL_REGEX = /([a-zA-Z0-9._%+-]{1,3})[a-zA-Z0-9._%+-]*@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const PHONE_REGEX = /\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;

/**
 * Checks whether an object key or property name is deemed sensitive
 */
export function isSensitiveKey(key) {
  if (!key || typeof key !== "string") return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Masks raw strings that might contain emails, tokens, cards, or phones
 */
export function maskSensitiveString(str, aggressive = false) {
  if (typeof str !== "string") return str;

  // Mask base64 data URIs and binary image blobs
  if (str.startsWith("data:image/") || str.startsWith("data:application/pdf")) {
    return `[FILE_PAYLOAD_REDACTED_${Math.round(str.length / 1024)}KB]`;
  }

  let result = str;

  // Mask JWTs
  result = result.replace(JWT_REGEX, "[REDACTED_JWT_TOKEN]");

  // Mask Authorization Bearer headers
  result = result.replace(BEARER_REGEX, "Bearer [REDACTED_TOKEN]");

  // Mask Credit/Debit Cards
  result = result.replace(CARD_REGEX, (match) => {
    const clean = match.replace(/[\s-]/g, "");
    if (clean.length >= 13 && clean.length <= 19) {
      return `****-****-****-${clean.slice(-4)}`;
    }
    return match;
  });

  if (aggressive) {
    // Partially mask emails (e.g. j***@domain.com)
    result = result.replace(EMAIL_REGEX, "$1***@$2");
    // Partially mask phone numbers
    result = result.replace(PHONE_REGEX, "***-***-****");
  }

  return result;
}

/**
 * Deeply sanitizes any payload (objects, arrays, strings)
 */
export function maskSensitiveData(data, depth = 0, seen = new WeakSet()) {
  if (depth > 8) return "[MAX_DEPTH_REACHED]";
  if (data === null || data === undefined) return data;

  // Primitives
  if (typeof data === "string") {
    return maskSensitiveString(data);
  }
  if (typeof data === "number" || typeof data === "boolean") {
    return data;
  }
  if (typeof data === "function") {
    return `[Function: ${data.name || "anonymous"}]`;
  }

  // Handle DOM elements and Nodes safely (e.g. HTMLImageElement, HTMLDivElement, etc.)
  if (typeof Element !== "undefined" && data instanceof Element) {
    const tag = data.tagName ? data.tagName.toLowerCase() : "element";
    const id = data.id ? `#${data.id}` : "";
    const className = typeof data.className === "string" && data.className.trim() ? `.${data.className.trim().split(/\s+/)?.[0] || ""}` : "";
    return `[DOM_ELEMENT: <${tag}${id}${className}>]`;
  }
  if (typeof Node !== "undefined" && data instanceof Node) {
    return "[DOM_NODE]";
  }
  if (typeof Window !== "undefined" && (data === window || data instanceof Window)) {
    return "[WINDOW]";
  }
  if (typeof Document !== "undefined" && (data === document || data instanceof Document)) {
    return "[DOCUMENT]";
  }
  if (typeof Event !== "undefined" && data instanceof Event) {
    return {
      type: data.type,
      target: data.target && data.target.tagName ? `<${data.target.tagName.toLowerCase()}>` : "[EventTarget]",
    };
  }

  // Handle React Fiber nodes
  if (typeof data === "object") {
    if (data.stateNode !== undefined && data.memoizedState !== undefined) {
      return "[REACT_FIBER_NODE]";
    }

    // Handle circular references
    if (seen.has(data)) return "[CIRCULAR_REFERENCE]";
    seen.add(data);

    if (Array.isArray(data)) {
      return data.map((item) => maskSensitiveData(item, depth + 1, seen));
    }

    if (data instanceof Error) {
      return {
        name: data.name,
        message: maskSensitiveString(data.message),
        stack: maskSensitiveString(data.stack || ""),
      };
    }

    const sanitizedObj = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip React internals
      if (typeof key === "string" && (key.startsWith("__react") || key.startsWith("$$typeof") || key.startsWith("_owner"))) {
        continue;
      }
      if (isSensitiveKey(key)) {
        sanitizedObj[key] = "[REDACTED_SENSITIVE_FIELD]";
      } else {
        sanitizedObj[key] = maskSensitiveData(value, depth + 1, seen);
      }
    }
    return sanitizedObj;
  }

  return "[UNSUPPORTED_DATA_TYPE]";
}

/**
 * Ultra-safe JSON serializer that never throws on circular structures, DOM elements, or React fibers
 */
export function safeJsonStringify(value, space = null) {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        // Skip React internal properties
        if (typeof key === "string" && (key.startsWith("__react") || key.startsWith("$$typeof") || key.startsWith("_owner"))) {
          return undefined;
        }
        // Handle DOM elements
        if (typeof Element !== "undefined" && val instanceof Element) {
          const tag = val.tagName ? val.tagName.toLowerCase() : "element";
          const id = val.id ? `#${val.id}` : "";
          return `[DOM_ELEMENT: <${tag}${id}>]`;
        }
        if (typeof Node !== "undefined" && val instanceof Node) {
          return "[DOM_NODE]";
        }
        if (typeof Event !== "undefined" && val instanceof Event) {
          return `[EVENT: ${val.type}]`;
        }
        if (typeof Window !== "undefined" && (val === window || val instanceof Window)) {
          return "[WINDOW]";
        }
        if (typeof Document !== "undefined" && (val === document || val instanceof Document)) {
          return "[DOCUMENT]";
        }
        // Circular reference detection
        if (typeof val === "object" && val !== null) {
          if (seen.has(val)) {
            return "[CIRCULAR]";
          }
          seen.add(val);
        }
        return val;
      },
      space
    );
  } catch {
    try {
      return String(value);
    } catch {
      return "[UNSERIALIZABLE]";
    }
  }
}

/**
 * Sanitizes URLs to remove sensitive search query params
 */
export function sanitizeUrl(url) {
  if (!url || typeof url !== "string") return "";
  try {
    const parsed = new URL(url, window.location.origin);
    const params = new URLSearchParams(parsed.search);
    for (const key of Array.from(params.keys())) {
      if (isSensitiveKey(key)) {
        params.set(key, "[REDACTED]");
      }
    }
    parsed.search = params.toString();
    return parsed.pathname + (parsed.search ? parsed.search : "");
  } catch {
    return maskSensitiveString(url);
  }
}
