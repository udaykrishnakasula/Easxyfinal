import React, { useState } from "react";
import { Lock, ArrowRight, TrendingUp, Plus } from "lucide-react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import { PLAN_THEME } from "./plan-theme";
import { money } from "./api";
import { EasyXStatusBadge, EasyXButton } from "@/design/EasyX";
import BuyPlanDialog from "./BuyPlanDialog";

export default function PlanCard({ plan, userName, walletBalance }) {
  const theme = PLAN_THEME[plan.key] || PLAN_THEME.silver;
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      <motion.div
        className="group relative overflow-hidden rounded-ex border border-white/8 p-5 min-h-[280px] flex flex-col cursor-pointer transition-colors duration-300 hover:border-white/20"
        data-testid={`dash-plan-${plan.key}`}
        data-unlocked={plan.unlocked ? "true" : "false"}
        whileHover={{
          scale: 1.025,
          y: -5,
          boxShadow: `0 32px 70px -20px ${theme.glow}, 0 0 0 1px ${theme.accent}40`,
        }}
        whileTap={{ scale: 0.985 }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        style={{
          background: theme.surface,
          boxShadow: `0 24px 60px -34px ${theme.glow}`,
        }}
      >
        {/* Soft radial ambient shimmer on hover */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-ex"
          style={{
            background: `radial-gradient(500px circle at 50% 0%, ${theme.glow} 0%, transparent 70%)`,
          }}
        />

        {/* top accent line */}
        <motion.div
          className="absolute inset-x-0 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}77, transparent)` }}
          initial={{ opacity: 0.7 }}
          whileHover={{ opacity: 1, height: "1.5px" }}
          transition={{ duration: 0.25 }}
        />

        <div className="relative z-10 flex items-center justify-between">
          <span className={`ex-eyebrow ${theme.label}`}>{plan.name}</span>
          <EasyXStatusBadge status={plan.unlocked ? "unlocked" : "locked"} />
        </div>

        <div className="relative z-10 flex-1 flex flex-col">
          {plan.unlocked ? (
            <UnlockedBody plan={plan} theme={theme} userName={userName}
              onView={() => navigate(`/app/investments?plan=${plan.key}`)} onBuyMore={() => setOpen(true)} />
          ) : (
            <LockedBody plan={plan} onUnlock={() => setOpen(true)} />
          )}
        </div>
      </motion.div>

      <BuyPlanDialog plan={plan} open={open} onOpenChange={setOpen} walletBalance={walletBalance} />
    </>
  );
}

function LockedBody({ plan, onUnlock }) {
  return (
    <div className="relative flex-1 mt-4">
      {/* Info hidden behind a light ~10% frost */}
      <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
        <div className="ex-display text-3xl font-extrabold text-white">{money(plan.price)}</div>
        <div className="mt-3 space-y-2 text-sm text-white/80">
          <div>{plan.lock_days} days lock</div>
          <div>Profit {plan.profit_percentage}%</div>
          <div>Maturity {money(plan.maturity_amount)}</div>
          <div>Expected profit {money(plan.profit_amount)}</div>
        </div>
      </div>
      {/* Light-frost overlay + flat 2D yellow lock with Framer Motion hover scale */}
      <motion.button
        onClick={onUnlock}
        data-testid={`dash-plan-unlock-${plan.key}`}
        whileHover={{
          scale: 1.02,
          backgroundColor: "rgba(255, 255, 255, 0.06)",
        }}
        whileTap={{ scale: 0.97 }}
        transition={{ type: "spring", stiffness: 450, damping: 22 }}
        className="group/lock absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/8 bg-white/[0.03] backdrop-blur-[3px] transition-colors"
      >
        <motion.div
          whileHover={{ scale: 1.15, rotate: -5 }}
          transition={{ type: "spring", stiffness: 450, damping: 18 }}
        >
          <Lock className="h-11 w-11 text-yellow-400" strokeWidth={2.25} />
        </motion.div>
        <span className="text-sm font-semibold text-white ex-display group-hover/lock:translate-y-[-1px] transition-transform">Tap to unlock</span>
        <span className="text-xs text-ex-muted">Invest to reveal this plan</span>
      </motion.button>
    </div>
  );
}

function UnlockedBody({ plan, userName, onView, onBuyMore }) {
  return (
    <div className="mt-2 flex flex-1 flex-col">
      <p className="text-xs text-ex-muted">Welcome, {userName}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="ex-display text-2xl font-extrabold text-white">{plan.cards}</span>
        <span className="text-sm text-ex-muted">Card{plan.cards === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-y-2.5 text-sm">
        <Stat label="Total invested" value={money(plan.total_invested)} />
        <Stat label="Active" value={plan.active_investments} />
        <Stat label="Expected profit" value={money(plan.expected_profit)} accent />
        <Stat label="Expected maturity" value={money(plan.expected_maturity)} />
        <Stat label="Next maturity" value={plan.next_maturity ? dayjs(plan.next_maturity).format("DD MMM YYYY") : "—"} full />
      </div>
      <div className="mt-auto flex gap-2 pt-4">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="flex-1">
          <EasyXButton onClick={onView} data-testid={`dash-view-${plan.key}`} className="w-full h-9">
            View Investments <ArrowRight className="ml-1 h-4 w-4" />
          </EasyXButton>
        </motion.div>
        <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}>
          <EasyXButton variant="ghost" onClick={onBuyMore} data-testid={`dash-buymore-${plan.key}`} className="h-9 px-3">
            <Plus className="h-4 w-4" />
          </EasyXButton>
        </motion.div>
      </div>
    </div>
  );
}

function Stat({ label, value, accent, full }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wide text-ex-muted/70">{label}</div>
      <div className={`font-semibold ${accent ? "text-emerald-300" : "text-white"} flex items-center gap-1`}>
        {accent && <TrendingUp className="h-3.5 w-3.5" />}{value}
      </div>
    </div>
  );
}
