import React, { useEffect, useState } from "react";
import { Wrench, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { useAdminMaintenance, useSaveMaintenance } from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import { PageHeading, EasyXCard, EasyXButton, EasyXLoader } from "@/design/EasyX";

function Toggle({ checked, onChange, testId, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      data-testid={testId}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-ex-accent" : "bg-white/15"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

const FEATURES = [
  { field: "registration_enabled", label: "Registration", note: "New users can sign up." },
  { field: "deposits_enabled", label: "Deposits", note: "Users can submit deposits." },
  { field: "investments_enabled", label: "Investments", note: "Users can buy plans." },
  { field: "withdrawals_enabled", label: "Withdrawals", note: "Users can request withdrawals." },
];

export default function AdminMaintenancePage() {
  const { data, isLoading } = useAdminMaintenance();
  const save = useSaveMaintenance();

  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data && !form) {
      setForm({
        is_enabled: !!data.is_enabled,
        message: data.message || "",
        registration_enabled: data.registration_enabled !== false,
        deposits_enabled: data.deposits_enabled !== false,
        investments_enabled: data.investments_enabled !== false,
        withdrawals_enabled: data.withdrawals_enabled !== false,
      });
    }
  }, [data, form]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save.mutateAsync(form);
      toast.success("Maintenance settings saved");
    } catch (err) {
      toast.error(apiError(err, "Could not save settings"));
    }
  };

  return (
    <div data-testid="admin-maintenance-page">
      <PageHeading
        title="Maintenance"
        subtitle="Control global maintenance mode and per-feature availability."
        icon={Wrench}
      />

      {isLoading || !form ? (
        <EasyXLoader />
      ) : (
        <form onSubmit={submit} className="mt-5 max-w-2xl space-y-5" data-testid="admin-maintenance-form">
          <EasyXCard>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-semibold text-ex-text">
                  {form.is_enabled ? (
                    <AlertTriangle className="h-4 w-4 text-amber-300" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  )}
                  Global maintenance mode
                </div>
                <p className="mt-1 text-sm text-ex-muted">
                  When ON, registration, deposits, investments and withdrawals are all blocked and users see the message below. Existing investments, the maturity engine and wallet balances are never affected.
                </p>
              </div>
              <Toggle
                checked={form.is_enabled}
                onChange={(v) => set({ is_enabled: v })}
                testId="maintenance-global-toggle"
              />
            </div>

            {form.is_enabled && (
              <div className="mt-4 flex items-center gap-2 rounded-ex-ctrl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" data-testid="maintenance-active-banner">
                <AlertTriangle className="h-4 w-4" /> Maintenance mode is ACTIVE. User writes are blocked.
              </div>
            )}

            <div className="mt-5">
              <label className="text-xs text-ex-muted">Maintenance message (shown to users)</label>
              <textarea
                value={form.message}
                onChange={(e) => set({ message: e.target.value })}
                rows={2}
                maxLength={500}
                className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
                data-testid="maintenance-message"
              />
            </div>
          </EasyXCard>

          <EasyXCard>
            <div className="font-semibold text-ex-text">Feature availability</div>
            <p className="mt-1 text-sm text-ex-muted">
              Selectively disable individual features without a full shutdown. These are ignored while global maintenance is ON (everything is blocked).
            </p>
            <div className="mt-4 divide-y divide-white/5">
              {FEATURES.map((f) => (
                <div key={f.field} className="flex items-center justify-between py-3">
                  <div>
                    <div className="text-sm font-medium text-ex-text">{f.label}</div>
                    <div className="text-[11px] text-ex-muted">{f.note}</div>
                  </div>
                  <Toggle
                    checked={!!form[f.field]}
                    onChange={(v) => set({ [f.field]: v })}
                    disabled={form.is_enabled}
                    testId={`maintenance-${f.field}`}
                  />
                </div>
              ))}
            </div>
          </EasyXCard>

          <EasyXButton type="submit" loading={save.isPending} data-testid="maintenance-save">
            Save settings
          </EasyXButton>
        </form>
      )}
    </div>
  );
}
