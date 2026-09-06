import React, { useState, useMemo } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  ShieldCheck,
  Inbox,
  Settings,
  ArrowLeft,
  LogOut,
  BadgeCheck,
  Share2,
  Users,
  LayoutDashboard,
  ArrowUpFromLine,
  PiggyBank,
  CalendarClock,
  Layers,
  Download,
  ScrollText,
  Wallet,
  Activity,
  BellRing,
  LifeBuoy,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/shared/context/AuthContext";
import { useUnreadCount } from "@/user/api";
import { useAdminOverview } from "@/admin/adminApi";
import { useRealtimeNotifications } from "@/shared/hooks/useRealtimeNotifications";
import { toast } from "sonner";
import AppLogo from "@/shared/components/AppLogo";
import SectionErrorBoundary from "@/shared/analytics/SectionErrorBoundary";

export const ADMIN_NAV_GROUPS = [
  {
    id: "workspace",
    title: "WORKSPACE & CORE",
    items: [
      { to: "/admin/overview", label: "Overview", icon: LayoutDashboard, exact: true, aliases: ["/admin"] },
      { to: "/admin/users", label: "User Management", icon: Users },
      { to: "/admin/support", label: "Support Desk", icon: LifeBuoy, badgeKey: "support" },
    ],
  },
  {
    id: "finance",
    title: "FINANCIAL OPERATIONS",
    items: [
      { to: "/admin/deposits", label: "Deposits Queue", icon: Inbox, badgeKey: "deposits" },
      { to: "/admin/withdrawals", label: "Withdrawals Queue", icon: ArrowUpFromLine, badgeKey: "withdrawals" },
      { to: "/admin/investments", label: "Investments", icon: PiggyBank },
      { to: "/admin/maturities", label: "Maturities", icon: CalendarClock },
      { to: "/admin/plans", label: "Plans", icon: Layers },
      { to: "/admin/wallet", label: "Treasury & Wallet", icon: Wallet },
    ],
  },
  {
    id: "compliance",
    title: "VERIFICATION & COMPLIANCE",
    items: [
      { to: "/admin/kyc", label: "KYC & Verification", icon: BadgeCheck, badgeKey: "kyc" },
      { to: "/admin/referrals", label: "Referrals & Affiliates", icon: Share2 },
    ],
  },
  {
    id: "communication",
    title: "COMMUNICATION & MARKETING",
    items: [
      {
        to: "/admin/promotions",
        label: "Promotional Media",
        icon: Sparkles,
      },
      {
        to: "/admin/notifications",
        label: "Notifications & Alerts",
        icon: BellRing,
        badgeKey: "notifications",
        aliases: ["/admin/reminders"],
      },
    ],
  },
  {
    id: "system",
    title: "SYSTEM & OBSERVABILITY",
    items: [
      { to: "/admin/analytics", label: "UX & Error Analytics", icon: Activity },
      { to: "/admin/reports", label: "Reports & Exports", icon: Download },
      { to: "/admin/audit", label: "Audit Logs", icon: ScrollText },
      {
        to: "/admin/settings",
        label: "Settings & Operations",
        icon: Settings,
        aliases: ["/admin/maintenance"],
      },
    ],
  },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Collapsed sections state (all open by default for immediate discoverability)
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: overviewData } = useAdminOverview();
  useRealtimeNotifications();

  // Pending queue badges from live overview cache
  const pendingCounts = useMemo(() => {
    return {
      deposits: overviewData?.deposits?.pending || 0,
      withdrawals: overviewData?.withdrawals?.pending || 0,
      kyc: overviewData?.kyc?.pending || 0,
      notifications: unreadCount || 0,
      support: overviewData?.support?.open || 0,
    };
  }, [overviewData, unreadCount]);

  const toggleGroup = (groupId) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isItemActive = (item) => {
    const path = location.pathname;
    if (item.exact) {
      return path === item.to || (item.aliases && item.aliases.includes(path));
    }
    if (path.startsWith(item.to)) {
      return true;
    }
    if (item.aliases && item.aliases.some((alias) => path.startsWith(alias))) {
      return true;
    }
    return false;
  };

  const handleLogout = async () => {
    navigate("/", { replace: true });
    try {
      await logout();
    } catch {
      // ignore
    }
    toast.success("Signed out.");
  };

  return (
    <div className="min-h-screen bg-ex-bg text-ex-text flex">
      {/* Desktop Sidebar (Organized Information Architecture) */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/8 bg-ex-surface/90 backdrop-blur-md sticky top-0 h-screen z-20">
        {/* Brand Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <AppLogo showName size="sm" subtitle="Admin Console" />
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" title="System Live" />
        </div>

        {/* Admin Identity Badge */}
        <div className="px-3 py-2 border-b border-white/5 bg-white/[0.015]">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-black/20 border border-white/5">
            <div className="h-6 w-6 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[11px] font-bold">
              {user?.email?.charAt(0).toUpperCase() || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-medium text-white block truncate leading-tight">
                {user?.email || "Administrator"}
              </span>
              <span className="text-[9px] text-white/40 block leading-tight">Super Admin</span>
            </div>
          </div>
        </div>

        {/* Grouped Navigation Scroll Area */}
        <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {ADMIN_NAV_GROUPS.map((group) => {
            const isCollapsed = Boolean(collapsedGroups[group.id]);
            const hasActiveChild = group.items.some((item) => isItemActive(item));

            return (
              <div key={group.id} className="space-y-1">
                {/* Group Section Header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-bold text-white/40 hover:text-white/70 uppercase tracking-wider transition select-none group"
                >
                  <span className={hasActiveChild ? "text-purple-400/90 font-extrabold" : ""}>
                    {group.title}
                  </span>
                  <span className="text-white/30 group-hover:text-white/60">
                    {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </span>
                </button>

                {/* Group Navigation Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5 pt-0.5">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] || 0 : 0;

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          className={`group flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                            active
                              ? "bg-purple-600 text-white font-semibold shadow-sm shadow-purple-600/20"
                              : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <item.icon
                              className={`h-4 w-4 shrink-0 transition-colors ${
                                active ? "text-white" : "text-white/50 group-hover:text-purple-300"
                              }`}
                            />
                            <span className="truncate">{item.label}</span>
                          </div>

                          {/* Dynamic Status / Queue Badge */}
                          {badgeCount > 0 && (
                            <span
                              className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-colors ${
                                active
                                  ? "bg-white text-purple-950"
                                  : item.badgeKey === "notifications"
                                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                              }`}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Sidebar Footer Controls */}
        <div className="p-3 border-t border-white/8 space-y-1.5 bg-black/20 shrink-0">
          <button
            onClick={() => navigate("/dashboard")}
            data-testid="admin-switch-user-sidebar"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 transition"
            title="Switch to User View"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <span>Switch User</span>
          </button>

          <button
            onClick={handleLogout}
            data-testid="admin-logout-sidebar"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
            title="Log Out of Admin"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Top Header */}
        <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3 border-b border-white/8 bg-ex-surface/60 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-white/70">Admin Operations Console</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/8 text-xs text-white/80">
              <div className="h-5 w-5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center text-[10px] font-bold">
                {user?.email?.charAt(0).toUpperCase() || "A"}
              </div>
              <span className="font-medium text-white/90 truncate max-w-[200px]">
                {user?.email || "Administrator"}
              </span>
            </div>

            <button
              onClick={() => navigate("/dashboard")}
              data-testid="admin-switch-user-header"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/80 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 transition shadow-sm"
              title="Switch to User View"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-purple-400 shrink-0" />
              <span>Switch User</span>
            </button>

            <button
              onClick={handleLogout}
              data-testid="admin-logout-header"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition shadow-sm"
              title="Log Out of Admin"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Mobile Top Header */}
        <header className="md:hidden flex items-center justify-between border-b border-white/10 bg-ex-surface/95 backdrop-blur-md p-4 sticky top-0 z-30">
          <AppLogo showName size="sm" subtitle="Operations Console" />
          <button
            onClick={() => setMobileNavOpen(!mobileNavOpen)}
            className="p-2 rounded-xl bg-white/5 text-white hover:bg-white/10 border border-white/10 transition"
            aria-label="Toggle navigation"
          >
            {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Categorized Drawer Navigation */}
        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 top-16 bg-ex-bg/98 backdrop-blur-xl z-40 p-4 overflow-y-auto space-y-4 flex flex-col">
            <div className="flex-1 space-y-4">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.id} className="space-y-1 bg-black/20 p-2.5 rounded-2xl border border-white/5">
                  <div className="px-2 py-1 text-[10px] font-bold text-purple-400 uppercase tracking-wider">
                    {group.title}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const active = isItemActive(item);
                      const badgeCount = item.badgeKey ? pendingCounts[item.badgeKey] || 0 : 0;

                      return (
                        <NavLink
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                            active
                              ? "bg-purple-600 text-white font-semibold"
                              : "text-white/70 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <item.icon className={`h-4 w-4 ${active ? "text-white" : "text-white/50"}`} />
                            <span>{item.label}</span>
                          </div>

                          {badgeCount > 0 && (
                            <span
                              className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                                active ? "bg-white text-purple-900" : "bg-purple-500/20 text-purple-300"
                              }`}
                            >
                              {badgeCount > 99 ? "99+" : badgeCount}
                            </span>
                          )}
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/10 space-y-2">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate("/dashboard");
                }}
                data-testid="admin-switch-user-mobile"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-white/80 bg-white/5 hover:bg-white/10 border border-white/10 transition"
              >
                <ArrowLeft className="h-4 w-4 text-purple-400 shrink-0" />
                <span>Switch User</span>
              </button>
              <button
                onClick={handleLogout}
                data-testid="admin-logout-mobile"
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <SectionErrorBoundary name="AdminLayoutContent" title="Could not load admin view">
            <Outlet />
          </SectionErrorBoundary>
        </main>
      </div>
    </div>
  );
}

