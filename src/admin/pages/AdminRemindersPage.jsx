import React, { useState } from "react";
import {
  BellRing,
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
  Users,
  ChevronRight,
  Filter,
  Eye,
  Info,
  Calendar,
  X,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useAdminReminderSettings,
  useSaveAdminReminderSettings,
  useUpdateAdminReminderWorkflow,
  useAdminReminderAnalytics,
  useAdminReminderLogs,
  useRunReminderSweep,
  useSendTestReminder,
} from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXEmptyState,
} from "@/design/EasyX";

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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/20" title={reason}>
        <UserCheck className="h-3 w-3" /> Converted / Stopped
      </span>
    );
  }
  if (status === "SKIPPED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20" title={reason}>
        <VolumeX className="h-3 w-3" /> Skipped
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/20" title={reason}>
      <AlertTriangle className="h-3 w-3" /> {status}
    </span>
  );
}

function categoryIcon(category) {
  switch (category) {
    case "deposit":
      return Inbox;
    case "kyc":
      return BadgeCheck;
    case "investment":
      return PiggyBank;
    case "activity":
      return Users;
    default:
      return BellRing;
  }
}

export default function AdminRemindersPage() {
  const { data: settings, isLoading: settingsLoading, refetch: refetchSettings } = useAdminReminderSettings();
  const { data: analytics, isLoading: analyticsLoading, refetch: refetchAnalytics } = useAdminReminderAnalytics();
  
  const [logFilterWorkflow, setLogFilterWorkflow] = useState("");
  const [logFilterStatus, setLogFilterStatus] = useState("");
  const [logPage, setLogPage] = useState(1);

  const { data: logsData, isLoading: logsLoading, refetch: refetchLogs } = useAdminReminderLogs({
    workflow: logFilterWorkflow || undefined,
    status: logFilterStatus || undefined,
    page: logPage,
    limit: 25,
  });

  const saveSettings = useSaveAdminReminderSettings();
  const updateWorkflow = useUpdateAdminReminderWorkflow();
  const runSweep = useRunReminderSweep();
  const sendTest = useSendTestReminder();

  // Global settings state
  const [globalForm, setGlobalForm] = useState({
    enabled: true,
    max_reminders_per_user_per_month: 4,
    quiet_hours_start_utc: 22,
    quiet_hours_end_utc: 7,
    push_enabled: true,
  });

  const [testModalOpen, setTestModalOpen] = useState(false);
  const [testWorkflowKey, setTestWorkflowKey] = useState("registered_no_deposit");
  const [testStepIndex, setTestStepIndex] = useState(0);

  // Sync settings when loaded
  React.useEffect(() => {
    if (settings?.global) {
      setGlobalForm({
        enabled: settings.global.enabled !== false,
        max_reminders_per_user_per_month: settings.global.max_reminders_per_user_per_month || 4,
        quiet_hours_start_utc: settings.global.quiet_hours_start_utc ?? 22,
        quiet_hours_end_utc: settings.global.quiet_hours_end_utc ?? 7,
        push_enabled: settings.global.push_enabled !== false,
      });
    }
  }, [settings]);

  const handleSaveGlobal = async (e) => {
    e.preventDefault();
    try {
      await saveSettings.mutateAsync({
        global: {
          enabled: globalForm.enabled,
          max_reminders_per_user_per_month: Number(globalForm.max_reminders_per_user_per_month),
          quiet_hours_start_utc: Number(globalForm.quiet_hours_start_utc),
          quiet_hours_end_utc: Number(globalForm.quiet_hours_end_utc),
          push_enabled: globalForm.push_enabled,
        },
      });
      toast.success("Global reminder guardrails saved.");
    } catch (err) {
      toast.error(apiError(err, "Failed to save global settings"));
    }
  };

  const handleToggleWorkflow = async (workflowKey, currentEnabled) => {
    try {
      await updateWorkflow.mutateAsync({
        key: workflowKey,
        patch: { enabled: !currentEnabled },
      });
      toast.success(`Workflow '${workflowKey}' ${!currentEnabled ? "enabled" : "disabled"}.`);
    } catch (err) {
      toast.error(apiError(err, "Failed to update workflow"));
    }
  };

  const handleRunSweepNow = async () => {
    try {
      const res = await runSweep.mutateAsync();
      const count = res?.result?.sent_count ?? 0;
      const stopped = res?.result?.stopped_count ?? 0;
      const skipped = res?.result?.skipped_count ?? 0;
      toast.success(`Sweep completed: ${count} sent, ${stopped} stopped, ${skipped} skipped.`);
      refetchLogs();
      refetchAnalytics();
    } catch (err) {
      toast.error(apiError(err, "Sweep execution failed"));
    }
  };

  const handleSendTest = async () => {
    try {
      const res = await sendTest.mutateAsync({
        workflow_key: testWorkflowKey,
        step_index: Number(testStepIndex),
      });
      toast.success(`Test preview notification sent to ${res.preview?.email || "admin"}!`);
      setTestModalOpen(false);
      refetchLogs();
    } catch (err) {
      toast.error(apiError(err, "Failed to send test preview"));
    }
  };

  if (settingsLoading || analyticsLoading) {
    return (
      <div className="p-8">
        <EasyXLoader text="Loading Automated Reminder System..." />
      </div>
    );
  }

  const workflows = settings?.workflows || [];
  const overview = analytics?.overview || {};

  return (
    <div className="space-y-6" data-testid="admin-reminders-page">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Automated Reminders"
          description="Condition-first reminder engine designed to educate and guide users without unsolicited messaging."
        />

        <div className="flex items-center gap-2 flex-wrap">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => {
              refetchSettings();
              refetchAnalytics();
              refetchLogs();
            }}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </EasyXButton>

          <EasyXButton
            variant="secondary"
            size="sm"
            onClick={() => setTestModalOpen(true)}
            className="flex items-center gap-2"
            data-testid="reminder-test-preview-btn"
          >
            <Eye className="h-4 w-4 text-ex-lav-300" />
            Preview Message
          </EasyXButton>

          <EasyXButton
            size="sm"
            onClick={handleRunSweepNow}
            loading={runSweep.isPending}
            disabled={runSweep.isPending}
            className="flex items-center gap-2 bg-ex-accent text-ex-ink font-bold"
            data-testid="reminder-run-sweep-btn"
          >
            <Play className="h-4 w-4 fill-current" />
            Run Sweep Now
          </EasyXButton>
        </div>
      </div>

      {/* 1. Analytics & Health Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8 space-y-1">
          <div className="text-[11px] font-medium text-ex-muted flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-ex-accent" /> Active Workflows
          </div>
          <div className="text-xl font-extrabold text-white">
            {overview.active_workflows || 0} <span className="text-xs font-normal text-white/50">/ {overview.total_workflows || 5}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium">Automatic evaluation on</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8 space-y-1">
          <div className="text-[11px] font-medium text-ex-muted flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5 text-blue-400" /> Total Reminders Sent
          </div>
          <div className="text-xl font-extrabold text-white">
            {overview.total_reminders_sent || 0}
          </div>
          <div className="text-[10px] text-white/50 font-medium">Across all users</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8 space-y-1">
          <div className="text-[11px] font-medium text-ex-muted flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-emerald-400" /> Completed Actions
          </div>
          <div className="text-xl font-extrabold text-emerald-400">
            {overview.total_actions_completed || 0}
          </div>
          <div className="text-[10px] text-emerald-300 font-medium">Actions taken after reminder</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8 space-y-1">
          <div className="text-[11px] font-medium text-ex-muted flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-ex-accent" /> Conversion Rate
          </div>
          <div className="text-xl font-extrabold text-white">
            {overview.overall_conversion_rate_pct || 0}%
          </div>
          <div className="text-[10px] text-ex-lav-300 font-medium">Completed / Sent ratio</div>
        </EasyXCard>

        <EasyXCard className="p-4 bg-ex-surface/80 border-white/8 space-y-1">
          <div className="text-[11px] font-medium text-ex-muted flex items-center gap-1.5">
            <BellRing className="h-3.5 w-3.5 text-purple-400" /> Push Subscribers
          </div>
          <div className="text-xl font-extrabold text-white">
            {overview.web_push_subscribers || 0}
          </div>
          <div className="text-[10px] text-purple-300 font-medium">Active browser tokens</div>
        </EasyXCard>
      </div>

      {/* 2. Global System Guardrails */}
      <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-4">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ex-accent/15 text-ex-accent border border-ex-accent/20">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Global Delivery Guardrails</h3>
              <p className="text-xs text-ex-muted">Anti-spam caps, quiet hours, and channel toggles</p>
            </div>
          </div>
          <EasyXButton
            size="sm"
            onClick={handleSaveGlobal}
            loading={saveSettings.isPending}
            className="bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
          >
            Save Guardrails
          </EasyXButton>
        </div>

        <form onSubmit={handleSaveGlobal} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div>
              <div className="font-semibold text-white">Master Engine Switch</div>
              <div className="text-[11px] text-ex-muted">Enable automated sweeps</div>
            </div>
            <input
              type="checkbox"
              checked={globalForm.enabled}
              onChange={(e) => setGlobalForm({ ...globalForm, enabled: e.target.checked })}
              className="h-4 w-4 accent-ex-accent cursor-pointer"
            />
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
            <label className="font-semibold text-white block">Monthly Limit / User</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="20"
                value={globalForm.max_reminders_per_user_per_month}
                onChange={(e) => setGlobalForm({ ...globalForm, max_reminders_per_user_per_month: Number(e.target.value) })}
                className="w-full bg-ex-surface border border-white/10 rounded px-2.5 py-1 text-white font-mono text-xs focus:border-ex-accent outline-none"
              />
              <span className="text-ex-muted text-[11px]">max/mo</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/5 space-y-1">
            <label className="font-semibold text-white block flex items-center gap-1">
              <Clock className="h-3 w-3 text-ex-muted" /> Quiet Hours (UTC)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="23"
                value={globalForm.quiet_hours_start_utc}
                onChange={(e) => setGlobalForm({ ...globalForm, quiet_hours_start_utc: Number(e.target.value) })}
                className="w-16 bg-ex-surface border border-white/10 rounded px-2 py-1 text-white font-mono text-xs text-center"
              />
              <span className="text-white/40">to</span>
              <input
                type="number"
                min="0"
                max="23"
                value={globalForm.quiet_hours_end_utc}
                onChange={(e) => setGlobalForm({ ...globalForm, quiet_hours_end_utc: Number(e.target.value) })}
                className="w-16 bg-ex-surface border border-white/10 rounded px-2 py-1 text-white font-mono text-xs text-center"
              />
              <span className="text-ex-muted text-[10px]">UTC</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-white/5">
            <div>
              <div className="font-semibold text-white">Browser Push</div>
              <div className="text-[11px] text-ex-muted">Forward to Web Push</div>
            </div>
            <input
              type="checkbox"
              checked={globalForm.push_enabled}
              onChange={(e) => setGlobalForm({ ...globalForm, push_enabled: e.target.checked })}
              className="h-4 w-4 accent-ex-accent cursor-pointer"
            />
          </div>
        </form>
      </EasyXCard>

      {/* 3. Workflows Configuration Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Sliders className="h-4 w-4 text-ex-accent" /> Active Reminder Workflows
          </h3>
          <span className="text-xs text-ex-muted">Evaluation runs automatically every 60 seconds</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((wf) => {
            const Icon = categoryIcon(wf.category);
            const wfAnalytics = (analytics?.workflow_stats || []).find((s) => s.workflow_key === wf.key) || {};

            return (
              <EasyXCard
                key={wf.key}
                data-testid={`workflow-card-${wf.key}`}
                className={`p-4 bg-ex-surface/80 border transition flex flex-col justify-between ${
                  wf.enabled ? "border-white/10" : "border-white/5 opacity-70"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`grid h-8 w-8 place-items-center rounded-lg ${
                          wf.enabled
                            ? "bg-ex-accent/15 text-ex-accent border border-ex-accent/20"
                            : "bg-white/5 text-ex-muted"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{wf.name}</div>
                        <div className="text-[10px] text-ex-muted uppercase tracking-wider">{wf.category}</div>
                      </div>
                    </div>

                    <button
                      type="button"
                      role="switch"
                      aria-checked={wf.enabled}
                      onClick={() => handleToggleWorkflow(wf.key, wf.enabled)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                        wf.enabled ? "bg-ex-accent" : "bg-white/15"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${
                          wf.enabled ? "translate-x-4 bg-ex-ink" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>

                  <p className="text-[11px] text-white/70 leading-relaxed min-h-[34px]">
                    {wf.description}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5 space-y-1.5 text-[11px]">
                    <div className="flex items-center justify-between text-ex-muted">
                      <span>Stop Condition:</span>
                      <span className="text-white/80 font-medium truncate max-w-[170px]" title={wf.stop_condition_description}>
                        {wf.stop_condition_description}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-ex-muted">
                      <span>Max Reminders:</span>
                      <span className="text-white font-mono">{wf.max_reminders} total</span>
                    </div>
                    <div className="flex items-center justify-between text-ex-muted">
                      <span>Cadence Schedule:</span>
                      <span className="text-ex-lav-300 font-mono">
                        {wf.schedules.map((s) => `+${s.delay_hours}h`).join(" ➔ ")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-3">
                    <span className="text-ex-muted">Sent: <strong className="text-white">{wfAnalytics.sent || 0}</strong></span>
                    <span className="text-emerald-400 font-medium">Conv: {wfAnalytics.conversion_rate || 0}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTestWorkflowKey(wf.key);
                      setTestStepIndex(0);
                      setTestModalOpen(true);
                    }}
                    className="text-ex-accent hover:underline flex items-center gap-0.5"
                  >
                    Preview <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
              </EasyXCard>
            );
          })}
        </div>
      </div>

      {/* 4. Live Reminder Delivery & Audit Logs */}
      <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-4" data-testid="reminder-logs-section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-white text-base">Reminder Dispatch Logs</h3>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70 font-mono">
              {logsData?.total || 0} total events
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
              <Filter className="h-3.5 w-3.5 text-ex-muted" />
              <select
                value={logFilterWorkflow}
                onChange={(e) => {
                  setLogFilterWorkflow(e.target.value);
                  setLogPage(1);
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="" className="bg-ex-surface text-white">All Workflows</option>
                {workflows.map((w) => (
                  <option key={w.key} value={w.key} className="bg-ex-surface text-white">
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1">
              <select
                value={logFilterStatus}
                onChange={(e) => {
                  setLogFilterStatus(e.target.value);
                  setLogPage(1);
                }}
                className="bg-transparent text-white text-xs outline-none cursor-pointer"
              >
                <option value="" className="bg-ex-surface text-white">All Statuses</option>
                <option value="SENT" className="bg-ex-surface text-white">SENT</option>
                <option value="STOPPED" className="bg-ex-surface text-white">STOPPED / CONVERTED</option>
                <option value="SKIPPED" className="bg-ex-surface text-white">SKIPPED</option>
                <option value="FAILED" className="bg-ex-surface text-white">FAILED</option>
              </select>
            </div>
          </div>
        </div>

        {logsLoading ? (
          <div className="py-8">
            <EasyXLoader text="Loading logs..." />
          </div>
        ) : !logsData?.logs || logsData.logs.length === 0 ? (
          <div className="py-6">
            <EasyXEmptyState
              icon={BellRing}
              title="No reminder events logged yet"
              note="When the background engine evaluates users and dispatches reminders, activity will appear here."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-ex-muted font-medium">
                  <th className="pb-2.5 pl-1">User</th>
                  <th className="pb-2.5">Workflow</th>
                  <th className="pb-2.5">Step / Message</th>
                  <th className="pb-2.5">Status</th>
                  <th className="pb-2.5">Push</th>
                  <th className="pb-2.5">Dispatched At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logsData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 pl-1">
                      <div className="font-semibold text-white">{log.user?.name}</div>
                      <div className="text-[11px] text-ex-muted font-mono">{log.user?.email}</div>
                    </td>
                    <td className="py-3">
                      <span className="font-medium text-white">{log.workflow_key}</span>
                    </td>
                    <td className="py-3 max-w-[280px]">
                      <div className="font-medium text-white/90 truncate">{log.title}</div>
                      <div className="text-[11px] text-ex-muted truncate">{log.body}</div>
                    </td>
                    <td className="py-3">
                      <StatusBadge status={log.status} reason={log.skip_reason} />
                    </td>
                    <td className="py-3">
                      {log.push_sent ? (
                        <span className="text-purple-300 font-semibold text-[11px]">Delivered</span>
                      ) : (
                        <span className="text-white/40 text-[11px]">In-app</span>
                      )}
                    </td>
                    <td className="py-3 text-ex-muted text-[11px] font-mono whitespace-nowrap">
                      {dayjs(log.created_at).format("YYYY-MM-DD HH:mm:ss")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {logsData.totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-white/8 text-xs text-ex-muted">
                <div>
                  Page {logPage} of {logsData.totalPages}
                </div>
                <div className="flex items-center gap-2">
                  <EasyXButton
                    variant="outline"
                    size="sm"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </EasyXButton>
                  <EasyXButton
                    variant="outline"
                    size="sm"
                    disabled={logPage >= logsData.totalPages}
                    onClick={() => setLogPage((p) => p + 1)}
                  >
                    Next
                  </EasyXButton>
                </div>
              </div>
            )}
          </div>
        )}
      </EasyXCard>

      {/* Test Preview Modal */}
      {testModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-ex-surface border border-white/10 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Send className="h-5 w-5 text-ex-accent" />
                <h3 className="font-bold text-white text-base">Send Live Test Preview</h3>
              </div>
              <button
                onClick={() => setTestModalOpen(false)}
                className="text-ex-muted hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-ex-muted">
              Sends an interactive preview reminder directly to your current admin account to test interpolation tokens (<code>{"{{first_name}}"}</code>, <code>{"{{user_name}}"}</code>) and CTA button routing.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-white block mb-1">Select Workflow</label>
                <select
                  value={testWorkflowKey}
                  onChange={(e) => {
                    setTestWorkflowKey(e.target.value);
                    setTestStepIndex(0);
                  }}
                  className="w-full bg-ex-bg border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                >
                  {workflows.map((w) => (
                    <option key={w.key} value={w.key}>
                      {w.name} ({w.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-white block mb-1">Cadence Step Index</label>
                <select
                  value={testStepIndex}
                  onChange={(e) => setTestStepIndex(Number(e.target.value))}
                  className="w-full bg-ex-bg border border-white/10 rounded-lg px-3 py-2 text-white outline-none"
                >
                  {workflows
                    .find((w) => w.key === testWorkflowKey)
                    ?.schedules.map((s, idx) => (
                      <option key={idx} value={idx}>
                        Step {idx + 1}: +{s.delay_hours}h delay — "{s.title}"
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <EasyXButton
                variant="outline"
                size="sm"
                onClick={() => setTestModalOpen(false)}
              >
                Cancel
              </EasyXButton>
              <EasyXButton
                size="sm"
                onClick={handleSendTest}
                loading={sendTest.isPending}
                className="bg-ex-accent text-ex-ink font-bold"
              >
                Dispatch Test Notification
              </EasyXButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
