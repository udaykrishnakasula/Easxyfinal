import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Inbox,
  Settings,
  ArrowLeft,
  LogOut,
  BadgeCheck,
  Share2,
  Users,
  Wrench,
  LayoutDashboard,
  ArrowUpFromLine,
  PiggyBank,
  Layers,
  Download,
  Menu,
  X,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const NAV = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/deposits", label: "Deposits", icon: Inbox },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: ArrowUpFromLine },
  { to: "/admin/investments", label: "Investments", icon: PiggyBank },
  { to: "/admin/plans", label: "Plans", icon: Layers },
  { to: "/admin/kyc", label: "KYC Review", icon: BadgeCheck },
  { to: "/admin/referrals", label: "Referrals", icon: Share2 },
  { to: "/admin/reports", label: "Reports & Audit", icon: Download },
  { to: "/admin/maintenance", label: "Maintenance", icon: Wrench },
  { to: "/admin/settings", label: "Deposit Settings", icon: Settings },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

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
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-white/8 bg-ex-surface/60 p-4 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <span className="grid h-9 w-9 place-items-center rounded-ex-ctrl bg-ex-accent text-ex-ink shadow-sm">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div>
            <div className="ex-display font-extrabold leading-none tracking-tight">EasyX</div>
            <div className="text-[11px] font-medium text-ex-muted mt-0.5">Admin console</div>
          </div>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto flex flex-col gap-1 pr-1" data-testid="admin-nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-ex-accent text-ex-ink font-semibold shadow-ex-btn"
                    : "text-ex-muted hover:bg-white/8 hover:text-ex-text"
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto pt-4 flex flex-col gap-1 border-t border-white/8">
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm text-ex-muted hover:bg-white/8 hover:text-ex-text transition-colors"
          >
            <ArrowLeft className="h-4 w-4 shrink-0 text-purple-400" />
            <span>Switch User</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Backdrop & Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileNavOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[85vw] bg-ex-surface border-r border-white/10 p-4 flex flex-col h-full z-10 shadow-2xl">
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/8 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-ex-ctrl bg-ex-accent text-ex-ink">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <div>
                  <div className="ex-display font-extrabold leading-none">EasyX</div>
                  <div className="text-[11px] text-ex-muted mt-0.5">Admin console</div>
                </div>
              </div>
              <button
                onClick={() => setMobileNavOpen(false)}
                className="grid h-8 w-8 place-items-center rounded-ex-ctrl text-ex-muted hover:bg-white/8 hover:text-ex-text"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="mt-4 flex-1 overflow-y-auto flex flex-col gap-1 pr-1" data-testid="admin-mobile-nav">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileNavOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm transition-colors ${
                      isActive
                        ? "bg-ex-accent text-ex-ink font-semibold shadow-ex-btn"
                        : "text-ex-muted hover:bg-white/8 hover:text-ex-text"
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="mt-auto pt-3 flex flex-col gap-1 border-t border-white/8">
              <button
                onClick={() => {
                  setMobileNavOpen(false);
                  navigate("/dashboard");
                }}
                className="flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm text-ex-muted hover:bg-white/8 hover:text-ex-text"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-purple-400" />
                <span>Switch User</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 rounded-ex-ctrl px-3 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="flex items-center justify-between border-b border-white/8 px-4 py-3 bg-ex-surface/40 backdrop-blur-md md:hidden sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileNavOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-ex-ctrl text-ex-muted hover:bg-white/8 hover:text-ex-text focus:outline-none"
              data-testid="admin-mobile-nav-trigger"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="ex-display font-extrabold text-base flex items-center gap-2">
              <span>EasyX Admin</span>
            </div>
          </div>
          <button
            onClick={() => navigate("/app/dashboard")}
            className="text-xs font-medium text-ex-muted hover:text-ex-text px-2.5 py-1.5 rounded-ex-ctrl bg-white/5 hover:bg-white/10 transition-colors"
          >
            Back to app
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
          <div className="mb-4 flex items-center justify-between text-xs text-ex-muted">
            <span>Signed in as <strong className="text-white/80 font-medium">{user?.email}</strong></span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">
              Admin Session
            </span>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

