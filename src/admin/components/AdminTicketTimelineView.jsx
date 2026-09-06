import React from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Clock,
  Shield,
  LifeBuoy,
  MessageSquare,
  Send,
  UserCheck,
  Zap,
  Flame,
  CheckCircle2,
  Lock,
  RotateCcw,
  StickyNote,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useAdminSupportTicketTimeline } from "@/admin/adminApi";
import { EasyXLoader } from "@/design/EasyX";

dayjs.extend(relativeTime);

const EVENT_ICONS = {
  TICKET_CREATED: LifeBuoy,
  USER_MESSAGE: MessageSquare,
  ADMIN_REPLY: Send,
  ADMIN_INTERNAL_NOTE: StickyNote,
  STATUS_CHANGED: Clock,
  PRIORITY_CHANGED: Zap,
  ASSIGNED: UserCheck,
  AUTO_ESCALATED: Flame,
  MANUALLY_ESCALATED: AlertTriangle,
  TICKET_RESOLVED: CheckCircle2,
  TICKET_CLOSED: Lock,
  TICKET_REOPENED: RotateCcw,
};

const EVENT_COLORS = {
  TICKET_CREATED: "text-sky-400 bg-sky-500/10 border-sky-500/30",
  USER_MESSAGE: "text-ex-lav-300 bg-white/5 border-white/10",
  ADMIN_REPLY: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  ADMIN_INTERNAL_NOTE: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  STATUS_CHANGED: "text-cyan-300 bg-cyan-500/10 border-cyan-500/30",
  PRIORITY_CHANGED: "text-purple-300 bg-purple-500/10 border-purple-500/30",
  ASSIGNED: "text-indigo-300 bg-indigo-500/10 border-indigo-500/30",
  AUTO_ESCALATED: "text-rose-400 bg-rose-500/15 border-rose-500/30",
  MANUALLY_ESCALATED: "text-red-400 bg-red-500/15 border-red-500/30",
  TICKET_RESOLVED: "text-emerald-400 bg-emerald-500/15 border-emerald-500/30",
  TICKET_CLOSED: "text-white/60 bg-white/5 border-white/10",
  TICKET_REOPENED: "text-amber-400 bg-amber-500/15 border-amber-500/30",
};

export default function AdminTicketTimelineView({ ticketId }) {
  const { data, isLoading, isError } = useAdminSupportTicketTimeline(ticketId);
  const timeline = data?.timeline || [];

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <EasyXLoader text="Loading audit timeline..." />
      </div>
    );
  }

  if (isError || timeline.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-white/50">
        No lifecycle audit events recorded for this ticket.
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
      {timeline.map((evt, idx) => {
        const Icon = EVENT_ICONS[evt.event_type] || Clock;
        const colorClasses = EVENT_COLORS[evt.event_type] || "text-white/60 bg-white/5 border-white/10";

        return (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline bullet icon */}
            <div
              className={`absolute -left-6 top-0.5 grid h-5 w-5 place-items-center rounded-full border shadow-sm ${colorClasses}`}
            >
              <Icon className="h-2.5 w-2.5" />
            </div>

            {/* Event Content Box */}
            <div className="rounded-ex-surface bg-white/[0.02] border border-white/6 p-3 text-xs space-y-1 hover:bg-white/[0.04] transition">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-white/90">{evt.title}</span>
                  {evt.is_internal && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                      Internal
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-white/40 shrink-0 font-mono">
                  {dayjs(evt.created_at).format("DD MMM, HH:mm:ss")} ({dayjs(evt.created_at).fromNow()})
                </span>
              </div>

              {evt.description && (
                <p className="text-[11px] text-white/70 whitespace-pre-wrap leading-relaxed">
                  {evt.description}
                </p>
              )}

              {/* Actor */}
              <div className="flex items-center gap-1 text-[10px] text-white/40 pt-0.5">
                <span>By:</span>
                <span className="font-medium text-white/60">{evt.actor_name || evt.actor_type}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
