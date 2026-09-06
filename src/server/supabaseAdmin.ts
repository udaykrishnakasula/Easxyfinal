import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim();
const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

let adminClient: SupabaseClient | null = null;

export const isSupabaseAdminConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl.startsWith("https://") &&
    supabaseServiceKey.length > 20
  );
};

export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseAdminConfigured()) {
    return null;
  }
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return adminClient;
}

/**
 * Diagnostic health check for Supabase connection
 */
export async function checkSupabaseConnection(): Promise<{
  configured: boolean;
  connected: boolean;
  message: string;
  tablesFound?: string[];
}> {
  if (!isSupabaseAdminConfigured()) {
    return {
      configured: false,
      connected: false,
      message: "Supabase environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) are not set in environment.",
    };
  }

  try {
    const client = getSupabaseAdmin();
    if (!client) {
      return {
        configured: false,
        connected: false,
        message: "Failed to initialize Supabase admin client.",
      };
    }

    const { data, error } = await client
      .from("investment_plans")
      .select("key, name, is_active")
      .limit(5);

    if (error) {
      return {
        configured: true,
        connected: false,
        message: `Connected to Supabase endpoint, but table query returned: ${error.message}. Please run migrations.`,
      };
    }

    return {
      configured: true,
      connected: true,
      message: "Successfully connected to Supabase and verified schema.",
      tablesFound: (data || []).map((p: any) => p.name),
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      message: `Supabase connection test failed with exception: ${err.message || String(err)}`,
    };
  }
}
