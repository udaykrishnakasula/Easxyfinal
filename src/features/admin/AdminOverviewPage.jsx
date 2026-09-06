import React from "react";
import { LayoutDashboard, Users, PiggyBank, Inbox, ArrowUpFromLine, BadgeCheck, Wallet, Share2 } from "lucide-react";

import { useAdminOverview } from "./adminApi";
import { PageHeading, EasyXCard, EasyXLoader } from "@/design/EasyX";

function Stat({ label, value, sub, icon: Icon, accent, testId }) {
  return (
    <EasyXCard className="flex items-start gap-3" data-testid={testId}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-ex-ctrl ${accent || "bg-white/5 text-ex-lav-300"}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-ex-muted">{label}</div>
        <div className="text-xl font-bold text-ex-text truncate">{value}</div>
        {sub ? <div className="text-[11px] text-ex-muted">{sub}</div> : null}
      </div>
    </EasyXCard>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading } = useAdminOverview();

  return (
    <div data-testid="admin-overview-page">
      <PageHeading title="Overview" subtitle="Platform health at a glance." icon={LayoutDashboard} />
      {isLoading || !data ? (
        <EasyXLoader />
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <Stat testId="kpi-users" label="Total users" value={data.users.total}
            sub={`${data.users.active} active \u00b7 ${data.users.suspended} suspended`}
            icon={Users} accent="bg-ex-accent/15 text-ex-accent" />
          <Stat testId="kpi-liabilities" label="Platform liabilities" value={`${data.wallet.liabilities} USDT`}
            sub={`Available ${data.wallet.available_total} \u00b7 Locked ${data.wallet.locked_total}`}
            icon={Wallet} accent="bg-emerald-500/15 text-emerald-300" />
          <Stat testId="kpi-investments" label="Active investments" value={data.investments.active}
            sub={`Principal ${data.investments.active_principal} \u00b7 ${data.investments.matured} matured \u00b7 ${data.investments.cancelled} cancelled`}
            icon={PiggyBank} />
          <Stat testId="kpi-deposits" label="Pending deposits" value={data.deposits.pending}
            sub={`Approved total ${data.deposits.approved_total} USDT`}
            icon={Inbox} accent="bg-sky-500/15 text-sky-300" />
          <Stat testId="kpi-withdrawals" label="Pending withdrawals" value={data.withdrawals.pending}
            sub={`${data.withdrawals.approved} approved \u00b7 paid ${data.withdrawals.paid_total} USDT`}
            icon={ArrowUpFromLine} accent="bg-amber-500/15 text-amber-300" />
          <Stat testId="kpi-kyc" label="Pending KYC" value={data.kyc.pending}
            sub="Awaiting review" icon={BadgeCheck} accent="bg-fuchsia-500/15 text-fuchsia-300" />
          <Stat testId="kpi-referrals" label="Referral commissions paid" value={`${data.referrals.commissions_paid} USDT`}
            icon={Share2} accent="bg-indigo-500/15 text-indigo-300" />
        </div>
      )}
    </div>
  );
}
