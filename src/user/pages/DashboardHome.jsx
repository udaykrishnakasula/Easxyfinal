import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Wallet as WalletIcon, TrendingUp, Layers, ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { useDashboard, money } from "@/user/api";
import DashboardPlanCarousel from "@/user/components/DashboardPlanCarousel";
import UnlockedInvestmentsSection from "@/user/components/UnlockedInvestmentsSection";
import PromotionalMediaCarousel from "@/user/components/PromotionalMediaCarousel";
import RewardsFeed from "@/user/components/RewardsFeed";
import { EasyXStat, Eyebrow, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";
import AnimatedOwl from "@/user/components/AnimatedOwl";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export default function DashboardHome() {
  const navigate = useNavigate();
  const { data, isLoading, isError } = useDashboard();

  if (isLoading) return <EasyXLoader className="py-24" />;
  if (isError || !data) {
    return <EasyXEmptyState icon={WalletIcon} title="Could not load your dashboard" note="Please refresh the page." />;
  }

  const { user = {}, wallet = {}, plans = [] } = data || {};

  return (
    <motion.div
      data-testid="dashboard-home"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-5 sm:space-y-6"
    >
      {/* Intro — "the landing, after entering the product" */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-ex-lg border border-white/8 p-6 sm:p-8 transition-all duration-300 hover:border-white/15"
        style={{
          background:
            "radial-gradient(120% 140% at 100% 0%, rgba(150,128,220,0.22) 0%, rgba(23,22,29,0) 55%), linear-gradient(160deg,#17161d,#0c0c0f)",
        }}
      >
        <Eyebrow>Your EasyX portfolio</Eyebrow>

        <h1 className="mt-2 ex-display text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight leading-tight flex items-center gap-1 sm:gap-2">
          <span>
            Welcome, <span className="ex-accent-text">{user?.name?.split(" ")?.[0] || "Investor"}</span>
          </span>
          <span className="inline-flex items-center justify-center align-middle w-12 h-12 sm:w-14 sm:h-14 overflow-hidden bg-transparent shrink-0">
            <video
              src="/gemini_generated_video_ce8e299d.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover scale-135 block bg-transparent"
              style={{
                mixBlendMode: "screen",
              }}
            />
          </span>
        </h1>
        <p className="mt-2 text-ex-muted text-sm sm:text-base max-w-md">
          Grow your USDT with EasyX investment plans. Your wealth works while you rest.
        </p>

        {/* Deposit & Withdrawal quick action buttons */}
        <div className="mt-5 flex flex-wrap items-center gap-3.5">
          {/* Deposit Button with Ambient Glow & Shimmer Animation */}
          <div className="relative group">
            {/* Animated Ambient Glow Layer */}
            <motion.div
              animate={{
                opacity: [0.5, 0.85, 0.5],
                scale: [0.98, 1.04, 0.98],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 opacity-60 blur-md group-hover:opacity-100 group-hover:blur-lg transition-all duration-300 pointer-events-none"
            />

            <motion.button
              type="button"
              id="dashboard-deposit-btn"
              onClick={() => navigate("/deposit")}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              className="relative inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-full font-semibold text-sm text-neutral-950 bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-300 shadow-[0_4px_24px_rgba(52,211,153,0.45)] hover:shadow-[0_8px_32px_rgba(52,211,153,0.7)] cursor-pointer overflow-hidden border border-emerald-200/50"
            >
              {/* Continuous Light Shimmer Reflection */}
              <motion.div
                animate={{
                  x: ["-130%", "230%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.8,
                  ease: "easeInOut",
                  repeatDelay: 1.2,
                }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-[-20deg] pointer-events-none"
              />

              <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-neutral-950/15 text-neutral-950 transition-transform duration-300 group-hover:-rotate-45 group-hover:scale-110">
                <ArrowDownLeft className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span className="relative tracking-tight font-bold">Deposit</span>
            </motion.button>
          </div>

          {/* Withdrawal Button with Ambient Frosted Pulse & Shimmer Animation */}
          <div className="relative group">
            {/* Ambient Border Glow Layer */}
            <motion.div
              animate={{
                opacity: [0.2, 0.45, 0.2],
              }}
              transition={{
                duration: 3.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute -inset-0.5 rounded-full bg-gradient-to-r from-white/10 via-purple-400/25 to-white/10 opacity-30 blur-[6px] group-hover:opacity-75 group-hover:blur-md transition-all duration-300 pointer-events-none"
            />

            <motion.button
              type="button"
              id="dashboard-withdrawal-btn"
              onClick={() => navigate("/withdraw")}
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 450, damping: 22 }}
              className="relative inline-flex items-center justify-center gap-2.5 h-11 px-6 rounded-full font-semibold text-sm text-white bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 hover:border-white/30 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_28px_rgba(150,128,220,0.3)] cursor-pointer overflow-hidden transition-colors duration-300"
            >
              {/* Periodic Gentle Shimmer */}
              <motion.div
                animate={{
                  x: ["-130%", "230%"],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 3.2,
                  ease: "easeInOut",
                  repeatDelay: 1.8,
                }}
                className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg] pointer-events-none"
              />

              <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white/10 text-ex-lav-300 group-hover:text-white transition-all duration-300 group-hover:rotate-45 group-hover:scale-110">
                <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
              </span>
              <span className="relative tracking-tight font-medium">Withdrawal</span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Three balances: Available, Locked Investment, Total Portfolio */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2 }} data-testid="summary-wallet">
          <EasyXStat label="Available balance" value={money(wallet?.available_balance || 0)} icon={WalletIcon} gradient />
        </motion.div>
        <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2 }}>
          <EasyXStat label="Locked investment" value={money(wallet?.locked_investment || 0)} icon={Layers} />
        </motion.div>
        <motion.div whileHover={{ y: -3, scale: 1.01 }} transition={{ duration: 0.2 }}>
          <EasyXStat label="Total portfolio" value={money(wallet?.total_portfolio || 0)} icon={TrendingUp} gradient />
        </motion.div>
      </motion.div>

      {/* Plan cards — same 3D certificate carousel as the landing page */}
      <motion.div variants={itemVariants}>
        <div className="flex items-end justify-between">
          <div>
            <Eyebrow>Investment plans</Eyebrow>
            <h2 className="mt-1 ex-display text-xl sm:text-2xl font-extrabold">Choose your tier</h2>
          </div>
          <span className="text-xs text-ex-muted">1 card = 1 investment</span>
        </div>
        <DashboardPlanCarousel plans={plans} walletBalance={wallet?.available_balance || 0} userName={user?.name || "Investor"} />
      </motion.div>

      {/* My Unlocked Investments section — 1 dynamic card per real investment record */}
      <motion.div variants={itemVariants}>
        <UnlockedInvestmentsSection userName={user?.name || "Investor"} />
      </motion.div>

      {/* Promotional Media Carousel — supports images & videos, hides if no items published */}
      <motion.div variants={itemVariants}>
        <PromotionalMediaCarousel />
      </motion.div>

      {/* Live rewards & payouts activity feed */}
      <motion.div variants={itemVariants}>
        <RewardsFeed />
      </motion.div>
    </motion.div>
  );
}
