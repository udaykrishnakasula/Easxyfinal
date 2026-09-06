import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, PiggyBank, Copy, Check, Clock } from "lucide-react";
import { toast } from "sonner";

import { useInvestment, money } from "@/features/dashboard/api";
import { EasyXCard, EasyXStatusBadge, EasyXLoader, EasyXEmptyState } from "@/design/EasyX";

// Display-only short reference derived from the investment UUID.
function shortRef(id = "") {
  return `EX-${id.replace(/-/g, "").slice(0, 8).toUpperCase()}`;
}

// Live, per-investment countdown to maturity. Independent per investment.
function useCountdown(maturityAt, status) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (status !== "active") return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (status === "matured") return "Matured";
  if (status !== "active" || !maturityAt) return "—";
  const target = new Date(maturityAt).getTime();
  let diff = Math.max(0, target - now);
  if (diff <= 0) return "Maturing…";
  const days = Math.floor(diff / 86400000);
  diff -= days * 86400000;
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const mins = Math.floor(diff / 60000);
  diff -= mins * 60000;
  const secs = Math.floor(diff / 1000);
  return `${days}d ${String(hours).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export default function InvestmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: inv, isLoading, isError } = useInvestment(id);
  const [copied, setCopied] = useState(false);

  const remaining = useCountdown(inv?.maturity_at, inv?.status);

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(inv.id);
      setCopied(true);
      toast.success("Investment ID copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy");
    }
  };

  if (isLoading) return <EasyXLoader className="py-24" />;
  if (isError || !inv) {
    return (
      <div data-testid="investment-detail-page">
        <BackLink onClick={() => navigate("/app/investments")} />
        <div className="mt-6">
          <EasyXEmptyState
            icon={PiggyBank}
            title="Investment not found"
            note="This investment doesn't exist or doesn't belong to you."
          />
        </div>
      </div>
    );
  }

  const purchase = inv.start_at || inv.created_at;

  return (
    <div data-testid="investment-detail-page">
      <BackLink onClick={() => navigate("/app/investments")} />

      {/* Header */}
      <div
        className="mt-4 relative overflow-hidden rounded-ex-lg border border-white/8 p-6 sm:p-8"
        style={{
          background:
            "radial-gradient(120% 140% at 100% 0%, rgba(150,128,220,0.22) 0%, rgba(23,22,29,0) 55%), linear-gradient(160deg,#17161d,#0c0c0f)",
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="ex-eyebrow">Investment</span>
            <h1 className="mt-1 ex-display text-3xl sm:text-4xl font-extrabold uppercase tracking-tight text-white">
              {inv.plan_name}
            </h1>
            <button
              type="button"
              onClick={copyId}
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-ex-muted transition hover:text-white"
              data-testid="investment-id-chip"
            >
              <span className="font-mono tracking-wider text-white">{shortRef(inv.id)}</span>
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
          <EasyXStatusBadge status={inv.status} />
        </div>

        {/* Money summary */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Money label="Principal" value={money(inv.principal)} testid="detail-principal" />
          <Money label="Expected profit" value={money(inv.profit_amount)} accent testid="detail-profit" />
          <Money label="Total maturity" value={money(inv.maturity_amount)} testid="detail-maturity" />
        </div>
      </div>

      {/* Live remaining */}
      <EasyXCard className="mt-4 flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ex-accent/10 text-ex-accent ring-1 ring-ex-accent/25">
          <Clock className="h-5 w-5" />
        </span>
        <div>
          <div className="text-[11px] uppercase tracking-wide text-ex-muted/70">Remaining until maturity</div>
          <div className="ex-display text-lg font-extrabold tabular-nums text-white" data-testid="detail-remaining">
            {remaining}
          </div>
        </div>
      </EasyXCard>

      {/* Full breakdown */}
      <EasyXCard className="mt-4">
        <h2 className="ex-display text-lg font-extrabold text-white">Details</h2>
        <dl className="mt-4 divide-y divide-white/5">
          <Row label="Investment ID" value={<span className="font-mono text-sm">{inv.id}</span>} />
          <Row label="Plan" value={inv.plan_name} />
          <Row label="Principal" value={money(inv.principal)} />
          <Row label="Profit percentage" value={inv.profit_percentage != null ? `${inv.profit_percentage}%` : "—"} />
          <Row label="Expected profit" value={money(inv.profit_amount)} accent />
          <Row label="Total maturity" value={money(inv.maturity_amount)} />
          <Row label="Purchase date" value={purchase ? dayjs(purchase).format("DD MMM YYYY, HH:mm") : "—"} />
          <Row label="Maturity date" value={inv.maturity_at ? dayjs(inv.maturity_at).format("DD MMM YYYY, HH:mm") : "—"} />
          <Row label="Lock period" value={`${inv.lock_days} days`} />
          <Row label="Remaining days" value={inv.status === "active" ? `${inv.remaining_days} days` : "—"} />
          <Row label="Status" value={<EasyXStatusBadge status={inv.status} />} />
        </dl>
      </EasyXCard>
    </div>
  );
}

function BackLink({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 text-sm text-ex-muted transition hover:text-white"
      data-testid="investment-detail-back"
    >
      <ArrowLeft className="h-4 w-4" /> Back to investments
    </button>
  );
}

function Money({ label, value, accent, testid }) {
  return (
    <div className="rounded-ex-ctrl border border-white/8 bg-white/[0.03] p-4" data-testid={testid}>
      <div className="text-[11px] uppercase tracking-wide text-ex-muted/70">{label}</div>
      <div className={`mt-1 ex-display text-2xl font-extrabold ${accent ? "text-emerald-300" : "text-white"}`}>
        {value}
      </div>
    </div>
  );
}

function Row({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <dt className="text-sm text-ex-muted">{label}</dt>
      <dd className={`text-sm font-semibold text-right ${accent ? "text-emerald-300" : "text-white"}`}>{value}</dd>
    </div>
  );
}
