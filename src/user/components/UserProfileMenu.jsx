import React, { useState, useRef, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  User,
  Wallet,
  ShieldCheck,
  LifeBuoy,
  LogOut,
  ChevronDown,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  Clock,
  ArrowRight,
  Calculator,
  RefreshCw,
  TrendingUp,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { useWallet, money } from "@/user/api";
import { toast } from "sonner";

/**
 * Calculates the exact arithmetic sum of all user wallet balances:
 * Total Portfolio = Available Balance + Locked Investment
 */
export function calculateWalletBalancesSum(walletData) {
  const available = Math.max(0, Number(walletData?.available_balance || 0));
  const locked = Math.max(0, Number(walletData?.locked_investment || 0));
  const earned = Math.max(0, Number(walletData?.total_earned || 0));
  const invested = Math.max(0, Number(walletData?.total_invested || 0));
  const total = available + locked;

  return {
    available,
    locked,
    earned,
    invested,
    total,
    currency: walletData?.currency || "USDT",
    formattedTotal: money(total),
    formattedAvailable: money(available),
    formattedLocked: money(locked),
    formattedEarned: money(earned),
    formattedInvested: money(invested),
    equation: `${money(available)} (Avail) + ${money(locked)} (Locked) = ${money(total)}`,
  };
}

export default function UserProfileMenu({ align = "right" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const { data: wallet, refetch: refetchWallet, isFetching: isFetchingWallet } = useWallet();

  // Interactive Sum Calculation State
  const [showSumBreakdown, setShowSumBreakdown] = useState(false);
  const [lastCalculatedAt, setLastCalculatedAt] = useState(null);
  const [isCalculatingSum, setIsCalculatingSum] = useState(false);

  // Compute live wallet sum
  const walletSum = useMemo(() => calculateWalletBalancesSum(wallet), [wallet]);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  /**
   * Interactive click handler that executes and displays the wallet balances sum
   */
  const handleTriggerWalletSum = async (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsCalculatingSum(true);

    try {
      if (refetchWallet) {
        await refetchWallet();
      }
    } catch {
      // ignore transient network hiccups
    }

    const calculated = calculateWalletBalancesSum(wallet);
    setLastCalculatedAt(new Date().toLocaleTimeString());
    setShowSumBreakdown(true);
    setIsCalculatingSum(false);

    toast.success(`Sum calculated: ${calculated.formattedTotal} Total Portfolio (${calculated.equation})`, {
      id: "wallet-sum-toast",
    });
  };

  const handleLogout = async () => {
    setIsOpen(false);
    navigate("/", { replace: true });
    try {
      await logout();
    } catch {
      // ignore
    }
    toast.success("Signed out successfully.");
  };

  const initial = (user?.name || user?.email || "U").charAt(0).toUpperCase();
  const kycStatus = user?.kyc_status || "not_submitted";
  const isAdmin = user?.role === "admin";

  const getKycBadge = () => {
    switch (kycStatus) {
      case "approved":
        return { label: "KYC Verified", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
      case "pending":
        return { label: "KYC Pending", color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
      case "rejected":
        return { label: "KYC Rejected", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
      default:
        return { label: "KYC Unverified", color: "text-white/60 bg-white/5 border-white/10" };
    }
  };

  const kycBadge = getKycBadge();

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      {/* Profile Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="View profile & account options"
        data-testid="profile-header-avatar-btn"
        className="group flex items-center gap-2 rounded-full p-0.5 sm:p-1 text-ex-text transition-all duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 active:scale-95 cursor-pointer"
      >
        <div className="relative">
          <div className="h-9 w-9 sm:h-9 sm:w-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 grid place-items-center text-xs sm:text-sm font-bold text-white shadow-md ring-2 ring-white/15 group-hover:ring-purple-400/50 transition">
            {initial}
          </div>
          <span
            className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-ex-ink ${
              kycStatus === "approved" ? "bg-emerald-400" : "bg-purple-400"
            }`}
          />
        </div>
        <ChevronDown
          className={`hidden sm:block h-3.5 w-3.5 text-ex-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-white" : "group-hover:text-white"
          }`}
        />
      </button>

      {/* Profile Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="profile-header-avatar-btn"
          data-testid="profile-dropdown-menu"
          className={`absolute ${
            align === "left" ? "left-0" : "right-0"
          } mt-2 w-80 sm:w-96 origin-top-right rounded-2xl border border-white/10 bg-ex-surface2/95 backdrop-blur-2xl p-3 shadow-2xl ring-1 ring-black/40 z-50 animate-in fade-in-0 zoom-in-95 duration-150`}
        >
          {/* User Identity Header */}
          <div className="p-3 rounded-xl bg-white/[0.04] border border-white/5 space-y-2 mb-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{user?.name || "EasyX Investor"}</p>
                <p className="text-xs text-ex-muted font-mono truncate">{user?.email || "user@easyx.io"}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${kycBadge.color}`}
              >
                {kycStatus === "approved" ? (
                  <ShieldCheck className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {kycBadge.label}
              </span>
            </div>

            {/* Quick Wallet Balance & Interactive Sum Calculation Section */}
            <div
              data-testid="profile-wallet-sum-card"
              className="pt-2.5 border-t border-white/8 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-ex-lav-300 block">
                    Wallet Balances Sum
                  </span>
                  <span
                    data-testid="wallet-sum-total"
                    className="text-base font-mono font-extrabold text-emerald-400"
                  >
                    {walletSum.formattedTotal}
                  </span>
                </div>

                {/* Clickable Sum Function Trigger Button */}
                <button
                  type="button"
                  onClick={handleTriggerWalletSum}
                  disabled={isCalculatingSum || isFetchingWallet}
                  data-testid="profile-sum-btn"
                  title="Sum wallet balances and calculate total portfolio"
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 hover:text-white border border-purple-500/30 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-sm"
                >
                  <Calculator className={`h-3.5 w-3.5 ${isCalculatingSum ? "animate-spin text-purple-400" : ""}`} />
                  <span>{isCalculatingSum ? "Summing..." : showSumBreakdown ? "Recalculate Sum" : "Sum Balances"}</span>
                </button>
              </div>

              {/* Dynamic Sum Breakdown when triggered */}
              {showSumBreakdown && (
                <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 space-y-1.5 text-[11px] font-mono animate-in fade-in-50 duration-200">
                  <div className="flex items-center justify-between text-ex-muted">
                    <span className="flex items-center gap-1">
                      <Wallet className="h-3 w-3 text-emerald-400" /> Available:
                    </span>
                    <span className="text-white font-semibold">{walletSum.formattedAvailable}</span>
                  </div>
                  <div className="flex items-center justify-between text-ex-muted">
                    <span className="flex items-center gap-1">
                      <Layers className="h-3 w-3 text-purple-400" /> Locked Invested:
                    </span>
                    <span className="text-white font-semibold">{walletSum.formattedLocked}</span>
                  </div>
                  <div className="pt-1 border-t border-white/10 flex items-center justify-between font-bold">
                    <span className="text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Total Sum:
                    </span>
                    <span className="text-emerald-300 text-xs">{walletSum.formattedTotal}</span>
                  </div>
                  {lastCalculatedAt && (
                    <div className="text-[9px] text-ex-muted/70 text-right font-sans pt-0.5">
                      Verified at {lastCalculatedAt}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px]">
                <Link
                  to="/wallet"
                  onClick={() => setIsOpen(false)}
                  className="font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 hover:underline"
                >
                  View Wallet Details <ArrowRight className="h-3 w-3" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSumBreakdown((prev) => !prev)}
                  className="text-[10px] text-ex-muted hover:text-white underline decoration-dotted"
                >
                  {showSumBreakdown ? "Hide Formula" : "Show Formula"}
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-0.5 py-1">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              data-testid="profile-dropdown-link-profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/8 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-purple-500/10 border border-purple-500/20 grid place-items-center text-purple-300">
                <User className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-semibold block">My Profile & Security</span>
                <span className="text-[10px] text-ex-muted block">Manage personal details, PIN & password</span>
              </div>
            </Link>

            <Link
              to="/kyc"
              onClick={() => setIsOpen(false)}
              data-testid="profile-dropdown-link-kyc"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/8 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 grid place-items-center text-emerald-300">
                <ShieldCheck className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-semibold block">KYC Verification</span>
                <span className="text-[10px] text-ex-muted block">Identity validation & verification status</span>
              </div>
            </Link>

            <Link
              to="/support"
              onClick={() => setIsOpen(false)}
              data-testid="profile-dropdown-link-support"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-white/90 hover:text-white hover:bg-white/8 transition"
            >
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 grid place-items-center text-indigo-300">
                <LifeBuoy className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1">
                <span className="font-semibold block">Help & Support</span>
                <span className="text-[10px] text-ex-muted block">Create tickets and chat with AI assistant</span>
              </div>
            </Link>

            {isAdmin && (
              <Link
                to="/admin/overview"
                onClick={() => setIsOpen(false)}
                data-testid="profile-dropdown-link-admin"
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 border border-amber-500/20 transition"
              >
                <div className="h-7 w-7 rounded-lg bg-amber-500/20 border border-amber-500/30 grid place-items-center text-amber-300">
                  <Sparkles className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold block">Admin Console</span>
                  <span className="text-[10px] text-amber-300/70 block">Switch to administrative management</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 opacity-60" />
              </Link>
            )}
          </div>

          {/* Sign Out Section */}
          <div className="pt-1.5 mt-1.5 border-t border-white/8">
            <button
              type="button"
              onClick={handleLogout}
              data-testid="profile-dropdown-logout-btn"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition cursor-pointer"
            >
              <div className="h-7 w-7 rounded-lg bg-rose-500/10 border border-rose-500/20 grid place-items-center text-rose-400">
                <LogOut className="h-3.5 w-3.5" />
              </div>
              <span className="font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

