import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import {
  Bot,
  Sliders,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  HelpCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  ExternalLink,
  Shield,
  Lock,
  ThumbsUp,
  ThumbsDown,
  User,
  Plus,
  Eye,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
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
  useAdminSupportAiSettings,
  useAdminUpdateSupportAiSettings,
  useAdminSupportAiConversations,
  useAdminSupportAiConversation,
  useAdminSupportAiUnanswered,
  useAdminUpdateSupportAiUnanswered,
  useAdminSupportAiAnalytics,
} from "@/admin/adminApi";
import { SupportStatusBadge } from "@/user/components/SupportStatusBadge";

dayjs.extend(relativeTime);

export default function AdminAiAssistantManager({ onNavigateToFaqs }) {
  const [activeTab, setActiveTab] = useState("CONFIG"); // "CONFIG" | "CONVERSATIONS" | "UNANSWERED"

  // Settings State
  const {
    data: settingsData,
    isLoading: settingsLoading,
    refetch: refetchSettings,
  } = useAdminSupportAiSettings();
  const updateSettingsMutation = useAdminUpdateSupportAiSettings();

  const [formIsEnabled, setFormIsEnabled] = useState(true);
  const [formModelName, setFormModelName] = useState("gemini-3.7-flash");
  const [formTemperature, setFormTemperature] = useState(0.2);
  const [formRateLimit, setFormRateLimit] = useState(30);
  const [formWelcomeMessage, setFormWelcomeMessage] = useState("");
  const [formCustomGuidelines, setFormCustomGuidelines] = useState("");
  const [formSuggestedPrompts, setFormSuggestedPrompts] = useState("");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Sync settings when loaded
  if (settingsData?.settings && !settingsLoaded) {
    const s = settingsData.settings;
    setFormIsEnabled(Boolean(s.is_enabled));
    setFormModelName(s.model_name || "gemini-3.7-flash");
    setFormTemperature(s.temperature !== undefined ? s.temperature : 0.2);
    setFormRateLimit(s.rate_limit_per_10min || 30);
    setFormWelcomeMessage(s.welcome_message || "");
    setFormCustomGuidelines(s.custom_system_guidelines || "");
    setFormSuggestedPrompts((s.suggested_prompts || []).join("\n"));
    setSettingsLoaded(true);
  }

  // Analytics Query
  const { data: analyticsData, refetch: refetchAnalytics } = useAdminSupportAiAnalytics();
  const analytics = analyticsData?.analytics || {};

  // Conversations Query
  const [convStatusFilter, setConvStatusFilter] = useState("ALL");
  const [convSearch, setConvSearch] = useState("");
  const [viewingConvId, setViewingConvId] = useState(null);

  const {
    data: convsData,
    isLoading: convsLoading,
    refetch: refetchConvs,
  } = useAdminSupportAiConversations({
    status: convStatusFilter,
    search: convSearch,
  });
  const conversations = convsData?.conversations || [];

  const { data: singleConvData } = useAdminSupportAiConversation(viewingConvId);
  const viewingConversation = singleConvData?.conversation;

  // Unanswered Questions Query
  const [unansweredStatus, setUnansweredStatus] = useState("ALL");
  const {
    data: unansweredData,
    isLoading: unansweredLoading,
    refetch: refetchUnanswered,
  } = useAdminSupportAiUnanswered({ status: unansweredStatus });
  const unansweredList = unansweredData?.unanswered || [];

  const updateUnansweredMutation = useAdminUpdateSupportAiUnanswered();

  // Save Settings Handler
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const promptsArray = String(formSuggestedPrompts || "")
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    try {
      await updateSettingsMutation.mutateAsync({
        is_enabled: formIsEnabled,
        model_name: formModelName,
        temperature: Number(formTemperature),
        rate_limit_per_10min: Number(formRateLimit),
        welcome_message: formWelcomeMessage,
        custom_system_guidelines: formCustomGuidelines,
        suggested_prompts: promptsArray,
      });
      toast.success("AI Support Assistant settings updated successfully.");
      refetchSettings();
      refetchAnalytics();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update AI settings.");
    }
  };

  // Update Unanswered Status
  const handleUpdateUnansweredStatus = async (id, status) => {
    try {
      await updateUnansweredMutation.mutateAsync({ id, status });
      toast.success(`Question marked as ${status.toLowerCase()}.`);
      refetchUnanswered();
      refetchAnalytics();
    } catch (err) {
      toast.error("Failed to update status.");
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-ai-assistant-manager">
      {/* Header & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-ex-surface via-ex-surface to-ex-lav-950/30 p-5 rounded-ex-card border border-white/10">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-ex-accent/15 border border-ex-accent/30 flex items-center justify-center shrink-0 text-ex-accent">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-ex-text">AI Support Assistant Control Center</h2>
              {formIsEnabled ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Active & Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
                  Disabled by Admin
                </span>
              )}
            </div>
            <p className="text-xs text-ex-muted mt-1">
              Configure AI parameters, inspect escalated conversations, identify unanswered questions, and manage knowledge grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSettings();
              refetchAnalytics();
              refetchConvs();
              refetchUnanswered();
            }}
            className="h-9 px-3 text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </EasyXButton>
        </div>
      </div>

      {/* Analytics KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Conversations</span>
            <MessageSquare className="h-3.5 w-3.5 text-ex-lav-400" />
          </div>
          <p className="text-xl font-bold text-ex-text mt-1.5">{analytics.total_conversations || 0}</p>
          <span className="text-[10px] text-ex-muted mt-1">Total chat sessions</span>
        </EasyXCard>

        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Total Queries</span>
            <Sparkles className="h-3.5 w-3.5 text-ex-accent" />
          </div>
          <p className="text-xl font-bold text-ex-text mt-1.5">{analytics.total_queries || 0}</p>
          <span className="text-[10px] text-ex-muted mt-1">Questions answered</span>
        </EasyXCard>

        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Escalated</span>
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-amber-400 mt-1.5">{analytics.escalated_conversations || 0}</p>
          <span className="text-[10px] text-ex-muted mt-1">{analytics.escalation_rate_pct || 0}% escalation rate</span>
        </EasyXCard>

        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Satisfaction</span>
            <ThumbsUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-1.5">{analytics.satisfaction_rate_pct || 100}%</p>
          <span className="text-[10px] text-ex-muted mt-1">{analytics.helpful_feedback_count || 0} helpful votes</span>
        </EasyXCard>

        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Knowledge Gaps</span>
            <HelpCircle className="h-3.5 w-3.5 text-rose-400" />
          </div>
          <p className="text-xl font-bold text-rose-400 mt-1.5">{analytics.unanswered_gaps_count || 0}</p>
          <span className="text-[10px] text-ex-muted mt-1">Unanswered questions</span>
        </EasyXCard>

        <EasyXCard className="p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-ex-muted text-[11px] font-medium">
            <span>Model Engine</span>
            <Bot className="h-3.5 w-3.5 text-ex-lav-400" />
          </div>
          <p className="text-xs font-bold text-ex-text mt-2 truncate" title={analytics.model_name || "gemini-3.7-flash"}>
            {analytics.model_name || "gemini-3.7-flash"}
          </p>
          <span className="text-[10px] text-emerald-400 mt-1">Grounded GenAI</span>
        </EasyXCard>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-white/8 pb-3">
        <button
          onClick={() => setActiveTab("CONFIG")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
            activeTab === "CONFIG"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
          }`}
          data-testid="admin-ai-tab-config"
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>Assistant Configuration</span>
        </button>

        <button
          onClick={() => setActiveTab("CONVERSATIONS")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
            activeTab === "CONVERSATIONS"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
          }`}
          data-testid="admin-ai-tab-conversations"
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Conversations & Escalations</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white/10">
            {conversations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("UNANSWERED")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-ex-ctrl transition ${
            activeTab === "UNANSWERED"
              ? "bg-ex-accent text-ex-ink shadow-sm"
              : "text-ex-muted hover:bg-white/5 hover:text-ex-text"
          }`}
          data-testid="admin-ai-tab-unanswered"
        >
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Knowledge Gaps & Unanswered</span>
          {analytics.unanswered_gaps_count > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 font-bold">
              {analytics.unanswered_gaps_count}
            </span>
          )}
        </button>
      </div>

      {/* SUBTAB 1: CONFIGURATION */}
      {activeTab === "CONFIG" && (
        <form onSubmit={handleSaveSettings} className="space-y-5">
          <EasyXCard className="p-5 space-y-5">
            <h3 className="text-sm font-bold text-ex-text flex items-center gap-2">
              <Sliders className="h-4 w-4 text-ex-accent" /> General Assistant Settings
            </h3>

            {/* Master Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
              <div>
                <p className="text-xs font-semibold text-ex-text">Enable AI Support Assistant</p>
                <p className="text-[11px] text-ex-muted">
                  When enabled, users will have access to 24/7 AI chat grounded in approved Help Center FAQs.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsEnabled}
                  onChange={(e) => setFormIsEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ex-accent"></div>
              </label>
            </div>

            {/* Model & Parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ex-text mb-1.5">
                  AI Model Engine
                </label>
                <select
                  value={formModelName}
                  onChange={(e) => setFormModelName(e.target.value)}
                  className="w-full h-10 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none"
                >
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash (Default - Recommended)</option>
                  <option value="gemini-flash-latest">Gemini Flash Latest</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro Preview</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ex-text mb-1.5">
                  Temperature (Creativity: 0.0 - 1.0)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="0.0"
                  max="1.0"
                  value={formTemperature}
                  onChange={(e) => setFormTemperature(e.target.value)}
                  className="w-full h-10 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ex-text mb-1.5">
                  Rate Limit (Queries / 10 Mins)
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={formRateLimit}
                  onChange={(e) => setFormRateLimit(e.target.value)}
                  className="w-full h-10 rounded-ex-ctrl bg-white/5 border border-white/10 px-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <label className="block text-xs font-semibold text-ex-text mb-1.5">
                Initial Welcome Message
              </label>
              <textarea
                rows={2}
                value={formWelcomeMessage}
                onChange={(e) => setFormWelcomeMessage(e.target.value)}
                placeholder="Message greeted to user when initiating support chat..."
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Suggested Prompts */}
            <div>
              <label className="block text-xs font-semibold text-ex-text mb-1.5">
                Suggested Prompt Chips (One per line)
              </label>
              <textarea
                rows={4}
                value={formSuggestedPrompts}
                onChange={(e) => setFormSuggestedPrompts(e.target.value)}
                placeholder="How do I deposit USDT?&#10;What are the KYC requirements?&#10;How does ROI work?"
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Custom Guidelines */}
            <div>
              <label className="block text-xs font-semibold text-ex-text mb-1.5">
                Custom System Guidelines (Optional)
              </label>
              <textarea
                rows={3}
                value={formCustomGuidelines}
                onChange={(e) => setFormCustomGuidelines(e.target.value)}
                placeholder="e.g. Always emphasize our 24/7 ticket support for transaction tracking questions..."
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Critical Protection Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5">
              <Lock className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Strict Safety Enforcement Active</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  The AI is strictly restricted to general Q&A and FAQ grounding. It has zero capability to alter investments, change wallet balances, approve KYC, or manipulate financial records.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <EasyXButton
                type="submit"
                variant="accent"
                disabled={updateSettingsMutation.isPending}
                className="h-10 px-6 text-xs font-semibold shadow-ex-btn"
              >
                {updateSettingsMutation.isPending ? <EasyXLoader size="sm" /> : "Save Configuration"}
              </EasyXButton>
            </div>
          </EasyXCard>
        </form>
      )}

      {/* SUBTAB 2: CONVERSATIONS & ESCALATIONS */}
      {activeTab === "CONVERSATIONS" && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <EasyXCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ex-muted" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Search user, email, or message..."
                className="w-full h-9 rounded-ex-ctrl bg-white/5 border border-white/10 pl-9 pr-3 text-xs text-ex-text focus:border-ex-lav-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              {["ALL", "ESCALATED", "ACTIVE", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setConvStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition whitespace-nowrap ${
                    convStatusFilter === st
                      ? "bg-ex-accent text-ex-ink font-bold"
                      : "bg-white/5 text-ex-muted hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </EasyXCard>

          {/* Conversations Table */}
          <EasyXCard className="p-0 overflow-hidden">
            {convsLoading ? (
              <div className="p-12 flex justify-center">
                <EasyXLoader size="md" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-12">
                <EasyXEmptyState
                  icon={MessageSquare}
                  title="No AI conversations found"
                  description="No user chat conversations match your active filter."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-ex-muted text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">User</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5">Messages</th>
                      <th className="p-3.5">Last Activity</th>
                      <th className="p-3.5">Linked Ticket</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {conversations.map((c) => {
                      const lastMsg = c.messages[c.messages.length - 1];
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02] transition">
                          <td className="p-3.5">
                            <div className="font-semibold text-ex-text">
                              {c.user_name || c.user_email || "Anonymous Visitor"}
                            </div>
                            <div className="text-[11px] text-ex-muted">{c.user_email || c.client_ip}</div>
                          </td>
                          <td className="p-3.5">
                            {c.status === "ESCALATED" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                ESCALATED
                              </span>
                            ) : c.status === "RESOLVED" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                RESOLVED
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-300 border border-sky-500/20">
                                ACTIVE
                              </span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="text-ex-text">{c.messages.length} turns</div>
                            <div className="text-[11px] text-ex-muted truncate max-w-xs" title={lastMsg?.text}>
                              {lastMsg?.text?.substring(0, 45)}...
                            </div>
                          </td>
                          <td className="p-3.5 text-ex-muted whitespace-nowrap">
                            {dayjs(c.updated_at).fromNow()}
                          </td>
                          <td className="p-3.5">
                            {c.escalated_ticket_id ? (
                              <span className="text-ex-accent font-semibold flex items-center gap-1">
                                #{c.escalated_ticket_id.substring(0, 8)}
                              </span>
                            ) : (
                              <span className="text-ex-muted">—</span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <EasyXButton
                              variant="outline"
                              size="sm"
                              onClick={() => setViewingConvId(c.id)}
                              className="h-7 px-2.5 text-xs"
                            >
                              <Eye className="h-3 w-3 mr-1" /> View Chat
                            </EasyXButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </EasyXCard>
        </div>
      )}

      {/* SUBTAB 3: KNOWLEDGE GAPS & UNANSWERED QUESTIONS */}
      {activeTab === "UNANSWERED" && (
        <div className="space-y-4">
          <EasyXCard className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-bold text-ex-text flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4 text-rose-400" /> Unanswered Questions & Knowledge Gaps
              </h3>
              <p className="text-[11px] text-ex-muted mt-0.5">
                Questions asked by users that could not be confidently answered from the approved Knowledge Base.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {["ALL", "PENDING", "REVIEWED", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setUnansweredStatus(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition whitespace-nowrap ${
                    unansweredStatus === st
                      ? "bg-ex-accent text-ex-ink font-bold"
                      : "bg-white/5 text-ex-muted hover:text-white"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </EasyXCard>

          <EasyXCard className="p-0 overflow-hidden">
            {unansweredLoading ? (
              <div className="p-12 flex justify-center">
                <EasyXLoader size="md" />
              </div>
            ) : unansweredList.length === 0 ? (
              <div className="p-12">
                <EasyXEmptyState
                  icon={CheckCircle2}
                  title="No knowledge gaps found"
                  description="All recent user queries have been matched and answered with confidence."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 border-b border-white/10 text-ex-muted text-[11px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Question / Query</th>
                      <th className="p-3.5">Times Asked</th>
                      <th className="p-3.5">Last Asked</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {unansweredList.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-3.5">
                          <div className="font-semibold text-ex-text max-w-md break-words">
                            "{item.question}"
                          </div>
                          {item.user_email && (
                            <div className="text-[11px] text-ex-muted mt-0.5">Asked by: {item.user_email}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-ex-text">
                            {item.asked_count}x
                          </span>
                        </td>
                        <td className="p-3.5 text-ex-muted whitespace-nowrap">
                          {dayjs(item.last_asked_at).fromNow()}
                        </td>
                        <td className="p-3.5">
                          {item.status === "PENDING" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                              PENDING
                            </span>
                          ) : item.status === "REVIEWED" ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
                              REVIEWED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                              RESOLVED
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.status === "PENDING" && (
                              <EasyXButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateUnansweredStatus(item.id, "REVIEWED")}
                                className="h-7 px-2 text-[11px]"
                              >
                                Mark Reviewed
                              </EasyXButton>
                            )}
                            {item.status !== "RESOLVED" && (
                              <EasyXButton
                                variant="outline"
                                size="sm"
                                onClick={() => handleUpdateUnansweredStatus(item.id, "RESOLVED")}
                                className="h-7 px-2 text-[11px] text-emerald-400"
                              >
                                Mark Resolved
                              </EasyXButton>
                            )}
                            {onNavigateToFaqs && (
                              <EasyXButton
                                variant="accent"
                                size="sm"
                                onClick={() => onNavigateToFaqs(item.question)}
                                className="h-7 px-2 text-[11px] font-semibold"
                              >
                                <Plus className="h-3 w-3 mr-1" /> Add FAQ
                              </EasyXButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </EasyXCard>
        </div>
      )}

      {/* Transcript Detail Modal */}
      <EasyXModal
        open={Boolean(viewingConvId)}
        onOpenChange={(open) => !open && setViewingConvId(null)}
        title={`AI Conversation Transcript: ${viewingConvId?.substring(0, 16)}...`}
        description={
          viewingConversation
            ? `User: ${viewingConversation.user_name || viewingConversation.user_email || "Anonymous"} | Status: ${viewingConversation.status}`
            : ""
        }
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {viewingConversation?.messages?.map((m) => {
            const isUser = m.sender === "USER";
            const isSystem = m.sender === "SYSTEM";

            if (isSystem) {
              return (
                <div key={m.id} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  {m.text}
                </div>
              );
            }

            return (
              <div
                key={m.id}
                className={`p-3.5 rounded-xl text-xs space-y-1.5 ${
                  isUser
                    ? "bg-ex-accent/15 border border-ex-accent/30 text-ex-text"
                    : "bg-white/5 border border-white/10 text-ex-text"
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-ex-muted">
                  <span className="font-bold uppercase tracking-wider">{isUser ? "User" : "AI Assistant"}</span>
                  <span>{dayjs(m.created_at).format("MMM D, YYYY h:mm:ss A")}</span>
                </div>
                <div className="whitespace-pre-line leading-relaxed">{m.text}</div>
                {m.feedback && (
                  <div className="pt-1 text-[10px] text-ex-muted flex items-center gap-1">
                    <span>Feedback:</span>
                    <span className={m.feedback === "HELPFUL" ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                      {m.feedback}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </EasyXModal>
    </div>
  );
}
