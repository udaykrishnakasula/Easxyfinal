import React, { useMemo, useState } from "react";
import { Users, Copy, Check, Share2, Gift, TrendingUp, UserPlus } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";

import { useReferralSummary, money } from "@/features/dashboard/api";
import {
  PageHeading,
  EasyXCard,
  EasyXStat,
  EasyXLoader,
  EasyXButton,
  EasyXStatusBadge,
  EasyXEmptyState,
} from "@/design/EasyX";
import ReferralInvitationModal from "@/user/components/ReferralInvitationModal";

function CopyField({ label, value, testId }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy");
    }
  };
  return (
    <div>
      <div className="text-xs text-ex-muted mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <code
          className="flex-1 break-all rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text"
          data-testid={`${testId}-value`}
        >
          {value}
        </code>
        <EasyXButton
          variant="ghost"
          className="h-11 w-11 p-0 shrink-0"
          onClick={copy}
          data-testid={`${testId}-copy`}
        >
          {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
        </EasyXButton>
      </div>
    </div>
  );
}

export default function ReferralPage() {
  const { data, isLoading } = useReferralSummary();
  const [modalOpen, setModalOpen] = useState(false);

  const referralCode = data?.referral_code || "";
  const pct = Number(data?.referral_percentage ?? 10);
  const referralLink = useMemo(() => {
    if (!referralCode) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/register?ref=${referralCode}`;
  }, [referralCode]);

  const share = async () => {
    setModalOpen(true);
  };

  return (
    <div data-testid="referral-page">
      <PageHeading
        title="Referrals"
        subtitle={`Earn ${pct}% commission on every investment your invited friends make — paid instantly to your wallet.`}
        icon={Users}
        actions={
          <EasyXButton variant="accent" onClick={share} disabled={!referralLink} data-testid="referral-share">
            <Share2 className="mr-2 h-4 w-4" /> Invite friends
          </EasyXButton>
        }
      />

      {isLoading || !data ? (
        <EasyXLoader />
      ) : (
        <>
          {/* Stats */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div
              className="relative overflow-hidden rounded-ex border border-white/8 p-5"
              style={{
                background:
                  "radial-gradient(120% 140% at 100% 0%, rgba(150,128,220,0.28) 0%, rgba(23,22,29,0) 60%), linear-gradient(160deg,#17161d,#0c0c0f)",
              }}
            >
              <div className="text-ex-muted text-xs">Total commission earned</div>
              <div className="mt-1 ex-display text-3xl font-extrabold ex-gradient-text" data-testid="referral-total-earned">
                {money(data.total_commission_earned)}
              </div>
              <div className="text-xs text-ex-muted">Credited to your wallet · withdrawable</div>
            </div>
            <EasyXStat label="Total referrals" value={data.total_referrals ?? 0} icon={UserPlus} />
            <EasyXStat label="Commission rate" value={`${pct}%`} icon={TrendingUp} accent />
          </div>

          {/* Share card */}
          <EasyXCard className="mt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 text-sm font-semibold text-ex-text">
                <Gift className="h-4 w-4 text-ex-lav-300" /> Invite friends & earn
              </div>
              <EasyXButton
                variant="ghost"
                className="h-8 px-3 text-xs text-ex-lav-300 border border-ex-lav-400/20 hover:bg-ex-lav-400/10"
                onClick={() => setModalOpen(true)}
                data-testid="open-invite-modal-btn"
              >
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Open Invite Card
              </EasyXButton>
            </div>
            <p className="mt-1 text-xs text-ex-muted">
              Share your link or code. When someone signs up with it and makes a successful
              investment, you instantly earn {pct}% of that investment — for every card they buy.
            </p>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
              <CopyField label="Your referral code" value={referralCode} testId="referral-code" />
              <CopyField label="Your referral link" value={referralLink} testId="referral-link" />
            </div>
          </EasyXCard>

          {/* Referral Invitation Modal */}
          <ReferralInvitationModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            referralCode={referralCode}
            referralPercentage={pct}
          />

          {/* Two columns: referred users + commission history */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Referred users */}
            <div>
              <h2 className="ex-display text-lg font-bold">Your referrals ({data.total_referrals ?? 0})</h2>
              <EasyXCard className="mt-3 p-0 overflow-hidden">
                {!data.referrals || data.referrals.length === 0 ? (
                  <div className="p-8">
                    <EasyXEmptyState
                      icon={UserPlus}
                      title="No referrals yet"
                      note="Share your link to invite friends and start earning commission."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5" data-testid="referral-list">
                    {data.referrals.map((r) => (
                      <div key={r.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="grid h-9 w-9 place-items-center rounded-full bg-ex-lav-400/15 text-ex-lav-300 text-xs font-bold uppercase">
                            {(r.name || "?").slice(0, 2)}
                          </span>
                          <div className="text-sm font-medium text-ex-text">{r.name || "EasyX user"}</div>
                        </div>
                        <div className="text-[11px] text-ex-muted">
                          {r.joined_at ? dayjs(r.joined_at).format("DD MMM YYYY") : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </EasyXCard>
            </div>

            {/* Commission history */}
            <div>
              <h2 className="ex-display text-lg font-bold">Commission history ({data.total_commissions ?? 0})</h2>
              <EasyXCard className="mt-3 p-0 overflow-hidden">
                {!data.commissions || data.commissions.length === 0 ? (
                  <div className="p-8">
                    <EasyXEmptyState
                      icon={Gift}
                      title="No commissions yet"
                      note="You'll earn commission the moment a referral makes a successful investment."
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-white/5" data-testid="referral-commissions">
                    {data.commissions.map((c) => (
                      <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3" data-testid={`referral-commission-${c.id}`}>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-ex-text">
                            {c.referee_name || "Referral"}
                            {c.plan_key && (
                              <span className="text-[11px] text-ex-muted capitalize"> · {c.plan_key}</span>
                            )}
                          </div>
                          <div className="text-[11px] text-ex-muted">
                            {c.percentage}% · {c.created_at ? dayjs(c.created_at).format("DD MMM YYYY, HH:mm") : ""}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-sm font-semibold text-emerald-300">+{money(c.amount)}</span>
                          <EasyXStatusBadge status={c.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </EasyXCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
