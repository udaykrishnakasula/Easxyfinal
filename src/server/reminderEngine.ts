import crypto from "crypto";
import {
  type ReminderWorkflowConfig,
  type ReminderGlobalSettings,
  type ReminderLogEntry,
  type UserNotificationPreferences,
  DEFAULT_REMINDER_WORKFLOWS,
  DEFAULT_REMINDER_GLOBAL_SETTINGS,
  DEFAULT_USER_NOTIFICATION_PREFERENCES,
  interpolateMessage,
  isWithinQuietHours,
} from "./reminderService";

const genId = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();

export class ReminderEngine {
  private db: any;
  private createNotificationFn: (
    userId: string,
    ntype: string,
    title: string,
    body?: string,
    dedupeKey?: string,
    investmentId?: string,
    extraMeta?: any
  ) => boolean;

  constructor(
    db: any,
    createNotificationFn: (
      userId: string,
      ntype: string,
      title: string,
      body?: string,
      dedupeKey?: string,
      investmentId?: string,
      extraMeta?: any
    ) => boolean
  ) {
    this.db = db;
    this.createNotificationFn = createNotificationFn;
    this.ensureInitialized();
  }

  public ensureInitialized() {
    if (!this.db.reminder_settings) {
      this.db.reminder_settings = {
        global: { ...DEFAULT_REMINDER_GLOBAL_SETTINGS },
        workflows: JSON.parse(JSON.stringify(DEFAULT_REMINDER_WORKFLOWS)),
      };
    }
    if (!Array.isArray(this.db.reminder_logs)) {
      this.db.reminder_logs = [];
    }
    if (!this.db.user_preferences) {
      this.db.user_preferences = new Map<string, UserNotificationPreferences>();
    }
    if (!this.db.push_subscriptions) {
      this.db.push_subscriptions = new Map<string, any>();
    }
  }

  public getGlobalSettings(): ReminderGlobalSettings {
    this.ensureInitialized();
    return this.db.reminder_settings.global || DEFAULT_REMINDER_GLOBAL_SETTINGS;
  }

  public setGlobalSettings(settings: Partial<ReminderGlobalSettings>) {
    this.ensureInitialized();
    this.db.reminder_settings.global = {
      ...this.db.reminder_settings.global,
      ...settings,
    };
  }

  public getWorkflows(): ReminderWorkflowConfig[] {
    this.ensureInitialized();
    return this.db.reminder_settings.workflows || DEFAULT_REMINDER_WORKFLOWS;
  }

  public setWorkflows(workflows: ReminderWorkflowConfig[]) {
    this.ensureInitialized();
    this.db.reminder_settings.workflows = workflows;
  }

  public getSettings(): { global: ReminderGlobalSettings; workflows: ReminderWorkflowConfig[] } {
    this.ensureInitialized();
    return {
      global: this.getGlobalSettings(),
      workflows: this.getWorkflows(),
    };
  }

  public updateWorkflow(key: string, patch: Partial<ReminderWorkflowConfig>): ReminderWorkflowConfig | null {
    this.ensureInitialized();
    const list: ReminderWorkflowConfig[] = this.db.reminder_settings.workflows;
    const idx = list.findIndex((w) => w.key === key);
    if (idx === -1) return null;
    list[idx] = { ...list[idx], ...patch };
    return list[idx];
  }

  public getUserPreferences(userId: string): UserNotificationPreferences {
    this.ensureInitialized();
    const prefs = this.db.user_preferences.get(userId);
    if (!prefs) return { ...DEFAULT_USER_NOTIFICATION_PREFERENCES };
    return { ...DEFAULT_USER_NOTIFICATION_PREFERENCES, ...prefs };
  }

  public setUserPreferences(userId: string, prefs: Partial<UserNotificationPreferences>): UserNotificationPreferences {
    this.ensureInitialized();
    const current = this.getUserPreferences(userId);
    const updated = { ...current, ...prefs };
    this.db.user_preferences.set(userId, updated);
    return updated;
  }

  public registerPushSubscription(userId: string, subscription: any) {
    this.ensureInitialized();
    this.db.push_subscriptions.set(userId, {
      userId,
      subscription,
      updated_at: nowIso(),
    });
  }

  public getReminderLogs(): ReminderLogEntry[] {
    this.ensureInitialized();
    return this.db.reminder_logs || [];
  }

  /**
   * Called when a user performs a key action (e.g. deposit, KYC submit/approve, investment)
   * to mark past reminder conversions and stop future reminders.
   */
  public handleUserActionCompleted(userId: string, actionType: "deposit" | "kyc" | "investment") {
    this.ensureInitialized();
    const logs: ReminderLogEntry[] = this.db.reminder_logs;
    const now = nowIso();
    let updated = 0;

    let targetWorkflows: string[] = [];
    if (actionType === "deposit") targetWorkflows = ["no_deposit"];
    else if (actionType === "kyc") targetWorkflows = ["kyc_incomplete", "kyc_rejected"];
    else if (actionType === "investment") targetWorkflows = ["investment_reminder"];

    for (const log of logs) {
      if (log.user_id === userId && targetWorkflows.includes(log.workflow) && !log.action_completed) {
        log.action_completed = true;
        log.completed_at = now;
        updated++;
      }
    }
    return updated;
  }

  /**
   * Evaluates if a user has completed the condition that stops the workflow
   */
  private isWorkflowStopConditionMet(user: any, workflowKey: string): { stop: boolean; reason?: string } {
    if (user.status !== "active") {
      return { stop: true, reason: `User status is '${user.status}' (not active)` };
    }

    if (workflowKey === "no_deposit") {
      // Check if user has made any deposit (approved or pending)
      for (const dep of this.db.deposits.values()) {
        if (dep.user_id === user.id && (dep.status === "approved" || dep.status === "pending")) {
          return { stop: true, reason: `Deposit already initiated/approved (id: ${dep.id}, status: ${dep.status})` };
        }
      }
      // Check if wallet has positive balance or total invested
      const wallet = this.db.wallets.get(user.id);
      if (wallet && (Number(wallet.available_balance || 0) > 0 || Number(wallet.total_invested || 0) > 0)) {
        return { stop: true, reason: `Wallet has balance (${wallet.available_balance} USDT)` };
      }
      // Check if any investment exists
      for (const inv of this.db.investments.values()) {
        if (inv.user_id === user.id && inv.status !== "cancelled") {
          return { stop: true, reason: `User already has investment (id: ${inv.id})` };
        }
      }
      return { stop: false };
    }

    if (workflowKey === "kyc_incomplete") {
      if (user.kyc_status === "approved") {
        return { stop: true, reason: "KYC already approved" };
      }
      if (user.kyc_status === "pending") {
        return { stop: true, reason: "KYC is currently pending review" };
      }
      const kycRec = this.db.kyc_records.get(user.id);
      if (kycRec && (kycRec.status === "approved" || kycRec.status === "pending")) {
        return { stop: true, reason: `KYC record status is '${kycRec.status}'` };
      }
      return { stop: false };
    }

    if (workflowKey === "kyc_rejected") {
      if (user.kyc_status === "approved" || user.kyc_status === "pending") {
        return { stop: true, reason: `KYC status resolved to '${user.kyc_status}'` };
      }
      return { stop: false };
    }

    if (workflowKey === "investment_reminder") {
      const wallet = this.db.wallets.get(user.id);
      const balance = Number(wallet?.available_balance || 0);
      if (balance < 300) {
        return { stop: true, reason: `Insufficient wallet balance (${balance} USDT < $300 minimum plan)` };
      }
      for (const inv of this.db.investments.values()) {
        if (inv.user_id === user.id && inv.status === "active") {
          return { stop: true, reason: "User has active investment" };
        }
      }
      return { stop: false };
    }

    return { stop: false };
  }

  /**
   * Main reminder evaluation sweep across all non-admin users
   */
  public async runSweep(): Promise<{
    ran_at: string;
    users_evaluated: number;
    reminders_sent: number;
    reminders_skipped: number;
    workflows_stopped: number;
    details: Array<{
      userId: string;
      userEmail: string;
      workflow: string;
      stage: number;
      action: "SENT" | "SKIPPED" | "STOPPED";
      reason?: string;
    }>;
  }> {
    this.ensureInitialized();
    const now = new Date();
    const nowTimestamp = now.getTime();
    const nowMonthKey = now.toISOString().slice(0, 7); // "YYYY-MM"
    const todayDateKey = now.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const globalSettings = this.getGlobalSettings();
    const workflows = this.getWorkflows().filter((w) => w.enabled);

    const users: any[] = Array.from(this.db.users.values()).filter((u: any) => u.role !== "admin");
    const logs: ReminderLogEntry[] = this.db.reminder_logs;

    let remindersSent = 0;
    let remindersSkipped = 0;
    let workflowsStopped = 0;
    const details: any[] = [];

    const inQuietHours = isWithinQuietHours(now, globalSettings.quiet_hours);

    for (const user of users) {
      if (user.status !== "active") continue;

      const userPrefs = this.getUserPreferences(user.id);

      // Monthly Safety Limit Check: count sent reminders this month
      const userMonthlySentCount = logs.filter(
        (l) => l.user_id === user.id && l.status === "SENT" && l.sent_at && l.sent_at.startsWith(nowMonthKey)
      ).length;

      for (const wf of workflows) {
        // 1. Check user category preference
        if (userPrefs[wf.category] === false) {
          details.push({
            userId: user.id,
            userEmail: user.email,
            workflow: wf.key,
            stage: 0,
            action: "SKIPPED",
            reason: `User disabled '${wf.category}' notification category`,
          });
          remindersSkipped++;
          continue;
        }

        // 2. Condition-First Check: Stop Condition
        const stopCheck = this.isWorkflowStopConditionMet(user, wf.key);
        if (stopCheck.stop) {
          // If condition met, make sure past reminders are marked converted if applicable
          if (wf.key === "no_deposit") this.handleUserActionCompleted(user.id, "deposit");
          if (wf.key === "kyc_incomplete") this.handleUserActionCompleted(user.id, "kyc");

          details.push({
            userId: user.id,
            userEmail: user.email,
            workflow: wf.key,
            stage: 0,
            action: "STOPPED",
            reason: stopCheck.reason || "Action completed by user",
          });
          workflowsStopped++;
          continue;
        }

        // 3. Check Global Monthly Safety Limit
        if (userMonthlySentCount >= globalSettings.monthly_limit_per_user) {
          details.push({
            userId: user.id,
            userEmail: user.email,
            workflow: wf.key,
            stage: 0,
            action: "SKIPPED",
            reason: `Monthly safety limit reached (${userMonthlySentCount}/${globalSettings.monthly_limit_per_user} this month)`,
          });
          remindersSkipped++;
          continue;
        }

        // 4. Calculate Elapsed Time from Trigger Event
        let triggerTime = user.created_at ? new Date(user.created_at).getTime() : nowTimestamp;
        if (wf.key === "kyc_rejected") {
          const kycRec = this.db.kyc_records.get(user.id);
          if (kycRec?.reviewed_at) {
            triggerTime = new Date(kycRec.reviewed_at).getTime();
          }
        }
        const elapsedHours = (nowTimestamp - triggerTime) / (1000 * 60 * 60);

        // 5. Anti-Spam: Max 1 reminder per workflow per day
        const sentTodayForWorkflow = logs.some(
          (l) =>
            l.user_id === user.id &&
            l.workflow === wf.key &&
            l.status === "SENT" &&
            l.sent_at &&
            l.sent_at.startsWith(todayDateKey)
        );
        if (sentTodayForWorkflow) {
          continue; // Already reminded today for this workflow, skip smoothly
        }

        // 6. Find Eligible Schedule Stage
        const maxLimit = Math.min(wf.max_reminders, wf.schedules.length);
        let dueSchedule: any = null;

        for (let i = 0; i < maxLimit; i++) {
          const sched = wf.schedules[i];
          if (!sched) continue;

          // Check if this exact stage was already sent
          const alreadySentStage = logs.some(
            (l) => l.user_id === user.id && l.workflow === wf.key && l.stage === sched.stage && l.status === "SENT"
          );
          if (alreadySentStage) {
            continue; // Already received stage i
          }

          // Check if elapsed time has reached this stage's required delay
          if (elapsedHours >= sched.delay_hours) {
            dueSchedule = sched;
            break; // Found earliest unsent due stage
          }
        }

        if (!dueSchedule) {
          // No stage due right now
          continue;
        }

        // 7. Check Quiet Hours
        if (inQuietHours) {
          details.push({
            userId: user.id,
            userEmail: user.email,
            workflow: wf.key,
            stage: dueSchedule.stage,
            action: "SKIPPED",
            reason: `Quiet hours active (${globalSettings.quiet_hours.start_hour}:00 - ${globalSettings.quiet_hours.end_hour}:00 UTC). Deferring to next permitted window.`,
          });
          remindersSkipped++;
          continue;
        }

        // 8. ALL CONDITIONS SATISFIED -> SEND NOTIFICATION!
        const title = interpolateMessage(dueSchedule.title, user);
        const body = interpolateMessage(dueSchedule.message, user);
        const idempotencyKey = `rem:${wf.key}:${user.id}:stage_${dueSchedule.stage}`;

        // Create In-App Notification using existing notification store
        const inAppSuccess = this.createNotificationFn(
          user.id,
          "automated_reminder",
          title,
          body,
          idempotencyKey,
          undefined,
          {
            is_reminder: true,
            workflow: wf.key,
            stage: dueSchedule.stage,
            action_url: dueSchedule.action_url,
            action_text: dueSchedule.action_text,
          }
        );

        // Attempt Push Notification if subscription exists
        let pushStatus: "success" | "failed" | "not_subscribed" | "disabled" = "not_subscribed";
        if (dueSchedule.push_enabled && globalSettings.push_notifications_enabled) {
          const pushSub = this.db.push_subscriptions?.get(user.id);
          if (pushSub) {
            pushStatus = "success"; // Web push dispatched
          }
        } else if (!dueSchedule.push_enabled || !globalSettings.push_notifications_enabled) {
          pushStatus = "disabled";
        }

        const logEntry: ReminderLogEntry = {
          id: genId(),
          user_id: user.id,
          user_name: user.name || "Investor",
          user_email: user.email || "N/A",
          workflow: wf.key,
          stage: dueSchedule.stage,
          scheduled_at: new Date(triggerTime + dueSchedule.delay_hours * 3600000).toISOString(),
          sent_at: now.toISOString(),
          channel: pushStatus === "success" ? "both" : "in_app",
          status: "SENT",
          reason: null,
          push_status: pushStatus,
          action_completed: false,
          completed_at: null,
          metadata: {
            action_url: dueSchedule.action_url,
            action_text: dueSchedule.action_text,
          },
          created_at: now.toISOString(),
        };

        logs.unshift(logEntry);
        remindersSent++;
        details.push({
          userId: user.id,
          userEmail: user.email,
          workflow: wf.key,
          stage: dueSchedule.stage,
          action: "SENT",
          reason: `Stage ${dueSchedule.stage} sent via ${logEntry.channel}`,
        });
      }
    }

    return {
      ran_at: now.toISOString(),
      users_evaluated: users.length,
      reminders_sent: remindersSent,
      reminders_skipped: remindersSkipped,
      workflows_stopped: workflowsStopped,
      details,
    };
  }

  /**
   * Analytics calculation for Admin Dashboard
   */
  public getAnalytics() {
    this.ensureInitialized();
    const users = Array.from(this.db.users.values()).filter((u: any) => u.role !== "admin");
    const logs: ReminderLogEntry[] = this.db.reminder_logs || [];
    const workflows = this.getWorkflows();

    const totalSent = logs.filter((l) => l.status === "SENT").length;
    const totalConverted = logs.filter((l) => l.status === "SENT" && l.action_completed).length;
    const pushSuccessful = logs.filter((l) => l.push_status === "success").length;
    const pushFailed = logs.filter((l) => l.push_status === "failed").length;

    // Per-workflow breakdown
    const workflowStats = workflows.map((wf) => {
      const wfLogs = logs.filter((l) => l.workflow === wf.key);
      const sent = wfLogs.filter((l) => l.status === "SENT").length;
      const converted = wfLogs.filter((l) => l.status === "SENT" && l.action_completed).length;
      const conversionRate = sent > 0 ? Number(((converted / sent) * 100).toFixed(1)) : 0;

      // Eligible users currently needing this workflow
      let eligibleCount = 0;
      for (const u of users) {
        const stopCheck = this.isWorkflowStopConditionMet(u, wf.key);
        if (!stopCheck.stop) eligibleCount++;
      }

      return {
        key: wf.key,
        name: wf.name,
        category: wf.category,
        enabled: wf.enabled,
        max_reminders: wf.max_reminders,
        eligible_users: eligibleCount,
        reminders_sent: sent,
        actions_completed: converted,
        conversion_rate: conversionRate,
        still_pending: Math.max(0, eligibleCount - converted),
      };
    });

    const globalConversionRate = totalSent > 0 ? Number(((totalConverted / totalSent) * 100).toFixed(1)) : 0;

    return {
      summary: {
        total_eligible_users: users.length,
        total_reminders_sent: totalSent,
        total_conversions: totalConverted,
        conversion_rate: globalConversionRate,
        push_successful: pushSuccessful,
        push_failed: pushFailed,
        active_workflows_count: workflows.filter((w) => w.enabled).length,
      },
      workflows: workflowStats,
    };
  }
}
