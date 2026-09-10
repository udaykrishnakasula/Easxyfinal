import { getSupabaseAdmin, isSupabaseAdminConfigured, getSupabaseServerClient } from "./supabaseAdmin";
import crypto from "crypto";

export interface CleanUserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "admin" | "user";
  status: "active" | "suspended" | "banned";
  email_verified: boolean;
  kyc_status: "none" | "pending" | "under_review" | "approved" | "rejected";
  referral_code: string;
  referred_by: string | null;
  two_factor_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
  permanent_address?: string | null;
  address?: string | null;
  id_number_masked?: string | null;
}

export interface WalletSummary {
  currency: string;
  available_balance: string;
  locked_investment: string;
  total_portfolio: string;
  total_invested: string;
  total_earned: string;
}

function fmt(n: number | string | null | undefined): string {
  const num = Number(n || 0);
  return isNaN(num) ? "0.00" : num.toFixed(2);
}

export const isUuid = (str: any): boolean => {
  if (!str || typeof str !== "string") return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
};

function createNoopSupabaseClient(): any {
  const defaultRes = { data: null, error: null, count: 0 };
  const promiseTarget = Promise.resolve(defaultRes);

  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === "then") return promiseTarget.then.bind(promiseTarget);
      if (prop === "catch") return promiseTarget.catch.bind(promiseTarget);
      if (prop === "finally") return promiseTarget.finally.bind(promiseTarget);
      if (prop === "auth") {
        return {
          admin: {
            createUser: async () => ({ data: { user: null }, error: null }),
            updateUserById: async () => ({ data: null, error: null }),
            deleteUser: async () => ({ data: null, error: null }),
            getUserById: async () => ({ data: { user: null }, error: null }),
            listUsers: async () => ({ data: { users: [] }, error: null }),
          },
          signInWithPassword: async () => ({ data: { user: null, session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
        };
      }
      if (prop === "storage") {
        return {
          from: () => ({
            upload: async () => ({ data: { path: "local-proof" }, error: null }),
            createSignedUrl: async () => ({ data: { signedUrl: "" }, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: "" } }),
          }),
        };
      }
      return (..._args: any[]) => new Proxy(promiseTarget, handler);
    },
    apply(_target, _thisArg, _argArray) {
      return new Proxy(promiseTarget, handler);
    },
  };

  return new Proxy(promiseTarget, handler);
}

export class SupabaseDbService {
  private static instance: SupabaseDbService | null = null;

  public static getInstance(): SupabaseDbService {
    if (!this.instance) {
      this.instance = new SupabaseDbService();
    }
    return this.instance;
  }

  public isUuid(str: any): boolean {
    return isUuid(str);
  }

  public isConfigured(): boolean {
    return isSupabaseAdminConfigured();
  }

  private getClient(): any {
    const client = getSupabaseAdmin();
    if (!client) {
      return createNoopSupabaseClient();
    }
    return client;
  }

  /* -------------------------------------------------------------------------- */
  /*                            PROFILES & AUTH                                 */
  /* -------------------------------------------------------------------------- */

  public async getProfileById(userId: string): Promise<any | null> {
    if (!userId || typeof userId !== "string" || !isUuid(userId) || !this.isConfigured()) {
      return null;
    }
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseDb] Error fetching profile by id:", error.message);
      return null;
    }
    return data;
  }

  public async getProfileByEmail(email: string): Promise<any | null> {
    if (!email || !this.isConfigured()) return null;
    const supabase = this.getClient();
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseDb] Error fetching profile by email:", error.message);
      return null;
    }
    return data;
  }

  public async getProfileByPhone(phone: string): Promise<any | null> {
    if (!phone || !this.isConfigured()) return null;
    const supabase = this.getClient();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    const last10 = cleanPhone.slice(-10);

    const { data, error } = await supabase
      .from("profiles")
      .select("*");

    if (error || !data) return null;
    return data.find((p: any) => {
      if (!p.phone) return false;
      const num = p.phone.replace(/[^0-9]/g, "");
      return num.slice(-10) === last10;
    }) || null;
  }

  public async getProfileByReferralCode(code: string): Promise<any | null> {
    if (!code || !this.isConfigured()) return null;
    const supabase = this.getClient();
    const cleanCode = code.trim().toUpperCase();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("referral_code", cleanCode)
      .maybeSingle();

    if (error) return null;
    return data;
  }

  public async registerUser(params: {
    email: string;
    password: string;
    name: string;
    phone: string;
    referralCode?: string | null;
  }): Promise<{ user: CleanUserProfile; session?: any }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const cleanPhone = params.phone.trim();
    const cleanName = params.name.trim();

    if (!this.isConfigured()) {
      const localId = crypto.randomUUID();
      const refCode = "EX" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const localUser: CleanUserProfile = {
        id: localId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: "user",
        status: "active",
        email_verified: true,
        kyc_status: "none",
        referral_code: refCode,
        referred_by: params.referralCode ? params.referralCode : null,
        two_factor_enabled: false,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      };
      return { user: localUser };
    }

    const supabase = this.getClient();

    // 1. Check if referral code is valid if provided
    let referrer: any = null;
    if (params.referralCode) {
      referrer = await this.getProfileByReferralCode(params.referralCode);
      if (!referrer) {
        throw new Error("Invalid referral code.");
      }
    }

    // 2. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        name: cleanName,
        phone: cleanPhone,
      },
    });

    if (authError || !authData?.user) {
      throw new Error(authError?.message || "Failed to create user in Supabase Auth.");
    }

    const userId = authData.user.id;

    // 3. Ensure profile and wallet exist (the trigger on_auth_user_created handles this,
    // but we ensure fields like phone, name, referral are accurately up-to-date)
    await new Promise((r) => setTimeout(r, 200));

    let profile = await this.getProfileById(userId);
    if (!profile) {
      // Upsert profile if trigger did not finish yet
      const genRef = "EX" + crypto.randomBytes(3).toString("hex").toUpperCase();
      const { data: pData, error: pErr } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          role: "user",
          status: "active",
          email_verified: true,
          kyc_status: "none",
          referral_code: genRef,
          referred_by: referrer ? referrer.id : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!pErr && pData) profile = pData;
    } else if (referrer && !profile.referred_by) {
      // Update referred_by
      await supabase
        .from("profiles")
        .update({ referred_by: referrer.id, phone: cleanPhone, name: cleanName })
        .eq("id", userId);
      profile.referred_by = referrer.id;
    }

    // 4. Ensure wallet exists
    const { data: existingWallet } = await supabase
      .from("wallets")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingWallet) {
      await supabase.from("wallets").insert({
        user_id: userId,
        available_balance: 0,
        total_invested: 0,
        total_profit: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        pending_withdrawal: 0,
      });
    }

    // 5. Record referral relationship if referred
    if (referrer) {
      try {
        await supabase.from("referrals").insert({
          referrer_id: referrer.id,
          referee_id: userId,
          referral_code: referrer.referral_code || params.referralCode,
          status: "active",
        });
      } catch (err: any) {
        console.warn("[SupabaseDb] Referral record notice:", err.message);
      }
    }

    // 6. Send welcome notification
    await this.createNotification({
      userId,
      type: "system",
      channel: "both",
      title: "Welcome to EasyX!",
      body: "Your investment account is active. Explore verified high-yield staking plans or fund your wallet.",
      actionUrl: "/investments",
      actionText: "Explore Plans",
    });

    const clean = this.formatProfile(profile || {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      role: "user",
      status: "active",
      email_verified: true,
      kyc_status: "none",
      referral_code: "EX" + userId.slice(0, 6).toUpperCase(),
      referred_by: referrer ? referrer.id : null,
      two_factor_enabled: false,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });

    return { user: clean };
  }

  public async authenticateUser(params: {
    email: string;
    password: string;
  }): Promise<{ user: CleanUserProfile; session?: any }> {
    if (!this.isConfigured()) {
      return null as any;
    }
    const rawUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").trim().replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
    const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
    const cleanEmail = params.email.trim().toLowerCase();

    // Authenticate using Supabase Auth signInWithPassword
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(rawUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authErr } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password: params.password,
    });

    if (authErr || !authData?.user) {
      throw new Error(authErr?.message || "Invalid email or password.");
    }

    const userId = authData.user.id;
    let profile = await this.getProfileById(userId);

    if (!profile) {
      // Fallback fetch/create profile
      const supabase = this.getClient();
      const meta = authData.user.user_metadata || {};
      const { data: newProfile } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          name: meta.name || "Investor",
          email: cleanEmail,
          phone: meta.phone || null,
          role: "user",
          status: "active",
          email_verified: Boolean(authData.user.email_confirmed_at),
          kyc_status: "none",
          referral_code: "EX" + crypto.randomBytes(3).toString("hex").toUpperCase(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      profile = newProfile;
    }

    // Update last_login_at
    const nowStr = new Date().toISOString();
    await this.getClient()
      .from("profiles")
      .update({ last_login_at: nowStr, updated_at: nowStr })
      .eq("id", userId);

    if (profile) profile.last_login_at = nowStr;

    return {
      user: this.formatProfile(profile),
      session: authData.session,
    };
  }

  public async updateProfile(userId: string, updates: Partial<any>): Promise<CleanUserProfile> {
    if (!this.isConfigured()) {
      return { id: userId, ...updates } as any;
    }
    const supabase = this.getClient();
    const nowStr = new Date().toISOString();
    const payload = { ...updates, updated_at: nowStr };
    delete (payload as any).id;

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      throw new Error("Failed to update profile: " + error.message);
    }
    return this.formatProfile(data);
  }

  public async listAllUsers(): Promise<CleanUserProfile[]> {
    if (!this.isConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((p) => this.formatProfile(p));
  }

  public formatProfile(p: any): CleanUserProfile {
    return {
      id: p.id,
      name: p.name || "Investor",
      email: p.email || "",
      phone: p.phone || "",
      role: p.role === "admin" ? "admin" : "user",
      status: p.status || "active",
      email_verified: Boolean(p.email_verified),
      kyc_status: p.kyc_status || "none",
      referral_code: p.referral_code || "EX" + p.id?.slice(0, 6).toUpperCase(),
      referred_by: p.referred_by || null,
      two_factor_enabled: Boolean(p.two_factor_enabled),
      created_at: p.created_at || new Date().toISOString(),
      last_login_at: p.last_login_at || null,
      permanent_address: p.permanent_address || p.address || null,
      address: p.address || p.permanent_address || null,
      id_number_masked: p.id_number_masked || null,
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                            WALLETS & BALANCES                              */
  /* -------------------------------------------------------------------------- */

  public async getWallet(userId: string): Promise<any> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) {
      return {
        id: "local-wallet",
        user_id: userId,
        available_balance: 0,
        total_invested: 0,
        total_profit: 0,
        total_deposited: 0,
        total_withdrawn: 0,
        pending_withdrawal: 0,
      };
    }
    const supabase = this.getClient();
    let { data: wallet, error } = await supabase
      .from("wallets")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!wallet) {
      const { data: created } = await supabase
        .from("wallets")
        .insert({
          user_id: userId,
          available_balance: 0,
          total_invested: 0,
          total_profit: 0,
          total_deposited: 0,
          total_withdrawn: 0,
          pending_withdrawal: 0,
        })
        .select()
        .single();
      wallet = created;
    }

    // Authoritative Ledger Reconciliation:
    // Ensure wallet balances reflect all completed transactions from the double-entry ledger.
    if (wallet && wallet.id) {
      const { data: txs } = await supabase
        .from("wallet_transactions")
        .select("type, direction, amount, status")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (txs && txs.length > 0) {
        let ledgerBalance = 0;
        let ledgerDeposited = 0;
        for (const t of txs) {
          const amt = Number(t.amount || 0);
          if (t.direction === "credit") {
            ledgerBalance += amt;
            if (t.type === "DEPOSIT") {
              ledgerDeposited += amt;
            }
          } else if (t.direction === "debit") {
            ledgerBalance -= amt;
          }
        }

        const currentAvail = Number(wallet.available_balance || 0);
        const currentDeposited = Number(wallet.total_deposited || 0);

        if (Math.abs(currentAvail - ledgerBalance) > 0.001 || ledgerDeposited > currentDeposited) {
          const reconciledAvail = ledgerBalance;
          const reconciledDeposited = Math.max(currentDeposited, ledgerDeposited);
          await supabase
            .from("wallets")
            .update({
              available_balance: reconciledAvail,
              total_deposited: reconciledDeposited,
              updated_at: new Date().toISOString(),
            })
            .eq("id", wallet.id);

          wallet.available_balance = reconciledAvail;
          wallet.total_deposited = reconciledDeposited;
        }
      }
    }

    return wallet;
  }

  public async getWalletSummary(userId: string): Promise<WalletSummary> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) {
      return {
        currency: "USDT",
        available_balance: "0.00",
        locked_investment: "0.00",
        total_portfolio: "0.00",
        total_invested: "0.00",
        total_earned: "0.00",
      };
    }
    const supabase = this.getClient();
    const wallet = await this.getWallet(userId);

    // Compute locked amount from active investments
    const { data: activeInvs } = await supabase
      .from("investments")
      .select("principal")
      .eq("user_id", userId)
      .eq("status", "active");

    const locked = (activeInvs || []).reduce((acc: number, inv: any) => acc + Number(inv.principal || 0), 0);
    const available = Number(wallet?.available_balance || 0);
    const totalInvested = Number(wallet?.total_invested || 0);
    const totalProfit = Number(wallet?.total_profit || 0);

    return {
      currency: "USDT",
      available_balance: fmt(available),
      locked_investment: fmt(locked),
      total_portfolio: fmt(available + locked),
      total_invested: fmt(totalInvested),
      total_earned: fmt(totalProfit),
    };
  }

  public async creditWallet(params: {
    userId: string;
    amount: number;
    type: string;
    note?: string;
    refType?: string;
    refId?: string;
    createdBy?: string;
    isDeposit?: boolean;
    isProfit?: boolean;
  }): Promise<any> {
    if (!this.isConfigured() || !params.userId || !isUuid(params.userId)) return null;
    const supabase = this.getClient();
    const wallet = await this.getWallet(params.userId);

    // Duplicate transaction protection: If a completed transaction for this ref exists, do not double-credit
    if (params.refType && params.refId) {
      let query = supabase
        .from("wallet_transactions")
        .select("id, balance_after")
        .eq("user_id", params.userId)
        .eq("ref_type", params.refType)
        .eq("ref_id", params.refId)
        .eq("status", "completed");

      if (params.type) {
        query = query.eq("type", params.type);
      }

      const { data: existingTx } = await query.maybeSingle();

      if (existingTx) {
        console.warn(`[creditWallet] Transaction already exists for ${params.refType}:${params.refId} (${params.type}). Skipping duplicate credit.`);
        return wallet;
      }
    }

    const creditAmt = Math.abs(Number(params.amount));
    const newAvail = Number(wallet.available_balance || 0) + creditAmt;
    const newDeposited = params.isDeposit ? Number(wallet.total_deposited || 0) + creditAmt : Number(wallet.total_deposited || 0);
    const newProfit = params.isProfit ? Number(wallet.total_profit || 0) + creditAmt : Number(wallet.total_profit || 0);

    const { data: updatedWallet, error: uErr } = await supabase
      .from("wallets")
      .update({
        available_balance: newAvail,
        total_deposited: newDeposited,
        total_profit: newProfit,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (uErr) {
      throw new Error("Failed to credit wallet: " + uErr.message);
    }

    // Insert wallet transaction
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: params.userId,
      type: params.type as any,
      direction: "credit",
      amount: creditAmt,
      balance_after: newAvail,
      ref_type: params.refType || null,
      ref_id: params.refId && params.refId.length === 36 ? params.refId : null,
      status: "completed",
      note: params.note || null,
      created_by: params.createdBy && params.createdBy.length === 36 ? params.createdBy : null,
      created_at: new Date().toISOString(),
    });

    return updatedWallet;
  }

  public async debitWallet(params: {
    userId: string;
    amount: number;
    type: string;
    note?: string;
    refType?: string;
    refId?: string;
    createdBy?: string;
    isInvestment?: boolean;
  }): Promise<any> {
    if (!this.isConfigured() || !params.userId || !isUuid(params.userId)) return null;
    const supabase = this.getClient();
    const wallet = await this.getWallet(params.userId);
    const debitAmt = Math.abs(Number(params.amount));
    const currentAvail = Number(wallet.available_balance || 0);

    if (currentAvail < debitAmt) {
      throw new Error(`Insufficient available balance. Required: $${debitAmt.toFixed(2)}, Available: $${currentAvail.toFixed(2)}`);
    }

    const newAvail = currentAvail - debitAmt;
    const newInvested = params.isInvestment ? Number(wallet.total_invested || 0) + debitAmt : Number(wallet.total_invested || 0);

    const { data: updatedWallet, error: uErr } = await supabase
      .from("wallets")
      .update({
        available_balance: newAvail,
        total_invested: newInvested,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id)
      .select()
      .single();

    if (uErr) {
      throw new Error("Failed to debit wallet: " + uErr.message);
    }

    // Insert wallet transaction
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: params.userId,
      type: params.type as any,
      direction: "debit",
      amount: debitAmt,
      balance_after: newAvail,
      ref_type: params.refType || null,
      ref_id: params.refId && params.refId.length === 36 ? params.refId : null,
      status: "completed",
      note: params.note || null,
      created_by: params.createdBy && params.createdBy.length === 36 ? params.createdBy : null,
      created_at: new Date().toISOString(),
    });

    return updatedWallet;
  }

  public async getTransactions(userId: string, limit: number = 50): Promise<any[]> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data.map((t) => ({
      id: t.id,
      user_id: t.user_id,
      type: t.type,
      direction: t.direction,
      amount: fmt(t.amount),
      balance_after: fmt(t.balance_after),
      ref_type: t.ref_type,
      ref_id: t.ref_id,
      status: t.status,
      note: t.note,
      description: t.note,
      created_at: t.created_at,
    }));
  }

  /* -------------------------------------------------------------------------- */
  /*                         INVESTMENT PLANS & STAKING                         */
  /* -------------------------------------------------------------------------- */

  public async getInvestmentPlans(): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("investment_plans")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error || !data) {
      return [];
    }
    return data;
  }

  public async getInvestmentPlanByKey(key: string): Promise<any | null> {
    if (!key || !isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("investment_plans")
      .select("*")
      .eq("key", key.toLowerCase().trim())
      .maybeSingle();

    if (error) return null;
    return data;
  }

  public async getPlansState(userId: string): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const plans = await this.getInvestmentPlans();
    const userInvs = await this.getUserInvestments(userId);

    return plans.map((plan: any) => {
      const invsForPlan = userInvs.filter((i: any) => i.plan_key === plan.key || i.plan_id === plan.key);
      const activeInvs = invsForPlan.filter((i: any) => i.status === "active");
      const unlocked = invsForPlan.length > 0;

      const totalInvested = invsForPlan.reduce((acc: number, i: any) => acc + Number(i.principal || i.amount || 0), 0);
      const expectedProfit = activeInvs.reduce((acc: number, i: any) => acc + Number(i.expected_profit || i.profit_amount || 0), 0);
      const expectedMaturity = activeInvs.reduce((acc: number, i: any) => acc + Number(i.expected_payout || i.maturity_amount || 0), 0);
      const nextMaturity = activeInvs.length > 0
        ? activeInvs.map((i: any) => i.maturity_at).filter(Boolean).sort()[0]
        : null;

      const price = Number(plan.min_amount || plan.price || 300);
      const profitPct = Number(plan.profit_percentage || 60);
      const maturityPct = Number(plan.maturity_percentage || 160);
      const profitAmount = (price * profitPct) / 100;
      const maturityAmount = (price * maturityPct) / 100;

      const sortedInvs = [...invsForPlan].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const sortedActive = sortedInvs.filter((i: any) => i.status === "active");
      const latestInv = sortedActive[0] || sortedInvs[0] || null;

      return {
        key: plan.key,
        name: plan.name,
        display_order: plan.sort_order || plan.display_order || 1,
        price: fmt(price),
        min_amount: fmt(price),
        max_amount: plan.max_amount ? fmt(plan.max_amount) : null,
        lock_days: Number(plan.lock_days || 60),
        profit_percentage: fmt(profitPct),
        maturity_percentage: fmt(maturityPct),
        profit_amount: fmt(profitAmount),
        maturity_amount: fmt(maturityAmount),
        unlocked,
        cards: invsForPlan.length,
        active_investments: activeInvs.length,
        total_invested: fmt(totalInvested),
        expected_profit: fmt(expectedProfit),
        expected_maturity: fmt(expectedMaturity),
        next_maturity: nextMaturity,
        latest_investment: latestInv,
        investments: sortedInvs,
      };
    });
  }

  public async createInvestment(params: {
    userId: string;
    planKey: string;
    amount?: number;
    idempotencyKey?: string;
  }): Promise<any> {
    if (!this.isConfigured() || !isUuid(params.userId)) return null;
    const supabase = this.getClient();
    const plan = await this.getInvestmentPlanByKey(params.planKey);
    if (!plan || !plan.is_active) {
      throw new Error("Invalid or inactive investment plan: " + params.planKey);
    }

    const principal = params.amount ? Number(params.amount) : Number(plan.min_amount);
    if (isNaN(principal) || principal < Number(plan.min_amount)) {
      throw new Error(`Minimum investment for ${plan.name} is $${plan.min_amount}`);
    }
    if (plan.max_amount && principal > Number(plan.max_amount)) {
      throw new Error(`Maximum investment for ${plan.name} is $${plan.max_amount}`);
    }

    // Check user wallet
    const wallet = await this.getWallet(params.userId);
    if (Number(wallet.available_balance || 0) < principal) {
      throw new Error(`Insufficient wallet balance ($${fmt(wallet.available_balance)}). Required: $${fmt(principal)}.`);
    }

    const profitPercentage = Number(plan.profit_percentage || 60);
    const maturityPercentage = Number(plan.maturity_percentage || 160);
    const expectedProfit = (principal * profitPercentage) / 100;
    const expectedPayout = (principal * maturityPercentage) / 100;
    const lockDays = Number(plan.lock_days || 60);

    const startDate = new Date();
    const maturityDate = new Date(startDate.getTime() + lockDays * 86400000);

    // 1. Debit user wallet
    const updatedWallet = await this.debitWallet({
      userId: params.userId,
      amount: principal,
      type: "PLAN_PURCHASE",
      note: `Investment in ${plan.name} (${lockDays} days lockup, ${profitPercentage}% profit)`,
      refType: "investments",
      isInvestment: true,
    });

    // 2. Insert investment record
    const { data: investment, error: iErr } = await supabase
      .from("investments")
      .insert({
        user_id: params.userId,
        plan_key: plan.key,
        plan_name: plan.name,
        principal,
        profit_percentage: profitPercentage,
        maturity_percentage: maturityPercentage,
        expected_profit: expectedProfit,
        expected_payout: expectedPayout,
        lock_days: lockDays,
        start_at: startDate.toISOString(),
        maturity_at: maturityDate.toISOString(),
        status: "active",
        payout_status: "locked",
        created_at: startDate.toISOString(),
        updated_at: startDate.toISOString(),
      })
      .select()
      .single();

    if (iErr || !investment) {
      // Revert debit if investment insert failed
      await this.creditWallet({
        userId: params.userId,
        amount: principal,
        type: "ADMIN_ADJUSTMENT",
        note: "Refund failed plan purchase",
      });
      throw new Error("Failed to create investment record: " + iErr?.message);
    }

    // 3. Check for direct referral affiliate commission (10%)
    try {
      const profile = await this.getProfileById(params.userId);
      if (profile?.referred_by && profile.referred_by !== params.userId) {
        const commissionRate = 10.0; // 10%
        const commissionAmount = Math.round(((principal * commissionRate) / 100) * 100) / 100;

        if (commissionAmount > 0) {
          await supabase.from("referral_commissions").insert({
            referrer_id: profile.referred_by,
            referee_id: params.userId,
            investment_id: investment.id,
            tier_percentage: commissionRate,
            commission_amount: commissionAmount,
            status: "credited",
            created_at: new Date().toISOString(),
          });

          // Credit referrer's wallet
          await this.creditWallet({
            userId: profile.referred_by,
            amount: commissionAmount,
            type: "REFERRAL_COMMISSION",
            note: `Affiliate referral bonus (${commissionRate}%) from investor plan purchase`,
            refType: "referral_commissions",
            refId: investment.id,
            isProfit: true,
          });

          // Send notification to referrer
          await this.createNotification({
            userId: profile.referred_by,
            type: "referral",
            channel: "both",
            title: "Referral Commission Earned! 🎉",
            body: `You received a $${commissionAmount.toFixed(2)} USDT commission from your referral's investment.`,
            actionUrl: "/wallet",
            actionText: "View Balance",
          });
        }
      }
    } catch (refErr: any) {
      console.warn("[SupabaseDb] Referral commission processing notice:", refErr.message);
    }

    // 4. Send investment confirmation notification to investor
    await this.createNotification({
      userId: params.userId,
      type: "investment",
      channel: "both",
      title: `Plan Activated: ${plan.name}`,
      body: `Your investment of $${fmt(principal)} USDT is now active. Locked for ${lockDays} days with expected total return of $${fmt(expectedPayout)} USDT.`,
      actionUrl: "/investments",
      actionText: "View Investment",
    });

    return this.serializeInvestment(investment);
  }

  public async getUserInvestments(userId: string, planKey?: string): Promise<any[]> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    let query = supabase
      .from("investments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (planKey && planKey !== "all") {
      query = query.eq("plan_key", planKey.toLowerCase().trim());
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((inv) => this.serializeInvestment(inv));
  }

  public async getAllInvestments(): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("investments")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((inv) => ({
      ...this.serializeInvestment(inv),
      user_name: (inv as any).profiles?.name || "Investor",
      user_email: (inv as any).profiles?.email || "",
    }));
  }

  public async getInvestmentById(id: string): Promise<any | null> {
    if (!id || !isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("investments")
      .select("*, profiles:user_id(name, email)")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      ...this.serializeInvestment(data),
      user_name: (data as any).profiles?.name || "Investor",
      user_email: (data as any).profiles?.email || "",
    };
  }

  public serializeInvestment(inv: any): any {
    const now = Date.now();
    const start = new Date(inv.start_at || inv.created_at).getTime();
    const lockDays = Number(inv.lock_days || 60);
    const maturity = inv.maturity_at ? new Date(inv.maturity_at).getTime() : start + lockDays * 86400000;

    const totalMs = Math.max(1000, maturity - start);
    const elapsedMs = Math.max(0, now - start);
    const remainingMs = Math.max(0, maturity - now);

    const elapsedDays = Math.max(0, Math.floor(elapsedMs / 86400000));
    const remainingDays = inv.status === "matured" ? 0 : Math.max(0, Math.ceil(remainingMs / 86400000));
    const progress = inv.status === "matured" ? 100 : Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));

    const principal = Number(inv.principal || 0);
    const expectedProfit = Number(inv.expected_profit || (principal * Number(inv.profit_percentage || 60)) / 100);
    const expectedPayout = Number(inv.expected_payout || principal + expectedProfit);
    const accruedProfit = inv.status === "matured" ? expectedProfit : Math.round((expectedProfit * (progress / 100)) * 100) / 100;

    return {
      id: inv.id,
      user_id: inv.user_id,
      plan_key: inv.plan_key,
      plan_id: inv.plan_key,
      plan_name: inv.plan_name,
      principal: fmt(principal),
      amount: fmt(principal),
      profit_percentage: Number(inv.profit_percentage || 60),
      maturity_percentage: Number(inv.maturity_percentage || 160),
      expected_profit: fmt(expectedProfit),
      expected_payout: fmt(expectedPayout),
      profit_amount: fmt(expectedProfit),
      maturity_amount: fmt(expectedPayout),
      accrued_profit: fmt(accruedProfit),
      lock_days: lockDays,
      start_at: inv.start_at,
      maturity_at: inv.maturity_at,
      status: inv.status || "active",
      payout_status: inv.payout_status || "locked",
      progress_pct: progress,
      progress_percentage: progress,
      days_elapsed: elapsedDays,
      days_remaining: remainingDays,
      created_at: inv.created_at,
    };
  }

  public async matureInvestment(investmentId: string): Promise<any | null> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data: inv, error: fErr } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .maybeSingle();

    if (fErr || !inv) return null;
    if (inv.status !== "active") return this.serializeInvestment(inv);

    const nowStr = new Date().toISOString();

    // 0. Double-credit guard: Check if maturity ledger transactions already exist for this investment
    const { data: existingTx } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("ref_type", "investments")
      .eq("ref_id", inv.id)
      .eq("type", "INVESTMENT_MATURITY")
      .maybeSingle();

    if (existingTx) {
      // Transaction was already credited in prior execution; ensure status is synced to matured
      await supabase
        .from("investments")
        .update({
          status: "matured",
          payout_status: "paid",
          updated_at: nowStr,
        })
        .eq("id", inv.id);
      return this.serializeInvestment({ ...inv, status: "matured", payout_status: "paid" });
    }

    // Atomic concurrency lock: transition status from 'active' to 'matured' immediately
    // so any concurrent sweep worker will see 0 affected rows and abort
    const { data: lockedInv, error: lockErr } = await supabase
      .from("investments")
      .update({
        status: "matured",
        payout_status: "paid",
        matured_at: nowStr,
        updated_at: nowStr,
      })
      .eq("id", inv.id)
      .eq("status", "active")
      .select()
      .maybeSingle();

    if (lockErr || !lockedInv) {
      // Another worker or request won the race and processed this investment
      return this.serializeInvestment(inv);
    }

    const principal = Number(inv.principal || 0);
    const profitPercentage = Number(inv.profit_percentage || 60);
    const profit = Number(inv.expected_profit || (principal * profitPercentage) / 100);

    // 1. Credit principal back to user wallet
    if (principal > 0) {
      await this.creditWallet({
        userId: inv.user_id,
        amount: principal,
        type: "INVESTMENT_MATURITY",
        note: `${inv.plan_name} principal returned at maturity`,
        refType: "investments",
        refId: inv.id,
      });
    }

    // 2. Credit profit to user wallet (if profit > 0)
    if (profit > 0) {
      await this.creditWallet({
        userId: inv.user_id,
        amount: profit,
        type: "PROFIT",
        note: `${inv.plan_name} profit credited at maturity`,
        refType: "investments",
        refId: inv.id,
        isProfit: true,
      });
    }

    const updatedInv = lockedInv;

    // 4. Send user notification
    const total = principal + profit;
    await this.createNotification({
      userId: inv.user_id,
      type: "investment",
      channel: "both",
      title: "Investment Matured! 💰",
      body: `Your ${inv.plan_name} has matured. $${fmt(total)} USDT credited to your wallet (principal $${fmt(principal)} + profit $${fmt(profit)}).`,
      actionUrl: "/wallet",
      actionText: "View Wallet",
    });

    return this.serializeInvestment(updatedInv || { ...inv, status: "matured", payout_status: "paid", matured_at: nowStr });
  }

  public async runMaturitySweep(): Promise<{ matured: number; ran_at: string; matured_ids: string[] }> {
    if (!isSupabaseAdminConfigured()) {
      return { matured: 0, ran_at: new Date().toISOString(), matured_ids: [] };
    }
    const supabase = this.getClient();
    const nowStr = new Date().toISOString();
    const maturedIds: string[] = [];

    const { data: activeList, error } = await supabase
      .from("investments")
      .select("id, status, maturity_at")
      .eq("status", "active")
      .lte("maturity_at", nowStr);

    if (!error && Array.isArray(activeList)) {
      for (const item of activeList) {
        try {
          const res = await this.matureInvestment(item.id);
          if (res && res.status === "matured") maturedIds.push(item.id);
        } catch (err: any) {
          console.error(`[SupabaseDb] Error maturing investment ${item.id}:`, err?.message);
        }
      }
    }

    return { matured: maturedIds.length, ran_at: nowStr, matured_ids: maturedIds };
  }

  /* -------------------------------------------------------------------------- */
  /*                         DEPOSITS & SUPABASE STORAGE                        */
  /* -------------------------------------------------------------------------- */

  public async uploadDepositProof(
    userId: string,
    fileBuffer: Buffer,
    mimeType: string = "image/jpeg",
    index: number = 1
  ): Promise<string> {
    if (!this.isConfigured()) {
      return "data:" + mimeType + ";base64," + fileBuffer.toString("base64");
    }
    const supabase = this.getClient();
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("pdf") ? "pdf" : "jpg";
    const filePath = `deposits/${userId}/${crypto.randomUUID()}_proof${index}.${ext}`;

    const { data, error } = await supabase.storage
      .from("deposit-proofs")
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error || !data) {
      throw new Error("Failed to upload deposit proof to Supabase Storage: " + (error?.message || "unknown"));
    }

    return filePath;
  }

  public async getDepositProofSignedUrl(storagePath: string): Promise<string> {
    if (!storagePath) return "";
    if (!this.isConfigured() || storagePath.startsWith("data:") || storagePath.startsWith("http://") || storagePath.startsWith("https://")) {
      return storagePath;
    }
    const supabase = this.getClient();
    const { data, error } = await supabase.storage
      .from("deposit-proofs")
      .createSignedUrl(storagePath, 3600); // 1 hour

    return data?.signedUrl || "";
  }

  public async createDeposit(params: {
    userId: string;
    network: "TRC20" | "BEP20" | "ERC20" | "POLYGON";
    amount: number;
    txHash?: string;
    toAddress?: string;
    proofFiles?: Array<{ buffer: Buffer; mimeType: string }>;
    proofImages?: string[]; // base64 strings if uploaded via legacy payload
  }): Promise<any> {
    if (!this.isConfigured()) return null;
    const supabase = this.getClient();
    const storedPaths: string[] = [];

    // Process files if provided as buffers
    if (params.proofFiles && params.proofFiles.length > 0) {
      for (let i = 0; i < params.proofFiles.length; i++) {
        const file = params.proofFiles[i];
        const path = await this.uploadDepositProof(params.userId, file.buffer, file.mimeType, i + 1);
        storedPaths.push(path);
      }
    } else if (params.proofImages && params.proofImages.length > 0) {
      // Process base64 data URLs
      for (let i = 0; i < params.proofImages.length; i++) {
        const raw = params.proofImages[i];
        if (!raw) continue;
        const matches = raw.match(/^data:([^;]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : "image/jpeg";
        const base64Data = matches ? matches[2] : raw;
        const buffer = Buffer.from(base64Data, "base64");
        const path = await this.uploadDepositProof(params.userId, buffer, mimeType, i + 1);
        storedPaths.push(path);
      }
    }

    const proofFileUrl = storedPaths.join(",");

    const { data: deposit, error } = await supabase
      .from("payment_deposits")
      .insert({
        user_id: params.userId,
        network: params.network,
        amount: Number(params.amount),
        to_address: params.toAddress || "EasyX Vault",
        tx_hash: params.txHash || null,
        proof_file_url: proofFileUrl,
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !deposit) {
      throw new Error("Failed to create deposit record: " + error?.message);
    }

    // Send notification
    await this.createNotification({
      userId: params.userId,
      type: "deposit",
      channel: "both",
      title: "Deposit Submitted for Verification",
      body: `Your deposit of $${fmt(params.amount)} (${params.network}) has been received and is awaiting administrator verification.`,
      actionUrl: "/wallet",
      actionText: "View Wallet",
    });

    return this.serializeDeposit(deposit);
  }

  public async getUserDeposits(userId: string): Promise<any[]> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("payment_deposits")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    const results = [];
    for (const d of data) {
      results.push(await this.serializeDeposit(d));
    }
    return results;
  }

  public async getAllDeposits(status?: string): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    let query = supabase
      .from("payment_deposits")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data, error } = await query;
    if (error || !data) return [];
    const results = [];
    for (const d of data) {
      const serialized = await this.serializeDeposit(d);
      results.push({
        ...serialized,
        user_name: (d as any).profiles?.name || "Investor",
        user_email: (d as any).profiles?.email || "",
      });
    }
    return results;
  }

  public async serializeDeposit(dep: any): Promise<any> {
    const paths = (dep.proof_file_url || "").split(",").map((s: string) => s.trim()).filter(Boolean);
    const proofUrls: string[] = [];
    for (const p of paths) {
      const signed = await this.getDepositProofSignedUrl(p);
      if (signed) proofUrls.push(signed);
    }

    return {
      id: dep.id,
      user_id: dep.user_id,
      network: dep.network,
      amount: fmt(dep.amount),
      approved_amount: dep.approved_amount ? fmt(dep.approved_amount) : null,
      to_address: dep.to_address,
      tx_hash: dep.tx_hash,
      proof_images: proofUrls,
      proof_file_url: proofUrls[0] || null,
      status: dep.status,
      admin_note: dep.admin_note,
      decided_by: dep.decided_by,
      decided_at: dep.decided_at,
      created_at: dep.created_at,
      updated_at: dep.updated_at,
    };
  }

  public async adminDecideDeposit(params: {
    depositId: string;
    action?: "approve" | "reject";
    decision?: "approve" | "reject";
    adminId: string;
    adminEmail?: string;
    note?: string;
    adminNote?: string;
    approvedAmount?: number;
  }): Promise<any> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data: dep, error: fErr } = await supabase
      .from("payment_deposits")
      .select("*")
      .eq("id", params.depositId)
      .single();

    if (fErr || !dep) {
      throw new Error("Deposit record not found: " + params.depositId);
    }

    if (dep.status !== "pending") {
      throw new Error(`Deposit has already been ${dep.status}.`);
    }

    const nowStr = new Date().toISOString();
    const finalDecision = params.decision || params.action || "approve";
    const finalNote = params.adminNote || params.note || (finalDecision === "approve" ? "Approved by administrator" : "Rejected by administrator");

    if (finalDecision === "approve") {
      const finalAmount = params.approvedAmount ? Number(params.approvedAmount) : Number(dep.amount);

      // 1. Update deposit record
      const { data: updatedDep, error: uErr } = await supabase
        .from("payment_deposits")
        .update({
          status: "approved",
          approved_amount: finalAmount,
          admin_note: finalNote,
          decided_by: params.adminId.length === 36 ? params.adminId : null,
          decided_at: nowStr,
          updated_at: nowStr,
        })
        .eq("id", params.depositId)
        .select()
        .single();

      if (uErr) throw new Error("Failed to update deposit: " + uErr.message);

      // 2. Credit user's wallet
      await this.creditWallet({
        userId: dep.user_id,
        amount: finalAmount,
        type: "DEPOSIT",
        note: `Deposit approved via ${dep.network}. Amount: $${finalAmount.toFixed(2)} USDT`,
        refType: "payment_deposits",
        refId: dep.id,
        createdBy: params.adminId,
        isDeposit: true,
      });

      // 3. Send notification
      await this.createNotification({
        userId: dep.user_id,
        type: "deposit",
        channel: "both",
        title: "Deposit Approved! 💰",
        body: `Your deposit of $${fmt(finalAmount)} USDT has been verified and added to your available balance.`,
        actionUrl: "/wallet",
        actionText: "View Wallet",
      });

      // 4. Audit log
      await this.logAudit({
        adminId: params.adminId,
        adminEmail: params.adminEmail || "admin@easyx.trade",
        action: "APPROVE_DEPOSIT",
        entityType: "payment_deposits",
        entityId: dep.id,
        amount: finalAmount,
        reason: params.note || "Verified transaction proof",
        meta: { network: dep.network, tx_hash: dep.tx_hash },
      });

      return this.serializeDeposit(updatedDep);
    } else {
      // Reject
      const { data: updatedDep, error: uErr } = await supabase
        .from("payment_deposits")
        .update({
          status: "rejected",
          admin_note: params.note || "Rejected by administrator",
          decided_by: params.adminId.length === 36 ? params.adminId : null,
          decided_at: nowStr,
          updated_at: nowStr,
        })
        .eq("id", params.depositId)
        .select()
        .single();

      if (uErr) throw new Error("Failed to reject deposit: " + uErr.message);

      await this.createNotification({
        userId: dep.user_id,
        type: "deposit",
        channel: "both",
        title: "Deposit Rejected",
        body: `Your deposit request for $${fmt(dep.amount)} USDT was rejected. Reason: ${params.note || "Proof could not be verified."}`,
        actionUrl: "/wallet",
        actionText: "View Wallet",
      });

      await this.logAudit({
        adminId: params.adminId,
        adminEmail: params.adminEmail || "admin@easyx.trade",
        action: "REJECT_DEPOSIT",
        entityType: "payment_deposits",
        entityId: dep.id,
        amount: Number(dep.amount),
        reason: params.note || "Invalid payment proof",
      });

      return this.serializeDeposit(updatedDep);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                               WITHDRAWALS                                  */
  /* -------------------------------------------------------------------------- */

  public async createWithdrawal(params: {
    userId: string;
    amount: number;
    network: "TRC20" | "BEP20" | "ERC20" | "POLYGON";
    destinationAddress: string;
  }): Promise<any> {
    if (!this.isConfigured() || !isUuid(params.userId)) return null;
    const supabase = this.getClient();
    const withdrawAmt = Number(params.amount);
    if (isNaN(withdrawAmt) || withdrawAmt < 100) {
      throw new Error("Minimum withdrawal amount is 100.00 USDT.");
    }

    // 1. Verify KYC approved
    const profile = await this.getProfileById(params.userId);
    if (!profile || profile.kyc_status !== "approved") {
      throw new Error("KYC verification is required before initiating withdrawals. Please complete KYC.");
    }

    // 2. Check wallet balance
    const wallet = await this.getWallet(params.userId);
    const available = Number(wallet.available_balance || 0);
    if (available < withdrawAmt) {
      throw new Error(`Insufficient available balance ($${fmt(available)}). Required: $${fmt(withdrawAmt)}.`);
    }

    // 3. Put funds on escrow hold
    const newAvail = available - withdrawAmt;
    const newPending = Number(wallet.pending_withdrawal || 0) + withdrawAmt;

    await supabase
      .from("wallets")
      .update({
        available_balance: newAvail,
        pending_withdrawal: newPending,
        updated_at: new Date().toISOString(),
      })
      .eq("id", wallet.id);

    // 4. Create withdrawal record
    const { data: withdrawal, error } = await supabase
      .from("withdrawals")
      .insert({
        user_id: params.userId,
        amount: withdrawAmt,
        fee: 0,
        net_amount: withdrawAmt,
        network: params.network,
        destination_address: params.destinationAddress.trim(),
        status: "pending",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error || !withdrawal) {
      // Revert wallet hold
      await supabase
        .from("wallets")
        .update({
          available_balance: available,
          pending_withdrawal: Number(wallet.pending_withdrawal || 0),
        })
        .eq("id", wallet.id);
      throw new Error("Failed to create withdrawal request: " + error?.message);
    }

    // 5. Ledger record
    await supabase.from("wallet_transactions").insert({
      wallet_id: wallet.id,
      user_id: params.userId,
      type: "WITHDRAWAL_REQUEST",
      direction: "hold",
      amount: withdrawAmt,
      balance_after: newAvail,
      ref_type: "withdrawals",
      ref_id: withdrawal.id,
      status: "completed",
      note: `Withdrawal request placed (${params.network} to ${params.destinationAddress.slice(0, 8)}...)`,
      created_at: new Date().toISOString(),
    });

    // 6. User notification
    await this.createNotification({
      userId: params.userId,
      type: "withdrawal",
      channel: "both",
      title: "Withdrawal Request Queued",
      body: `Your withdrawal of $${fmt(withdrawAmt)} USDT (${params.network}) has been submitted and is processing.`,
      actionUrl: "/wallet",
      actionText: "View Status",
    });

    return this.serializeWithdrawal(withdrawal);
  }

  public async getUserWithdrawals(userId: string): Promise<any[]> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error || !data) return [];
    return data.map((w) => this.serializeWithdrawal(w));
  }

  public async getAllWithdrawals(status?: string): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    let query = supabase
      .from("withdrawals")
      .select("*, profiles:user_id(name, email)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((w) => ({
      ...this.serializeWithdrawal(w),
      user_name: (w as any).profiles?.name || "Investor",
      user_email: (w as any).profiles?.email || "",
    }));
  }

  public serializeWithdrawal(w: any): any {
    return {
      id: w.id,
      user_id: w.user_id,
      amount: fmt(w.amount),
      fee: fmt(w.fee),
      net_amount: fmt(w.net_amount),
      network: w.network,
      to_address: w.destination_address,
      destination_address: w.destination_address,
      status: w.status,
      tx_hash: w.payout_tx_hash || null,
      payout_tx_hash: w.payout_tx_hash || null,
      rejection_reason: w.rejection_reason || null,
      processed_by: w.processed_by,
      decided_at: w.decided_at,
      completed_at: w.completed_at,
      created_at: w.created_at,
      updated_at: w.updated_at,
    };
  }

  public async adminProcessWithdrawal(params: {
    withdrawalId: string;
    action: "complete" | "reject" | "approve";
    adminId: string;
    adminEmail?: string;
    txHash?: string;
    reason?: string;
    adminNote?: string;
  }): Promise<any> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data: w, error: fErr } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", params.withdrawalId)
      .single();

    if (fErr || !w) throw new Error("Withdrawal record not found: " + params.withdrawalId);

    const wallet = await this.getWallet(w.user_id);
    const amount = Number(w.amount);
    const nowStr = new Date().toISOString();

    if (params.action === "approve") {
      const { data: updatedW, error: uErr } = await supabase
        .from("withdrawals")
        .update({
          status: "approved",
          processed_by: params.adminId.length === 36 ? params.adminId : null,
          admin_note: params.reason || params.adminNote || null,
          decided_at: nowStr,
          updated_at: nowStr,
        })
        .eq("id", params.withdrawalId)
        .select()
        .single();

      if (uErr) throw new Error("Failed to approve withdrawal: " + uErr.message);
      return this.serializeWithdrawal(updatedW);
    }

    if (params.action === "complete") {
      // 1. Mark completed
      const { data: updatedW, error: uErr } = await supabase
        .from("withdrawals")
        .update({
          status: "completed",
          payout_tx_hash: params.txHash || "0x" + crypto.randomBytes(24).toString("hex"),
          processed_by: params.adminId.length === 36 ? params.adminId : null,
          decided_at: nowStr,
          completed_at: nowStr,
          updated_at: nowStr,
        })
        .eq("id", params.withdrawalId)
        .select()
        .single();

      if (uErr) throw new Error("Failed to complete withdrawal: " + uErr.message);

      // 2. Update wallet: release from pending_withdrawal and increment total_withdrawn
      const newPending = Math.max(0, Number(wallet.pending_withdrawal || 0) - amount);
      const newWithdrawn = Number(wallet.total_withdrawn || 0) + amount;

      await supabase
        .from("wallets")
        .update({
          pending_withdrawal: newPending,
          total_withdrawn: newWithdrawn,
          updated_at: nowStr,
        })
        .eq("id", wallet.id);

      // 3. Ledger record
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: w.user_id,
        type: "WITHDRAWAL_APPROVED",
        direction: "debit",
        amount,
        balance_after: Number(wallet.available_balance || 0),
        ref_type: "withdrawals",
        ref_id: w.id,
        status: "completed",
        note: `Withdrawal broadcast on-chain (${w.network}). Tx: ${params.txHash || "Confirmed"}`,
        created_by: params.adminId.length === 36 ? params.adminId : null,
        created_at: nowStr,
      });

      // 4. Notification
      await this.createNotification({
        userId: w.user_id,
        type: "withdrawal",
        channel: "both",
        title: "Withdrawal Sent! 🚀",
        body: `Your withdrawal of $${fmt(amount)} USDT (${w.network}) has been broadcast to your address.`,
        actionUrl: "/wallet",
        actionText: "View Details",
      });

      // 5. Audit
      await this.logAudit({
        adminId: params.adminId,
        adminEmail: params.adminEmail || "admin@easyx.trade",
        action: "COMPLETE_WITHDRAWAL",
        entityType: "withdrawals",
        entityId: w.id,
        amount,
        reason: "On-chain payout confirmed",
        meta: { tx_hash: params.txHash },
      });

      return this.serializeWithdrawal(updatedW);
    } else {
      // Reject: Return held funds to available_balance
      const { data: updatedW, error: uErr } = await supabase
        .from("withdrawals")
        .update({
          status: "rejected",
          rejection_reason: params.reason || "Rejected by administrator",
          processed_by: params.adminId.length === 36 ? params.adminId : null,
          decided_at: nowStr,
          updated_at: nowStr,
        })
        .eq("id", params.withdrawalId)
        .select()
        .single();

      if (uErr) throw new Error("Failed to reject withdrawal: " + uErr.message);

      const newAvail = Number(wallet.available_balance || 0) + amount;
      const newPending = Math.max(0, Number(wallet.pending_withdrawal || 0) - amount);

      await supabase
        .from("wallets")
        .update({
          available_balance: newAvail,
          pending_withdrawal: newPending,
          updated_at: nowStr,
        })
        .eq("id", wallet.id);

      // Ledger release
      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        user_id: w.user_id,
        type: "WITHDRAWAL_REJECTED",
        direction: "release",
        amount,
        balance_after: newAvail,
        ref_type: "withdrawals",
        ref_id: w.id,
        status: "completed",
        note: `Withdrawal held funds returned: ${params.reason || "Compliance check"}`,
        created_by: params.adminId.length === 36 ? params.adminId : null,
        created_at: nowStr,
      });

      await this.createNotification({
        userId: w.user_id,
        type: "withdrawal",
        channel: "both",
        title: "Withdrawal Returned to Balance",
        body: `Your withdrawal request for $${fmt(amount)} USDT was rejected and returned to your available balance. Reason: ${params.reason || "Verification error"}`,
        actionUrl: "/wallet",
        actionText: "View Wallet",
      });

      await this.logAudit({
        adminId: params.adminId,
        adminEmail: params.adminEmail || "admin@easyx.trade",
        action: "REJECT_WITHDRAWAL",
        entityType: "withdrawals",
        entityId: w.id,
        amount,
        reason: params.reason || "Failed verification check",
      });

      return this.serializeWithdrawal(updatedW);
    }
  }

  /* -------------------------------------------------------------------------- */
  /*                            KYC & SUPABASE STORAGE                          */
  /* -------------------------------------------------------------------------- */

  public async uploadKycDocument(userId: string, buffer: Buffer, mimeType: string, prefix: string): Promise<string> {
    if (!this.isConfigured()) {
      return "data:" + mimeType + ";base64," + buffer.toString("base64");
    }
    const supabase = this.getClient();
    const ext = mimeType.includes("png") ? "png" : mimeType.includes("pdf") ? "pdf" : "jpg";
    const bucket = prefix === "selfie" ? "kyc-selfies" : "kyc-documents";
    const filePath = `${prefix}/${userId}/${crypto.randomUUID()}.${ext}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error || !data) {
      throw new Error(`Failed to upload ${prefix} to bucket ${bucket}: ` + error?.message);
    }

    return filePath;
  }

  public async getKycSignedUrl(bucket: "kyc-documents" | "kyc-selfies", path: string): Promise<string> {
    if (!path) return "";
    if (!this.isConfigured() || path.startsWith("data:") || path.startsWith("http://") || path.startsWith("https://")) return path;

    const supabase = this.getClient();
    const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl || "";
  }

  public async submitKyc(params: {
    userId: string;
    idType: string;
    idNumber: string;
    permanentAddress: string;
    frontBuffer?: Buffer;
    frontMime?: string;
    backBuffer?: Buffer;
    backMime?: string;
    selfieBuffer?: Buffer;
    selfieMime?: string;
  }): Promise<any> {
    if (!this.isConfigured()) return null;
    const supabase = this.getClient();

    // 1. Upload files
    let frontPath = null;
    let backPath = null;
    let selfiePath = null;

    if (params.frontBuffer) {
      frontPath = await this.uploadKycDocument(params.userId, params.frontBuffer, params.frontMime || "image/jpeg", "front");
    }
    if (params.backBuffer) {
      backPath = await this.uploadKycDocument(params.userId, params.backBuffer, params.backMime || "image/jpeg", "back");
    }
    if (params.selfieBuffer) {
      selfiePath = await this.uploadKycDocument(params.userId, params.selfieBuffer, params.selfieMime || "image/jpeg", "selfie");
    }

    const rawId = String(params.idNumber || "").trim();
    const maskedId = rawId.length > 4 ? "*".repeat(Math.max(0, rawId.length - 4)) + rawId.slice(-4) : rawId;

    // 2. Insert KYC record
    const { data: kyc, error: kErr } = await supabase
      .from("kyc_records")
      .insert({
        user_id: params.userId,
        country: "IN",
        id_type: params.idType.toLowerCase() as any,
        id_number: rawId,
        id_number_masked: maskedId,
        permanent_address: params.permanentAddress,
        id_front_storage_path: frontPath,
        id_back_storage_path: backPath,
        selfie_storage_path: selfiePath,
        status: "pending",
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (kErr || !kyc) {
      throw new Error("Failed to insert KYC record: " + kErr?.message);
    }

    // 3. Update user profile
    await supabase
      .from("profiles")
      .update({
        kyc_status: "pending",
        id_number_masked: maskedId,
        permanent_address: params.permanentAddress,
        address: params.permanentAddress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.userId);

    // 4. Notification
    await this.createNotification({
      userId: params.userId,
      type: "kyc",
      channel: "both",
      title: "KYC Documents Under Review",
      body: "Your identity verification details and permanent residential address proof have been submitted for compliance review.",
      actionUrl: "/kyc",
      actionText: "Check Status",
    });

    return this.serializeKyc(kyc);
  }

  public async getUserKyc(userId: string): Promise<any | null> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("kyc_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return this.serializeKyc(data);
  }

  public async getAllKyc(status?: string): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    let query = supabase
      .from("kyc_records")
      .select("*, profiles:user_id(name, email, phone)")
      .order("created_at", { ascending: false });

    if (status && status !== "all") {
      query = query.eq("status", status.toLowerCase());
    }

    const { data, error } = await query;
    if (error || !data) return [];
    const results = [];
    for (const k of data) {
      const serialized = await this.serializeKyc(k);
      results.push({
        ...serialized,
        user_name: (k as any).profiles?.name || "Investor",
        user_email: (k as any).profiles?.email || "",
        user_phone: (k as any).profiles?.phone || "",
      });
    }
    return results;
  }

  public async serializeKyc(k: any): Promise<any> {
    const frontUrl = k.id_front_storage_path
      ? await this.getKycSignedUrl("kyc-documents", k.id_front_storage_path)
      : null;
    const backUrl = k.id_back_storage_path
      ? await this.getKycSignedUrl("kyc-documents", k.id_back_storage_path)
      : null;
    const selfieUrl = k.selfie_storage_path
      ? await this.getKycSignedUrl("kyc-selfies", k.selfie_storage_path)
      : null;

    const documents = [];
    if (k.id_front_storage_path) {
      documents.push({
        id: `sb:${k.id}:front`,
        doc_type: "id_front",
        storage_path: k.id_front_storage_path,
        mime: k.id_front_storage_path.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        url: frontUrl,
      });
    }
    if (k.id_back_storage_path) {
      documents.push({
        id: `sb:${k.id}:back`,
        doc_type: "id_back",
        storage_path: k.id_back_storage_path,
        mime: k.id_back_storage_path.endsWith(".pdf") ? "application/pdf" : "image/jpeg",
        url: backUrl,
      });
    }
    if (k.selfie_storage_path) {
      documents.push({
        id: `sb:${k.id}:selfie`,
        doc_type: "selfie",
        storage_path: k.selfie_storage_path,
        mime: "image/jpeg",
        url: selfieUrl,
      });
    }

    return {
      id: k.id,
      user_id: k.user_id,
      country: k.country || "IN",
      id_type: k.id_type,
      id_number: k.id_number || k.id_number_masked,
      id_number_masked: k.id_number_masked,
      permanent_address: k.permanent_address,
      address: k.permanent_address,
      front_document_url: frontUrl,
      back_document_url: backUrl,
      id_document_url: frontUrl,
      selfie_url: selfieUrl,
      documents,
      status: k.status,
      reject_reason: k.reject_reason || null,
      decided_by: k.decided_by,
      decided_at: k.decided_at,
      submitted_at: k.submitted_at || k.created_at,
      created_at: k.created_at,
      updated_at: k.updated_at,
    };
  }

  /**
   * Retrieves and streams a private KYC document buffer directly from Supabase Storage
   */
  public async getKycDocumentStream(
    docRefId: string,
    adminUser: boolean,
    requestingUserId?: string
  ): Promise<{ buffer: Buffer; contentType: string } | null> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();

    let bucket = "kyc-documents";
    let storagePath = "";
    let userId = "";

    if (docRefId.startsWith("sb:")) {
      const parts = docRefId.split(":");
      const kycId = parts[1];
      const type = parts[2] || "front";

      const { data: rec, error } = await supabase
        .from("kyc_records")
        .select("*")
        .eq("id", kycId)
        .maybeSingle();

      if (error || !rec) return null;
      userId = rec.user_id;

      if (type === "selfie") {
        bucket = "kyc-selfies";
        storagePath = rec.selfie_storage_path;
      } else if (type === "back") {
        bucket = "kyc-documents";
        storagePath = rec.id_back_storage_path;
      } else {
        bucket = "kyc-documents";
        storagePath = rec.id_front_storage_path;
      }
    } else {
      // Fallback: check if docRefId is a kyc record ID or user ID
      const { data: rec } = await supabase
        .from("kyc_records")
        .select("*")
        .or(`id.eq.${docRefId},user_id.eq.${docRefId}`)
        .maybeSingle();

      if (rec) {
        userId = rec.user_id;
        bucket = "kyc-documents";
        storagePath = rec.id_front_storage_path || rec.selfie_storage_path;
      }
    }

    if (!storagePath) return null;

    // Authorization check
    if (!adminUser && userId && userId !== requestingUserId) {
      throw new Error("Unauthorized to access this KYC document");
    }

    const { data: blob, error: dlErr } = await supabase.storage
      .from(bucket)
      .download(storagePath);

    if (dlErr || !blob) {
      console.error(`[SupabaseStorage] Download failed for ${bucket}/${storagePath}:`, dlErr?.message);
      return null;
    }

    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = blob.type || (storagePath.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

    return { buffer, contentType };
  }

  public async adminReviewKyc(params: {
    kycId?: string;
    kycIdOrUserId?: string;
    action?: "approve" | "reject";
    decision?: "approve" | "reject";
    adminId: string;
    adminEmail?: string;
    reason?: string;
    rejectReason?: string;
  }): Promise<any> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const idToLookup = params.kycId || params.kycIdOrUserId;
    if (!idToLookup) throw new Error("No KYC ID or User ID provided");

    let { data: kyc, error: fErr } = await supabase
      .from("kyc_records")
      .select("*")
      .or(`id.eq.${idToLookup},user_id.eq.${idToLookup}`)
      .limit(1)
      .maybeSingle();

    if (fErr || !kyc) throw new Error("KYC record not found: " + idToLookup);
    const nowStr = new Date().toISOString();
    const decisionAction = params.decision || params.action || "approve";
    const newStatus = decisionAction === "approve" ? "approved" : "rejected";
    const finalReason = params.rejectReason || params.reason || "Documentation unclear";

    // 1. Update KYC record
    const { data: updatedKyc, error: uErr } = await supabase
      .from("kyc_records")
      .update({
        status: newStatus,
        reject_reason: newStatus === "rejected" ? finalReason : null,
        decided_by: params.adminId.length === 36 ? params.adminId : null,
        decided_at: nowStr,
        updated_at: nowStr,
      })
      .eq("id", kyc.id)
      .select()
      .single();

    if (uErr) throw new Error("Failed to update KYC status: " + uErr.message);

    // 2. Update user's profile
    await supabase
      .from("profiles")
      .update({
        kyc_status: newStatus,
        updated_at: nowStr,
      })
      .eq("id", kyc.user_id);

    // 3. User notification
    await this.createNotification({
      userId: kyc.user_id,
      type: "kyc",
      channel: "both",
      title: params.action === "approve" ? "KYC Approved! ✅" : "KYC Rejected ⚠️",
      body: params.action === "approve"
        ? "Your identity verification is approved. Full account features and withdrawals are now unlocked."
        : `Your KYC verification was not approved. Reason: ${params.reason || "Document details could not be validated."}`,
      actionUrl: "/kyc",
      actionText: "View KYC",
    });

    // 4. Audit log
    await this.logAudit({
      adminId: params.adminId,
      adminEmail: params.adminEmail || "admin@easyx.trade",
      action: params.action === "approve" ? "APPROVE_KYC" : "REJECT_KYC",
      entityType: "kyc_records",
      entityId: kyc.id,
      reason: params.reason || `KYC status marked ${newStatus}`,
    });

    return this.serializeKyc(updatedKyc);
  }

  /* -------------------------------------------------------------------------- */
  /*                                 REFERRALS                                  */
  /* -------------------------------------------------------------------------- */

  public async getReferralSummary(userId: string): Promise<any> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) {
      return {
        referral_code: "EX000000",
        referral_link: "https://easyx.trade/register?ref=EX000000",
        commission_rate: 10,
        total_commission: "0.00",
        total_commissions: "0.00",
        total_earned: "0.00",
        referees_count: 0,
        active_referrals: 0,
        direct_referrals: [],
      };
    }
    const supabase = this.getClient();
    const profile = await this.getProfileById(userId);

    // Get referees
    const { data: referees } = await supabase
      .from("profiles")
      .select("id, name, email, created_at, kyc_status")
      .eq("referred_by", userId)
      .order("created_at", { ascending: false });

    // Get commissions
    const { data: commissions } = await supabase
      .from("referral_commissions")
      .select("*, referee:referee_id(name, email)")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    const totalCommissions = (commissions || []).reduce(
      (acc: number, c: any) => acc + Number(c.commission_amount || 0),
      0
    );

    const refCode = profile?.referral_code || "EX" + userId.slice(0, 6).toUpperCase();

    return {
      referral_code: refCode,
      referral_link: `https://easyx.trade/register?ref=${refCode}`,
      commission_rate: 10,
      total_commission: fmt(totalCommissions),
      total_commissions: fmt(totalCommissions),
      total_earned: fmt(totalCommissions),
      referees_count: referees?.length || 0,
      active_referrals: referees?.length || 0,
      direct_referrals: (referees || []).map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        joined_at: r.created_at,
        created_at: r.created_at,
        kyc_status: r.kyc_status,
      })),
      commissions_history: (commissions || []).map((c: any) => ({
        id: c.id,
        referee_id: c.referee_id,
        referee_name: c.referee?.name || "Referral",
        investment_id: c.investment_id,
        commission_amount: fmt(c.commission_amount),
        tier_percentage: c.tier_percentage,
        status: c.status,
        created_at: c.created_at,
      })),
    };
  }

  /* -------------------------------------------------------------------------- */
  /*                               NOTIFICATIONS                                */
  /* -------------------------------------------------------------------------- */

  public async getUserNotifications(userId: string, unreadOnly: boolean = false): Promise<any[]> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    let query = supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(60);

    if (unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map((n) => ({
      id: n.id,
      user_id: n.user_id,
      title: n.title,
      body: n.body,
      message: n.body,
      type: n.type,
      channel: n.channel,
      action_url: n.action_url,
      action_text: n.action_text,
      is_read: Boolean(n.is_read),
      read_at: n.read_at,
      created_at: n.created_at,
    }));
  }

  public async getUnreadNotificationCount(userId: string): Promise<number> {
    if (!userId || !isUuid(userId) || !isSupabaseAdminConfigured()) return 0;
    const supabase = this.getClient();
    const { count, error } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) return 0;
    return count || 0;
  }

  public async createNotification(params: {
    userId: string;
    title: string;
    body: string;
    type?: "investment" | "deposit" | "withdrawal" | "kyc" | "security" | "referral" | "system";
    channel?: "in_app" | "push" | "both";
    actionUrl?: string;
    actionText?: string;
    senderAdmin?: string;
  }): Promise<any> {
    if (!isSupabaseAdminConfigured()) return null;
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        title: params.title,
        body: params.body,
        type: params.type || "system",
        channel: params.channel || "both",
        action_url: params.actionUrl || null,
        action_text: params.actionText || null,
        sender_admin: params.senderAdmin || null,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[SupabaseDb] Notification insert notice:", error.message);
    }
    return data;
  }

  public async markNotificationRead(id: string, userId: string): Promise<void> {
    if (!isSupabaseAdminConfigured()) return;
    const supabase = this.getClient();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", userId);
  }

  public async markAllNotificationsRead(userId: string): Promise<void> {
    if (!isSupabaseAdminConfigured()) return;
    const supabase = this.getClient();
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("is_read", false);
  }

  /* -------------------------------------------------------------------------- */
  /*                                AUDIT LOGS                                  */
  /* -------------------------------------------------------------------------- */

  public async logAudit(params: {
    adminId?: string;
    adminEmail: string;
    action: string;
    entityType: string;
    entityId: string;
    amount?: number;
    reason?: string;
    meta?: any;
  }): Promise<void> {
    if (!isSupabaseAdminConfigured()) return;
    try {
      const supabase = this.getClient();
      await supabase.from("audit_logs").insert({
        admin_id: params.adminId && params.adminId.length === 36 ? params.adminId : null,
        admin_email: params.adminEmail,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId,
        amount: params.amount != null ? Number(params.amount) : null,
        reason: params.reason || null,
        meta: params.meta || {},
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[SupabaseDb] Audit log notice:", err.message);
    }
  }

  public async getAuditLogs(limit: number = 100): Promise<any[]> {
    if (!isSupabaseAdminConfigured()) return [];
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];
    return data;
  }

  /* -------------------------------------------------------------------------- */
  /*                             PLATFORM SETTINGS                              */
  /* -------------------------------------------------------------------------- */

  public async getPlatformSettings(): Promise<Record<string, any>> {
    if (!isSupabaseAdminConfigured()) return {};
    const supabase = this.getClient();
    const { data, error } = await supabase.from("platform_settings").select("*");
    if (error || !data) return {};

    const map: Record<string, any> = {};
    for (const row of data) {
      map[row.key] = row.value;
    }
    return map;
  }

  public async updatePlatformSetting(key: string, value: any, adminId?: string): Promise<void> {
    if (!isSupabaseAdminConfigured()) return;
    const supabase = this.getClient();
    await supabase.from("platform_settings").upsert(
      {
        key,
        value,
        updated_by: adminId && adminId.length === 36 ? adminId : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );
  }
}

export const supabaseDb = SupabaseDbService.getInstance();
