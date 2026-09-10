import { getSupabaseServerClient, isSupabaseServerConfigured } from "./supabaseAdmin";

/**
 * Supabase Synchronization Engine
 * Bridges EasyX core in-memory state with Supabase Postgres tables in real time.
 */

export class SupabaseSyncService {
  private static instance: SupabaseSyncService | null = null;

  public static getInstance(): SupabaseSyncService {
    if (!this.instance) {
      this.instance = new SupabaseSyncService();
    }
    return this.instance;
  }

  /**
   * Sync User Profile to Supabase 'profiles' and 'wallets'
   */
  public async syncUserProfile(user: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !user || !user.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      // Upsert profile
      await client.from("profiles").upsert(
        {
          id: user.id,
          name: user.name || "User",
          email: user.email?.toLowerCase(),
          phone: user.phone || null,
          role: user.role === "admin" ? "admin" : "user",
          status: user.isSuspended ? "suspended" : "active",
          email_verified: Boolean(user.emailVerified),
          kyc_status: user.kycStatus || "none",
          referral_code: user.referralCode || `EX${user.id.slice(0, 6).toUpperCase()}`,
          two_factor_enabled: Boolean(user.twoFactorEnabled),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncUserProfile warning:", err?.message || err);
    }
  }

  /**
   * Sync Wallet to Supabase 'wallets'
   */
  public async syncWallet(userId: string, wallet: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !userId || !wallet) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      // In production, Supabase is the authoritative source for financial balances.
      // Do not overwrite an existing Supabase wallet with stale local in-memory values.
      const { data: existing } = await client
        .from("wallets")
        .select("id, available_balance, total_deposited")
        .eq("user_id", userId)
        .maybeSingle();

      if (existing) {
        // Supabase already holds the authoritative financial record; never overwrite it.
        return;
      }

      await client.from("wallets").insert({
        user_id: userId,
        available_balance: Number(wallet.balance ?? wallet.available_balance ?? 0),
        total_invested: Number(wallet.totalInvested ?? wallet.total_invested ?? 0),
        total_profit: Number(wallet.totalProfit ?? wallet.total_profit ?? 0),
        total_deposited: Number(wallet.totalDeposited ?? wallet.total_deposited ?? 0),
        total_withdrawn: Number(wallet.totalWithdrawn ?? wallet.total_withdrawn ?? 0),
        pending_withdrawal: Number(wallet.pendingWithdrawal ?? wallet.pending_withdrawal ?? 0),
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[SupabaseSync] syncWallet warning:", err?.message || err);
    }
  }

  /**
   * Sync Wallet Transaction to Supabase 'wallet_transactions'
   */
  public async syncTransaction(tx: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !tx || !tx.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("wallet_transactions").upsert(
        {
          id: tx.id,
          user_id: tx.userId || tx.user_id,
          wallet_id: tx.walletId || tx.wallet_id || tx.userId || tx.user_id,
          type: tx.type || "ADMIN_ADJUSTMENT",
          direction: tx.direction || (tx.amount >= 0 ? "credit" : "debit"),
          amount: Math.abs(Number(tx.amount || 0)),
          balance_after: Number(tx.balanceAfter ?? tx.balance_after ?? 0),
          ref_type: tx.refType || tx.ref_type || null,
          ref_id: tx.refId || tx.ref_id || null,
          status: tx.status || "completed",
          idempotency_key: tx.idempotencyKey || tx.idempotency_key || null,
          note: tx.note || tx.description || null,
          created_at: tx.createdAt || tx.created_at || new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncTransaction warning:", err?.message || err);
    }
  }

  /**
   * Sync Investment to Supabase 'investments'
   */
  public async syncInvestment(inv: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !inv || !inv.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("investments").upsert(
        {
          id: inv.id,
          user_id: inv.userId || inv.user_id,
          plan_key: inv.planKey || inv.plan_key || inv.planId || "basic",
          plan_name: inv.planName || inv.plan_name || "Investment Plan",
          principal: Number(inv.principal || inv.amount || 0),
          profit_percentage: Number(inv.profit_percentage_snapshot ?? inv.profitPercentage ?? inv.profit_percentage ?? 60),
          maturity_percentage: Number(inv.maturity_percentage_snapshot ?? inv.maturityPercentage ?? inv.maturity_percentage ?? 160),
          expected_profit: Number(inv.profit_amount ?? inv.expectedProfit ?? inv.expected_profit ?? 0),
          expected_payout: Number(inv.maturity_amount ?? inv.expectedPayout ?? inv.expected_payout ?? 0),
          lock_days: Number(inv.lock_days_snapshot ?? inv.lockDays ?? inv.lock_days ?? 60),
          start_at: inv.startDate || inv.start_at || new Date().toISOString(),
          maturity_at: inv.maturityDate || inv.maturity_at,
          status: inv.status || "active",
          payout_status: inv.payoutStatus || inv.payout_status || "locked",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncInvestment warning:", err?.message || err);
    }
  }

  /**
   * Sync Deposit to Supabase 'payment_deposits'
   */
  public async syncDeposit(dep: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !dep || !dep.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("payment_deposits").upsert(
        {
          id: dep.id,
          user_id: dep.userId || dep.user_id,
          network: dep.network || "TRC20",
          amount: Number(dep.amount || 0),
          approved_amount: dep.approvedAmount ? Number(dep.approvedAmount) : null,
          to_address: dep.toAddress || dep.to_address || "TXYZ...",
          tx_hash: dep.txHash || dep.tx_hash || null,
          proof_file_url: dep.proofUrl || dep.proof_file_url || null,
          status: dep.status || "pending",
          admin_note: dep.adminNote || dep.admin_note || null,
          created_at: dep.createdAt || dep.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncDeposit warning:", err?.message || err);
    }
  }

  /**
   * Sync Withdrawal to Supabase 'withdrawals'
   */
  public async syncWithdrawal(wd: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !wd || !wd.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("withdrawals").upsert(
        {
          id: wd.id,
          user_id: wd.userId || wd.user_id,
          amount: Number(wd.amount || 0),
          fee: Number(wd.fee || 0),
          net_amount: Number(wd.netAmount ?? wd.net_amount ?? wd.amount ?? 0),
          network: wd.network || "TRC20",
          destination_address: wd.destinationAddress || wd.destination_address || wd.address || "",
          status: wd.status || "pending",
          payout_tx_hash: wd.payoutTxHash || wd.payout_tx_hash || null,
          rejection_reason: wd.rejectionReason || wd.rejection_reason || null,
          created_at: wd.createdAt || wd.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncWithdrawal warning:", err?.message || err);
    }
  }

  /**
   * Sync KYC Record to Supabase 'kyc_records'
   */
  public async syncKycRecord(kyc: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !kyc || !kyc.userId) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("kyc_records").upsert(
        {
          user_id: kyc.userId,
          country: kyc.country || "US",
          id_type: kyc.idType || "national_id",
          id_number_masked: kyc.idNumberMasked || kyc.idNumber || "****",
          id_front_storage_path: kyc.idFrontUrl || kyc.id_front_storage_path || null,
          id_back_storage_path: kyc.idBackUrl || kyc.id_back_storage_path || null,
          selfie_storage_path: kyc.selfieUrl || kyc.selfie_storage_path || null,
          liveness_score: kyc.livenessScore || 95,
          liveness_passed: Boolean(kyc.livenessPassed ?? true),
          status: kyc.status || "pending",
          reject_reason: kyc.rejectReason || null,
          submitted_at: kyc.submittedAt || new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncKycRecord warning:", err?.message || err);
    }
  }

  /**
   * Sync Notification to Supabase 'notifications'
   */
  public async syncNotification(notif: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !notif || !notif.id) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("notifications").upsert(
        {
          id: notif.id,
          user_id: notif.userId || notif.user_id,
          title: notif.title || "Notification",
          message: notif.message || "",
          type: notif.type || "system",
          is_read: Boolean(notif.isRead ?? notif.read ?? false),
          created_at: notif.createdAt || notif.created_at || new Date().toISOString(),
        },
        { onConflict: "id" }
      );
    } catch (err: any) {
      console.warn("[SupabaseSync] syncNotification warning:", err?.message || err);
    }
  }

  /**
   * Sync Audit Log to Supabase 'audit_logs'
   */
  public async syncAuditLog(log: any): Promise<void> {
    if (!isSupabaseServerConfigured() || !log) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("audit_logs").insert({
        actor_id: log.actorId || log.userId || null,
        actor_role: log.actorRole || "user",
        action: log.action || "SYSTEM_ACTION",
        resource_type: log.resourceType || "system",
        resource_id: log.resourceId || null,
        details: log.details || {},
        created_at: log.timestamp || new Date().toISOString(),
      });
    } catch (err: any) {
      console.warn("[SupabaseSync] syncAuditLog warning:", err?.message || err);
    }
  }

  /**
   * Sync complete in-memory DB collections to Supabase
   */
  public async syncEntireStateToSupabase(db: any): Promise<void> {
    if (!isSupabaseServerConfigured()) return;
    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      if (db.users) {
        for (const user of db.users.values()) {
          await this.syncUserProfile(user);
        }
      }
      if (db.wallets) {
        for (const [userId, wallet] of db.wallets.entries()) {
          await this.syncWallet(userId, wallet);
        }
      }
      if (db.investments) {
        for (const inv of db.investments.values()) {
          await this.syncInvestment(inv);
        }
      }
      if (db.deposits) {
        for (const dep of db.deposits.values()) {
          await this.syncDeposit(dep);
        }
      }
      if (db.withdrawals) {
        for (const wd of db.withdrawals.values()) {
          await this.syncWithdrawal(wd);
        }
      }
      if (db.kyc_records) {
        for (const kyc of db.kyc_records.values()) {
          await this.syncKycRecord(kyc);
        }
      }
    } catch (err: any) {
      console.warn("[SupabaseSync] Batch sync warning:", err?.message || err);
    }
  }
}

export const supabaseSync = SupabaseSyncService.getInstance();
