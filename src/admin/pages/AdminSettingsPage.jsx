import React, { useEffect, useState } from "react";
import {
  Settings,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Power,
  Users,
  Inbox,
  PiggyBank,
  ArrowUpFromLine,
  UserPlus,
  QrCode,
  Info,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminSettings, useSaveAdminSettings } from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
} from "@/design/EasyX";
import DatabaseBackupSection from "../components/DatabaseBackupSection";
import AdminBrandingSection from "../components/AdminBrandingSection";

function ToggleSwitch({ checked, onChange, disabled, testId, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-ex-accent" : "bg-white/15"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-6 bg-ex-ink" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function AdminSettingsPage() {
  const { data: settings, isLoading, isFetching, refetch } = useAdminSettings();
  const save = useSaveAdminSettings();

  const [form, setForm] = useState({
    is_enabled: false,
    message: "",
    registration_enabled: true,
    deposits_enabled: true,
    investments_enabled: true,
    withdrawals_enabled: true,
    trc20: "",
    bep20: "",
    reason: "",
  });

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      const ms = settings.maintenance || {};
      const ds = settings.deposit?.addresses || {};
      setForm({
        is_enabled: Boolean(ms.is_enabled),
        message: ms.message || "We are currently performing scheduled maintenance. Please check back shortly.",
        registration_enabled: ms.registration_enabled !== false,
        deposits_enabled: ms.deposits_enabled !== false,
        investments_enabled: ms.investments_enabled !== false,
        withdrawals_enabled: ms.withdrawals_enabled !== false,
        trc20: ds.TRC20 || "",
        bep20: ds.BEP20 || "",
        reason: "",
      });
      setHasChanges(false);
    }
  }, [settings]);

  const updateField = (key, value) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      setHasChanges(true);
      return next;
    });
  };

  const handleQuickPreset = (enableAll) => {
    setForm((prev) => ({
      ...prev,
      registration_enabled: enableAll,
      deposits_enabled: enableAll,
      investments_enabled: enableAll,
      withdrawals_enabled: enableAll,
    }));
    setHasChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await save.mutateAsync({
        is_enabled: form.is_enabled,
        message: form.message.trim(),
        registration_enabled: form.registration_enabled,
        deposits_enabled: form.deposits_enabled,
        investments_enabled: form.investments_enabled,
        withdrawals_enabled: form.withdrawals_enabled,
        trc20: form.trc20.trim(),
        bep20: form.bep20.trim(),
        reason: form.reason.trim() || (form.is_enabled ? "Global maintenance toggled" : "Availability settings modified"),
      });
      toast.success("Platform settings saved and audit logged");
      setHasChanges(false);
    } catch (err) {
      toast.error(apiError(err, "Failed to save settings"));
    }
  };

  if (isLoading || !settings) {
    return (
      <div className="p-8">
        <EasyXLoader text="Loading administrative settings..." />
      </div>
    );
  }

  const isGlobalMaintenance = form.is_enabled;

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeading
          title="Platform Settings"
          description="Control global maintenance mode, feature availability killswitches, and official deposit infrastructure."
        />

        <div className="flex items-center gap-2">
          <EasyXButton
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </EasyXButton>

          <EasyXButton
            type="submit"
            form="admin-settings-form"
            loading={save.isPending}
            disabled={save.isPending || !hasChanges}
            data-testid="settings-save-button"
            className="flex items-center gap-2 bg-ex-accent text-ex-ink font-bold"
          >
            <CheckCircle2 className="h-4 w-4" />
            Save Changes
          </EasyXButton>
        </div>
      </div>

      {/* App Icon & Webapp Branding Configuration */}
      <AdminBrandingSection />

      <form id="admin-settings-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Safety & Integrity Guarantee Banner */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <div className="font-semibold text-emerald-300">
                System Integrity Assured
              </div>
              <div className="text-white/60">
                Maintenance mode isolates incoming requests without halting the background maturity engine, active investment locks, or wallet ledgers.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/70">
              <Lock className="h-3 w-3 text-ex-accent" />
              Audit Logged
            </span>
          </div>
        </div>

        {/* 1. Global Maintenance Mode Section */}
        <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/8">
            <div className="flex items-start gap-3">
              <div
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                  isGlobalMaintenance
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                }`}
              >
                <Power className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">
                    Global Maintenance Mode
                  </h3>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                      isGlobalMaintenance
                        ? "bg-amber-500/10 text-amber-300 border-amber-500/30 animate-pulse"
                        : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    }`}
                  >
                    {isGlobalMaintenance ? "MAINTENANCE ACTIVE" : "SYSTEM OPERATIONAL"}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1">
                  When enabled, all public actions (registrations, deposits, investments, withdrawals) are blocked. Active investments continue counting toward maturity.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-white/80">
                {isGlobalMaintenance ? "Disable" : "Enable"} Maintenance
              </span>
              <ToggleSwitch
                checked={form.is_enabled}
                onChange={(val) => updateField("is_enabled", val)}
                testId="maintenance-mode-toggle"
                label="Global maintenance mode switch"
              />
            </div>
          </div>

          {/* Active Maintenance Warning & Message Customization */}
          {isGlobalMaintenance && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-start gap-3 text-xs text-amber-200">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div className="space-y-1 flex-1">
                <div className="font-semibold text-amber-300">
                  Maintenance mode is currently active
                </div>
                <div className="text-amber-200/80">
                  Users visiting the application will receive the maintenance message configured below.
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2 pt-1">
            <label className="text-xs font-medium text-white/80 flex items-center justify-between">
              <span>Maintenance Broadcast Message (Shown to users):</span>
              <span className="text-[11px] text-white/40">Max 500 characters</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => updateField("message", e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="e.g. We are performing scheduled upgrades. All funds are secure."
              className="w-full rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-white placeholder:text-white/30 focus:border-ex-accent focus:outline-none"
              data-testid="maintenance-message-input"
            />
          </div>
        </EasyXCard>

        {/* 2. Feature Availability Killswitches Section */}
        <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/8">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-ex-accent" />
                Feature Availability Killswitches
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                Granularly enable or disable specific customer operations without taking down the entire platform.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleQuickPreset(true)}
                disabled={isGlobalMaintenance}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-emerald-400 hover:bg-white/10 disabled:opacity-40 transition"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset(false)}
                disabled={isGlobalMaintenance}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-rose-400 hover:bg-white/10 disabled:opacity-40 transition"
              >
                Disable All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Registration Availability */}
            <div className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <UserPlus className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">
                    Registration Availability
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Allow new investors to create accounts and join via referrals.
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={form.registration_enabled}
                onChange={(val) => updateField("registration_enabled", val)}
                disabled={isGlobalMaintenance}
                testId="toggle-registration-availability"
                label="Registration availability switch"
              />
            </div>

            {/* Deposit Availability */}
            <div className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Inbox className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">
                    Deposit Availability
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Allow users to submit new USDT deposits and on-chain TX hashes.
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={form.deposits_enabled}
                onChange={(val) => updateField("deposits_enabled", val)}
                disabled={isGlobalMaintenance}
                testId="toggle-deposit-availability"
                label="Deposit availability switch"
              />
            </div>

            {/* Investment Availability */}
            <div className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <PiggyBank className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">
                    Investment Availability
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Allow investors to purchase new packages using available wallet funds.
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={form.investments_enabled}
                onChange={(val) => updateField("investments_enabled", val)}
                disabled={isGlobalMaintenance}
                testId="toggle-investment-availability"
                label="Investment availability switch"
              />
            </div>

            {/* Withdrawal Availability */}
            <div className="rounded-xl border border-white/6 bg-white/2 p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <ArrowUpFromLine className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-semibold text-white text-xs">
                    Withdrawal Availability
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">
                    Allow verified KYC investors to submit USDT withdrawal requests.
                  </div>
                </div>
              </div>
              <ToggleSwitch
                checked={form.withdrawals_enabled}
                onChange={(val) => updateField("withdrawals_enabled", val)}
                disabled={isGlobalMaintenance}
                testId="toggle-withdrawal-availability"
                label="Withdrawal availability switch"
              />
            </div>
          </div>
        </EasyXCard>

        {/* 3. Official Deposit Addresses Configuration */}
        <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/8">
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-ex-accent" />
                Official USDT Receiving Addresses
              </h3>
              <p className="text-xs text-white/60 mt-0.5">
                The hot/cold wallet addresses displayed to investors on the deposit screen.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              USDT (Tether)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <span className="rounded bg-red-500/20 text-red-400 px-1.5 py-0.5 text-[10px] font-bold">
                  TRC20
                </span>
                Tron USDT Receiving Address:
              </label>
              <input
                type="text"
                value={form.trc20}
                onChange={(e) => updateField("trc20", e.target.value)}
                placeholder="TXxx..."
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-ex-accent focus:outline-none"
                data-testid="settings-trc20-input"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <span className="rounded bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[10px] font-bold">
                  BEP20
                </span>
                BSC (Binance Smart Chain) USDT Address:
              </label>
              <input
                type="text"
                value={form.bep20}
                onChange={(e) => updateField("bep20", e.target.value)}
                placeholder="0x..."
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs font-mono text-white placeholder:text-white/30 focus:border-ex-accent focus:outline-none"
                data-testid="settings-bep20-input"
              />
            </div>
          </div>
        </EasyXCard>

        {/* 4. Administrative Reason & Audit Log Note */}
        <EasyXCard className="p-5 bg-ex-surface/80 border-white/8 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-white/90">
            <Info className="h-4 w-4 text-ex-accent" />
            <span>Audit Trail Note (Optional justification for audit ledger):</span>
          </div>
          <input
            type="text"
            value={form.reason}
            onChange={(e) => updateField("reason", e.target.value)}
            placeholder="e.g. Routine database maintenance / temporary liquidity check"
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/30 focus:border-ex-accent focus:outline-none"
            data-testid="settings-reason-input"
          />
        </EasyXCard>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-white/50">
            {hasChanges ? (
              <span className="text-amber-400 font-medium flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                You have unsaved changes.
              </span>
            ) : (
              <span>Settings are synchronized with the live server.</span>
            )}
          </div>

          <EasyXButton
            type="submit"
            loading={save.isPending}
            disabled={save.isPending || !hasChanges}
            className="bg-ex-accent text-ex-ink font-bold px-6"
            data-testid="settings-submit-bottom"
          >
            Save All Platform Settings
          </EasyXButton>
        </div>
      </form>

      {/* 5. Database Backup, Recovery & Protection Section */}
      <div className="pt-4">
        <DatabaseBackupSection />
      </div>
    </div>
  );
}
