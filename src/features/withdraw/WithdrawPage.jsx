import React, { useMemo, useState } from "react";
import { ArrowUpFromLine, ShieldCheck, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useWithdrawConfig,
  useMyWithdrawals,
  useCreateWithdrawal,
  useWallet,
  useDashboard,
  money,
} from "@/features/dashboard/api";
import { apiError } from "@/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXStatusBadge,
} from "@/design/EasyX";

const NETWORKS = [
  { key: "TRC20", label: "TRC20", chain: "Tron network" },
  { key: "BEP20", label: "BEP20", chain: "BNB Smart Chain" },
];

export default function WithdrawPage() {
  const { data: config, isLoading } = useWithdrawConfig();
  const { data: wallet } = useWallet();
  const { data: dashboard } = useDashboard();
  const { data: withdrawals } = useMyWithdrawals();
  const createWithdrawal = useCreateWithdrawal();

  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [address, setAddress] = useState("");

  const kycStatus = dashboard?.user?.kyc_status || "none";
  const kycApproved = kycStatus === "approved";
  const min = Number(config?.min_withdrawal ?? 10);
  const available = Number(wallet?.available_balance ?? 0);

  const amountNum = parseFloat(amount);
  let amountError = "";
  if (amount !== "") {
    if (isNaN(amountNum) || amountNum < min) amountError = `Minimum withdrawal is ${money(min)} USDT`;
    else if (amountNum > available) amountError = `Amount exceeds your available balance (${money(available)} USDT)`;
  }
  const canSubmit =
    kycApproved && !amountError && amount !== "" && address.trim().length >= 8 && !createWithdrawal.isPending;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    try {
      await createWithdrawal.mutateAsync({ network, amount: String(amount), to_address: address.trim() });
      toast.success("Withdrawal requested \u2014 pending admin approval");
      setAmount("");
      setAddress("");
    } catch (err) {
      toast.error(apiError(err, "Could not request withdrawal"));
    }
  };

  const sorted = useMemo(() => withdrawals || [], [withdrawals]);

  return (
    <div data-testid="withdraw-page">
      <PageHeading
        title="Withdraw USDT"
        subtitle={`Send USDT to your wallet. Minimum withdrawal ${money(min)} USDT.`}
        icon={ArrowUpFromLine}
      />

      {isLoading ? (
        <EasyXLoader />
      ) : !kycApproved ? (
        <EasyXCard className="mt-5" data-testid="withdraw-kyc-gate">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-ex-ctrl bg-amber-500/15 text-amber-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-ex-text">Verify your identity to withdraw</div>
              <p className="mt-1 text-sm text-ex-muted">
                Withdrawals are unlocked once your KYC is approved. Your current status is
                <span className="font-medium text-ex-text"> {kycStatus}</span>.
              </p>
              <Link to="/app/kyc">
                <EasyXButton className="mt-3" data-testid="withdraw-goto-kyc">Complete KYC</EasyXButton>
              </Link>
            </div>
          </div>
        </EasyXCard>
      ) : (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <EasyXCard>
            <div className="flex items-center justify-between">
              <div className="text-sm text-ex-muted">Available balance</div>
              <div className="text-lg font-bold text-ex-text" data-testid="withdraw-available">{money(available)} USDT</div>
            </div>
            <form onSubmit={submit} className="mt-4 space-y-4" data-testid="withdraw-form">
              <div>
                <label className="text-xs text-ex-muted">Network</label>
                <div className="mt-1 inline-flex rounded-ex-ctrl bg-white/5 p-1" data-testid="withdraw-network-tabs">
                  {NETWORKS.map((n) => (
                    <button
                      key={n.key}
                      type="button"
                      onClick={() => setNetwork(n.key)}
                      data-testid={`withdraw-network-${n.key}`}
                      data-active={network === n.key ? "true" : "false"}
                      className={`px-4 py-2 rounded-ex-ctrl text-sm font-medium transition ${
                        network === n.key ? "bg-ex-accent text-ex-ink shadow-ex-btn" : "text-ex-muted hover:text-ex-text"
                      }`}
                    >
                      {n.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-ex-muted">Destination address ({network})</label>
                <input
                  type="text"
                  placeholder={`Your ${network} USDT address`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-accent focus:outline-none"
                  data-testid="withdraw-address-input"
                />
              </div>
              <div>
                <label className="text-xs text-ex-muted">Amount (USDT)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  min={min}
                  step="0.01"
                  placeholder={`Min ${money(min)}`}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-accent focus:outline-none"
                  data-testid="withdraw-amount-input"
                />
                {amountError && <p className="mt-1 text-xs text-red-300" data-testid="withdraw-amount-error">{amountError}</p>}
              </div>
              <EasyXButton type="submit" className="w-full" disabled={!canSubmit} loading={createWithdrawal.isPending} data-testid="withdraw-submit">
                Request withdrawal
              </EasyXButton>
            </form>
          </EasyXCard>

          <EasyXCard>
            <div className="flex items-start gap-2 text-xs text-ex-muted">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-ex-lav-300" />
              <span>The requested amount is held from your available balance immediately. An admin reviews and processes every withdrawal on-chain. If rejected, the full amount is returned to your wallet.</span>
            </div>
          </EasyXCard>
        </div>
      )}

      <h2 className="mt-9 ex-display text-lg font-bold">Your withdrawals</h2>
      <EasyXCard className="mt-3 p-0 overflow-hidden">
        {!sorted || sorted.length === 0 ? (
          <div className="p-8 text-center text-ex-muted text-sm">No withdrawals yet.</div>
        ) : (
          <div className="divide-y divide-white/5" data-testid="withdraw-history">
            {sorted.map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-3 px-4 py-3" data-testid={`withdraw-row-${w.id}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ex-text">{money(w.amount)} USDT</span>
                    <span className="text-[11px] text-ex-muted">· {w.network}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ex-muted max-w-[220px] sm:max-w-md">{w.to_address}</div>
                  {w.tx_hash && <div className="truncate text-[11px] text-emerald-300 max-w-[220px] sm:max-w-md">TX: {w.tx_hash}</div>}
                  <div className="text-[11px] text-ex-muted">{dayjs(w.created_at).format("DD MMM YYYY, HH:mm")}</div>
                </div>
                <EasyXStatusBadge status={w.status} />
              </div>
            ))}
          </div>
        )}
      </EasyXCard>
    </div>
  );
}
