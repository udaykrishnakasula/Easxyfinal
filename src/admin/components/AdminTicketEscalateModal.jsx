import React, { useState } from "react";
import { Flame, AlertTriangle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAdminEscalateSupportTicket } from "@/admin/adminApi";
import { EasyXModal, EasyXButton } from "@/design/EasyX";

export default function AdminTicketEscalateModal({ open, onOpenChange, ticket, onSuccess }) {
  const [reason, setReason] = useState("");
  const [priority, setPriority] = useState("URGENT");
  const escalateMutation = useAdminEscalateSupportTicket();

  if (!ticket) return null;

  const handleEscalate = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please provide a reason for escalating this ticket.");
      return;
    }

    try {
      await escalateMutation.mutateAsync({
        ticketId: ticket.id,
        reason: reason.trim(),
        priority: priority || undefined,
      });

      toast.success(`Ticket escalated to ${priority || ticket.priority} priority.`);
      setReason("");
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to escalate ticket.");
    }
  };

  return (
    <EasyXModal
      open={open}
      onOpenChange={onOpenChange}
      title="Escalate Support Ticket"
      description={`Manually escalate ticket #${ticket.id.slice(-6).toUpperCase()} for priority intervention.`}
    >
      <form onSubmit={handleEscalate} className="space-y-4 text-xs text-white pt-2">
        <div className="p-3 rounded-ex-surface bg-red-500/10 border border-red-500/20 text-red-200">
          <div className="flex items-center gap-2 font-semibold text-red-300 mb-1">
            <Flame className="h-4 w-4" />
            <span>Priority Queue Elevation</span>
          </div>
          <p className="text-[11px] leading-relaxed text-red-200/80">
            Escalating will notify senior support supervisors and elevate this ticket's priority level in the queue triage.
          </p>
        </div>

        <div>
          <label className="block text-white/70 font-medium mb-1">Elevate Priority To</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-ex-ctrl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-400"
          >
            <option value="URGENT" className="bg-[#12111c] text-white">URGENT (Immediate response required)</option>
            <option value="HIGH" className="bg-[#12111c] text-white">HIGH (Priority queue)</option>
            <option value="" className="bg-[#12111c] text-white">Keep current priority ({ticket.priority})</option>
          </select>
        </div>

        <div>
          <label className="block text-white/70 font-medium mb-1">
            Escalation Reason & Notes <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explain why this ticket requires immediate supervisor attention or expedited handling..."
            className="w-full bg-white/5 border border-white/10 rounded-ex-ctrl p-3 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-red-400 transition resize-y"
            required
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
          <EasyXButton variant="ghost" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </EasyXButton>
          <EasyXButton
            type="submit"
            loading={escalateMutation.isPending}
            disabled={!reason.trim()}
            className="bg-red-500 hover:bg-red-600 text-white font-bold gap-1.5"
          >
            <Flame className="h-3.5 w-3.5" />
            Confirm Escalation
          </EasyXButton>
        </div>
      </form>
    </EasyXModal>
  );
}
