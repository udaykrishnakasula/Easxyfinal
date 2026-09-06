import posthog from "posthog-js";

let isInitialized = false;

/**
 * Initializes PostHog analytics if VITE_POSTHOG_KEY environment variable is present.
 * Provides safe fallback stubs if PostHog is disabled, unconfigured, or blocked by privacy extensions.
 */
export function initPostHog() {
  if (typeof window === "undefined" || isInitialized) {
    return;
  }

  const apiKey = import.meta.env.VITE_POSTHOG_KEY;
  const apiHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!apiKey) {
    // In development or when no PostHog API key is set, keep silent safe fallback
    return;
  }

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: true,
      capture_pageview: false, // Managed manually via React Router in AnalyticsProvider
      capture_pageleave: true,
      persistence: "localStorage+cookie",
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskInputOptions: {
          password: true,
          email: true,
        },
      },
      loaded: (ph) => {
        if (import.meta.env.DEV) {
          ph.debug(false);
        }
      },
    });
    isInitialized = true;
  } catch (err) {
    console.warn("PostHog initialization skipped or failed:", err);
  }
}

/**
 * Identify user with PostHog
 */
export function identifyUserInPostHog(user) {
  if (!isInitialized || !user?.id) return;
  try {
    posthog.identify(String(user.id), {
      email: user.email,
      name: user.name,
      role: user.role,
      kyc_status: user.kyc_status,
      created_at: user.created_at,
    });
  } catch {
    // Safe fallback
  }
}

/**
 * Reset PostHog session on logout
 */
export function resetPostHogSession() {
  if (!isInitialized) return;
  try {
    posthog.reset();
  } catch {
    // Safe fallback
  }
}

/**
 * Track custom event with PostHog
 */
export function capturePostHogEvent(eventName, properties = {}) {
  if (!isInitialized) return;
  try {
    posthog.capture(eventName, properties);
  } catch {
    // Safe fallback
  }
}

/**
 * Track pageview in PostHog
 */
export function capturePostHogPageView(pathname) {
  if (!isInitialized) return;
  try {
    posthog.capture("$pageview", {
      $current_url: window.location.href,
      pathname,
    });
  } catch {
    // Safe fallback
  }
}

export default posthog;
