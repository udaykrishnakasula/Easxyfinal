import React, { useState, useEffect } from "react";
import { Clock, ShieldAlert, Zap, RefreshCw, CheckCircle2, Save, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  useAdminSupportSlaConfig,
  useAdminUpdateSupportSlaConfig,
  useAdminEvaluateSupportSla,
} from "@/admin/adminApi";
import { EasyXModal, EasyXButton } from "@/design/EasyX";

export default function AdminSupportSlaModal({ open, onOpenChange }) {
  const { data: slaData, isLoading } = useAdminSupportSlaConfig();
  const updateMutation = useAdminUpdateSupportSlaConfig();
  const evaluateMutation = useAdminEvaluateSupportSla();

  const [form, setForm] = useState({
    enabled: true,
    auto_escalation_enabled: true,
    rules: {
      LOW: { first_response_target_minutes: 720, resolution_target_minutes: 2880, auto_escalate_after_minutes: 0, escalate_to_priority: null },
      NORMAL: { first_response_target_minutes: 240, resolution_target_minutes: 1440, auto_escalate_after_minutes: 360, escalate_to_priority: "HIGH" },
      HIGH: { first_response_target_minutes: 60, resolution_target_minutes: 480, auto_escalate_after_minutes: 120, escalate_to_priority: "URGENT" },
      URGENT: { first_response_target_minutes: 15, resolution_target_minutes: 120, auto_escalate_after_minutes: 30, escalate_to_priority: null },
    },
  });

  useEffect(() => {
    if (slaData?.config) {
      setForm(slaData.config);
    }
  }, [slaData]);

  const handleRuleChange = (priority, field, value) => {
    const num = Math.max(0, parseInt(value, 10) || 0);
    setForm((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [priority]: {
          ...prev.rules[priority],
          [field]: num,
        },
      },
    }));
  };

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync(form);
      toast.success("SLA & Auto-Escalation configuration saved successfully.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to update SLA configuration.");
    }
  };

  const handleRunEvaluation = async () => {
    try {
      const res = await evaluateMutation.mutateAsync();
      const count = res?.escalated_count || 0;
      toast.success(`SLA Evaluation completed. ${count} ticket(s) escalated.`);
    } catch (err) {
      toast.error("Failed to run SLA evaluation.");
    }
  };

  return (
    <EasyXModal
      open={open}
      onOpenChange={onOpenChange}
      title="SLA & Escalation Rules Engine"
      description="Configure response-time benchmarks, deadline tracking, and automatic queue escalation rules for customer support tickets."
    >
      <div className="space-y-5 text-xs text-white pt-2 max-h-[75vh] overflow-y-auto pr-1">
        {/* Global Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-3 rounded-ex-surface bg-white/[0.04] border border-white/10 cursor-pointer hover:bg-white/[0.06] transition">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
              className="mt-0.5 rounded text-ex-primary focus:ring-ex-primary/50"
            />
            <div>
              <div className="font-semibold text-white">Enable SLA Tracking</div>
              <div className="text-[11px] text-white/50">Calculate deadlines and flag overdue first responses and resolutions.</div>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3 rounded-ex-surface bg-white/[0.04] border border-white/10 cursor-pointer hover:bg-white/[0.06] transition">
            <input
              type="checkbox"
              checked={form.auto_escalation_enabled}
              onChange={(e) => setForm({ ...form, auto_escalation_enabled: e.target.checked })}
              className="mt-0.5 rounded text-ex-primary focus:ring-ex-primary/50"
            />
            <div>
              <div className="font-semibold text-amber-300">Automatic Escalation</div>
              <div className="text-[11px] text-white/50">Auto-elevate unattended tickets when response SLA target is breached.</div>
            </div>
          </label>
        </div>

        {/* Priority SLA Rules Matrix */}
        <div className="space-y-3">
          <h4 className="font-bold text-white text-xs uppercase tracking-wider text-white/70">
            Priority SLA Targets & Escalation Thresholds
          </h4>

          {/* URGENT */}
          <div className="p-3.5 rounded-ex-surface bg-red-500/10 border border-red-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-red-300 text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                URGENT PRIORITY
              </span>
              <span className="text-[10px] text-red-300/70 font-mono">Highest Service Tier</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">1st Response Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.URGENT?.first_response_target_minutes || 15}
                    onChange={(e) => handleRuleChange("URGENT", "first_response_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-red-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Resolution Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.URGENT?.resolution_target_minutes || 120}
                    onChange={(e) => handleRuleChange("URGENT", "resolution_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-red-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Auto-Escalate If No Reply</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={form.rules?.URGENT?.auto_escalate_after_minutes || 30}
                    onChange={(e) => handleRuleChange("URGENT", "auto_escalate_after_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-red-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* HIGH */}
          <div className="p-3.5 rounded-ex-surface bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                HIGH PRIORITY
              </span>
              <span className="text-[10px] text-amber-300/70 font-mono">Escalates to URGENT if breached</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">1st Response Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.HIGH?.first_response_target_minutes || 60}
                    onChange={(e) => handleRuleChange("HIGH", "first_response_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-amber-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Resolution Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.HIGH?.resolution_target_minutes || 480}
                    onChange={(e) => handleRuleChange("HIGH", "resolution_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-amber-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Auto-Escalate If No Reply</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={form.rules?.HIGH?.auto_escalate_after_minutes || 120}
                    onChange={(e) => handleRuleChange("HIGH", "auto_escalate_after_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-amber-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* NORMAL */}
          <div className="p-3.5 rounded-ex-surface bg-sky-500/10 border border-sky-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sky-300 text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                NORMAL PRIORITY
              </span>
              <span className="text-[10px] text-sky-300/70 font-mono">Escalates to HIGH if breached</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">1st Response Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.NORMAL?.first_response_target_minutes || 240}
                    onChange={(e) => handleRuleChange("NORMAL", "first_response_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-sky-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Resolution Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.NORMAL?.resolution_target_minutes || 1440}
                    onChange={(e) => handleRuleChange("NORMAL", "resolution_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-sky-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Auto-Escalate If No Reply</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={form.rules?.NORMAL?.auto_escalate_after_minutes || 360}
                    onChange={(e) => handleRuleChange("NORMAL", "auto_escalate_after_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-sky-500/40 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
            </div>
          </div>

          {/* LOW */}
          <div className="p-3.5 rounded-ex-surface bg-white/[0.03] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white/80 text-xs flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-white/40" />
                LOW PRIORITY
              </span>
              <span className="text-[10px] text-white/40 font-mono">Standard Queue</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] text-white/60 mb-1">1st Response Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.LOW?.first_response_target_minutes || 720}
                    onChange={(e) => handleRuleChange("LOW", "first_response_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-white/60 mb-1">Resolution Target</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    value={form.rules?.LOW?.resolution_target_minutes || 2880}
                    onChange={(e) => handleRuleChange("LOW", "resolution_target_minutes", e.target.value)}
                    className="w-full bg-black/40 border border-white/20 rounded-ex-ctrl px-2.5 py-1 text-xs text-white focus:outline-none"
                  />
                  <span className="text-[10px] text-white/40">mins</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleRunEvaluation}
            disabled={evaluateMutation.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white/80 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${evaluateMutation.isPending ? "animate-spin text-ex-primary" : ""}`} />
            Run SLA Evaluation Sweep Now
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <EasyXButton variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </EasyXButton>
            <EasyXButton
              onClick={handleSave}
              loading={updateMutation.isPending}
              className="gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              Save Configuration
            </EasyXButton>
          </div>
        </div>
      </div>
    </EasyXModal>
  );
}
