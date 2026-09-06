import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
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
  Menu,
  AlertTriangle,
  Wrench,
  LifeBuoy,
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/shared/ui/sheet";
import { useAuth } from "@/shared/context/AuthContext";
import { useUnreadCount, usePublicMaintenance, useSupportTickets } from "@/user/api";
import { useRealtimeNotifications } from "@/shared/hooks/useRealtimeNotifications";
import NotificationBell from "@/user/components/NotificationBell";
import UserProfileMenu from "@/user/components/UserProfileMenu";
import AppLogo from "@/shared/components/AppLogo";
import SectionErrorBoundary from "@/shared/analytics/SectionErrorBoundary";

const USER_NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/investments", label: "Investments", icon: PiggyBank },
  { to: "/wallet", label: "Wallet", icon: Wallet },
  { to: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/support", label: "Support & Help", icon: LifeBuoy },
  { to: "/profile", label: "Profile", icon: User },
];

function NavItems({ onNavigate, unreadCount = 0, supportUnread = 0 }) {
  return (
    <nav className="flex flex-col gap-1" data-testid="dashboard-nav">
      {USER_NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `group relative flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm transition-all duration-300 ease-ex ${
              isActive
                ? "bg-ex-accent text-ex-ink font-semibold shadow-ex-btn scale-[1.01]"
                : "text-ex-muted hover:bg-white/8 hover:text-ex-text hover:translate-x-1"
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
          <span className="flex-1">{label}</span>
          {to === "/notifications" && unreadCount > 0 && (
            <span
              className="grid min-w-5 h-5 place-items-center rounded-full bg-ex-accent px-1.5 text-[11px] font-bold text-ex-ink"
              data-testid="nav-unread-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          {to === "/support" && supportUnread > 0 && (
            <span
              className="grid min-w-5 h-5 place-items-center rounded-full bg-ex-lav-400 px-1.5 text-[11px] font-bold text-ex-ink animate-pulse"
              data-testid="nav-support-unread-badge"
            >
              {supportUnread > 99 ? "99+" : supportUnread}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1 transition-transform duration-300 hover:scale-[1.02]">
      <AppLogo showName size="md" />
    </div>
  );
}

export default function UserLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMobile, setOpenMobile] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: supportTicketsData } = useSupportTickets();
  const supportUnread = supportTicketsData?.unread_total || 0;
  const { data: maintenance } = usePublicMaintenance();
  useRealtimeNotifications();

  const handleLogout = async () => {
    navigate("/", { replace: true });
    try {
      await logout();
    } catch {
      // ignore
    }
    toast.success("Signed out.");
  };

  const isMaintenanceActive = Boolean(maintenance?.is_enabled);

  return (
    <div className="ex-app-bg min-h-screen">
      {/* Ambient lavender glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-1000"
        style={{
          background:
            "radial-gradient(50% 40% at 85% 0%, rgba(150,128,220,0.12) 0%, rgba(12,12,15,0) 60%)",
        }}
      />

      {/* Desktop Sidebar (User Navigation Only) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-white/8 bg-ex-surface2 p-4">
        <Brand />
        <div className="mt-7 flex-1 overflow-y-auto pr-1">
          <NavItems unreadCount={unreadCount} supportUnread={supportUnread} />
        </div>
        <button
          onClick={handleLogout}
          className="ex-btn ex-btn-ghost mt-4 h-11 w-full transition-transform active:scale-98 hover:bg-white/10"
          data-testid="logout-button"
        >
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </button>
      </aside>

      {/* Mobile Top Bar & Drawer (User Navigation Only) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-ex-ink/90 backdrop-blur-xl px-4 py-3">
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetTrigger asChild>
            <button
              className="grid h-10 w-10 place-items-center rounded-ex-ctrl text-ex-text hover:bg-white/10 active:scale-95 transition-all"
              data-testid="mobile-nav-trigger"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-ex-surface2 border-white/8 p-4 text-ex-text">
            <SheetTitle className="sr-only">EasyX navigation</SheetTitle>
            <Brand />
            <div className="mt-7">
              <NavItems
                onNavigate={() => setOpenMobile(false)}
                unreadCount={unreadCount}
                supportUnread={supportUnread}
              />
            </div>
            <button onClick={handleLogout} className="ex-btn ex-btn-ghost mt-4 h-11 w-full active:scale-98">
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </button>
          </SheetContent>
        </Sheet>
        <Brand />
        <div className="flex items-center gap-2">
          <NotificationBell />
          <UserProfileMenu />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 lg:pl-64">
        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-20 items-center justify-end gap-4 border-b border-white/8 bg-ex-ink/60 px-6 py-3 backdrop-blur-xl">
          <NotificationBell />
          <UserProfileMenu />
        </div>

        {/* Global Maintenance Active Broadcast Banner */}
        {isMaintenanceActive && (
          <div
            className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-200 text-xs backdrop-blur-md sticky top-0 lg:top-[57px] z-10"
            data-testid="user-maintenance-banner"
          >
            <div className="mx-auto max-w-6xl flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
              <div className="flex-1">
                <span className="font-bold text-amber-300 mr-2">System Maintenance Active:</span>
                <span>
                  {maintenance?.message || "We are currently performing scheduled maintenance. Existing investments continue to mature."}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-9">
          <SectionErrorBoundary name="UserLayoutContent" title="Could not load page view">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </SectionErrorBoundary>
        </div>
      </main>
    </div>
  );
}
