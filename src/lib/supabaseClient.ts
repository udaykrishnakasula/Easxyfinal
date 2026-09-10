import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Client-side environment variables
const env = (import.meta as any).env || {};
const rawUrl = (env.VITE_SUPABASE_URL || "").trim();
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
const supabaseAnonKey = (env.VITE_SUPABASE_ANON_KEY || "").trim();

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseAnonKey.length > 20
  );
};

let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }
  if (!clientInstance) {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();

/**
 * Realtime subscription helper for user-specific events (e.g. notifications, balance updates)
 */
export function subscribeToUserEvents(
  userId: string,
  onUpdate: (payload: any) => void
) {
  const client = getSupabaseClient();
  if (!client || !userId) return () => {};

  const channel = client
    .channel(`user-events-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: "notification", data: payload })
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "wallets",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: "wallet", data: payload })
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "withdrawals",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: "withdrawal", data: payload })
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "kyc_records",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate({ type: "kyc", data: payload })
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}

/**
 * Realtime subscription helper for administrative queue changes
 */
export function subscribeToAdminEvents(onUpdate: (payload: any) => void) {
  const client = getSupabaseClient();
  if (!client) return () => {};

  const channel = client
    .channel("admin-operational-events")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "payment_deposits",
      },
      (payload) => onUpdate({ type: "deposit", data: payload })
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "withdrawals",
      },
      (payload) => onUpdate({ type: "withdrawal", data: payload })
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "kyc_records",
      },
      (payload) => onUpdate({ type: "kyc", data: payload })
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
