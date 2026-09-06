import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface BackupMetadata {
  id: string;
  filename: string;
  timestamp: string;
  sizeBytes: number;
  recordCounts: {
    users: number;
    wallets: number;
    investments: number;
    deposits: number;
    withdrawals: number;
    kyc_records: number;
    referrals: number;
    support_tickets: number;
    notifications: number;
  };
  sha256: string;
  type: "automated" | "manual" | "pre_deploy";
  status: "success" | "failed";
  storageLocation: string;
  retentionCategory: "daily" | "weekly" | "archive";
  restoredTested?: boolean;
  lastTestRestoreAt?: string;
  testRestoreResult?: {
    valid: boolean;
    integrityVerified: boolean;
    issues: string[];
    testedAt: string;
  };
}

export interface BackupSystemSettings {
  autoBackupEnabled: boolean;
  intervalHours: number; // e.g. 24 (daily) or 6 (every 6 hours)
  retentionDays: number; // default 30
  maxBackupsCount: number; // default 50
  separateStorageDir: string;
  lastSuccessfulBackup?: string;
  lastFailedBackup?: string;
  lastFailureError?: string;
  lastTestRestoreAt?: string;
  rpoHours: number; // Recovery Point Objective target (e.g. 24 hours)
  rtoMinutes: number; // Recovery Time Objective target (e.g. 15 minutes)
}

export class BackupService {
  private dataDir: string;
  private backupDir: string;
  private metadataFile: string;
  private settingsFile: string;
  private settings: BackupSystemSettings;
  private history: BackupMetadata[] = [];
  private dbRefGetter: () => any;
  private autoBackupTimer: NodeJS.Timeout | null = null;

  constructor(dataDir: string, dbRefGetter: () => any) {
    this.dataDir = dataDir;
    this.backupDir = path.join(dataDir, "backups");
    this.metadataFile = path.join(this.backupDir, "backup_manifest.json");
    this.settingsFile = path.join(this.backupDir, "backup_settings.json");
    this.dbRefGetter = dbRefGetter;

    this.settings = {
      autoBackupEnabled: true,
      intervalHours: 24,
      retentionDays: 30,
      maxBackupsCount: 50,
      separateStorageDir: this.backupDir,
      rpoHours: 24,
      rtoMinutes: 15,
    };

    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }

      if (fs.existsSync(this.settingsFile)) {
        const raw = fs.readFileSync(this.settingsFile, "utf8");
        this.settings = { ...this.settings, ...JSON.parse(raw) };
      } else {
        this.persistSettings();
      }

      if (fs.existsSync(this.metadataFile)) {
        const raw = fs.readFileSync(this.metadataFile, "utf8");
        this.history = JSON.parse(raw);
      }

      this.scheduleAutomatedBackups();
    } catch (err) {
      console.error("[BackupService] Init error:", err);
    }
  }

  private persistSettings() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      fs.writeFileSync(this.settingsFile, JSON.stringify(this.settings, null, 2), "utf8");
    } catch (err) {
      console.error("[BackupService] Failed to persist backup settings:", err);
    }
  }

  private persistManifest() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
      fs.writeFileSync(this.metadataFile, JSON.stringify(this.history, null, 2), "utf8");
    } catch (err) {
      console.error("[BackupService] Failed to persist backup manifest:", err);
    }
  }

  public scheduleAutomatedBackups() {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }

    if (!this.settings.autoBackupEnabled) return;

    const intervalMs = Math.max(1, this.settings.intervalHours) * 60 * 60 * 1000;
    
    // Check if we need to perform an initial backup (e.g. if no backups or last backup is older than interval)
    const lastTime = this.settings.lastSuccessfulBackup ? new Date(this.settings.lastSuccessfulBackup).getTime() : 0;
    const now = Date.now();
    if (now - lastTime > intervalMs) {
      setTimeout(() => {
        this.createBackup("automated", "Automated scheduled backup");
      }, 5000);
    }

    this.autoBackupTimer = setInterval(() => {
      this.createBackup("automated", "Automated scheduled backup");
    }, intervalMs);
    this.autoBackupTimer.unref();
  }

  /**
   * Creates a snapshot of all authoritative collections from memory
   */
  public createBackup(type: "automated" | "manual" | "pre_deploy" = "manual", note?: string): BackupMetadata {
    const db = this.dbRefGetter();
    const timestamp = new Date().toISOString();
    const backupId = `bk_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    const filename = `easyx_backup_${backupId}.json`;
    const targetPath = path.join(this.backupDir, filename);

    try {
      // Serialize clean data snapshot without leaking transient cache or secrets
      const snapshot = {
        _schema_version: "2.1",
        _created_at: timestamp,
        _backup_id: backupId,
        _type: type,
        _note: note || "",
        users: Array.from(db.users.entries()),
        wallets: Array.from(db.wallets.entries()),
        wallet_transactions: Array.from(db.wallet_transactions.entries()),
        investment_plans: Array.from(db.investment_plans.entries()),
        plan_history: db.plan_history || [],
        investments: Array.from(db.investments.entries()),
        deposits: Array.from(db.deposits.entries()),
        withdrawals: Array.from(db.withdrawals.entries()),
        referrals: db.referrals || [],
        referral_commissions: Array.from(db.referral_commissions.entries()),
        kyc_records: Array.from(db.kyc_records.entries()),
        kyc_documents: Array.from(db.kyc_documents.entries()).map(([k, doc]: any) => [
          k,
          {
            ...doc,
            data: doc.data && Buffer.isBuffer(doc.data) ? doc.data.toString("base64") : doc.data,
            _is_b64: Boolean(doc.data && Buffer.isBuffer(doc.data)),
          },
        ]),
        liveness_sessions: Array.from(db.liveness_sessions.entries()),
        password_resets: Array.from(db.password_resets.entries()),
        notifications: db.notifications || [],
        audit_logs: db.audit_logs || [],
        platform_settings: db.platform_settings,
        maintenance_settings: db.maintenance_settings,
        reminder_settings: db.reminder_settings,
        user_preferences: Array.from(db.user_preferences.entries()),
        push_subscriptions: Array.from(db.push_subscriptions.entries()),
        support_tickets: Array.from(db.support_tickets.entries()),
        support_messages: Array.from(db.support_messages.entries()),
        support_attachments: Array.from(db.support_attachments.entries()),
        support_faqs: Array.from(db.support_faqs.entries()),
        support_ai_settings: db.support_ai_settings,
        support_ai_conversations: Array.from(db.support_ai_conversations.entries()),
        support_ai_unanswered: Array.from(db.support_ai_unanswered.entries()),
      };

      const payload = JSON.stringify(snapshot, null, 2);
      const sha256 = crypto.createHash("sha256").update(payload).digest("hex");

      fs.writeFileSync(targetPath, payload, "utf8");
      const stat = fs.statSync(targetPath);

      const metadata: BackupMetadata = {
        id: backupId,
        filename,
        timestamp,
        sizeBytes: stat.size,
        recordCounts: {
          users: db.users.size,
          wallets: db.wallets.size,
          investments: db.investments.size,
          deposits: db.deposits.size,
          withdrawals: db.withdrawals.size,
          kyc_records: db.kyc_records.size,
          referrals: (db.referrals || []).length,
          support_tickets: db.support_tickets.size,
          notifications: (db.notifications || []).length,
        },
        sha256,
        type,
        status: "success",
        storageLocation: targetPath,
        retentionCategory: "daily",
      };

      this.history.unshift(metadata);
      this.settings.lastSuccessfulBackup = timestamp;
      this.settings.lastFailureError = undefined;

      this.pruneOldBackups();
      this.persistManifest();
      this.persistSettings();

      console.log(`[BackupService] Snapshot ${backupId} created successfully (${(stat.size / 1024).toFixed(1)} KB).`);
      return metadata;
    } catch (err: any) {
      console.error("[BackupService] Failed to create backup:", err);
      this.settings.lastFailedBackup = timestamp;
      this.settings.lastFailureError = err?.message || "Unknown error during snapshot creation";
      this.persistSettings();
      throw err;
    }
  }

  /**
   * Automated retention pruning based on max days and count
   */
  public pruneOldBackups(): number {
    const maxAgeMs = this.settings.retentionDays * 24 * 60 * 60 * 1000;
    const now = Date.now();
    let prunedCount = 0;

    const remaining: BackupMetadata[] = [];
    for (let i = 0; i < this.history.length; i++) {
      const item = this.history[i];
      const ageMs = now - new Date(item.timestamp).getTime();

      // Keep if within retention days AND under max count, or if top 3 most recent
      if ((ageMs < maxAgeMs && remaining.length < this.settings.maxBackupsCount) || remaining.length < 3) {
        remaining.push(item);
      } else {
        const filePath = path.join(this.backupDir, item.filename);
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            prunedCount++;
          } catch (e) {
            console.error(`[BackupService] Failed to delete pruned file ${item.filename}:`, e);
          }
        }
      }
    }

    this.history = remaining;
    this.persistManifest();
    return prunedCount;
  }

  /**
   * Safe Isolated Restore Test
   * Validates snapshot integrity, parses all collections, verifies financial relations and foreign keys
   * WITHOUT overwriting or altering the production database.
   */
  public performTestRestore(backupId: string): {
    valid: boolean;
    integrityVerified: boolean;
    issues: string[];
    testedAt: string;
    details: any;
  } {
    const item = this.history.find((b) => b.id === backupId);
    if (!item) {
      throw new Error(`Backup record ${backupId} not found.`);
    }

    const filePath = path.join(this.backupDir, item.filename);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Backup file ${item.filename} is missing on disk.`);
    }

    const issues: string[] = [];
    const testedAt = new Date().toISOString();

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const computedHash = crypto.createHash("sha256").update(raw).digest("hex");

      if (computedHash !== item.sha256) {
        issues.push("Checksum mismatch: file SHA-256 does not match manifest record.");
      }

      const parsed = JSON.parse(raw);
      if (!parsed._created_at || !parsed.users) {
        issues.push("Schema invalid: missing metadata or root user table.");
      }

      // Check record integrity in temporary isolated sandbox
      const testUsers = new Map<string, any>(parsed.users || []);
      const testWallets = new Map<string, any>(parsed.wallets || []);
      const testInvestments = new Map<string, any>(parsed.investments || []);
      const testDeposits = new Map<string, any>(parsed.deposits || []);
      const testWithdrawals = new Map<string, any>(parsed.withdrawals || []);
      const testKyc = new Map<string, any>(parsed.kyc_records || []);

      // 1. Verify User -> Wallet link
      for (const [userId, user] of testUsers.entries()) {
        if (!testWallets.has(userId)) {
          issues.push(`Integrity Notice: User ${user.email || userId} has no wallet entity.`);
        }
      }

      // 2. Verify Investment -> User link
      for (const [invId, inv] of testInvestments.entries()) {
        if (!testUsers.has(inv.userId || inv.user_id)) {
          issues.push(`Orphaned Investment: Plan investment ${invId} references missing user ${inv.userId || inv.user_id}.`);
        }
      }

      // 3. Verify Deposit -> User link
      for (const [depId, dep] of testDeposits.entries()) {
        if (!testUsers.has(dep.userId || dep.user_id)) {
          issues.push(`Orphaned Deposit: Deposit ${depId} references missing user.`);
        }
      }

      // 4. Verify Withdrawal -> User link
      for (const [wId, w] of testWithdrawals.entries()) {
        if (!testUsers.has(w.userId || w.user_id)) {
          issues.push(`Orphaned Withdrawal: Withdrawal ${wId} references missing user.`);
        }
      }

      const valid = issues.length === 0;
      const result = {
        valid,
        integrityVerified: valid,
        issues,
        testedAt,
        details: {
          usersCount: testUsers.size,
          walletsCount: testWallets.size,
          investmentsCount: testInvestments.size,
          depositsCount: testDeposits.size,
          withdrawalsCount: testWithdrawals.size,
          kycCount: testKyc.size,
          checksumVerified: computedHash === item.sha256,
        },
      };

      item.restoredTested = true;
      item.lastTestRestoreAt = testedAt;
      item.testRestoreResult = {
        valid,
        integrityVerified: valid,
        issues,
        testedAt,
      };
      this.settings.lastTestRestoreAt = testedAt;

      this.persistManifest();
      this.persistSettings();

      return result;
    } catch (err: any) {
      issues.push(`JSON Parse / Validation failure: ${err?.message || "Corrupted payload"}`);
      return {
        valid: false,
        integrityVerified: false,
        issues,
        testedAt,
        details: {},
      };
    }
  }

  public getBackupsList(): BackupMetadata[] {
    return this.history;
  }

  public getSettings(): BackupSystemSettings {
    return this.settings;
  }

  public updateSettings(newSettings: Partial<BackupSystemSettings>): BackupSystemSettings {
    this.settings = {
      ...this.settings,
      ...newSettings,
    };
    this.persistSettings();
    this.scheduleAutomatedBackups();
    return this.settings;
  }

  public getBackupFilePath(backupId: string): string | null {
    const item = this.history.find((b) => b.id === backupId);
    if (!item) return null;
    const p = path.join(this.backupDir, item.filename);
    return fs.existsSync(p) ? p : null;
  }

  public getOverview() {
    const now = Date.now();
    const lastBackup = this.history[0];
    const ageHours = lastBackup ? Math.round((now - new Date(lastBackup.timestamp).getTime()) / (1000 * 60 * 60)) : null;

    return {
      totalBackups: this.history.length,
      lastSuccessfulBackup: this.settings.lastSuccessfulBackup || (lastBackup ? lastBackup.timestamp : null),
      lastFailedBackup: this.settings.lastFailedBackup || null,
      lastFailureError: this.settings.lastFailureError || null,
      backupAgeHours: ageHours,
      lastTestRestoreAt: this.settings.lastTestRestoreAt || null,
      autoBackupEnabled: this.settings.autoBackupEnabled,
      intervalHours: this.settings.intervalHours,
      retentionDays: this.settings.retentionDays,
      rpoHours: this.settings.rpoHours,
      rtoMinutes: this.settings.rtoMinutes,
      status: !lastBackup
        ? "warning"
        : ageHours !== null && ageHours > this.settings.intervalHours * 1.5
        ? "attention_needed"
        : "healthy",
    };
  }
}
