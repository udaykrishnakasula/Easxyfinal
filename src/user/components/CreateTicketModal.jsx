import React, { useState } from "react";
import { toast } from "sonner";
import {
  LifeBuoy,
  Send,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  TrendingUp,
  KeyRound,
  Users,
  Wrench,
  Sparkles,
} from "lucide-react";
import { EasyXModal, EasyXButton } from "@/design/EasyX";
import { useCreateSupportTicket } from "@/user/api";
import SupportAttachmentUploader, { uploadSupportFiles } from "@/shared/components/SupportAttachmentUploader";
import { apiError } from "@/shared/lib/api";

const CATEGORIES = [
  { id: "ACCOUNT", label: "Account & Profile", icon: HelpCircle, description: "Profile details, settings, or account status" },
  { id: "LOGIN", label: "Login & Access", icon: KeyRound, description: "Authentication, passwords, 2FA issues" },
  { id: "DEPOSIT", label: "Deposit & Funding", icon: ArrowDownToLine, description: "USDT deposit proof, address, blockchain confirmation" },
  { id: "INVESTMENT", label: "Investment Plans", icon: TrendingUp, description: "Plan activation, returns, unlock status" },
  { id: "KYC", label: "KYC Verification", icon: ShieldCheck, description: "ID document upload, selfie liveness review" },
  { id: "WITHDRAWAL", label: "Withdrawal Request", icon: ArrowUpFromLine, description: "Payout status, wallet address, limits" },
  { id: "WALLET", label: "Wallet & Balances", icon: Wallet, description: "Available funds, earnings balance, transfers" },
  { id: "REFERRAL", label: "Referral & Commissions", icon: Users, description: "Invited friends, referral rewards, tree" },
  { id: "TECHNICAL", label: "Technical & Bug", icon: Wrench, description: "Platform errors, loading or interface glitches" },
  { id: "OTHER", label: "Other Inquiry", icon: LifeBuoy, description: "General questions or feedback" },
];

const PRIORITIES = [
  { id: "NORMAL", label: "Normal", desc: "General question or non-urgent matter (SLA < 12h)" },
  { id: "HIGH", label: "High", desc: "Payment, KYC or transaction assistance (SLA < 4h)" },
  { id: "URGENT", label: "Urgent", desc: "Critical account or funding block (SLA < 1h)" },
];

export default function CreateTicketModal({
  open,
  onOpenChange,
  onTicketCreated,
  defaultCategory = "DEPOSIT",
  defaultSubject = "",
  defaultMessage = "",
  defaultPriority = "NORMAL",
}) {
  const createTicket = useCreateSupportTicket();

  const [subject, setSubject] = useState(defaultSubject || "");
  const [category, setCategory] = useState(defaultCategory || "DEPOSIT");
  const [priority, setPriority] = useState(defaultPriority || "NORMAL");
  const [message, setMessage] = useState(defaultMessage || "");
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Sync default values when modal opens
  React.useEffect(() => {
    if (open) {
      if (defaultCategory) setCategory(defaultCategory);
      if (defaultSubject) setSubject(defaultSubject);
      if (defaultMessage) setMessage(defaultMessage);
      if (defaultPriority) setPriority(defaultPriority);
    }
  }, [open, defaultCategory, defaultSubject, defaultMessage, defaultPriority]);

  const resetForm = () => {
    // Revoke any pending object URLs
    attachments.forEach((att) => {
      if (att.previewUrl) {
        try {
          URL.revokeObjectURL(att.previewUrl);
        } catch (e) {}
      }
    });
    setSubject(defaultSubject || "");
    setCategory(defaultCategory || "DEPOSIT");
    setPriority(defaultPriority || "NORMAL");
    setMessage(defaultMessage || "");
    setAttachments([]);
    setIsUploading(false);
    setError("");
  };

  const handleClose = () => {
    onOpenChange(false);
    resetForm();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!subject.trim()) {
      setError("Please provide a concise subject describing your inquiry.");
      return;
    }
    if (subject.trim().length < 5) {
      setError("Subject must be at least 5 characters long.");
      return;
    }
    if (!message.trim()) {
      setError("Please provide a detailed description of your request or issue.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Message description must be at least 10 characters long.");
      return;
    }

    try {
      setIsUploading(true);
      let uploadedAttachmentIds = [];

      if (attachments.length > 0) {
        const rawFiles = attachments.map((a) => a.rawFile).filter(Boolean);
        if (rawFiles.length > 0) {
          const uploaded = await uploadSupportFiles(rawFiles, false);
          uploadedAttachmentIds = uploaded.map((u) => u.id);
        }
      }

      const res = await createTicket.mutateAsync({
        subject: subject.trim(),
        category,
        priority,
        message: message.trim(),
        attachments: uploadedAttachmentIds,
      });

      toast.success("Support ticket submitted successfully. Our team will respond shortly.");
      handleClose();
      if (onTicketCreated && res?.ticket) {
        onTicketCreated(res.ticket);
      }
    } catch (err) {
      console.error("Create ticket error:", err);
      const detail = apiError(err, "Failed to create support ticket.");
      setError(detail);
      toast.error(detail);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <EasyXModal
      open={open}
      onOpenChange={onOpenChange}
      onClose={resetForm}
      title="Create Support Ticket"
      description="Submit a request to our 24/7 dedicated support team. You will receive real-time updates directly in this thread."
      className="sm:max-w-xl max-h-[90vh] overflow-y-auto"
      testId="create-ticket-modal"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="flex items-start gap-2.5 rounded-ex-ctrl bg-red-500/15 border border-red-500/30 p-3 text-xs text-red-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Subject */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
            Subject <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Deposit confirmation inquiry for USDT TRC20"
            maxLength={140}
            className="w-full h-11 rounded-ex-ctrl bg-white/5 border border-white/10 px-3.5 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition"
            data-testid="ticket-subject-input"
            required
          />
        </div>

        {/* Category & Priority 2-Column Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 rounded-ex-ctrl bg-ex-surface2 border border-white/10 px-3 text-sm text-ex-text focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="ticket-category-select"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id} className="bg-ex-ink text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
              Priority <span className="text-red-400">*</span>
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full h-11 rounded-ex-ctrl bg-ex-surface2 border border-white/10 px-3 text-sm text-ex-text focus:border-ex-lav-400 focus:outline-none transition"
              data-testid="ticket-priority-select"
            >
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id} className="bg-ex-ink text-white">
                  {p.label} — {p.id === "URGENT" ? "Critical" : p.id === "HIGH" ? "Fast track" : "Standard"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority hint */}
        <div className="text-[11px] text-ex-muted/80 bg-white/[0.03] border border-white/6 rounded-ex-ctrl px-3 py-2 flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-ex-lav-400 shrink-0" />
          <span>
            Selected priority: <strong className="text-ex-text">{priority}</strong>.{" "}
            {PRIORITIES.find((p) => p.id === priority)?.desc}
          </span>
        </div>

        {/* Message */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
            Message Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            placeholder="Please detail your question or problem clearly. Include any relevant transaction hashes, plan names, or steps you encountered..."
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-3 text-sm text-ex-text placeholder:text-ex-muted/60 focus:border-ex-lav-400 focus:outline-none transition resize-none"
            data-testid="ticket-message-input"
            required
          />
        </div>

        {/* Screenshots / Attachments */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted uppercase tracking-wider mb-1.5">
            Screenshots & Attachments (Optional)
          </label>
          <SupportAttachmentUploader
            files={attachments}
            onChange={setAttachments}
            disabled={isUploading || createTicket.isPending}
            maxFiles={3}
            maxSizeMb={5}
          />
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="ex-btn ex-btn-ghost h-10 px-4 text-xs"
            disabled={isUploading || createTicket.isPending}
          >
            Cancel
          </button>
          <EasyXButton
            type="submit"
            variant="accent"
            loading={isUploading || createTicket.isPending}
            className="h-10 px-5 text-xs font-semibold"
            data-testid="submit-ticket-btn"
          >
            <Send className="mr-1.5 h-3.5 w-3.5" /> Submit Ticket
          </EasyXButton>
        </div>
      </form>
    </EasyXModal>
  );
}
