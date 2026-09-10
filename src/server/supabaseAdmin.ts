import { createClient, SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://dgelzeodcpouuhytdoft.supabase.co";

export function getResolvedSupabaseUrl(): string {
  const rawUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    process.env.SUPABASE_ENDPOINT ||
    DEFAULT_SUPABASE_URL
  ).trim();
  return rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

export function getResolvedServiceKey(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET ||
    process.env.SUPABASE_SECRET_KEY ||
    ""
  ).trim();
}

export function getResolvedAnonKey(): string {
  return (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLIC_KEY ||
    process.env.SUPABASE_KEY ||
    ""
  ).trim();
}

let adminClient: SupabaseClient | null = null;
let serverPublicClient: SupabaseClient | null = null;
let lastAdminKeyUsed = "";
let lastUrlUsed = "";

export const isSupabaseAdminConfigured = (): boolean => {
  const url = getResolvedSupabaseUrl();
  const serviceKey = getResolvedServiceKey();
  return Boolean(
    url &&
    serviceKey &&
    url.startsWith("https://") &&
    serviceKey.length > 20
  );
};

export const isSupabaseServerConfigured = (): boolean => {
  const url = getResolvedSupabaseUrl();
  const serviceKey = getResolvedServiceKey();
  const anonKey = getResolvedAnonKey();
  return Boolean(
    url &&
    (serviceKey || anonKey) &&
    url.startsWith("https://")
  );
};

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  const url = getResolvedSupabaseUrl();
  const serviceKey = getResolvedServiceKey();

  if (!adminClient || lastAdminKeyUsed !== serviceKey || lastUrlUsed !== url) {
    adminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    lastAdminKeyUsed = serviceKey;
    lastUrlUsed = url;
  }
  return adminClient;
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (isSupabaseAdminConfigured()) return getSupabaseAdmin();

  const url = getResolvedSupabaseUrl();
  const activeKey = getResolvedServiceKey() || getResolvedAnonKey();
  if (!url || !activeKey) return null;

  if (!serverPublicClient) {
    serverPublicClient = createClient(url, activeKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return serverPublicClient;
}

/**
 * Diagnostic health check for Supabase connection
 */
export async function checkSupabaseConnection(): Promise<{
  configured: boolean;
  hasAdminKey: boolean;
  connected: boolean;
  message: string;
  tablesFound?: string[];
}> {
  if (!isSupabaseServerConfigured()) {
    return {
      configured: false,
      hasAdminKey: false,
      connected: false,
      message: "Supabase environment variables (SUPABASE_URL, and either SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY) are not set in environment.",
    };
  }

  try {
    const client = getSupabaseServerClient();
    if (!client) {
      return {
        configured: false,
        hasAdminKey: isSupabaseAdminConfigured(),
        connected: false,
        message: "Failed to initialize Supabase server client.",
      };
    }

    const { data, error } = await client
      .from("investment_plans")
      .select("key, name, is_active")
      .limit(5);

    if (error) {
      // If table doesn't exist yet, it indicates connected to Supabase endpoint, but migrations need to be executed
      const url = getResolvedSupabaseUrl();
      return {
        configured: true,
        hasAdminKey: isSupabaseAdminConfigured(),
        connected: false,
        message: `Connected to Supabase endpoint (${url}), but table query returned: "${error.message}". Please run the SQL migration (supabase/migrations/20260901_easyx_initial_schema.sql) in your Supabase SQL Editor.`,
      };
    }

    const url = getResolvedSupabaseUrl();
    return {
      configured: true,
      hasAdminKey: isSupabaseAdminConfigured(),
      connected: true,
      message: `Successfully connected to Supabase (${url}) and verified schema.`,
      tablesFound: (data || []).map((p: any) => p.name),
    };
  } catch (err: any) {
    return {
      configured: true,
      hasAdminKey: isSupabaseAdminConfigured(),
      connected: false,
      message: `Supabase connection test failed with exception: ${err.message || String(err)}`,
    };
  }
}
