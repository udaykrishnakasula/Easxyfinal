import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  Copy,
  Check,
  AlertTriangle,
  ShieldCheck,
  FileImage,
  Eye,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";
import dayjs from "dayjs";

import {
  useDepositConfig,
  useMyDeposits,
  useCreateDeposit,
  usePublicMaintenance,
  money,
} from "@/user/api";
import { apiError } from "@/shared/lib/api";
import {
  PageHeading,
  EasyXCard,
  EasyXButton,
  EasyXLoader,
  EasyXStatusBadge,
  EasyXModal,
} from "@/design/EasyX";
import DepositProofUploader from "@/user/components/DepositProofUploader";

const NETWORKS = [
  { key: "TRC20", label: "TRC20", chain: "Tron network" },
  { key: "BEP20", label: "BEP20", chain: "BNB Smart Chain" },
];

export default function DepositPage() {
  const { data: config, isLoading } = useDepositConfig();
  const { data: deposits } = useMyDeposits();
  const createDeposit = useCreateDeposit();
  const { data: maintenance } = usePublicMaintenance();

  const isDepositBlocked =
    Boolean(maintenance?.is_enabled) || maintenance?.features?.deposits === false;

  const [network, setNetwork] = useState("TRC20");
  const [amount, setAmount] = useState("");
  const [txHash, setTxHash] = useState("");
  const [proofImages, setProofImages] = useState([]);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);

  const min = Number(config?.min_deposit ?? 300);
  const address = config?.addresses?.[network] || "";
  const isNetworkConfigured =
    Boolean(address) &&
    (network === "TRC20"
      ? (config?.trc20_ready !== false)
      : (config?.bep20_ready !== false));

  const amountNum = parseFloat(amount);
  const isAmountValid = amount !== "" && !isNaN(amountNum) && amountNum >= min;
  const amountError =
    amount !== "" && (isNaN(amountNum) || amountNum < min)
      ? `Minimum deposit is ${money(min)} USDT`
      : "";

  // Proof requirement: Only Proof #1 is REQUIRED; Proof #2 and #3 are OPTIONAL
  const hasRequiredProofs = proofImages.length >= 1;

  // Track itemized missing requirements to inform the user exactly what is needed
  const missingRequirements = [];
  if (isDepositBlocked) {
    missingRequirements.push(maintenance?.message || "Deposits are temporarily disabled for maintenance.");
  }
  if (!isNetworkConfigured) {
    missingRequirements.push(`The ${network} deposit address is not configured.`);
  }
  if (!amount || amount.trim() === "") {
    missingRequirements.push(`Enter a deposit amount (min ${money(min)} USDT).`);
  } else if (amountError) {
    missingRequirements.push(amountError);
  }
  if (isUploadingProof) {
    missingRequirements.push("Wait for payment proof upload to complete.");
  }
  if (!hasRequiredProofs) {
    missingRequirements.push("At least one proof of payment is required (Proof #1).");
  }

  // Validation: All required conditions satisfied
  const canSubmit =
    !isDepositBlocked &&
    isNetworkConfigured &&
    isAmountValid &&
    hasRequiredProofs &&
    !isUploadingProof &&
    !createDeposit.isPending;

  const getRequirementGuidance = () => {
    if (isDepositBlocked) {
      return {
        type: "error",
        text: maintenance?.message || "USDT deposits are temporarily disabled for scheduled maintenance.",
      };
    }
    if (!isNetworkConfigured) {
      return {
        type: "error",
        text: `The ${network} deposit address is not configured yet.`,
      };
    }
    if (!amount || amount.trim() === "") {
      return {
        type: "info",
        text: `Please enter deposit amount (minimum ${money(min)} USDT).`,
      };
    }
    if (amountError) {
      return {
        type: "error",
        text: amountError,
      };
    }
    if (isUploadingProof) {
      return {
        type: "info",
        text: "Payment proof upload in progress, please wait...",
      };
    }
    if (proofImages.length === 0) {
      return {
        type: "warning",
        text: "At least one proof of payment is required (Proof #1). Proofs #2 and #3 are optional.",
      };
    }
    return {
      type: "success",
      text: "All required deposit conditions satisfied. Ready to submit.",
    };
  };

  const guidance = getRequirementGuidance();

  useEffect(() => {
    setCopied(false);
  }, [network]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy address");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitError(null);

    if (createDeposit.isPending) return;

    if (proofImages.length === 0) {
      toast.error("Please upload Proof #1 before submitting your deposit (Proof #2 & #3 are optional).");
      return;
    }
    if (!canSubmit) return;

    try {
      await createDeposit.mutateAsync({
        network,
        amount: String(amount),
        tx_hash: txHash.trim() || undefined,
        proof_images: proofImages,
      });
      toast.success("Deposit submitted successfully — awaiting admin verification.");
      setAmount("");
      setTxHash("");
      setProofImages([]);
      setSubmitError(null);
    } catch (err) {
      const msg = apiError(
        err,
        "Could not submit deposit. Please check your transaction details and try again."
      );
      setSubmitError(msg);
      toast.error(msg);
      // Stay on the deposit screen, preserve user entered data
    }
  };

  const sorted = useMemo(() => deposits || [], [deposits]);

  return (
    <div data-testid="deposit-page">
      <PageHeading
        title="Deposit USDT"
        subtitle={`Fund your wallet. Minimum deposit ${money(min)} USDT.`}
        icon={ArrowDownToLine}
      />

      {isDepositBlocked && (
        <div
          className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 flex items-start gap-3"
          data-testid="deposit-disabled-banner"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Deposits Temporarily Paused</div>
            <div className="text-amber-200/80 mt-0.5">
              {maintenance?.message || "USDT deposits are temporarily disabled for scheduled maintenance."}
            </div>
          </div>
        </div>
      )}

      {isLoading || !config ? (
        <EasyXLoader />
      ) : (
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: address + QR */}
          <EasyXCard>
            <div className="text-sm font-semibold text-ex-text">1. Send USDT to this address</div>

            <div className="mt-3 inline-flex rounded-ex-ctrl bg-white/5 p-1" data-testid="deposit-network-tabs">
              {NETWORKS.map((n) => (
                <button
                  key={n.key}
                  onClick={() => setNetwork(n.key)}
                  data-testid={`deposit-network-${n.key}`}
                  data-active={network === n.key ? "true" : "false"}
                  className={`px-4 py-2 rounded-ex-ctrl text-sm font-medium transition ${
                    network === n.key
                      ? "bg-ex-accent text-ex-ink shadow-ex-btn"
                      : "text-ex-muted hover:text-ex-text"
                  }`}
                >
                  {n.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-ex-muted">
              {NETWORKS.find((n) => n.key === network)?.chain} · USDT only
            </p>

            {!isNetworkConfigured && (
              <div className="mt-4 flex items-start gap-2 rounded-ex-ctrl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200" data-testid="deposit-not-configured">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>The {network} deposit address is not configured yet. Please switch to another supported network or check back shortly.</span>
              </div>
            )}

            <div className="mt-4 flex justify-center rounded-ex bg-white p-4 w-fit mx-auto">
              <QRCodeCanvas value={address || "not-configured"} size={168} includeMargin={false} />
            </div>

            <div className="mt-4">
              <div className="text-xs text-ex-muted mb-1">{network} deposit address</div>
              <div className="flex items-center gap-2">
                <code
                  className="flex-1 break-all rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-xs text-ex-text"
                  data-testid="deposit-address"
                >
                  {address}
                </code>
                <EasyXButton variant="ghost" className="h-11 w-11 p-0 shrink-0" onClick={copyAddress} data-testid="deposit-copy-address">
                  {copied ? <Check className="h-4 w-4 text-emerald-300" /> : <Copy className="h-4 w-4" />}
                </EasyXButton>
              </div>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-ex-ctrl border border-white/10 bg-white/[0.03] p-3 text-xs text-ex-muted">
              <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-ex-lav-300" />
              <span>
                Send only USDT on the {network} network to this address. After sending, upload your payment proof screenshot and submit — an admin verifies every deposit before it credits your wallet.
              </span>
            </div>
          </EasyXCard>

          {/* Right: submit form */}
          <EasyXCard>
            <div className="text-sm font-semibold text-ex-text">2. Confirm your transfer</div>
            <form onSubmit={submit} className="mt-4 space-y-4" data-testid="deposit-form">
              <div>
                <label className="text-xs text-ex-muted">Network</label>
                <input
                  value={network}
                  readOnly
                  className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text"
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
                  data-testid="deposit-amount-input"
                />
                {amountError && <p className="mt-1 text-xs text-red-300" data-testid="deposit-amount-error">{amountError}</p>}
              </div>

              <div>
                <label className="text-xs text-ex-muted">Transaction hash (optional)</label>
                <input
                  type="text"
                  placeholder="Paste the on-chain transaction hash (if available)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="mt-1 w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-accent focus:outline-none"
                  data-testid="deposit-txhash-input"
                />
                <p className="mt-1 text-[11px] text-ex-muted">Each transaction hash can only be submitted once (if provided).</p>
              </div>

              {/* Payment Proof Upload Section (Proof #1 & #2 required, #3 optional) */}
              <div className="pt-1">
                <DepositProofUploader
                  images={proofImages}
                  onChange={setProofImages}
                  disabled={createDeposit.isPending}
                  onUploadingChange={setIsUploadingProof}
                />
              </div>

              {/* Submission Error Banner (kept on deposit page, no navigation away) */}
              {submitError && (
                <div
                  className="rounded-ex-ctrl border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-300 flex items-start gap-2.5"
                  data-testid="deposit-submit-error"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-semibold text-rose-200">Deposit Submission Failed</div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-rose-300/90">{submitError}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmitError(null)}
                    className="text-[11px] font-semibold text-rose-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Clear visual indicator of missing requirements when Submit is disabled */}
              {!createDeposit.isPending && (
                <div
                  className={`rounded-ex-ctrl p-3 text-xs transition border ${
                    canSubmit
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  }`}
                  data-testid="deposit-validation-hint"
                >
                  <div className="flex items-start gap-2">
                    {canSubmit ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-ex-text">
                        {canSubmit ? "Ready to Submit" : "Requirements to Enable Submission"}
                      </div>
                      <div className="mt-1 text-[11px] leading-relaxed text-ex-muted">
                        {canSubmit ? (
                          <span className="text-emerald-300 font-medium">
                            All required conditions satisfied (Amount valid & at least one proof attached).
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="text-amber-300/90 font-medium">
                              Complete the following to enable the Submit button:
                            </span>
                            <ul className="mt-1 space-y-1 pl-1">
                              {missingRequirements.map((req, idx) => (
                                <li key={idx} className="flex items-center gap-1.5 text-amber-300 font-medium">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                                  <span>{req}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <EasyXButton
                type="submit"
                className="w-full"
                disabled={!canSubmit || createDeposit.isPending}
                loading={createDeposit.isPending}
                data-testid="deposit-submit"
              >
                {createDeposit.isPending ? "Submitting deposit..." : "Submit deposit"}
              </EasyXButton>

              {/* Explicit disabled helper note directly below button */}
              {!canSubmit && !createDeposit.isPending && (
                <div
                  className="text-center text-[11px] text-amber-400/90 font-medium -mt-2"
                  data-testid="submit-disabled-reason"
                >
                  {!hasRequiredProofs && (!amount || amount.trim() === "")
                    ? "Enter deposit amount and upload at least one proof of payment to proceed."
                    : !hasRequiredProofs
                    ? "At least one proof of payment is required to submit (Proofs #2 & #3 are optional)."
                    : amountError
                    ? amountError
                    : !amount || amount.trim() === ""
                    ? `Enter a valid deposit amount (min ${money(min)} USDT).`
                    : "Please complete the required deposit fields above to enable submission."}
                </div>
              )}
            </form>
          </EasyXCard>
        </div>
      )}

      {/* History */}
      <h2 className="mt-9 ex-display text-lg font-bold">Your deposits</h2>
      <EasyXCard className="mt-3 p-0 overflow-hidden">
        {!sorted || sorted.length === 0 ? (
          <div className="p-8 text-center text-ex-muted text-sm">No deposits yet.</div>
        ) : (
          <div className="divide-y divide-white/5" data-testid="deposit-history">
            {sorted.map((d) => (
              <div key={d.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3" data-testid={`deposit-row-${d.id}`}>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ex-text">{money(d.amount)} USDT</span>
                    <span className="text-[11px] text-ex-muted">· {d.network}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-ex-muted max-w-[260px] sm:max-w-md font-mono">
                    {d.tx_hash ? d.tx_hash : <span className="text-ex-muted/60 italic font-sans">Tx Hash: Not provided</span>}
                  </div>

                  {/* Display proof thumbnails if attached */}
                  {d.proof_images && d.proof_images.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[10px] text-ex-muted flex items-center gap-1">
                        <FileImage className="h-3 w-3 text-ex-lav-300" />
                        {d.proof_images.length} proof image{d.proof_images.length > 1 ? "s" : ""}:
                      </span>
                      <div className="flex items-center gap-1.5">
                        {d.proof_images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setPreviewModalImg({ url: img, title: `Deposit Proof #${idx + 1} (${money(d.amount)} USDT)` })}
                            className="h-8 w-8 rounded overflow-hidden border border-white/15 bg-black/40 hover:border-ex-accent transition shrink-0"
                            title={`View Proof #${idx + 1}`}
                          >
                            <img src={img} alt={`Proof ${idx + 1}`} className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-[11px] text-ex-muted mt-1">{dayjs(d.created_at).format("DD MMM YYYY, HH:mm")}</div>
                </div>

                <div className="flex flex-row sm:flex-col items-start sm:items-end justify-between sm:justify-start gap-1">
                  <EasyXStatusBadge status={d.status} />
                  {d.status === "approved" && d.approved_amount && Number(d.approved_amount) !== Number(d.amount) && (
                    <span className="text-[11px] text-emerald-300">credited {money(d.approved_amount)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </EasyXCard>

      {/* Proof Image Viewer Modal in History */}
      <EasyXModal
        open={Boolean(previewModalImg)}
        onClose={() => setPreviewModalImg(null)}
        title={previewModalImg?.title || "Deposit Proof Inspection"}
      >
        {previewModalImg && (
          <div className="space-y-3 text-center">
            <div className="overflow-hidden rounded-ex-card bg-black/80 flex items-center justify-center border border-white/10 p-1 max-h-[70vh]">
              <img
                src={previewModalImg.url}
                alt={previewModalImg.title}
                className="max-h-[65vh] w-auto object-contain rounded"
              />
            </div>
            <div className="flex justify-end pt-2">
              <EasyXButton
                variant="ghost"
                onClick={() => setPreviewModalImg(null)}
                className="text-xs"
              >
                Close Preview
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>
    </div>
  );
}
