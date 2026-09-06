import React, { createContext, useContext, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";
import errorTracker from "./errorTracker";
import behaviourTracker from "./behaviourTracker";
import monitoringClient from "./monitoringService";
import {
  initPostHog,
  identifyUserInPostHog,
  resetPostHogSession,
  capturePostHogEvent,
  capturePostHogPageView,
} from "./posthog";
import api from "@/shared/lib/api";

const AnalyticsContext = createContext(null);

export function AnalyticsProvider({ children }) {
  const location = useLocation();
  const auth = useAuth();
  const user = auth?.user;

  // 1. Initialize Error, Behaviour Trackers, and PostHog once on mount
  useEffect(() => {
    errorTracker.init();
    behaviourTracker.init();
    initPostHog();

    // Hook into axios interceptor for API errors and attach correlation id
    const requestInterceptor = api.interceptors.request.use((config) => {
      try {
        if (!config.headers["X-Correlation-Id"] && !config.headers["x-correlation-id"]) {
          config.headers["X-Correlation-Id"] = monitoringClient.generateCorrelationId();
        }
      } catch {
        // ignore
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      (error) => {
        try {
          errorTracker.captureApiError(error);
          monitoringClient.trackActionFailure({
            page: window.location.pathname,
            action: error?.config?.url || "API_REQUEST",
            error: error?.response?.data?.detail || error?.message || "API request failed",
            http_status: error?.response?.status || 500,
            metadata: {
              url: error?.config?.url,
              method: error?.config?.method,
            },
          });
        } catch {
          // ignore tracking error
        }
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
      behaviourTracker.cleanup();
    };
  }, []);

  // 2. Sync active user context whenever Auth state changes
  useEffect(() => {
    errorTracker.setUserContext(user);
    behaviourTracker.setUserContext(user);
    monitoringClient.setUser(user);
    if (user) {
      identifyUserInPostHog(user);
    } else {
      resetPostHogSession();
    }
  }, [user]);

  // 3. Track route changes and screen view durations
  useEffect(() => {
    if (location?.pathname) {
      behaviourTracker.handleRouteChange(location.pathname);
      monitoringClient.trackPageView(location.pathname);
      capturePostHogPageView(location.pathname);
    }
  }, [location.pathname]);

  const value = useMemo(
    () => ({
      trackActivity: (params) => monitoringClient.trackUserActivity(params),
      trackActionFailure: (params) => monitoringClient.trackActionFailure(params),
      trackEvent: (category, action, data) => {
        behaviourTracker.recordEvent({ category, action, metadata: data });
        monitoringClient.trackUserActivity({ event_category: category, action, metadata: data });
        capturePostHogEvent(`${category}:${action}`, data);
      },
      trackFriction: (type, element, text, meta) => {
        behaviourTracker.trackFrictionEvent({
          type,
          element,
          elementText: text,
          metadata: meta,
        });
        monitoringClient.trackUserActivity({
          event_category: "UX_FRICTION",
          action: type,
          element,
          element_text: text,
          metadata: meta,
        });
        capturePostHogEvent(`friction:${type}`, { element, elementText: text, ...meta });
      },
      startFunnel: (name, step, meta) => {
        behaviourTracker.startFunnel(name, step, meta);
        monitoringClient.trackFunnelStep(name, step, meta);
        capturePostHogEvent(`funnel_started:${name}`, { step, ...meta });
      },
      stepFunnel: (name, step, meta) => {
        behaviourTracker.stepFunnel(name, step, meta);
        monitoringClient.trackFunnelStep(name, step, meta);
        capturePostHogEvent(`funnel_step:${name}`, { step, ...meta });
      },
      completeFunnel: (name, meta) => {
        behaviourTracker.completeFunnel(name, meta);
        monitoringClient.trackFunnelStep(name, "completed", meta);
        capturePostHogEvent(`funnel_completed:${name}`, meta);
      },
      abandonFunnel: (name, reason, meta) => {
        behaviourTracker.abandonFunnel(name, reason, meta);
        monitoringClient.trackUserActivity({
          event_category: name.toUpperCase(),
          action: "FUNNEL_ABANDONED",
          funnel_name: name,
          metadata: { abandonReason: reason, ...meta },
        });
        capturePostHogEvent(`funnel_abandoned:${name}`, { reason, ...meta });
      },
      captureError: (err, meta) => {
        errorTracker.captureError({ ...meta, message: err?.message || String(err) });
        monitoringClient.trackError({
          error_name: err?.name || "Error",
          message: err?.message || String(err),
          stack: err?.stack || null,
          metadata: meta,
        });
        capturePostHogEvent("$exception", {
          $exception_message: err?.message || String(err),
          $exception_type: err?.name || "Error",
          ...meta,
        });
      },
      getStoredErrors: () => errorTracker.getStoredErrors(),
      getStoredEvents: () => behaviourTracker.getStoredEvents(),
      clearErrors: () => errorTracker.clearLocalErrors(),
      clearEvents: () => behaviourTracker.clearLocalEvents(),
    }),
    []
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Fallback safe stubs if accessed outside provider
    return {
      trackEvent: () => {},
      trackFriction: () => {},
      startFunnel: () => {},
      stepFunnel: () => {},
      completeFunnel: () => {},
      abandonFunnel: () => {},
      captureError: () => {},
      getStoredErrors: () => [],
      getStoredEvents: () => [],
      clearErrors: () => {},
      clearEvents: () => {},
    };
  }
  return context;
}

export default AnalyticsProvider;
