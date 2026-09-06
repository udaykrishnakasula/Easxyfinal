import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Wallet, PiggyBank, ArrowDownToLine, ArrowUpFromLine,
  Users, ShieldCheck, Bell, ReceiptText, User, Lock, LogOut, Menu,
} from "lucide-react";
import { toast } from "sonner";

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { useUnreadCount } from "@/features/dashboard/api";
import NotificationBell from "@/features/notifications/NotificationBell";
import UserProfileMenu from "@/user/components/UserProfileMenu";
import AppLogo from "@/shared/components/AppLogo";

const NAV = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/investments", label: "Investments", icon: PiggyBank },
  { to: "/app/wallet", label: "Wallet", icon: Wallet },
  { to: "/app/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/app/deposit", label: "Deposit", icon: ArrowDownToLine },
  { to: "/app/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { to: "/app/referral", label: "Referrals", icon: Users },
  { to: "/app/kyc", label: "KYC", icon: ShieldCheck },
  { to: "/app/notifications", label: "Notifications", icon: Bell },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/security", label: "Security", icon: Lock },
];

function NavItems({ onNavigate, unreadCount = 0, isAdmin = false }) {
  return (
    <nav className="flex flex-col gap-1" data-testid="dashboard-nav">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm transition duration-300 ease-ex ${
              isActive
                ? "bg-ex-accent text-ex-ink font-semibold shadow-ex-btn"
                : "text-ex-muted hover:bg-white/8 hover:text-ex-text"
            }`
          }
        >
          <Icon className="h-4 w-4" />
          <span className="flex-1">{label}</span>
          {to === "/app/notifications" && unreadCount > 0 && (
            <span
              className="grid min-w-5 h-5 place-items-center rounded-full bg-ex-accent px-1.5 text-[11px] font-bold text-ex-ink"
              data-testid="nav-unread-badge"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <AppLogo showName size="md" />
    </div>
  );
}

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMobile, setOpenMobile] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();

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
    <div className="ex-app-bg min-h-screen">
      {/* Ambient lavender glow, echoing the landing's cinematic depth */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(50% 40% at 85% 0%, rgba(150,128,220,0.12) 0%, rgba(12,12,15,0) 60%)",
        }}
      />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-20 w-64 flex-col border-r border-white/8 bg-ex-surface2 p-4">
        <Brand />
        <div className="mt-7 flex-1 overflow-y-auto pr-1"><NavItems unreadCount={unreadCount} /></div>
        <button onClick={handleLogout} className="ex-btn ex-btn-ghost mt-4 h-11 w-full" data-testid="logout-button">
          <LogOut className="mr-2 h-4 w-4" /> Logout
        </button>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between border-b border-white/8 bg-ex-ink/90 backdrop-blur-xl px-4 py-3">
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetTrigger asChild>
            <button className="grid h-10 w-10 place-items-center rounded-ex-ctrl text-ex-text hover:bg-white/10" data-testid="mobile-nav-trigger">
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 bg-ex-surface2 border-white/8 p-4 text-ex-text">
            <SheetTitle className="sr-only">EasyX navigation</SheetTitle>
            <Brand />
            <div className="mt-7"><NavItems onNavigate={() => setOpenMobile(false)} unreadCount={unreadCount} /></div>
            <button onClick={handleLogout} className="ex-btn ex-btn-ghost mt-4 h-11 w-full">
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

      <main className="relative z-10 lg:pl-64">
        {/* Desktop top bar with notification bell (mobile has its own header) */}
        <div className="hidden lg:flex sticky top-0 z-20 items-center justify-end gap-4 border-b border-white/8 bg-ex-ink/60 px-6 py-3 backdrop-blur-xl">
          <NotificationBell />
          <UserProfileMenu />
        </div>
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-9">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
