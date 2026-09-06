import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  BellRing,
  User,
  Users,
  Bot,
  ScrollText,
  CheckCircle2,
  AlertTriangle,
  Play,
  RefreshCw,
  Clock,
  Shield,
  Sliders,
  Send,
  UserCheck,
  Zap,
  TrendingUp,
  Inbox,
  BadgeCheck,
  PiggyBank,
  ChevronRight,
  Filter,
  Eye,
  Info,
  Calendar,
  X,
  VolumeX,
  Search,
  ArrowUpRight,
  Smartphone,
  Check,
  Radio,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminReminderSettings,
  useSaveAdminReminderSettings,
  useUpdateAdminReminderWorkflow,
  useAdminReminderAnalytics,
  useRunReminderSweep,
  useSendTestReminder,
  useAdminNotificationSegments,
  useAdminNotificationSegmentPreview,
  useSendPersonalizedNotification,
  useSendBulkNotification,
  useAdminUnifiedNotificationLogs,
  useAdminUnifiedNotificationAnalytics,
  useAdminUsers,
} from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";
import { NotificationHistoryTable } from "@/admin/components/NotificationHistoryTable";

const NOTIFICATION_TYPES = [
  { value: "general", label: "General Notice" },
  { value: "account", label: "Account Update" },
  { value: "kyc", label: "KYC & Verification" },
  { value: "deposit", label: "Deposit & Funding" },
  { value: "investment", label: "Investment & Staking" },
  { value: "withdrawal", label: "Withdrawal & Payout" },
  { value: "referral", label: "Referral & Bonus" },
  { value: "security", label: "Security Alert" },
  { value: "system", label: "System Maintenance" },
];

const PRESET_ACTION_ROUTES = [
  { label: "None (No Action Button)", url: "", text: "" },
  { label: "Complete KYC (/kyc)", url: "/kyc", text: "Complete KYC" },
  { label: "Deposit USDT (/deposit)", url: "/deposit", text: "Deposit USDT" },
  { label: "View Investment Plans (/investments)", url: "/investments", text: "View Plans" },
  { label: "Withdraw Funds (/withdraw)", url: "/withdraw", text: "Withdraw" },
  { label: "Open Wallet (/wallet)", url: "/wallet", text: "View Wallet" },
  { label: "Open Dashboard (/dashboard)", url: "/dashboard", text: "Open Dashboard" },
];

function StatusBadge({ status, reason }) {
  if (status === "SENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
        <CheckCircle2 className="h-3 w-3" /> Sent
      </span>
    );
  }
  if (status === "STOPPED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20"
        title={reason}
      >
        <UserCheck className="h-3 w-3" /> Converted / Stopped
      </span>
    );
  }
  if (status === "SKIPPED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20"
        title={reason}
      >
        <VolumeX className="h-3 w-3" /> Skipped
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/20"
      title={reason}
    >
      <AlertTriangle className="h-3 w-3" /> {status || "Failed"}
    </span>
  );
}

function ModeBadge({ mode }) {
  if (mode === "personalized") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20">
        <User className="h-3 w-3" /> Personalized
      </span>
    );
  }
  if (mode === "bulk_segment" || mode === "bulk_manual" || mode === "bulk") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
        <Users className="h-3 w-3" /> Bulk Campaign
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
      <Bot className="h-3 w-3" /> Automated
    </span>
  );
}

export default function AdminNotificationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "personalized";
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && ["personalized", "bulk", "automated", "logs"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Queries
  const { data: usersData } = useAdminUsers({ limit: 100 });
  const { data: segmentsData, refetch: refetchSegments } = useAdminNotificationSegments();
  const { data: unifiedAnalytics, refetch: refetchAnalytics } = useAdminUnifiedNotificationAnalytics();
  const { data: reminderSettings, refetch: refetchSettings } = useAdminReminderSettings();
  const { data: reminderAnalytics } = useAdminReminderAnalytics();

  // Mutations
  const sendPersonalized = useSendPersonalizedNotification();
  const sendBulk = useSendBulkNotification();
  const previewSegment = useAdminNotificationSegmentPreview();
  const runSweep = useRunReminderSweep();
  const sendTest = useSendTestReminder();
  const saveReminderSettings = useSaveAdminReminderSettings();
  const updateWorkflow = useUpdateAdminReminderWorkflow();

  // 1. Personalized Form State
  const [persUserSearch, setPersUserSearch] = useState("");
  const [persSelectedUser, setPersSelectedUser] = useState(null);
  const [persTitle, setPersTitle] = useState("");
  const [persMessage, setPersMessage] = useState("");
  const [persType, setPersType] = useState("general");
  const [persChannel, setPersChannel] = useState("both");
  const [persActionUrl, setPersActionUrl] = useState("");
  const [persActionText, setPersActionText] = useState("");
  const [persPreviewModal, setPersPreviewModal] = useState(false);

  // 2. Bulk Form State
  const [bulkMode, setBulkMode] = useState("segment"); // "segment" | "manual_users"
  const [bulkSegmentId, setBulkSegmentId] = useState("registered_no_deposit");
  const [bulkSelectedUserIds, setBulkSelectedUserIds] = useState([]);
  const [bulkTitle, setBulkTitle] = useState("");
  const [bulkMessage, setBulkMessage] = useState("");
  const [bulkType, setBulkType] = useState("general");
  const [bulkChannel, setBulkChannel] = useState("both");
  const [bulkActionUrl, setBulkActionUrl] = useState("");
  const [bulkActionText, setBulkActionText] = useState("");
  const [bulkConfirmModal, setBulkConfirmModal] = useState(false);
  const [segmentPreviewModal, setSegmentPreviewModal] = useState(false);
  const [previewUsersList, setPreviewUsersList] = useState([]);

  // 3. Automated Reminders Global Form State
  const [globalForm, setGlobalForm] = useState({
    enabled: true,
    monthly_limit_per_user: 6,
    quiet_hours_enabled: true,
    quiet_hours_start: 22,
    quiet_hours_end: 8,
    push_notifications_enabled: true,
  });

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testWorkflowKey, setTestWorkflowKey] = useState("no_deposit");
  const [testStepIndex, setTestStepIndex] = useState(0);

  // Workflow Editor Modal State
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [workflowEditForm, setWorkflowEditForm] = useState(null);

  // 4. Logs Filter State
  const [logFilterMode, setLogFilterMode] = useState("all");
  const [logFilterStatus, setLogFilterStatus] = useState("all");
  const [logSearch, setLogSearch] = useState("");
  const [logPage, setLogPage] = useState(1);

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useAdminUnifiedNotificationLogs({
    mode: logFilterMode !== "all" ? logFilterMode : undefined,
    status: logFilterStatus !== "all" ? logFilterStatus : undefined,
    search: logSearch.trim() || undefined,
    page: logPage,
    limit: 20,
  });

  // Sync reminder settings
  useEffect(() => {
    if (reminderSettings?.global) {
      const g = reminderSettings.global;
      setGlobalForm({
        enabled: g.enabled !== false,
        monthly_limit_per_user: g.monthly_limit_per_user || 6,
        quiet_hours_enabled: g.quiet_hours?.enabled !== false,
        quiet_hours_start: g.quiet_hours?.start_hour ?? 22,
        quiet_hours_end: g.quiet_hours?.end_hour ?? 8,
        push_notifications_enabled: g.push_notifications_enabled !== false,
      });
    }
  }, [reminderSettings]);

  // Filtered users for personalized user picker
  const filteredUsers = (usersData?.users || []).filter((u) => {
    if (u.role === "admin") return false;
    if (!persUserSearch.trim()) return true;
    const q = persUserSearch.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  });

  // Helper to insert tokens
  const insertToken = (setter, currentVal, token) => {
    setter(currentVal ? `${currentVal} ${token}` : token);
  };

  // Handle Send Personalized
  const handleSendPersonalized = async () => {
    if (!persSelectedUser) {
      toast.error("Please select a target recipient user.");
      return;
    }
    if (!persTitle.trim() || !persMessage.trim()) {
      toast.error("Please provide both title and message.");
      return;
    }

    try {
      await sendPersonalized.mutateAsync({
        user_id: persSelectedUser.id,
        title: persTitle.trim(),
        message: persMessage.trim(),
        type: persType,
        channel: persChannel,
        action_url: persActionUrl || null,
        action_text: persActionText || null,
        idempotency_key: `pers_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      toast.success(`Personalized notification sent to ${persSelectedUser.name || persSelectedUser.email}!`);
      setPersPreviewModal(false);
      setPersTitle("");
      setPersMessage("");
      setPersSelectedUser(null);
      setPersUserSearch("");
      refetchLogs();
      refetchAnalytics();
    } catch (err) {
      toast.error(apiError(err) || "Failed to send personalized notification.");
    }
  };

  // Handle Send Bulk
  const handleSendBulk = async () => {
    if (!bulkTitle.trim() || !bulkMessage.trim()) {
      toast.error("Please provide title and message for bulk notification.");
      return;
    }

    if (bulkMode === "manual_users" && bulkSelectedUserIds.length === 0) {
      toast.error("Please select at least one recipient user.");
      return;
    }

    try {
      const res = await sendBulk.mutateAsync({
        mode: bulkMode,
        segment_id: bulkMode === "segment" ? bulkSegmentId : undefined,
        user_ids: bulkMode === "manual_users" ? bulkSelectedUserIds : undefined,
        title: bulkTitle.trim(),
        message: bulkMessage.trim(),
        type: bulkType,
        channel: bulkChannel,
        action_url: bulkActionUrl || null,
        action_text: bulkActionText || null,
        idempotency_key: `bulk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      });

      toast.success(
        `Bulk campaign completed! Dispatched to ${res.sent_count} user${res.sent_count === 1 ? "" : "s"}.`
      );
      setBulkConfirmModal(false);
      setBulkTitle("");
      setBulkMessage("");
      setBulkSelectedUserIds([]);
      refetchLogs();
      refetchAnalytics();
      refetchSegments();
    } catch (err) {
      toast.error(apiError(err) || "Failed to dispatch bulk campaign.");
    }
  };

  // Preview Segment Users
  const handlePreviewSegment = async (segId) => {
    try {
      const res = await previewSegment.mutateAsync({ segment_id: segId });
      setPreviewUsersList(res.sample_users || []);
      setSegmentPreviewModal(true);
    } catch (err) {
      toast.error("Failed to load audience preview.");
    }
  };

  // Save Automated Settings
  const handleSaveAutomatedSettings = async (e) => {
    e.preventDefault();
    try {
      await saveReminderSettings.mutateAsync({
        global: {
          monthly_limit_per_user: Number(globalForm.monthly_limit_per_user),
          quiet_hours: {
            enabled: Boolean(globalForm.quiet_hours_enabled),
            start_hour: Number(globalForm.quiet_hours_start),
            end_hour: Number(globalForm.quiet_hours_end),
            timezone: "UTC",
          },
          push_notifications_enabled: Boolean(globalForm.push_notifications_enabled),
        },
      });
      toast.success("Global automation guardrails saved successfully.");
      refetchSettings();
    } catch (err) {
      toast.error(apiError(err) || "Failed to save settings.");
    }
  };

  // Run Manual Sweep
  const handleRunSweep = async () => {
    try {
      const res = await runSweep.mutateAsync();
      toast.success(
        `Sweep executed: ${res.reminders_sent} sent, ${res.workflows_stopped} stopped/converted.`
      );
      refetchLogs();
      refetchAnalytics();
    } catch (err) {
      toast.error(apiError(err) || "Sweep failed.");
    }
  };

  // Send Test Reminder
  const handleSendTest = async () => {
    try {
      await sendTest.mutateAsync({
        workflow_key: testWorkflowKey,
        step_index: testStepIndex,
      });
      toast.success("Test preview reminder sent to your admin inbox!");
      setTestModalOpen(false);
      refetchLogs();
    } catch (err) {
      toast.error(apiError(err) || "Failed to send test reminder.");
    }
  };

  // Selected segment details
  const selectedSegmentDef = (segmentsData?.segments || []).find((s) => s.id === bulkSegmentId);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <PageHeading
            title="Automated Notification System"
            description="Unified administrative communication suite featuring Personalized single-user lookup, Dynamic Bulk/Segment audience dispatch, and Automated Reminder workflows with stop conditions and editable templates."
          />
        </div>
        <div className="flex items-center gap-2">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => {
              refetchAnalytics();
              refetchLogs();
              refetchSegments();
              toast.success("Data refreshed.");
            }}
          >
            <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
          </EasyXButton>
          <EasyXButton
            variant="primary"
            size="sm"
            onClick={handleRunSweep}
            loading={runSweep.isPending}
          >
            <Play className="h-4 w-4 mr-1.5" /> Run Automated Sweep
          </EasyXButton>
        </div>
      </div>

      {/* Analytics Metric Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <EasyXCard className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Total Dispatched</span>
            <BellRing className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-white mt-2">
            {unifiedAnalytics?.overview?.total_dispatched ?? 0}
          </p>
          <span className="text-[11px] text-zinc-500">Across all 3 channels</span>
        </EasyXCard>

        <EasyXCard className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Personalized</span>
            <User className="h-4 w-4 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white mt-2">
            {unifiedAnalytics?.personalized?.sent ?? 0}
          </p>
          <span className="text-[11px] text-purple-400/80">Direct 1-on-1 notices</span>
        </EasyXCard>

        <EasyXCard className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Bulk Campaigns</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-xl font-bold text-white mt-2">
            {unifiedAnalytics?.bulk?.campaigns_count ?? 0}
          </p>
          <span className="text-[11px] text-indigo-400/80">
            {unifiedAnalytics?.bulk?.recipients_reached ?? 0} total reached
          </span>
        </EasyXCard>

        <EasyXCard className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Automated Conversions</span>
            <Bot className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 mt-2">
            {unifiedAnalytics?.automated?.conversion_rate_pct ?? 0}%
          </p>
          <span className="text-[11px] text-zinc-500">
            {unifiedAnalytics?.automated?.conversions ?? 0} converted after reminder
          </span>
        </EasyXCard>

        <EasyXCard className="p-4 bg-zinc-900/60 border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-400 font-medium">Push Subscribers</span>
            <Smartphone className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="text-xl font-bold text-white mt-2">
            {unifiedAnalytics?.overview?.push_subscribers ?? 0}
          </p>
          <span className="text-[11px] text-cyan-400/80">Web push enabled</span>
        </EasyXCard>
      </div>

      {/* Main 4-Tab Navigation */}
      <div className="flex border-b border-zinc-800 gap-2 overflow-x-auto pb-1">
        <button
          id="btn-tab-personalized"
          onClick={() => handleTabChange("personalized")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "personalized"
              ? "border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <User className="h-4 w-4" />
          <span>① Personalized</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300 font-normal">
            Admin → 1 User
          </span>
        </button>

        <button
          id="btn-tab-bulk"
          onClick={() => handleTabChange("bulk")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "bulk"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>② Bulk / Segment</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300 font-normal">
            Admin → Group
          </span>
        </button>

        <button
          id="btn-tab-automated"
          onClick={() => handleTabChange("automated")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "automated"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Bot className="h-4 w-4" />
          <span>③ Automated Reminders</span>
          <span className="text-[11px] px-1.5 py-0.2 bg-zinc-800 rounded text-zinc-300 font-normal">
            Condition Engine
          </span>
        </button>

        <button
          id="btn-tab-logs"
          onClick={() => handleTabChange("logs")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "logs"
              ? "border-amber-500 text-amber-400 bg-amber-500/10 rounded-t-lg"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <ScrollText className="h-4 w-4" />
          <span>④ History & Delivery Logs</span>
        </button>
      </div>

      {/* ==================== TAB 1: PERSONALIZED ==================== */}
      {activeTab === "personalized" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EasyXCard className="p-6 bg-zinc-900/70 border-zinc-800 space-y-5">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <User className="h-5 w-5 text-purple-400" /> Send Personalized Notification
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Target a single specific investor with real-time in-app & push notification delivery.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-500/15 text-purple-300 border border-purple-500/20 rounded-md">
                  Mode: 1-on-1
                </span>
              </div>

              {/* Step 1: Select Recipient User */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  1. Select Target Recipient <span className="text-red-400">*</span>
                </label>

                {persSelectedUser ? (
                  <div className="flex items-center justify-between p-3.5 bg-purple-950/30 border border-purple-500/40 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-300 font-bold">
                        {persSelectedUser.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{persSelectedUser.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                            ID: {persSelectedUser.id.substring(0, 12)}...
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-zinc-400 mt-0.5">
                          <span>{persSelectedUser.email}</span>
                          <span>•</span>
                          <span>KYC: <strong className="text-zinc-200">{persSelectedUser.kyc_status}</strong></span>
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPersSelectedUser(null)}
                      className="text-xs text-zinc-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-zinc-800 transition"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        placeholder="Search investor by name, email, or user ID..."
                        value={persUserSearch}
                        onChange={(e) => setPersUserSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto border border-zinc-800/80 rounded-lg bg-zinc-950/60 divide-y divide-zinc-800/50">
                      {filteredUsers.length === 0 ? (
                        <div className="p-3 text-center text-xs text-zinc-500">
                          No matching investors found.
                        </div>
                      ) : (
                        filteredUsers.slice(0, 8).map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setPersSelectedUser(u);
                              setPersUserSearch("");
                            }}
                            className="w-full text-left p-2.5 hover:bg-zinc-800/50 flex items-center justify-between transition"
                          >
                            <div>
                              <p className="text-xs font-semibold text-white">{u.name}</p>
                              <p className="text-[11px] text-zinc-400">{u.email}</p>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                              KYC: {u.kyc_status}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Message Content */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      2. Notification Title <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Placeholders:</span>
                      <button
                        type="button"
                        onClick={() => insertToken(setPersTitle, persTitle, "{{first_name}}")}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded"
                      >
                        + First Name
                      </button>
                      <button
                        type="button"
                        onClick={() => insertToken(setPersTitle, persTitle, "{{user_name}}")}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded"
                      >
                        + Full Name
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={persTitle}
                    onChange={(e) => setPersTitle(e.target.value)}
                    placeholder="e.g. Account Security Update for {{first_name}}"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      3. Notification Message <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertToken(setPersMessage, persMessage, "{{first_name}}")}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded"
                      >
                        + First Name
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={persMessage}
                    onChange={(e) => setPersMessage(e.target.value)}
                    placeholder="Hi {{first_name}}, we noticed an update regarding your EasyX account..."
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                  <div className="flex justify-between text-[11px] text-zinc-500 mt-1">
                    <span>Supports markdown and safe template tags.</span>
                    <span>{persMessage.length} characters</span>
                  </div>
                </div>
              </div>

              {/* Step 3: Type & Delivery Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Category / Type
                  </label>
                  <select
                    value={persType}
                    onChange={(e) => setPersType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {NOTIFICATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Delivery Channel
                  </label>
                  <select
                    value={persChannel}
                    onChange={(e) => setPersChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="both">Both (In-App + Web Push)</option>
                    <option value="in_app">In-App Notification Only</option>
                    <option value="push">Push Notification Only</option>
                  </select>
                </div>
              </div>

              {/* Step 4: Optional Action Button */}
              <div className="space-y-3 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ArrowUpRight className="h-3.5 w-3.5 text-purple-400" /> Optional Call to Action Button
                  </label>
                  <span className="text-[11px] text-zinc-500">Directs user to in-app route</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Preset Route</span>
                    <select
                      value={persActionUrl}
                      onChange={(e) => {
                        const preset = PRESET_ACTION_ROUTES.find((p) => p.url === e.target.value);
                        setPersActionUrl(e.target.value);
                        if (preset && preset.text) setPersActionText(preset.text);
                      }}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                    >
                      {PRESET_ACTION_ROUTES.map((p, idx) => (
                        <option key={idx} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="text-[11px] text-zinc-400 block mb-1">Button Label</span>
                    <input
                      type="text"
                      placeholder="e.g. Complete KYC"
                      value={persActionText}
                      onChange={(e) => setPersActionText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <EasyXButton
                  variant="outline"
                  size="md"
                  onClick={() => setPersPreviewModal(true)}
                  disabled={!persTitle.trim() || !persMessage.trim()}
                >
                  <Eye className="h-4 w-4 mr-1.5" /> Preview Notification
                </EasyXButton>
                <EasyXButton
                  variant="primary"
                  size="md"
                  onClick={handleSendPersonalized}
                  loading={sendPersonalized.isPending}
                  disabled={!persSelectedUser || !persTitle.trim() || !persMessage.trim()}
                >
                  <Send className="h-4 w-4 mr-1.5" /> Dispatch Now
                </EasyXButton>
              </div>
            </EasyXCard>
          </div>

          {/* Right Live Simulation Preview */}
          <div className="space-y-4">
            <EasyXCard className="p-5 bg-zinc-900/60 border-zinc-800 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-purple-400" /> Live In-App Card Preview
              </h4>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3 shadow-inner">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                    <BellRing className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-white truncate">
                        {persTitle
                          ? persTitle.replace(/{{first_name}}/g, persSelectedUser?.name?.split(" ")?.[0] || "Investor")
                          : "Title preview..."}
                      </h5>
                      <span className="text-[10px] text-zinc-500">Just now</span>
                    </div>
                    <p className="text-xs text-zinc-300 mt-1 line-clamp-3">
                      {persMessage
                        ? persMessage.replace(/{{first_name}}/g, persSelectedUser?.name?.split(" ")?.[0] || "Investor")
                        : "Your message content will appear here..."}
                    </p>
                    {persActionText && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-medium">
                          {persActionText} <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-lg text-xs text-zinc-400 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span>Target Recipient:</span>
                  <strong className="text-zinc-200">{persSelectedUser?.name || "None selected"}</strong>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Channel:</span>
                  <span className="text-purple-300 font-semibold">{persChannel}</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span>Idempotency Protection:</span>
                  <span className="text-emerald-400">Enabled</span>
                </div>
              </div>
            </EasyXCard>
          </div>
        </div>
      )}

      {/* ==================== TAB 2: BULK / SEGMENT ==================== */}
      {activeTab === "bulk" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <EasyXCard className="p-6 bg-zinc-900/70 border-zinc-800 space-y-5">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" /> Send Bulk / Segment Notification
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Broadcast targeted campaigns to specific user segments or manually selected investor groups.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 rounded-md">
                  Mode: Mass Audience
                </span>
              </div>

              {/* Mode Toggle: Segment vs Manual */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setBulkMode("segment")}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                    bulkMode === "segment"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Layers className="h-4 w-4" /> By Condition Segment
                </button>
                <button
                  type="button"
                  onClick={() => setBulkMode("manual_users")}
                  className={`flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition ${
                    bulkMode === "manual_users"
                      ? "bg-indigo-600 text-white shadow"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Check className="h-4 w-4" /> Manual Multi-Select ({bulkSelectedUserIds.length})
                </button>
              </div>

              {/* Targeting Option A: By Condition Segment */}
              {bulkMode === "segment" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Select Audience Segment
                    </label>
                    {selectedSegmentDef && (
                      <button
                        type="button"
                        onClick={() => handlePreviewSegment(bulkSegmentId)}
                        className="text-xs text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Preview {selectedSegmentDef.count} Matching Users
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-64 overflow-y-auto pr-1">
                    {(segmentsData?.segments || []).map((seg) => {
                      const isSelected = bulkSegmentId === seg.id;
                      return (
                        <div
                          key={seg.id}
                          onClick={() => setBulkSegmentId(seg.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-start justify-between gap-2 ${
                            isSelected
                              ? "bg-indigo-950/40 border-indigo-500 text-white shadow-sm"
                              : "bg-zinc-950 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                          }`}
                        >
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/90 block">
                              {seg.category}
                            </span>
                            <h5 className="text-xs font-bold text-zinc-100 mt-0.5">{seg.name}</h5>
                            <p className="text-[11px] text-zinc-400 mt-0.5 line-clamp-1">{seg.description}</p>
                          </div>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                              isSelected
                                ? "bg-indigo-500 text-white"
                                : "bg-zinc-800 text-zinc-300"
                            }`}
                          >
                            {seg.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Targeting Option B: Manual Multi-Select */}
              {bulkMode === "manual_users" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Select Target Investors ({bulkSelectedUserIds.length} selected)
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setBulkSelectedUserIds(
                            (usersData?.users || []).filter((u) => u.role !== "admin").map((u) => u.id)
                          )
                        }
                        className="text-[11px] text-indigo-400 hover:underline"
                      >
                        Select All
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setBulkSelectedUserIds([])}
                        className="text-[11px] text-zinc-400 hover:underline"
                      >
                        Deselect All
                      </button>
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto border border-zinc-800 rounded-xl bg-zinc-950 divide-y divide-zinc-800/60">
                    {(usersData?.users || [])
                      .filter((u) => u.role !== "admin")
                      .map((u) => {
                        const checked = bulkSelectedUserIds.includes(u.id);
                        return (
                          <label
                            key={u.id}
                            className="flex items-center justify-between p-2.5 hover:bg-zinc-900/60 cursor-pointer transition"
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setBulkSelectedUserIds([...bulkSelectedUserIds, u.id]);
                                  } else {
                                    setBulkSelectedUserIds(bulkSelectedUserIds.filter((id) => id !== u.id));
                                  }
                                }}
                                className="rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                              />
                              <div>
                                <p className="text-xs font-semibold text-white">{u.name}</p>
                                <p className="text-[11px] text-zinc-400">{u.email}</p>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                              KYC: {u.kyc_status}
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Message Content */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Notification Title <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertToken(setBulkTitle, bulkTitle, "{{first_name}}")}
                        className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded"
                      >
                        + First Name
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={bulkTitle}
                    onChange={(e) => setBulkTitle(e.target.value)}
                    placeholder="e.g. Exclusive Yield Opportunity for {{first_name}}"
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                      Notification Body <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-zinc-500">Insert:</span>
                      <button
                        type="button"
                        onClick={() => insertToken(setBulkMessage, bulkMessage, "{{first_name}}")}
                        className="text-[10px] px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 rounded"
                      >
                        + First Name
                      </button>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={bulkMessage}
                    onChange={(e) => setBulkMessage(e.target.value)}
                    placeholder="Hi {{first_name}}, earn guaranteed staking returns on EasyX today..."
                    className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Type & Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Category / Type
                  </label>
                  <select
                    value={bulkType}
                    onChange={(e) => setBulkType(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    {NOTIFICATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                    Delivery Channel
                  </label>
                  <select
                    value={bulkChannel}
                    onChange={(e) => setBulkChannel(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="both">Both (In-App + Web Push)</option>
                    <option value="in_app">In-App Notification Only</option>
                    <option value="push">Push Notification Only</option>
                  </select>
                </div>
              </div>

              {/* Optional Action Button */}
              <div className="space-y-3 p-4 bg-zinc-950/60 border border-zinc-800/80 rounded-xl">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpRight className="h-3.5 w-3.5 text-indigo-400" /> Optional Action Button
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <select
                      value={bulkActionUrl}
                      onChange={(e) => {
                        const preset = PRESET_ACTION_ROUTES.find((p) => p.url === e.target.value);
                        setBulkActionUrl(e.target.value);
                        if (preset && preset.text) setBulkActionText(preset.text);
                      }}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                    >
                      {PRESET_ACTION_ROUTES.map((p, idx) => (
                        <option key={idx} value={p.url}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Button Label"
                      value={bulkActionText}
                      onChange={(e) => setBulkActionText(e.target.value)}
                      className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Submit / Confirm */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <EasyXButton
                  variant="primary"
                  size="md"
                  onClick={() => setBulkConfirmModal(true)}
                  disabled={!bulkTitle.trim() || !bulkMessage.trim()}
                >
                  <Send className="h-4 w-4 mr-1.5" /> Review & Send Campaign
                </EasyXButton>
              </div>
            </EasyXCard>
          </div>

          {/* Right Summary Card */}
          <div className="space-y-4">
            <EasyXCard className="p-5 bg-zinc-900/60 border-zinc-800 space-y-4">
              <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-indigo-400" /> Campaign Summary Guardrails
              </h4>

              <div className="space-y-3 text-xs text-zinc-400">
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 space-y-2">
                  <div className="flex justify-between">
                    <span>Audience Mode:</span>
                    <strong className="text-white">
                      {bulkMode === "segment" ? "Condition Segment" : "Manual Selection"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Target Recipients:</span>
                    <strong className="text-indigo-300">
                      {bulkMode === "segment"
                        ? `${selectedSegmentDef?.count || 0} users`
                        : `${bulkSelectedUserIds.length} users`}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Channel:</span>
                    <span className="text-zinc-200 font-semibold">{bulkChannel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Deduplication:</span>
                    <span className="text-emerald-400 font-semibold">Protected</span>
                  </div>
                </div>

                <div className="p-3 bg-indigo-950/20 border border-indigo-500/30 rounded-lg text-[11px] text-indigo-300">
                  ⚡ <strong>Safe Processing:</strong> Recipients receive individual notifications with
                  custom placeholder replacements (e.g. <code>{"{{first_name}}"}</code>). Push failures are
                  caught gracefully without breaking the campaign.
                </div>
              </div>
            </EasyXCard>
          </div>
        </div>
      )}

      {/* ==================== TAB 3: AUTOMATED REMINDERS ==================== */}
      {activeTab === "automated" && (
        <div className="space-y-6">
          {/* Global Guardrails Form */}
          <EasyXCard className="p-6 bg-zinc-900/70 border-zinc-800">
            <div className="border-b border-zinc-800 pb-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-emerald-400" /> Automated Reminder Guardrails
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Global limits ensuring no investor is spammed and quiet hours are strictly honored.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <EasyXButton
                  variant="outline"
                  size="sm"
                  onClick={() => setTestModalOpen(true)}
                >
                  <Send className="h-3.5 w-3.5 mr-1" /> Test Preview
                </EasyXButton>
                <EasyXButton
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAutomatedSettings}
                  loading={saveReminderSettings.isPending}
                >
                  Save Guardrails
                </EasyXButton>
              </div>
            </div>

            <form onSubmit={handleSaveAutomatedSettings} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Monthly Limit / User
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={globalForm.monthly_limit_per_user}
                  onChange={(e) => setGlobalForm({ ...globalForm, monthly_limit_per_user: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                />
                <span className="text-[11px] text-zinc-500">Max automated reminders/month</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Quiet Hours (UTC Start)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={globalForm.quiet_hours_start}
                  onChange={(e) => setGlobalForm({ ...globalForm, quiet_hours_start: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                />
                <span className="text-[11px] text-zinc-500">Default: 22 (10 PM UTC)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Quiet Hours (UTC End)
                </label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={globalForm.quiet_hours_end}
                  onChange={(e) => setGlobalForm({ ...globalForm, quiet_hours_end: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                />
                <span className="text-[11px] text-zinc-500">Default: 8 (8 AM UTC)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                  Push Notifications
                </label>
                <select
                  value={globalForm.push_notifications_enabled ? "true" : "false"}
                  onChange={(e) =>
                    setGlobalForm({ ...globalForm, push_notifications_enabled: e.target.value === "true" })
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                >
                  <option value="true">Enabled (Web Push Active)</option>
                  <option value="false">Disabled (In-App Only)</option>
                </select>
                <span className="text-[11px] text-zinc-500">Global web push toggle</span>
              </div>
            </form>
          </EasyXCard>

          {/* Active Workflows Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" /> Automated Workflow Rules, Schedules & Stop Conditions
              </h4>
              <span className="text-xs text-zinc-400">
                {(reminderSettings?.workflows || []).filter((w) => w.enabled).length} of {(reminderSettings?.workflows || []).length} active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(reminderSettings?.workflows || []).map((wf) => {
                const stats = (reminderAnalytics?.workflows || []).find((w) => w.key === wf.key);
                return (
                  <EasyXCard key={wf.key} className="p-5 bg-zinc-900/60 border-zinc-800 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                          {wf.category}
                        </span>
                        <h4 className="text-base font-bold text-white mt-0.5">{wf.name}</h4>
                        <span className="text-xs text-zinc-400">
                          Cadence: {wf.schedules.map((s) => `${s.delay_hours}h`).join(" → ")} → STOP
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <EasyXButton
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingWorkflow(wf);
                            setWorkflowEditForm(JSON.parse(JSON.stringify(wf)));
                          }}
                        >
                          <Sliders className="h-3.5 w-3.5 mr-1 text-emerald-400" /> Configure
                        </EasyXButton>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={wf.enabled}
                            onChange={async (e) => {
                              try {
                                await updateWorkflow.mutateAsync({
                                  key: wf.key,
                                  patch: { enabled: e.target.checked },
                                });
                                toast.success(`${wf.name} ${e.target.checked ? "enabled" : "paused"}.`);
                              } catch (err) {
                                toast.error("Failed to update workflow.");
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    </div>

                    {/* Stop Condition Explanation */}
                    <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-xs flex items-center gap-2">
                      <Shield className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <span className="font-semibold text-emerald-300">Automatic Stop Condition: </span>
                        <span className="text-zinc-300">
                          {wf.stop_condition === "has_deposit"
                            ? "Evaluates instantly & halts as soon as user deposits USDT into their wallet."
                            : wf.stop_condition === "kyc_submitted_or_approved"
                            ? "Halts as soon as user submits identity verification documents for review."
                            : wf.stop_condition === "has_active_investment"
                            ? "Halts as soon as user stakes capital into an investment plan."
                            : wf.stop_condition === "plan_renewed_or_withdrawn"
                            ? "Halts as soon as user renews their staking plan or requests a payout."
                            : "Halts once condition is met or max 3 steps reached."}
                        </span>
                      </div>
                    </div>

                    {/* Step pills */}
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-semibold text-zinc-400">Scheduled Stages & Templates:</span>
                      <div className="space-y-1.5">
                        {wf.schedules.map((s) => (
                          <div
                            key={s.stage}
                            className="p-2.5 bg-zinc-950/80 border border-zinc-800 rounded-lg text-xs flex items-center justify-between"
                          >
                            <div className="pr-2 min-w-0">
                              <span className="font-semibold text-white">Stage {s.stage} ({s.delay_hours}h delay): </span>
                              <span className="text-zinc-300 truncate">{s.title}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded shrink-0">
                              {s.action_text || "No button"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Conversion Metrics */}
                    <div className="pt-2 border-t border-zinc-800 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 bg-zinc-950/50 rounded-lg">
                        <span className="text-[10px] text-zinc-500 block">Eligible</span>
                        <strong className="text-white text-sm">{stats?.eligible_users ?? 0}</strong>
                      </div>
                      <div className="p-2 bg-zinc-950/50 rounded-lg">
                        <span className="text-[10px] text-zinc-500 block">Sent</span>
                        <strong className="text-white text-sm">{stats?.reminders_sent ?? 0}</strong>
                      </div>
                      <div className="p-2 bg-zinc-950/50 rounded-lg">
                        <span className="text-[10px] text-zinc-500 block">Converted</span>
                        <strong className="text-emerald-400 text-sm">
                          {stats?.conversion_rate ?? 0}%
                        </strong>
                      </div>
                    </div>
                  </EasyXCard>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ==================== TAB 4: UNIFIED HISTORY & LOGS ==================== */}
      {activeTab === "logs" && (
        <NotificationHistoryTable />
      )}

      {/* Modal: Personalized Preview */}
      {persPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Eye className="h-4 w-4 text-purple-400" /> Confirm Personalized Dispatch
              </h3>
              <button
                type="button"
                onClick={() => setPersPreviewModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Recipient:</span>
                  <strong className="text-white">{persSelectedUser?.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Email:</span>
                  <span className="text-zinc-300">{persSelectedUser?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Channel:</span>
                  <span className="text-purple-300 font-semibold">{persChannel}</span>
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950/80 rounded-xl border border-purple-500/30 space-y-2">
                <h5 className="font-bold text-white">
                  {persTitle.replace(/{{first_name}}/g, persSelectedUser?.name?.split(" ")?.[0] || "Investor")}
                </h5>
                <p className="text-zinc-300 whitespace-pre-wrap">
                  {persMessage.replace(/{{first_name}}/g, persSelectedUser?.name?.split(" ")?.[0] || "Investor")}
                </p>
                {persActionText && (
                  <span className="inline-block mt-2 px-3 py-1 bg-purple-600 text-white rounded text-[11px]">
                    {persActionText} ({persActionUrl})
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <EasyXButton variant="outline" size="sm" onClick={() => setPersPreviewModal(false)}>
                Cancel
              </EasyXButton>
              <EasyXButton
                variant="primary"
                size="sm"
                onClick={handleSendPersonalized}
                loading={sendPersonalized.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Confirm & Send
              </EasyXButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Bulk Campaign Confirmation */}
      {bulkConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" /> Confirm Bulk Campaign Broadcast
              </h3>
              <button
                type="button"
                onClick={() => setBulkConfirmModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Audience:</span>
                  <strong className="text-indigo-300">
                    {bulkMode === "segment" ? selectedSegmentDef?.name : `Manual (${bulkSelectedUserIds.length} users)`}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Recipients Count:</span>
                  <strong className="text-white">
                    {bulkMode === "segment" ? selectedSegmentDef?.count : bulkSelectedUserIds.length} investors
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Delivery Channel:</span>
                  <span className="text-zinc-200 font-semibold">{bulkChannel}</span>
                </div>
              </div>

              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl text-amber-300 text-[11px]">
                ⚠️ You are about to broadcast this notification to multiple investors simultaneously.
                Each investor will receive a personalized in-app card and web push notification.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <EasyXButton variant="outline" size="sm" onClick={() => setBulkConfirmModal(false)}>
                Cancel
              </EasyXButton>
              <EasyXButton
                variant="primary"
                size="sm"
                onClick={handleSendBulk}
                loading={sendBulk.isPending}
              >
                <Send className="h-3.5 w-3.5 mr-1" /> Broadcast Campaign
              </EasyXButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audience Preview */}
      {segmentPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-400" /> Audience Sample Preview
              </h3>
              <button
                type="button"
                onClick={() => setSegmentPreviewModal(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-zinc-800 text-xs">
              {previewUsersList.length === 0 ? (
                <p className="p-4 text-center text-zinc-500">No users currently in this segment.</p>
              ) : (
                previewUsersList.map((u) => (
                  <div key={u.id} className="p-2.5 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-[11px] text-zinc-400">{u.email}</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded">
                      KYC: {u.kyc_status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <EasyXButton variant="outline" size="sm" onClick={() => setSegmentPreviewModal(false)}>
                Close Preview
              </EasyXButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Test Preview Simulator */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="h-4 w-4 text-emerald-400" /> Send Test Reminder Preview
              </h3>
              <button
                type="button"
                onClick={() => setTestModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Target Workflow</label>
                <select
                  value={testWorkflowKey}
                  onChange={(e) => setTestWorkflowKey(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                >
                  {(reminderSettings?.workflows || []).map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Step / Stage</label>
                <select
                  value={testStepIndex}
                  onChange={(e) => setTestStepIndex(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white"
                >
                  <option value={0}>Stage 1 (24 Hours)</option>
                  <option value={1}>Stage 2 (3 Days)</option>
                  <option value={2}>Stage 3 (7 Days)</option>
                </select>
              </div>

              <p className="text-[11px] text-zinc-500">
                This will dispatch a sample preview notification directly to your admin notification inbox.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <EasyXButton variant="outline" size="sm" onClick={() => setTestModalOpen(false)}>
                Cancel
              </EasyXButton>
              <EasyXButton
                variant="primary"
                size="sm"
                onClick={handleSendTest}
                loading={sendTest.isPending}
              >
                Send Test
              </EasyXButton>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Workflow Schedules, Stop Condition & Message Template Configuration */}
      {editingWorkflow && workflowEditForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-emerald-400" /> Configure {editingWorkflow.name}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Adjust reminder interval delays, review automated stop conditions, and customize template messages.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingWorkflow(null);
                  setWorkflowEditForm(null);
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* General & Stop Condition Rule */}
            <div className="space-y-3 p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                    Rule Category: {workflowEditForm.category}
                  </span>
                  <h4 className="text-sm font-semibold text-white mt-0.5">{workflowEditForm.name}</h4>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs text-zinc-300">Status:</span>
                  <input
                    type="checkbox"
                    checked={workflowEditForm.enabled}
                    onChange={(e) =>
                      setWorkflowEditForm({ ...workflowEditForm, enabled: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              <div className="pt-2 border-t border-zinc-800 text-xs">
                <span className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1">
                  <Shield className="h-3.5 w-3.5" /> Stop Condition Logic:
                </span>
                <p className="text-zinc-400 text-[11px] bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
                  {editingWorkflow.stop_condition === "has_deposit" &&
                    "Stops immediately when the investor initiates/submits a valid USDT deposit or wallet balance is funded."}
                  {editingWorkflow.stop_condition === "kyc_submitted_or_approved" &&
                    "Stops immediately when the investor uploads identity verification documents (KYC status becomes 'pending' or 'approved')."}
                  {editingWorkflow.stop_condition === "has_active_investment" &&
                    "Stops immediately when the investor commits capital to any active AI staking plan."}
                  {editingWorkflow.stop_condition === "plan_renewed_or_withdrawn" &&
                    "Stops immediately when the investor either re-invests the matured capital or requests a withdrawal."}
                  {!["has_deposit", "kyc_submitted_or_approved", "has_active_investment", "plan_renewed_or_withdrawn"].includes(
                    editingWorkflow.stop_condition
                  ) && "Stops when target conversion trigger is verified."}
                </p>
              </div>
            </div>

            {/* Stages & Template Customization */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center justify-between">
                <span>Multi-Stage Schedules & Message Templates</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  Tags supported: <code>{"{{first_name}}"}</code>, <code>{"{{user_name}}"}</code>
                </span>
              </h4>

              {(workflowEditForm.schedules || []).map((stage, idx) => (
                <div
                  key={stage.stage || idx}
                  className="p-4 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                      Stage {stage.stage} Notification
                    </span>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] text-zinc-400">Delay Hours:</label>
                      <input
                        type="number"
                        min="1"
                        max="720"
                        value={stage.delay_hours}
                        onChange={(e) => {
                          const updated = [...workflowEditForm.schedules];
                          updated[idx] = { ...updated[idx], delay_hours: Number(e.target.value) };
                          setWorkflowEditForm({ ...workflowEditForm, schedules: updated });
                        }}
                        className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs text-white text-right"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block text-zinc-400 mb-1">Title Template</label>
                      <input
                        type="text"
                        value={stage.title}
                        onChange={(e) => {
                          const updated = [...workflowEditForm.schedules];
                          updated[idx] = { ...updated[idx], title: e.target.value };
                          setWorkflowEditForm({ ...workflowEditForm, schedules: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div>
                      <label className="block text-zinc-400 mb-1">Message Body Template</label>
                      <textarea
                        rows={2}
                        value={stage.message}
                        onChange={(e) => {
                          const updated = [...workflowEditForm.schedules];
                          updated[idx] = { ...updated[idx], message: e.target.value };
                          setWorkflowEditForm({ ...workflowEditForm, schedules: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Action Button Text</label>
                        <input
                          type="text"
                          value={stage.action_text || ""}
                          onChange={(e) => {
                            const updated = [...workflowEditForm.schedules];
                            updated[idx] = { ...updated[idx], action_text: e.target.value };
                            setWorkflowEditForm({ ...workflowEditForm, schedules: updated });
                          }}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-zinc-400 mb-1">Action Route URL</label>
                        <input
                          type="text"
                          value={stage.action_url || ""}
                          onChange={(e) => {
                            const updated = [...workflowEditForm.schedules];
                            updated[idx] = { ...updated[idx], action_url: e.target.value };
                            setWorkflowEditForm({ ...workflowEditForm, schedules: updated });
                          }}
                          className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingWorkflow(null);
                  setWorkflowEditForm(null);
                }}
              >
                Cancel
              </EasyXButton>
              <EasyXButton
                variant="primary"
                size="sm"
                onClick={async () => {
                  try {
                    await updateWorkflow.mutateAsync({
                      key: editingWorkflow.key,
                      patch: {
                        enabled: workflowEditForm.enabled,
                        schedules: workflowEditForm.schedules,
                      },
                    });
                    toast.success(`${editingWorkflow.name} configuration and templates updated!`);
                    setEditingWorkflow(null);
                    setWorkflowEditForm(null);
                    refetchSettings();
                  } catch (err) {
                    toast.error("Failed to save workflow changes.");
                  }
                }}
                loading={updateWorkflow.isPending}
              >
                Save Configuration
              </EasyXButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
