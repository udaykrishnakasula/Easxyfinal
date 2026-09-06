import React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

// Re-export shadcn primitives, restyled/wrapped to the EasyX language so we never
// duplicate a component: Modal->Dialog, Tabs->tabs, Progress->progress, etc.
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton as ShadSkeleton } from "@/components/ui/skeleton";

/* ---------------- Button ---------------- */
export function EasyXButton({ variant = "primary", className, children, loading = false, ...props }) {
  const variants = {
    primary: "ex-btn ex-btn-primary",
    accent: "ex-btn ex-btn-accent",
    ghost: "ex-btn ex-btn-ghost",
  };
  return (
    <button className={cn(variants[variant] || variants.primary, "h-11 px-5 text-sm", className)} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
    </button>
  );
}

export function EasyXIconButton({ className, children, ...props }) {
  return (
    <button
      className={cn(
        "grid h-10 w-10 place-items-center rounded-ex-ctrl bg-white/5 border border-white/12 text-ex-text",
        "transition hover:bg-white/10",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ---------------- Cards ---------------- */
export function EasyXCard({ className, hover, children, ...props }) {
  return (
    <div className={cn("ex-surface p-5 sm:p-6", hover && "ex-hover", className)} {...props}>
      {children}
    </div>
  );
}

export function EasyXGlassCard({ className, children, ...props }) {
  return (
    <div className={cn("ex-glass p-5 sm:p-6", className)} {...props}>
      {children}
    </div>
  );
}

/* ---------------- Typography ---------------- */
export function Eyebrow({ className, children }) {
  return <p className={cn("ex-eyebrow", className)}>{children}</p>;
}

export function PageHeading({ title, subtitle, icon: Icon, actions }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="ex-display text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-ex-lav-400" />} {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ex-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/* ---------------- Stat ---------------- */
export function EasyXStat({ label, value, icon: Icon, accent, gradient }) {
  return (
    <EasyXCard className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-ex-muted text-xs">
        {Icon && <Icon className="h-4 w-4" />} {label}
      </div>
      <div className={cn("mt-1 ex-display text-2xl font-extrabold", gradient && "ex-gradient-text", accent && "text-emerald-300")}>
        {value}
      </div>
    </EasyXCard>
  );
}

/* ---------------- Badges ---------------- */
export function EasyXBadge({ className, children }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide", className)}>
      {children}
    </span>
  );
}

const STATUS_MAP = {
  active: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  matured: "bg-sky-500/15 text-sky-300 border border-sky-500/30",
  pending: "bg-amber-500/15 text-amber-300 border border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-300 border border-red-500/30",
  cancelled: "bg-red-500/15 text-red-300 border border-red-500/30",
  paid: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30",
  unlocked: "bg-ex-lav-400/15 text-ex-lav-300 border border-ex-lav-400/30",
  locked: "bg-white/10 text-white/60 border border-white/10",
};

export function EasyXStatusBadge({ status }) {
  const key = (status || "").toLowerCase();
  return <EasyXBadge className={STATUS_MAP[key] || STATUS_MAP.pending}>{(status || "").toUpperCase()}</EasyXBadge>;
}

/* ---------------- Table ---------------- */
export function EasyXTable({ columns, children }) {
  return (
    <div className="overflow-x-auto rounded-ex border border-white/8">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.04] text-ex-muted text-left">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-4 py-3 font-medium whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">{children}</tbody>
      </table>
    </div>
  );
}

/* ---------------- Empty / Skeleton ---------------- */
export function EasyXEmptyState({ icon: Icon, title, note, action }) {
  return (
    <div className="ex-surface p-10 sm:p-12 text-center">
      {Icon && (
        <span className="grid h-14 w-14 mx-auto place-items-center rounded-full bg-white/8">
          <Icon className="h-6 w-6 text-ex-lav-300" />
        </span>
      )}
      <p className="mt-4 font-medium text-ex-text">{title}</p>
      {note && <p className="mt-1 text-sm text-ex-muted">{note}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function EasyXSkeleton({ className }) {
  return <ShadSkeleton className={cn("bg-white/5", className)} />;
}

export function EasyXLoader({ className }) {
  return (
    <div className={cn("flex justify-center py-20", className)}>
      <Loader2 className="h-6 w-6 animate-spin text-ex-muted" />
    </div>
  );
}

/* ---------------- Modal (wraps Dialog) ---------------- */
export function EasyXModal({ open, onOpenChange, onClose, title, description, children, footer, testId, className }) {
  const handleOpenChange = (nextOpen) => {
    onOpenChange?.(nextOpen);
    if (!nextOpen) {
      onClose?.();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn("bg-ex-surface border-white/10 text-ex-text sm:max-w-md rounded-ex", className)} data-testid={testId}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle className="ex-display text-xl">{title}</DialogTitle>}
            {description && <DialogDescription className="text-ex-muted">{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        {footer && <DialogFooter>{footer}</DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Tabs / Progress passthrough ---------------- */
export const EasyXTabs = Tabs;
export const EasyXTabsList = TabsList;
export const EasyXTabsTrigger = TabsTrigger;
export const EasyXTabsContent = TabsContent;
export const EasyXProgress = Progress;
