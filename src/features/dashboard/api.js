import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { getToken } from "@/lib/api";

export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get("/dashboard")).data,
  });
}

export function useWallet() {
  return useQuery({ queryKey: ["wallet"], queryFn: async () => (await api.get("/wallet")).data });
}

export function useInvestments(planKey) {
  return useQuery({
    queryKey: ["investments", planKey || "all"],
    queryFn: async () =>
      (await api.get("/investments", { params: planKey ? { plan_key: planKey } : {} })).data,
  });
}

export function useInvestment(id) {
  return useQuery({
    queryKey: ["investment", id],
    queryFn: async () => (await api.get(`/investments/${id}`)).data,
    enabled: !!id,
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => (await api.get("/transactions")).data,
  });
}

export function useRewardsFeed() {
  return useQuery({
    queryKey: ["rewards-feed"],
    queryFn: async () => (await api.get("/rewards/feed", { params: { limit: 30 } })).data,
    refetchInterval: 8000, // near real-time polling
    refetchIntervalInBackground: true,
  });
}

export function useDepositConfig() {
  return useQuery({
    queryKey: ["deposit-config"],
    queryFn: async () => (await api.get("/deposits/config")).data,
  });
}

export function useMyDeposits() {
  return useQuery({
    queryKey: ["my-deposits"],
    queryFn: async () => (await api.get("/deposits")).data,
  });
}

export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ network, amount, tx_hash, proof_images }) =>
      (await api.post("/deposits", { network, amount, tx_hash, proof_images })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-deposits"] });
    },
  });
}

export function useWithdrawConfig() {
  return useQuery({
    queryKey: ["withdraw-config"],
    queryFn: async () => (await api.get("/withdrawals/config")).data,
  });
}

export function useMyWithdrawals() {
  return useQuery({
    queryKey: ["my-withdrawals"],
    queryFn: async () => (await api.get("/withdrawals")).data,
    refetchInterval: 30000,
  });
}

export function useCreateWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ network, amount, to_address }) =>
      (await api.post("/withdrawals", { network, amount, to_address })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useNotifications(unreadOnly = false) {
  return useQuery({
    queryKey: ["notifications", unreadOnly ? "unread" : "all"],
    queryFn: async () =>
      (await api.get("/notifications", { params: unreadOnly ? { unread_only: true } : {} })).data,
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  const token = typeof window !== "undefined" ? getToken() : null;
  return useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: async () => {
      try {
        const t = getToken();
        if (!t) return 0;
        const res = await api.get("/notifications/unread-count");
        const count = res?.data?.count ?? res?.data?.unread_count ?? (typeof res?.data === "number" ? res.data : 0);
        return typeof count === "number" && !isNaN(count) ? count : 0;
      } catch {
        return 0;
      }
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
    refetchIntervalInBackground: true,
    initialData: 0,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.post(`/notifications/${id}/read`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.post("/notifications/read-all")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });
}

export function useBuyPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planKey, idempotencyKey }) => {
      // A STABLE key per purchase intent guarantees double-click / retry /
      // refresh of the SAME intent collapses to one investment on the backend.
      const idempotency_key =
        idempotencyKey ||
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        `${planKey}-${Date.now()}-${Math.random()}`;
      return (await api.post("/investments", { plan_key: planKey, idempotency_key })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["investments"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useReferralSummary() {
  return useQuery({
    queryKey: ["referral-summary"],
    queryFn: async () => (await api.get("/referrals/summary")).data,
  });
}

export function useKyc() {
  return useQuery({
    queryKey: ["kyc"],
    queryFn: async () => (await api.get("/kyc")).data,
  });
}

export function useSubmitKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      idType,
      idNumber,
      address,
      idDocument,
      idFrontDocument,
      idBackDocument,
      selfie,
      livenessSessionId,
      onProgress,
    }) => {
      const form = new FormData();
      form.append("id_type", idType);
      if (idNumber) form.append("id_number", String(idNumber).trim());
      if (address) {
        const cleanAddress = String(address).trim();
        form.append("address", cleanAddress);
        form.append("permanent_address", cleanAddress);
      }
      if (idFrontDocument) form.append("id_front_document", idFrontDocument, idFrontDocument.name || "id_front.jpg");
      if (idBackDocument) form.append("id_back_document", idBackDocument, idBackDocument.name || "id_back.jpg");
      if (idDocument) form.append("id_document", idDocument, idDocument.name || "id_document.jpg");
      if (selfie) form.append("selfie", selfie, selfie.name || "selfie.jpg");
      if (livenessSessionId) form.append("liveness_session_id", String(livenessSessionId).trim());
      const res = await api.post("/kyc/submit", form, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.min(99, Math.round((progressEvent.loaded * 100) / progressEvent.total));
            onProgress(percent);
          }
        },
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export const money = (v) => `$${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
