import React from "react";
import { cn } from "@/lib/utils";

const STATUS_CONFIG = {
  OPEN: {
    label: "Open",
    classes: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    dot: "bg-sky-400",
  },
  IN_PROGRESS: {
    label: "In Progress",
    classes: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    dot: "bg-amber-400",
  },
  WAITING_FOR_USER: {
    label: "Waiting for You",
    classes: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    dot: "bg-purple-400 animate-pulse",
  },
  WAITING_FOR_ADMIN: {
    label: "Waiting for Staff",
    classes: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    dot: "bg-cyan-400",
  },
  RESOLVED: {
    label: "Resolved",
    classes: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    dot: "bg-emerald-400",
  },
  CLOSED: {
    label: "Closed",
    classes: "bg-white/10 text-white/60 border-white/10",
    dot: "bg-white/40",
  },
};

const PRIORITY_CONFIG = {
  LOW: {
    label: "Low Priority",
    classes: "text-white/60 bg-white/5 border-white/10",
  },
  NORMAL: {
    label: "Normal",
    classes: "text-ex-muted bg-white/5 border-white/10",
  },
  HIGH: {
    label: "High Priority",
    classes: "text-amber-300 bg-amber-500/10 border-amber-500/20",
  },
  URGENT: {
    label: "Urgent",
    classes: "text-red-300 bg-red-500/15 border-red-500/30",
  },
};

const CATEGORY_NAMES = {
  ACCOUNT: "Account",
  LOGIN: "Login & Access",
  DEPOSIT: "Deposit",
  INVESTMENT: "Investment",
  KYC: "KYC Verification",
  WITHDRAWAL: "Withdrawal",
  WALLET: "Wallet & Funds",
  REFERRAL: "Referral Program",
  TECHNICAL: "Technical Support",
  OTHER: "General Inquiry",
};

export function SupportStatusBadge({ status, className }) {
  const key = (status || "").toUpperCase();
  const config = STATUS_CONFIG[key] || STATUS_CONFIG.OPEN;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide",
        config.classes,
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {config.label}
    </span>
  );
}

export function SupportPriorityBadge({ priority, className }) {
  const key = (priority || "").toUpperCase();
  const config = PRIORITY_CONFIG[key] || PRIORITY_CONFIG.NORMAL;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}

export function SupportCategoryBadge({ category, className }) {
  const key = (category || "").toUpperCase();
  const name = CATEGORY_NAMES[key] || category || "General";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-ex-ctrl bg-white/5 px-2 py-0.5 text-xs font-medium text-ex-lav-300 border border-white/8",
        className
      )}
    >
      {name}
    </span>
  );
}

export function SupportEscalationBadge({ isEscalated, level = 1, className }) {
  if (!isEscalated) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider animate-pulse",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
      Escalated {level > 1 ? `(L${level})` : ""}
    </span>
  );
}

export function SupportSlaBadge({ isOverdue, overdueType, className }) {
  if (!isOverdue) return null;
  const label = overdueType === "FIRST_RESPONSE" ? "1st Response Overdue" : "Resolution Overdue";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      {label}
    </span>
  );
}
