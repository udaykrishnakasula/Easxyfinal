import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, Download, ScrollText, Filter } from "lucide-react";

import { useAdminReports, downloadReport, useAdminAuditLogs } from "./adminApi";
import { EasyXCard, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

const DATASET_LABELS = {
  users: "Users",
  deposits: "Deposits",
  investments: "Investments",
  matured_investments: "Matured investments",
  withdrawals: "Withdrawals",
  referral_commissions: "Referral commissions",
  wallet_transactions: "Wallet transactions",
  kyc: "KYC records / status",
};

const ACTION_LABELS = {
  "admin.login": "Admin login",
  "user.suspend": "User suspended",
  "user.unsuspend": "User unsuspended",
  "deposit.approve": "Deposit approved",
  "deposit.reject": "Deposit rejected",
  "kyc.approve": "KYC approved",
  "kyc.reject": "KYC rejected",
  "withdrawal.approve": "Withdrawal approved",
  "withdrawal.reject": "Withdrawal rejected",
  "withdrawal.process": "Withdrawal processed",
  "investment.cancel": "Investment cancelled / refunded",
  "wallet.adjust": "Wallet adjustment",
  "plan.update": "Plan changed",
  "maintenance.update": "Maintenance changed",
  "report.export": "Report exported",
};

function ExportRow({ dataset }) {
  const [busy, setBusy] = useState(null);
  const label = DATASET_LABELS[dataset] || dataset;

  const doExport = async (format) => {
    setBusy(format);
    try {
      const name = await downloadReport(dataset, format);
      toast.success(`Exported ${name}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Export failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 py-3" data-testid={`report-row-${dataset}`}>
      <span className="text-sm font-medium text-white">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => doExport("csv")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-ex-ctrl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-ex-text transition hover:bg-white/10 disabled:opacity-50"
          data-testid={`export-${dataset}-csv`}
        >
          <FileText className="h-3.5 w-3.5" /> {busy === "csv" ? "…" : "CSV"}
        </button>
        <button
          type="button"
          onClick={() => doExport("xlsx")}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-ex-ctrl bg-ex-accent px-3 py-1.5 text-xs font-semibold text-ex-ink transition hover:brightness-110 disabled:opacity-50"
          data-testid={`export-${dataset}-xlsx`}
        >
          <FileSpreadsheet className="h-3.5 w-3.5" /> {busy === "xlsx" ? "…" : "Excel"}
        </button>
      </div>
    </div>
  );
}

function metaSummary(meta) {
  if (!meta || typeof meta !== "object") return "";
  const parts = [];
  if (meta.amount != null) parts.push(`amount: ${meta.amount}`);
  if (meta.approved_amount != null) parts.push(`approved: ${meta.approved_amount}`);
  if (meta.refund_amount != null) parts.push(`refund: ${meta.refund_amount}`);
  if (meta.direction) parts.push(meta.direction);
  if (meta.reason) parts.push(`reason: ${meta.reason}`);
  if (meta.note) parts.push(`note: ${meta.note}`);
  if (meta.tx_hash) parts.push(`tx: ${String(meta.tx_hash).slice(0, 14)}…`);
  if (meta.format) parts.push(`${meta.format} (${meta.row_count ?? 0} rows)`);
  return parts.join(" · ");
}

export default function AdminReportsPage() {
  const { data: reports, isLoading: loadingReports } = useAdminReports();
  const [actionFilter, setActionFilter] = useState("");
  const { data: auditData, isLoading: loadingLogs } = useAdminAuditLogs({ action: actionFilter || undefined });
  const logs = auditData?.logs || (Array.isArray(auditData) ? auditData : []);

  const actionOptions = useMemo(() => Object.keys(ACTION_LABELS), []);

  return (
    <div data-testid="admin-reports-page">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-ex-ctrl bg-ex-accent/10 text-ex-accent ring-1 ring-ex-accent/25">
          <Download className="h-5 w-5" />
        </span>
        <div>
          <h1 className="ex-display text-2xl font-extrabold text-white">Reports &amp; Audit</h1>
          <p className="text-sm text-ex-muted">Export data (admin-only) and review the immutable audit trail.</p>
        </div>
      </div>

      {/* Exports */}
      <EasyXCard className="mt-6">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-ex-accent" />
          <h2 className="ex-display text-lg font-extrabold text-white">Data exports</h2>
        </div>
        <p className="mt-1 text-xs text-ex-muted">Download any dataset as CSV or Excel. Exports are logged in the audit trail.</p>
        {loadingReports ? (
          <EasyXLoader className="py-10" />
        ) : (
          <div className="mt-3 divide-y divide-white/5">
            {(reports?.datasets || Object.keys(DATASET_LABELS)).map((ds) => (
              <ExportRow key={ds} dataset={ds} />
            ))}
          </div>
        )}
      </EasyXCard>

      {/* Audit log */}
      <EasyXCard className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-ex-accent" />
            <h2 className="ex-display text-lg font-extrabold text-white">Audit log</h2>
          </div>
          <label className="inline-flex items-center gap-2 text-xs text-ex-muted">
            <Filter className="h-3.5 w-3.5" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="rounded-ex-ctrl border border-white/10 bg-ex-surface px-2 py-1.5 text-xs text-ex-text focus:outline-none"
              data-testid="audit-action-filter"
            >
              <option value="">All actions</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>{ACTION_LABELS[a]}</option>
              ))}
            </select>
          </label>
        </div>

        {loadingLogs ? (
          <EasyXLoader className="py-10" />
        ) : !logs || logs.length === 0 ? (
          <div className="mt-4">
            <EasyXEmptyState icon={ScrollText} title="No audit entries" note="Admin actions will appear here." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="audit-log-table">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide text-ex-muted/70">
                  <th className="pb-2 pr-4 font-medium">Action</th>
                  <th className="pb-2 pr-4 font-medium">Admin</th>
                  <th className="pb-2 pr-4 font-medium">Target</th>
                  <th className="pb-2 pr-4 font-medium">Details</th>
                  <th className="pb-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => (
                  <tr key={log.id} className="align-top" data-testid="audit-log-row">
                    <td className="py-2.5 pr-4 font-medium text-white">{ACTION_LABELS[log.action] || log.action}</td>
                    <td className="py-2.5 pr-4 text-ex-muted">{log.actor_email || log.actor_id || "system"}</td>
                    <td className="py-2.5 pr-4 text-ex-muted">
                      {log.entity_type ? (
                        <span>
                          {log.entity_type}
                          {log.entity_id ? <span className="block text-[11px] opacity-70">{log.entity_id}</span> : null}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-2.5 pr-4 text-ex-muted">{metaSummary(log.meta) || "—"}</td>
                    <td className="py-2.5 whitespace-nowrap text-ex-muted">
                      {log.created_at ? dayjs(log.created_at).format("DD MMM YYYY, HH:mm") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EasyXCard>
    </div>
  );
}
