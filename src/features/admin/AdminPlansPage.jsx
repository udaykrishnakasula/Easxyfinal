import React, { useEffect, useState } from "react";
import { Layers, History, X } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { useAdminPlans, useSavePlan, usePlanHistory } from "./adminApi";
import { apiError } from "@/lib/api";
import { PageHeading, EasyXCard, EasyXButton, EasyXLoader, EasyXBadge, EasyXModal } from "@/design/EasyX";

function PlanEditor({ plan }) {
  const save = useSavePlan();
  const [form, setForm] = useState({
    name: plan.name,
    price: plan.price,
    profit_percentage: plan.profit_percentage,
    maturity_percentage: plan.maturity_percentage,
    lock_days: plan.lock_days,
    is_active: plan.is_active,
  });

  useEffect(() => {
    setForm({
      name: plan.name, price: plan.price, profit_percentage: plan.profit_percentage,
      maturity_percentage: plan.maturity_percentage, lock_days: plan.lock_days, is_active: plan.is_active,
    });
  }, [plan]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await save.mutateAsync({
        key: plan.key,
        patch: {
          name: form.name,
          price: String(form.price),
          profit_percentage: String(form.profit_percentage),
          maturity_percentage: String(form.maturity_percentage),
          lock_days: Number(form.lock_days),
          is_active: form.is_active,
        },
      });
      toast.success(`${plan.name} plan updated (v${plan.version + 1})`);
    } catch (err) {
      toast.error(apiError(err, "Could not update plan"));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-testid={`plan-editor-${plan.key}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="ex-display text-base font-bold text-ex-text">{plan.name}</span>
          <EasyXBadge className="bg-white/10 text-ex-muted border border-white/10">v{plan.version}</EasyXBadge>
        </div>
        <label className="flex items-center gap-2 text-xs text-ex-muted cursor-pointer">
          <input type="checkbox" checked={!!form.is_active} onChange={(e) => set({ is_active: e.target.checked })}
            data-testid={`plan-active-${plan.key}`} className="h-4 w-4 accent-current" />
          Active
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (USDT)" value={form.price} onChange={(v) => set({ price: v })} testId={`plan-price-${plan.key}`} type="number" />
        <Field label="Lock period (days)" value={form.lock_days} onChange={(v) => set({ lock_days: v })} testId={`plan-lock-${plan.key}`} type="number" />
        <Field label="Profit %" value={form.profit_percentage} onChange={(v) => set({ profit_percentage: v })} testId={`plan-profit-${plan.key}`} type="number" />
        <Field label="Maturity %" value={form.maturity_percentage} onChange={(v) => set({ maturity_percentage: v })} testId={`plan-maturity-${plan.key}`} type="number" />
      </div>
      <EasyXButton type="submit" className="w-full !py-2 text-sm" loading={save.isPending} data-testid={`plan-save-${plan.key}`}>
        Save changes
      </EasyXButton>
    </form>
  );
}

function Field({ label, value, onChange, testId, type = "text" }) {
  return (
    <div>
      <label className="text-[11px] text-ex-muted">{label}</label>
      <input
        type={type}
        step="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-sm text-ex-text focus:border-ex-accent focus:outline-none"
      />
    </div>
  );
}

function HistoryModal({ planKey, open, onClose }) {
  const { data: history } = usePlanHistory(open ? planKey : null);
  return (
    <EasyXModal open={open} onOpenChange={(o) => { if (!o) onClose(); }} title={`${planKey} plan history`} testId="plan-history-modal">
      {!history || history.length === 0 ? (
        <p className="text-sm text-ex-muted">No changes recorded yet.</p>
      ) : (
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {history.map((h) => (
            <div key={h.id} className="rounded-ex-ctrl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ex-text">v{h.version}</span>
                <span className="text-ex-muted">{dayjs(h.created_at).format("DD MMM YYYY, HH:mm")}</span>
              </div>
              <div className="mt-2 space-y-1">
                {Object.entries(h.changed || {}).map(([field, chg]) => (
                  <div key={field} className="text-[11px] text-ex-muted">
                    <span className="text-ex-text">{field}</span>: {String(chg.from)} → <span className="text-emerald-300">{String(chg.to)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </EasyXModal>
  );
}

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useAdminPlans();
  const [historyKey, setHistoryKey] = useState(null);

  return (
    <div data-testid="admin-plans-page">
      <PageHeading title="Investment Plans" subtitle="Edit terms for NEW investments. Existing investments keep their original terms." icon={Layers} />
      {isLoading || !plans ? (
        <EasyXLoader />
      ) : (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <EasyXCard key={plan.key} data-testid={`plan-card-${plan.key}`}>
              <PlanEditor plan={plan} />
              <button
                onClick={() => setHistoryKey(plan.key)}
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-ex-muted hover:text-ex-text"
                data-testid={`plan-history-open-${plan.key}`}
              >
                <History className="h-3.5 w-3.5" /> View change history
              </button>
            </EasyXCard>
          ))}
        </div>
      )}
      <HistoryModal planKey={historyKey} open={!!historyKey} onClose={() => setHistoryKey(null)} />
    </div>
  );
}
