import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import {
  type SupportFaqArticle,
  type SupportManager,
  FAQ_CATEGORY_DEFINITIONS,
} from "./supportService";

// ==================== TYPES & INTERFACES ====================

export interface SupportAiSettings {
  is_enabled: boolean;
  model_name: string; // default "gemini-3.7-flash"
  temperature: number; // default 0.2
  rate_limit_per_10min: number; // default 25
  custom_system_guidelines: string;
  escalation_threshold_unresolved: number;
  welcome_message: string;
  suggested_prompts: string[];
}

export interface SupportAiMessage {
  id: string;
  sender: "USER" | "AI" | "SYSTEM";
  text: string;
  created_at: string;
  matched_faq_ids?: string[];
  matched_faqs?: Array<{ id: string; title: string; category: string; category_label?: string }>;
  is_confident?: boolean;
  suggested_actions?: Array<{
    label: string;
    action: "CREATE_TICKET" | "NAVIGATE" | "SEARCH_FAQ" | "ASK_PROMPT";
    payload?: any;
  }>;
  feedback?: "HELPFUL" | "UNHELPFUL" | null;
}

export interface SupportAiConversation {
  id: string;
  user_id?: string | null;
  user_email?: string | null;
  user_name?: string | null;
  created_at: string;
  updated_at: string;
  status: "ACTIVE" | "RESOLVED" | "ESCALATED";
  escalated_ticket_id?: string | null;
  escalated_at?: string | null;
  escalation_reason?: string | null;
  messages: SupportAiMessage[];
  unresolved_questions: string[];
  client_ip?: string;
  metadata?: Record<string, any>;
}

export interface SupportAiUnansweredRecord {
  id: string;
  question: string;
  user_id?: string | null;
  user_email?: string | null;
  asked_count: number;
  last_asked_at: string;
  resolved_with_faq_id?: string | null;
  status: "PENDING" | "REVIEWED" | "RESOLVED";
}

export const DEFAULT_AI_SETTINGS: SupportAiSettings = {
  is_enabled: true,
  model_name: "gemini-3.7-flash",
  temperature: 0.2,
  rate_limit_per_10min: 30,
  custom_system_guidelines: "",
  escalation_threshold_unresolved: 2,
  welcome_message:
    "Hello! I am your EasyX Support Assistant. I can help answer questions about deposits, investment plans, KYC verification, withdrawals, and account navigation. How can I help you today?",
  suggested_prompts: [
    "How do I deposit USDT (TRC20 / BEP20)?",
    "What are the requirements for KYC verification?",
    "How does the daily investment ROI work?",
    "Where can I find my active investment plans?",
    "How do I create or check a human support ticket?",
  ],
};

// ==================== PRIVACY & SANITIZATION UTILITIES ====================

/**
 * Strips sensitive data like passwords, JWT tokens, seed phrases, private keys,
 * credit cards, or internal authentication payloads from text before sending to AI provider.
 */
export function sanitizeAiInput(input: string): string {
  if (!input || typeof input !== "string") return "";

  let cleaned = input;

  // 1. Redact JWT tokens (Bearer eyJ... or eyJ...)
  cleaned = cleaned.replace(/(?:Bearer\s+)?eyJ[a-zA-Z0-9_\-]+\.eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/gi, "[REDACTED_JWT_TOKEN]");

  // 2. Redact potential private keys (0x + 64 hex chars or 64 hex chars)
  cleaned = cleaned.replace(/\b(0x)?[a-fA-F0-9]{64}\b/g, "[REDACTED_PRIVATE_KEY]");

  // 3. Redact potential credit card numbers (13-19 digits with optional spaces/hyphens)
  cleaned = cleaned.replace(/\b(?:\d[ -]*?){13,19}\b/g, (match) => {
    const digitsOnly = match.replace(/\D/g, "");
    if (digitsOnly.length >= 13 && digitsOnly.length <= 19) {
      return "[REDACTED_CARD_NUMBER]";
    }
    return match;
  });

  // 4. Redact explicit password assignments (e.g. password: xyz, pass = 123)
  cleaned = cleaned.replace(/(?:password|passwd|pwd|secret)\s*[:=]\s*\S+/gi, "password: [REDACTED_CREDENTIAL]");

  // 5. Redact mnemonic 12/24 word seeds if formatted as lists
  cleaned = cleaned.replace(/(?:seed\s*phrase|mnemonic|secret\s*phrase)\s*[:=]\s*([a-zA-Z]+\s+){11,23}[a-zA-Z]+/gi, "[REDACTED_SEED_PHRASE]");

  // 6. Limit max length to avoid prompt injection buffer overflow
  if (cleaned.length > 2000) {
    cleaned = cleaned.substring(0, 2000);
  }

  return cleaned.trim();
}

// ==================== RATE LIMITER ====================

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  isRateLimited(key: string, limit: number, windowMs = 10 * 60 * 1000): boolean {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);

    if (validTimestamps.length >= limit) {
      this.requests.set(key, validTimestamps);
      return true;
    }

    validTimestamps.push(now);
    this.requests.set(key, validTimestamps);
    return false;
  }

  getRemaining(key: string, limit: number, windowMs = 10 * 60 * 1000): number {
    const now = Date.now();
    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter((t) => now - t < windowMs);
    return Math.max(0, limit - validTimestamps.length);
  }
}

// ==================== AI SUPPORT SERVICE ====================

export class SupportAiService {
  private db: any;
  private supportManager: SupportManager;
  private rateLimiter: RateLimiter = new RateLimiter();
  private genAiClient: GoogleGenAI | null = null;

  constructor(db: any, supportManager: SupportManager) {
    this.db = db;
    this.supportManager = supportManager;

    // Ensure database stores exist
    if (!this.db.support_ai_settings) {
      this.db.support_ai_settings = { ...DEFAULT_AI_SETTINGS };
    }
    if (!this.db.support_ai_conversations) {
      this.db.support_ai_conversations = new Map<string, SupportAiConversation>();
    }
    if (!this.db.support_ai_unanswered) {
      this.db.support_ai_unanswered = new Map<string, SupportAiUnansweredRecord>();
    }

    this.initGeminiClient();
  }

  private initGeminiClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        this.genAiClient = new GoogleGenAI({
          apiKey: apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
      } catch (err) {
        console.error("[SupportAI] Failed to initialize GoogleGenAI client:", err);
        this.genAiClient = null;
      }
    }
  }

  // -------------------------------------------------------------
  // SETTINGS & STATUS
  // -------------------------------------------------------------

  getSettings(): SupportAiSettings {
    return {
      ...DEFAULT_AI_SETTINGS,
      ...(this.db.support_ai_settings || {}),
    };
  }

  updateSettings(patch: Partial<SupportAiSettings>, authAdmin?: any): SupportAiSettings {
    const current = this.getSettings();
    const updated: SupportAiSettings = {
      ...current,
      ...patch,
      is_enabled: patch.is_enabled !== undefined ? Boolean(patch.is_enabled) : current.is_enabled,
      temperature: patch.temperature !== undefined ? Math.min(1.0, Math.max(0.0, Number(patch.temperature))) : current.temperature,
      rate_limit_per_10min: patch.rate_limit_per_10min ? Number(patch.rate_limit_per_10min) : current.rate_limit_per_10min,
    };

    this.db.support_ai_settings = updated;

    // Recheck Gemini client if API key or settings changed
    this.initGeminiClient();

    return updated;
  }

  // -------------------------------------------------------------
  // CONVERSATION MANAGEMENT
  // -------------------------------------------------------------

  getConversation(id: string): SupportAiConversation | null {
    return this.db.support_ai_conversations.get(id) || null;
  }

  getOrCreateConversation(
    conversationId: string | null | undefined,
    user?: { id?: string; email?: string; name?: string } | null,
    clientIp?: string
  ): SupportAiConversation {
    if (conversationId) {
      const existing = this.db.support_ai_conversations.get(conversationId);
      if (existing) {
        if (user?.id && !existing.user_id) {
          existing.user_id = user.id;
          existing.user_email = user.email || existing.user_email;
          existing.user_name = user.name || existing.user_name;
        }
        return existing;
      }
    }

    const newId = `ai_conv_${crypto.randomUUID()}`;
    const initialWelcome: SupportAiMessage = {
      id: `msg_${crypto.randomUUID()}`,
      sender: "AI",
      text: this.getSettings().welcome_message,
      created_at: new Date().toISOString(),
      is_confident: true,
      suggested_actions: [
        { label: "Deposit Guide", action: "ASK_PROMPT", payload: "How do I deposit USDT?" },
        { label: "KYC Verification", action: "ASK_PROMPT", payload: "What are the KYC requirements?" },
        { label: "Investment ROI", action: "ASK_PROMPT", payload: "How does the daily investment ROI work?" },
        { label: "Talk to Human Support", action: "CREATE_TICKET" },
      ],
    };

    const conversation: SupportAiConversation = {
      id: newId,
      user_id: user?.id || null,
      user_email: user?.email || null,
      user_name: user?.name || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "ACTIVE",
      escalated_ticket_id: null,
      escalated_at: null,
      escalation_reason: null,
      messages: [initialWelcome],
      unresolved_questions: [],
      client_ip: clientIp || "unknown",
    };

    this.db.support_ai_conversations.set(newId, conversation);
    return conversation;
  }

  // -------------------------------------------------------------
  // CHAT PROCESSING & GUARDRAILS
  // -------------------------------------------------------------

  async processUserMessage(params: {
    conversation_id?: string | null;
    message: string;
    user?: { id?: string; email?: string; name?: string } | null;
    client_ip?: string;
  }): Promise<{
    conversation: SupportAiConversation;
    response_message: SupportAiMessage;
    rate_limited?: boolean;
    ai_disabled?: boolean;
  }> {
    const settings = this.getSettings();

    // 1. Check if AI assistant is disabled by admin
    if (!settings.is_enabled) {
      const conv = this.getOrCreateConversation(params.conversation_id, params.user, params.client_ip);
      const disabledMsg: SupportAiMessage = {
        id: `msg_${crypto.randomUUID()}`,
        sender: "SYSTEM",
        text: "The AI Support Assistant is currently offline for scheduled maintenance. Please create a support ticket to speak directly with our team.",
        created_at: new Date().toISOString(),
        is_confident: false,
        suggested_actions: [{ label: "Create Support Ticket", action: "CREATE_TICKET" }],
      };
      conv.messages.push(disabledMsg);
      conv.updated_at = new Date().toISOString();
      return { conversation: conv, response_message: disabledMsg, ai_disabled: true };
    }

    // 2. Check rate limit
    const rateLimitKey = params.user?.id ? `user:${params.user.id}` : `ip:${params.client_ip || "unknown"}`;
    if (this.rateLimiter.isRateLimited(rateLimitKey, settings.rate_limit_per_10min)) {
      const conv = this.getOrCreateConversation(params.conversation_id, params.user, params.client_ip);
      const limitMsg: SupportAiMessage = {
        id: `msg_${crypto.randomUUID()}`,
        sender: "SYSTEM",
        text: "You have reached the maximum number of AI queries allowed for this 10-minute window. You can continue speaking with our team by opening a support ticket.",
        created_at: new Date().toISOString(),
        is_confident: false,
        suggested_actions: [{ label: "Talk to Human Support", action: "CREATE_TICKET" }],
      };
      conv.messages.push(limitMsg);
      conv.updated_at = new Date().toISOString();
      return { conversation: conv, response_message: limitMsg, rate_limited: true };
    }

    const conv = this.getOrCreateConversation(params.conversation_id, params.user, params.client_ip);

    // 3. Clean & Sanitize user query
    const rawUserQuery = (params.message || "").trim();
    const sanitizedQuery = sanitizeAiInput(rawUserQuery);

    if (!sanitizedQuery) {
      const blankMsg: SupportAiMessage = {
        id: `msg_${crypto.randomUUID()}`,
        sender: "AI",
        text: "Please enter a question or topic so I can assist you.",
        created_at: new Date().toISOString(),
        is_confident: true,
      };
      conv.messages.push(blankMsg);
      return { conversation: conv, response_message: blankMsg };
    }

    // Record user message
    const userMsg: SupportAiMessage = {
      id: `msg_${crypto.randomUUID()}`,
      sender: "USER",
      text: sanitizedQuery,
      created_at: new Date().toISOString(),
    };
    conv.messages.push(userMsg);
    conv.updated_at = new Date().toISOString();

    // 4. Retrieve published FAQ articles from Knowledge Base
    const publishedFaqs = this.supportManager.getFaqs({ search: "", limit: 100 }).faqs;

    // Find relevant FAQs via heuristic keyword scoring
    const matchedFaqs = this.findMatchingFaqs(sanitizedQuery, publishedFaqs);

    // 5. Generate Response using Gemini API (or fallback matcher if API unavailable)
    let aiResponseText = "";
    let isConfident = true;
    let matchedFaqIds: string[] = matchedFaqs.map((f) => f.id);

    try {
      if (this.genAiClient && process.env.GEMINI_API_KEY) {
        const result = await this.generateGeminiResponse({
          userQuery: sanitizedQuery,
          conversationHistory: conv.messages.slice(-8), // last 8 turns
          relevantFaqs: matchedFaqs.slice(0, 5),
          allFaqsSummary: publishedFaqs.map((f) => `- [${f.category}] ${f.title}`).join("\n"),
          customGuidelines: settings.custom_system_guidelines,
          temperature: settings.temperature,
          modelName: settings.model_name || "gemini-3.7-flash",
        });

        aiResponseText = result.text;
        isConfident = result.isConfident;
        if (result.matchedFaqIds && result.matchedFaqIds.length > 0) {
          matchedFaqIds = result.matchedFaqIds;
        }
      } else {
        // Fallback to local heuristic rule engine
        const fallbackResult = this.generateFallbackResponse(sanitizedQuery, matchedFaqs);
        aiResponseText = fallbackResult.text;
        isConfident = fallbackResult.isConfident;
      }
    } catch (err: any) {
      console.warn("[SupportAI] Gemini generation failed, executing fallback:", err?.message || err);
      const fallbackResult = this.generateFallbackResponse(sanitizedQuery, matchedFaqs);
      aiResponseText = fallbackResult.text;
      isConfident = fallbackResult.isConfident;
    }

    // 6. Enforce Critical Guardrail: Low Confidence Mandatory Response
    if (!isConfident || aiResponseText.includes("I don't have enough information to answer that accurately")) {
      isConfident = false;
      if (!aiResponseText.includes("I don't have enough information to answer that accurately")) {
        aiResponseText =
          "I don't have enough information to answer that accurately. I can connect you with EasyX Support.";
      }

      // Record unanswered/low confidence question in Knowledge Gap Tracker
      this.recordUnansweredQuestion(sanitizedQuery, params.user);
      conv.unresolved_questions.push(sanitizedQuery);
    }

    // 7. Assemble Suggested Actions
    const suggestedActions: Array<{
      label: string;
      action: "CREATE_TICKET" | "NAVIGATE" | "SEARCH_FAQ" | "ASK_PROMPT";
      payload?: any;
    }> = [];

    // Always offer escalation if confidence is low or query is account-specific / financial
    if (!isConfident || this.isAccountSpecificOrDispute(sanitizedQuery)) {
      suggestedActions.push({
        label: "Create Support Ticket",
        action: "CREATE_TICKET",
        payload: {
          category: this.detectCategoryFromQuery(sanitizedQuery),
          subject: sanitizedQuery.length > 60 ? `${sanitizedQuery.substring(0, 57)}...` : sanitizedQuery,
          initial_message: `AI Chat Transcript Summary:\nUser Query: "${sanitizedQuery}"\nAI Response: "${aiResponseText.substring(0, 300)}..."`,
        },
      });
    }

    // If matched specific FAQs, offer link to view full FAQ or navigation shortcuts
    if (matchedFaqs.length > 0) {
      const topFaq = matchedFaqs[0];
      suggestedActions.push({
        label: `View FAQ: ${topFaq.title.substring(0, 32)}...`,
        action: "SEARCH_FAQ",
        payload: { faq_id: topFaq.id, category: topFaq.category },
      });
    }

    // Always offer "Talk to Support" as standard option
    if (!suggestedActions.some((a) => a.action === "CREATE_TICKET")) {
      suggestedActions.push({
        label: "Talk to Human Support",
        action: "CREATE_TICKET",
      });
    }

    // 8. Hydrate matched FAQs metadata for rich UI cards
    const matchedFaqCards = matchedFaqs.slice(0, 3).map((f) => {
      const catDef = FAQ_CATEGORY_DEFINITIONS.find((c) => c.id === f.category);
      return {
        id: f.id,
        title: f.title,
        category: f.category,
        category_label: catDef?.label || f.category,
      };
    });

    const aiMsg: SupportAiMessage = {
      id: `msg_${crypto.randomUUID()}`,
      sender: "AI",
      text: aiResponseText,
      created_at: new Date().toISOString(),
      is_confident: isConfident,
      matched_faq_ids: matchedFaqIds,
      matched_faqs: matchedFaqCards,
      suggested_actions: suggestedActions,
    };

    conv.messages.push(aiMsg);
    conv.updated_at = new Date().toISOString();

    return {
      conversation: conv,
      response_message: aiMsg,
    };
  }

  // -------------------------------------------------------------
  // GEMINI PROMPT EXECUTION
  // -------------------------------------------------------------

  private async generateGeminiResponse(params: {
    userQuery: string;
    conversationHistory: SupportAiMessage[];
    relevantFaqs: SupportFaqArticle[];
    allFaqsSummary: string;
    customGuidelines: string;
    temperature: number;
    modelName: string;
  }): Promise<{ text: string; isConfident: boolean; matchedFaqIds?: string[] }> {
    if (!this.genAiClient) {
      throw new Error("Gemini client not initialized.");
    }

    // Build context knowledge from approved FAQs
    const faqContext = params.relevantFaqs
      .map(
        (f, idx) =>
          `[FAQ Article #${idx + 1} | ID: ${f.id} | Category: ${f.category}]\nTitle: ${f.title}\nContent:\n${f.answer}\nKeywords: ${f.keywords.join(", ")}`
      )
      .join("\n\n");

    const systemInstruction = `You are the EasyX AI Support Assistant.
Your SOLE purpose is to assist users by providing clear, accurate, and helpful answers to general support questions using the approved EasyX Help Center Knowledge Base provided below.

CRITICAL OPERATIONAL & FINANCIAL RULES (ABSOLUTE PROTECTIONS):
1. You are an information assistant ONLY. You have ZERO authority to perform actions, execute transactions, alter databases, or modify records.
2. YOU MUST NEVER:
   - Approve, reject, or modify KYC identity verification decisions.
   - Approve, reject, expedite, or modify deposits or withdrawals.
   - Change, simulate, or adjust wallet balances or transaction statuses.
   - Modify, recalculate, or alter investment plans, active investments, or maturities.
   - Grant or modify referral commissions.
   - Reset authentication passwords or bypass 2FA security.
   - Modify existing support tickets or notification settings.
3. FINANCIAL QUESTIONS (Returns, Balances, Maturity, Disputes):
   - You may explain fixed rules and tiered plan specifications ALREADY PROVIDED in the approved FAQ (e.g. Bronze, Silver, Gold, Platinum, Diamond percentages and lockup durations).
   - NEVER make personalized financial promises, speculate on cryptocurrency prices, or recalculate account figures.
   - For account-specific questions (such as "Why is my deposit #123 delayed?", "Why was my withdrawal rejected?", "How much balance do I have left?"), explain the general platform process and direct the user to Human Support.
4. UNKNOWN / LOW CONFIDENCE QUESTIONS:
   - If the user's question CANNOT be confidently and accurately answered from the provided EasyX Knowledge Base, or if you are unsure:
     You MUST state EXACTLY:
     "I don't have enough information to answer that accurately. I can connect you with EasyX Support."
     Do not invent policies, timelines, addresses, or features that are not in the knowledge base.
5. TONE & FORMAT:
   - Professional, concise, welcoming, and easy to read.
   - Use clear bullet points and bold highlights for step-by-step instructions.
   - Keep answers focused (under 180 words) and directly actionable.
   - When referencing platform sections, use clean names (e.g., "Deposits page", "KYC Verification tab", "Investments dashboard", "Support center").
6. PRIVACY & SECURITY:
   - Never ask for or record passwords, recovery seed phrases, private keys, or full credit card details.
   - Remind users that EasyX staff will never ask for their private keys or passwords.

${params.customGuidelines ? `ADDITIONAL ADMIN GUIDELINES:\n${params.customGuidelines}\n` : ""}

APPROVED EASYX KNOWLEDGE BASE:
${faqContext || "No specific FAQ articles matched."}

ALL PUBLISHED FAQ TOPICS SUMMARY:
${params.allFaqsSummary}
`;

    // Format conversation history
    const historyText = params.conversationHistory
      .slice(0, -1) // exclude current turn
      .map((m) => `${m.sender === "USER" ? "User" : "Assistant"}: ${m.text}`)
      .join("\n");

    const prompt = `${historyText ? `RECENT CONVERSATION HISTORY:\n${historyText}\n\n` : ""}CURRENT USER QUESTION:
"${params.userQuery}"

Provide your helpful response based strictly on the approved EasyX knowledge base:`;

    const callPromise = this.genAiClient.models.generateContent({
      model: params.modelName || "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: params.temperature || 0.2,
      },
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini generation timed out after 5000ms")), 5000)
    );

    const response: any = await Promise.race([callPromise, timeoutPromise]);

    const responseText = (response.text || "").trim();

    // Check if the response indicates low confidence or unanswered state
    const isUnanswered =
      responseText.includes("I don't have enough information to answer that accurately") ||
      responseText.includes("cannot confidently answer") ||
      responseText.length < 10;

    return {
      text: responseText,
      isConfident: !isUnanswered,
      matchedFaqIds: params.relevantFaqs.map((f) => f.id),
    };
  }

  // -------------------------------------------------------------
  // LOCAL HEURISTIC & RULE MATCHING FALLBACK
  // -------------------------------------------------------------

  private generateFallbackResponse(
    userQuery: string,
    matchedFaqs: SupportFaqArticle[]
  ): { text: string; isConfident: boolean } {
    const qLower = userQuery.toLowerCase().trim();

    // 1. Account / Deposit / KYC / Investment specific keyword match
    if (matchedFaqs.length > 0) {
      const topFaq = matchedFaqs[0];

      let reply = `Based on the EasyX Help Center **${topFaq.category_label || topFaq.category}** guide:\n\n`;
      reply += `${topFaq.answer}\n\n`;

      if (matchedFaqs.length > 1) {
        reply += `**Related Topics:**\n`;
        matchedFaqs.slice(1, 3).forEach((f) => {
          reply += `• ${f.title}\n`;
        });
      }

      return { text: reply, isConfident: true };
    }

    // 2. Direct greetings
    if (qLower === "hello" || qLower === "hi" || qLower === "hey" || qLower === "help") {
      return {
        text: "Hello! I am your EasyX AI Support Assistant. I can help answer questions regarding USDT deposits, KYC verification, investment plan tiers, withdrawals, and platform navigation. What can I help you with today?",
        isConfident: true,
      };
    }

    // 3. Navigation shortcuts
    if (qLower.includes("how to contact support") || qLower.includes("human support") || qLower.includes("speak to agent")) {
      return {
        text: "You can contact our 24/7 human support team anytime by opening a ticket in the Support Center. Click 'Create Support Ticket' below to get started.",
        isConfident: true,
      };
    }

    // 4. Default: Cannot answer with confidence
    return {
      text: "I don't have enough information to answer that accurately. I can connect you with EasyX Support.",
      isConfident: false,
    };
  }

  // -------------------------------------------------------------
  // MATCHING & SCORING UTILITIES
  // -------------------------------------------------------------

  private findMatchingFaqs(query: string, faqs: SupportFaqArticle[]): SupportFaqArticle[] {
    const q = query.toLowerCase().trim();
    if (!q) return [];

    const tokens = q
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const scored = faqs.map((faq) => {
      let score = 0;
      const titleLower = faq.title.toLowerCase();
      const answerLower = faq.answer.toLowerCase();
      const catLower = faq.category.toLowerCase();
      const keywords = (faq.keywords || []).map((k) => k.toLowerCase());

      // Exact substring match in title
      if (titleLower.includes(q)) score += 30;

      // Token matches
      tokens.forEach((t) => {
        if (titleLower.includes(t)) score += 8;
        if (keywords.includes(t)) score += 10;
        if (keywords.some((k) => k.includes(t))) score += 5;
        if (catLower.includes(t)) score += 4;
        if (answerLower.includes(t)) score += 2;
      });

      return { faq, score };
    });

    return scored
      .filter((s) => s.score >= 6)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.faq);
  }

  private isAccountSpecificOrDispute(query: string): boolean {
    const q = query.toLowerCase();
    const accountTriggers = [
      "my account",
      "my deposit",
      "my withdrawal",
      "my balance",
      "my kyc",
      "why was i rejected",
      "delayed",
      "pending for hours",
      "wrong address",
      "lost funds",
      "dispute",
      "refund",
      "hacked",
      "stolen",
      "locked out",
    ];
    return accountTriggers.some((t) => q.includes(t));
  }

  private detectCategoryFromQuery(query: string): any {
    const q = query.toLowerCase();
    if (q.includes("deposit") || q.includes("trc20") || q.includes("bep20") || q.includes("proof") || q.includes("usdt")) {
      return "DEPOSIT";
    }
    if (q.includes("withdraw") || q.includes("payout")) {
      return "WITHDRAWAL";
    }
    if (q.includes("kyc") || q.includes("verify") || q.includes("passport") || q.includes("id card") || q.includes("selfie")) {
      return "KYC";
    }
    if (q.includes("invest") || q.includes("plan") || q.includes("tier") || q.includes("roi") || q.includes("daily")) {
      return "INVESTMENT";
    }
    if (q.includes("wallet") || q.includes("balance") || q.includes("ledger")) {
      return "WALLET";
    }
    if (q.includes("referral") || q.includes("affiliate") || q.includes("commission") || q.includes("invite")) {
      return "REFERRAL";
    }
    if (q.includes("password") || q.includes("login") || q.includes("2fa") || q.includes("auth")) {
      return "LOGIN";
    }
    if (q.includes("error") || q.includes("bug") || q.includes("crash") || q.includes("loading")) {
      return "TECHNICAL";
    }
    return "OTHER";
  }

  // -------------------------------------------------------------
  // ESCALATION TO HUMAN SUPPORT TICKET
  // -------------------------------------------------------------

  async escalateConversation(params: {
    conversation_id: string;
    user: any;
    reason?: string;
    category?: string;
    subject?: string;
    priority?: string;
    custom_note?: string;
  }): Promise<{
    conversation: SupportAiConversation;
    ticket: any;
    message: string;
  }> {
    const conv = this.getConversation(params.conversation_id);
    if (!conv) {
      throw new Error("AI Conversation session not found.");
    }

    // Build chat transcript context
    const transcript = conv.messages
      .filter((m) => m.sender !== "SYSTEM")
      .map((m) => `[${m.sender}] ${m.text}`)
      .join("\n\n");

    const category = params.category || this.detectCategoryFromQuery(conv.unresolved_questions?.[0] || conv.messages[conv.messages.length - 1]?.text || "");
    const subject =
      params.subject ||
      (conv.unresolved_questions?.[0]
        ? `Escalated from AI Assistant: ${conv.unresolved_questions?.[0]?.substring(0, 50) || "General"}`
        : `Support Request: Question regarding ${category}`);

    const initialMessage = `${params.custom_note ? `${params.custom_note}\n\n---\n` : ""}**AI Assistant Escalated Transcript:**\n\`\`\`\n${transcript.substring(0, 3000)}\n\`\`\``;

    // Create real Support Ticket via SupportManager
    const result = this.supportManager.createTicket({
      userId: params.user?.id || "anonymous",
      userName: params.user?.name || params.user?.email || "User",
      userEmail: params.user?.email || "",
      subject: subject,
      category: category,
      priority: (params.priority as any) || "HIGH",
      message: initialMessage,
      attachments: [],
    });
    const ticket = result.ticket;

    // Update conversation status
    conv.status = "ESCALATED";
    conv.escalated_ticket_id = ticket.id;
    conv.escalated_at = new Date().toISOString();
    conv.escalation_reason = params.reason || "User requested human agent support";
    conv.updated_at = new Date().toISOString();

    const systemEscalateMsg: SupportAiMessage = {
      id: `msg_${crypto.randomUUID()}`,
      sender: "SYSTEM",
      text: `Your conversation has been connected to EasyX Support. A human agent has been assigned to ticket #${ticket.id.substring(0, 8)}.`,
      created_at: new Date().toISOString(),
      is_confident: true,
      suggested_actions: [
        {
          label: "View Support Ticket",
          action: "NAVIGATE",
          payload: { ticket_id: ticket.id },
        },
      ],
    };
    conv.messages.push(systemEscalateMsg);

    return {
      conversation: conv,
      ticket: ticket,
      message: "Conversation successfully escalated to support ticket.",
    };
  }

  // -------------------------------------------------------------
  // FEEDBACK & UNANSWERED TRACKING
  // -------------------------------------------------------------

  recordMessageFeedback(conversationId: string, messageId: string, feedback: "HELPFUL" | "UNHELPFUL"): boolean {
    const conv = this.getConversation(conversationId);
    if (!conv) return false;

    const msg = conv.messages.find((m) => m.id === messageId);
    if (!msg) return false;

    msg.feedback = feedback;
    conv.updated_at = new Date().toISOString();
    return true;
  }

  private recordUnansweredQuestion(question: string, user?: { id?: string; email?: string } | null) {
    const cleanQ = question.trim().toLowerCase();
    if (!cleanQ || cleanQ.length < 5) return;

    // Find existing or create new record
    let record: SupportAiUnansweredRecord | undefined;
    for (const item of this.db.support_ai_unanswered.values()) {
      if (item.question.toLowerCase() === cleanQ) {
        record = item;
        break;
      }
    }

    if (record) {
      record.asked_count += 1;
      record.last_asked_at = new Date().toISOString();
    } else {
      const newId = `unans_${crypto.randomUUID()}`;
      this.db.support_ai_unanswered.set(newId, {
        id: newId,
        question: question.trim(),
        user_id: user?.id || null,
        user_email: user?.email || null,
        asked_count: 1,
        last_asked_at: new Date().toISOString(),
        status: "PENDING",
      });
    }
  }

  getUnansweredQuestions(params: { status?: string; limit?: number } = {}) {
    const all = Array.from(this.db.support_ai_unanswered.values()) as SupportAiUnansweredRecord[];
    let filtered = all;

    if (params.status && params.status !== "ALL") {
      filtered = filtered.filter((u) => u.status === params.status);
    }

    filtered.sort((a, b) => b.asked_count - a.asked_count || new Date(b.last_asked_at).getTime() - new Date(a.last_asked_at).getTime());

    return filtered.slice(0, params.limit || 50);
  }

  updateUnansweredStatus(id: string, status: "PENDING" | "REVIEWED" | "RESOLVED", resolvedFaqId?: string) {
    const record = this.db.support_ai_unanswered.get(id);
    if (!record) {
      throw new Error("Unanswered question record not found.");
    }
    record.status = status;
    if (resolvedFaqId) {
      record.resolved_with_faq_id = resolvedFaqId;
    }
    return record;
  }

  // -------------------------------------------------------------
  // ADMIN CONVERSATION LOGS & ANALYTICS
  // -------------------------------------------------------------

  getAdminConversations(params: {
    status?: string; // "ALL" | "ESCALATED" | "ACTIVE" | "RESOLVED"
    search?: string;
    limit?: number;
  }) {
    const all = Array.from(this.db.support_ai_conversations.values()) as SupportAiConversation[];
    let filtered = all;

    if (params.status && params.status !== "ALL") {
      filtered = filtered.filter((c) => c.status === params.status);
    }

    if (params.search) {
      const q = params.search.toLowerCase().trim();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.user_email?.toLowerCase().includes(q) ||
          c.user_name?.toLowerCase().includes(q) ||
          c.messages.some((m) => m.text.toLowerCase().includes(q))
      );
    }

    filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return filtered.slice(0, params.limit || 50);
  }

  getAdminAiAnalytics() {
    const allConversations = Array.from(this.db.support_ai_conversations.values()) as SupportAiConversation[];
    const allUnanswered = Array.from(this.db.support_ai_unanswered.values()) as SupportAiUnansweredRecord[];

    let totalQueries = 0;
    let helpfulCount = 0;
    let unhelpfulCount = 0;
    let escalatedCount = 0;
    let resolvedCount = 0;

    allConversations.forEach((c) => {
      const userMsgs = c.messages.filter((m) => m.sender === "USER");
      totalQueries += userMsgs.length;

      if (c.status === "ESCALATED") escalatedCount++;
      if (c.status === "RESOLVED") resolvedCount++;

      c.messages.forEach((m) => {
        if (m.feedback === "HELPFUL") helpfulCount++;
        if (m.feedback === "UNHELPFUL") unhelpfulCount++;
      });
    });

    const totalFeedback = helpfulCount + unhelpfulCount;
    const satisfactionRate = totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 100;
    const escalationRate =
      allConversations.length > 0 ? Math.round((escalatedCount / allConversations.length) * 100) : 0;

    return {
      total_conversations: allConversations.length,
      total_queries: totalQueries,
      escalated_conversations: escalatedCount,
      resolved_conversations: resolvedCount,
      escalation_rate_pct: escalationRate,
      satisfaction_rate_pct: satisfactionRate,
      helpful_feedback_count: helpfulCount,
      unhelpful_feedback_count: unhelpfulCount,
      unanswered_gaps_count: allUnanswered.filter((u) => u.status === "PENDING").length,
      is_ai_enabled: this.getSettings().is_enabled,
      model_name: this.getSettings().model_name,
    };
  }
}
