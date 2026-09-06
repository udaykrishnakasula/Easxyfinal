import React, { useState, useMemo } from "react";
import {
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Wallet as WalletIcon,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  Share2,
  Headphones,
  Activity,
  FileText,
  BadgeCheck,
  AlertTriangle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Eye,
  Sliders,
  DollarSign,
  ChevronRight,
  Sparkles,
  Lock,
  RotateCw,
  Plus,
  Minus,
  MessageSquare,
  Search,
  Filter,
  Download,
  MapPin,
  X,
  Edit3,
} from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

import {
  useAdminUser,
  useSuspendUser,
  useUnsuspendUser,
  useAdminInvestments,
  useCancelInvestment,
  useAdminDeposits,
  useApproveDeposit,
  useRejectDeposit,
  useAdminWithdrawals,
  useWithdrawalAction,
  useAdminKyc,
  useApproveKyc,
  useRejectKyc,
  fetchAdminKycDocUrl,
  useAdminWalletTransactions,
  useAdminAdjustWallet,
  useAdminReferrals,
  useAdminSupportTickets,
  useAdminReplySupportTicket,
  useAdminUpdateSupportTicketStatus,
  useAdminUserJourney,
  useAdminAuditLogs,
} from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";
import AdminEditKycModal from "@/admin/components/AdminEditKycModal";
import {
  EasyXModal,
  EasyXButton,
  EasyXBadge,
  EasyXCard,
  EasyXTable,
  EasyXEmptyState,
  EasyXLoader,
} from "@/design/EasyX";
import { AdminImageZoomModal } from "@/admin/components/AdminImageZoomModal";

function money(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return v ?? "0.00";
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d) {
  if (!d) return "—";
  return dayjs(d).format("MMM D, YYYY · h:mm A");
}

function formatRelative(d) {
  if (!d) return "—";
  return dayjs(d).fromNow();
}

function StatusPill({ status }) {
  if (status === "suspended" || status === "banned") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <Ban className="h-3 w-3" /> SUSPENDED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
      <CheckCircle2 className="h-3 w-3" /> ACTIVE
    </span>
  );
}

function KycPill({ status }) {
  const map = {
    approved: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    rejected: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    none: "bg-white/5 text-ex-muted border border-white/10",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
        map[status] || map.none
      }`}
    >
      <BadgeCheck className="h-3 w-3" />
      {status || "NONE"}
    </span>
  );
}

function KycDocItem({ docId, docType, onExpand }) {
  const [url, setUrl] = useState(null);
  const [err, setErr] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let active = true;
    if (!docId) {
      setLoading(false);
      return;
    }
    fetchAdminKycDocUrl(docId)
      .then((u) => {
        if (active) {
          setUrl(u);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setErr(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [docId]);

  const labelMap = {
    id_front: "ID Document (Front)",
    id_back: "ID Document (Back)",
    selfie: "Live Camera Selfie",
  };

  const label = labelMap[docType] || docType?.replace("_", " ").toUpperCase() || "Document";

  return (
    <div className="rounded-ex-card bg-white/[0.03] border border-white/8 p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ex-text">{label}</span>
        <span className="text-[10px] text-ex-muted font-mono">{docId?.slice(0, 8)}</span>
      </div>
      <div
        onClick={() => url && onExpand?.(url, label)}
        className={`relative aspect-[16/10] rounded-ex-ctrl overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center group ${
          url ? "cursor-pointer" : ""
        }`}
      >
        {loading ? (
          <EasyXLoader className="py-4" />
        ) : url ? (
          <>
            <img src={url} alt={label} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <span className="px-2.5 py-1 rounded-ex-ctrl bg-black/70 text-white text-xs font-medium flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> Inspect / Zoom
              </span>
            </div>
          </>
        ) : (
          <div className="text-xs text-ex-muted p-2 text-center">
            {err ? "Document preview unavailable" : "No document image"}
          </div>
        )}
      </div>
      {url && (
        <div className="flex items-center justify-end gap-2 mt-1">
          <a
            href={url}
            download={`easyx-doc-${docType}-${docId}.jpg`}
            className="text-[11px] text-ex-lav-300 hover:text-white flex items-center gap-1"
          >
            <Download className="h-3 w-3" /> Download
          </a>
        </div>
      )}
    </div>
  );
}

export function User360ViewModal({ user: initialUser, open, onClose, onUserUpdated }) {
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals inside 360 view
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [adjustWalletModalOpen, setAdjustWalletModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDirection, setAdjustDirection] = useState("credit");
  const [adjustReason, setAdjustReason] = useState("");

  const [kycRejectModalOpen, setKycRejectModalOpen] = useState(false);
  const [kycRejectReason, setKycRejectReason] = useState("");
  const [editKycModalOpen, setEditKycModalOpen] = useState(false);

  const [cancelInvModalOpen, setCancelInvModalOpen] = useState(null); // investment object
  const [cancelInvReason, setCancelInvReason] = useState("");
  const [cancelInvRefund, setCancelInvRefund] = useState("");

  const [supportReplyModalOpen, setSupportReplyModalOpen] = useState(null); // ticket object
  const [supportReplyText, setSupportReplyText] = useState("");

  const [zoomModal, setZoomModal] = useState({ open: false, url: null, title: "" });

  // Fetch authoritative user details
  const userId = initialUser?.id;
  const { data: userDetails, isLoading: userLoading, refetch: refetchUser } = useAdminUser(userId);
  const user = userDetails || initialUser;

  // Domain Queries
  const { data: investmentsData, isLoading: invLoading, refetch: refetchInvs } = useAdminInvestments();
  const { data: depositsData, isLoading: depLoading, refetch: refetchDeps } = useAdminDeposits();
  const { data: withdrawalsData, isLoading: wdLoading, refetch: refetchWds } = useAdminWithdrawals();
  const { data: kycData, isLoading: kycLoading, refetch: refetchKyc } = useAdminKyc();
  const { data: walletTxData, isLoading: walletTxLoading, refetch: refetchWalletTx } = useAdminWalletTransactions({
    user_id: userId,
  });
  const { data: referralsData, isLoading: refLoading } = useAdminReferrals();
  const { data: supportTicketsData, isLoading: supportLoading } = useAdminSupportTickets();
  const { data: journeyData, isLoading: journeyLoading } = useAdminUserJourney(userId);
  const { data: auditLogsData, isLoading: auditLoading } = useAdminAuditLogs();

  // Mutations
  const suspendUserMutation = useSuspendUser();
  const unsuspendUserMutation = useUnsuspendUser();
  const adjustWalletMutation = useAdminAdjustWallet();
  const approveKycMutation = useApproveKyc();
  const rejectKycMutation = useRejectKyc();
  const cancelInvMutation = useCancelInvestment();
  const approveDepMutation = useApproveDeposit();
  const rejectDepMutation = useRejectDeposit();
  const wdActionMutation = useWithdrawalAction();
  const replySupportMutation = useAdminReplySupportTicket();

  // Filter Domain Data for this User
  const userInvestments = useMemo(() => {
    if (!investmentsData || !userId) return [];
    return (Array.isArray(investmentsData) ? investmentsData : []).filter((i) => i.user_id === userId);
  }, [investmentsData, userId]);

  const userDeposits = useMemo(() => {
    if (!depositsData || !userId) return [];
    return (Array.isArray(depositsData) ? depositsData : []).filter((d) => d.user_id === userId);
  }, [depositsData, userId]);

  const userWithdrawals = useMemo(() => {
    if (!withdrawalsData || !userId) return [];
    return (Array.isArray(withdrawalsData) ? withdrawalsData : []).filter((w) => w.user_id === userId);
  }, [withdrawalsData, userId]);

  const userKyc = useMemo(() => {
    if (!kycData || !userId) return null;
    return (Array.isArray(kycData) ? kycData : []).find((k) => k.user_id === userId) || null;
  }, [kycData, userId]);

  const userWalletTransactions = useMemo(() => {
    return walletTxData?.transactions || [];
  }, [walletTxData]);

  const userReferralStats = useMemo(() => {
    if (!referralsData || !userId) {
      return { referees: [], commissions: [] };
    }
    const relationships = Array.isArray(referralsData?.relationships)
      ? referralsData.relationships
      : Array.isArray(referralsData)
      ? referralsData
      : [];
    const commissions = Array.isArray(referralsData?.commissions) ? referralsData.commissions : [];

    const myReferees = relationships.filter((r) => r.referrer?.id === userId || r.referrer_id === userId);
    const myComms = commissions.filter((c) => c.referrer?.id === userId || c.referrer_id === userId);

    return { referees: myReferees, commissions: myComms };
  }, [referralsData, userId]);

  const userSupportTickets = useMemo(() => {
    if (!supportTicketsData || !user) return [];
    const tickets = Array.isArray(supportTicketsData?.tickets)
      ? supportTicketsData.tickets
      : Array.isArray(supportTicketsData)
      ? supportTicketsData
      : [];
    return tickets.filter((t) => t.user_id === userId || (user.email && t.user_email === user.email));
  }, [supportTicketsData, userId, user]);

  const userAuditLogs = useMemo(() => {
    if (!auditLogsData || !userId) return [];
    const logs = Array.isArray(auditLogsData?.logs)
      ? auditLogsData.logs
      : Array.isArray(auditLogsData)
      ? auditLogsData
      : [];
    return logs.filter((l) => l.target_user_id === userId || l.entity_id === userId);
  }, [auditLogsData, userId]);

  // Aggregate Metrics for Quick KPI strip
  const totalDepositVolume = useMemo(() => {
    return userDeposits
      .filter((d) => d.status === "approved")
      .reduce((sum, d) => sum + Number(d.approved_amount || d.amount || 0), 0);
  }, [userDeposits]);

  const totalWithdrawalVolume = useMemo(() => {
    return userWithdrawals
      .filter((w) => w.status === "paid" || w.status === "approved" || w.status === "completed")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  }, [userWithdrawals]);

  const copyToClipboard = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${key} to clipboard`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleRefreshAll = () => {
    refetchUser();
    refetchInvs();
    refetchDeps();
    refetchWds();
    refetchKyc();
    refetchWalletTx();
    toast.success("User 360° profile refreshed");
  };

  const handleSuspend = async () => {
    if (suspendReason.trim().length < 3) {
      toast.error("Please provide a suspension reason (min 3 chars)");
      return;
    }
    try {
      await suspendUserMutation.mutateAsync({ id: user.id, reason: suspendReason.trim() });
      toast.success(`${user.name || user.email} has been suspended.`);
      setSuspendModalOpen(false);
      setSuspendReason("");
      refetchUser();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to suspend user"));
    }
  };

  const handleUnsuspend = async () => {
    try {
      await unsuspendUserMutation.mutateAsync({ id: user.id });
      toast.success(`${user.name || user.email} has been reactivated.`);
      refetchUser();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to reactivate user"));
    }
  };

  const handleAdjustWallet = async () => {
    const amt = Number(adjustAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }
    if (adjustReason.trim().length < 3) {
      toast.error("Please provide an adjustment reason (min 3 chars)");
      return;
    }
    try {
      await adjustWalletMutation.mutateAsync({
        user_id: user.id,
        amount: amt,
        direction: adjustDirection,
        reason: adjustReason.trim(),
      });
      toast.success(`Wallet successfully ${adjustDirection === "credit" ? "credited" : "debited"} with ${money(amt)} USDT.`);
      setAdjustWalletModalOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      refetchUser();
      refetchWalletTx();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to adjust wallet"));
    }
  };

  const handleApproveKyc = async (kycRecordId) => {
    try {
      await approveKycMutation.mutateAsync({ id: kycRecordId });
      toast.success("KYC verification approved successfully");
      refetchKyc();
      refetchUser();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to approve KYC"));
    }
  };

  const handleRejectKyc = async () => {
    if (!userKyc?.id) return;
    if (kycRejectReason.trim().length < 3) {
      toast.error("Please enter a valid rejection reason");
      return;
    }
    try {
      await rejectKycMutation.mutateAsync({ id: userKyc.id, reason: kycRejectReason.trim() });
      toast.success("KYC verification rejected");
      setKycRejectModalOpen(false);
      setKycRejectReason("");
      refetchKyc();
      refetchUser();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to reject KYC"));
    }
  };

  const handleCancelInvestment = async () => {
    if (!cancelInvModalOpen) return;
    const refAmt = Number(cancelInvRefund);
    if (isNaN(refAmt) || refAmt < 0) {
      toast.error("Please enter a valid refund amount");
      return;
    }
    if (cancelInvReason.trim().length < 3) {
      toast.error("Please provide a reason for cancelling this investment");
      return;
    }
    try {
      await cancelInvMutation.mutateAsync({
        id: cancelInvModalOpen.id,
        refund_amount: refAmt,
        reason: cancelInvReason.trim(),
      });
      toast.success(`Investment cancelled. ${money(refAmt)} USDT refunded to user.`);
      setCancelInvModalOpen(null);
      setCancelInvReason("");
      setCancelInvRefund("");
      refetchInvs();
      refetchUser();
      refetchWalletTx();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to cancel investment"));
    }
  };

  const handleApproveDeposit = async (depId, amount) => {
    try {
      await approveDepMutation.mutateAsync({ id: depId, approved_amount: amount });
      toast.success("Deposit approved and credited to wallet");
      refetchDeps();
      refetchUser();
      refetchWalletTx();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to approve deposit"));
    }
  };

  const handleRejectDeposit = async (depId) => {
    const reason = prompt("Enter deposit rejection reason:", "Invalid transaction or unverified hash");
    if (!reason) return;
    try {
      await rejectDepMutation.mutateAsync({ id: depId, note: reason });
      toast.success("Deposit rejected");
      refetchDeps();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to reject deposit"));
    }
  };

  const handleApproveWithdrawal = async (wdId) => {
    try {
      await wdActionMutation.mutateAsync({ id: wdId, action: "approve" });
      toast.success("Withdrawal approved");
      refetchWds();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to approve withdrawal"));
    }
  };

  const handleCompleteWithdrawal = async (wdId) => {
    const tx = prompt("Enter transaction hash for completed dispatch (leave blank to auto-generate):", "");
    try {
      await wdActionMutation.mutateAsync({
        id: wdId,
        action: "pay",
        body: tx ? { tx_hash: tx } : {},
      });
      toast.success("Withdrawal marked as completed / paid");
      refetchWds();
      refetchUser();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to complete withdrawal"));
    }
  };

  const handleRejectWithdrawal = async (wdId) => {
    const reason = prompt("Enter withdrawal rejection reason (funds will be refunded to user):", "Security hold or invalid address");
    if (!reason) return;
    try {
      await wdActionMutation.mutateAsync({ id: wdId, action: "reject", body: { reason } });
      toast.success("Withdrawal rejected and refunded");
      refetchWds();
      refetchUser();
      refetchWalletTx();
      onUserUpdated?.();
    } catch (err) {
      toast.error(apiError(err, "Failed to reject withdrawal"));
    }
  };

  const handleReplySupport = async () => {
    if (!supportReplyModalOpen) return;
    if (supportReplyText.trim().length < 2) {
      toast.error("Please enter a reply message");
      return;
    }
    try {
      await replySupportMutation.mutateAsync({
        ticketId: supportReplyModalOpen.id,
        message: supportReplyText.trim(),
        status: "in_progress",
      });
      toast.success("Support reply dispatched to user");
      setSupportReplyModalOpen(null);
      setSupportReplyText("");
    } catch (err) {
      toast.error(apiError(err, "Failed to send support reply"));
    }
  };

  if (!user) return null;

  const TABS = [
    { key: "overview", label: "Overview", icon: User, count: null },
    { key: "kyc", label: "KYC Verification", icon: BadgeCheck, count: userKyc?.status === "pending" ? "1" : null },
    { key: "investments", label: "Investments", icon: PiggyBank, count: userInvestments.length },
    { key: "deposits", label: "Deposits", icon: ArrowDownRight, count: userDeposits.length },
    { key: "withdrawals", label: "Withdrawals", icon: ArrowUpRight, count: userWithdrawals.length },
    { key: "wallet", label: "Wallet & Ledger", icon: WalletIcon, count: userWalletTransactions.length },
    { key: "referrals", label: "Referrals", icon: Share2, count: userReferralStats.referees.length },
    { key: "support", label: "Support", icon: Headphones, count: userSupportTickets.length },
    { key: "activity", label: "Activity Stream", icon: Activity, count: null },
  ];

  return (
    <EasyXModal
      open={open}
      onClose={onClose}
      className="sm:max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-ex-surface border-white/10 text-ex-text"
    >
      {/* 1. MODAL TOP HEADER */}
      <div className="p-5 sm:p-6 border-b border-white/10 bg-white/[0.02]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* User Identity Info */}
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-extrabold text-xl shadow-lg border border-white/20">
                {user.name ? user.name.slice(0, 2).toUpperCase() : user.email?.slice(0, 2).toUpperCase()}
              </div>
              <div className="absolute -bottom-1 -right-1">
                {user.status === "suspended" ? (
                  <span className="h-4 w-4 rounded-full bg-rose-500 border-2 border-ex-surface block" title="Suspended" />
                ) : (
                  <span className="h-4 w-4 rounded-full bg-emerald-500 border-2 border-ex-surface block" title="Active" />
                )}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-ex-text tracking-tight">{user.name || "Unnamed User"}</h2>
                <StatusPill status={user.status} />
                <KycPill status={user.kyc_status} />
                {user.role === "admin" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase tracking-wide">
                    Admin
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ex-muted">
                <span className="flex items-center gap-1 text-ex-text font-medium">
                  <Mail className="h-3.5 w-3.5 text-ex-lav-400" /> {user.email || "No email"}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5 text-ex-lav-400" /> {user.phone}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-ex-lav-400" /> Joined {formatDate(user.created_at)}
                </span>
              </div>

              {/* User ID and Referral Code Quick Copy */}
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => copyToClipboard(user.id, "User ID")}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-[11px] font-mono text-ex-muted hover:text-ex-text border border-white/8 transition"
                  title="Click to copy User ID"
                >
                  <span>ID: {user.id}</span>
                  {copiedKey === "User ID" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                </button>

                {user.referral_code && (
                  <button
                    onClick={() => copyToClipboard(user.referral_code, "Referral Code")}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-[11px] font-mono text-ex-lav-300 hover:text-white border border-white/8 transition"
                    title="Click to copy Referral Code"
                  >
                    <span>REF: {user.referral_code}</span>
                    {copiedKey === "Referral Code" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefreshAll}
              className="p-2 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-muted hover:text-ex-text border border-white/8 transition"
              title="Refresh User 360 Data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>

            <button
              onClick={() => setAdjustWalletModalOpen(true)}
              className="px-3 py-2 rounded-ex-ctrl bg-white/5 hover:bg-white/10 text-ex-text text-xs font-semibold border border-white/10 transition flex items-center gap-1.5"
            >
              <Sliders className="h-3.5 w-3.5 text-indigo-400" />
              <span>Adjust Balance</span>
            </button>

            {user.status === "suspended" ? (
              <EasyXButton
                onClick={handleUnsuspend}
                loading={unsuspendUserMutation.isPending}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs h-9 px-3.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Reactivate Account
              </EasyXButton>
            ) : (
              <EasyXButton
                onClick={() => setSuspendModalOpen(true)}
                className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-semibold text-xs h-9 px-3.5"
              >
                <Ban className="h-3.5 w-3.5 mr-1" /> Suspend
              </EasyXButton>
            )}
          </div>
        </div>

        {/* High-level Financial Quick KPI Bar (6 stats) */}
        <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <WalletIcon className="h-3 w-3 text-indigo-400" /> Available Balance
            </div>
            <div className="text-sm sm:text-base font-extrabold text-ex-text mt-0.5">
              {money(user.wallet?.available_balance)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>

          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <PiggyBank className="h-3 w-3 text-amber-400" /> Active Principal
            </div>
            <div className="text-sm sm:text-base font-extrabold text-amber-300 mt-0.5">
              {money(user.wallet?.locked_investment || user.investments?.active_principal)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>

          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-emerald-400" /> Total Earned
            </div>
            <div className="text-sm sm:text-base font-extrabold text-emerald-400 mt-0.5">
              {money(user.wallet?.total_earned)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>

          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <ArrowDownRight className="h-3 w-3 text-sky-400" /> Total Deposited
            </div>
            <div className="text-sm sm:text-base font-extrabold text-sky-300 mt-0.5">
              {money(totalDepositVolume)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>

          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3 text-purple-400" /> Total Withdrawn
            </div>
            <div className="text-sm sm:text-base font-extrabold text-purple-300 mt-0.5">
              {money(totalWithdrawalVolume)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>

          <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/6">
            <div className="text-[11px] text-ex-muted flex items-center gap-1">
              <Share2 className="h-3 w-3 text-rose-400" /> Ref Commission
            </div>
            <div className="text-sm sm:text-base font-extrabold text-rose-300 mt-0.5">
              {money(user.referrals?.commission_earned)} <span className="text-[10px] font-normal text-ex-muted">USDT</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TAB NAVIGATION BAR */}
      <div className="border-b border-white/10 bg-white/[0.01] px-4 sm:px-6 overflow-x-auto flex items-center gap-1 no-scrollbar shrink-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition relative ${
                isActive
                  ? "border-purple-400 text-white bg-white/[0.03]"
                  : "border-transparent text-ex-muted hover:text-ex-text hover:bg-white/[0.01]"
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? "text-purple-400" : "text-ex-muted"}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-ex-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 3. SCROLLABLE TAB CONTENT BODY */}
      <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
        {/* ================= TAB 1: OVERVIEW ================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Account Status Alert if Suspended */}
            {user.status === "suspended" && (
              <div className="p-4 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-sm font-bold text-rose-200">Account is Currently Suspended</div>
                  <p className="text-rose-300/90">
                    Reason: <strong>{user.suspended_reason || "Administrative policy enforcement"}</strong>
                  </p>
                  {user.suspended_at && <p className="text-ex-muted text-[11px]">Suspended on {formatDate(user.suspended_at)}</p>}
                </div>
              </div>
            )}

            {/* Quick Status Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* KYC Snapshot */}
              <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ex-muted">Identity (KYC)</span>
                    <KycPill status={user.kyc_status} />
                  </div>
                  <div className="mt-3 text-sm font-bold text-ex-text">
                    {user.kyc_status === "approved"
                      ? "Verified & Authorized"
                      : user.kyc_status === "pending"
                      ? "Verification Pending Review"
                      : user.kyc_status === "rejected"
                      ? "Verification Rejected"
                      : "No Documents Submitted"}
                  </div>
                  <p className="text-xs text-ex-muted mt-1">
                    {userKyc?.id_type ? `Type: ${userKyc.id_type.toUpperCase()}` : "Not submitted yet"}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("kyc")}
                  className="mt-4 text-xs font-semibold text-ex-lav-300 hover:text-white flex items-center gap-1 transition"
                >
                  <span>Review KYC details</span> <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Active Investments Snapshot */}
              <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ex-muted">Active Portfolios</span>
                    <span className="text-xs font-bold text-amber-400">
                      {userInvestments.filter((i) => i.status === "active").length} Active
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-bold text-ex-text">
                    {money(user.wallet?.locked_investment || user.investments?.active_principal)} USDT
                  </div>
                  <p className="text-xs text-ex-muted mt-1">
                    Total Lifetime: {userInvestments.length} portfolios
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("investments")}
                  className="mt-4 text-xs font-semibold text-ex-lav-300 hover:text-white flex items-center gap-1 transition"
                >
                  <span>View investments</span> <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Deposits Snapshot */}
              <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ex-muted">Deposit Record</span>
                    <span className="text-xs font-bold text-sky-400">{userDeposits.length} Records</span>
                  </div>
                  <div className="mt-3 text-sm font-bold text-ex-text">{money(totalDepositVolume)} USDT Approved</div>
                  <p className="text-xs text-ex-muted mt-1">
                    {userDeposits.filter((d) => d.status === "pending").length} Pending approval
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("deposits")}
                  className="mt-4 text-xs font-semibold text-ex-lav-300 hover:text-white flex items-center gap-1 transition"
                >
                  <span>Inspect deposit history</span> <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Support Snapshot */}
              <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-ex-muted">Support Tickets</span>
                    <span className="text-xs font-bold text-purple-400">{userSupportTickets.length} Total</span>
                  </div>
                  <div className="mt-3 text-sm font-bold text-ex-text">
                    {userSupportTickets.filter((t) => t.status === "open" || t.status === "in_progress").length} Open Tickets
                  </div>
                  <p className="text-xs text-ex-muted mt-1">
                    {userSupportTickets.filter((t) => t.status === "resolved" || t.status === "closed").length} Resolved
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("support")}
                  className="mt-4 text-xs font-semibold text-ex-lav-300 hover:text-white flex items-center gap-1 transition"
                >
                  <span>Open support desk</span> <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Profile, Security & Account Metadata Card */}
            <div className="p-5 rounded-ex-card bg-white/[0.02] border border-white/8 space-y-4">
              <h3 className="text-sm font-bold text-ex-text flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-indigo-400" /> Account Security & Metadata
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-ex-muted">User Unique ID</span>
                  <p className="mt-1 font-mono text-ex-text font-semibold">{user.id}</p>
                </div>

                <div>
                  <span className="text-ex-muted">Email Verification Status</span>
                  <p className="mt-1 text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                  </p>
                </div>

                <div>
                  <span className="text-ex-muted">Referral Affiliation</span>
                  <p className="mt-1 text-ex-text font-semibold">
                    {user.referred_by ? `Referred by: ${user.referred_by}` : "Organic / Direct"}
                  </p>
                </div>

                <div>
                  <span className="text-ex-muted">Registered At</span>
                  <p className="mt-1 text-ex-text">{formatDate(user.created_at)}</p>
                </div>

                <div>
                  <span className="text-ex-muted">Last Updated / Action</span>
                  <p className="mt-1 text-ex-text">{formatDate(user.updated_at || user.created_at)}</p>
                </div>

                <div>
                  <span className="text-ex-muted">Total Affiliate Referees</span>
                  <p className="mt-1 text-ex-text font-bold">{user.referrals?.total_referred || 0} members</p>
                </div>

                <div>
                  <span className="text-ex-muted">Verified ID Number</span>
                  <p className="mt-1 font-mono text-emerald-400 font-semibold">
                    {userKyc?.id_number || userKyc?.id_number_masked || user?.id_number || (user.kyc_status === "approved" || user.kyc_status === "pending" ? "Encrypted on file" : "Not submitted")}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <span className="text-ex-muted">Permanent Address</span>
                  <p className="mt-1 text-ex-text font-medium flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                    <span>{userKyc?.permanent_address || userKyc?.address || user?.permanent_address || user?.address || "Not submitted yet"}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: KYC VERIFICATION ================= */}
        {activeTab === "kyc" && (
          <div className="space-y-6">
            {kycLoading ? (
              <EasyXLoader />
            ) : !userKyc && (!user.kyc_status || user.kyc_status === "none") ? (
              <EasyXEmptyState
                icon={BadgeCheck}
                title="No KYC Record Submitted"
                note="This user has not yet uploaded identification documents or completed selfie verification."
              />
            ) : (
              <div className="space-y-6">
                {/* KYC Header Summary */}
                <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-ex-text">Identity Verification Assessment</h3>
                      <KycPill status={userKyc?.status || user.kyc_status} />
                    </div>
                    <p className="text-xs text-ex-muted">
                      ID Type: <strong>{(userKyc?.id_type || "National ID").toUpperCase()}</strong> · ID Number:{" "}
                      <span className="font-mono text-emerald-400 font-medium">{userKyc?.id_number || userKyc?.id_number_masked || "Encrypted on file"}</span>
                    </p>
                    {(userKyc?.permanent_address || userKyc?.address || user?.permanent_address || user?.address) && (
                      <p className="text-xs text-ex-text/90 flex items-start gap-1 pt-0.5">
                        <MapPin className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                        <span>
                          <span className="text-ex-muted">Permanent Address:</span>{" "}
                          <span className="text-white font-medium">
                            {userKyc?.permanent_address || userKyc?.address || user?.permanent_address || user?.address}
                          </span>
                        </span>
                      </p>
                    )}
                    {userKyc?.submitted_at && (
                      <p className="text-[11px] text-ex-muted">Submitted on {formatDate(userKyc.submitted_at)}</p>
                    )}
                  </div>

                  {/* KYC In-Line Review & Modification Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {userKyc?.status === "pending" && (
                      <>
                        <EasyXButton
                          onClick={() => handleApproveKyc(userKyc.id)}
                          loading={approveKycMutation.isPending}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs h-9 px-4"
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Approve KYC
                        </EasyXButton>

                        <EasyXButton
                          onClick={() => setKycRejectModalOpen(true)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-semibold text-xs h-9 px-4"
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Reject KYC
                        </EasyXButton>
                      </>
                    )}

                    <EasyXButton
                      onClick={() => setEditKycModalOpen(true)}
                      className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-200 border border-purple-500/30 font-semibold text-xs h-9 px-4"
                      data-testid="user360-edit-kyc-btn"
                    >
                      <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit KYC Details
                    </EasyXButton>
                  </div>
                </div>

                {/* Rejection notice if rejected */}
                {userKyc?.reject_reason && (
                  <div className="p-3.5 rounded-ex-card bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                    <strong>Rejection Reason:</strong> {userKyc.reject_reason}
                  </div>
                )}

                {/* Liveness Verification Insights */}
                {userKyc?.liveness && (
                  <div className="p-4 rounded-ex-card bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-2">
                    <div className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Camera Liveness & Biometric Verification Passed
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-indigo-200/90">
                      <div>Liveness Checks: Complete</div>
                      <div>Anti-Spoofing Status: Verified Human</div>
                      <div>Capture Mode: Real-time Camera Stream</div>
                    </div>
                  </div>
                )}

                {/* Document Previews Gallery */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-ex-muted uppercase tracking-wider">Submitted Document Files</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {userKyc?.documents?.length > 0 ? (
                      userKyc.documents.map((doc) => (
                        <KycDocItem
                          key={doc.id}
                          docId={doc.id}
                          docType={doc.doc_type}
                          onExpand={(url, label) => setZoomModal({ open: true, url, title: label })}
                        />
                      ))
                    ) : (
                      <>
                        <KycDocItem
                          docId={userKyc?.id}
                          docType="id_front"
                          onExpand={(url, label) => setZoomModal({ open: true, url, title: label })}
                        />
                        <KycDocItem
                          docId={userKyc?.id}
                          docType="selfie"
                          onExpand={(url, label) => setZoomModal({ open: true, url, title: label })}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: INVESTMENTS ================= */}
        {activeTab === "investments" && (
          <div className="space-y-4">
            {invLoading ? (
              <EasyXLoader />
            ) : userInvestments.length === 0 ? (
              <EasyXEmptyState
                icon={PiggyBank}
                title="No Investments Found"
                note="This user has not yet purchased any investment portfolios."
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-ex-muted">
                    Total Portfolios: <strong>{userInvestments.length}</strong>
                  </span>
                </div>

                <EasyXTable
                  columns={[
                    "Plan",
                    "Principal",
                    "Profit",
                    "Maturity Amount",
                    "Start Date",
                    "Maturity Date",
                    "Status",
                    "Actions",
                  ]}
                >
                  {userInvestments.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 font-semibold text-ex-text">
                        <div>{inv.plan_name || inv.plan_key?.toUpperCase()}</div>
                        <div className="text-[10px] text-ex-muted font-mono">{inv.id}</div>
                      </td>
                      <td className="px-4 py-3 text-ex-text font-medium">{money(inv.principal)} USDT</td>
                      <td className="px-4 py-3 text-emerald-400 font-medium">+{money(inv.profit_amount)} USDT</td>
                      <td className="px-4 py-3 font-bold text-ex-text">{money(inv.maturity_amount)} USDT</td>
                      <td className="px-4 py-3 text-xs text-ex-muted">{formatDate(inv.start_at || inv.created_at)}</td>
                      <td className="px-4 py-3 text-xs text-ex-muted">{formatDate(inv.maturity_at)}</td>
                      <td className="px-4 py-3">
                        <EasyXBadge
                          className={
                            inv.status === "active"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : inv.status === "matured"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }
                        >
                          {inv.status?.toUpperCase()}
                        </EasyXBadge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inv.status === "active" && (
                          <button
                            onClick={() => {
                              setCancelInvModalOpen(inv);
                              setCancelInvRefund(inv.principal || "0.00");
                              setCancelInvReason("");
                            }}
                            className="px-2.5 py-1 rounded-ex-ctrl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          >
                            Cancel / Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </EasyXTable>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: DEPOSITS ================= */}
        {activeTab === "deposits" && (
          <div className="space-y-4">
            {depLoading ? (
              <EasyXLoader />
            ) : userDeposits.length === 0 ? (
              <EasyXEmptyState
                icon={ArrowDownRight}
                title="No Deposits Recorded"
                note="This user has not submitted any crypto deposit transactions yet."
              />
            ) : (
              <EasyXTable columns={["Deposit ID", "Network", "Submitted", "Approved Amt", "Tx Hash", "Status", "Actions"]}>
                {userDeposits.map((dep) => (
                  <tr key={dep.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-xs text-ex-text">
                      <div>{dep.id}</div>
                      <div className="text-[10px] text-ex-muted">{formatDate(dep.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ex-lav-300">{dep.network}</td>
                    <td className="px-4 py-3 font-semibold text-ex-text">{money(dep.amount)} USDT</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">
                      {dep.approved_amount ? `${money(dep.approved_amount)} USDT` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ex-muted max-w-[120px] truncate">
                      {dep.tx_hash ? (
                        <span title={dep.tx_hash}>{dep.tx_hash.slice(0, 10)}...</span>
                      ) : (
                        "No Hash"
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <EasyXBadge
                        className={
                          dep.status === "approved"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : dep.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }
                      >
                        {dep.status?.toUpperCase()}
                      </EasyXBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {dep.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveDeposit(dep.id, dep.amount)}
                            className="px-2 py-1 rounded-ex-ctrl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectDeposit(dep.id)}
                            className="px-2 py-1 rounded-ex-ctrl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </EasyXTable>
            )}
          </div>
        )}

        {/* ================= TAB 5: WITHDRAWALS ================= */}
        {activeTab === "withdrawals" && (
          <div className="space-y-4">
            {wdLoading ? (
              <EasyXLoader />
            ) : userWithdrawals.length === 0 ? (
              <EasyXEmptyState
                icon={ArrowUpRight}
                title="No Withdrawals Recorded"
                note="This user has not requested any withdrawals yet."
              />
            ) : (
              <EasyXTable columns={["Withdrawal ID", "Network", "Amount", "Destination Address", "Date", "Status", "Actions"]}>
                {userWithdrawals.map((wd) => (
                  <tr key={wd.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-xs text-ex-text">
                      <div>{wd.id}</div>
                      {wd.tx_hash && <div className="text-[10px] text-ex-muted truncate max-w-[100px]">TX: {wd.tx_hash}</div>}
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-ex-lav-300">{wd.network}</td>
                    <td className="px-4 py-3 font-semibold text-ex-text">{money(wd.amount)} USDT</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-ex-muted max-w-[140px] truncate" title={wd.to_address || wd.address}>
                      {wd.to_address || wd.address || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-ex-muted">{formatDate(wd.created_at)}</td>
                    <td className="px-4 py-3">
                      <EasyXBadge
                        className={
                          wd.status === "paid" || wd.status === "completed"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : wd.status === "approved"
                            ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                            : wd.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }
                      >
                        {wd.status?.toUpperCase()}
                      </EasyXBadge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {wd.status === "pending" && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApproveWithdrawal(wd.id)}
                            className="px-2 py-1 rounded-ex-ctrl text-xs font-semibold bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectWithdrawal(wd.id)}
                            className="px-2 py-1 rounded-ex-ctrl text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition"
                          >
                            Reject & Refund
                          </button>
                        </div>
                      )}
                      {wd.status === "approved" && (
                        <button
                          onClick={() => handleCompleteWithdrawal(wd.id)}
                          className="px-2 py-1 rounded-ex-ctrl text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition"
                        >
                          Mark Dispatched
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </EasyXTable>
            )}
          </div>
        )}

        {/* ================= TAB 6: WALLET & LEDGER ================= */}
        {activeTab === "wallet" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-ex-muted">
                Transaction History ({userWalletTransactions.length} events recorded)
              </span>
              <EasyXButton
                onClick={() => setAdjustWalletModalOpen(true)}
                className="h-8 px-3 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1" /> New Balance Adjustment
              </EasyXButton>
            </div>

            {walletTxLoading ? (
              <EasyXLoader />
            ) : userWalletTransactions.length === 0 ? (
              <EasyXEmptyState
                icon={WalletIcon}
                title="No Ledger Transactions"
                note="No transaction activity has been recorded on this user's wallet."
              />
            ) : (
              <EasyXTable columns={["Timestamp", "Transaction ID", "Type", "Amount", "Balance After", "Description"]}>
                {userWalletTransactions.map((tx) => {
                  const isCredit = tx.direction === "credit";
                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 text-xs text-ex-muted">{formatDate(tx.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-ex-text">{tx.id}</td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-ex-lav-300">
                          {tx.type?.replace("_", " ")}
                        </span>
                      </td>
                      <td className={`px-4 py-3 font-bold ${isCredit ? "text-emerald-400" : "text-rose-400"}`}>
                        {isCredit ? "+" : "-"}
                        {money(tx.amount)} USDT
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-ex-text">{money(tx.balance_after)} USDT</td>
                      <td className="px-4 py-3 text-xs text-ex-muted max-w-[200px] truncate" title={tx.note || tx.description}>
                        {tx.note || tx.description || "—"}
                      </td>
                    </tr>
                  );
                })}
              </EasyXTable>
            )}
          </div>
        )}

        {/* ================= TAB 7: REFERRALS ================= */}
        {activeTab === "referrals" && (
          <div className="space-y-6">
            {/* Referral Stats Banner */}
            <div className="p-4 rounded-ex-card bg-white/[0.02] border border-white/8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-ex-muted">Referral Affiliate Code</span>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-ex-text">{user.referral_code || "None"}</span>
                  {user.referral_code && (
                    <button
                      onClick={() => copyToClipboard(user.referral_code, "Referral Code")}
                      className="p-1 rounded bg-white/5 hover:bg-white/10 text-ex-muted hover:text-white"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-xs text-ex-muted">Direct Referees</span>
                <div className="mt-1 text-base font-bold text-ex-text">
                  {user.referrals?.total_referred || userReferralStats.referees.length} members
                </div>
              </div>

              <div>
                <span className="text-xs text-ex-muted">Commissions Earned</span>
                <div className="mt-1 text-base font-bold text-emerald-400">
                  {money(user.referrals?.commission_earned)} USDT
                </div>
              </div>
            </div>

            {/* Referees Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-ex-muted uppercase tracking-wider">Invited Referees</h4>
              {userReferralStats.referees.length === 0 ? (
                <EasyXEmptyState
                  icon={Share2}
                  title="No Referees Found"
                  note="This user has not successfully onboarded any referred members yet."
                />
              ) : (
                <EasyXTable columns={["Referee", "Email", "Joined Date", "Commission Generated"]}>
                  {userReferralStats.referees.map((r, idx) => (
                    <tr key={r.referee?.id || idx} className="hover:bg-white/[0.02] transition">
                      <td className="px-4 py-3 font-semibold text-ex-text">{r.referee?.name || "Referee User"}</td>
                      <td className="px-4 py-3 text-xs text-ex-muted">{r.referee?.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-ex-muted">{formatDate(r.joined_at)}</td>
                      <td className="px-4 py-3 text-emerald-400 font-bold">10% Active</td>
                    </tr>
                  ))}
                </EasyXTable>
              )}
            </div>
          </div>
        )}

        {/* ================= TAB 8: SUPPORT TICKETS ================= */}
        {activeTab === "support" && (
          <div className="space-y-4">
            {supportLoading ? (
              <EasyXLoader />
            ) : userSupportTickets.length === 0 ? (
              <EasyXEmptyState
                icon={Headphones}
                title="No Support Tickets"
                note="This user has not submitted any support or inquiry tickets."
              />
            ) : (
              <EasyXTable columns={["Ticket ID", "Subject", "Category", "Priority", "Status", "Updated", "Actions"]}>
                {userSupportTickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-ex-text">#{ticket.id?.slice(0, 8)}</td>
                    <td className="px-4 py-3 font-medium text-ex-text max-w-[200px] truncate">{ticket.subject}</td>
                    <td className="px-4 py-3 text-xs text-ex-muted uppercase">{ticket.category || "General"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          ticket.priority === "urgent"
                            ? "bg-rose-500/20 text-rose-300"
                            : ticket.priority === "high"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-white/10 text-ex-muted"
                        }`}
                      >
                        {(ticket.priority || "NORMAL").toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <EasyXBadge
                        className={
                          ticket.status === "open"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : ticket.status === "in_progress"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-white/10 text-ex-muted"
                        }
                      >
                        {(ticket.status || "OPEN").toUpperCase()}
                      </EasyXBadge>
                    </td>
                    <td className="px-4 py-3 text-xs text-ex-muted">{formatRelative(ticket.updated_at || ticket.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => {
                          setSupportReplyModalOpen(ticket);
                          setSupportReplyText("");
                        }}
                        className="px-2.5 py-1 rounded-ex-ctrl text-xs font-semibold bg-white/5 hover:bg-white/10 text-ex-lav-300 hover:text-white border border-white/8 transition"
                      >
                        Reply
                      </button>
                    </td>
                  </tr>
                ))}
              </EasyXTable>
            )}
          </div>
        )}

        {/* ================= TAB 9: ACTIVITY STREAM ================= */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <span className="text-xs font-semibold text-ex-muted">
              Live Activity Timeline & Audit Trail
            </span>

            {journeyLoading ? (
              <EasyXLoader />
            ) : journeyData?.timeline?.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
                {journeyData.timeline.map((evt, idx) => (
                  <div key={idx} className="relative flex items-start gap-4 pl-8 group">
                    <div className="absolute left-2 top-1.5 h-3.5 w-3.5 rounded-full bg-purple-500 border-2 border-ex-surface" />
                    <div className="flex-1 p-3 rounded-ex-card bg-white/[0.02] border border-white/6 group-hover:border-white/15 transition">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ex-text">{evt.title || evt.action || "Event Logged"}</span>
                        <span className="text-ex-muted">{formatDate(evt.timestamp || evt.created_at)}</span>
                      </div>
                      {evt.description && <p className="mt-1 text-xs text-ex-muted">{evt.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : userAuditLogs.length > 0 ? (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-white/10">
                {userAuditLogs.map((log) => (
                  <div key={log.id} className="relative flex items-start gap-4 pl-8 group">
                    <div className="absolute left-2 top-1.5 h-3.5 w-3.5 rounded-full bg-indigo-500 border-2 border-ex-surface" />
                    <div className="flex-1 p-3 rounded-ex-card bg-white/[0.02] border border-white/6 group-hover:border-white/15 transition">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-ex-text font-mono">{log.action}</span>
                        <span className="text-ex-muted">{formatDate(log.created_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-ex-muted">
                        Performed by {log.actor_name || log.actor_email || "Admin"} ({log.actor_role || "admin"})
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EasyXEmptyState
                icon={Activity}
                title="No Activity Logged"
                note="No background session events or administrative audit logs recorded for this user yet."
              />
            )}
          </div>
        )}
      </div>

      {/* 4. MODAL FOOTER BAR */}
      <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between">
        <div className="text-xs text-ex-muted">
          Viewing 360° Profile of <span className="text-ex-text font-semibold">{user.name || user.email}</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-ex-ctrl text-sm font-semibold text-ex-muted hover:text-ex-text hover:bg-white/5 transition"
        >
          Close
        </button>
      </div>

      {/* ================= NESTED MODALS ================= */}

      {/* 1. SUSPENSION CONFIRMATION MODAL */}
      <EasyXModal open={suspendModalOpen} onClose={() => setSuspendModalOpen(false)} title="Confirm Account Suspension">
        <div className="space-y-4 text-sm">
          <div className="p-3.5 rounded-ex-card bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Policy Enforcement Note
            </div>
            <p className="mt-1">
              Suspending <strong>{user.name || user.email}</strong> will prevent logging in, new investments, and withdrawals.
              Active portfolios will continue toward scheduled maturity.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Suspension Reason (Audit Log)</label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              placeholder="e.g. Identity discrepancy, Terms of Service violation, User requested hold..."
              rows={3}
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <button
              onClick={() => setSuspendModalOpen(false)}
              className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text"
            >
              Cancel
            </button>
            <EasyXButton
              onClick={handleSuspend}
              loading={suspendUserMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              <Ban className="h-4 w-4 mr-1.5" /> Confirm Suspension
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* 2. MANUAL WALLET ADJUSTMENT MODAL */}
      <EasyXModal
        open={adjustWalletModalOpen}
        onClose={() => setAdjustWalletModalOpen(false)}
        title={`Adjust User Balance (${user.name || user.email})`}
      >
        <div className="space-y-4 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setAdjustDirection("credit")}
              className={`p-2.5 rounded-ex-ctrl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                adjustDirection === "credit"
                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                  : "bg-white/5 border-white/10 text-ex-muted hover:text-white"
              }`}
            >
              <Plus className="h-4 w-4 text-emerald-400" /> Credit Balance (+)
            </button>

            <button
              type="button"
              onClick={() => setAdjustDirection("debit")}
              className={`p-2.5 rounded-ex-ctrl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                adjustDirection === "debit"
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
                  : "bg-white/5 border-white/10 text-ex-muted hover:text-white"
              }`}
            >
              <Minus className="h-4 w-4 text-rose-400" /> Debit Balance (-)
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Adjustment Amount (USDT)</label>
            <input
              type="number"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              placeholder="e.g. 500.00"
              step="0.01"
              min="0.01"
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Mandatory Reason (Recorded in Ledger)</label>
            <textarea
              value={adjustReason}
              onChange={(e) => setAdjustReason(e.target.value)}
              placeholder="e.g. Manual compensation, bonus credit, uncredited deposit adjustment..."
              rows={2}
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-indigo-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <button
              onClick={() => setAdjustWalletModalOpen(false)}
              className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text"
            >
              Cancel
            </button>
            <EasyXButton
              onClick={handleAdjustWallet}
              loading={adjustWalletMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              Apply Adjustment
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* 3. KYC REJECTION REASON MODAL */}
      <EasyXModal open={kycRejectModalOpen} onClose={() => setKycRejectModalOpen(false)} title="Reject KYC Verification">
        <div className="space-y-4 text-sm">
          <p className="text-xs text-ex-muted">
            Provide a clear explanation for rejecting identity documents. This will be sent directly to the user.
          </p>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">Rejection Reason</label>
            <textarea
              value={kycRejectReason}
              onChange={(e) => setKycRejectReason(e.target.value)}
              placeholder="e.g. ID document is blurry, Selfie face mismatch, Expired document..."
              rows={3}
              className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
            <button
              onClick={() => setKycRejectModalOpen(false)}
              className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text"
            >
              Cancel
            </button>
            <EasyXButton
              onClick={handleRejectKyc}
              loading={rejectKycMutation.isPending}
              className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
            >
              Confirm Rejection
            </EasyXButton>
          </div>
        </div>
      </EasyXModal>

      {/* 4. CANCEL INVESTMENT MODAL */}
      <EasyXModal
        open={Boolean(cancelInvModalOpen)}
        onClose={() => setCancelInvModalOpen(null)}
        title="Cancel Active Portfolio & Issue Refund"
      >
        {cancelInvModalOpen && (
          <div className="space-y-4 text-sm">
            <p className="text-xs text-ex-muted">
              Cancelling <strong>{cancelInvModalOpen.plan_name || cancelInvModalOpen.plan_key}</strong> (Principal:{" "}
              {money(cancelInvModalOpen.principal)} USDT).
            </p>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">Refund Amount to Wallet (USDT)</label>
              <input
                type="number"
                value={cancelInvRefund}
                onChange={(e) => setCancelInvRefund(e.target.value)}
                step="0.01"
                max={cancelInvModalOpen.principal}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">Reason for Cancellation</label>
              <textarea
                value={cancelInvReason}
                onChange={(e) => setCancelInvReason(e.target.value)}
                placeholder="e.g. User requested emergency liquidation, compliance cancellation..."
                rows={2}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
              <button
                onClick={() => setCancelInvModalOpen(null)}
                className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text"
              >
                Back
              </button>
              <EasyXButton
                onClick={handleCancelInvestment}
                loading={cancelInvMutation.isPending}
                className="bg-rose-500 hover:bg-rose-600 text-white font-semibold"
              >
                Confirm Cancel & Refund
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* 5. SUPPORT REPLY MODAL */}
      <EasyXModal
        open={Boolean(supportReplyModalOpen)}
        onClose={() => setSupportReplyModalOpen(null)}
        title={`Reply to Ticket #${supportReplyModalOpen?.id?.slice(0, 8)}`}
      >
        {supportReplyModalOpen && (
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-ex-card bg-white/[0.02] border border-white/8">
              <div className="text-xs font-bold text-ex-text">{supportReplyModalOpen.subject}</div>
              <p className="text-xs text-ex-muted mt-1">{supportReplyModalOpen.message || supportReplyModalOpen.text}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">Official Support Response</label>
              <textarea
                value={supportReplyText}
                onChange={(e) => setSupportReplyText(e.target.value)}
                placeholder="Type your response to the user here..."
                rows={4}
                className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/50 focus:border-purple-400 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/8">
              <button
                onClick={() => setSupportReplyModalOpen(null)}
                className="px-4 py-2 rounded-ex-ctrl text-sm text-ex-muted hover:text-ex-text"
              >
                Cancel
              </button>
              <EasyXButton
                onClick={handleReplySupport}
                loading={replySupportMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                Send Reply
              </EasyXButton>
            </div>
          </div>
        )}
      </EasyXModal>

      {/* 6. IMAGE ZOOM MODAL */}
      <AdminImageZoomModal
        open={zoomModal.open}
        onClose={() => setZoomModal({ open: false, url: null, title: "" })}
        imageUrl={zoomModal.url}
        title={zoomModal.title}
      />

      {/* 7. ADMIN EDIT KYC DETAILS MODAL */}
      <AdminEditKycModal
        open={editKycModalOpen}
        record={userKyc}
        user={user}
        onClose={() => setEditKycModalOpen(false)}
        onSaved={() => {
          if (onUserUpdated) onUserUpdated();
        }}
      />
    </EasyXModal>
  );
}

export default User360ViewModal;
