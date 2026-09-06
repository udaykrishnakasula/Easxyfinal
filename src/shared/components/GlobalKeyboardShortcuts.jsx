import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Command,
  Search,
  LayoutDashboard,
  Wallet,
  PiggyBank,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  ShieldCheck,
  Bell,
  ReceiptText,
  User,
  LogOut,
  Activity,
  CalendarClock,
  Layers,
  Download,
  ScrollText,
  Settings,
  HelpCircle,
  X,
  Keyboard,
} from "lucide-react";
import { useAuth } from "@/shared/context/AuthContext";
import { toast } from "sonner";

export default function GlobalKeyboardShortcuts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef(null);
  const listRef = useRef(null);

  const isAdmin = user?.role === "admin";
  const isAuthenticated = Boolean(user);

  // Command pallet items based on user role & auth state
  const commands = useMemo(() => {
    if (!isAuthenticated) {
      return [
        { id: "home", title: "Go to Home", category: "Navigation", path: "/", icon: LayoutDashboard, shortcut: "G H" },
        { id: "login", title: "Sign In", category: "Account", path: "/login", icon: User, shortcut: "G L" },
        { id: "register", title: "Create Account", category: "Account", path: "/register", icon: User, shortcut: "G R" },
      ];
    }

    const items = [
      // Core User Navigation
      { id: "user-dashboard", title: "User Dashboard", category: "User App", path: "/dashboard", icon: LayoutDashboard, shortcut: "G D" },
      { id: "user-investments", title: "Investments & Plans", category: "User App", path: "/investments", icon: PiggyBank, shortcut: "G I" },
      { id: "user-deposit", title: "Deposit USDT", category: "User App", path: "/deposit", icon: ArrowDownToLine, shortcut: "G +" },
      { id: "user-withdraw", title: "Withdraw Funds", category: "User App", path: "/withdraw", icon: ArrowUpFromLine, shortcut: "G W" },
      { id: "user-wallet", title: "Wallet & Balances", category: "User App", path: "/wallet", icon: Wallet, shortcut: "G B" },
      { id: "user-kyc", title: "KYC Verification", category: "User App", path: "/kyc", icon: ShieldCheck, shortcut: "G K" },
      { id: "user-referrals", title: "Referrals & Commission", category: "User App", path: "/referrals", icon: Users, shortcut: "G F" },
      { id: "user-transactions", title: "Transaction History", category: "User App", path: "/transactions", icon: ReceiptText, shortcut: "G T" },
      { id: "user-notifications", title: "Notifications", category: "User App", path: "/notifications", icon: Bell, shortcut: "G N" },
      { id: "user-profile", title: "Profile Settings", category: "User App", path: "/profile", icon: User, shortcut: "G P" },
    ];

    if (isAdmin) {
      items.push(
        // Admin Navigation
        { id: "admin-overview", title: "Admin Overview", category: "Admin Console", path: "/admin", icon: LayoutDashboard, shortcut: "A O" },
        { id: "admin-analytics", title: "Admin UX & Error Analytics", category: "Admin Console", path: "/admin/analytics", icon: Activity, shortcut: "A A" },
        { id: "admin-users", title: "Admin User Management", category: "Admin Console", path: "/admin/users", icon: Users, shortcut: "A U" },
        { id: "admin-deposits", title: "Admin Deposit Queue", category: "Admin Console", path: "/admin/deposits", icon: ArrowDownToLine, shortcut: "A D" },
        { id: "admin-investments", title: "Admin Investment Contracts", category: "Admin Console", path: "/admin/investments", icon: PiggyBank, shortcut: "A I" },
        { id: "admin-maturities", title: "Admin Maturity Management", category: "Admin Console", path: "/admin/maturities", icon: CalendarClock, shortcut: "A M" },
        { id: "admin-withdrawals", title: "Admin Withdrawal Payouts", category: "Admin Console", path: "/admin/withdrawals", icon: ArrowUpFromLine, shortcut: "A W" },
        { id: "admin-kyc", title: "Admin KYC Review Queue", category: "Admin Console", path: "/admin/kyc", icon: ShieldCheck, shortcut: "A K" },
        { id: "admin-referrals", title: "Admin Referral Network", category: "Admin Console", path: "/admin/referrals", icon: Users, shortcut: "A R" },
        { id: "admin-plans", title: "Admin Tier Plans", category: "Admin Console", path: "/admin/plans", icon: Layers, shortcut: "A P" },
        { id: "admin-wallet", title: "Admin Master Wallet", category: "Admin Console", path: "/admin/wallet", icon: Wallet, shortcut: "A B" },
        { id: "admin-reports", title: "Admin Reports & Export", category: "Admin Console", path: "/admin/reports", icon: Download, shortcut: "A E" },
        { id: "admin-audit", title: "Admin Audit Logs", category: "Admin Console", path: "/admin/audit", icon: ScrollText, shortcut: "A L" },
        { id: "admin-settings", title: "Admin Platform Settings", category: "Admin Console", path: "/admin/settings", icon: Settings, shortcut: "A S" }
      );
    }

    // Actions
    items.push({
      id: "action-shortcuts",
      title: "Keyboard Shortcuts Reference",
      category: "Help",
      action: () => setShowCheatSheet(true),
      icon: HelpCircle,
      shortcut: "?",
    });

    items.push({
      id: "action-logout",
      title: "Sign Out",
      category: "Account",
      action: async () => {
        navigate("/", { replace: true });
        try {
          await logout();
        } catch {
          // ignore
        }
        toast.success("Signed out successfully");
      },
      icon: LogOut,
    });

    return items;
  }, [isAuthenticated, isAdmin, logout, navigate]);

  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) return commands;
    const q = searchQuery.toLowerCase().trim();
    return commands.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        (c.path && c.path.toLowerCase().includes(q))
    );
  }, [commands, searchQuery]);

  // Handle chord key sequence states (e.g. 'g' then 'd')
  const keySequenceRef = useRef({ key: "", timestamp: 0 });

  useEffect(() => {
    function handleKeyDown(e) {
      const activeElement = document.activeElement;
      const isInput =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable);

      // 1. Toggle Command Palette with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setShowCheatSheet(false);
        setSearchQuery("");
        setSelectedIndex(0);
        return;
      }

      // 2. Toggle Shortcuts Cheat Sheet with ? (when not inside an input)
      if (!isInput && e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setShowCheatSheet((prev) => !prev);
        setIsOpen(false);
        return;
      }

      // 3. Close with Escape
      if (e.key === "Escape") {
        if (isOpen) {
          e.preventDefault();
          setIsOpen(false);
        }
        if (showCheatSheet) {
          e.preventDefault();
          setShowCheatSheet(false);
        }
        return;
      }

      // If user is currently typing in an input/textarea and palette is not open, do not trigger chord shortcuts
      if (isInput && !isOpen) {
        return;
      }

      // If palette is OPEN, handle navigation inside list
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
        } else if (e.key === "Enter") {
          e.preventDefault();
          const selected = filteredCommands[selectedIndex];
          if (selected) {
            handleExecute(selected);
          }
        }
        return;
      }

      // 4. Quick Chord & Direct Navigation (when NOT typing in input)
      if (!isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const now = Date.now();
        const prevKey = keySequenceRef.current.key;
        const prevTime = keySequenceRef.current.timestamp;
        const isSequence = now - prevTime < 800; // 800ms chord window

        const key = e.key.toLowerCase();

        // Check two-key chords: "g ..." (Go to User route) or "a ..." (Go to Admin route)
        if (isSequence) {
          if (prevKey === "g") {
            keySequenceRef.current = { key: "", timestamp: 0 };
            switch (key) {
              case "d":
              case "h":
                e.preventDefault();
                navigate("/dashboard");
                toast.info("Navigated to Dashboard");
                return;
              case "i":
                e.preventDefault();
                navigate("/investments");
                toast.info("Navigated to Investments");
                return;
              case "b":
                e.preventDefault();
                navigate("/wallet");
                toast.info("Navigated to Wallet");
                return;
              case "+":
              case "=":
                e.preventDefault();
                navigate("/deposit");
                toast.info("Navigated to Deposit");
                return;
              case "w":
                e.preventDefault();
                navigate("/withdraw");
                toast.info("Navigated to Withdraw");
                return;
              case "k":
                e.preventDefault();
                navigate("/kyc");
                toast.info("Navigated to KYC");
                return;
              case "f":
              case "r":
                e.preventDefault();
                navigate("/referrals");
                toast.info("Navigated to Referrals");
                return;
              case "t":
                e.preventDefault();
                navigate("/transactions");
                toast.info("Navigated to Transactions");
                return;
              case "n":
                e.preventDefault();
                navigate("/notifications");
                toast.info("Navigated to Notifications");
                return;
              case "p":
                e.preventDefault();
                navigate("/profile");
                toast.info("Navigated to Profile");
                return;
              default:
                break;
            }
          } else if (prevKey === "a" && isAdmin) {
            keySequenceRef.current = { key: "", timestamp: 0 };
            switch (key) {
              case "o":
              case "d":
                e.preventDefault();
                navigate("/admin");
                toast.info("Navigated to Admin Overview");
                return;
              case "a":
                e.preventDefault();
                navigate("/admin/analytics");
                toast.info("Navigated to UX & Error Analytics");
                return;
              case "u":
                e.preventDefault();
                navigate("/admin/users");
                toast.info("Navigated to Admin Users");
                return;
              case "q":
              case "p":
                e.preventDefault();
                navigate("/admin/deposits");
                toast.info("Navigated to Admin Deposits");
                return;
              case "i":
                e.preventDefault();
                navigate("/admin/investments");
                toast.info("Navigated to Admin Investments");
                return;
              case "m":
                e.preventDefault();
                navigate("/admin/maturities");
                toast.info("Navigated to Admin Maturities");
                return;
              case "w":
                e.preventDefault();
                navigate("/admin/withdrawals");
                toast.info("Navigated to Admin Withdrawals");
                return;
              case "k":
                e.preventDefault();
                navigate("/admin/kyc");
                toast.info("Navigated to Admin KYC");
                return;
              case "r":
                e.preventDefault();
                navigate("/admin/referrals");
                toast.info("Navigated to Admin Referrals");
                return;
              case "l":
                e.preventDefault();
                navigate("/admin/plans");
                toast.info("Navigated to Admin Plans");
                return;
              case "b":
                e.preventDefault();
                navigate("/admin/wallet");
                toast.info("Navigated to Admin Wallet");
                return;
              case "e":
                e.preventDefault();
                navigate("/admin/reports");
                toast.info("Navigated to Admin Reports");
                return;
              case "s":
                e.preventDefault();
                navigate("/admin/settings");
                toast.info("Navigated to Admin Settings");
                return;
              default:
                break;
            }
          }
        }

        // Single key listeners to initiate chord sequence
        if (key === "g" || (key === "a" && isAdmin)) {
          keySequenceRef.current = { key, timestamp: now };
          return;
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showCheatSheet, filteredCommands, selectedIndex, isAdmin, navigate, logout]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleExecute = (item) => {
    setIsOpen(false);
    if (item.action) {
      item.action();
    } else if (item.path) {
      navigate(item.path);
    }
  };

  return (
    <>
      {/* Floating Keyboard Shortcut Trigger Badge (desktop only) */}
      <div className="fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-2">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-ex-surface/90 px-3 py-1.5 text-xs text-ex-muted backdrop-blur-md shadow-lg hover:border-ex-accent/40 hover:text-white transition group"
          title="Open Command Palette (Ctrl+K or Cmd+K)"
        >
          <Command className="h-3.5 w-3.5 text-ex-accent group-hover:scale-110 transition" />
          <span className="font-mono text-[11px] font-semibold text-ex-accent">⌘K</span>
          <span className="text-[11px]">Command Menu</span>
        </button>

        <button
          onClick={() => setShowCheatSheet(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-ex-surface/90 text-ex-muted backdrop-blur-md shadow-lg hover:border-white/30 hover:text-white transition"
          title="Keyboard Shortcuts Reference (?)"
        >
          <Keyboard className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* 1. Interactive Command Palette Dialog */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[12vh] backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-ex-surface/95 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5">
              <Search className="h-5 w-5 text-ex-accent shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search pages, actions, or jump anywhere... (e.g. Deposit, KYC, Users)"
                className="w-full bg-transparent text-sm text-white placeholder:text-ex-muted focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedIndex(0);
                    inputRef.current?.focus();
                  }}
                  className="rounded p-1 text-ex-muted hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden sm:inline-block rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-ex-muted">
                ESC to close
              </kbd>
            </div>

            {/* Commands List */}
            <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredCommands.length === 0 ? (
                <div className="py-10 text-center text-sm text-ex-muted">
                  No matching pages or commands found for &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredCommands.map((item, index) => {
                  const Icon = item.icon || LayoutDashboard;
                  const isSelected = index === selectedIndex;
                  const isCurrent = location.pathname === item.path;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleExecute(item)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-xs transition duration-150 ${
                        isSelected
                          ? "bg-ex-accent text-ex-ink font-semibold shadow-md"
                          : "text-ex-text hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
                            isSelected
                              ? "bg-ex-ink/20 text-ex-ink"
                              : "bg-white/5 text-ex-accent"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="truncate">
                          <div className="font-medium truncate">{item.title}</div>
                          <div
                            className={`text-[10px] ${
                              isSelected ? "text-ex-ink/80" : "text-ex-muted"
                            }`}
                          >
                            {item.category} {item.path && `• ${item.path}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {isCurrent && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isSelected
                                ? "bg-ex-ink text-ex-accent"
                                : "bg-white/10 text-ex-accent"
                            }`}
                          >
                            Current
                          </span>
                        )}
                        {item.shortcut && (
                          <kbd
                            className={`rounded px-1.5 py-0.5 font-mono text-[10px] ${
                              isSelected
                                ? "bg-ex-ink/20 text-ex-ink font-bold"
                                : "bg-white/10 text-ex-muted"
                            }`}
                          >
                            {item.shortcut}
                          </kbd>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Palette Footer */}
            <div className="flex items-center justify-between border-t border-white/10 bg-black/30 px-4 py-2 text-[11px] text-ex-muted">
              <div className="flex items-center gap-3">
                <span>
                  <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">↑</kbd>
                  <kbd className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px] ml-0.5">↓</kbd> Navigate
                </span>
                <span>
                  <kbd className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px]">↵</kbd> Select
                </span>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCheatSheet(true);
                }}
                className="hover:text-ex-accent flex items-center gap-1 transition"
              >
                <Keyboard className="h-3 w-3" />
                Shortcuts Guide (?)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Global Shortcuts Reference (Cheat Sheet) Modal */}
      {showCheatSheet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowCheatSheet(false)}
        >
          <div
            className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-ex-surface/95 text-white shadow-2xl backdrop-blur-xl ring-1 ring-white/10 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-ex-accent/20 text-ex-accent">
                  <Keyboard className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Global Keyboard Shortcuts</h3>
                  <p className="text-xs text-ex-muted">Speed up navigation and workflows across EasyX</p>
                </div>
              </div>
              <button
                onClick={() => setShowCheatSheet(false)}
                className="rounded-lg p-1.5 text-ex-muted hover:bg-white/10 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6 space-y-6 text-xs">
              {/* General Shortcuts */}
              <div>
                <h4 className="mb-3 font-semibold uppercase tracking-wider text-ex-accent text-[11px]">
                  General & Commands
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ShortcutItem keys={["⌘", "K"]} label="Open Command Palette" desc="Jump to any page or feature" />
                  <ShortcutItem keys={["Ctrl", "K"]} label="Open Command Palette" desc="Windows / Linux" />
                  <ShortcutItem keys={["?"]} label="Shortcuts Reference" desc="Toggle this modal" />
                  <ShortcutItem keys={["ESC"]} label="Close Dialogs / Modals" desc="Dismiss current active overlay" />
                  <ShortcutItem keys={["Shift", "Q"]} label="Sign Out" desc="Log out of session" />
                </div>
              </div>

              {/* User Navigation (G then ...) */}
              <div>
                <h4 className="mb-3 font-semibold uppercase tracking-wider text-emerald-400 text-[11px]">
                  User Navigation (Press &apos;G&apos; then key)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ShortcutItem keys={["G", "D"]} label="User Dashboard" />
                  <ShortcutItem keys={["G", "I"]} label="Investments" />
                  <ShortcutItem keys={["G", "B"]} label="Wallet & Balance" />
                  <ShortcutItem keys={["G", "+"]} label="Deposit USDT" />
                  <ShortcutItem keys={["G", "W"]} label="Withdraw Funds" />
                  <ShortcutItem keys={["G", "K"]} label="KYC Verification" />
                  <ShortcutItem keys={["G", "F"]} label="Referrals & Teams" />
                  <ShortcutItem keys={["G", "T"]} label="Transaction History" />
                  <ShortcutItem keys={["G", "N"]} label="Notifications" />
                  <ShortcutItem keys={["G", "P"]} label="User Profile" />
                </div>
              </div>

              {/* Admin Navigation (A then ...) */}
              {isAdmin && (
                <div>
                  <h4 className="mb-3 font-semibold uppercase tracking-wider text-amber-400 text-[11px]">
                    Admin Navigation (Press &apos;A&apos; then key)
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ShortcutItem keys={["A", "O"]} label="Admin Overview" />
                    <ShortcutItem keys={["A", "A"]} label="UX & Error Analytics" />
                    <ShortcutItem keys={["A", "U"]} label="Users Directory" />
                    <ShortcutItem keys={["A", "D"]} label="Deposit Review Queue" />
                    <ShortcutItem keys={["A", "I"]} label="Active Investments" />
                    <ShortcutItem keys={["A", "M"]} label="Maturity Management" />
                    <ShortcutItem keys={["A", "W"]} label="Withdrawal Approvals" />
                    <ShortcutItem keys={["A", "K"]} label="KYC Document Reviews" />
                    <ShortcutItem keys={["A", "R"]} label="Referral Networks" />
                    <ShortcutItem keys={["A", "E"]} label="Reports & Exports" />
                    <ShortcutItem keys={["A", "L"]} label="Audit Trail Logs" />
                    <ShortcutItem keys={["A", "S"]} label="Platform Settings" />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-white/10 bg-black/40 px-6 py-3 text-[11px] text-ex-muted">
              <span>Shortcuts are active throughout the app except when typing in form inputs.</span>
              <button
                onClick={() => setShowCheatSheet(false)}
                className="rounded-lg bg-ex-accent px-3 py-1 text-xs font-bold text-ex-ink hover:opacity-90 transition"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ShortcutItem({ keys, label, desc }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2">
      <div>
        <div className="font-medium text-white">{label}</div>
        {desc && <div className="text-[10px] text-ex-muted">{desc}</div>}
      </div>
      <div className="flex items-center gap-1">
        {keys.map((k, idx) => (
          <kbd
            key={idx}
            className="grid min-w-[20px] place-items-center rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10"
          >
            {k}
          </kbd>
        ))}
      </div>
    </div>
  );
}
