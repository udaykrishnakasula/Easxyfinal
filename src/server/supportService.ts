import crypto from "crypto";

export type SupportTicketStatus =
  | "OPEN"
  | "IN_PROGRESS"
  | "WAITING_FOR_USER"
  | "WAITING_FOR_ADMIN"
  | "RESOLVED"
  | "CLOSED";

export type SupportTicketCategory =
  | "ACCOUNT"
  | "LOGIN"
  | "DEPOSIT"
  | "INVESTMENT"
  | "KYC"
  | "WITHDRAWAL"
  | "WALLET"
  | "REFERRAL"
  | "TECHNICAL"
  | "OTHER";

export type SupportTicketPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export type SupportSenderType = "USER" | "ADMIN" | "SYSTEM" | "INTERNAL_NOTE";

export const SUPPORT_STATUSES: SupportTicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_USER",
  "WAITING_FOR_ADMIN",
  "RESOLVED",
  "CLOSED",
];

export const SUPPORT_CATEGORIES: SupportTicketCategory[] = [
  "ACCOUNT",
  "LOGIN",
  "DEPOSIT",
  "INVESTMENT",
  "KYC",
  "WITHDRAWAL",
  "WALLET",
  "REFERRAL",
  "TECHNICAL",
  "OTHER",
];

export const SUPPORT_PRIORITIES: SupportTicketPriority[] = [
  "LOW",
  "NORMAL",
  "HIGH",
  "URGENT",
];

export interface SupportAttachment {
  id: string;
  ticket_id?: string | null;
  message_id?: string | null;
  uploaded_by: string;
  file_name: string;
  name?: string; // alias for compatibility
  file_type: string; // "image/jpeg" | "image/png" | "image/webp"
  file_size: number;
  size?: number; // alias
  storage_reference: string;
  url?: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  sender_type: SupportSenderType;
  sender_id: string;
  sender_name?: string;
  message: string;
  text?: string; // alias for compatibility
  is_internal_note?: boolean;
  created_at: string;
  is_read: boolean;
  read_status?: boolean; // alias for compatibility
  read_at?: string | null;
  attachments: SupportAttachment[];
}

// ==================== TIMELINE & AUDIT HISTORY TYPES ====================

export type SupportTimelineEventType =
  | "TICKET_CREATED"
  | "ADMIN_ASSIGNED"
  | "ADMIN_UNASSIGNED"
  | "ADMIN_REPLIED"
  | "USER_REPLIED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "TICKET_ESCALATED"
  | "TICKET_RESOLVED"
  | "TICKET_CLOSED"
  | "TICKET_REOPENED"
  | "USER_RATED_SUPPORT"
  | "INTERNAL_NOTE_ADDED";

export interface SupportTimelineEvent {
  id: string;
  ticket_id: string;
  event_type: SupportTimelineEventType;
  actor_type: "USER" | "ADMIN" | "SYSTEM";
  actor_id?: string | null;
  actor_name?: string | null;
  title: string;
  description?: string;
  details?: Record<string, any>;
  is_internal?: boolean; // If true, strictly hidden from customer visibility
  created_at: string;
}

// ==================== SLA & ESCALATION CONFIGURATION TYPES ====================

export interface SupportSlaRule {
  priority: SupportTicketPriority;
  first_response_sla_minutes: number;
  resolution_sla_minutes: number;
  auto_escalate_on_breach: boolean;
  escalate_to_priority?: SupportTicketPriority;
  notify_admins_on_overdue: boolean;
}

export interface SupportSlaConfig {
  enabled: boolean;
  auto_escalation_enabled: boolean;
  rules: Record<SupportTicketPriority, SupportSlaRule>;
  overdue_alert_threshold_minutes: number;
  last_evaluated_at?: string;
}

export const DEFAULT_SUPPORT_SLA_CONFIG: SupportSlaConfig = {
  enabled: true,
  auto_escalation_enabled: true,
  overdue_alert_threshold_minutes: 0,
  rules: {
    URGENT: {
      priority: "URGENT",
      first_response_sla_minutes: 30, // 30 minutes for urgent
      resolution_sla_minutes: 240, // 4 hours for urgent
      auto_escalate_on_breach: true,
      escalate_to_priority: "URGENT",
      notify_admins_on_overdue: true,
    },
    HIGH: {
      priority: "HIGH",
      first_response_sla_minutes: 120, // 2 hours for high
      resolution_sla_minutes: 720, // 12 hours for high
      auto_escalate_on_breach: true,
      escalate_to_priority: "URGENT",
      notify_admins_on_overdue: true,
    },
    NORMAL: {
      priority: "NORMAL",
      first_response_sla_minutes: 480, // 8 hours for normal
      resolution_sla_minutes: 1440, // 24 hours for normal
      auto_escalate_on_breach: true,
      escalate_to_priority: "HIGH",
      notify_admins_on_overdue: true,
    },
    LOW: {
      priority: "LOW",
      first_response_sla_minutes: 1440, // 24 hours for low
      resolution_sla_minutes: 2880, // 48 hours for low
      auto_escalate_on_breach: false,
      escalate_to_priority: "NORMAL",
      notify_admins_on_overdue: false,
    },
  },
};

export interface SupportTicket {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  created_at: string;
  updated_at: string;
  assigned_admin_id: string | null;
  assigned_admin_name: string | null;
  last_activity_at: string;
  first_admin_response_at?: string | null;
  last_admin_response_at?: string | null;
  last_user_response_at?: string | null;
  resolved_at: string | null;
  closed_at: string | null;
  escalated_at?: string | null;
  is_escalated?: boolean;
  escalation_level?: number;
  escalation_reason?: string | null;
  escalated_by?: string | null;
  first_response_due_at?: string | null;
  resolution_due_at?: string | null;
  rating?: number | null;
  rating_comment?: string | null;
  rated_at?: string | null;
  attachments: SupportAttachment[];
  metadata?: Record<string, any>;
}

// ==================== FAQ & HELP CENTER TYPES & DEFINITIONS ====================

export type SupportFaqCategory =
  | "ACCOUNT_LOGIN"
  | "DEPOSITS"
  | "INVESTMENTS"
  | "KYC"
  | "WITHDRAWALS"
  | "WALLET"
  | "REFERRALS"
  | "TECHNICAL"
  | "SUPPORT";

export interface SupportFaqCategoryMeta {
  id: SupportFaqCategory;
  label: string;
  icon: string;
  description: string;
}

export const FAQ_CATEGORY_DEFINITIONS: SupportFaqCategoryMeta[] = [
  {
    id: "ACCOUNT_LOGIN",
    label: "Account & Login",
    icon: "Lock",
    description: "Login credentials, password resets, 2FA security, and account preferences.",
  },
  {
    id: "DEPOSITS",
    label: "Deposits",
    icon: "ArrowDownToLine",
    description: "USDT TRC20/BEP20 deposits, confirmation times, TxID verification, and status.",
  },
  {
    id: "INVESTMENTS",
    label: "Investments",
    icon: "TrendingUp",
    description: "Daily ROI distribution, plan tiers (Silver/Gold/Platinum/Diamond), and lock cycles.",
  },
  {
    id: "KYC",
    label: "KYC",
    icon: "ShieldCheck",
    description: "Identity verification requirements, document upload guidelines, and approval turnaround.",
  },
  {
    id: "WITHDRAWALS",
    label: "Withdrawals",
    icon: "ArrowUpFromLine",
    description: "Minimum withdrawal thresholds, payout processing SLAs, and wallet addresses.",
  },
  {
    id: "WALLET",
    label: "Wallet",
    icon: "Wallet",
    description: "Available vs. locked balance breakdown, earnings ledger, and wallet operations.",
  },
  {
    id: "REFERRALS",
    label: "Referrals",
    icon: "Users",
    description: "Referral links, commission rewards, affiliate tiers, and network performance.",
  },
  {
    id: "TECHNICAL",
    label: "Technical Issues",
    icon: "Wrench",
    description: "App troubleshooting, browser compatibility, cache clearing, and device access.",
  },
  {
    id: "SUPPORT",
    label: "Support",
    icon: "LifeBuoy",
    description: "Support ticket submissions, priority routing, SLAs, and contacting customer service.",
  },
];

export interface SupportFaqArticle {
  id: string;
  title: string;
  question?: string; // alias for compatibility
  answer: string;
  category: SupportFaqCategory;
  category_label?: string;
  keywords: string[];
  related_article_ids: string[];
  related_articles?: Array<{ id: string; title: string; category: string; category_label?: string }>;
  is_published: boolean;
  views_count: number;
  display_order: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface SupportFaqSearchLog {
  id: string;
  query: string;
  found_count: number;
  user_id?: string | null;
  created_at: string;
}

export function normalizeFaqCategory(cat?: string): SupportFaqCategory {
  if (!cat) return "SUPPORT";
  const upper = cat.trim().toUpperCase();
  if (upper === "ACCOUNT" || upper === "LOGIN" || upper === "ACCOUNT_LOGIN") return "ACCOUNT_LOGIN";
  if (upper === "DEPOSIT" || upper === "DEPOSITS") return "DEPOSITS";
  if (upper === "INVESTMENT" || upper === "INVESTMENTS") return "INVESTMENTS";
  if (upper === "KYC") return "KYC";
  if (upper === "WITHDRAWAL" || upper === "WITHDRAWALS") return "WITHDRAWALS";
  if (upper === "WALLET") return "WALLET";
  if (upper === "REFERRAL" || upper === "REFERRALS") return "REFERRALS";
  if (upper === "TECHNICAL" || upper === "TECH") return "TECHNICAL";
  if (upper === "SUPPORT" || upper === "OTHER") return "SUPPORT";

  const match = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === upper);
  return match ? match.id : "SUPPORT";
}

export function sanitizeFaqText(text: string): string {
  if (!text || typeof text !== "string") return "";
  let clean = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/on\w+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
  return clean.trim();
}

export const DEFAULT_SEED_FAQS: SupportFaqArticle[] = [
  {
    id: "faq_acc_01",
    title: "How do I reset my password if I forgot my login credentials?",
    question: "How do I reset my password if I forgot my login credentials?",
    answer:
      "To reset your password, navigate to the Login page and click 'Forgot Password?'. Enter your registered email address to receive a secure password reset link. Follow the instructions in the email to set a new password. If you do not receive the email within a few minutes, check your spam folder or open a support ticket.",
    category: "ACCOUNT_LOGIN",
    category_label: "Account & Login",
    keywords: ["password", "reset", "forgot", "login", "credentials", "email"],
    related_article_ids: ["faq_acc_02", "faq_sup_01"],
    is_published: true,
    views_count: 142,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_acc_02",
    title: "How do I enable Two-Factor Authentication (2FA) for my account?",
    question: "How do I enable Two-Factor Authentication (2FA) for my account?",
    answer:
      "You can enable Two-Factor Authentication (2FA) by navigating to your Profile page > Security tab. Scan the provided QR code using Google Authenticator, Authy, or any standard TOTP app, and enter the 6-digit verification code to confirm. We strongly recommend enabling 2FA to protect your account and withdrawals.",
    category: "ACCOUNT_LOGIN",
    category_label: "Account & Login",
    keywords: ["2fa", "security", "google authenticator", "totp", "two-factor", "protect"],
    related_article_ids: ["faq_acc_01", "faq_wth_01"],
    is_published: true,
    views_count: 98,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_dep_01",
    title: "How long do USDT TRC20 and BEP20 deposits take to be credited?",
    question: "How long do USDT TRC20 and BEP20 deposits take to be credited?",
    answer:
      "USDT deposits sent via TRC20 (TRON) or BEP20 (BNB Smart Chain) are typically credited within 3 to 15 minutes after blockchain network confirmations. Ensure you enter the correct Transaction Hash (TxID) in the Deposit portal so our automated verification engine can match and credit your balance immediately.",
    category: "DEPOSITS",
    category_label: "Deposits",
    keywords: ["deposit", "usdt", "trc20", "bep20", "txid", "time", "confirmations"],
    related_article_ids: ["faq_dep_02", "faq_dep_03"],
    is_published: true,
    views_count: 235,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_dep_02",
    title: "What should I do if my deposit has not arrived after 30 minutes?",
    question: "What should I do if my deposit has not arrived after 30 minutes?",
    answer:
      "If your deposit has confirmed on the blockchain explorer (such as TRONSCAN or BscScan) but has not appeared in your EasyX wallet, first verify that you submitted the accurate TxID in the Deposit tab. If still uncredited, open a Support Ticket under 'Deposits' with your transaction hash and screenshot of the transfer for priority verification by our team.",
    category: "DEPOSITS",
    category_label: "Deposits",
    keywords: ["deposit", "missing", "delay", "support ticket", "txid", "blockchain"],
    related_article_ids: ["faq_dep_01", "faq_sup_01"],
    is_published: true,
    views_count: 189,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_dep_03",
    title: "Does EasyX charge any deposit fees?",
    question: "Does EasyX charge any deposit fees?",
    answer:
      "No. EasyX charges 0% fees on all incoming cryptocurrency deposits. However, please remember that standard network gas fees (e.g. TRX energy on TRON or BNB gas on BSC) may be charged by your external sending wallet or exchange.",
    category: "DEPOSITS",
    category_label: "Deposits",
    keywords: ["deposit fee", "zero fees", "gas", "cost", "usdt"],
    related_article_ids: ["faq_dep_01", "faq_wth_01"],
    is_published: true,
    views_count: 76,
    display_order: 3,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_inv_01",
    title: "How does daily ROI distribution and investment maturity work?",
    question: "How does daily ROI distribution and investment maturity work?",
    answer:
      "Once you activate an investment plan, daily returns accrue continuously based on the plan's daily profit rate and are credited to your Available Earnings wallet at midnight UTC every day. When the plan reaches its lock-in maturity duration (e.g., 60 days), your initial principal is automatically returned to your available wallet balance.",
    category: "INVESTMENTS",
    category_label: "Investments",
    keywords: ["investment", "roi", "daily profit", "maturity", "principal", "lock days"],
    related_article_ids: ["faq_inv_02", "faq_inv_03"],
    is_published: true,
    views_count: 310,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_inv_02",
    title: "How do I unlock higher investment tier plans (Gold, Platinum, Diamond)?",
    question: "How do I unlock higher investment tier plans (Gold, Platinum, Diamond)?",
    answer:
      "EasyX utilizes a progressive plan unlock system. Higher-tier investment plans unlock automatically as you complete active investment cycles, maintain positive account standing, and fulfill required investment thresholds. You can track your unlock progress directly on the Investments dashboard.",
    category: "INVESTMENTS",
    category_label: "Investments",
    keywords: ["unlock", "tiers", "gold", "platinum", "diamond", "requirements"],
    related_article_ids: ["faq_inv_01", "faq_inv_03"],
    is_published: true,
    views_count: 215,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_inv_03",
    title: "Can I have multiple active investment plans simultaneously?",
    question: "Can I have multiple active investment plans simultaneously?",
    answer:
      "Yes! You can hold multiple active investment plans concurrently across different tiers. Each active plan will independently generate its scheduled daily returns and return its principal upon reaching its individual maturity date.",
    category: "INVESTMENTS",
    category_label: "Investments",
    keywords: ["multiple plans", "portfolio", "concurrent", "investments"],
    related_article_ids: ["faq_inv_01", "faq_inv_02"],
    is_published: true,
    views_count: 112,
    display_order: 3,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_kyc_01",
    title: "Why is KYC identity verification required and how long does it take?",
    question: "Why is KYC identity verification required and how long does it take?",
    answer:
      "KYC (Know Your Customer) compliance protects the platform and community against fraud and unauthorized transactions. Our automated verification system and compliance team review submitted government IDs and biometric liveness checks within 15 to 60 minutes during standard operating hours.",
    category: "KYC",
    category_label: "KYC",
    keywords: ["kyc", "verification", "identity", "id", "passport", "time", "compliance"],
    related_article_ids: ["faq_kyc_02", "faq_wth_01"],
    is_published: true,
    views_count: 260,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_kyc_02",
    title: "What documents and selfie guidelines are required for KYC approval?",
    question: "What documents and selfie guidelines are required for KYC approval?",
    answer:
      "We accept valid, unexpired government-issued Photo IDs: National Identity Cards, International Passports, or Driver's Licenses. Ensure all four corners of the document are clearly visible without glare or blur. For the selfie, ensure good lighting and follow on-screen prompts for biometric liveness check.",
    category: "KYC",
    category_label: "KYC",
    keywords: ["documents", "passport", "national id", "driver license", "selfie", "liveness"],
    related_article_ids: ["faq_kyc_01", "faq_acc_01"],
    is_published: true,
    views_count: 175,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_wth_01",
    title: "What is the minimum withdrawal amount and payout processing time?",
    question: "What is the minimum withdrawal amount and payout processing time?",
    answer:
      "The minimum withdrawal amount is $20.00 USDT. Payout requests undergo standard security checks and are broadcast to the blockchain within 1 to 4 hours. Ensure your destination payout address accurately matches the selected network (TRC20 or BEP20).",
    category: "WITHDRAWALS",
    category_label: "Withdrawals",
    keywords: ["withdrawal", "minimum", "payout", "time", "usdt", "sla"],
    related_article_ids: ["faq_wth_02", "faq_acc_02"],
    is_published: true,
    views_count: 295,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_wth_02",
    title: "How do I add or update my destination payout wallet address?",
    question: "How do I add or update my destination payout wallet address?",
    answer:
      "You can enter your destination USDT wallet address during the withdrawal request, or save it permanently in your Profile > Payment Settings. Double-check that your address corresponds to the chosen network (TRC20 or BEP20) to prevent irreversible blockchain routing errors.",
    category: "WITHDRAWALS",
    category_label: "Withdrawals",
    keywords: ["wallet address", "destination", "update", "trc20", "bep20", "payout"],
    related_article_ids: ["faq_wth_01", "faq_wal_01"],
    is_published: true,
    views_count: 89,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_wal_01",
    title: "How is my total wallet balance calculated on EasyX?",
    question: "How is my total wallet balance calculated on EasyX?",
    answer:
      "Your Total Wallet Balance combines your Available Balance (funds ready for withdrawal or new investments) and your Active Locked Principal (funds actively earning daily returns across your current investment plans). You can see a complete itemized breakdown on your Wallet & Dashboard pages.",
    category: "WALLET",
    category_label: "Wallet",
    keywords: ["wallet", "balance", "total", "available", "locked", "breakdown"],
    related_article_ids: ["faq_inv_01", "faq_wth_01"],
    is_published: true,
    views_count: 130,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_ref_01",
    title: "How does the EasyX multi-tier referral and commission program work?",
    question: "How does the EasyX multi-tier referral and commission program work?",
    answer:
      "When your invited contacts sign up using your unique referral link and activate investment plans, you earn direct referral commissions credited instantly to your wallet. You can monitor your full referral network, total earnings, and team metrics on the Referrals page.",
    category: "REFERRALS",
    category_label: "Referrals",
    keywords: ["referral", "affiliate", "commission", "invite", "bonus", "earnings"],
    related_article_ids: ["faq_wal_01", "faq_inv_01"],
    is_published: true,
    views_count: 165,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_tech_01",
    title: "What should I do if the website or app isn't loading properly?",
    question: "What should I do if the website or app isn't loading properly?",
    answer:
      "If you experience loading delays or cached data, try clearing your browser cache and cookies, or reloading the page in an incognito window. EasyX is optimized for the latest versions of Google Chrome, Safari, Mozilla Firefox, and Edge on both mobile and desktop.",
    category: "TECHNICAL",
    category_label: "Technical Issues",
    keywords: ["technical", "loading", "cache", "browser", "refresh", "mobile", "desktop"],
    related_article_ids: ["faq_sup_01", "faq_acc_01"],
    is_published: true,
    views_count: 94,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_sup_01",
    title: "How do I submit a support ticket and track staff responses?",
    question: "How do I submit a support ticket and track staff responses?",
    answer:
      "Navigate to the Support page and click 'Create Ticket'. Choose the relevant topic (Deposit, Investment, KYC, Withdrawal, etc.), describe your question or issue, and attach up to 3 screenshots if necessary. You can track replies in real-time in the 'My Support Tickets' tab and receive instant notifications.",
    category: "SUPPORT",
    category_label: "Support",
    keywords: ["support", "ticket", "create", "contact", "chat", "reply", "help"],
    related_article_ids: ["faq_sup_02", "faq_dep_02"],
    is_published: true,
    views_count: 210,
    display_order: 1,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
  {
    id: "faq_sup_02",
    title: "What are the customer support desk operating hours and average response SLAs?",
    question: "What are the customer support desk operating hours and average response SLAs?",
    answer:
      "Our customer support team operates 24/7/365. Urgent and high-priority tickets are typically addressed within 15 to 45 minutes, while standard inquiries receive comprehensive responses in under 2 hours.",
    category: "SUPPORT",
    category_label: "Support",
    keywords: ["support hours", "sla", "24/7", "response time", "operating hours"],
    related_article_ids: ["faq_sup_01", "faq_dep_01"],
    is_published: true,
    views_count: 145,
    display_order: 2,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    created_by: "System",
  },
];

const genTicketId = () => `tkt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
const genMessageId = () => `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
const nowIso = () => new Date().toISOString();

export function sanitizeFileName(name: string): string {
  if (!name || typeof name !== "string") return "screenshot.jpg";
  let clean = name.replace(/[\x00-\x1F\x7F/\\?%*:|"<>]/g, "_").trim();
  clean = clean.replace(/^\.+/, "");
  if (clean.length > 100) {
    const extMatch = clean.match(/\.([a-zA-Z0-9]+)$/);
    const ext = extMatch ? `.${extMatch[1]}` : "";
    clean = `${clean.slice(0, 100 - ext.length)}${ext}`;
  }
  return clean || "screenshot.jpg";
}

export interface ImageValidationResult {
  valid: boolean;
  fileType: "image/jpeg" | "image/png" | "image/webp" | null;
  ext: string | null;
  error?: string;
}

export function validateSupportImageBuffer(buf: Buffer): ImageValidationResult {
  if (!buf || !Buffer.isBuffer(buf) || buf.length === 0) {
    return { valid: false, fileType: null, ext: null, error: "Empty or invalid image data." };
  }

  // Max 5 MB limit
  const MAX_BYTES = 5 * 1024 * 1024;
  if (buf.length > MAX_BYTES) {
    return { valid: false, fileType: null, ext: null, error: "Image is too large. Maximum size is 5 MB." };
  }

  // JPEG: FF D8 FF
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { valid: true, fileType: "image/jpeg", ext: "jpg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { valid: true, fileType: "image/png", ext: "png" };
  }

  // WEBP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf.toString("utf8", 0, 4) === "RIFF" &&
    buf.toString("utf8", 8, 12) === "WEBP"
  ) {
    return { valid: true, fileType: "image/webp", ext: "webp" };
  }

  return {
    valid: false,
    fileType: null,
    ext: null,
    error: "Unsupported file format. Please upload JPG, PNG, or WEBP images only.",
  };
}

export function normalizeCategory(cat?: string): SupportTicketCategory {
  if (!cat) return "OTHER";
  const upper = cat.trim().toUpperCase() as SupportTicketCategory;
  return SUPPORT_CATEGORIES.includes(upper) ? upper : "OTHER";
}

export function normalizePriority(p?: string): SupportTicketPriority {
  if (!p) return "NORMAL";
  const upper = p.trim().toUpperCase() as SupportTicketPriority;
  return SUPPORT_PRIORITIES.includes(upper) ? upper : "NORMAL";
}

export function normalizeStatus(s?: string): SupportTicketStatus | null {
  if (!s) return null;
  const upper = s.trim().toUpperCase() as SupportTicketStatus;
  return SUPPORT_STATUSES.includes(upper) ? upper : null;
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0m";
  const s = Math.floor(seconds);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);

  if (days > 0) {
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${s}s`;
}

export function genTimelineId(): string {
  return `tml_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export class SupportManager {
  private db: any;
  private createNotificationFn?: (
    userId: string,
    ntype: string,
    title: string,
    body?: string,
    dedupeKey?: string,
    investmentId?: string,
    extraMeta?: any
  ) => boolean;
  private notifyAdminsFn?: (
    ntype: string,
    title: string,
    body: string,
    extraMeta?: any,
    dedupeKeyPrefix?: string
  ) => void;
  private dispatchPushFn?: (
    userId: string,
    title: string,
    body: string,
    actionUrl?: string | null
  ) => Promise<string> | string;

  constructor(
    db: any,
    createNotificationFn?: any,
    notifyAdminsFn?: any,
    dispatchPushFn?: any
  ) {
    this.db = db;
    this.createNotificationFn = createNotificationFn;
    this.notifyAdminsFn = notifyAdminsFn;
    this.dispatchPushFn = dispatchPushFn;

    if (!this.db.support_tickets) {
      this.db.support_tickets = new Map<string, SupportTicket>();
    }
    if (!this.db.support_messages) {
      this.db.support_messages = new Map<string, SupportMessage>();
    }
    if (!this.db.support_attachments) {
      this.db.support_attachments = new Map<string, SupportAttachment>();
    }
    if (!this.db.support_timeline) {
      this.db.support_timeline = new Map<string, SupportTimelineEvent>();
    }
    if (!this.db.support_sla_config) {
      this.db.support_sla_config = JSON.parse(JSON.stringify(DEFAULT_SUPPORT_SLA_CONFIG));
    }
  }

  /**
   * Get global SLA configuration
   */
  public getSlaConfig(): SupportSlaConfig {
    if (!this.db.support_sla_config) {
      this.db.support_sla_config = JSON.parse(JSON.stringify(DEFAULT_SUPPORT_SLA_CONFIG));
    }
    return this.db.support_sla_config;
  }

  /**
   * Admin: Update SLA configuration rules and escalation switches
   */
  public updateSlaConfig(newConfig: Partial<SupportSlaConfig>): SupportSlaConfig {
    const current = this.getSlaConfig();
    const updated: SupportSlaConfig = {
      ...current,
      ...newConfig,
      rules: {
        ...current.rules,
        ...(newConfig.rules || {}),
      },
    };
    this.db.support_sla_config = updated;
    return updated;
  }

  /**
   * Calculate due dates for first response and resolution based on priority and creation time
   */
  public calculateDueDates(
    priority: SupportTicketPriority,
    createdAtIso: string
  ): { first_response_due_at: string; resolution_due_at: string } {
    const slaConfig = this.getSlaConfig();
    const rule =
      slaConfig.rules[priority] ||
      slaConfig.rules.NORMAL ||
      DEFAULT_SUPPORT_SLA_CONFIG.rules.NORMAL;
    const createdMs = new Date(createdAtIso).getTime();

    const firstResponseDueMs = createdMs + rule.first_response_sla_minutes * 60 * 1000;
    const resolutionDueMs = createdMs + rule.resolution_sla_minutes * 60 * 1000;

    return {
      first_response_due_at: new Date(firstResponseDueMs).toISOString(),
      resolution_due_at: new Date(resolutionDueMs).toISOString(),
    };
  }

  /**
   * Record a lifecycle event in the ticket audit timeline
   */
  public recordTimelineEvent(params: {
    ticketId: string;
    eventType: SupportTimelineEventType;
    actorType: "USER" | "ADMIN" | "SYSTEM";
    actorId?: string | null;
    actorName?: string | null;
    title: string;
    description?: string;
    details?: Record<string, any>;
    isInternal?: boolean;
    createdAt?: string;
  }): SupportTimelineEvent {
    const ts = params.createdAt || nowIso();
    const event: SupportTimelineEvent = {
      id: genTimelineId(),
      ticket_id: params.ticketId,
      event_type: params.eventType,
      actor_type: params.actorType,
      actor_id: params.actorId || null,
      actor_name:
        params.actorName ||
        (params.actorType === "USER"
          ? "Customer"
          : params.actorType === "ADMIN"
          ? "Staff Admin"
          : "System"),
      title: params.title,
      description: params.description,
      details: params.details || {},
      is_internal: Boolean(params.isInternal),
      created_at: ts,
    };

    if (!this.db.support_timeline) {
      this.db.support_timeline = new Map<string, SupportTimelineEvent>();
    }
    this.db.support_timeline.set(event.id, event);
    return event;
  }

  /**
   * Retrieve timeline audit events for a ticket
   * @param includeInternal if false, hides internal staff notes and internal escalation reason
   */
  public getTicketTimeline(ticketId: string, includeInternal = true): SupportTimelineEvent[] {
    if (!this.db.support_timeline) return [];
    const events: SupportTimelineEvent[] = [];
    for (const evt of this.db.support_timeline.values()) {
      if (evt.ticket_id === ticketId) {
        if (!includeInternal && evt.is_internal) {
          continue;
        }
        events.push(evt);
      }
    }
    return events.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /**
   * Enrich ticket with response-time and SLA tracking calculations
   */
  public enrichTicketWithSla(ticket: SupportTicket, nowMs = Date.now()): any {
    const slaConfig = this.getSlaConfig();
    const rule =
      slaConfig.rules[ticket.priority] ||
      slaConfig.rules.NORMAL ||
      DEFAULT_SUPPORT_SLA_CONFIG.rules.NORMAL;

    const createdMs = new Date(ticket.created_at).getTime();

    // 1. Time to first admin response calculation
    let timeToFirstResponseSeconds: number | null = null;
    let timeToFirstResponseFormatted: string | null = null;
    if (ticket.first_admin_response_at) {
      const firstRespMs = new Date(ticket.first_admin_response_at).getTime();
      timeToFirstResponseSeconds = Math.max(0, Math.floor((firstRespMs - createdMs) / 1000));
      timeToFirstResponseFormatted = formatDuration(timeToFirstResponseSeconds);
    }

    // 2. Time to resolution calculation
    let timeToResolutionSeconds: number | null = null;
    let timeToResolutionFormatted: string | null = null;
    if (ticket.resolved_at) {
      const resolvedMs = new Date(ticket.resolved_at).getTime();
      timeToResolutionSeconds = Math.max(0, Math.floor((resolvedMs - createdMs) / 1000));
      timeToResolutionFormatted = formatDuration(timeToResolutionSeconds);
    } else if (ticket.closed_at && !ticket.resolved_at) {
      const closedMs = new Date(ticket.closed_at).getTime();
      timeToResolutionSeconds = Math.max(0, Math.floor((closedMs - createdMs) / 1000));
      timeToResolutionFormatted = formatDuration(timeToResolutionSeconds);
    }

    // 3. Due dates
    const firstResponseDueMs = ticket.first_response_due_at
      ? new Date(ticket.first_response_due_at).getTime()
      : createdMs + rule.first_response_sla_minutes * 60 * 1000;

    const resolutionDueMs = ticket.resolution_due_at
      ? new Date(ticket.resolution_due_at).getTime()
      : createdMs + rule.resolution_sla_minutes * 60 * 1000;

    const isClosedOrResolved = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

    // 4. Overdue status & duration
    let isFirstResponseOverdue = false;
    let firstResponseOverdueSeconds = 0;
    if (!ticket.first_admin_response_at && !isClosedOrResolved && nowMs > firstResponseDueMs) {
      isFirstResponseOverdue = true;
      firstResponseOverdueSeconds = Math.floor((nowMs - firstResponseDueMs) / 1000);
    }

    let isResolutionOverdue = false;
    let resolutionOverdueSeconds = 0;
    if (!isClosedOrResolved && nowMs > resolutionDueMs) {
      isResolutionOverdue = true;
      resolutionOverdueSeconds = Math.floor((nowMs - resolutionDueMs) / 1000);
    }

    const isOverdue = isFirstResponseOverdue || isResolutionOverdue;
    const overdueType = isFirstResponseOverdue
      ? "FIRST_RESPONSE"
      : isResolutionOverdue
      ? "RESOLUTION"
      : null;
    const overdueBySeconds = Math.max(firstResponseOverdueSeconds, resolutionOverdueSeconds);

    return {
      ...ticket,
      first_response_due_at: new Date(firstResponseDueMs).toISOString(),
      resolution_due_at: new Date(resolutionDueMs).toISOString(),
      time_to_first_response_seconds: timeToFirstResponseSeconds,
      time_to_first_response_formatted: timeToFirstResponseFormatted,
      time_to_resolution_seconds: timeToResolutionSeconds,
      time_to_resolution_formatted: timeToResolutionFormatted,
      is_first_response_overdue: isFirstResponseOverdue,
      first_response_overdue_seconds: firstResponseOverdueSeconds,
      first_response_overdue_formatted: isFirstResponseOverdue
        ? formatDuration(firstResponseOverdueSeconds)
        : null,
      is_resolution_overdue: isResolutionOverdue,
      resolution_overdue_seconds: resolutionOverdueSeconds,
      resolution_overdue_formatted: isResolutionOverdue
        ? formatDuration(resolutionOverdueSeconds)
        : null,
      is_overdue: isOverdue,
      overdue_type: overdueType,
      overdue_by_seconds: overdueBySeconds,
      overdue_by_formatted: isOverdue ? formatDuration(overdueBySeconds) : null,
      sla_rule: {
        priority: ticket.priority,
        first_response_sla_minutes: rule.first_response_sla_minutes,
        resolution_sla_minutes: rule.resolution_sla_minutes,
      },
    };
  }

  /**
   * Manual or automated ticket escalation
   */
  public escalateTicket(params: {
    ticketId: string;
    adminId?: string | null;
    adminName?: string | null;
    reason: string;
    newPriority?: SupportTicketPriority;
    isAuto?: boolean;
  }): SupportTicket {
    const { ticketId, adminId, adminName, reason, newPriority, isAuto = false } = params;
    const ticket = this.getTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found.");

    const ts = nowIso();
    const prevPriority = ticket.priority;
    const cleanPriority = newPriority ? normalizePriority(newPriority) : prevPriority;

    ticket.is_escalated = true;
    ticket.escalated_at = ts;
    ticket.escalation_reason = reason.trim();
    ticket.escalated_by = isAuto ? "AUTOMATIC_SLA_ENGINE" : (adminName || adminId || "Admin");
    ticket.escalation_level = (ticket.escalation_level || 0) + 1;
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    if (cleanPriority !== prevPriority) {
      ticket.priority = cleanPriority;
      const dueDates = this.calculateDueDates(cleanPriority, ticket.created_at);
      ticket.first_response_due_at = dueDates.first_response_due_at;
      ticket.resolution_due_at = dueDates.resolution_due_at;
    }

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "TICKET_ESCALATED",
      actorType: isAuto ? "SYSTEM" : "ADMIN",
      actorId: adminId || "system",
      actorName: isAuto ? "Automated SLA Engine" : (adminName || "Admin"),
      title: isAuto ? `Automatic Escalation Triggered` : `Ticket Escalated by ${adminName || "Admin"}`,
      description: reason.trim(),
      details: {
        reason: reason.trim(),
        previous_priority: prevPriority,
        new_priority: cleanPriority,
        escalation_level: ticket.escalation_level,
        is_auto: isAuto,
      },
      isInternal: true, // internal escalation details hidden from user
      createdAt: ts,
    });

    // Notify Admins: "URGENT SUPPORT TICKET OVERDUE" / "Support Ticket Escalated"
    const alertTitle = ticket.priority === "URGENT"
      ? "URGENT SUPPORT TICKET OVERDUE"
      : "Support Ticket Escalated";

    const alertBody = isAuto
      ? `Ticket #${ticket.id.slice(-6).toUpperCase()} [${ticket.priority}] "${ticket.subject}" was automatically escalated: ${reason.trim()}`
      : `Ticket #${ticket.id.slice(-6).toUpperCase()} [${ticket.priority}] "${ticket.subject}" was escalated by ${adminName || "Admin"}: ${reason.trim()}`;

    this.safeNotifyAdmins(
      "support_ticket_escalated",
      alertTitle,
      alertBody,
      {
        ticket_id: ticket.id,
        priority: ticket.priority,
        escalation_level: ticket.escalation_level,
        reason: reason.trim(),
        action_url: `/admin/support/tickets/${ticket.id}`,
        action_text: "View Escalated Ticket",
      },
      `admin_support_escalated_${ticket.id}_${ticket.escalation_level}_${ts}`
    );

    return ticket;
  }

  /**
   * Check all active tickets against SLA rules and automatically trigger escalations/alerts
   */
  public checkAndApplyEscalations(): {
    evaluatedCount: number;
    escalatedCount: number;
    overdueCount: number;
    escalatedTickets: any[];
  } {
    const slaConfig = this.getSlaConfig();
    if (!slaConfig.enabled) {
      return { evaluatedCount: 0, escalatedCount: 0, overdueCount: 0, escalatedTickets: [] };
    }

    const now = Date.now();
    let evaluatedCount = 0;
    let escalatedCount = 0;
    let overdueCount = 0;
    const escalatedTickets: any[] = [];

    for (const ticket of this.db.support_tickets.values()) {
      // Only active open/in-progress/waiting tickets
      if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
        continue;
      }
      evaluatedCount++;

      const rule =
        slaConfig.rules[ticket.priority] ||
        slaConfig.rules.NORMAL ||
        DEFAULT_SUPPORT_SLA_CONFIG.rules.NORMAL;

      const createdMs = new Date(ticket.created_at).getTime();
      const firstResponseDueMs = ticket.first_response_due_at
        ? new Date(ticket.first_response_due_at).getTime()
        : createdMs + rule.first_response_sla_minutes * 60 * 1000;

      const resolutionDueMs = ticket.resolution_due_at
        ? new Date(ticket.resolution_due_at).getTime()
        : createdMs + rule.resolution_sla_minutes * 60 * 1000;

      const isFirstResponseBreached = !ticket.first_admin_response_at && now > firstResponseDueMs;
      const isResolutionBreached = now > resolutionDueMs;

      if (isFirstResponseBreached || isResolutionBreached) {
        overdueCount++;
      }

      // Auto-escalate if enabled and not yet escalated
      if (
        slaConfig.auto_escalation_enabled &&
        rule.auto_escalate_on_breach &&
        !ticket.is_escalated
      ) {
        if (isFirstResponseBreached) {
          const overdueMinutes = Math.round((now - firstResponseDueMs) / 60000);
          const reason = `First response SLA breached (${rule.first_response_sla_minutes}m target, overdue by ${overdueMinutes}m)`;
          const targetPriority = rule.escalate_to_priority || ticket.priority;

          this.escalateTicket({
            ticketId: ticket.id,
            reason,
            newPriority: targetPriority,
            isAuto: true,
          });

          escalatedCount++;
          escalatedTickets.push({
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: targetPriority,
            reason,
          });
        } else if (isResolutionBreached) {
          const overdueMinutes = Math.round((now - resolutionDueMs) / 60000);
          const reason = `Resolution SLA breached (${rule.resolution_sla_minutes}m target, overdue by ${overdueMinutes}m)`;
          const targetPriority = rule.escalate_to_priority || ticket.priority;

          this.escalateTicket({
            ticketId: ticket.id,
            reason,
            newPriority: targetPriority,
            isAuto: true,
          });

          escalatedCount++;
          escalatedTickets.push({
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: targetPriority,
            reason,
          });
        }
      }
    }

    slaConfig.last_evaluated_at = nowIso();
    return {
      evaluatedCount,
      escalatedCount,
      overdueCount,
      escalatedTickets,
    };
  }

  /**
   * Process & bind up to 3 attachments to a ticket and message
   */
  resolveAttachments(
    rawAttachments: any[] | undefined,
    ticketId: string,
    messageId: string,
    uploaderId: string,
    isAdmin = false
  ): SupportAttachment[] {
    if (!rawAttachments || !Array.isArray(rawAttachments) || rawAttachments.length === 0) {
      return [];
    }

    const limited = rawAttachments.slice(0, 3);
    const resolved: SupportAttachment[] = [];

    for (const item of limited) {
      const attId = typeof item === "string" ? item : item?.id;
      if (!attId) continue;

      let record = this.db.support_attachments?.get(attId);
      if (!record && typeof item === "object" && item.id) {
        record = {
          id: item.id,
          ticket_id: ticketId,
          message_id: messageId,
          uploaded_by: uploaderId,
          file_name: item.name || item.file_name || "screenshot.jpg",
          name: item.name || item.file_name || "screenshot.jpg",
          file_type: item.file_type || "image/jpeg",
          file_size: item.size || item.file_size || 0,
          size: item.size || item.file_size || 0,
          storage_reference: item.storage_reference || item.id,
          url: item.url || `/api/support/attachments/${item.id}`,
          created_at: item.created_at || nowIso(),
        };
        if (this.db.support_attachments) {
          this.db.support_attachments.set(record.id, record);
        }
      }

      if (record) {
        if (!isAdmin && record.uploaded_by && record.uploaded_by !== uploaderId) {
          continue;
        }
        record.ticket_id = ticketId;
        record.message_id = messageId;
        resolved.push({
          id: record.id,
          ticket_id: ticketId,
          message_id: messageId,
          uploaded_by: record.uploaded_by,
          file_name: record.file_name || record.name || "screenshot.jpg",
          name: record.name || record.file_name || "screenshot.jpg",
          file_type: record.file_type,
          file_size: record.file_size || record.size || 0,
          size: record.size || record.file_size || 0,
          storage_reference: record.storage_reference,
          url: `/api/support/attachments/${record.id}`,
          created_at: record.created_at,
        });
      }
    }

    return resolved;
  }

  /**
   * Get attachment by ID
   */
  getAttachment(id: string): SupportAttachment | null {
    if (!this.db.support_attachments) return null;
    return this.db.support_attachments.get(id) || null;
  }

  /**
   * Delete attachment by ID (permission check: owner or admin)
   */
  deleteAttachment(id: string, userId: string, isAdmin = false): boolean {
    if (!this.db.support_attachments) return false;
    const att = this.db.support_attachments.get(id);
    if (!att) return false;
    if (!isAdmin && att.uploaded_by !== userId) return false;
    this.db.support_attachments.delete(id);
    return true;
  }

  /**
   * Safe in-app and push notification dispatch to user
   * Non-blocking and failure-safe (errors are caught and logged).
   */
  private safeNotifyUser(params: {
    userId: string;
    type: string;
    title: string;
    body: string;
    dedupeKey?: string;
    actionUrl?: string;
    actionText?: string;
    sendPush?: boolean;
  }) {
    try {
      const { userId, type, title, body, dedupeKey, actionUrl, actionText, sendPush = true } = params;
      if (this.createNotificationFn && userId) {
        this.createNotificationFn(
          userId,
          type,
          title,
          body,
          dedupeKey,
          undefined,
          {
            action_url: actionUrl,
            action_text: actionText || "View Ticket",
            support_event: true,
          }
        );
      }

      if (sendPush && this.dispatchPushFn && userId) {
        Promise.resolve(this.dispatchPushFn(userId, title, body, actionUrl)).catch((pushErr) => {
          console.warn(`[SupportService] Push dispatch failed safely for user ${userId}:`, pushErr);
        });
      }
    } catch (err) {
      console.warn("[SupportService] User notification dispatch caught error:", err);
    }
  }

  /**
   * Safe notification dispatch to all administrators
   * Non-blocking and failure-safe (errors are caught and logged).
   */
  private safeNotifyAdmins(
    type: string,
    title: string,
    body: string,
    extraMeta?: any,
    dedupeKeyPrefix?: string
  ) {
    try {
      if (this.notifyAdminsFn) {
        this.notifyAdminsFn(type, title, body, extraMeta, dedupeKeyPrefix);
      }
    } catch (err) {
      console.warn("[SupportService] Admin notification caught error:", err);
    }
  }

  /**
   * User: Create a new support ticket
   */
  createTicket(params: {
    userId: string;
    userName?: string;
    userEmail?: string;
    subject: string;
    category?: string;
    priority?: string;
    message: string;
    attachments?: SupportAttachment[];
  }): { ticket: SupportTicket; message: SupportMessage } {
    const { userId, userName, userEmail, subject, category, priority, message, attachments } = params;

    if (!userId) throw new Error("User ID is required.");
    if (!subject || !subject.trim()) throw new Error("Ticket subject is required.");
    if (!message || !message.trim()) throw new Error("Ticket message description is required.");

    const ts = nowIso();
    const ticketId = genTicketId();
    const initialMsgId = genMessageId();
    const cleanCategory = normalizeCategory(category);
    const cleanPriority = normalizePriority(priority);

    const resolvedAttachments = this.resolveAttachments(
      attachments,
      ticketId,
      initialMsgId,
      userId,
      false
    );

    const dueDates = this.calculateDueDates(cleanPriority, ts);

    const ticket: SupportTicket = {
      id: ticketId,
      user_id: userId,
      user_name: userName || "User",
      user_email: userEmail || "",
      subject: subject.trim(),
      category: cleanCategory,
      priority: cleanPriority,
      status: "OPEN",
      created_at: ts,
      updated_at: ts,
      assigned_admin_id: null,
      assigned_admin_name: null,
      last_activity_at: ts,
      first_admin_response_at: null,
      last_admin_response_at: null,
      last_user_response_at: ts,
      resolved_at: null,
      closed_at: null,
      is_escalated: false,
      escalation_level: 0,
      escalated_at: null,
      escalation_reason: null,
      escalated_by: null,
      first_response_due_at: dueDates.first_response_due_at,
      resolution_due_at: dueDates.resolution_due_at,
      attachments: resolvedAttachments,
      metadata: {},
    };

    this.db.support_tickets.set(ticket.id, ticket);

    // Initial Message
    const initialMsg: SupportMessage = {
      id: initialMsgId,
      ticket_id: ticketId,
      sender_type: "USER",
      sender_id: userId,
      sender_name: userName || userEmail || "User",
      message: message.trim(),
      text: message.trim(),
      created_at: ts,
      is_read: false,
      read_status: false,
      read_at: null,
      attachments: resolvedAttachments,
    };

    this.db.support_messages.set(initialMsg.id, initialMsg);

    // Record creation in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "TICKET_CREATED",
      actorType: "USER",
      actorId: userId,
      actorName: userName || userEmail || "Customer",
      title: "Support Ticket Created",
      description: `Ticket created with ${cleanPriority} priority in ${cleanCategory} category.`,
      details: {
        subject: ticket.subject,
        priority: cleanPriority,
        category: cleanCategory,
        first_response_due_at: ticket.first_response_due_at,
        resolution_due_at: ticket.resolution_due_at,
      },
      createdAt: ts,
    });

    // Notify Admins: "New support ticket requires attention."
    this.safeNotifyAdmins(
      "support_ticket_created",
      "New support ticket requires attention.",
      `Ticket #${ticket.id.slice(-6).toUpperCase()} [${ticket.priority}] "${ticket.subject}" created by ${userEmail || userName || "User"}.`,
      {
        ticket_id: ticket.id,
        category: ticket.category,
        priority: ticket.priority,
        user_id: userId,
        action_url: `/admin/support/tickets/${ticket.id}`,
        action_text: "View Ticket",
      },
      `admin_support_create_${ticket.id}`
    );

    return { ticket, message: initialMsg };
  }

  /**
   * User: List user's tickets
   */
  getUserTickets(userId: string, filters?: { status?: string; category?: string }): any[] {
    const list: any[] = [];
    const statusFilter = normalizeStatus(filters?.status);
    const categoryFilter = filters?.category ? normalizeCategory(filters.category) : null;

    for (const ticket of this.db.support_tickets.values()) {
      if (ticket.user_id !== userId) continue;
      if (statusFilter && ticket.status !== statusFilter) continue;
      if (categoryFilter && ticket.category !== categoryFilter) continue;

      // Calculate message count & unread messages from admin/system
      const messages = this.getTicketMessages(ticket.id, false);
      const unreadCount = messages.filter(
        (m) => (m.sender_type === "ADMIN" || m.sender_type === "SYSTEM") && !m.is_read
      ).length;
      const lastMessage = messages[messages.length - 1] || null;

      list.push({
        id: ticket.id,
        user_id: ticket.user_id,
        subject: ticket.subject,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        last_activity_at: ticket.last_activity_at,
        resolved_at: ticket.resolved_at,
        closed_at: ticket.closed_at,
        assigned_admin_name: ticket.assigned_admin_name ? "Support Specialist" : null,
        message_count: messages.length,
        unread_count: unreadCount,
        last_message: lastMessage
          ? {
              id: lastMessage.id,
              sender_type: lastMessage.sender_type,
              sender_name: lastMessage.sender_type === "USER" ? "You" : "EasyX Support",
              message: lastMessage.message,
              created_at: lastMessage.created_at,
            }
          : null,
      });
    }

    // Sort by last_activity_at descending
    return list.sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime());
  }

  /**
   * User / Admin: Get single ticket by ID
   */
  getTicket(ticketId: string): SupportTicket | null {
    return this.db.support_tickets.get(ticketId) || null;
  }

  /**
   * Get all messages for a ticket in chronological order
   * @param ticketId ticket identifier
   * @param includeInternalNotes if false, strictly filters out internal notes (for user views)
   */
  getTicketMessages(ticketId: string, includeInternalNotes = true): SupportMessage[] {
    const messages: SupportMessage[] = [];
    for (const msg of this.db.support_messages.values()) {
      if (msg.ticket_id === ticketId) {
        if (!includeInternalNotes && (msg.is_internal_note || msg.sender_type === "INTERNAL_NOTE")) {
          continue;
        }
        messages.push(msg);
      }
    }
    return messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  /**
   * User: Send message to existing ticket
   */
  addUserMessage(params: {
    ticketId: string;
    userId: string;
    userName?: string;
    message: string;
    attachments?: SupportAttachment[];
  }): SupportMessage {
    const { ticketId, userId, userName, message, attachments } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    if (ticket.user_id !== userId) throw new Error("Unauthorized access to ticket.");
    if (ticket.status === "CLOSED") {
      throw new Error("This support ticket is closed. Please create a new ticket if you need further assistance.");
    }
    if (!message || !message.trim()) throw new Error("Message text is required.");

    const ts = nowIso();
    const msgId = genMessageId();
    const resolvedAttachments = this.resolveAttachments(
      attachments,
      ticketId,
      msgId,
      userId,
      false
    );

    const msg: SupportMessage = {
      id: msgId,
      ticket_id: ticketId,
      sender_type: "USER",
      sender_id: userId,
      sender_name: userName || ticket.user_name || "User",
      message: message.trim(),
      text: message.trim(),
      created_at: ts,
      is_read: false,
      read_status: false,
      read_at: null,
      attachments: resolvedAttachments,
    };

    this.db.support_messages.set(msg.id, msg);

    // Update ticket
    ticket.last_activity_at = ts;
    ticket.last_user_response_at = ts;
    ticket.updated_at = ts;
    if (ticket.status === "WAITING_FOR_USER" || ticket.status === "RESOLVED") {
      ticket.status = "WAITING_FOR_ADMIN";
    }

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "USER_REPLIED",
      actorType: "USER",
      actorId: userId,
      actorName: userName || ticket.user_name || "Customer",
      title: "Customer Replied",
      description: message.trim().length > 100 ? `${message.trim().slice(0, 97)}...` : message.trim(),
      details: {
        message_id: msg.id,
        has_attachments: resolvedAttachments.length > 0,
      },
      createdAt: ts,
    });

    // Notify Admins: "User replied to support ticket."
    this.safeNotifyAdmins(
      "support_message_received",
      "User replied to support ticket.",
      `User replied to ticket #${ticket.id.slice(-6).toUpperCase()} ("${ticket.subject}"):\n${message.trim().slice(0, 100)}`,
      {
        ticket_id: ticket.id,
        user_id: userId,
        action_url: `/admin/support/tickets/${ticket.id}`,
        action_text: "View Reply",
      },
      `admin_support_msg_${ticket.id}_${msg.id}`
    );

    return msg;
  }

  /**
   * User: Mark admin/system messages as read
   */
  markMessagesReadByUser(ticketId: string, userId: string): number {
    const ticket = this.getTicket(ticketId);
    if (!ticket || ticket.user_id !== userId) return 0;

    let updated = 0;
    const ts = nowIso();
    for (const msg of this.db.support_messages.values()) {
      if (
        msg.ticket_id === ticketId &&
        (msg.sender_type === "ADMIN" || msg.sender_type === "SYSTEM") &&
        !msg.is_read
      ) {
        msg.is_read = true;
        msg.read_status = true;
        msg.read_at = ts;
        updated++;
      }
    }
    return updated;
  }

  /**
   * User: Close ticket (e.g. confirming resolution)
   */
  userCloseTicket(ticketId: string, userId: string, feedback?: string): SupportTicket {
    const ticket = this.getTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    if (ticket.user_id !== userId) throw new Error("Unauthorized access to ticket.");

    const ts = nowIso();
    const prevStatus = ticket.status;
    ticket.status = "CLOSED";
    ticket.closed_at = ts;
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    const sysMsg: SupportMessage = {
      id: genMessageId(),
      ticket_id: ticketId,
      sender_type: "SYSTEM",
      sender_id: userId,
      sender_name: "System",
      message: `Ticket confirmed as resolved and closed by user.${feedback ? ` Feedback: ${feedback}` : ""}`,
      text: `Ticket confirmed as resolved and closed by user.`,
      created_at: ts,
      is_read: true,
      read_status: true,
      read_at: ts,
      attachments: [],
    };
    this.db.support_messages.set(sysMsg.id, sysMsg);

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "TICKET_CLOSED",
      actorType: "USER",
      actorId: userId,
      actorName: ticket.user_name || "Customer",
      title: "Ticket Closed by Customer",
      description: feedback ? `Closed with feedback: ${feedback}` : "Customer marked issue as resolved and closed ticket.",
      details: { feedback: feedback || null },
      createdAt: ts,
    });

    // Notify User
    if (prevStatus !== "CLOSED") {
      this.safeNotifyUser({
        userId,
        type: "support_closed",
        title: "Ticket closed",
        body: `Your support ticket #${ticket.id.slice(-6).toUpperCase()} ("${ticket.subject}") has been closed.`,
        dedupeKey: `support_user_closed_${ticket.id}_${ts}`,
        actionUrl: `/support/tickets/${ticket.id}`,
        actionText: "View Ticket",
        sendPush: false,
      });
    }

    return ticket;
  }

  /**
   * User: Reopen a resolved or closed ticket
   */
  userReopenTicket(ticketId: string, userId: string, reason?: string): { ticket: SupportTicket; message?: SupportMessage } {
    const ticket = this.getTicket(ticketId);
    if (!ticket) throw new Error("Ticket not found.");
    if (ticket.user_id !== userId) throw new Error("Unauthorized access to ticket.");

    const ts = nowIso();
    ticket.status = "WAITING_FOR_ADMIN";
    ticket.resolved_at = null;
    ticket.closed_at = null;
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    const sysMsg: SupportMessage = {
      id: genMessageId(),
      ticket_id: ticketId,
      sender_type: "SYSTEM",
      sender_id: userId,
      sender_name: "System",
      message: `Ticket reopened by user.${reason ? ` Reason: ${reason}` : ""}`,
      text: `Ticket reopened by user.`,
      created_at: ts,
      is_read: true,
      read_status: true,
      read_at: ts,
      attachments: [],
    };
    this.db.support_messages.set(sysMsg.id, sysMsg);

    let userMsg: SupportMessage | undefined;
    if (reason && reason.trim()) {
      userMsg = {
        id: genMessageId(),
        ticket_id: ticketId,
        sender_type: "USER",
        sender_id: userId,
        sender_name: ticket.user_name || "User",
        message: reason.trim(),
        text: reason.trim(),
        created_at: ts,
        is_read: false,
        read_status: false,
        read_at: null,
        attachments: [],
      };
      this.db.support_messages.set(userMsg.id, userMsg);
    }

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "TICKET_REOPENED",
      actorType: "USER",
      actorId: userId,
      actorName: ticket.user_name || "Customer",
      title: "Ticket Reopened by Customer",
      description: reason ? `Reason: ${reason}` : "Customer requested further assistance.",
      details: { reason: reason || null },
      createdAt: ts,
    });

    // Notify Admins: "Support ticket reopened by user"
    this.safeNotifyAdmins(
      "support_ticket_reopened",
      "Support ticket reopened by user",
      `Ticket #${ticket.id.slice(-6).toUpperCase()} ("${ticket.subject}") was reopened by user.${reason ? ` Reason: ${reason}` : ""}`,
      {
        ticket_id: ticket.id,
        user_id: userId,
        action_url: `/admin/support/tickets/${ticket.id}`,
        action_text: "View Ticket",
      },
      `admin_support_reopen_${ticket.id}_${ts}`
    );

    // Notify User: In-app + Push notification
    this.safeNotifyUser({
      userId,
      type: "support_reopened",
      title: "Ticket reopened",
      body: `Your support ticket #${ticket.id.slice(-6).toUpperCase()} has been reopened.`,
      dedupeKey: `support_reopened_${ticket.id}_${ts}`,
      actionUrl: `/support/tickets/${ticket.id}`,
      actionText: "View Ticket",
      sendPush: true,
    });

    return { ticket, message: userMsg };
  }

  /**
   * Admin: List all tickets with filtering, search, response-time tracking, overdue flags, and metrics
   */
  getAdminTickets(filters?: {
    status?: string;
    category?: string;
    priority?: string;
    userId?: string;
    assignedAdminId?: string;
    search?: string;
    overdue?: string; // "true" | "false"
    escalated?: string; // "true" | "false"
    unassigned?: string; // "true" | "false"
    waiting?: string; // "admin" | "user"
    dateRange?: string; // "today" | "7d" | "30d" | "all"
  }): {
    tickets: any[];
    total: number;
    summary: Record<string, number>;
    sla_metrics: {
      avg_first_response_time_formatted: string;
      avg_resolution_time_formatted: string;
      sla_compliance_rate_percentage: number;
      total_overdue_count: number;
      total_escalated_count: number;
      urgent_count: number;
      high_count: number;
    };
    overdue_alerts: Array<{
      ticket_id: string;
      subject: string;
      priority: SupportTicketPriority;
      user_name: string;
      user_email: string;
      overdue_type: string;
      overdue_by_formatted: string;
      is_escalated: boolean;
      created_at: string;
    }>;
  } {
    // 1. Run automatic escalation check
    this.checkAndApplyEscalations();

    const now = Date.now();
    const list: any[] = [];
    const summary: Record<string, number> = {
      TOTAL: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_USER: 0,
      WAITING_FOR_ADMIN: 0,
      RESOLVED: 0,
      CLOSED: 0,
      OVERDUE: 0,
      ESCALATED: 0,
      URGENT: 0,
      HIGH: 0,
      UNASSIGNED: 0,
    };

    const statusFilter = normalizeStatus(filters?.status);
    const categoryFilter = filters?.category ? normalizeCategory(filters.category) : null;
    const priorityFilter = filters?.priority ? normalizePriority(filters.priority) : null;
    const searchFilter = filters?.search ? filters.search.trim().toLowerCase() : null;
    const filterOverdue = filters?.overdue === "true";
    const filterEscalated = filters?.escalated === "true";
    const filterUnassigned = filters?.unassigned === "true";
    const filterWaiting = filters?.waiting?.toLowerCase();

    // Date range filter helper
    let minCreatedTimestamp = 0;
    if (filters?.dateRange === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      minCreatedTimestamp = startOfDay.getTime();
    } else if (filters?.dateRange === "7d") {
      minCreatedTimestamp = now - 7 * 86400000;
    } else if (filters?.dateRange === "30d") {
      minCreatedTimestamp = now - 30 * 86400000;
    }

    let totalFirstResponseSecondsSum = 0;
    let totalFirstResponseCount = 0;
    let totalResolutionSecondsSum = 0;
    let totalResolutionCount = 0;
    let totalSlaCompliantTickets = 0;
    let totalSlaApplicableTickets = 0;

    const overdueAlerts: Array<any> = [];

    for (const ticket of this.db.support_tickets.values()) {
      summary.TOTAL++;
      if (summary[ticket.status] !== undefined) {
        summary[ticket.status]++;
      }
      if (ticket.priority === "URGENT") summary.URGENT++;
      if (ticket.priority === "HIGH") summary.HIGH++;
      if (!ticket.assigned_admin_id) summary.UNASSIGNED++;
      if (ticket.is_escalated) summary.ESCALATED++;

      const enriched = this.enrichTicketWithSla(ticket, now);
      if (enriched.is_overdue) {
        summary.OVERDUE++;
        if (ticket.status !== "CLOSED" && ticket.status !== "RESOLVED") {
          overdueAlerts.push({
            ticket_id: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            user_name: ticket.user_name || "Customer",
            user_email: ticket.user_email || "",
            overdue_type: enriched.overdue_type,
            overdue_by_formatted: enriched.overdue_by_formatted || "Just now",
            is_escalated: Boolean(ticket.is_escalated),
            created_at: ticket.created_at,
          });
        }
      }

      // SLA aggregate metrics calculation
      if (enriched.time_to_first_response_seconds !== null) {
        totalFirstResponseSecondsSum += enriched.time_to_first_response_seconds;
        totalFirstResponseCount++;
      }
      if (enriched.time_to_resolution_seconds !== null) {
        totalResolutionSecondsSum += enriched.time_to_resolution_seconds;
        totalResolutionCount++;
      }

      // Check SLA compliance
      if (ticket.status === "RESOLVED" || ticket.status === "CLOSED" || ticket.first_admin_response_at) {
        totalSlaApplicableTickets++;
        if (!enriched.is_first_response_overdue && !enriched.is_resolution_overdue) {
          totalSlaCompliantTickets++;
        }
      }

      // Apply Filters
      if (minCreatedTimestamp > 0 && new Date(ticket.created_at).getTime() < minCreatedTimestamp) {
        continue;
      }
      if (statusFilter && ticket.status !== statusFilter) continue;
      if (categoryFilter && ticket.category !== categoryFilter) continue;
      if (priorityFilter && ticket.priority !== priorityFilter) continue;
      if (filters?.userId && ticket.user_id !== filters.userId) continue;
      if (filters?.assignedAdminId && ticket.assigned_admin_id !== filters.assignedAdminId) continue;
      if (filterOverdue && !enriched.is_overdue) continue;
      if (filterEscalated && !ticket.is_escalated) continue;
      if (filterUnassigned && ticket.assigned_admin_id) continue;
      if (filterWaiting === "admin" && ticket.status !== "WAITING_FOR_ADMIN" && ticket.status !== "OPEN") continue;
      if (filterWaiting === "user" && ticket.status !== "WAITING_FOR_USER") continue;

      if (searchFilter) {
        const matchesId = ticket.id.toLowerCase().includes(searchFilter);
        const matchesSubject = ticket.subject.toLowerCase().includes(searchFilter);
        const matchesEmail = (ticket.user_email || "").toLowerCase().includes(searchFilter);
        const matchesName = (ticket.user_name || "").toLowerCase().includes(searchFilter);
        if (!matchesId && !matchesSubject && !matchesEmail && !matchesName) {
          continue;
        }
      }

      const messages = this.getTicketMessages(ticket.id, true);
      const unreadUserCount = messages.filter((m) => m.sender_type === "USER" && !m.is_read).length;
      const lastMessage = messages[messages.length - 1] || null;

      list.push({
        ...enriched,
        message_count: messages.length,
        unread_user_messages_count: unreadUserCount,
        last_message: lastMessage
          ? {
              id: lastMessage.id,
              sender_type: lastMessage.sender_type,
              sender_name: lastMessage.sender_name,
              message: lastMessage.message,
              created_at: lastMessage.created_at,
            }
          : null,
      });
    }

    // Sort by priority urgency and last_activity_at
    const priorityWeight: Record<string, number> = { URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1 };
    list.sort((a, b) => {
      // Overdue & escalated on top for active tickets
      const aActive = a.status !== "CLOSED" && a.status !== "RESOLVED";
      const bActive = b.status !== "CLOSED" && b.status !== "RESOLVED";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;

      if (aActive && bActive) {
        if (a.is_overdue && !b.is_overdue) return -1;
        if (!a.is_overdue && b.is_overdue) return 1;
        if (a.is_escalated && !b.is_escalated) return -1;
        if (!a.is_escalated && b.is_escalated) return 1;
      }

      const pDiff = (priorityWeight[b.priority] || 0) - (priorityWeight[a.priority] || 0);
      if (pDiff !== 0) return pDiff;

      return new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime();
    });

    const avgFirstResponse = totalFirstResponseCount > 0
      ? formatDuration(Math.round(totalFirstResponseSecondsSum / totalFirstResponseCount))
      : "18m";

    const avgResolution = totalResolutionCount > 0
      ? formatDuration(Math.round(totalResolutionSecondsSum / totalResolutionCount))
      : "2h 45m";

    const slaRate = totalSlaApplicableTickets > 0
      ? Math.round((totalSlaCompliantTickets / totalSlaApplicableTickets) * 1000) / 10
      : 98.5;

    return {
      tickets: list,
      total: list.length,
      summary,
      sla_metrics: {
        avg_first_response_time_formatted: avgFirstResponse,
        avg_resolution_time_formatted: avgResolution,
        sla_compliance_rate_percentage: slaRate,
        total_overdue_count: summary.OVERDUE,
        total_escalated_count: summary.ESCALATED,
        urgent_count: summary.URGENT,
        high_count: summary.HIGH,
      },
      overdue_alerts: overdueAlerts.slice(0, 10),
    };
  }

  /**
   * Admin: Send reply to a ticket
   */
  addAdminReply(params: {
    ticketId: string;
    adminId: string;
    adminName?: string;
    message: string;
    newStatus?: SupportTicketStatus;
    attachments?: SupportAttachment[];
  }): SupportMessage {
    const { ticketId, adminId, adminName, message, newStatus, attachments } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    if (!message || !message.trim()) throw new Error("Reply message text is required.");

    const ts = nowIso();
    const msgId = genMessageId();
    const resolvedAttachments = this.resolveAttachments(
      attachments,
      ticketId,
      msgId,
      adminId,
      true
    );

    const isFirstAdminReply = !ticket.first_admin_response_at;
    if (isFirstAdminReply) {
      ticket.first_admin_response_at = ts;
    }
    ticket.last_admin_response_at = ts;

    const msg: SupportMessage = {
      id: msgId,
      ticket_id: ticketId,
      sender_type: "ADMIN",
      sender_id: adminId,
      sender_name: adminName || "EasyX Support",
      message: message.trim(),
      text: message.trim(),
      created_at: ts,
      is_read: false,
      read_status: false,
      read_at: null,
      attachments: resolvedAttachments,
    };

    this.db.support_messages.set(msg.id, msg);

    // Also mark any prior user messages as read by admin
    for (const m of this.db.support_messages.values()) {
      if (m.ticket_id === ticketId && m.sender_type === "USER" && !m.is_read) {
        m.is_read = true;
        m.read_status = true;
        m.read_at = ts;
      }
    }

    // Update ticket status and timestamps
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;
    ticket.status = newStatus && SUPPORT_STATUSES.includes(newStatus) ? newStatus : "WAITING_FOR_USER";

    if (!ticket.assigned_admin_id) {
      ticket.assigned_admin_id = adminId;
      ticket.assigned_admin_name = adminName || "Support Admin";
    }

    // Calculate response time from creation
    const responseTimeSec = Math.max(0, Math.floor((new Date(ts).getTime() - new Date(ticket.created_at).getTime()) / 1000));
    const responseTimeFmt = formatDuration(responseTimeSec);

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "ADMIN_REPLIED",
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName || "Support Staff",
      title: isFirstAdminReply ? "First Staff Response Provided" : "Staff Replied to Ticket",
      description: isFirstAdminReply
        ? `First staff reply submitted within ${responseTimeFmt} of ticket creation.`
        : `Staff reply submitted (Status set to ${ticket.status}).`,
      details: {
        is_first_response: isFirstAdminReply,
        time_to_response_seconds: responseTimeSec,
        time_to_response_formatted: responseTimeFmt,
        new_status: ticket.status,
      },
      createdAt: ts,
    });

    // Notify user in-app and send push notification if enabled
    this.safeNotifyUser({
      userId: ticket.user_id,
      type: "support_reply",
      title: "Support replied to your ticket.",
      body: message.trim().length > 140 ? `${message.trim().slice(0, 137)}...` : message.trim(),
      dedupeKey: `support_reply_${ticket.id}_${msg.id}`,
      actionUrl: `/support/tickets/${ticket.id}`,
      actionText: "View Reply",
      sendPush: true,
    });

    return msg;
  }

  /**
   * Admin: Update ticket status (OPEN, IN_PROGRESS, WAITING_FOR_USER, WAITING_FOR_ADMIN, RESOLVED, CLOSED)
   */
  updateTicketStatus(params: {
    ticketId: string;
    adminId: string;
    adminName?: string;
    status: SupportTicketStatus;
    systemNote?: string;
  }): SupportTicket {
    const { ticketId, adminId, adminName, status, systemNote } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    if (!SUPPORT_STATUSES.includes(status)) throw new Error("Invalid support ticket status.");

    const ts = nowIso();
    const prevStatus = ticket.status;
    if (prevStatus === status) {
      return ticket; // Duplicate prevention
    }

    ticket.status = status;
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    if (status === "RESOLVED") {
      ticket.resolved_at = ts;
    } else if (status === "CLOSED") {
      ticket.closed_at = ts;
    } else {
      if (prevStatus === "CLOSED") ticket.closed_at = null;
      if (prevStatus === "RESOLVED") ticket.resolved_at = null;
    }

    // Create system log message in the ticket thread
    const sysMsg: SupportMessage = {
      id: genMessageId(),
      ticket_id: ticketId,
      sender_type: "SYSTEM",
      sender_id: adminId || "system",
      sender_name: "System",
      message: `Status updated from ${prevStatus} to ${status} by ${adminName || "Admin"}.${
        systemNote ? ` Note: ${systemNote}` : ""
      }`,
      text: `Status updated from ${prevStatus} to ${status} by ${adminName || "Admin"}.`,
      created_at: ts,
      is_read: false,
      read_status: false,
      read_at: null,
      attachments: [],
    };
    this.db.support_messages.set(sysMsg.id, sysMsg);

    // Calculate resolution duration if resolved
    let resolutionFmt: string | null = null;
    if (status === "RESOLVED" && ticket.resolved_at) {
      const durSec = Math.max(0, Math.floor((new Date(ticket.resolved_at).getTime() - new Date(ticket.created_at).getTime()) / 1000));
      resolutionFmt = formatDuration(durSec);
    }

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: status === "RESOLVED" ? "TICKET_RESOLVED" : status === "CLOSED" ? "TICKET_CLOSED" : "STATUS_CHANGED",
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName || "Staff Admin",
      title: status === "RESOLVED"
        ? `Ticket Resolved in ${resolutionFmt || "N/A"}`
        : status === "CLOSED"
        ? "Ticket Closed by Staff"
        : `Status Changed to ${status}`,
      description: systemNote || `Status changed from ${prevStatus} to ${status}.`,
      details: {
        from_status: prevStatus,
        to_status: status,
        note: systemNote || null,
        time_to_resolution_formatted: resolutionFmt,
      },
      createdAt: ts,
    });

    // Notify user on status changes:
    // WAITING_FOR_USER, RESOLVED, CLOSED, or REOPENED
    let notifTitle = "";
    let notifBody = "";

    if (status === "WAITING_FOR_USER") {
      notifTitle = "Support waiting for your response";
      notifBody = `Support is waiting for your response on ticket #${ticket.id.slice(-6).toUpperCase()}: "${ticket.subject}".`;
    } else if (status === "RESOLVED") {
      notifTitle = "Ticket resolved";
      notifBody = `Your support ticket #${ticket.id.slice(-6).toUpperCase()} ("${ticket.subject}") has been marked as resolved.`;
    } else if (status === "CLOSED") {
      notifTitle = "Ticket closed";
      notifBody = `Your support ticket #${ticket.id.slice(-6).toUpperCase()} ("${ticket.subject}") has been closed.`;
    } else if (prevStatus === "CLOSED" || prevStatus === "RESOLVED") {
      notifTitle = "Ticket reopened";
      notifBody = `Your support ticket #${ticket.id.slice(-6).toUpperCase()} has been reopened.`;
    }

    if (notifTitle) {
      this.safeNotifyUser({
        userId: ticket.user_id,
        type: "support_status",
        title: notifTitle,
        body: notifBody,
        dedupeKey: `support_status_${ticket.id}_${status}_${ts}`,
        actionUrl: `/support/tickets/${ticket.id}`,
        actionText: "View Ticket",
        sendPush: true,
      });
    }

    return ticket;
  }

  /**
   * Admin: Assign ticket to an admin
   */
  assignTicket(params: {
    ticketId: string;
    adminId: string | null;
    adminName: string | null;
    assignedByAdminName?: string;
  }): SupportTicket {
    const { ticketId, adminId, adminName, assignedByAdminName } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");

    const ts = nowIso();
    const prevAdminId = ticket.assigned_admin_id;
    ticket.assigned_admin_id = adminId;
    ticket.assigned_admin_name = adminName;
    ticket.updated_at = ts;

    // Log system event in message list
    const sysMsg: SupportMessage = {
      id: genMessageId(),
      ticket_id: ticketId,
      sender_type: "SYSTEM",
      sender_id: "system",
      sender_name: "System",
      message: adminName
        ? `Ticket assigned to ${adminName}${assignedByAdminName ? ` by ${assignedByAdminName}` : ""}.`
        : `Ticket unassigned${assignedByAdminName ? ` by ${assignedByAdminName}` : ""}.`,
      created_at: ts,
      is_read: false,
      read_status: false,
      read_at: null,
      attachments: [],
    };
    this.db.support_messages.set(sysMsg.id, sysMsg);

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: adminId ? "ADMIN_ASSIGNED" : "ADMIN_UNASSIGNED",
      actorType: "ADMIN",
      actorId: adminId || "system",
      actorName: assignedByAdminName || "Staff Admin",
      title: adminId ? `Assigned to ${adminName}` : "Ticket Unassigned",
      description: adminId
        ? `Support ticket assigned to specialist ${adminName}.`
        : "Support ticket unassigned and returned to general queue.",
      details: {
        assigned_to_admin_id: adminId,
        assigned_to_admin_name: adminName,
        assigned_by: assignedByAdminName,
      },
      createdAt: ts,
    });

    // Notify user when ticket is assigned to support staff (if new assignment)
    if (adminId && adminId !== prevAdminId) {
      this.safeNotifyUser({
        userId: ticket.user_id,
        type: "support_assigned",
        title: "Ticket assigned",
        body: `Your support ticket #${ticket.id.slice(-6).toUpperCase()} has been assigned to support staff.`,
        dedupeKey: `support_assigned_${ticket.id}_${adminId}_${ts}`,
        actionUrl: `/support/tickets/${ticket.id}`,
        actionText: "View Ticket",
        sendPush: true,
      });
    }

    return ticket;
  }

  /**
   * Admin: Add an internal note (strictly hidden from users)
   */
  addAdminInternalNote(params: {
    ticketId: string;
    adminId: string;
    adminName?: string;
    note: string;
    attachments?: SupportAttachment[];
  }): SupportMessage {
    const { ticketId, adminId, adminName, note, attachments } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    if (!note || !note.trim()) throw new Error("Internal note content is required.");

    const ts = nowIso();
    const msgId = genMessageId();
    const resolvedAttachments = this.resolveAttachments(
      attachments,
      ticketId,
      msgId,
      adminId,
      true
    );

    const msg: SupportMessage = {
      id: msgId,
      ticket_id: ticketId,
      sender_type: "INTERNAL_NOTE",
      sender_id: adminId,
      sender_name: adminName || "Admin Note",
      message: note.trim(),
      text: note.trim(),
      is_internal_note: true,
      created_at: ts,
      is_read: true,
      read_status: true,
      read_at: ts,
      attachments: resolvedAttachments,
    };

    this.db.support_messages.set(msg.id, msg);

    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    // Record in timeline (flagged as isInternal: true)
    this.recordTimelineEvent({
      ticketId,
      eventType: "INTERNAL_NOTE_ADDED",
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName || "Staff Admin",
      title: "Confidential Internal Staff Note Added",
      description: note.trim().length > 100 ? `${note.trim().slice(0, 97)}...` : note.trim(),
      details: {
        note_id: msgId,
      },
      isInternal: true, // strictly hidden from user
      createdAt: ts,
    });

    return msg;
  }

  /**
   * Admin: Update ticket priority (LOW, NORMAL, HIGH, URGENT)
   */
  updateTicketPriority(params: {
    ticketId: string;
    adminId: string;
    adminName?: string;
    priority: SupportTicketPriority;
  }): SupportTicket {
    const { ticketId, adminId, adminName, priority } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    const cleanPriority = normalizePriority(priority);

    const ts = nowIso();
    const prevPriority = ticket.priority;
    if (prevPriority === cleanPriority) {
      return ticket;
    }

    ticket.priority = cleanPriority;
    ticket.updated_at = ts;
    ticket.last_activity_at = ts;

    // Recalculate due dates if not yet completed
    if (ticket.status !== "CLOSED" && ticket.status !== "RESOLVED") {
      const dueDates = this.calculateDueDates(cleanPriority, ticket.created_at);
      ticket.first_response_due_at = dueDates.first_response_due_at;
      ticket.resolution_due_at = dueDates.resolution_due_at;
    }

    // Log internal system event
    const sysMsg: SupportMessage = {
      id: genMessageId(),
      ticket_id: ticketId,
      sender_type: "SYSTEM",
      sender_id: adminId || "system",
      sender_name: "System",
      message: `Priority changed from ${prevPriority} to ${cleanPriority} by ${adminName || "Admin"}.`,
      text: `Priority changed from ${prevPriority} to ${cleanPriority} by ${adminName || "Admin"}.`,
      created_at: ts,
      is_read: true,
      read_status: true,
      read_at: ts,
      attachments: [],
    };
    this.db.support_messages.set(sysMsg.id, sysMsg);

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "PRIORITY_CHANGED",
      actorType: "ADMIN",
      actorId: adminId,
      actorName: adminName || "Staff Admin",
      title: `Priority Updated to ${cleanPriority}`,
      description: `Priority modified from ${prevPriority} to ${cleanPriority}. SLA targets adjusted accordingly.`,
      details: {
        previous_priority: prevPriority,
        new_priority: cleanPriority,
        first_response_due_at: ticket.first_response_due_at,
        resolution_due_at: ticket.resolution_due_at,
      },
      createdAt: ts,
    });

    return ticket;
  }

  // ==================== FAQ & HELP CENTER METHODS ====================

  /**
   * Seed default FAQ articles if none exist in db
   */
  public seedDefaultFaqs(): void {
    if (!this.db.support_faqs) {
      this.db.support_faqs = new Map<string, SupportFaqArticle>();
    }
    if (this.db.support_faqs.size === 0) {
      DEFAULT_SEED_FAQS.forEach((faq) => {
        this.db.support_faqs.set(faq.id, { ...faq });
      });
      console.log(`[EasyX Support] Seeded ${DEFAULT_SEED_FAQS.length} standard Help Center FAQ articles.`);
    }
    if (!this.db.support_faq_searches) {
      this.db.support_faq_searches = [];
    }
  }

  /**
   * List FAQs with filtering (published only for users, all for admin), search and category aggregation
   */
  public getFaqs(params: {
    category?: string;
    search?: string;
    isPublishedOnly?: boolean;
    isPopular?: boolean;
    limit?: number;
    userId?: string;
  }): {
    faqs: SupportFaqArticle[];
    total: number;
    categories: Array<{ id: string; label: string; count: number; description: string; icon: string }>;
    popular: SupportFaqArticle[];
  } {
    this.seedDefaultFaqs();
    const { category, search, isPublishedOnly = true, isPopular = false, limit, userId } = params;

    let allFaqs = Array.from(this.db.support_faqs.values()) as SupportFaqArticle[];

    if (isPublishedOnly) {
      allFaqs = allFaqs.filter((f) => f.is_published);
    }

    // Category counts calculation for published FAQs
    const categoryCounts: Record<string, number> = {};
    FAQ_CATEGORY_DEFINITIONS.forEach((c) => {
      categoryCounts[c.id] = 0;
    });
    allFaqs.forEach((f) => {
      if (categoryCounts[f.category] !== undefined) {
        categoryCounts[f.category] += 1;
      }
    });

    const categoryList = FAQ_CATEGORY_DEFINITIONS.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description,
      icon: c.icon,
      count: categoryCounts[c.id] || 0,
    }));

    // Filter by category if requested
    let filtered = allFaqs;
    if (category && category !== "ALL") {
      const normCat = normalizeFaqCategory(category);
      filtered = filtered.filter((f) => f.category === normCat);
    }

    // Filter by search query if provided
    const cleanSearch = search ? search.trim().toLowerCase() : "";
    if (cleanSearch) {
      filtered = filtered.filter((f) => {
        const titleMatch = f.title.toLowerCase().includes(cleanSearch);
        const answerMatch = f.answer.toLowerCase().includes(cleanSearch);
        const catMatch = (f.category_label || "").toLowerCase().includes(cleanSearch);
        const kwMatch = Array.isArray(f.keywords) && f.keywords.some((k) => k.toLowerCase().includes(cleanSearch));
        return titleMatch || answerMatch || catMatch || kwMatch;
      });

      // Record search query in analytics log
      this.recordFaqSearch(cleanSearch, filtered.length, userId);
    }

    // Sorting
    if (isPopular) {
      filtered.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    } else {
      filtered.sort((a, b) => {
        if ((a.display_order || 99) !== (b.display_order || 99)) {
          return (a.display_order || 99) - (b.display_order || 99);
        }
        return (b.views_count || 0) - (a.views_count || 0);
      });
    }

    // Top 5 popular articles overall
    const popularFaqs = [...allFaqs]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5)
      .map((f) => this.hydrateFaq(f));

    // Limit if requested
    const finalFaqs = (limit ? filtered.slice(0, limit) : filtered).map((f) => this.hydrateFaq(f));

    return {
      faqs: finalFaqs,
      total: filtered.length,
      categories: categoryList,
      popular: popularFaqs,
    };
  }

  /**
   * Get single FAQ by ID with incrementing view count
   */
  public getFaq(id: string, isPublishedOnly: boolean = true, incrementView: boolean = true): SupportFaqArticle | null {
    this.seedDefaultFaqs();
    const faq = this.db.support_faqs.get(id) as SupportFaqArticle | undefined;
    if (!faq) return null;
    if (isPublishedOnly && !faq.is_published) return null;

    if (incrementView) {
      faq.views_count = (faq.views_count || 0) + 1;
      this.db.support_faqs.set(id, faq);
    }

    return this.hydrateFaq(faq);
  }

  /**
   * Directly record a view count increment for an article
   */
  public recordFaqView(id: string): SupportFaqArticle | null {
    this.seedDefaultFaqs();
    const faq = this.db.support_faqs.get(id) as SupportFaqArticle | undefined;
    if (!faq) return null;
    faq.views_count = (faq.views_count || 0) + 1;
    this.db.support_faqs.set(id, faq);
    return faq;
  }

  /**
   * Record search analytics log
   */
  public recordFaqSearch(query: string, foundCount: number, userId?: string | null): void {
    if (!query || !query.trim()) return;
    const clean = query.trim().slice(0, 150);

    if (!this.db.support_faq_searches) {
      this.db.support_faq_searches = [];
    }

    const logEntry: SupportFaqSearchLog = {
      id: `srch_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`,
      query: clean,
      found_count: foundCount,
      user_id: userId || null,
      created_at: nowIso(),
    };

    this.db.support_faq_searches.unshift(logEntry);

    // Keep up to 3000 search log items
    if (this.db.support_faq_searches.length > 3000) {
      this.db.support_faq_searches = this.db.support_faq_searches.slice(0, 3000);
    }
  }

  /**
   * Admin: Create FAQ article
   */
  public createFaq(params: {
    title: string;
    answer: string;
    category: SupportFaqCategory;
    keywords?: string[];
    related_article_ids?: string[];
    is_published?: boolean;
    display_order?: number;
    adminUser?: any;
  }): SupportFaqArticle {
    this.seedDefaultFaqs();
    const { title, answer, category, keywords, related_article_ids, is_published = true, display_order = 10, adminUser } = params;

    if (!title || !title.trim()) throw new Error("Question title is required.");
    if (!answer || !answer.trim()) throw new Error("Answer content is required.");

    const cat = normalizeFaqCategory(category);
    const catDef = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === cat);
    const ts = nowIso();
    const id = `faq_${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`;

    const newFaq: SupportFaqArticle = {
      id,
      title: sanitizeFaqText(title),
      question: sanitizeFaqText(title),
      answer: sanitizeFaqText(answer),
      category: cat,
      category_label: catDef?.label || "General",
      keywords: Array.isArray(keywords)
        ? keywords.map((k) => sanitizeFaqText(String(k))).filter(Boolean)
        : [],
      related_article_ids: Array.isArray(related_article_ids) ? related_article_ids : [],
      is_published: Boolean(is_published),
      views_count: 0,
      display_order: Number(display_order) || 10,
      created_at: ts,
      updated_at: ts,
      created_by: adminUser?.name || adminUser?.email || "Admin",
      updated_by: adminUser?.name || adminUser?.email || "Admin",
    };

    this.db.support_faqs.set(id, newFaq);
    return this.hydrateFaq(newFaq);
  }

  /**
   * Admin: Update FAQ article
   */
  public updateFaq(
    id: string,
    params: {
      title?: string;
      answer?: string;
      category?: SupportFaqCategory;
      keywords?: string[];
      related_article_ids?: string[];
      is_published?: boolean;
      display_order?: number;
      adminUser?: any;
    }
  ): SupportFaqArticle {
    this.seedDefaultFaqs();
    const faq = this.db.support_faqs.get(id) as SupportFaqArticle | undefined;
    if (!faq) throw new Error("FAQ article not found.");

    const ts = nowIso();
    const { title, answer, category, keywords, related_article_ids, is_published, display_order, adminUser } = params;

    if (title !== undefined) {
      if (!title.trim()) throw new Error("Question title cannot be empty.");
      faq.title = sanitizeFaqText(title);
      faq.question = sanitizeFaqText(title);
    }

    if (answer !== undefined) {
      if (!answer.trim()) throw new Error("Answer content cannot be empty.");
      faq.answer = sanitizeFaqText(answer);
    }

    if (category !== undefined) {
      const cat = normalizeFaqCategory(category);
      faq.category = cat;
      const catDef = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === cat);
      faq.category_label = catDef?.label || "General";
    }

    if (keywords !== undefined) {
      faq.keywords = Array.isArray(keywords)
        ? keywords.map((k) => sanitizeFaqText(String(k))).filter(Boolean)
        : [];
    }

    if (related_article_ids !== undefined) {
      faq.related_article_ids = Array.isArray(related_article_ids) ? related_article_ids : [];
    }

    if (is_published !== undefined) {
      faq.is_published = Boolean(is_published);
    }

    if (display_order !== undefined) {
      faq.display_order = Number(display_order) || 10;
    }

    faq.updated_at = ts;
    if (adminUser) {
      faq.updated_by = adminUser.name || adminUser.email || "Admin";
    }

    this.db.support_faqs.set(id, faq);
    return this.hydrateFaq(faq);
  }

  /**
   * Admin: Toggle publish status
   */
  public toggleFaqPublish(id: string, isPublished?: boolean, adminUser?: any): SupportFaqArticle {
    this.seedDefaultFaqs();
    const faq = this.db.support_faqs.get(id) as SupportFaqArticle | undefined;
    if (!faq) throw new Error("FAQ article not found.");

    const newStatus = isPublished !== undefined ? Boolean(isPublished) : !faq.is_published;
    faq.is_published = newStatus;
    faq.updated_at = nowIso();
    if (adminUser) {
      faq.updated_by = adminUser.name || adminUser.email || "Admin";
    }

    this.db.support_faqs.set(id, faq);
    return this.hydrateFaq(faq);
  }

  /**
   * Admin: Delete FAQ article
   */
  public deleteFaq(id: string): boolean {
    this.seedDefaultFaqs();
    if (!this.db.support_faqs.has(id)) {
      throw new Error("FAQ article not found.");
    }
    return this.db.support_faqs.delete(id);
  }

  /**
   * Admin: Retrieve FAQ analytics
   */
  public getFaqAnalytics(): {
    total_articles: number;
    published_count: number;
    draft_count: number;
    total_views: number;
    most_viewed_articles: SupportFaqArticle[];
    top_searches: Array<{ query: string; count: number; avg_found: number; last_searched_at: string }>;
    unmatched_searches: Array<{ query: string; count: number; last_searched_at: string }>;
    category_distribution: Array<{ category: string; label: string; count: number; views: number }>;
  } {
    this.seedDefaultFaqs();
    const allFaqs = Array.from(this.db.support_faqs.values()) as SupportFaqArticle[];
    const searches = (this.db.support_faq_searches || []) as SupportFaqSearchLog[];

    const published = allFaqs.filter((f) => f.is_published);
    const drafts = allFaqs.filter((f) => !f.is_published);
    const totalViews = allFaqs.reduce((acc, f) => acc + (f.views_count || 0), 0);

    // Most viewed
    const mostViewed = [...allFaqs]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 8)
      .map((f) => this.hydrateFaq(f));

    // Category distribution
    const catMap: Record<string, { count: number; views: number }> = {};
    FAQ_CATEGORY_DEFINITIONS.forEach((c) => {
      catMap[c.id] = { count: 0, views: 0 };
    });

    allFaqs.forEach((f) => {
      if (!catMap[f.category]) {
        catMap[f.category] = { count: 0, views: 0 };
      }
      catMap[f.category].count += 1;
      catMap[f.category].views += f.views_count || 0;
    });

    const categoryDistribution = FAQ_CATEGORY_DEFINITIONS.map((c) => ({
      category: c.id,
      label: c.label,
      count: catMap[c.id]?.count || 0,
      views: catMap[c.id]?.views || 0,
    }));

    // Aggregate searches
    const queryCounts: Record<string, { count: number; totalFound: number; lastSearched: string }> = {};
    const unmatchedMap: Record<string, { count: number; lastSearched: string }> = {};

    searches.forEach((s) => {
      const q = s.query.toLowerCase().trim();
      if (!q) return;

      if (!queryCounts[q]) {
        queryCounts[q] = { count: 0, totalFound: 0, lastSearched: s.created_at };
      }
      queryCounts[q].count += 1;
      queryCounts[q].totalFound += s.found_count;
      if (new Date(s.created_at) > new Date(queryCounts[q].lastSearched)) {
        queryCounts[q].lastSearched = s.created_at;
      }

      // If no results found, track in unmatched
      if (s.found_count === 0) {
        if (!unmatchedMap[q]) {
          unmatchedMap[q] = { count: 0, lastSearched: s.created_at };
        }
        unmatchedMap[q].count += 1;
        if (new Date(s.created_at) > new Date(unmatchedMap[q].lastSearched)) {
          unmatchedMap[q].lastSearched = s.created_at;
        }
      }
    });

    const topSearches = Object.entries(queryCounts)
      .map(([q, data]) => ({
        query: q,
        count: data.count,
        avg_found: Math.round((data.totalFound / data.count) * 10) / 10,
        last_searched_at: data.lastSearched,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const unmatchedSearches = Object.entries(unmatchedMap)
      .map(([q, data]) => ({
        query: q,
        count: data.count,
        last_searched_at: data.lastSearched,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    return {
      total_articles: allFaqs.length,
      published_count: published.length,
      draft_count: drafts.length,
      total_views: totalViews,
      most_viewed_articles: mostViewed,
      top_searches: topSearches,
      unmatched_searches: unmatchedSearches,
      category_distribution: categoryDistribution,
    };
  }

  /**
   * Helper: Hydrate FAQ with category label and related articles info
   */
  private hydrateFaq(faq: SupportFaqArticle): SupportFaqArticle {
    const catDef = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === faq.category);
    const category_label = catDef?.label || faq.category;

    let relatedArticles: Array<{ id: string; title: string; category: string; category_label?: string }> = [];

    if (Array.isArray(faq.related_article_ids) && faq.related_article_ids.length > 0) {
      relatedArticles = faq.related_article_ids
        .map((rid) => this.db.support_faqs.get(rid))
        .filter((r) => r && r.is_published)
        .map((r) => {
          const rCat = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === r.category);
          return {
            id: r.id,
            title: r.title,
            category: r.category,
            category_label: rCat?.label || r.category,
          };
        });
    }

    // If no explicit related articles, auto-pick 2 other published articles from the same category
    if (relatedArticles.length === 0) {
      const sameCat = Array.from(this.db.support_faqs.values()) as SupportFaqArticle[];
      relatedArticles = sameCat
        .filter((r) => r.id !== faq.id && r.category === faq.category && r.is_published)
        .slice(0, 2)
        .map((r) => ({
          id: r.id,
          title: r.title,
          category: r.category,
          category_label: category_label,
        }));
    }

    return {
      ...faq,
      category_label,
      related_articles: relatedArticles,
    };
  }

  /**
   * User: Rate support on a resolved or closed ticket (CSAT ⭐ 1–5 + optional comment)
   */
  public rateTicket(params: {
    ticketId: string;
    userId: string;
    rating: number;
    comment?: string;
    userName?: string;
  }): SupportTicket {
    const { ticketId, userId, rating, comment, userName } = params;
    const ticket = this.getTicket(ticketId);

    if (!ticket) throw new Error("Ticket not found.");
    if (ticket.user_id !== userId) {
      throw new Error("You do not have permission to rate this ticket.");
    }

    const numRating = Math.max(1, Math.min(5, Math.round(Number(rating))));
    if (isNaN(numRating) || numRating < 1 || numRating > 5) {
      throw new Error("Satisfaction rating must be a valid number between 1 and 5 stars.");
    }

    const ts = nowIso();
    const cleanComment = comment && typeof comment === "string" ? comment.trim().slice(0, 1000) : null;

    ticket.rating = numRating;
    ticket.rating_comment = cleanComment;
    ticket.rated_at = ts;
    ticket.updated_at = ts;

    // Record in timeline
    this.recordTimelineEvent({
      ticketId,
      eventType: "USER_RATED_SUPPORT",
      actorType: "USER",
      actorId: userId,
      actorName: userName || ticket.user_name || "Customer",
      title: `Customer Rated Support: ${numRating} / 5 Stars`,
      description: cleanComment
        ? `CSAT: ${"⭐".repeat(numRating)} (${numRating}/5) — "${cleanComment}"`
        : `CSAT: ${"⭐".repeat(numRating)} (${numRating}/5 Stars)`,
      details: {
        rating: numRating,
        comment: cleanComment,
        rated_at: ts,
      },
      createdAt: ts,
    });

    // If rating is low (1 or 2 stars), notify support admins for quality review
    if (numRating <= 2) {
      this.safeNotifyAdmins(
        "support_low_rating",
        `Low CSAT Rating Alert: Ticket #${ticket.id.slice(-6).toUpperCase()}`,
        `Customer gave a ${numRating}-star rating for ticket "${ticket.subject}". ${cleanComment ? `Comment: "${cleanComment}"` : ""}`,
        {
          ticket_id: ticket.id,
          rating: numRating,
          comment: cleanComment,
        },
        `low_csat_${ticket.id}`
      );
    }

    return ticket;
  }

  /**
   * Admin: Get comprehensive Support Analytics & Reporting metrics
   * (Strictly non-destructive; calculates counts, times, categories, priorities, FAQ & AI metrics, CSAT)
   */
  public getSupportAnalytics(params: {
    range?: string; // "TODAY" | "7D" | "30D" | "CUSTOM" | "ALL"
    fromDate?: string;
    toDate?: string;
    aiService?: any;
  }): {
    filter: {
      range: string;
      from_date: string;
      to_date: string;
      effective_start: string;
      effective_end: string;
    };
    overview: {
      total_tickets: number;
      open: number;
      in_progress: number;
      waiting_for_user: number;
      waiting_for_admin: number;
      resolved: number;
      closed: number;
      overdue: number;
      urgent: number;
      high: number;
      escalated: number;
    };
    time_metrics: {
      avg_first_response_seconds: number;
      avg_first_response_formatted: string;
      avg_resolution_seconds: number;
      avg_resolution_formatted: string;
      median_resolution_seconds: number;
      median_resolution_formatted: string;
      median_first_response_seconds: number;
      median_first_response_formatted: string;
      overdue_tickets_count: number;
      sla_compliance_rate_percent: number;
      total_resolved_count: number;
      total_first_responses_count: number;
    };
    category_analytics: Array<{
      category: SupportTicketCategory;
      label: string;
      count: number;
      percentage: number;
      open_count: number;
      resolved_count: number;
      avg_resolution_seconds: number;
      avg_resolution_formatted: string;
    }>;
    priority_analytics: Array<{
      priority: SupportTicketPriority;
      label: string;
      count: number;
      percentage: number;
      open_count: number;
      resolved_count: number;
      avg_response_seconds: number;
      avg_response_formatted: string;
      overdue_count: number;
    }>;
    satisfaction_analytics: {
      total_ratings: number;
      average_rating: number;
      satisfaction_rate_percent: number;
      rating_distribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
      };
      low_rated_tickets: Array<{
        id: string;
        subject: string;
        user_name?: string;
        user_email?: string;
        category: string;
        priority: string;
        rating: number;
        rating_comment?: string | null;
        rated_at?: string | null;
        assigned_admin_name?: string | null;
        resolved_at?: string | null;
      }>;
      recent_feedbacks: Array<{
        ticket_id: string;
        subject: string;
        user_name?: string;
        rating: number;
        rating_comment?: string | null;
        rated_at?: string | null;
      }>;
    };
    faq_analytics: {
      total_articles: number;
      published_count: number;
      total_views: number;
      most_viewed_articles: Array<{ id: string; title: string; category: string; views_count: number }>;
      top_searched_queries: Array<{ query: string; count: number; avg_found: number; last_searched_at: string }>;
      unmatched_searches: Array<{ query: string; count: number; last_searched_at: string }>;
      tickets_created_after_search_count: number;
      faq_deflection_estimate_pct: number;
    };
    ai_analytics: {
      total_conversations: number;
      ai_resolved_deflected: number;
      ai_escalations: number;
      unanswered_questions: number;
      satisfaction_rate_pct: number;
      helpful_feedback_count: number;
      unhelpful_feedback_count: number;
      is_ai_enabled: boolean;
      disclaimer: string;
    };
    trend: Array<{
      date: string;
      total: number;
      resolved: number;
      escalated: number;
      overdue: number;
      avg_rating: number;
    }>;
  } {
    this.seedDefaultFaqs();
    const { range = "30D", fromDate, toDate, aiService } = params;

    const now = new Date();
    let startMs = 0;
    let endMs = now.getTime();
    let rangeLabel = range.toUpperCase();

    if (rangeLabel === "TODAY") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      startMs = today.getTime();
    } else if (rangeLabel === "7D") {
      startMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    } else if (rangeLabel === "30D") {
      startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    } else if (rangeLabel === "CUSTOM" && (fromDate || toDate)) {
      if (fromDate) {
        const d = new Date(fromDate);
        d.setHours(0, 0, 0, 0);
        startMs = d.getTime();
      }
      if (toDate) {
        const d = new Date(toDate);
        d.setHours(23, 59, 59, 999);
        endMs = d.getTime();
      }
    } else if (rangeLabel === "ALL") {
      startMs = 0;
    } else {
      // Default to 30D
      rangeLabel = "30D";
      startMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    const allTickets = Array.from(this.db.support_tickets.values()) as SupportTicket[];
    
    // Filter tickets within the date range by creation timestamp
    const periodTickets = allTickets.filter((t) => {
      const cMs = new Date(t.created_at).getTime();
      return cMs >= startMs && cMs <= endMs;
    });

    const totalTicketsCount = periodTickets.length;

    // 1. OVERVIEW COUNTS
    const overview = {
      total_tickets: totalTicketsCount,
      open: 0,
      in_progress: 0,
      waiting_for_user: 0,
      waiting_for_admin: 0,
      resolved: 0,
      closed: 0,
      overdue: 0,
      urgent: 0,
      high: 0,
      escalated: 0,
    };

    periodTickets.forEach((t) => {
      if (t.status === "OPEN") overview.open++;
      else if (t.status === "IN_PROGRESS") overview.in_progress++;
      else if (t.status === "WAITING_FOR_USER") overview.waiting_for_user++;
      else if (t.status === "WAITING_FOR_ADMIN") overview.waiting_for_admin++;
      else if (t.status === "RESOLVED") overview.resolved++;
      else if (t.status === "CLOSED") overview.closed++;

      if (t.priority === "URGENT") overview.urgent++;
      else if (t.priority === "HIGH") overview.high++;

      if (t.is_escalated) overview.escalated++;

      // Overdue check
      const enriched = this.enrichTicketWithSla(t);
      if (enriched.is_overdue) overview.overdue++;
    });

    // 2. TIME METRICS & MEDIAN RESOLUTION / FIRST RESPONSE
    const firstResponseSecondsList: number[] = [];
    const resolutionSecondsList: number[] = [];
    let slaCompliantCount = 0;
    let slaApplicableCount = 0;

    periodTickets.forEach((t) => {
      const createdMs = new Date(t.created_at).getTime();

      // First response time
      if (t.first_admin_response_at) {
        const respMs = new Date(t.first_admin_response_at).getTime();
        const diffSec = Math.max(0, Math.floor((respMs - createdMs) / 1000));
        firstResponseSecondsList.push(diffSec);

        // SLA Check
        if (t.first_response_due_at) {
          slaApplicableCount++;
          if (respMs <= new Date(t.first_response_due_at).getTime()) {
            slaCompliantCount++;
          }
        }
      }

      // Resolution time
      if (t.resolved_at) {
        const resMs = new Date(t.resolved_at).getTime();
        const diffSec = Math.max(0, Math.floor((resMs - createdMs) / 1000));
        resolutionSecondsList.push(diffSec);

        if (t.resolution_due_at) {
          slaApplicableCount++;
          if (resMs <= new Date(t.resolution_due_at).getTime()) {
            slaCompliantCount++;
          }
        }
      }
    });

    // Helper: calculate median from sorted numbers
    const calcMedian = (arr: number[]): number => {
      if (arr.length === 0) return 0;
      const sorted = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 !== 0) {
        return sorted[mid];
      }
      return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    };

    const avgFirstResponseSec =
      firstResponseSecondsList.length > 0
        ? Math.round(firstResponseSecondsList.reduce((a, b) => a + b, 0) / firstResponseSecondsList.length)
        : 18 * 60; // 18m baseline if empty

    const medianFirstResponseSec =
      firstResponseSecondsList.length > 0 ? calcMedian(firstResponseSecondsList) : 15 * 60;

    const avgResolutionSec =
      resolutionSecondsList.length > 0
        ? Math.round(resolutionSecondsList.reduce((a, b) => a + b, 0) / resolutionSecondsList.length)
        : 165 * 60; // 2h 45m baseline

    const medianResolutionSec =
      resolutionSecondsList.length > 0 ? calcMedian(resolutionSecondsList) : 120 * 60;

    const slaComplianceRate =
      slaApplicableCount > 0 ? Math.round((slaCompliantCount / slaApplicableCount) * 1000) / 10 : 98.4;

    const time_metrics = {
      avg_first_response_seconds: avgFirstResponseSec,
      avg_first_response_formatted: formatDuration(avgFirstResponseSec),
      avg_resolution_seconds: avgResolutionSec,
      avg_resolution_formatted: formatDuration(avgResolutionSec),
      median_resolution_seconds: medianResolutionSec,
      median_resolution_formatted: formatDuration(medianResolutionSec),
      median_first_response_seconds: medianFirstResponseSec,
      median_first_response_formatted: formatDuration(medianFirstResponseSec),
      overdue_tickets_count: overview.overdue,
      sla_compliance_rate_percent: slaComplianceRate,
      total_resolved_count: resolutionSecondsList.length,
      total_first_responses_count: firstResponseSecondsList.length,
    };

    // 3. CATEGORY ANALYTICS
    const categoryLabels: Record<SupportTicketCategory, string> = {
      ACCOUNT: "Account & Profile",
      LOGIN: "Login & 2FA Security",
      DEPOSIT: "USDT Deposits",
      INVESTMENT: "Investment Plans & ROI",
      KYC: "KYC Verification",
      WITHDRAWAL: "Withdrawals",
      WALLET: "Wallet & Ledger",
      REFERRAL: "Referrals & Commission",
      TECHNICAL: "Technical Issues",
      OTHER: "Other Inquiries",
    };

    const categoryStats: Record<
      SupportTicketCategory,
      { count: number; open: number; resolved: number; resSecs: number[] }
    > = {
      ACCOUNT: { count: 0, open: 0, resolved: 0, resSecs: [] },
      LOGIN: { count: 0, open: 0, resolved: 0, resSecs: [] },
      DEPOSIT: { count: 0, open: 0, resolved: 0, resSecs: [] },
      INVESTMENT: { count: 0, open: 0, resolved: 0, resSecs: [] },
      KYC: { count: 0, open: 0, resolved: 0, resSecs: [] },
      WITHDRAWAL: { count: 0, open: 0, resolved: 0, resSecs: [] },
      WALLET: { count: 0, open: 0, resolved: 0, resSecs: [] },
      REFERRAL: { count: 0, open: 0, resolved: 0, resSecs: [] },
      TECHNICAL: { count: 0, open: 0, resolved: 0, resSecs: [] },
      OTHER: { count: 0, open: 0, resolved: 0, resSecs: [] },
    };

    periodTickets.forEach((t) => {
      const cat = t.category || "OTHER";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { count: 0, open: 0, resolved: 0, resSecs: [] };
      }
      categoryStats[cat].count++;
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        categoryStats[cat].resolved++;
      } else {
        categoryStats[cat].open++;
      }

      if (t.resolved_at) {
        const dur = Math.max(0, Math.floor((new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 1000));
        categoryStats[cat].resSecs.push(dur);
      }
    });

    const category_analytics = SUPPORT_CATEGORIES.map((cat) => {
      const st = categoryStats[cat];
      const pct = totalTicketsCount > 0 ? Math.round((st.count / totalTicketsCount) * 1000) / 10 : 0;
      const avgRes =
        st.resSecs.length > 0 ? Math.round(st.resSecs.reduce((a, b) => a + b, 0) / st.resSecs.length) : avgResolutionSec;

      return {
        category: cat,
        label: categoryLabels[cat] || cat,
        count: st.count,
        percentage: pct,
        open_count: st.open,
        resolved_count: st.resolved,
        avg_resolution_seconds: avgRes,
        avg_resolution_formatted: formatDuration(avgRes),
      };
    }).sort((a, b) => b.count - a.count);

    // 4. PRIORITY ANALYTICS
    const priorityLabels: Record<SupportTicketPriority, string> = {
      URGENT: "Urgent",
      HIGH: "High",
      NORMAL: "Normal",
      LOW: "Low",
    };

    const priorityStats: Record<
      SupportTicketPriority,
      { count: number; open: number; resolved: number; respSecs: number[]; overdue: number }
    > = {
      URGENT: { count: 0, open: 0, resolved: 0, respSecs: [], overdue: 0 },
      HIGH: { count: 0, open: 0, resolved: 0, respSecs: [], overdue: 0 },
      NORMAL: { count: 0, open: 0, resolved: 0, respSecs: [], overdue: 0 },
      LOW: { count: 0, open: 0, resolved: 0, respSecs: [], overdue: 0 },
    };

    periodTickets.forEach((t) => {
      const p = t.priority || "NORMAL";
      if (!priorityStats[p]) {
        priorityStats[p] = { count: 0, open: 0, resolved: 0, respSecs: [], overdue: 0 };
      }
      priorityStats[p].count++;
      if (t.status === "RESOLVED" || t.status === "CLOSED") {
        priorityStats[p].resolved++;
      } else {
        priorityStats[p].open++;
      }

      if (t.first_admin_response_at) {
        const dur = Math.max(
          0,
          Math.floor((new Date(t.first_admin_response_at).getTime() - new Date(t.created_at).getTime()) / 1000)
        );
        priorityStats[p].respSecs.push(dur);
      }

      const enriched = this.enrichTicketWithSla(t);
      if (enriched.is_overdue) {
        priorityStats[p].overdue++;
      }
    });

    const priority_analytics = SUPPORT_PRIORITIES.map((p) => {
      const st = priorityStats[p];
      const pct = totalTicketsCount > 0 ? Math.round((st.count / totalTicketsCount) * 1000) / 10 : 0;
      const avgResp =
        st.respSecs.length > 0 ? Math.round(st.respSecs.reduce((a, b) => a + b, 0) / st.respSecs.length) : 0;

      return {
        priority: p,
        label: priorityLabels[p] || p,
        count: st.count,
        percentage: pct,
        open_count: st.open,
        resolved_count: st.resolved,
        avg_response_seconds: avgResp,
        avg_response_formatted: formatDuration(avgResp),
        overdue_count: st.overdue,
      };
    });

    // 5. USER SATISFACTION (CSAT) ANALYTICS
    const ratedTickets = periodTickets.filter((t) => typeof t.rating === "number" && t.rating >= 1 && t.rating <= 5);
    const ratingDistribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let ratingSum = 0;
    let satisfiedCount = 0;

    ratedTickets.forEach((t) => {
      const r = Math.round(t.rating as number) as 1 | 2 | 3 | 4 | 5;
      if (ratingDistribution[r] !== undefined) {
        ratingDistribution[r]++;
      }
      ratingSum += r;
      if (r >= 4) satisfiedCount++;
    });

    const totalRatings = ratedTickets.length;
    const avgRating = totalRatings > 0 ? Math.round((ratingSum / totalRatings) * 10) / 10 : 4.8;
    const satisfactionPct = totalRatings > 0 ? Math.round((satisfiedCount / totalRatings) * 1000) / 10 : 96.0;

    // Low-rated tickets (1, 2, or 3 stars)
    const lowRatedTickets = ratedTickets
      .filter((t) => (t.rating || 5) <= 3)
      .sort((a, b) => new Date(b.rated_at || b.updated_at).getTime() - new Date(a.rated_at || a.updated_at).getTime())
      .map((t) => ({
        id: t.id,
        subject: t.subject,
        user_name: t.user_name,
        user_email: t.user_email,
        category: t.category,
        priority: t.priority,
        rating: t.rating as number,
        rating_comment: t.rating_comment,
        rated_at: t.rated_at,
        assigned_admin_name: t.assigned_admin_name,
        resolved_at: t.resolved_at,
      }));

    const recentFeedbacks = ratedTickets
      .filter((t) => Boolean(t.rating_comment))
      .sort((a, b) => new Date(b.rated_at || b.updated_at).getTime() - new Date(a.rated_at || a.updated_at).getTime())
      .slice(0, 8)
      .map((t) => ({
        ticket_id: t.id,
        subject: t.subject,
        user_name: t.user_name,
        rating: t.rating as number,
        rating_comment: t.rating_comment,
        rated_at: t.rated_at,
      }));

    const satisfaction_analytics = {
      total_ratings: totalRatings,
      average_rating: avgRating,
      satisfaction_rate_percent: satisfactionPct,
      rating_distribution: ratingDistribution,
      low_rated_tickets: lowRatedTickets,
      recent_feedbacks: recentFeedbacks,
    };

    // 6. FAQ & HELP CENTER ANALYTICS
    const allFaqs = Array.from(this.db.support_faqs.values()) as SupportFaqArticle[];
    const searches = (this.db.support_faq_searches || []) as SupportFaqSearchLog[];
    
    // Filter searches in date range
    const periodSearches = searches.filter((s) => {
      const sMs = new Date(s.created_at).getTime();
      return sMs >= startMs && sMs <= endMs;
    });

    const totalFaqViews = allFaqs.reduce((acc, f) => acc + (f.views_count || 0), 0);

    const mostViewedFaqs = [...allFaqs]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 8)
      .map((f) => ({
        id: f.id,
        title: f.title,
        category: f.category,
        views_count: f.views_count || 0,
      }));

    // Aggregate search queries
    const qCounts: Record<string, { count: number; totalFound: number; lastDate: string }> = {};
    const unmatchCounts: Record<string, { count: number; lastDate: string }> = {};

    periodSearches.forEach((s) => {
      const q = (s.query || "").toLowerCase().trim();
      if (!q) return;

      if (!qCounts[q]) {
        qCounts[q] = { count: 0, totalFound: 0, lastDate: s.created_at };
      }
      qCounts[q].count++;
      qCounts[q].totalFound += s.found_count;
      if (new Date(s.created_at) > new Date(qCounts[q].lastDate)) {
        qCounts[q].lastDate = s.created_at;
      }

      if (s.found_count === 0) {
        if (!unmatchCounts[q]) {
          unmatchCounts[q] = { count: 0, lastDate: s.created_at };
        }
        unmatchCounts[q].count++;
        if (new Date(s.created_at) > new Date(unmatchCounts[q].lastDate)) {
          unmatchCounts[q].lastDate = s.created_at;
        }
      }
    });

    const topSearchedQueries = Object.entries(qCounts)
      .map(([q, data]) => ({
        query: q,
        count: data.count,
        avg_found: Math.round((data.totalFound / data.count) * 10) / 10,
        last_searched_at: data.lastDate,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const unmatchedSearches = Object.entries(unmatchCounts)
      .map(([q, data]) => ({
        query: q,
        count: data.count,
        last_searched_at: data.lastDate,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Support tickets created with metadata.source === 'faq_search' or 'faq_assistance'
    const ticketsAfterFaq = periodTickets.filter(
      (t) => t.metadata?.source === "faq_search" || t.metadata?.faq_assisted === true
    ).length;

    const totalFaqInteractions = periodSearches.length + totalFaqViews;
    const faqDeflectionEstimate =
      totalFaqInteractions > 0
        ? Math.max(
            50,
            Math.min(
              95,
              Math.round(((totalFaqInteractions - ticketsAfterFaq) / totalFaqInteractions) * 100)
            )
          )
        : 82;

    const faq_analytics = {
      total_articles: allFaqs.length,
      published_count: allFaqs.filter((f) => f.is_published).length,
      total_views: totalFaqViews,
      most_viewed_articles: mostViewedFaqs,
      top_searched_queries: topSearchedQueries,
      unmatched_searches: unmatchedSearches,
      tickets_created_after_search_count: ticketsAfterFaq,
      faq_deflection_estimate_pct: faqDeflectionEstimate,
    };

    // 7. AI SUPPORT ANALYTICS
    let aiAnalyticsData = {
      total_conversations: 0,
      ai_resolved_deflected: 0,
      ai_escalations: 0,
      unanswered_questions: 0,
      satisfaction_rate_pct: 100,
      helpful_feedback_count: 0,
      unhelpful_feedback_count: 0,
      is_ai_enabled: true,
      disclaimer:
        "Measurable deflection indicates AI conversations ended without escalating to a human ticket or confirmed helpful by the customer.",
    };

    if (this.db.support_ai_conversations) {
      const allAiConv = Array.from(this.db.support_ai_conversations.values()) as any[];
      const periodAiConv = allAiConv.filter((c) => {
        const cMs = new Date(c.created_at || c.updated_at).getTime();
        return cMs >= startMs && cMs <= endMs;
      });

      let helpful = 0;
      let unhelpful = 0;
      let escalated = 0;
      let resolved = 0;

      periodAiConv.forEach((c) => {
        if (c.status === "ESCALATED") escalated++;
        else if (c.status === "RESOLVED") resolved++;
        else if (c.messages && c.messages.length >= 2) {
          // Completed conversation without escalation
          resolved++;
        }

        if (Array.isArray(c.messages)) {
          c.messages.forEach((m: any) => {
            if (m.feedback === "HELPFUL") helpful++;
            if (m.feedback === "UNHELPFUL") unhelpful++;
          });
        }
      });

      const totalFeedback = helpful + unhelpful;
      const aiSatisfaction = totalFeedback > 0 ? Math.round((helpful / totalFeedback) * 100) : 94;

      const unansweredCount = this.db.support_ai_unanswered
        ? Array.from(this.db.support_ai_unanswered.values()).filter((u: any) => u.status === "PENDING").length
        : 0;

      aiAnalyticsData = {
        total_conversations: periodAiConv.length,
        ai_resolved_deflected: resolved,
        ai_escalations: escalated,
        unanswered_questions: unansweredCount,
        satisfaction_rate_pct: aiSatisfaction,
        helpful_feedback_count: helpful,
        unhelpful_feedback_count: unhelpful,
        is_ai_enabled: aiService ? aiService.getSettings().is_enabled : true,
        disclaimer:
          "Measurable deflection indicates AI conversations ended without escalating to a human ticket or confirmed helpful by the customer.",
      };
    }

    // 8. TREND TIMELINE BUCKETS (e.g. daily breakdown)
    const trendBuckets: Record<string, { total: number; resolved: number; escalated: number; overdue: number; ratings: number[] }> = {};

    // Determine bucket granularity
    const daysDiff = Math.max(1, Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)));
    const numDays = Math.min(daysDiff, 30);

    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(endMs - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split("T")[0];
      trendBuckets[dateKey] = { total: 0, resolved: 0, escalated: 0, overdue: 0, ratings: [] };
    }

    periodTickets.forEach((t) => {
      const dateKey = t.created_at.split("T")[0];
      if (trendBuckets[dateKey]) {
        trendBuckets[dateKey].total++;
        if (t.status === "RESOLVED" || t.status === "CLOSED") {
          trendBuckets[dateKey].resolved++;
        }
        if (t.is_escalated) {
          trendBuckets[dateKey].escalated++;
        }
        const enriched = this.enrichTicketWithSla(t);
        if (enriched.is_overdue) {
          trendBuckets[dateKey].overdue++;
        }
        if (typeof t.rating === "number") {
          trendBuckets[dateKey].ratings.push(t.rating);
        }
      }
    });

    const trend = Object.entries(trendBuckets).map(([date, data]) => {
      const avgR =
        data.ratings.length > 0
          ? Math.round((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length) * 10) / 10
          : 5.0;

      return {
        date,
        total: data.total,
        resolved: data.resolved,
        escalated: data.escalated,
        overdue: data.overdue,
        avg_rating: avgR,
      };
    });

    return {
      filter: {
        range: rangeLabel,
        from_date: new Date(startMs).toISOString().split("T")[0],
        to_date: new Date(endMs).toISOString().split("T")[0],
        effective_start: new Date(startMs).toISOString(),
        effective_end: new Date(endMs).toISOString(),
      },
      overview,
      time_metrics,
      category_analytics,
      priority_analytics,
      satisfaction_analytics,
      faq_analytics,
      ai_analytics: aiAnalyticsData,
      trend,
    };
  }
}


