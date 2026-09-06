import React from "react";
import { Toaster as Sonner } from "sonner";

/**
 * AppToaster: Unified, accessible, high-contrast toast notification container
 * Styled precisely for EasyX dark luxury & vibrant status accents.
 */
export default function AppToaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      closeButton
      expand={false}
      duration={3500}
      className="toaster group"
      toastOptions={{
        style: {
          background: "#14131B",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          color: "#FFFFFF",
          borderRadius: "14px",
          boxShadow: "0 16px 40px -8px rgba(0, 0, 0, 0.6), 0 0 1px 1px rgba(255, 255, 255, 0.05)",
          padding: "12px 16px",
          fontSize: "13px",
        },
        classNames: {
          toast: "group toast font-sans",
          title: "font-semibold text-white tracking-tight text-sm",
          description: "text-white/70 text-xs mt-0.5 leading-relaxed",
          actionButton: "bg-ex-accent text-ex-ink font-semibold text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity",
          cancelButton: "bg-white/10 text-white font-medium text-xs px-3 py-1.5 rounded-lg hover:bg-white/15 transition-colors",
          closeButton: "bg-white/10 hover:bg-white/20 text-white/80 border-0 rounded-full transition-colors",
          success: "!border-emerald-500/30 !bg-[#0E1B15] !text-emerald-200",
          error: "!border-rose-500/30 !bg-[#1E1114] !text-rose-200",
          info: "!border-ex-lav-400/30 !bg-[#151324] !text-ex-lav-200",
          warning: "!border-amber-500/30 !bg-[#1E180E] !text-amber-200",
        },
      }}
    />
  );
}
