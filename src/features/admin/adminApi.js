import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";

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

export function useAdminDepositSettings() {
  return useQuery({
    queryKey: ["admin-deposit-settings"],
    queryFn: async () => (await api.get("/admin/settings/deposit")).data,
  });
}

export function useSaveDepositAddresses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ trc20, bep20 }) =>
      (await api.put("/admin/settings/deposit", { trc20, bep20 })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-deposit-settings"] });
      qc.invalidateQueries({ queryKey: ["deposit-config"] });
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

/* ------------------------- Audit logs ------------------------- */
export function useAdminAuditLogs({ action, entity_type } = {}) {
  return useQuery({
    queryKey: ["admin-audit-logs", action || "all", entity_type || "all"],
    queryFn: async () => {
      const params = {};
      if (action) params.action = action;
      if (entity_type) params.entity_type = entity_type;
      return (await api.get("/admin/audit-logs", { params })).data;
    },
    refetchInterval: 30000,
  });
}

/* ------------------------- Reports / Exports ------------------------- */
export function useAdminReports() {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => (await api.get("/admin/reports")).data,
  });
}

// Trigger a browser download of a dataset export (CSV or XLSX).
export async function downloadReport(dataset, format = "csv") {
  const res = await api.get(`/admin/reports/${dataset}`, {
    params: { format },
    responseType: "blob",
  });
  // Derive filename from Content-Disposition when available.
  let filename = `easyx-${dataset}.${format}`;
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
