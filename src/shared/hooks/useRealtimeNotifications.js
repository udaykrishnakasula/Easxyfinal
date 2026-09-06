import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { getToken } from "@/shared/lib/api";
import { useAuth } from "@/shared/context/AuthContext";

/**
 * Custom React hook for live Server-Sent Events (SSE) notification streaming.
 * Handles auto-reconnection, duplicate protection, tab visibility recovery,
 * unread count synchronization, and real-time toast alerts.
 */
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const eventSourceRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const retryCountRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!user || !user.id) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const token = getToken();
    if (!token) return;

    function connectSSE() {
      // Clean up any existing connection
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (!isMountedRef.current) return;

      const currentToken = getToken();
      if (!currentToken) return;

      const streamUrl = `/api/notifications/stream?token=${encodeURIComponent(currentToken)}`;
      const es = new EventSource(streamUrl);
      eventSourceRef.current = es;

      es.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          retryCountRef.current = 0; // Reset retry backoff on successful connection
          
          if (typeof data.unreadCount === "number") {
            queryClient.setQueryData(["notifications-unread-count"], data.unreadCount);
          }
        } catch (err) {
          console.warn("[RealtimeNotifications] Error parsing connected event:", err);
        }
      });

      // User notification created event
      es.addEventListener("notification.created", (e) => {
        try {
          const data = JSON.parse(e.data);
          const notif = data.notification;
          if (!notif || !notif.id) return;

          // 1. Synchronize Authoritative Unread Count
          if (typeof data.unreadCount === "number") {
            queryClient.setQueryData(["notifications-unread-count"], data.unreadCount);
          } else {
            queryClient.setQueryData(["notifications-unread-count"], (prev) => (Number(prev) || 0) + 1);
          }

          // 2. Duplicate Protection for Notification Lists in React Query cache
          queryClient.setQueryData(["notifications", "all"], (old) => {
            if (!old || !Array.isArray(old)) return [notif];
            if (old.some((item) => item.id === notif.id)) return old; // Duplicate protection!
            return [notif, ...old];
          });

          queryClient.setQueryData(["notifications", "unread"], (old) => {
            if (!old || !Array.isArray(old)) return [notif];
            if (old.some((item) => item.id === notif.id)) return old; // Duplicate protection!
            return [notif, ...old];
          });

          // 3. User Feedback - In-App Toast
          toast(notif.title || "New Notification", {
            description: notif.body || "",
            action: notif.action_url
              ? {
                  label: notif.action_text || "View",
                  onClick: () => {
                    if (notif.action_url.startsWith("http")) {
                      window.open(notif.action_url, "_blank");
                    } else {
                      navigate(notif.action_url);
                    }
                  },
                }
              : undefined,
          });

          // If admin user received notification, sync admin logs
          if (user.role === "admin") {
            queryClient.invalidateQueries({ queryKey: ["admin-notification-logs"] });
            queryClient.invalidateQueries({ queryKey: ["admin-notification-analytics"] });
          }
        } catch (err) {
          console.warn("[RealtimeNotifications] Error handling notification.created:", err);
        }
      });

      // Notification single read event
      es.addEventListener("notification.read", (e) => {
        try {
          const data = JSON.parse(e.data);
          const notifId = data.notificationId;

          if (typeof data.unreadCount === "number") {
            queryClient.setQueryData(["notifications-unread-count"], data.unreadCount);
          }

          if (notifId) {
            queryClient.setQueryData(["notifications", "all"], (old) => {
              if (!old || !Array.isArray(old)) return old;
              return old.map((item) => (item.id === notifId ? { ...item, is_read: true, read_at: new Date().toISOString() } : item));
            });

            queryClient.setQueryData(["notifications", "unread"], (old) => {
              if (!old || !Array.isArray(old)) return old;
              return old.filter((item) => item.id !== notifId);
            });
          }
        } catch (err) {
          console.warn("[RealtimeNotifications] Error handling notification.read:", err);
        }
      });

      // Notification read-all event
      es.addEventListener("notification.read_all", (e) => {
        try {
          const data = JSON.parse(e.data);
          queryClient.setQueryData(["notifications-unread-count"], 0);

          queryClient.setQueryData(["notifications", "all"], (old) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }));
          });

          queryClient.setQueryData(["notifications", "unread"], []);
        } catch (err) {
          console.warn("[RealtimeNotifications] Error handling notification.read_all:", err);
        }
      });

      // Admin broadcast event (e.g. new deposit submitted, new KYC submitted)
      es.addEventListener("admin.notification.created", (e) => {
        try {
          if (user.role !== "admin") return;
          const data = JSON.parse(e.data);
          const evt = data.event;
          if (!evt) return;

          // Invalidate relevant admin queries so tables refresh seamlessly in real-time
          queryClient.invalidateQueries({ queryKey: ["admin-notification-logs"] });
          queryClient.invalidateQueries({ queryKey: ["admin-notification-analytics"] });
          queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
          queryClient.invalidateQueries({ queryKey: ["admin-deposits"] });
          queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
          queryClient.invalidateQueries({ queryKey: ["admin-kyc"] });
          queryClient.invalidateQueries({ queryKey: ["admin-users"] });

          // Toast alert for admin
          toast.info(evt.title || "Admin Notice", {
            description: evt.body || "",
            action: evt.data?.action_url
              ? {
                  label: evt.data?.action_text || "View",
                  onClick: () => navigate(evt.data.action_url),
                }
              : undefined,
          });
        } catch (err) {
          console.warn("[RealtimeNotifications] Error handling admin.notification.created:", err);
        }
      });

      es.onerror = () => {
        if (es.readyState === EventSource.CLOSED) {
          console.warn("[RealtimeNotifications] Connection closed. Scheduling reconnect...");
        }
        es.close();
        eventSourceRef.current = null;

        // Schedule safe reconnection with exponential backoff (1s, 2s, 4s, max 10s)
        if (isMountedRef.current && user?.id) {
          const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
          retryCountRef.current += 1;
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, delay);
        }
      };
    }

    connectSSE();

    // Reconnection & Synchronization on tab focus or network recovery
    const handleVisibilityOrOnline = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        // 1. Ensure stream is active
        if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
          connectSSE();
        }
        // 2. Perform a lightweight background synchronization of notifications and unread count
        queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
        if (user.role === "admin") {
          queryClient.invalidateQueries({ queryKey: ["admin-notification-logs"] });
        }
      } else if (document.visibilityState === "hidden") {
        // Conserve resources while tab is backgrounded: stop background reconnect loop and close SSE
        clearTimeout(reconnectTimeoutRef.current);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityOrOnline);
    window.addEventListener("online", handleVisibilityOrOnline);

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimeoutRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityOrOnline);
      window.removeEventListener("online", handleVisibilityOrOnline);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [user?.id, user?.role, queryClient, navigate]);
}
