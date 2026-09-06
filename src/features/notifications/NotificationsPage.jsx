import React from "react";
import { Bell, CheckCheck, TrendingUp, Clock, CircleDollarSign } from "lucide-react";
import dayjs from "dayjs";

import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/dashboard/api";
import { PageHeading, EasyXCard, EasyXLoader, EasyXEmptyState, EasyXButton } from "@/design/EasyX";

function iconFor(type) {
  if (type === "investment_matured") return CircleDollarSign;
  if (type === "maturity_reminder") return Clock;
  return TrendingUp;
}

export default function NotificationsPage() {
  const { data: notifications, isLoading } = useNotifications(false);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const hasUnread = (notifications || []).some((n) => !n.is_read);

  return (
    <div data-testid="notifications-page">
      <PageHeading
        title="Notifications"
        subtitle="Maturity payouts and upcoming maturity reminders."
        icon={Bell}
        actions={
          hasUnread ? (
            <EasyXButton
              variant="ghost"
              onClick={() => markAllRead.mutate()}
              loading={markAllRead.isPending}
              data-testid="notifications-mark-all-read"
            >
              <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
            </EasyXButton>
          ) : null
        }
      />

      {isLoading ? (
        <EasyXLoader />
      ) : !notifications || notifications.length === 0 ? (
        <div className="mt-5">
          <EasyXEmptyState
            icon={Bell}
            title="No notifications yet"
            note="You'll be notified here when an investment is about to mature and when it pays out."
          />
        </div>
      ) : (
        <EasyXCard className="mt-5 p-0 overflow-hidden">
          <div className="divide-y divide-white/5">
            {notifications.map((n) => {
              const Icon = iconFor(n.type);
              return (
                <div
                  key={n.id}
                  data-testid={`notification-${n.id}`}
                  data-read={n.is_read ? "true" : "false"}
                  className={`flex items-start gap-3 px-4 py-4 transition ${
                    n.is_read ? "opacity-70" : "bg-white/[0.03]"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full ${
                      n.type === "investment_matured"
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-ex-accent/20 text-ex-lav-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-ex-text">{n.title}</span>
                      {!n.is_read && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-ex-accent" aria-label="unread" />
                      )}
                    </div>
                    {n.body && <p className="mt-0.5 text-sm text-ex-muted">{n.body}</p>}
                    <div className="mt-1 text-[11px] text-ex-muted">
                      {dayjs(n.created_at).format("DD MMM YYYY, HH:mm")}
                    </div>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead.mutate(n.id)}
                      className="shrink-0 rounded-ex-ctrl px-2.5 py-1 text-xs text-ex-muted hover:bg-white/8 hover:text-ex-text"
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
