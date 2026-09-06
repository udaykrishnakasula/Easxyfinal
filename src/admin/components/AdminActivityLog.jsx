import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { Link } from "react-router-dom";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Search,
  RefreshCw,
  Clock,
  ShieldCheck,
  User,
  Inbox,
  ArrowUpFromLine,
  BadgeCheck,
  PiggyBank,
  Layers,
  Sparkles,
  ChevronRight,
  Eye,
  SlidersHorizontal,
  Copy,
  Check,
  ExternalLink,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminAuditLogs } from "@/admin/adminApi";
import { EasyXCard, EasyXButton, EasyXLoader, EasyXEmptyState, EasyXModal } from "@/design/EasyX";
import { money } from "@/user/api";

dayjs.extend(relativeTime);

const FILTER_TABS = [
  { key: "all", label: "All Activity" },
  { key: "approvals", label: "Approvals Only" },
  { key: "rejections", label: "Rejections Only" },
  { key: "deposits", label: "Deposits" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "kyc", label: "KYC Verifications" },
];

function getActionStyling(action = "", decisionType = "action") {
  const act = String(action || "").toLowerCase();

  if (act.includes("batch_approve") || (decisionType === "approved" && act.includes("batch"))) {
    return {
      label: "Batch Approved",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      icon: Sparkles,
      iconClass: "text-emerald-400 bg-emerald-500/10",
      isApproval: true,
    };
  }
  if (act.includes("batch_reject") || (decisionType === "rejected" && act.includes("batch"))) {
    return {
      label: "Batch Rejected",
      badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
      icon: XCircle,
      iconClass: "text-rose-400 bg-rose-500/10",
      isRejection: true,
    };
  }
  if (act.includes("approve") || decisionType === "approved") {
    return {
      label: "Approved",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      icon: CheckCircle2,
      iconClass: "text-emerald-400 bg-emerald-500/10",
      isApproval: true,
    };
  }
  if (act.includes("reject") || decisionType === "rejected") {
    return {
      label: "Rejected",
      badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      icon: XCircle,
      iconClass: "text-rose-400 bg-rose-500/10",
      isRejection: true,
    };
  }
  if (act.includes("cancel") || decisionType === "cancelled") {
    return {
      label: "Cancelled",
      badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      icon: AlertTriangle,
      iconClass: "text-amber-400 bg-amber-500/10",
      isRejection: true,
    };
  }
  if (act.includes("processing") || act.includes("process")) {
    return {
      label: "Processing",
      badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      icon: Clock,
      iconClass: "text-sky-400 bg-sky-500/10",
    };
  }
  return {
    label: "Admin Action",
    badgeClass: "bg-white/5 text-ex-lav-200 border-white/10",
    icon: FileText,
    iconClass: "text-ex-lav-300 bg-white/5",
  };
}

function getFormattedActionTitle(action = "", entityType = "") {
  const act = String(action || "").toLowerCase();
  switch (act) {
    case "deposit.approve":
      return "Deposit Approved & Credited";
    case "deposit.reject":
      return "Deposit Rejected";
    case "deposit.batch_approve":
      return "Deposit Batch Approved";
    case "deposit.batch_reject":
      return "Deposit Batch Rejected";
    case "withdrawal.approve":
      return "Withdrawal Approved";
    case "withdrawal.reject":
      return "Withdrawal Rejected (Refunded)";
    case "withdrawal.processing":
      return "Withdrawal Sent to Blockchain";
    case "withdrawal.process":
      return "Withdrawal Dispatched";
    case "kyc.approve":
      return "KYC Identity Verification Approved";
    case "kyc.reject":
      return "KYC Verification Rejected";
    case "kyc.batch_approve":
      return "KYC Batch Approved";
    case "kyc.batch_reject":
      return "KYC Batch Rejected";
    case "user.suspend":
      return "User Account Suspended";
    case "user.unsuspend":
      return "User Account Restored";
    case "investment.cancel":
      return "Investment Cancelled & Refunded";
    case "wallet.adjust":
      return "Manual Wallet Adjustment";
    case "plan.update":
      return "Investment Plan Modified";
    case "settings.update":
    case "deposit_settings.update":
      return "Platform Settings Updated";
    case "maintenance.update":
      return "Maintenance Mode Updated";
    case "admin.login":
      return "Administrator Session Login";
    default:
      return String(act || "")
        .split(".")
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(" ") || "Audit Action";
  }
}

export default function AdminActivityLog({
  title = "Activity Log",
  subtitle = "Audit trail of recent administrator approval, rejection, and verification actions.",
  limit,
  initialFilter = "all",
  showFilters = true,
  showSearch = true,
  compact = false,
  className = "",
  linkToFull = null,
}) {
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [copiedId, setCopiedId] = useState(false);

  const { data: rawLogs, isLoading, isRefetching, refetch } = useAdminAuditLogs();

  const auditLogs = useMemo(() => {
    if (!rawLogs) return [];
    const list = rawLogs.logs || (Array.isArray(rawLogs) ? rawLogs : []);
    return list;
  }, [rawLogs]);

  const filteredLogs = useMemo(() => {
    let list = [...auditLogs];

    // Filter tab handling
    if (selectedFilter === "approvals") {
      list = list.filter(
        (l) =>
          l.decision_type === "approved" ||
          l.action.toLowerCase().includes("approve")
      );
    } else if (selectedFilter === "rejections") {
      list = list.filter(
        (l) =>
          l.decision_type === "rejected" ||
          l.decision_type === "cancelled" ||
          l.action.toLowerCase().includes("reject") ||
          l.action.toLowerCase().includes("cancel")
      );
    } else if (selectedFilter === "deposits") {
      list = list.filter(
        (l) =>
          l.entity_type === "deposit" ||
          l.action.toLowerCase().includes("deposit")
      );
    } else if (selectedFilter === "withdrawals") {
      list = list.filter(
        (l) =>
          l.entity_type === "withdrawal" ||
          l.action.toLowerCase().includes("withdrawal")
      );
    } else if (selectedFilter === "kyc") {
      list = list.filter(
        (l) =>
          l.entity_type === "kyc_record" ||
          l.entity_type === "kyc" ||
          l.action.toLowerCase().includes("kyc")
      );
    }

    // Search query handling
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((l) => {
        return (
          l.id?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.target_user_name?.toLowerCase().includes(q) ||
          l.target_user_email?.toLowerCase().includes(q) ||
          l.actor_name?.toLowerCase().includes(q) ||
          l.actor_email?.toLowerCase().includes(q) ||
          l.reason?.toLowerCase().includes(q) ||
          l.entity_id?.toLowerCase().includes(q) ||
          (l.amount && String(l.amount).includes(q))
        );
      });
    }

    // Apply limit if specified
    if (limit && typeof limit === "number" && limit > 0) {
      return list.slice(0, limit);
    }

    return list;
  }, [auditLogs, selectedFilter, searchTerm, limit]);

  const copyLogId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    toast.success("Audit Log ID copied to clipboard");
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <EasyXCard className={`p-5 sm:p-6 space-y-5 border border-white/8 ${className}`} data-testid="admin-activity-log">
      {/* Component Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/6 pb-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-sm">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-ex-text tracking-tight">{title}</h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
                Audit Trail
              </span>
            </div>
            {subtitle && <p className="text-xs text-ex-muted mt-0.5">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => refetch()}
            disabled={isRefetching || isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white border border-white/8 transition"
            title="Refresh Activity Log"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefetching ? "animate-spin text-purple-400" : ""}`} />
            <span>{isRefetching ? "Syncing..." : "Refresh"}</span>
          </button>

          {linkToFull && (
            <Link
              to={linkToFull}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 border border-purple-500/30 transition"
            >
              <span>View All Logs</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      {(showFilters || showSearch) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {showFilters && (
            <div className="flex flex-wrap items-center gap-1.5" data-testid="activity-log-filter-tabs">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition ${
                    selectedFilter === tab.key
                      ? "bg-purple-500 text-white shadow-sm shadow-purple-950/40"
                      : "bg-white/5 text-ex-muted hover:bg-white/10 hover:text-ex-text"
                  }`}
                  data-testid={`activity-log-filter-${tab.key}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {showSearch && (
            <div className="relative min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ex-muted/60" />
              <input
                type="text"
                placeholder="Search audit decisions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-ex-text placeholder:text-ex-muted/50 focus:border-purple-400 focus:outline-none transition"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ex-muted hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Activity Log Feed */}
      {isLoading ? (
        <div className="py-12 flex justify-center">
          <EasyXLoader />
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="p-8 rounded-xl bg-black/20 border border-white/5">
          <EasyXEmptyState
            icon={Activity}
            title="No activity recorded"
            description={
              searchTerm
                ? `No audit decisions matched your search query "${searchTerm}".`
                : "Approval and rejection decisions made by administrators will appear here in real time."
            }
          />
        </div>
      ) : (
        <div className="divide-y divide-white/6 overflow-hidden rounded-xl border border-white/6 bg-black/20" data-testid="activity-log-items">
          {filteredLogs.map((log) => {
            const styling = getActionStyling(log.action, log.decision_type);
            const ActionIcon = styling.icon;
            const titleText = getFormattedActionTitle(log.action, log.entity_type);
            const isApproval = styling.isApproval;
            const isRejection = styling.isRejection;

            return (
              <div
                key={log.id}
                className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:bg-white/[0.025] transition group"
                data-testid={`activity-log-row-${log.id}`}
              >
                {/* Left Side: Icon, Action, Target User, and Reason */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
                      isApproval
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : isRejection
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        : "bg-white/5 text-purple-400 border-white/10"
                    }`}
                  >
                    <ActionIcon className="h-4 w-4" />
                  </div>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    {/* Header: Action Title & Decision Badge */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-ex-text group-hover:text-white transition truncate">
                        {titleText}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styling.badgeClass}`}
                      >
                        {styling.label}
                      </span>
                      {log.amount && (
                        <span className="font-mono text-xs font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          {money(log.amount)} USDT
                        </span>
                      )}
                    </div>

                    {/* Target User & Entity Detail */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ex-muted">
                      {(log.target_user_name || log.target_user_email) && (
                        <div className="flex items-center gap-1 text-ex-text font-medium">
                          <User className="h-3 w-3 text-ex-lav-300" />
                          <span>{log.target_user_name || "Investor"}</span>
                          {log.target_user_email && (
                            <span className="text-ex-muted text-[11px]">({log.target_user_email})</span>
                          )}
                        </div>
                      )}

                      {log.entity_type && (
                        <div className="flex items-center gap-1 font-mono text-[11px] text-ex-muted/80">
                          <span className="uppercase text-[10px] bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                            {log.entity_type}
                          </span>
                          {log.entity_id && (
                            <span className="text-ex-lav-200">#{log.entity_id.slice(0, 8)}</span>
                          )}
                        </div>
                      )}

                      {log.meta?.network && (
                        <span className="text-[10px] font-bold uppercase text-ex-accent bg-ex-accent/10 border border-ex-accent/20 px-1.5 py-0.2 rounded">
                          {log.meta.network}
                        </span>
                      )}
                    </div>

                    {/* Admin Note or Rejection Reason Callout */}
                    {log.reason && (
                      <div
                        className={`text-xs px-3 py-1.5 rounded-lg border flex items-start gap-1.5 ${
                          isRejection
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                            : "bg-white/[0.03] border-white/10 text-ex-muted"
                        }`}
                      >
                        <span className="font-bold shrink-0">
                          {isRejection ? "Reason:" : "Note:"}
                        </span>
                        <span className="italic break-all">{log.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Side: Admin Actor, Timestamp, and Inspect Details Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-1 sm:pt-0">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-ex-lav-200 justify-end">
                      <ShieldCheck className="h-3 w-3 text-emerald-400" />
                      <span>{log.actor_name || log.actor_email?.split("@")?.[0] || "Admin"}</span>
                    </div>
                    <div
                      className="text-[11px] text-ex-muted font-mono flex items-center gap-1 justify-end"
                      title={dayjs(log.created_at).format("DD MMM YYYY, HH:mm:ss")}
                    >
                      <Clock className="h-3 w-3 text-ex-muted/60" />
                      <span>{dayjs(log.created_at).fromNow()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedAuditLog(log)}
                    className="opacity-90 hover:opacity-100 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white/5 hover:bg-white/10 text-ex-lav-300 hover:text-white border border-white/10 transition flex items-center gap-1"
                    data-testid={`activity-log-inspect-${log.id}`}
                  >
                    <Eye className="h-3 w-3" />
                    <span>Inspect</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* INSPECTION MODAL */}
      <EasyXModal
        open={Boolean(selectedAuditLog)}
        onClose={() => setSelectedAuditLog(null)}
        title="Audit Record Details"
      >
        {selectedAuditLog && (
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {getFormattedActionTitle(selectedAuditLog.action, selectedAuditLog.entity_type)}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] border ${
                    getActionStyling(selectedAuditLog.action, selectedAuditLog.decision_type).badgeClass
                  }`}
                >
                  {selectedAuditLog.decision_type}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-ex-muted pt-1">
                <div>
                  <span className="text-ex-muted/70 block">Log ID:</span>
                  <div className="font-mono text-white flex items-center gap-1">
                    <span className="truncate">{selectedAuditLog.id}</span>
                    <button
                      onClick={() => copyLogId(selectedAuditLog.id)}
                      className="text-purple-400 hover:text-white p-0.5"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-ex-muted/70 block">Timestamp:</span>
                  <span className="text-white">
                    {dayjs(selectedAuditLog.created_at).format("DD MMM YYYY, HH:mm:ss")}
                  </span>
                </div>

                <div>
                  <span className="text-ex-muted/70 block">Administrator / Actor:</span>
                  <span className="text-white font-medium">
                    {selectedAuditLog.actor_name} ({selectedAuditLog.actor_email})
                  </span>
                </div>

                <div>
                  <span className="text-ex-muted/70 block">Target Investor:</span>
                  <span className="text-white font-medium">
                    {selectedAuditLog.target_user_name || "—"}{" "}
                    {selectedAuditLog.target_user_email ? `(${selectedAuditLog.target_user_email})` : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* Rejection reason or admin note */}
            {selectedAuditLog.reason && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300">
                <span className="font-bold block mb-0.5">Recorded Reason / Admin Note:</span>
                <p className="text-rose-200 leading-relaxed">{selectedAuditLog.reason}</p>
              </div>
            )}

            {/* Raw Metadata JSON */}
            <div>
              <div className="text-[11px] font-semibold text-ex-muted mb-1.5 flex items-center justify-between">
                <span>Complete Audit Metadata Payload</span>
                <span className="font-mono text-[10px] text-purple-400">JSON Inspector</span>
              </div>
              <pre className="p-3 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-purple-200 overflow-x-auto max-h-60">
                {JSON.stringify(
                  {
                    id: selectedAuditLog.id,
                    action: selectedAuditLog.action,
                    decision_type: selectedAuditLog.decision_type,
                    actor: {
                      id: selectedAuditLog.actor_id,
                      name: selectedAuditLog.actor_name,
                      email: selectedAuditLog.actor_email,
                      role: selectedAuditLog.actor_role,
                    },
                    target: {
                      entity_type: selectedAuditLog.entity_type,
                      entity_id: selectedAuditLog.entity_id,
                      user_id: selectedAuditLog.target_user_id,
                      user_name: selectedAuditLog.target_user_name,
                      user_email: selectedAuditLog.target_user_email,
                    },
                    amount: selectedAuditLog.amount,
                    reason: selectedAuditLog.reason,
                    metadata: selectedAuditLog.meta,
                    created_at: selectedAuditLog.created_at,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-2 border-t border-white/8">
              <EasyXButton variant="ghost" onClick={() => setSelectedAuditLog(null)} className="text-xs">
                Close
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>
    </EasyXCard>
  );
}
