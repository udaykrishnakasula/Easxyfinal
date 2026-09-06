import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Database,
  Download,
  Trash2,
  Sliders,
  Shield,
  Clock,
  FileSpreadsheet,
  FileCode,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  useAdminMonitoringSettings,
  useSaveAdminMonitoringSettings,
  usePruneMonitoringData,
  exportMonitoringData,
} from "@/admin/adminApi";
import { EasyXLoader } from "@/design/EasyX";

export default function DataRetentionModal({ isOpen, onClose }) {
  const { data: settingsData, isLoading } = useAdminMonitoringSettings();
  const saveMutation = useSaveAdminMonitoringSettings();
  const pruneMutation = usePruneMonitoringData();

  const [formData, setFormData] = useState({
    retentionDays: 30,
    maxStoredErrors: 1000,
    maxStoredEvents: 2000,
    sampleRate: 1.0,
    enableConsoleCapture: true,
    enableUnhandledPromiseCapture: true,
    enableRageClickCapture: true,
    slaErrorRateAlertPercent: 5.0,
  });

  const [pruneDays, setPruneDays] = useState(30);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (settingsData) {
      setFormData({
        retentionDays: settingsData.retentionDays || 30,
        maxStoredErrors: settingsData.maxStoredErrors || 1000,
        maxStoredEvents: settingsData.maxStoredEvents || 2000,
        sampleRate: settingsData.sampleRate ?? 1.0,
        enableConsoleCapture: settingsData.enableConsoleCapture ?? true,
        enableUnhandledPromiseCapture: settingsData.enableUnhandledPromiseCapture ?? true,
        enableRageClickCapture: settingsData.enableRageClickCapture ?? true,
        slaErrorRateAlertPercent: settingsData.slaErrorRateAlertPercent || 5.0,
      });
    }
  }, [settingsData]);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await saveMutation.mutateAsync(formData);
      toast.success("Monitoring system settings saved successfully.");
    } catch {
      toast.error("Failed to save monitoring settings.");
    }
  };

  const handlePrune = async () => {
    if (
      !window.confirm(
        `Are you sure you want to prune logs older than ${pruneDays} days? This will permanently delete aged error and activity records.`
      )
    ) {
      return;
    }
    try {
      const res = await pruneMutation.mutateAsync({ days: pruneDays });
      toast.success(
        `Prune completed. Removed ${res.pruned?.eventsPruned || 0} events and ${
          res.pruned?.errorsPruned || 0
        } error records.`
      );
    } catch {
      toast.error("Prune operation failed.");
    }
  };

  const handleExport = async (type, format) => {
    setIsExporting(true);
    try {
      await exportMonitoringData({ type, format });
      toast.success(`Exported ${type} in ${format.toUpperCase()} format.`);
    } catch {
      toast.error("Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-ex-card-bg border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between gap-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ex-text flex items-center gap-2">
                Monitoring Storage, Retention & Export
              </h3>
              <p className="text-xs text-ex-muted mt-0.5">
                Configure log retention windows, data pruning, sampling, and export diagnostic logs.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-ex-muted hover:text-white hover:bg-white/5 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {isLoading ? (
            <div className="py-12 flex justify-center">
              <EasyXLoader size="md" />
            </div>
          ) : (
            <>
              {/* 1. Export Section */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Download className="h-4 w-4 text-purple-400" />
                      Export Observability Logs
                    </h4>
                    <p className="text-[11px] text-ex-muted">
                      Download full sanitized monitoring events or diagnostic errors.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    disabled={isExporting}
                    onClick={() => handleExport("errors", "csv")}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                    <span>Export Errors (CSV)</span>
                  </button>

                  <button
                    disabled={isExporting}
                    onClick={() => handleExport("errors", "json")}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition"
                  >
                    <FileCode className="h-4 w-4 text-blue-400" />
                    <span>Export Errors (JSON)</span>
                  </button>

                  <button
                    disabled={isExporting}
                    onClick={() => handleExport("events", "csv")}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-purple-400" />
                    <span>Export Events (CSV)</span>
                  </button>

                  <button
                    disabled={isExporting}
                    onClick={() => handleExport("events", "json")}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white flex items-center justify-center gap-2 transition"
                  >
                    <FileCode className="h-4 w-4 text-amber-400" />
                    <span>Export Events (JSON)</span>
                  </button>
                </div>
              </div>

              {/* 2. Retention Settings Form */}
              <form onSubmit={handleSave} className="space-y-4">
                <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sliders className="h-4 w-4 text-purple-400" />
                  Retention & Capture Rules
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-ex-muted block mb-1.5">
                      Retention Window (Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.retentionDays}
                      onChange={(e) =>
                        setFormData({ ...formData, retentionDays: Number(e.target.value) })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-ex-muted block mb-1.5">
                      SLA Error Rate Threshold (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0.1}
                      max={100}
                      value={formData.slaErrorRateAlertPercent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slaErrorRateAlertPercent: Number(e.target.value),
                        })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-ex-muted block mb-1.5">
                      Max In-Memory Error Records
                    </label>
                    <input
                      type="number"
                      min={100}
                      max={10000}
                      value={formData.maxStoredErrors}
                      onChange={(e) =>
                        setFormData({ ...formData, maxStoredErrors: Number(e.target.value) })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-ex-muted block mb-1.5">
                      Max In-Memory Event Records
                    </label>
                    <input
                      type="number"
                      min={500}
                      max={20000}
                      value={formData.maxStoredEvents}
                      onChange={(e) =>
                        setFormData({ ...formData, maxStoredEvents: Number(e.target.value) })
                      }
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Toggles */}
                <div className="pt-2 space-y-2">
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/5 transition">
                    <span className="text-xs text-ex-text">Capture Uncaught Window JS Errors</span>
                    <input
                      type="checkbox"
                      checked={formData.enableConsoleCapture}
                      onChange={(e) =>
                        setFormData({ ...formData, enableConsoleCapture: e.target.checked })
                      }
                      className="rounded accent-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/5 transition">
                    <span className="text-xs text-ex-text">Capture Unhandled Promise Rejections</span>
                    <input
                      type="checkbox"
                      checked={formData.enableUnhandledPromiseCapture}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          enableUnhandledPromiseCapture: e.target.checked,
                        })
                      }
                      className="rounded accent-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/5 transition">
                    <span className="text-xs text-ex-text">Capture UI Rage Clicks & Dead Clicks</span>
                    <input
                      type="checkbox"
                      checked={formData.enableRageClickCapture}
                      onChange={(e) =>
                        setFormData({ ...formData, enableRageClickCapture: e.target.checked })
                      }
                      className="rounded accent-purple-500"
                    />
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={saveMutation.isPending}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{saveMutation.isPending ? "Saving..." : "Save Settings"}</span>
                  </button>
                </div>
              </form>

              {/* 3. Manual Pruning Danger Zone */}
              <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/20 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <Trash2 className="h-4 w-4" />
                      Manual Database Pruning
                    </h4>
                    <p className="text-[11px] text-ex-muted mt-0.5">
                      Immediately purge logs older than the specified day threshold to free memory.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={pruneDays}
                      onChange={(e) => setPruneDays(Number(e.target.value))}
                      className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      <option value={7}>Older than 7 days</option>
                      <option value={14}>Older than 14 days</option>
                      <option value={30}>Older than 30 days</option>
                      <option value={60}>Older than 60 days</option>
                      <option value={90}>Older than 90 days</option>
                    </select>

                    <button
                      onClick={handlePrune}
                      disabled={pruneMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-red-600/80 hover:bg-red-500 text-white text-xs font-semibold transition"
                    >
                      {pruneMutation.isPending ? "Pruning..." : "Prune Now"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/[0.02] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-medium border border-white/10 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
