import React, { useState } from "react";
import { Copy, Check, Share2, Users, Gift, Sparkles, X, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { notifySuccess, notifyError } from "@/shared/lib/toastFeedback";
import { EasyXButton } from "@/design/EasyX";

/**
 * ReferralInvitationModal
 * Displays user's unique referral link, referral code, commission incentive,
 * and a one-click 'copy to clipboard' / Web Share button for easy sharing.
 */
export default function ReferralInvitationModal({
  open,
  onOpenChange,
  referralCode,
  referralPercentage = 10,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (!open) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const referralLink = referralCode ? `${origin}/register?ref=${referralCode}` : "";

  const handleCopyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopiedLink(true);
      notifySuccess("Referral link copied to clipboard!", "Ready to share with friends to earn commission.");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      notifyError("Failed to copy referral link", "Please select and copy the link manually.");
    }
  };

  const handleCopyCode = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopiedCode(true);
      notifySuccess("Referral code copied!", `Code ${referralCode} ready to paste.`);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      notifyError("Failed to copy referral code");
    }
  };

  const handleNativeShare = async () => {
    if (!referralLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join EasyX Investment Platform",
          text: `Join EasyX with my referral link and earn high daily USDT returns!`,
          url: referralLink,
        });
        return;
      } catch {
        // Fallback to copy if user cancels or shares fails
      }
    }
    handleCopyLink();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      data-testid="referral-invitation-modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#121118] p-6 shadow-2xl transition-all duration-300"
        style={{
          background:
            "radial-gradient(100% 120% at 50% 0%, rgba(150, 128, 220, 0.18) 0%, rgba(18, 17, 24, 0.98) 70%), #121118",
        }}
      >
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-white/5 text-ex-muted hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Close modal"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-ex-lav-400/20 text-ex-lav-300 ring-1 ring-ex-lav-400/30">
            <Gift className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="ex-eyebrow text-ex-lav-300">Invite & Earn</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                <Sparkles className="h-3 w-3" /> {referralPercentage}% Bonus
              </span>
            </div>
            <h2 className="ex-display text-xl font-bold text-white mt-0.5">
              Invite Friends to EasyX
            </h2>
          </div>
        </div>

        {/* Incentive Description */}
        <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3.5 text-xs text-ex-muted leading-relaxed">
          Share your referral link with friends. You will automatically receive a{" "}
          <strong className="text-white font-semibold">{referralPercentage}% instant cash bonus</strong> in your
          USDT wallet on every single investment plan they activate.
        </div>

        {/* Referral Link & Copy */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ex-muted mb-1.5 flex items-center justify-between">
              <span>Your Unique Referral Link</span>
              <span className="text-[11px] text-ex-muted/70">Click to copy</span>
            </label>
            <div className="flex items-center gap-2">
              <div
                onClick={handleCopyLink}
                className="flex-1 cursor-pointer truncate rounded-xl border border-white/10 bg-black/40 px-3.5 py-2.5 text-xs font-mono text-ex-lav-200 hover:border-ex-lav-400/40 hover:bg-black/60 transition-colors"
                title={referralLink}
                data-testid="modal-referral-link"
              >
                {referralLink || "Generating link..."}
              </div>
              <EasyXButton
                variant={copiedLink ? "accent" : "primary"}
                className="h-10 px-4 shrink-0 font-medium text-xs flex items-center gap-1.5"
                onClick={handleCopyLink}
                data-testid="modal-copy-link-btn"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-300" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" /> Copy Link
                  </>
                )}
              </EasyXButton>
            </div>
          </div>

          {/* Referral Code Quick Copy */}
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-2.5">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-ex-muted">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] text-ex-muted">Referral Code</div>
                <div className="font-mono text-sm font-bold text-white tracking-wider" data-testid="modal-referral-code">
                  {referralCode || "—"}
                </div>
              </div>
            </div>

            <EasyXButton
              variant="ghost"
              className="h-8 px-3 text-xs border border-white/10 hover:bg-white/10"
              onClick={handleCopyCode}
              data-testid="modal-copy-code-btn"
            >
              {copiedCode ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3 mr-1" /> Copy Code
                </>
              )}
            </EasyXButton>
          </div>
        </div>

        {/* Benefits Checklist */}
        <div className="mt-5 space-y-2 border-t border-white/8 pt-4">
          <div className="flex items-center gap-2 text-xs text-ex-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Instant USDT payout directly to your available balance</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ex-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>No limit on the number of friends or cards you earn on</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-ex-muted">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Friends receive priority instant blockchain onboarding</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <EasyXButton
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-10 px-4 text-xs text-ex-muted hover:text-white"
          >
            Close
          </EasyXButton>
          <EasyXButton
            variant="accent"
            onClick={handleNativeShare}
            className="h-10 px-5 text-xs font-semibold flex items-center gap-2"
            data-testid="modal-share-now-btn"
          >
            <Share2 className="h-4 w-4" /> Share Invitation
          </EasyXButton>
        </div>
      </div>
    </div>
  );
}
