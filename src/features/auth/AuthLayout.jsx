import React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { usePublicMaintenance } from "@/features/admin/adminApi";

// Shared shell for the auth screens. Uses the EasyX design tokens so signup/login
// feel like the same product as the landing page and the dashboard.
export default function AuthLayout({ title, subtitle, children, footer }) {
  const { data: maintenance } = usePublicMaintenance();
  const showBanner =
    maintenance && (maintenance.is_enabled || maintenance.features?.registration === false);

  return (
    <div className="ex-app-bg min-h-screen w-full relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 20% 0%, rgba(150,120,255,0.22) 0%, rgba(12,12,15,0) 60%), radial-gradient(50% 40% at 100% 100%, rgba(120,200,255,0.12) 0%, rgba(12,12,15,0) 60%)",
        }}
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2.5" data-testid="auth-brand">
              <span className="grid h-9 w-9 place-items-center rounded-ex-ctrl bg-ex-ink text-white ex-display font-extrabold ring-1 ring-white/10">E</span>
              <span className="ex-display text-2xl font-extrabold tracking-tight">Easyx</span>
            </Link>
          </div>
          {showBanner ? (
            <div
              className="mb-5 flex items-start gap-2 rounded-ex-ctrl border border-amber-500/30 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200"
              data-testid="auth-maintenance-banner"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{maintenance.message}</span>
            </div>
          ) : null}
          <div className="ex-surface p-6 sm:p-8 shadow-2xl">
            <h1 className="ex-display text-2xl font-bold">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-ex-muted">{subtitle}</p> : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? <div className="mt-6 text-center text-sm text-ex-muted">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
