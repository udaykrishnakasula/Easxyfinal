import React, { useState } from "react";
import { Share2, Users, DollarSign, GitBranch, ArrowRight } from "lucide-react";
import dayjs from "dayjs";

import { useAdminReferrals } from "@/features/admin/adminApi";
import { money } from "@/features/dashboard/api";
import {
  PageHeading,
  EasyXCard,
  EasyXStat,
  EasyXLoader,
  EasyXStatusBadge,
  EasyXEmptyState,
} from "@/design/EasyX";

function Person({ p }) {
  if (!p) return <span className="text-ex-muted">—</span>;
  return (
    <span className="inline-flex flex-col">
      <span className="text-sm text-ex-text">{p.name || "User"}</span>
      <span className="text-[11px] text-ex-muted">{p.email}</span>
    </span>
  );
}

const TABS = [
  { key: "commissions", label: "Commissions" },
  { key: "relationships", label: "Relationships" },
];

export default function AdminReferralsPage() {
  const { data, isLoading } = useAdminReferrals();
  const [tab, setTab] = useState("commissions");

  return (
    <div data-testid="admin-referrals-page">
      <PageHeading title="Referrals" subtitle="Every direct referral relationship and commission paid across the platform." icon={Share2} />

      {isLoading || !data ? (
        <EasyXLoader />
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <EasyXStat label="Relationships" value={data.stats.total_relationships} icon={GitBranch} />
            <EasyXStat label="Referrers" value={data.stats.total_referrers} icon={Users} />
            <EasyXStat label="Commissions paid" value={data.stats.total_commissions_paid} icon={DollarSign} />
            <EasyXStat label="Total paid" value={money(data.stats.total_commission_amount)} icon={DollarSign} accent />
          </div>

          <div className="mt-5 inline-flex rounded-ex-ctrl bg-white/5 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                data-testid={`admin-ref-tab-${t.key}`}
                className={`px-4 py-2 rounded-ex-ctrl text-sm font-medium transition ${
                  tab === t.key ? "bg-ex-accent text-ex-ink shadow-ex-btn" : "text-ex-muted hover:text-ex-text"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "commissions" ? (
            <EasyXCard className="mt-4 p-0 overflow-hidden">
              {data.commissions.length === 0 ? (
                <div className="p-8"><EasyXEmptyState icon={DollarSign} title="No commissions yet" note="Commissions appear when referred users invest." /></div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm" data-testid="admin-ref-commissions">
                    <thead className="text-left text-[11px] uppercase tracking-wide text-ex-muted">
                      <tr className="border-b border-white/8">
                        <th className="px-4 py-3 font-medium">Referrer</th>
                        <th className="px-4 py-3 font-medium">Referee</th>
                        <th className="px-4 py-3 font-medium">Plan</th>
                        <th className="px-4 py-3 font-medium text-right">Amount</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.commissions.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="px-4 py-3"><Person p={c.referrer} /></td>
                          <td className="px-4 py-3"><Person p={c.referee} /></td>
                          <td className="px-4 py-3 capitalize text-ex-text">{c.plan_key || "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold text-emerald-300">+{money(c.amount)}</td>
                          <td className="px-4 py-3"><EasyXStatusBadge status={c.status} /></td>
                          <td className="px-4 py-3 text-[11px] text-ex-muted">{c.created_at ? dayjs(c.created_at).format("DD MMM YYYY, HH:mm") : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </EasyXCard>
          ) : (
            <EasyXCard className="mt-4 p-0 overflow-hidden">
              {data.relationships.length === 0 ? (
                <div className="p-8"><EasyXEmptyState icon={GitBranch} title="No relationships yet" note="Direct referral relationships appear here." /></div>
              ) : (
                <div className="divide-y divide-white/5" data-testid="admin-ref-relationships">
                  {data.relationships.map((r, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <Person p={r.referrer} />
                      <ArrowRight className="h-4 w-4 text-ex-lav-300 shrink-0" />
                      <Person p={r.referee} />
                      <span className="ml-auto text-[11px] text-ex-muted">
                        {r.joined_at ? dayjs(r.joined_at).format("DD MMM YYYY") : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </EasyXCard>
          )}
        </>
      )}
    </div>
  );
}
