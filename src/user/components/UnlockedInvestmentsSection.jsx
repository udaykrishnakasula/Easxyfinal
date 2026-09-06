import React, { useMemo } from "react";
import dayjs from "dayjs";
import { motion } from "framer-motion";
import {
  Sparkles,
  ShieldCheck,
  Clock,
  TrendingUp,
  Calendar,
  Layers,
} from "lucide-react";

import { useInvestments, money } from "@/user/api";
import { InvestmentCard } from "@/components/landing/DiamondInvestmentCard";
import {
  Eyebrow,
  EasyXStatusBadge,
} from "@/design/EasyX";

const PLAN_ORDER = ["silver", "gold", "platinum", "diamond"];
const PLAN_TITLES = {
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  diamond: "Diamond",
};

// Stable memoized individual card component so that updates to one card
// do not trigger re-renders or animation restarts in siblings.
const UnlockedCardItem = React.memo(function UnlockedCardItem({
  inv,
  cardIdx,
  userName,
}) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 60);
    return () => clearTimeout(timer);
  }, []);

  const planKey = inv.plan_key || "silver";
  const invIdShort = inv.id ? inv.id.slice(-6).toUpperCase() : "";

  return (
    <div
      data-testid={`unlocked-card-${inv.id}`}
      className={`w-[320px] sm:w-[380px] md:w-[400px] shrink-0 snap-start flex flex-col items-center group/card transition-all duration-700 ease-out transform ${
        mounted
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-6 scale-[0.97]"
      }`}
      style={{
        transform: "translateZ(0)",
        transitionDelay: `${(cardIdx % 4) * 100 + 100}ms`,
      }}
    >
      {/* 3D Certificate Card with Framer Motion hover scale */}
      <motion.div
        whileHover={{ scale: 1.025, y: -5 }}
        whileTap={{ scale: 0.985 }}
        transition={{ type: "spring", stiffness: 380, damping: 24 }}
        className="relative w-full cursor-pointer"
      >
        <InvestmentCard
          variant={planKey}
          investment={inv}
          userName={userName}
          className="mx-auto w-full"
        />
      </motion.div>

      {/* Dynamic Details & Actions Bar */}
      <motion.div
        whileHover={{ scale: 1.015, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="mt-3.5 w-full ex-surface-sm p-4 rounded-2xl border border-white/10 bg-[#121118]/80 backdrop-blur-md shadow-xl transition-colors hover:border-white/20"
      >
        {/* Top Bar: Plan Title + Sequence # + Status + Unique ID */}
        <div className="flex items-center justify-between gap-2 border-b border-white/8 pb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="ex-eyebrow truncate font-bold text-white">
              {inv.plan_name || planKey.toUpperCase()} #{cardIdx + 1}
            </span>
            <EasyXStatusBadge status={inv.status || "active"} />
          </div>
          <span className="text-[11px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
            #{invIdShort}
          </span>
        </div>

        {/* Dynamic Stats Grid */}
        <div className="mt-3 grid grid-cols-2 gap-2.5 text-xs">
          <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-ex-muted flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span>Profit Return</span>
            </div>
            <div className="mt-1 font-semibold text-emerald-400">
              +{money(inv.profit_amount)}{" "}
              <span className="text-[10px] text-emerald-400/80 font-normal">
                ({inv.profit_percentage}%)
              </span>
            </div>
          </div>

          <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-ex-muted flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-violet-400" />
              <span>Maturity Payout</span>
            </div>
            <div className="mt-1 font-semibold text-white">
              {money(inv.maturity_amount)}
            </div>
          </div>

          <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-ex-muted flex items-center gap-1">
              <Calendar className="h-3 w-3 text-sky-400" />
              <span>Invested On</span>
            </div>
            <div className="mt-1 font-medium text-white/90">
              {inv.start_at
                ? dayjs(inv.start_at).format("DD MMM YYYY")
                : "—"}
            </div>
          </div>

          <div className="bg-white/[0.02] p-2 rounded-lg border border-white/5">
            <div className="text-[10px] uppercase tracking-wider text-ex-muted flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-400" />
              <span>Lock Remaining</span>
            </div>
            <div className="mt-1 font-medium text-white/90">
              {inv.status === "matured"
                ? "Matured"
                : `${inv.remaining_days ?? "—"} days left`}
            </div>
          </div>
        </div>

        {/* Card Interaction Hint */}
        <div className="mt-3 pt-2.5 border-t border-white/8 flex items-center justify-between">
          <span className="text-[11px] text-ex-muted/70">
            Tap card above to 3D flip
          </span>
        </div>
      </motion.div>
    </div>
  );
});

export default function UnlockedInvestmentsSection({ userName }) {
  const { data: investments, isLoading } = useInvestments();

  // Show only real, authenticated user investments that are unlocked/active/matured (not pending)
  const unlockedList = useMemo(() => {
    return (investments || []).filter(
      (inv) => inv && inv.id && inv.status !== "pending"
    );
  }, [investments]);

  // Stable grouping by plan_key, preserving purchase sequence
  const groupedByPlan = useMemo(() => {
    return PLAN_ORDER.map((planKey) => {
      const cards = unlockedList.filter(
        (inv) => (inv.plan_key || "silver").toLowerCase() === planKey
      );
      return {
        planKey,
        planTitle: PLAN_TITLES[planKey] || planKey.toUpperCase(),
        cards,
      };
    }).filter((group) => group.cards.length > 0);
  }, [unlockedList]);

  return (
    <section
      data-testid="unlocked-investments-section"
      className="mt-12 sm:mt-14"
    >
      {/* Section Header */}
      <div className="flex items-end justify-between mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2">
            <Eyebrow>My Portfolio</Eyebrow>
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="mt-1 ex-display text-xl sm:text-2xl font-extrabold flex items-center gap-2">
            <span>My Unlocked Investments</span>
          </h2>
        </div>

        {unlockedList.length > 0 && (
          <div className="text-right">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/5 border border-white/10 text-white/90">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>
                {unlockedList.length}{" "}
                {unlockedList.length === 1 ? "Active Card" : "Active Cards"}
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-6 w-32 bg-white/10 rounded-md animate-pulse" />
              <div className="flex gap-4 overflow-hidden">
                <div className="h-72 w-[340px] rounded-[28px] bg-white/5 border border-white/10 animate-pulse shrink-0" />
                <div className="h-72 w-[340px] rounded-[28px] bg-white/5 border border-white/10 animate-pulse shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State — No Unlocked Investments */}
      {!isLoading && unlockedList.length === 0 && (
        <div
          data-testid="unlocked-investments-empty"
          className="rounded-[24px] border border-white/8 bg-white/[0.02] p-8 sm:p-12 text-center"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 mb-4">
            <Layers className="h-7 w-7" />
          </div>
          <h3 className="ex-display text-lg font-bold text-white">
            No unlocked investments yet
          </h3>
          <p className="mt-2 text-sm text-ex-muted max-w-md mx-auto">
            Choose an investment plan above to unlock your personalized 3D certificate card and begin generating daily USDT returns.
          </p>
        </div>
      )}

      {/* Grouped by Plan Name: Plan Name heading ONCE + Horizontal Row of Individual Cards */}
      {!isLoading && groupedByPlan.length > 0 && (
        <div className="space-y-10 sm:space-y-12">
          {groupedByPlan.map((group) => {
            return (
              <div
                key={group.planKey}
                data-testid={`unlocked-group-${group.planKey}`}
                className="space-y-4"
              >
                {/* Plan Heading (Rendered once above the row) */}
                <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <h3 className="ex-display text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                      <span>{group.planTitle}</span>
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 font-medium text-white/70">
                      {group.cards.length} {group.cards.length === 1 ? "card" : "cards"}
                    </span>
                  </div>
                  {group.cards.length > 1 && (
                    <span className="text-[11px] text-ex-muted/70 hidden sm:inline-block">
                      Scroll horizontally to view all cards →
                    </span>
                  )}
                </div>

                {/* Horizontal row of individual cards */}
                <div
                  className="flex flex-row items-start gap-5 sm:gap-6 overflow-x-auto pb-4 pt-1 px-1 -mx-1 scrollbar-none sm:scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent snap-x snap-mandatory"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {group.cards.map((inv, cardIdx) => {
                    return (
                      <UnlockedCardItem
                        key={inv.id}
                        inv={inv}
                        cardIdx={cardIdx}
                        userName={userName}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
