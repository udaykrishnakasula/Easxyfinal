import React, { useEffect, useRef } from "react";
import { Lock, Check } from "lucide-react";
import { toast } from "sonner";

import { money, useBuyPlan } from "./api";
import { apiError } from "@/lib/api";
import { EasyXModal, EasyXButton } from "@/design/EasyX";

export default function BuyPlanDialog({ plan, open, onOpenChange, walletBalance }) {
  const buy = useBuyPlan();
  const price = Number(plan.price);
  const available = Number(walletBalance ?? 0);
  const insufficient = available < price;

  // One stable idempotency key per purchase INTENT (per dialog open). Any
  // double-click / retry / refresh of this same intent reuses the key so the
  // backend returns the single already-created investment instead of a duplicate.
  // Opening the dialog again mints a fresh key -> an additional investment is allowed.
  const idempotencyRef = useRef(null);
  useEffect(() => {
    if (open) {
      idempotencyRef.current =
        (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) ||
        `${plan.key}-${Date.now()}-${Math.random()}`;
    }
  }, [open, plan.key]);

  const onBuy = async () => {
    if (buy.isPending) return; // extra guard against rapid double submit
    try {
      await buy.mutateAsync({ planKey: plan.key, idempotencyKey: idempotencyRef.current });
      toast.success(`Purchased 1 ${plan.name} card for ${money(plan.price)}`);
      onOpenChange(false);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 402 && detail?.code === "insufficient_balance") {
        toast.error("Insufficient wallet balance.");
      } else {
        toast.error(apiError(err, "Could not complete the investment."));
      }
    }
  };

  return (
    <EasyXModal
      open={open}
      onOpenChange={onOpenChange}
      title={`${plan.name} Plan`}
      description="Fixed investment — 1 card = 1 investment. No custom amount."
      testId={`buy-dialog-${plan.key}`}
      footer={
        <EasyXButton
          onClick={onBuy}
          disabled={insufficient || buy.isPending}
          loading={buy.isPending}
          data-testid={`buy-confirm-${plan.key}`}
          className="w-full"
        >
          {insufficient ? (
            <><Lock className="mr-2 h-4 w-4" /> Insufficient balance</>
          ) : (
            <><Check className="mr-2 h-4 w-4" /> BUY {plan.name.toUpperCase()} — {money(plan.price)}</>
          )}
        </EasyXButton>
      }
    >
      <div className="rounded-ex-ctrl border border-white/10 bg-white/[0.03] p-4 space-y-2.5 text-sm">
        <Row label="Investment" value={money(plan.price)} strong />
        <Row label="Lock period" value={`${plan.lock_days} days`} />
        <Row label="Profit" value={`${money(plan.profit_amount)} (${plan.profit_percentage}%)`} />
        <Row label="Maturity" value={money(plan.maturity_amount)} strong accent />
      </div>

      {insufficient && (
        <div className="rounded-ex-ctrl border border-red-500/30 bg-red-500/10 p-3 text-sm" data-testid={`buy-insufficient-${plan.key}`}>
          <div className="flex justify-between"><span className="text-ex-muted">Required</span><span className="font-semibold">{money(plan.price)}</span></div>
          <div className="flex justify-between"><span className="text-ex-muted">Available</span><span className="font-semibold">{money(available)}</span></div>
          <div className="mt-1 font-semibold text-red-300">Insufficient wallet balance.</div>
        </div>
      )}
    </EasyXModal>
  );
}

function Row({ label, value, strong, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ex-muted">{label}</span>
      <span className={`${strong ? "font-bold" : "font-medium"} ${accent ? "text-emerald-300" : "text-ex-text"}`}>{value}</span>
    </div>
  );
}
