import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { PiggyBank, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import { useInvestments, money } from "@/user/api";
import { PageHeading, EasyXCard, EasyXStatusBadge, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

export default function InvestmentsPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const planKey = params.get("plan") || undefined;
  const { data, isLoading } = useInvestments(planKey);

  return (
    <div data-testid="investments-page">
      <PageHeading
        title={`Investments${planKey ? ` — ${planKey}` : ""}`}
        subtitle="Each card is a separate investment. Tap to view full details."
        icon={PiggyBank}
      />

      {isLoading ? (
        <EasyXLoader />
      ) : !data || data.length === 0 ? (
        <div className="mt-8">
          <EasyXEmptyState icon={PiggyBank} title="No investments yet" note="Unlock a plan from the dashboard to get started." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.map((inv) => (
            <motion.div
              key={inv.id}
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.985 }}
              transition={{ type: "spring", stiffness: 400, damping: 26 }}
              className="h-full"
            >
              <EasyXCard
                hover
                onClick={() => navigate(`/investments/${inv.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/investments/${inv.id}`); }}
                className="cursor-pointer h-full border border-white/10 transition-all duration-300 hover:border-white/25 hover:shadow-[0_16px_36px_-10px_rgba(0,0,0,0.5)]"
                data-testid={`investment-${inv.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="ex-eyebrow">{inv.plan_name}</span>
                  <EasyXStatusBadge status={inv.status} />
                </div>
                <div className="mt-2 ex-display text-2xl font-extrabold text-white">{money(inv.principal)}</div>
                <div className="mt-3 grid grid-cols-2 gap-y-2.5 text-sm">
                  <Cell label="Profit" value={money(inv.profit_amount)} accent />
                  <Cell label="Maturity" value={money(inv.maturity_amount)} />
                  <Cell label="Invested on" value={inv.start_at ? dayjs(inv.start_at).format("DD MMM YYYY") : "—"} />
                  <Cell label="Matures on" value={inv.maturity_at ? dayjs(inv.maturity_at).format("DD MMM YYYY") : "—"} />
                  <Cell label="Lock period" value={`${inv.lock_days} days`} />
                  <Cell label="Remaining" value={inv.status === "active" ? `${inv.remaining_days} days` : "—"} />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-ex-muted/60">ID: {inv.id}</span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ex-accent" data-testid="investment-view-details">
                    View details <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </EasyXCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Cell({ label, value, accent }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-ex-muted/70">{label}</div>
      <div className={`font-semibold ${accent ? "text-emerald-300" : "text-white"}`}>{value}</div>
    </div>
  );
}
