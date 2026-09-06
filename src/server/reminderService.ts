import crypto from "crypto";

export interface ReminderWorkflowConfig {
  key: string;
  name: string;
  category: "deposit" | "kyc" | "investment" | "activity";
  enabled: boolean;
  max_reminders: number;
  schedules: Array<{
    stage: number;
    delay_hours: number;
    title: string;
    message: string;
    action_url: string;
    action_text: string;
    push_enabled: boolean;
  }>;
}

export interface ReminderGlobalSettings {
  monthly_limit_per_user: number;
  quiet_hours: {
    enabled: boolean;
    start_hour: number; // e.g. 22 (10 PM)
    end_hour: number;   // e.g. 8 (8 AM)
    timezone: string;   // e.g. "UTC"
  };
  push_notifications_enabled: boolean;
}

export interface ReminderLogEntry {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  workflow: string;
  stage: number;
  scheduled_at: string;
  sent_at: string | null;
  channel: "in_app" | "push" | "both";
  status: "SENT" | "SKIPPED" | "STOPPED" | "FAILED";
  reason?: string | null;
  push_status?: "success" | "failed" | "not_subscribed" | "disabled" | null;
  action_completed?: boolean;
  completed_at?: string | null;
  metadata?: any;
  created_at: string;
}

export interface UserNotificationPreferences {
  kyc: boolean;
  deposit: boolean;
  investment: boolean;
  activity: boolean;
}

export const DEFAULT_USER_NOTIFICATION_PREFERENCES: UserNotificationPreferences = {
  kyc: true,
  deposit: true,
  investment: true,
  activity: true,
};

export const DEFAULT_REMINDER_GLOBAL_SETTINGS: ReminderGlobalSettings = {
  monthly_limit_per_user: 6,
  quiet_hours: {
    enabled: true,
    start_hour: 22, // 10:00 PM
    end_hour: 8,    // 08:00 AM
    timezone: "UTC",
  },
  push_notifications_enabled: true,
};

export const DEFAULT_REMINDER_WORKFLOWS: ReminderWorkflowConfig[] = [
  {
    key: "no_deposit",
    name: "Registered — No Deposit",
    category: "deposit",
    enabled: true,
    max_reminders: 3,
    schedules: [
      {
        stage: 1,
        delay_hours: 24, // 24 hours
        title: "Start Your First Investment",
        message: "Hi {{first_name}}, fund your EasyX wallet with USDT to begin earning high-yield daily and monthly staking returns.",
        action_url: "/deposit",
        action_text: "Deposit USDT",
        push_enabled: true,
      },
      {
        stage: 2,
        delay_hours: 72, // 3 days
        title: "Exclusive Yields Awaiting Your Deposit",
        message: "Hi {{first_name}}, our high-yield Silver to Diamond tiers are ready for you. Make your first deposit in seconds.",
        action_url: "/investments",
        action_text: "View Plans",
        push_enabled: true,
      },
      {
        stage: 3,
        delay_hours: 168, // 7 days
        title: "Final Welcome Reminder: Start Earning on EasyX",
        message: "Hi {{first_name}}, this is your final reminder to activate your EasyX investment portfolio. Deposit today to lock in your returns.",
        action_url: "/deposit",
        action_text: "Get Started",
        push_enabled: true,
      },
    ],
  },
  {
    key: "kyc_incomplete",
    name: "Registered — KYC Incomplete",
    category: "kyc",
    enabled: true,
    max_reminders: 3,
    schedules: [
      {
        stage: 1,
        delay_hours: 24, // 24 hours
        title: "Complete Identity Verification (KYC)",
        message: "Hi {{first_name}}, verify your identity in under 2 minutes to unlock seamless USDT withdrawals and full platform protection.",
        action_url: "/kyc",
        action_text: "Complete KYC",
        push_enabled: true,
      },
      {
        stage: 2,
        delay_hours: 72, // 3 days
        title: "Identity Verification Pending",
        message: "Hi {{first_name}}, your identity verification is still incomplete. Submit your ID and live selfie to enable verified investor privileges.",
        action_url: "/kyc",
        action_text: "Verify Identity",
        push_enabled: true,
      },
      {
        stage: 3,
        delay_hours: 168, // 7 days
        title: "Final KYC Notice: Complete Account Verification",
        message: "Hi {{first_name}}, this is your final verification notice. Complete your KYC now to ensure unrestricted withdrawals when your investments mature.",
        action_url: "/kyc",
        action_text: "Submit KYC",
        push_enabled: true,
      },
    ],
  },
  {
    key: "kyc_rejected",
    name: "KYC Resubmission Needed",
    category: "kyc",
    enabled: false,
    max_reminders: 2,
    schedules: [
      {
        stage: 1,
        delay_hours: 24,
        title: "Please Resubmit Your KYC Documents",
        message: "Hi {{first_name}}, your previous identity verification was not approved. Please review the admin feedback and resubmit clear documents.",
        action_url: "/kyc",
        action_text: "Resubmit KYC",
        push_enabled: true,
      },
      {
        stage: 2,
        delay_hours: 72,
        title: "Action Required: Update KYC Documents",
        message: "Hi {{first_name}}, upload clear front/back ID photos to complete your account verification and enable withdrawals.",
        action_url: "/kyc",
        action_text: "Upload Documents",
        push_enabled: true,
      },
    ],
  },
  {
    key: "investment_reminder",
    name: "Funded Wallet — No Active Investment",
    category: "investment",
    enabled: false,
    max_reminders: 2,
    schedules: [
      {
        stage: 1,
        delay_hours: 24,
        title: "Put Your Idle Balance to Work",
        message: "Hi {{first_name}}, you have available USDT in your wallet! Select an investment plan today to start generating up to 100% profit.",
        action_url: "/investments",
        action_text: "Choose Plan",
        push_enabled: true,
      },
      {
        stage: 2,
        delay_hours: 72,
        title: "Don't Miss Out on Staking Yields",
        message: "Hi {{first_name}}, your USDT is sitting idle. Activate a Silver, Gold, or Platinum plan to lock in guaranteed returns.",
        action_url: "/investments",
        action_text: "Activate Plan",
        push_enabled: true,
      },
    ],
  },
  {
    key: "inactive_user",
    name: "Inactive User Re-engagement",
    category: "activity",
    enabled: false,
    max_reminders: 2,
    schedules: [
      {
        stage: 1,
        delay_hours: 336, // 14 days
        title: "We Miss You on EasyX",
        message: "Hi {{first_name}}, check out our latest investment plans and platform updates to grow your crypto portfolio.",
        action_url: "/dashboard",
        action_text: "Open Dashboard",
        push_enabled: true,
      },
      {
        stage: 2,
        delay_hours: 720, // 30 days
        title: "Explore New Investment Opportunities",
        message: "Hi {{first_name}}, your EasyX account is waiting for you. Log in today to explore new staking options.",
        action_url: "/investments",
        action_text: "Explore Plans",
        push_enabled: true,
      },
    ],
  },
];

/**
 * Replaces safe placeholders {{user_name}} and {{first_name}} in templates
 */
export function interpolateMessage(template: string, user?: { name?: string; email?: string }): string {
  if (!template) return "";
  const fullName = (user?.name || "Investor").trim();
  const firstName = fullName?.split(" ")?.[0] || "Investor";
  return template
    .replace(/\{\{\s*user_name\s*\}\}/g, fullName)
    .replace(/\{\{\s*first_name\s*\}\}/g, firstName);
}

/**
 * Checks if a given date/time falls within quiet hours
 */
export function isWithinQuietHours(
  now: Date,
  quietHours: { enabled: boolean; start_hour: number; end_hour: number; timezone?: string }
): boolean {
  if (!quietHours || !quietHours.enabled) return false;

  const currentHour = now.getUTCHours();
  const start = quietHours.start_hour;
  const end = quietHours.end_hour;

  if (start < end) {
    // e.g. 01:00 to 06:00
    return currentHour >= start && currentHour < end;
  } else {
    // e.g. 22:00 to 08:00 (crosses midnight)
    return currentHour >= start || currentHour < end;
  }
}
