import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { TrendingUp, Users, Coins, ArrowUpRight, Activity } from "lucide-react";

import { useRewardsFeed, money } from "./api";
import { Eyebrow, EasyXEmptyState } from "@/design/EasyX";

// Visual config per feed category.
const CATEGORY_META = {
  reward: {
    label: "Reward",
    icon: TrendingUp,
    tone: "text-emerald-300",
    ring: "ring-emerald-400/25",
    bg: "bg-emerald-400/10",
    sign: "+",
  },
  maturity: {
    label: "Maturity",
    icon: Coins,
    tone: "text-amber-300",
    ring: "ring-amber-400/25",
    bg: "bg-amber-400/10",
    sign: "+",
  },
  payout: {
    label: "Payout",
    icon: ArrowUpRight,
    tone: "text-sky-300",
    ring: "ring-sky-400/25",
    bg: "bg-sky-400/10",
    sign: "-",
  },
  other: {
    label: "Activity",
    icon: Activity,
    tone: "text-ex-muted",
    ring: "ring-white/10",
    bg: "bg-white/5",
    sign: "",
  },
};

const TYPE_LABEL = {
  PROFIT: "Investment profit",
  INVESTMENT_MATURITY: "Investment matured",
  REFERRAL_COMMISSION: "Referral commission",
  WITHDRAWAL: "Withdrawal sent",
};

function iconFor(item) {
  if (item.type === "REFERRAL_COMMISSION") return Users;
  const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
  return meta.icon;
}

function timeAgo(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 10) return "just now";
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function RewardsFeed() {
  const { data, isLoading, isError } = useRewardsFeed();
  const [freshIds, setFreshIds] = useState(new Set());
  const seenIds = useRef(new Set());
  const initialized = useRef(false);

  // Detect newly-arrived items across polls to briefly highlight them.
  useEffect(() => {
    if (!data) return;
    const currentIds = data.map((d) => d.id);
    if (!initialized.current) {
      seenIds.current = new Set(currentIds);
      initialized.current = true;
      return;
    }
    const newOnes = currentIds.filter((id) => !seenIds.current.has(id));
    if (newOnes.length) {
      seenIds.current = new Set(currentIds);
      setFreshIds(new Set(newOnes));
      const t = setTimeout(() => setFreshIds(new Set()), 4000);
      return () => clearTimeout(t);
    }
    seenIds.current = new Set(currentIds);
  }, [data]);

  return (
    <div data-testid="rewards-feed" className="mt-9">
      <div className="flex items-end justify-between">
        <div>
          <Eyebrow>Live activity</Eyebrow>
          <h2 className="mt-1 ex-display text-xl sm:text-2xl font-extrabold">Rewards &amp; payouts</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs text-ex-muted" data-testid="rewards-feed-live">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
      </div>

      <div className="mt-4 rounded-ex-lg border border-white/8 bg-[#121118]/60 p-2 sm:p-3">
        {isLoading ? (
          <div className="space-y-2 p-2" data-testid="rewards-feed-loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 w-full animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        ) : isError ? (
          <EasyXEmptyState icon={Activity} title="Could not load activity" note="We'll retry automatically." />
        ) : !data || data.length === 0 ? (
          <EasyXEmptyState
            icon={Activity}
            title="No rewards yet"
            note="Invest in a plan and your profits, maturities and payouts will stream in here as they happen."
          />
        ) : (
          <ul className="divide-y divide-white/5">
            <AnimatePresence initial={false}>
              {data.map((item) => {
                const meta = CATEGORY_META[item.category] || CATEGORY_META.other;
                const Icon = iconFor(item);
                const isFresh = freshIds.has(item.id);
                return (
                  <motion.li
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: -8 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      backgroundColor: isFresh ? "rgba(52,211,153,0.10)" : "rgba(0,0,0,0)",
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35 }}
                    className="flex items-center gap-3 rounded-xl px-2 py-3 sm:px-3"
                    data-testid="rewards-feed-item"
                  >
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ring-1 ${meta.bg} ${meta.ring} ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">
                        {TYPE_LABEL[item.type] || meta.label}
                      </p>
                      <p className="truncate text-xs text-ex-muted">
                        {timeAgo(item.created_at)}
                        {item.note ? ` · ${item.note}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${meta.tone}`}>
                        {meta.sign}
                        {money(item.amount)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-ex-muted">{meta.label}</p>
                    </div>
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
