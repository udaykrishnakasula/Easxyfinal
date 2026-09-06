import React from "react";
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import dayjs from "dayjs";

import { useWallet, useTransactions, money } from "@/user/api";
import { PageHeading, EasyXCard, EasyXStat, EasyXLoader } from "@/design/EasyX";

export default function WalletPage() {
  const { data: wallet, isLoading } = useWallet();
  const { data: txns } = useTransactions();

  return (
    <div data-testid="wallet-page">
      <PageHeading
        title="Wallet"
        subtitle="Your available USDT balance and activity."
        icon={WalletIcon}
      />

      {isLoading || !wallet ? (
        <EasyXLoader />
      ) : (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="relative overflow-hidden rounded-ex border border-white/8 p-5"
            style={{ background: "radial-gradient(120% 140% at 100% 0%, rgba(150,128,220,0.28) 0%, rgba(23,22,29,0) 60%), linear-gradient(160deg,#17161d,#0c0c0f)" }}>
            <div className="text-ex-muted text-xs">Available balance</div>
            <div className="mt-1 ex-display text-3xl font-extrabold ex-gradient-text" data-testid="wallet-balance">{money(wallet.available_balance)}</div>
            <div className="text-xs text-ex-muted">For purchases & withdrawals</div>
          </div>
          <EasyXStat label="Locked investment" value={money(wallet.locked_investment)} />
          <EasyXStat label="Total portfolio" value={money(wallet.total_portfolio)} gradient />
        </div>
      )}

      {wallet && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4 max-w-md">
          <EasyXStat label="Total invested (lifetime)" value={money(wallet.total_invested)} />
          <EasyXStat label="Total earned" value={money(wallet.total_earned)} accent />
        </div>
      )}

      <h2 className="mt-9 ex-display text-lg font-bold">Recent transactions</h2>
      <EasyXCard className="mt-3 p-0 overflow-hidden">
        {!txns || txns.length === 0 ? (
          <div className="p-8 text-center text-ex-muted text-sm">No transactions yet.</div>
        ) : (
          <div className="divide-y divide-white/5">
            {txns.slice(0, 15).map((t) => (
              <div key={t.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className={`grid h-9 w-9 place-items-center rounded-full ${t.direction === "credit" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                    {t.direction === "credit" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                  </span>
                  <div>
                    <div className="text-sm font-medium capitalize text-ex-text">{t.type.replace(/_/g, " ").toLowerCase()}</div>
                    <div className="text-[11px] text-ex-muted">{dayjs(t.created_at).format("DD MMM YYYY, HH:mm")}</div>
                  </div>
                </div>
                <div className={`text-sm font-semibold ${t.direction === "credit" ? "text-emerald-300" : "text-red-300"}`}>
                  {t.direction === "credit" ? "+" : "-"}{money(t.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </EasyXCard>
    </div>
  );
}
