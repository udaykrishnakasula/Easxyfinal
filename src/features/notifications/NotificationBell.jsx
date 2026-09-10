import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CheckCheck, TrendingUp, Clock, CircleDollarSign,
  ArrowDownToLine, ArrowUpFromLine, Users, ShieldCheck, ShieldAlert, Sparkles,
} from "lucide-react";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  useNotifications,
  useUnreadCount,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/features/dashboard/api";

function iconFor(type = "") {
  if (type.startsWith("deposit")) return ArrowDownToLine;
  if (type.startsWith("withdrawal")) return ArrowUpFromLine;
  if (type === "investment_matured" || type === "investment_purchased") return CircleDollarSign;
  if (type === "maturity_reminder") return Clock;
  if (type.startsWith("investment")) return TrendingUp;
  if (type.startsWith("referral")) return Users;
  if (type === "kyc_approved") return ShieldCheck;
  if (type.startsWith("kyc")) return ShieldAlert;
  if (type.startsWith("account")) return ShieldAlert;
  return Sparkles;
}

function toneFor(type = "") {
  if (type.endsWith("_rejected") || type === "account_suspended") return "text-rose-300 bg-rose-400/10 ring-rose-400/25";
  if (type.endsWith("_approved") || type === "investment_matured" || type === "referral_commission" || type === "account_reactivated" || type === "withdrawal_paid")
    return "text-emerald-300 bg-emerald-400/10 ring-emerald-400/25";
  if (type === "maturity_reminder") return "text-amber-300 bg-amber-400/10 ring-amber-400/25";
  return "text-ex-accent bg-ex-accent/10 ring-ex-accent/25";
}

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notifications = [], isLoading } = useNotifications(false);
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

  const recent = notifList.slice(0, 8);
  const hasUnread = unreadCount > 0;

  const handleItemClick = (n) => {
    if (!n.is_read) markRead.mutate(n.id);
  };

  const goToAll = () => {
    setOpen(false);
    navigate("/app/notifications");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
          data-testid="notification-bell"
          className="group relative grid h-10 w-10 place-items-center rounded-ex-ctrl text-ex-text transition hover:bg-white/10"
        >
          <Bell className={`h-5 w-5 transition-transform group-hover:scale-110 ${hasUnread ? "animate-bell-ring text-ex-accent" : "group-hover:animate-bell-ring text-ex-muted group-hover:text-white"}`} />
          {hasUnread && (
            <span
              data-testid="notification-bell-badge"
              className="absolute -right-0.5 -top-0.5 grid min-w-[18px] h-[18px] place-items-center rounded-full bg-ex-accent px-1 text-[10px] font-bold leading-none text-ex-ink ring-2 ring-ex-surface2 animate-pulse"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[22rem] max-w-[92vw] rounded-ex-lg border-white/10 bg-ex-surface2 p-0 text-ex-text shadow-2xl"
        data-testid="notification-bell-panel"
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="ex-display text-sm font-extrabold">Notifications</span>
            {hasUnread && (
              <span className="rounded-full bg-ex-accent px-1.5 py-0.5 text-[10px] font-bold text-ex-ink">
                {unreadCount} new
              </span>
            )}
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex items-center gap-1 text-xs text-ex-muted transition hover:text-ex-text disabled:opacity-50"
              data-testid="notification-bell-mark-all"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>

        <div className="max-h-[22rem] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/5" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto h-8 w-8 text-ex-muted/60" />
              <p className="mt-3 text-sm font-medium">You&apos;re all caught up</p>
              <p className="mt-1 text-xs text-ex-muted">New alerts will show up here.</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((n) => {
                const Icon = iconFor(n.type);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => handleItemClick(n)}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5 ${
                        n.is_read ? "opacity-70" : ""
                      }`}
                      data-testid="notification-bell-item"
                    >
                      <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-1 ${toneFor(n.type)}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{n.title}</span>
                          {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-ex-accent" />}
                        </span>
                        {n.body && <span className="mt-0.5 block text-xs text-ex-muted line-clamp-2">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-ex-muted/80">{timeAgo(n.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t border-white/8 p-2">
          <button
            type="button"
            onClick={goToAll}
            className="w-full rounded-ex-ctrl px-3 py-2 text-center text-sm font-semibold text-ex-accent transition hover:bg-white/5"
            data-testid="notification-bell-view-all"
          >
            View all notifications
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
