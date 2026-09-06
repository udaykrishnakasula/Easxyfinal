import React, { useState, useEffect, useRef } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Bot,
  Send,
  Sparkles,
  LifeBuoy,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  User,
  Zap,
  Info,
  ExternalLink,
  MessageSquare,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import {
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
  EasyXModal,
} from "@/design/EasyX";
import {
  useSupportAiSettings,
  useSupportAiConversation,
  useSupportAiSendMessage,
  useSupportAiEscalate,
  useSupportAiFeedback,
  useSupportFaqs,
} from "@/user/api";

dayjs.extend(relativeTime);

export default function SupportAiAssistant({
  onOpenCreateTicket,
  onViewFaq,
  className = "",
}) {
  const [inputMessage, setInputMessage] = useState("");
  const [conversationId, setConversationId] = useState(() => {
    return localStorage.getItem("easyx_support_ai_conv_id") || null;
  });
  const [activeFaqModal, setActiveFaqModal] = useState(null);
  const [escalationModalOpen, setEscalationModalOpen] = useState(false);
  const [escalationReason, setEscalationReason] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Queries & Mutations
  const { data: settingsData, isLoading: settingsLoading } = useSupportAiSettings();
  const settings = settingsData?.settings || {
    is_enabled: true,
    welcome_message: "Hello! I am your EasyX Support Assistant. How can I help you today?",
    suggested_prompts: [
      "How do I deposit USDT (TRC20 / BEP20)?",
      "What are the requirements for KYC verification?",
      "How does the daily investment ROI work?",
      "Where can I find my active investment plans?",
      "How do I create or check a human support ticket?",
    ],
    rate_limit_per_10min: 30,
  };

  const { data: convData, isLoading: convLoading, refetch: refetchConv } = useSupportAiConversation(conversationId);
  const conversation = convData?.conversation;

  const sendMessageMutation = useSupportAiSendMessage();
  const escalateMutation = useSupportAiEscalate();
  const feedbackMutation = useSupportAiFeedback();

  // Scroll to bottom of message thread
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages, sendMessageMutation.isPending]);

  // Handle sending message
  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || sendMessageMutation.isPending) return;

    setInputMessage("");

    try {
      const res = await sendMessageMutation.mutateAsync({
        conversation_id: conversationId,
        message: text,
      });

      if (res?.conversation?.id) {
        setConversationId(res.conversation.id);
        localStorage.setItem("easyx_support_ai_conv_id", res.conversation.id);
      }

      if (res?.rate_limited) {
        toast.error("Rate limit reached for AI queries. Please open a support ticket for immediate help.");
      } else if (res?.ai_disabled) {
        toast.info("AI Support is currently offline. Please connect with our human support team.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to send message to AI Assistant.");
    }
  };

  // Handle user starting new session
  const handleResetConversation = () => {
    localStorage.removeItem("easyx_support_ai_conv_id");
    setConversationId(null);
    toast.success("Started a new AI support session.");
  };

  // Handle Escalating to Human Support Ticket
  const handleEscalateToTicket = async () => {
    if (!conversationId) {
      if (onOpenCreateTicket) {
        onOpenCreateTicket({
          category: "OTHER",
          subject: "Support Request from AI Assistant",
        });
      }
      return;
    }

    try {
      const res = await escalateMutation.mutateAsync({
        conversation_id: conversationId,
        reason: escalationReason || "User requested human support escalation",
      });

      toast.success(res?.message || "Successfully escalated to Human Support Ticket!");
      setEscalationModalOpen(false);
      refetchConv();

      if (onOpenCreateTicket && res?.ticket) {
        // Can open or redirect to ticket view
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to escalate conversation.");
    }
  };

  // Handle message helpful/unhelpful feedback
  const handleFeedback = async (messageId, feedback) => {
    if (!conversationId || !messageId) return;
    try {
      await feedbackMutation.mutateAsync({
        conversation_id: conversationId,
        message_id: messageId,
        feedback,
      });
      toast.success("Thank you for your feedback!");
      refetchConv();
    } catch (err) {
      toast.error("Failed to record feedback.");
    }
  };

  const isAssistantDisabled = !settings.is_enabled;

  return (
    <div className={`space-y-4 ${className}`} data-testid="support-ai-assistant-container">
      {/* AI Assistant Header Banner */}
      <EasyXCard className="p-4 sm:p-5 bg-gradient-to-r from-ex-surface via-ex-surface to-ex-lav-900/20 border-white/10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-ex-accent/15 border border-ex-accent/30 flex items-center justify-center shrink-0 text-ex-accent">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-ex-text tracking-wide">
                  EasyX AI Support Assistant
                </h3>
                {isAssistantDisabled ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                    Offline
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Online 24/7
                  </span>
                )}
                <span className="text-[11px] text-ex-muted flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-ex-lav-400" /> Grounded in EasyX Help Center
                </span>
              </div>
              <p className="text-xs text-ex-muted mt-0.5">
                Instant answers to questions on deposits, KYC verification, ROI tiers, payment proof, and navigation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {conversation?.messages?.length > 1 && (
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={handleResetConversation}
                className="h-8 px-2.5 text-xs text-ex-muted hover:text-white"
                title="Start a new conversation"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" /> New Chat
              </EasyXButton>
            )}

            <EasyXButton
              variant="accent"
              size="sm"
              onClick={() => {
                if (onOpenCreateTicket) {
                  onOpenCreateTicket({
                    category: "OTHER",
                    subject: "Assistance required from Support Team",
                  });
                } else {
                  setEscalationModalOpen(true);
                }
              }}
              className="h-8 px-3 text-xs font-semibold shadow-sm"
              data-testid="talk-to-human-support-btn"
            >
              <LifeBuoy className="h-3.5 w-3.5 mr-1.5" /> Talk to Human Support
            </EasyXButton>
          </div>
        </div>

        {/* Security & Financial Notice Banner */}
        <div className="mt-3.5 pt-3 border-t border-white/6 flex items-center justify-between text-[11px] text-ex-muted/80">
          <div className="flex items-center gap-1.5">
            <Lock className="h-3 w-3 text-ex-muted" />
            <span>AI is an informational assistant. It never modifies balances, transactions, or account decisions.</span>
          </div>
          <span className="hidden sm:inline-block">Never share passwords or private keys</span>
        </div>
      </EasyXCard>

      {/* Main Chat Thread Box */}
      <EasyXCard className="p-0 overflow-hidden flex flex-col h-[520px] sm:h-[580px] bg-ex-surface border-white/10">
        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4" data-testid="support-ai-chat-thread">
          {/* Welcome Message if no custom conversation yet */}
          {(!conversation || conversation.messages.length === 0) && (
            <div className="flex items-start gap-3 max-w-2xl">
              <div className="h-8 w-8 rounded-full bg-ex-accent/20 border border-ex-accent/30 flex items-center justify-center shrink-0 text-ex-accent mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 text-xs text-ex-text leading-relaxed">
                  {settings.welcome_message}
                </div>
              </div>
            </div>
          )}

          {/* Render Conversation Messages */}
          {conversation?.messages?.map((msg) => {
            const isUser = msg.sender === "USER";
            const isSystem = msg.sender === "SYSTEM";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2 max-w-md text-center">
                    <Info className="h-4 w-4 shrink-0 text-amber-400" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2.5 sm:gap-3 ${
                  isUser ? "flex-row-reverse" : "flex-row"
                } max-w-2xl ${isUser ? "ml-auto" : "mr-auto"}`}
              >
                {/* Avatar */}
                <div
                  className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    isUser
                      ? "bg-ex-lav-600 text-white"
                      : "bg-ex-accent/20 border border-ex-accent/30 text-ex-accent"
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble & Cards */}
                <div className={`space-y-2 flex-1 ${isUser ? "items-end text-right" : "items-start text-left"}`}>
                  <div
                    className={`p-3.5 sm:p-4 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-ex-accent text-ex-ink font-medium rounded-tr-sm"
                        : "bg-white/5 border border-white/10 text-ex-text rounded-tl-sm whitespace-pre-line"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Matched FAQ Cards Preview if provided by AI */}
                  {!isUser && msg.matched_faqs && msg.matched_faqs.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] font-semibold text-ex-muted flex items-center gap-1">
                        <BookOpen className="h-3 w-3 text-ex-lav-400" /> Approved Help Articles:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.matched_faqs.map((faq) => (
                          <button
                            key={faq.id}
                            onClick={() => {
                              if (onViewFaq) onViewFaq(faq.id);
                              else setActiveFaqModal(faq);
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-ex-lav-300 transition text-left group"
                          >
                            <span>{faq.title}</span>
                            <ExternalLink className="h-2.5 w-2.5 text-ex-muted group-hover:text-ex-lav-300" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggested Actions (e.g. Create Ticket / Prompts) */}
                  {!isUser && msg.suggested_actions && msg.suggested_actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggested_actions.map((act, aIdx) => {
                        if (act.action === "CREATE_TICKET") {
                          return (
                            <EasyXButton
                              key={aIdx}
                              size="sm"
                              variant="accent"
                              onClick={() => {
                                if (onOpenCreateTicket) {
                                  onOpenCreateTicket(act.payload || { category: "OTHER" });
                                } else {
                                  setEscalationModalOpen(true);
                                }
                              }}
                              className="h-7 px-2.5 text-[11px] font-semibold shadow-sm"
                            >
                              <LifeBuoy className="h-3 w-3 mr-1" /> {act.label || "Create Support Ticket"}
                            </EasyXButton>
                          );
                        }
                        if (act.action === "ASK_PROMPT" && act.payload) {
                          return (
                            <button
                              key={aIdx}
                              onClick={() => handleSendMessage(act.payload)}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-ex-text transition flex items-center gap-1"
                            >
                              <span>{act.label}</span>
                              <ArrowRight className="h-2.5 w-2.5 text-ex-muted" />
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}

                  {/* Turn Footer: Time & Helpful Feedback */}
                  <div className={`flex items-center gap-2 text-[10px] text-ex-muted pt-0.5 ${isUser ? "justify-end" : "justify-start"}`}>
                    <span>{dayjs(msg.created_at).format("h:mm A")}</span>
                    {!isUser && (
                      <div className="flex items-center gap-1 ml-2 border-l border-white/10 pl-2">
                        <span className="text-white/40">Was this helpful?</span>
                        <button
                          onClick={() => handleFeedback(msg.id, "HELPFUL")}
                          className={`p-1 rounded hover:bg-white/10 transition ${
                            msg.feedback === "HELPFUL" ? "text-emerald-400 bg-emerald-500/10" : "text-ex-muted"
                          }`}
                          title="Helpful"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "UNHELPFUL")}
                          className={`p-1 rounded hover:bg-white/10 transition ${
                            msg.feedback === "UNHELPFUL" ? "text-rose-400 bg-rose-500/10" : "text-ex-muted"
                          }`}
                          title="Not helpful"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pending Typing Indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex items-start gap-3 max-w-lg">
              <div className="h-8 w-8 rounded-full bg-ex-accent/20 border border-ex-accent/30 flex items-center justify-center shrink-0 text-ex-accent animate-pulse">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-ex-muted flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-ex-accent animate-bounce"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-ex-accent animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-ex-accent animate-bounce [animation-delay:0.4s]"></span>
                </div>
                <span>Checking EasyX Knowledge Base...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts */}
        {(!conversation || conversation.messages.length <= 3) && settings.suggested_prompts?.length > 0 && (
          <div className="px-4 py-2 border-t border-white/6 bg-white/[0.02]">
            <div className="flex items-center gap-1.5 mb-1.5 text-[11px] font-medium text-ex-muted">
              <Sparkles className="h-3 w-3 text-ex-lav-400" />
              <span>Suggested Questions:</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {settings.suggested_prompts.map((prompt, pIdx) => (
                <button
                  key={pIdx}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={sendMessageMutation.isPending || isAssistantDisabled}
                  className="whitespace-nowrap px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-ex-text/90 transition hover:border-ex-lav-400/40 shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-ex-surface/90 backdrop-blur-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isAssistantDisabled
                  ? "AI Assistant is offline. Please create a support ticket."
                  : "Ask about deposits, KYC, ROI tiers, payment proof, or support..."
              }
              disabled={isAssistantDisabled || sendMessageMutation.isPending}
              className="flex-1 h-11 rounded-ex-ctrl bg-white/5 border border-white/10 px-4 text-xs sm:text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition disabled:opacity-50"
              data-testid="support-ai-input"
            />

            <EasyXButton
              type="submit"
              variant="accent"
              disabled={!inputMessage.trim() || isAssistantDisabled || sendMessageMutation.isPending}
              className="h-11 px-4 sm:px-5 text-xs font-semibold shadow-ex-btn shrink-0"
              data-testid="support-ai-send-btn"
            >
              {sendMessageMutation.isPending ? (
                <EasyXLoader size="sm" />
              ) : (
                <>
                  <Send className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Ask AI</span>
                </>
              )}
            </EasyXButton>
          </form>
        </div>
      </EasyXCard>

      {/* Escalation Confirmation Modal */}
      <EasyXModal
        open={escalationModalOpen}
        onOpenChange={setEscalationModalOpen}
        title="Connect with Human Support"
        description="A support ticket will be opened with your complete chat transcript so our staff can assist you immediately."
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-ex-text mb-1">
              Add any additional notes for the support agent (optional):
            </label>
            <textarea
              rows={3}
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="e.g. My TXID is 0x123... and I need confirmation on deposit status."
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-xs text-ex-text placeholder:text-ex-muted/50 focus:border-ex-lav-400 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-1 text-[11px] text-ex-muted">
            <p className="font-semibold text-ex-text">What happens next?</p>
            <p>• A support agent will review your chat transcript and question.</p>
            <p>• You will receive real-time notifications when an agent replies.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <EasyXButton
              variant="outline"
              size="sm"
              onClick={() => setEscalationModalOpen(false)}
            >
              Cancel
            </EasyXButton>
            <EasyXButton
              variant="accent"
              size="sm"
              onClick={handleEscalateToTicket}
              disabled={escalateMutation.isPending}
            >
              {escalateMutation.isPending ? <EasyXLoader size="sm" /> : "Confirm & Create Ticket"}
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>
    </div>
  );
}
