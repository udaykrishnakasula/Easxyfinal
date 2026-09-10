import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  CheckCheck,
  TrendingUp,
  Clock,
  CircleDollarSign,
  ArrowRight,
  BadgeCheck,
  Inbox,
  PiggyBank,
} from "lucide-react";
import dayjs from "dayjs";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/user/api";
import {
  PageHeading,
  EasyXCard,
  EasyXLoader,
  EasyXEmptyState,
  EasyXButton,
} from "@/design/EasyX";

function iconFor(type) {
  if (type === "investment_matured") return CircleDollarSign;
  if (type === "maturity_reminder") return Clock;
  if (type === "automated_reminder") return BellRing;
  if (type?.includes("deposit")) return Inbox;
  if (type?.includes("kyc")) return BadgeCheck;
  if (type?.includes("investment")) return PiggyBank;
  return TrendingUp;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data: notifications, isLoading } = useNotifications(false);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const notifList = Array.isArray(notifications)
    ? notifications
    : Array.isArray(notifications?.notifications)
    ? notifications.notifications
    : Array.isArray(notifications?.data)
    ? notifications.data
    : typeof notifications === "string" && notifications.trim().startsWith("[")
    ? (() => { try { const p = JSON.parse(notifications); return Array.isArray(p) ? p : []; } catch { return []; } })()
    : [];

  const hasUnread = notifList.some((n) => !n.is_read);

  const handleActionClick = (notif) => {
    if (!notif.is_read) {
      markRead.mutate(notif.id);
    }
    if (notif.action_url) {
      navigate(notif.action_url);
    }
  };

  return (
    <div data-testid="notifications-page">
      <PageHeading
        title="Notifications"
        subtitle="Account alerts, maturity updates, and important security reminders."
        icon={Bell}
        actions={
          hasUnread ? (
            <div className="flex items-center gap-2">
              <EasyXButton
                variant="ghost"
                size="sm"
                onClick={() => markAllRead.mutate()}
                loading={markAllRead.isPending}
                data-testid="notifications-mark-all-read"
                className="flex items-center gap-1.5 text-xs"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </EasyXButton>
            </div>
          ) : null
        }
      />

      {isLoading ? (
        <EasyXLoader />
      ) : notifList.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState
            icon={Bell}
            title="No notifications yet"
            note="You'll be notified here when an investment is about to mature, when deposits are processed, and for important account milestones."
          />
        </div>
      ) : (
        <EasyXCard className="mt-5 p-0 overflow-hidden">
          <div className="divide-y divide-white/5">
            {notifList.map((n) => {
              const Icon = iconFor(n.type);
              const isReminder = n.type === "automated_reminder" || n.metadata?.is_reminder;

              return (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  data-read={n.is_read ? "true" : "false"}
                  className={`flex items-start gap-3 px-4 py-4 transition ${
                    n.is_read ? "opacity-75" : "bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      n.type === "investment_matured"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : isReminder
                        ? "bg-ex-accent/20 text-ex-lav-300"
                        : "bg-white/10 text-ex-lav-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ex-text">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-ex-accent" aria-label="unread" />
                      )}
                    </div>
                    {n.body && <p className="text-sm text-ex-muted leading-relaxed">{n.body}</p>}

                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[11px] text-ex-muted font-mono">
                        {dayjs(n.created_at).format("DD MMM YYYY, HH:mm")}
                      </span>

                      {n.action_url && (
                        <button
                          type="button"
                          onClick={() => handleActionClick(n)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-ex-accent hover:underline"
                        >
                          {n.action_text || "Continue"} <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="shrink-0 rounded-ex-ctrl px-2.5 py-1 text-xs text-ex-muted hover:bg-white/8 hover:text-ex-text transition"
                      data-testid={`notification-read-${n.id}`}
                    >
                      Mark read
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </EasyXCard>
      )}
    </div>
  );
}
