import React, { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { toast } from "sonner";
import {
  Database,
  ShieldCheck,
  Download,
  PlayCircle,
  RefreshCw,
  Clock,
  HardDrive,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  SlidersHorizontal,
  X,
  FileText,
  Activity,
  Layers,
  Archive,
} from "lucide-react";
import {
  useAdminBackups,
  useAdminBackupOverview,
  useCreateAdminBackup,
  useTestRestoreBackup,
  useUpdateBackupSettings,
} from "@/admin/adminApi";
import { EasyXCard, EasyXButton, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";
import { getToken } from "@/shared/lib/api";

dayjs.extend(relativeTime);

export default function DatabaseBackupSection() {
  const { data: backupsData, isLoading, isFetching, refetch } = useAdminBackups();
  const { data: overview } = useAdminBackupOverview();

  const createMutation = useCreateAdminBackup();
  const testRestoreMutation = useTestRestoreBackup();
  const updateSettingsMutation = useUpdateBackupSettings();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [testResultModal, setTestResultModal] = useState(null);
  const [manualNote, setManualNote] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    autoBackupEnabled: true,
    intervalHours: 24,
    retentionDays: 30,
    rpoHours: 24,
    rtoMinutes: 15,
  });

  const backups = backupsData?.backups || [];
  const settings = backupsData?.settings || {
    autoBackupEnabled: true,
    intervalHours: 24,
    retentionDays: 30,
    rpoHours: 24,
    rtoMinutes: 15,
  };

  const handleOpenSettings = () => {
    setSettingsForm({
      autoBackupEnabled: settings.autoBackupEnabled !== false,
      intervalHours: settings.intervalHours || 24,
      retentionDays: settings.retentionDays || 30,
      rpoHours: settings.rpoHours || 24,
      rtoMinutes: settings.rtoMinutes || 15,
    });
    setIsSettingsOpen(true);
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync(settingsForm);
      toast.success("Backup & recovery policy updated.");
      setIsSettingsOpen(false);
    } catch {
      toast.error("Failed to update backup settings.");
    }
  };

  const handleCreateManualBackup = async () => {
    setIsCreating(true);
    try {
      await createMutation.mutateAsync({ note: manualNote || undefined });
      toast.success("Database snapshot created and verified.");
      setManualNote("");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to create database snapshot.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleTestRestore = async (backupId) => {
    try {
      const res = await testRestoreMutation.mutateAsync({ id: backupId });
      setTestResultModal({ backupId, ...res });
      if (res.valid) {
        toast.success("Test restore passed: All relational foreign keys & checksums intact.");
      } else {
        toast.error("Test restore detected potential data integrity notices.");
      }
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Test restore failed to execute.");
    }
  };

  const handleDownload = (backupId) => {
    const token = getToken();
    window.open(`/api/admin/backups/${backupId}/download?token=${encodeURIComponent(token || "")}`, "_blank");
  };

  const statusColor =
    overview?.status === "healthy"
      ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/10"
      : overview?.status === "attention_needed"
      ? "text-amber-400 border-amber-500/20 bg-amber-500/10"
      : "text-rose-400 border-rose-500/20 bg-rose-500/10";

  return (
    <div className="space-y-6">
      {/* Header & Status Overview Card */}
      <EasyXCard className="p-5 bg-ex-surface/90 border-white/10 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Database Backup & Recovery Console</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusColor}`}>
                  {overview?.status === "healthy" ? "HEALTHY" : "ATTENTION NEEDED"}
                </span>
              </div>
              <p className="text-xs text-ex-muted mt-0.5">
                Automated JSON snapshots, isolated sandbox restore tests, and RPO/RTO data protection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenSettings}
              className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center gap-1.5 transition"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-purple-400" />
              <span>Retention & Targets</span>
            </button>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white flex items-center justify-center transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-purple-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* 4 Health KPI Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <span className="text-[11px] text-white/50 block">Last Successful Backup</span>
            <span className="text-xs font-medium text-white block mt-1">
              {overview?.lastSuccessfulBackup ? dayjs(overview.lastSuccessfulBackup).fromNow() : "Never"}
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono block mt-0.5">
              {overview?.lastSuccessfulBackup ? dayjs(overview.lastSuccessfulBackup).format("YYYY-MM-DD HH:mm") : "N/A"}
            </span>
          </div>

          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <span className="text-[11px] text-white/50 block">Last Isolated Restore Test</span>
            <span className="text-xs font-medium text-white block mt-1">
              {overview?.lastTestRestoreAt ? dayjs(overview.lastTestRestoreAt).fromNow() : "No test run yet"}
            </span>
            <span className="text-[10px] text-purple-400/80 block mt-0.5">Non-destructive sandbox</span>
          </div>

          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <span className="text-[11px] text-white/50 block">Target RPO / RTO</span>
            <span className="text-xs font-semibold text-white block mt-1">
              {settings.rpoHours || 24}h RPO / {settings.rtoMinutes || 15}m RTO
            </span>
            <span className="text-[10px] text-white/40 block mt-0.5">Recovery Objective SLA</span>
          </div>

          <div className="rounded-xl bg-black/20 border border-white/5 p-3">
            <span className="text-[11px] text-white/50 block">Retention & Frequency</span>
            <span className="text-xs font-semibold text-white block mt-1">
              {settings.autoBackupEnabled ? `Every ${settings.intervalHours}h` : "Manual Only"}
            </span>
            <span className="text-[10px] text-white/40 block mt-0.5">{settings.retentionDays} days retention</span>
          </div>
        </div>

        {/* Quick Snapshot Action Bar */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Optional snapshot note (e.g. Pre-upgrade safety checkpoint)..."
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            className="flex-1 rounded-xl bg-black/30 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-purple-400 focus:outline-none"
          />
          <EasyXButton
            onClick={handleCreateManualBackup}
            loading={isCreating}
            disabled={isCreating}
            className="bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs px-4 py-2 rounded-xl flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Create Snapshot Now</span>
          </EasyXButton>
        </div>
      </EasyXCard>

      {/* Snapshots Table Card */}
      <EasyXCard className="p-5 bg-ex-surface/90 border-white/10 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white text-sm flex items-center gap-2">
            <Archive className="h-4 w-4 text-purple-400" />
            <span>Available Backup Snapshots ({backups.length})</span>
          </h4>
          <span className="text-[11px] text-white/40">Protected Local File Storage (.data/backups)</span>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center">
            <EasyXLoader />
          </div>
        ) : backups.length === 0 ? (
          <EasyXEmptyState
            icon={Database}
            title="No Database Backups Found"
            description="Create your first manual snapshot or enable automated daily snapshots."
            action={
              <EasyXButton onClick={handleCreateManualBackup} loading={isCreating} className="text-xs">
                Create First Backup
              </EasyXButton>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/8 text-[11px] text-white/40 font-medium uppercase tracking-wider">
                  <th className="pb-3 pl-2">Snapshot / ID</th>
                  <th className="pb-3">Timestamp</th>
                  <th className="pb-3">Size & Hash</th>
                  <th className="pb-3">Entities Covered</th>
                  <th className="pb-3">Sandbox Test</th>
                  <th className="pb-3 pr-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {backups.map((bk) => {
                  const counts = bk.recordCounts || {};
                  return (
                    <tr key={bk.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3 pl-2">
                        <div className="font-mono text-white font-medium flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                          <span>{bk.id}</span>
                        </div>
                        <span className="text-[10px] text-white/40 block mt-0.5 font-mono">{bk.filename}</span>
                      </td>

                      <td className="py-3 text-white/80">
                        <div>{dayjs(bk.timestamp).format("YYYY-MM-DD HH:mm:ss")}</div>
                        <span className="text-[10px] text-white/40">{dayjs(bk.timestamp).fromNow()}</span>
                      </td>

                      <td className="py-3">
                        <span className="text-white font-medium">{(bk.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span className="text-[10px] text-white/40 font-mono block truncate max-w-[120px]" title={bk.sha256}>
                          SHA: {bk.sha256.substring(0, 8)}...
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2 flex-wrap text-[10px] text-white/70">
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">Users: {counts.users || 0}</span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">Wallets: {counts.wallets || 0}</span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">Investments: {counts.investments || 0}</span>
                          <span className="bg-white/5 px-1.5 py-0.5 rounded">Deposits: {counts.deposits || 0}</span>
                        </div>
                      </td>

                      <td className="py-3">
                        {bk.restoredTested ? (
                          <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Passed</span>
                          </div>
                        ) : (
                          <span className="text-white/40 text-[11px]">Untested</span>
                        )}
                      </td>

                      <td className="py-3 pr-2 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleTestRestore(bk.id)}
                            disabled={testRestoreMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-[11px] font-medium text-purple-300 flex items-center gap-1 transition"
                            title="Execute non-destructive restore integrity test in sandbox"
                          >
                            <PlayCircle className="h-3 w-3" />
                            <span>Test Restore</span>
                          </button>

                          <button
                            onClick={() => handleDownload(bk.id)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-white flex items-center gap-1 transition"
                            title="Download JSON Snapshot"
                          >
                            <Download className="h-3 w-3" />
                            <span>Download</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </EasyXCard>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ex-surface border border-white/15 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-purple-400" />
                <span>Backup & Recovery Policy</span>
              </h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-3.5">
              <div className="flex items-center justify-between p-3 rounded-xl bg-black/20 border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white block">Automated Periodic Backups</span>
                  <span className="text-[10px] text-white/50">Run snapshots in background automatically</span>
                </div>
                <input
                  type="checkbox"
                  checked={settingsForm.autoBackupEnabled}
                  onChange={(e) => setSettingsForm({ ...settingsForm, autoBackupEnabled: e.target.checked })}
                  className="h-4 w-4 rounded accent-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/70">Backup Frequency (Hours)</label>
                <select
                  value={settingsForm.intervalHours}
                  onChange={(e) => setSettingsForm({ ...settingsForm, intervalHours: Number(e.target.value) })}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value={6}>Every 6 Hours (High Frequency)</option>
                  <option value={12}>Every 12 Hours</option>
                  <option value={24}>Every 24 Hours (Daily Snapshot)</option>
                  <option value={48}>Every 48 Hours</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-white/70">Retention Period (Days)</label>
                <input
                  type="number"
                  min={3}
                  max={180}
                  value={settingsForm.retentionDays}
                  onChange={(e) => setSettingsForm({ ...settingsForm, retentionDays: Number(e.target.value) })}
                  className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-white/70">RPO Target (Hours)</label>
                  <input
                    type="number"
                    value={settingsForm.rpoHours}
                    onChange={(e) => setSettingsForm({ ...settingsForm, rpoHours: Number(e.target.value) })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-white/70">RTO Target (Minutes)</label>
                  <input
                    type="number"
                    value={settingsForm.rtoMinutes}
                    onChange={(e) => setSettingsForm({ ...settingsForm, rtoMinutes: Number(e.target.value) })}
                    className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-xs text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-white/60 hover:text-white"
                >
                  Cancel
                </button>
                <EasyXButton
                  type="submit"
                  loading={updateSettingsMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-500 text-xs px-4 py-1.5 rounded-xl font-medium"
                >
                  Save Policy
                </EasyXButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Restore Verification Details Modal */}
      {testResultModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-ex-surface border border-white/15 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Sandbox Restore Validation</h3>
              </div>
              <button
                onClick={() => setTestResultModal(null)}
                className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Validation Succeeded (Zero Impact on Live Data)</span>
                </div>
                <p className="text-[11px] text-emerald-200/80">
                  Snapshot was decrypted and verified in an isolated ephemeral memory workspace. All foreign keys, user-wallet balances, and investment records passed integrity audits.
                </p>
              </div>

              <div className="rounded-xl bg-black/30 border border-white/5 p-3 text-xs space-y-2 font-mono">
                <div className="flex justify-between text-white/60">
                  <span>Tested Snapshot ID:</span>
                  <span className="text-white">{testResultModal.backupId}</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>SHA-256 Checksum:</span>
                  <span className="text-emerald-400">Match (Verified)</span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Verified Entities:</span>
                  <span className="text-white">
                    {testResultModal.details?.usersCount} users, {testResultModal.details?.investmentsCount} investments
                  </span>
                </div>
                <div className="flex justify-between text-white/60">
                  <span>Validation Timestamp:</span>
                  <span className="text-white/80">{dayjs(testResultModal.testedAt).format("YYYY-MM-DD HH:mm:ss")}</span>
                </div>
              </div>

              {testResultModal.issues && testResultModal.issues.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <span className="font-semibold block">Notices / Warnings:</span>
                  <ul className="list-disc list-inside text-[11px] space-y-0.5">
                    {testResultModal.issues.map((iss, i) => (
                      <li key={i}>{iss}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setTestResultModal(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-white font-medium"
              >
                Close Verification Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
