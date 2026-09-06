import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/shared/lib/api";

export function useAdminDeposits(status) {
  return useQuery({
    queryKey: ["admin-deposits", status || "all"],
    queryFn: async () =>
      (await api.get("/admin/deposits", { params: status ? { status } : {} })).data,
    refetchInterval: 30000,
  });
}

export function useApproveDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, approved_amount, note }) =>
      (await api.post(`/admin/deposits/${id}/approve`, { approved_amount, note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-deposits"] }),
  });
}

export function useRejectDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, note }) =>
      (await api.post(`/admin/deposits/${id}/reject`, { note })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-deposits"] }),
  });
}

export function useBatchApproveDeposits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, note }) =>
      (await api.post("/admin/deposits/batch-approve", { ids, note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useBatchRejectDeposits() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, reason }) =>
      (await api.post("/admin/deposits/batch-reject", { ids, reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-deposits"] }),
  });
}

export function useBatchSetDepositStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status, note, reason }) =>
      (await api.post("/admin/deposits/batch-set-status", { ids, status, note: note || reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-deposits"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

export function useAdminDepositSettings() {
  return useQuery({
    queryKey: ["admin-deposit-settings"],
    queryFn: async () => (await api.get("/admin/settings/deposit")).data,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => (await api.get("/admin/settings")).data,
    refetchInterval: 15000,
  });
}

export function useAppBranding() {
  return useQuery({
    queryKey: ["app-branding"],
    queryFn: async () => (await api.get("/branding")).data,
    staleTime: 30000,
  });
}

export function useSaveBranding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) =>
      (await api.put("/admin/settings/branding", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-branding"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
  });
}

export function useUploadAppIcon() {
  return useMutation({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append("icon", file);
      const res = await api.post("/admin/branding/icon-upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
  });
}

export function useSaveAdminSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch) => (await api.put("/admin/settings", patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["app-branding"] });
      qc.invalidateQueries({ queryKey: ["admin-maintenance"] });
      qc.invalidateQueries({ queryKey: ["public-maintenance"] });
      qc.invalidateQueries({ queryKey: ["admin-deposit-settings"] });
      qc.invalidateQueries({ queryKey: ["deposit-config"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
  });
}

export function useSaveDepositAddresses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trc20, bep20 }) =>
      (await api.put("/admin/settings/deposit", { trc20, bep20 })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-deposit-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["deposit-config"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
  });
}

export function useAdminKyc(status) {
  return useQuery({
    queryKey: ["admin-kyc", status || "all"],
    queryFn: async () =>
      (await api.get("/admin/kyc", { params: status ? { status } : {} })).data,
    refetchInterval: 30000,
  });
}

export function useApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => (await api.post(`/admin/kyc/${id}/approve`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc"] }),
  });
}

export function useRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await api.post(`/admin/kyc/${id}/reject`, { reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-kyc"] }),
  });
}

export function useUpdateAdminKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }) => (await api.put(`/admin/kyc/${id}`, data)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user"] });
      qc.invalidateQueries({ queryKey: ["user-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useUnlockKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) => (await api.post(`/admin/kyc/${id}/unlock`, { reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-user"] });
      qc.invalidateQueries({ queryKey: ["user-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useBatchApproveKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids }) => (await api.post("/admin/kyc/batch-approve", { ids })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useBatchRejectKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, reason }) => (await api.post("/admin/kyc/batch-reject", { ids, reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });
}

export function useBatchSetKycStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status, reason, note }) =>
      (await api.post("/admin/kyc/batch-set-status", { ids, status, reason: reason || note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

// Fetch a protected KYC document as an object URL (admin-authenticated).
export async function fetchAdminKycDocUrl(docId) {
  try {
    const res = await api.get(`/admin/kyc/documents/${docId}`, { responseType: "blob" });
    if (!res?.data || (res.data.type && res.data.type.includes("application/json"))) {
      throw new Error("Invalid document response");
    }
    return URL.createObjectURL(res.data);
  } catch (err) {
    throw err;
  }
}

export function useAdminReferrals() {
  return useQuery({
    queryKey: ["admin-referrals"],
    queryFn: async () => (await api.get("/admin/referrals")).data,
    refetchInterval: 30000,
  });
}

/* ------------------------- Users (view / suspend) ------------------------- */
export function useAdminUsers({ status, q } = {}) {
  return useQuery({
    queryKey: ["admin-users", status || "all", q || ""],
    queryFn: async () => {
      const params = {};
      if (status) params.status = status;
      if (q) params.q = q;
      return (await api.get("/admin/users", { params })).data;
    },
    refetchInterval: 30000,
  });
}

export function useAdminUser(id) {
  return useQuery({
    queryKey: ["admin-user", id],
    queryFn: async () => (await api.get(`/admin/users/${id}`)).data,
    enabled: Boolean(id),
    refetchInterval: 15000,
  });
}

export function useSuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, reason }) =>
      (await api.post(`/admin/users/${id}/suspend`, { reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useUnsuspendUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => (await api.post(`/admin/users/${id}/unsuspend`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-users"] }),
  });
}

export function useBatchSetUserStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status, reason }) =>
      (await api.post("/admin/users/batch-set-status", { ids, status, reason })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-kyc"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

/* ------------------------- Maintenance mode ------------------------- */
export function useAdminMaintenance() {
  return useQuery({
    queryKey: ["admin-maintenance"],
    queryFn: async () => (await api.get("/admin/maintenance")).data,
  });
}

export function useSaveMaintenance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch) => (await api.put("/admin/maintenance", patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-maintenance"] });
      qc.invalidateQueries({ queryKey: ["public-maintenance"] });
    },
  });
}

/* ------------------------- Admin Wallet & Adjustments ------------------------- */
export function useAdminWalletTransactions({ user_id, type, direction, q } = {}) {
  return useQuery({
    queryKey: ["admin-wallet-transactions", user_id || "", type || "", direction || "", q || ""],
    queryFn: async () => {
      const params = {};
      if (user_id) params.user_id = user_id;
      if (type) params.type = type;
      if (direction) params.direction = direction;
      if (q) params.q = q;
      return (await api.get("/admin/wallet/transactions", { params })).data;
    },
    refetchInterval: 15000,
  });
}

export function useAdminAdjustWallet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ user_id, amount, direction, reason, note, idempotency_key }) =>
      (
        await api.post("/admin/wallet/adjust", {
          user_id,
          amount,
          direction,
          reason,
          note,
          idempotency_key,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-wallet-transactions"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
    },
  });
}

/* ------------------------- Audit logs ------------------------- */
export function useAdminAuditLogs({ action, entity_type, decision, q, from_date, to_date } = {}) {
  return useQuery({
    queryKey: [
      "admin-audit-logs",
      action || "all",
      entity_type || "all",
      decision || "all",
      q || "",
      from_date || "",
      to_date || "",
    ],
    queryFn: async () => {
      const params = {};
      if (action && action !== "all") params.action = action;
      if (entity_type && entity_type !== "all") params.entity_type = entity_type;
      if (decision && decision !== "all") params.decision = decision;
      if (q) params.q = q;
      if (from_date) params.from_date = from_date;
      if (to_date) params.to_date = to_date;
      return (await api.get("/admin/audit-logs", { params })).data;
    },
    refetchInterval: 15000,
  });
}

// Download Audit Logs (CSV or XLSX)
export async function downloadAuditLogs(format = "csv", filters = {}) {
  const params = { format };
  if (filters.action && filters.action !== "all") params.action = filters.action;
  if (filters.entity_type && filters.entity_type !== "all") params.entity_type = filters.entity_type;
  if (filters.decision && filters.decision !== "all") params.decision = filters.decision;
  if (filters.q) params.q = filters.q;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;

  const res = await api.get("/admin/audit-logs", {
    params,
    responseType: "blob",
  });
  let filename = `easyx-audit-logs-${new Date().toISOString().slice(0, 10)}.${format}`;
  const cd = res.headers?.["content-disposition"];
  if (cd) {
    const m = /filename="?([^"]+)"?/.exec(cd);
    if (m) filename = m[1];
  }
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/* ------------------------- Reports / Exports ------------------------- */
export function useAdminReports() {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await api.get("/admin/reports")).data,
  });
}

export function useAdminReportData({ dataset, q, status, from_date, to_date } = {}) {
  return useQuery({
    queryKey: ["admin-report-data", dataset || "users", q || "", status || "", from_date || "", to_date || ""],
    queryFn: async () => {
      const params = { format: "json" };
      if (q) params.q = q;
      if (status && status !== "all") params.status = status;
      if (from_date) params.from_date = from_date;
      if (to_date) params.to_date = to_date;
      return (await api.get(`/admin/reports/${dataset || "users"}`, { params })).data;
    },
    enabled: Boolean(dataset),
    refetchInterval: 15000,
  });
}

// Trigger a browser download of a dataset export (CSV or XLSX) with filters.
export async function downloadReport(dataset, format = "csv", filters = {}) {
  const params = { format };
  if (filters.q) params.q = filters.q;
  if (filters.status && filters.status !== "all") params.status = filters.status;
  if (filters.from_date) params.from_date = filters.from_date;
  if (filters.to_date) params.to_date = filters.to_date;

  const res = await api.get(`/admin/reports/${dataset}`, {
    params,
    responseType: "blob",
  });
  // Derive filename from Content-Disposition when available.
  let filename = `easyx-${dataset}-${new Date().toISOString().slice(0, 10)}.${format}`;
  const cd = res.headers?.["content-disposition"];
  if (cd) {
    const m = /filename="?([^"]+)"?/.exec(cd);
    if (m) filename = m[1];
  }
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return filename;
}

/* Public maintenance status (no auth) — used by auth screens. */
export function usePublicMaintenance() {
  return useQuery({
    queryKey: ["public-maintenance"],
    queryFn: async () => (await api.get("/maintenance")).data,
    refetchInterval: 60000,
  });
}

/* ------------------------- Overview / KPIs ------------------------- */
export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => (await api.get("/admin/overview")).data,
    refetchInterval: 30000,
  });
}

/* ------------------------- Investment plans ------------------------- */
export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => (await api.get("/admin/plans")).data,
  });
}

export function useSavePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, patch }) => (await api.put(`/admin/plans/${key}`, patch)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-plans"] }),
  });
}

export function usePlanHistory(key) {
  return useQuery({
    queryKey: ["admin-plan-history", key],
    queryFn: async () => (await api.get(`/admin/plans/${key}/history`)).data,
    enabled: !!key,
  });
}

/* ------------------------- Investments (cancel) ------------------------- */
export function useAdminInvestments({ status, q } = {}) {
  return useQuery({
    queryKey: ["admin-investments", status || "all", q || ""],
    queryFn: async () => {
      const params = {};
      if (status) params.status = status;
      if (q) params.q = q;
      return (await api.get("/admin/investments", { params })).data;
    },
    refetchInterval: 30000,
  });
}

export function useCancelInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, refund_amount, reason }) =>
      (await api.post(`/admin/investments/${id}/cancel`, { refund_amount, reason })).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-investments"] }),
  });
}

/* ------------------------- Withdrawals ------------------------- */
export function useAdminWithdrawals({ status } = {}) {
  return useQuery({
    queryKey: ["admin-withdrawals", status || "all"],
    queryFn: async () => {
      const params = {};
      if (status) params.status = status;
      return (await api.get("/admin/withdrawals", { params })).data;
    },
    refetchInterval: 20000,
  });
}

export function useWithdrawalAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action, body }) =>
      (await api.post(`/admin/withdrawals/${id}/${action}`, body || {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }),
  });
}

export function useBatchSetWithdrawalStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, status, note, reason, tx_hash }) =>
      (await api.post("/admin/withdrawals/batch-set-status", { ids, status, note: note || reason, tx_hash })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-overview"] });
    },
  });
}

/* ------------------------- Analytics & Growth Trends (Recharts) ------------------------- */
export function useAdminAnalyticsTrends(period = "30d") {
  return useQuery({
    queryKey: ["admin-analytics-trends", period],
    queryFn: async () => (await api.get("/admin/analytics/trends", { params: { period } })).data,
    refetchInterval: 30000,
  });
}

/* ------------------------- UX Friction & Error Telemetry ------------------------- */
export function useAdminUxAnalyticsSummary() {
  return useQuery({
    queryKey: ["admin-ux-analytics-summary"],
    queryFn: async () => (await api.get("/admin/analytics/summary")).data,
    refetchInterval: 8000,
  });
}

export function useAdminErrorFrequency(days = 7) {
  return useQuery({
    queryKey: ["admin-error-frequency", days],
    queryFn: async () => (await api.get("/admin/analytics/errors/frequency", { params: { days } })).data,
    refetchInterval: 8000,
  });
}

export function useAdminErrorLogs(params = {}) {
  return useQuery({
    queryKey: ["admin-error-logs", params],
    queryFn: async () => (await api.get("/admin/analytics/errors", { params })).data,
    refetchInterval: 8000,
  });
}

export function useAdminGroupedErrors(params = {}) {
  return useQuery({
    queryKey: ["admin-grouped-errors", params],
    queryFn: async () => (await api.get("/admin/analytics/errors/grouped", { params })).data,
    refetchInterval: 8000,
  });
}

export function useAdminUpdateGroupedErrorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fingerprint, status, note }) =>
      (await api.patch(`/admin/analytics/errors/grouped/${fingerprint}`, { status, note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-error-frequency"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export function useAdminUpdateErrorStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) =>
      (await api.patch(`/admin/analytics/errors/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
      qc.invalidateQueries({ queryKey: ["admin-error-frequency"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export function useResolveErrorLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, resolved }) =>
      (await api.post(`/admin/analytics/errors/${id}/resolve`, { resolved })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
      qc.invalidateQueries({ queryKey: ["admin-error-frequency"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export function useClearErrorLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ resolvedOnly } = {}) =>
      (await api.delete("/admin/analytics/errors", { params: { resolved: resolvedOnly ? "true" : "false" } })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
      qc.invalidateQueries({ queryKey: ["admin-error-frequency"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export function useAdminFunnelsDeepDive(name) {
  return useQuery({
    queryKey: ["admin-funnels-deep-dive", name || "all"],
    queryFn: async () => (await api.get("/admin/analytics/funnels", { params: { name } })).data,
    refetchInterval: 12000,
  });
}

export function useAdminUserJourney(userId) {
  return useQuery({
    queryKey: ["admin-user-journey", userId],
    queryFn: async () => (await api.get(`/admin/analytics/users/${userId}/journey`)).data,
    enabled: Boolean(userId),
    staleTime: 5000,
  });
}

export function useAdminFailedActions(limit = 30) {
  return useQuery({
    queryKey: ["admin-failed-actions", limit],
    queryFn: async () => (await api.get("/admin/analytics/failed-actions", { params: { limit } })).data,
    refetchInterval: 10000,
  });
}

export function useAdminMonitoringSettings() {
  return useQuery({
    queryKey: ["admin-monitoring-settings"],
    queryFn: async () => (await api.get("/admin/analytics/settings")).data,
    staleTime: 30000,
  });
}

export function useSaveAdminMonitoringSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put("/admin/analytics/settings", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-monitoring-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export function usePruneMonitoringData() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ days } = {}) => (await api.post("/admin/analytics/prune", { days })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
    },
  });
}

export async function exportMonitoringData({ type = "errors", format = "csv" } = {}) {
  const res = await api.get("/admin/analytics/export", {
    params: { type, format },
    responseType: format === "csv" ? "blob" : "json",
  });

  if (format === "csv") {
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `easyx_${type}_export.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } else {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `easyx_${type}_export.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

export function useTriggerTestAnalyticsEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ type, severity, message }) =>
      (await api.post("/admin/analytics/test-event", { type, severity, message })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-ux-analytics-summary"] });
      qc.invalidateQueries({ queryKey: ["admin-error-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-grouped-errors"] });
    },
  });
}

/* ------------------------- Automated Reminder Notifications ------------------------- */
export function useAdminReminderSettings() {
  return useQuery({
    queryKey: ["admin-reminder-settings"],
    queryFn: async () => (await api.get("/admin/reminders/settings")).data,
    staleTime: 30000,
  });
}

export function useSaveAdminReminderSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put("/admin/reminders/settings", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reminder-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-reminder-analytics"] });
    },
  });
}

export function useUpdateAdminReminderWorkflow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, patch }) =>
      (await api.put(`/admin/reminders/workflows/${key}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reminder-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-reminder-analytics"] });
    },
  });
}

export function useAdminReminderAnalytics() {
  return useQuery({
    queryKey: ["admin-reminder-analytics"],
    queryFn: async () => (await api.get("/admin/reminders/analytics")).data,
    refetchInterval: 10000,
  });
}

export function useAdminReminderLogs(params = {}) {
  return useQuery({
    queryKey: ["admin-reminder-logs", params],
    queryFn: async () => (await api.get("/admin/reminders/logs", { params })).data,
    refetchInterval: 10000,
  });
}

export function useRunReminderSweep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/admin/reminders/run-sweep")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reminder-analytics"] });
      qc.invalidateQueries({ queryKey: ["admin-reminder-logs"] });
    },
  });
}

export function useSendTestReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/admin/reminders/test", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reminder-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-notification-logs"] });
    },
  });
}

/* ------------------------- Unified Notification Center (Personalized, Bulk, Automated) ------------------------- */
export function useAdminNotificationSegments() {
  return useQuery({
    queryKey: ["admin-notification-segments"],
    queryFn: async () => (await api.get("/admin/notifications/segments")).data,
    refetchInterval: 15000,
  });
}

export function useAdminNotificationSegmentPreview() {
  return useMutation({
    mutationFn: async ({ segment_id }) =>
      (await api.post("/admin/notifications/segments/preview", { segment_id })).data,
  });
}

export function useSendPersonalizedNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/admin/notifications/send-personalized", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notification-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-notification-analytics"] });
    },
  });
}

export function useSendBulkNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/admin/notifications/send-bulk", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-notification-logs"] });
      qc.invalidateQueries({ queryKey: ["admin-notification-analytics"] });
      qc.invalidateQueries({ queryKey: ["admin-notification-segments"] });
    },
  });
}

export function useAdminUnifiedNotificationLogs(params = {}) {
  return useQuery({
    queryKey: ["admin-notification-logs", params],
    queryFn: async () => (await api.get("/admin/notifications/logs", { params })).data,
    refetchInterval: 8000,
  });
}

export function useAdminUnifiedNotificationAnalytics() {
  return useQuery({
    queryKey: ["admin-notification-analytics"],
    queryFn: async () => (await api.get("/admin/notifications/analytics")).data,
    refetchInterval: 10000,
  });
}

/* -------------------- Admin Support Hooks -------------------- */

export function useAdminSupportTickets(params = {}) {
  return useQuery({
    queryKey: ["admin-support-tickets", params],
    queryFn: async () => (await api.get("/admin/support/tickets", { params })).data,
    refetchInterval: 10000,
  });
}

export function useAdminSupportTicket(ticketId) {
  return useQuery({
    queryKey: ["admin-support-ticket", ticketId],
    queryFn: async () => (await api.get(`/admin/support/tickets/${ticketId}`)).data,
    enabled: Boolean(ticketId),
    refetchInterval: 5000,
  });
}

export function useAdminReplySupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, message, text, status, attachments }) =>
      (await api.post(`/admin/support/tickets/${ticketId}/reply`, { message, text, status, attachments })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminUpdateSupportTicketStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, status, note }) =>
      (await api.patch(`/admin/support/tickets/${ticketId}/status`, { status, note })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminAssignSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, admin_id }) =>
      (await api.patch(`/admin/support/tickets/${ticketId}/assign`, { admin_id })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminAddInternalNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, note, message, attachments }) =>
      (await api.post(`/admin/support/tickets/${ticketId}/notes`, { note, message, attachments })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminUpdateSupportTicketPriority() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, priority }) =>
      (await api.patch(`/admin/support/tickets/${ticketId}/priority`, { priority })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminEscalateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, reason, priority }) =>
      (await api.post(`/admin/support/tickets/${ticketId}/escalate`, { reason, priority })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      qc.invalidateQueries({ queryKey: ["admin-support-timeline", variables.ticketId] });
    },
  });
}

export function useAdminSupportTicketTimeline(ticketId) {
  return useQuery({
    queryKey: ["admin-support-timeline", ticketId],
    queryFn: async () => (await api.get(`/admin/support/tickets/${ticketId}/timeline`)).data,
    enabled: Boolean(ticketId),
    refetchInterval: 10000,
  });
}

export function useAdminSupportSlaConfig() {
  return useQuery({
    queryKey: ["admin-support-sla-config"],
    queryFn: async () => (await api.get("/admin/support/sla/config")).data,
    staleTime: 30000,
  });
}

export function useAdminUpdateSupportSlaConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put("/admin/support/sla/config", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-sla-config"] });
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

export function useAdminEvaluateSupportSla() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/admin/support/sla/evaluate")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
  });
}

// ==================== ADMIN FAQ & HELP CENTER HOOKS ====================

export function useAdminSupportFaqs(params = {}) {
  const { category, status, search } = params;
  return useQuery({
    queryKey: ["admin-support-faqs", category || "ALL", status || "ALL", search || ""],
    queryFn: async () => {
      const queryParams = {};
      if (category && category !== "ALL") queryParams.category = category;
      if (status && status !== "ALL") queryParams.status = status;
      if (search && search.trim()) queryParams.search = search.trim();
      return (await api.get("/admin/support/faqs", { params: queryParams })).data;
    },
  });
}

export function useAdminSupportFaqAnalytics() {
  return useQuery({
    queryKey: ["admin-support-faq-analytics"],
    queryFn: async () => (await api.get("/admin/support/faqs/analytics")).data,
  });
}

export function useAdminCreateSupportFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/admin/support/faqs", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-faqs"] });
      qc.invalidateQueries({ queryKey: ["admin-support-faq-analytics"] });
      qc.invalidateQueries({ queryKey: ["support-faqs"] });
    },
  });
}

export function useAdminUpdateSupportFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.put(`/admin/support/faqs/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-faqs"] });
      qc.invalidateQueries({ queryKey: ["admin-support-faq-analytics"] });
      qc.invalidateQueries({ queryKey: ["support-faqs"] });
    },
  });
}

export function useAdminToggleSupportFaqPublish() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_published }) =>
      (await api.patch(`/admin/support/faqs/${id}/publish`, { is_published })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-faqs"] });
      qc.invalidateQueries({ queryKey: ["admin-support-faq-analytics"] });
      qc.invalidateQueries({ queryKey: ["support-faqs"] });
    },
  });
}

export function useAdminDeleteSupportFaq() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/admin/support/faqs/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-faqs"] });
      qc.invalidateQueries({ queryKey: ["admin-support-faq-analytics"] });
      qc.invalidateQueries({ queryKey: ["support-faqs"] });
    },
  });
}

// ==================== ADMIN AI ASSISTANT HOOKS ====================

export function useAdminSupportAiSettings() {
  return useQuery({
    queryKey: ["admin-support-ai-settings"],
    queryFn: async () => (await api.get("/admin/support/ai/settings")).data,
    staleTime: 30000,
  });
}

export function useAdminUpdateSupportAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.put("/admin/support/ai/settings", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ai-settings"] });
      qc.invalidateQueries({ queryKey: ["admin-support-ai-analytics"] });
      qc.invalidateQueries({ queryKey: ["support-ai-settings"] });
    },
  });
}

export function useAdminSupportAiConversations(params = {}) {
  return useQuery({
    queryKey: ["admin-support-ai-conversations", params],
    queryFn: async () => (await api.get("/admin/support/ai/conversations", { params })).data,
    staleTime: 15000,
  });
}

export function useAdminSupportAiConversation(id) {
  return useQuery({
    queryKey: ["admin-support-ai-conversation", id],
    queryFn: async () => (await api.get(`/admin/support/ai/conversations/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useAdminSupportAiUnanswered(params = {}) {
  return useQuery({
    queryKey: ["admin-support-ai-unanswered", params],
    queryFn: async () => (await api.get("/admin/support/ai/unanswered", { params })).data,
    staleTime: 15000,
  });
}

export function useAdminUpdateSupportAiUnanswered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) =>
      (await api.patch(`/admin/support/ai/unanswered/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-support-ai-unanswered"] });
      qc.invalidateQueries({ queryKey: ["admin-support-ai-analytics"] });
    },
  });
}

export function useAdminSupportAiAnalytics() {
  return useQuery({
    queryKey: ["admin-support-ai-analytics"],
    queryFn: async () => (await api.get("/admin/support/ai/analytics")).data,
    staleTime: 30000,
  });
}

// ==================== SUPPORT ANALYTICS & REPORTING ====================

export function useAdminSupportAnalytics(params = {}) {
  return useQuery({
    queryKey: ["admin-support-analytics", params],
    queryFn: async () => (await api.get("/admin/support/analytics", { params })).data,
    staleTime: 30000,
  });
}

export async function exportAdminSupportAnalytics(params = {}) {
  const format = params.format || "csv";
  const res = await api.get("/admin/support/analytics/export", {
    params: { ...params, format },
    responseType: format === "csv" ? "blob" : "json",
  });

  if (format === "csv") {
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `easyx_support_analytics_${params.range || "period"}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } else {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `easyx_support_analytics_${params.range || "period"}.json`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

// ==================== DATABASE BACKUP & RECOVERY SYSTEM ====================

export function useAdminBackups() {
  return useQuery({
    queryKey: ["admin-backups"],
    queryFn: async () => (await api.get("/admin/backups")).data,
    refetchInterval: 30000,
  });
}

export function useAdminBackupOverview() {
  return useQuery({
    queryKey: ["admin-backup-overview"],
    queryFn: async () => (await api.get("/admin/backups/overview")).data,
    refetchInterval: 30000,
  });
}

export function useCreateAdminBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ note } = {}) => (await api.post("/admin/backups/create", { note })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      qc.invalidateQueries({ queryKey: ["admin-backup-overview"] });
    },
  });
}

export function useTestRestoreBackup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }) => (await api.post(`/admin/backups/${id}/test-restore`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      qc.invalidateQueries({ queryKey: ["admin-backup-overview"] });
    },
  });
}

export function useUpdateBackupSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings) => (await api.put("/admin/backups/settings", settings)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-backups"] });
      qc.invalidateQueries({ queryKey: ["admin-backup-overview"] });
    },
  });
}

// ==================== PROMOTIONS & MEDIA MANAGEMENT ====================

export function useAdminPromotions() {
  return useQuery({
    queryKey: ["admin-promotions"],
    queryFn: async () => (await api.get("/admin/promotions")).data,
    refetchInterval: 20000,
  });
}

export function useCreateAdminPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/admin/promotions", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useUpdateAdminPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }) => (await api.put(`/admin/promotions/${id}`, patch)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useSetAdminPromotionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }) => (await api.patch(`/admin/promotions/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useDeleteAdminPromotion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/admin/promotions/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useReorderAdminPromotions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered_ids) => (await api.post("/admin/promotions/reorder", { ordered_ids })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}

export function useResetAdminPromotions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/admin/promotions/reset")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-promotions"] });
      qc.invalidateQueries({ queryKey: ["promotions"] });
    },
  });
}










