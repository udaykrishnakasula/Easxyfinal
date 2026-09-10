import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import api, { getToken } from "@/shared/lib/api";

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
    refetchInterval: 15000,
    refetchIntervalInBackground: false,
  });
}

export function usePromotions() {
  return useQuery({
    queryKey: ["promotions"],
    queryFn: async () => (await api.get("/promotions")).data,
    staleTime: 30000,
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
  const token = typeof window !== "undefined" ? getToken() : null;
  return useQuery({
    queryKey: ["notifications", unreadOnly ? "unread" : "all"],
    queryFn: async () => {
      try {
        const t = getToken();
        if (!t) return [];
        const res = await api.get("/notifications", { params: unreadOnly ? { unread_only: true } : {} });
        const data = res?.data;
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.notifications)) return data.notifications;
        if (Array.isArray(data?.data)) return data.data;
        if (typeof data === "string" && data.trim().startsWith("[")) {
          try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      } catch {
        return [];
      }
    },
    enabled: !!token,
    refetchInterval: token ? 30000 : false,
    initialData: [],
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
    refetchIntervalInBackground: false,
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

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ["user-notification-preferences"],
    queryFn: async () => (await api.get("/user/notification-preferences")).data,
  });
}

export function useSaveNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (prefs) => (await api.put("/user/notification-preferences", prefs)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notification-preferences"] });
    },
  });
}

export function useSubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (subscription) => (await api.post("/user/push-subscription", { subscription })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notification-preferences"] });
    },
  });
}

export function useUnsubscribePush() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => (await api.delete("/user/push-subscription")).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user-notification-preferences"] });
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
      if (idFrontDocument) {
        form.append("id_front_document", idFrontDocument, idFrontDocument.name || "id_front.jpg");
      }
      if (idBackDocument) {
        form.append("id_back_document", idBackDocument, idBackDocument.name || "id_back.jpg");
      }
      if (idDocument) {
        form.append("id_document", idDocument, idDocument.name || "id_document.jpg");
      }
      if (selfie) {
        form.append("selfie", selfie, selfie.name || "selfie.jpg");
      }
      if (livenessSessionId) {
        form.append("liveness_session_id", String(livenessSessionId).trim());
      }
      
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

export function usePublicMaintenance() {
  return useQuery({
    queryKey: ["public-maintenance"],
    queryFn: async () => (await api.get("/maintenance")).data,
    refetchInterval: 20000,
  });
}

export function useAppBranding() {
  return useQuery({
    queryKey: ["app-branding"],
    queryFn: async () => (await api.get("/branding")).data,
    staleTime: 30000,
  });
}

/* -------------------- User Profile & Account Settings -------------------- */

export const updateUserProfile = async (payload) => {
  const res = await api.put("/user/profile", payload);
  return res.data;
};

export const changeUserPassword = async (payload) => {
  const res = await api.post("/user/change-password", payload);
  return res.data;
};

export const money = (v) => `$${Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/* -------------------- User Support Hooks -------------------- */

export function useSupportTickets(filters = {}) {
  return useQuery({
    queryKey: ["support-tickets", filters],
    queryFn: async () => (await api.get("/support/tickets", { params: filters })).data,
    refetchInterval: 10000,
  });
}

export function useSupportTicket(ticketId) {
  return useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: async () => (await api.get(`/support/tickets/${ticketId}`)).data,
    enabled: Boolean(ticketId),
    refetchInterval: 5000,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/support/tickets", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useSendSupportMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, message, text, attachments }) =>
      (await api.post(`/support/tickets/${ticketId}/messages`, { message, text, attachments })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useMarkSupportTicketRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticketId) =>
      (await api.post(`/support/tickets/${ticketId}/messages/read`)).data,
    onSuccess: (_, ticketId) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useCloseSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, feedback }) =>
      (await api.post(`/support/tickets/${ticketId}/close`, { feedback })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useReopenSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, reason, message }) =>
      (await api.post(`/support/tickets/${ticketId}/reopen`, { reason, message })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useSupportTicketTimeline(ticketId) {
  return useQuery({
    queryKey: ["support-ticket-timeline", ticketId],
    queryFn: async () => (await api.get(`/support/tickets/${ticketId}/timeline`)).data,
    enabled: Boolean(ticketId),
    staleTime: 10000,
  });
}

// ==================== FAQ & HELP CENTER HOOKS ====================

export function useSupportFaqs(params = {}) {
  const { category, search, popular, limit } = params;
  return useQuery({
    queryKey: ["support-faqs", category || "ALL", search || "", popular || false, limit || 0],
    queryFn: async () => {
      const queryParams = {};
      if (category && category !== "ALL") queryParams.category = category;
      if (search && search.trim()) queryParams.search = search.trim();
      if (popular) queryParams.popular = "true";
      if (limit) queryParams.limit = limit;
      return (await api.get("/support/faqs", { params: queryParams })).data;
    },
    staleTime: 30000,
  });
}

export function useSupportFaqCategories() {
  return useQuery({
    queryKey: ["support-faq-categories"],
    queryFn: async () => (await api.get("/support/faqs/categories")).data,
    staleTime: 60000,
  });
}

export function useSupportFaq(id) {
  return useQuery({
    queryKey: ["support-faq", id],
    queryFn: async () => (await api.get(`/support/faqs/${id}`)).data,
    enabled: Boolean(id),
  });
}

export function useRecordFaqView() {
  return useMutation({
    mutationFn: async (id) => (await api.post(`/support/faqs/${id}/view`)).data,
  });
}

// ==================== SUPPORT AI ASSISTANT HOOKS ====================

export function useSupportAiSettings() {
  return useQuery({
    queryKey: ["support-ai-settings"],
    queryFn: async () => (await api.get("/support/ai/settings")).data,
    staleTime: 60000,
  });
}

export function useSupportAiConversation(conversationId) {
  return useQuery({
    queryKey: ["support-ai-conversation", conversationId],
    queryFn: async () => (await api.get(`/support/ai/conversations/${conversationId}`)).data,
    enabled: Boolean(conversationId),
  });
}

export function useSupportAiSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversation_id, message }) =>
      (await api.post("/support/ai/chat", { conversation_id, message })).data,
    onSuccess: (data) => {
      if (data?.conversation?.id) {
        qc.setQueryData(["support-ai-conversation", data.conversation.id], {
          ok: true,
          conversation: data.conversation,
        });
      }
    },
  });
}

export function useSupportAiEscalate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => (await api.post("/support/ai/escalate", payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}

export function useSupportAiFeedback() {
  return useMutation({
    mutationFn: async ({ conversation_id, message_id, feedback }) =>
      (await api.post("/support/ai/feedback", { conversation_id, message_id, feedback })).data,
  });
}

// ==================== SUPPORT CSAT RATING HOOK ====================

export function useRateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ ticketId, rating, comment }) =>
      (await api.post(`/support/tickets/${ticketId}/rate`, { rating, comment })).data,
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["support-ticket", variables.ticketId] });
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });
}




