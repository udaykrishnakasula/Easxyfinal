import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  ShieldCheck,
  User,
  MapPin,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Unlock,
  Save,
  HelpCircle,
} from "lucide-react";
import { EasyXModal, EasyXButton } from "@/design/EasyX";
import { useUpdateAdminKyc, useUnlockKyc } from "@/admin/adminApi";
import { apiError } from "@/shared/lib/api";

const ID_TYPES = [
  { value: "aadhaar", label: "Aadhaar Card (12 Digits)" },
  { value: "national_id", label: "National ID (Govt ID)" },
  { value: "passport", label: "Passport (6-9 Alphanumeric)" },
  { value: "driving_license", label: "Driving License" },
  { value: "other", label: "Other Official Govt ID" },
];

export default function AdminEditKycModal({ open, onClose, record, user, onSaved }) {
  const updateKyc = useUpdateAdminKyc();
  const unlockKyc = useUnlockKyc();

  const [name, setName] = useState("");
  const [idType, setIdType] = useState("aadhaar");
  const [idNumber, setIdNumber] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("approved");
  const [adminNote, setAdminNote] = useState("");

  const targetId = record?.id || record?.user_id || user?.id;

  useEffect(() => {
    if (open) {
      setName(user?.name || record?.user_name || "");
      setIdType(record?.id_type || "aadhaar");
      setIdNumber(record?.id_number || record?.id_number_masked || user?.id_number || "");
      setAddress(record?.permanent_address || record?.address || user?.permanent_address || user?.address || "");
      setStatus(record?.status || user?.kyc_status || "approved");
      setAdminNote(record?.admin_note || record?.reject_reason || "");
    }
  }, [open, record, user]);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (!targetId) {
      toast.error("No valid target user or KYC record selected.");
      return;
    }
    if (!name.trim()) {
      toast.error("User name cannot be empty.");
      return;
    }
    if (!address.trim()) {
      toast.error("Permanent residential address is required.");
      return;
    }

    try {
      await updateKyc.mutateAsync({
        id: targetId,
        name: name.trim(),
        id_type: idType,
        id_number: idNumber.trim(),
        permanent_address: address.trim(),
        status,
        admin_note: adminNote.trim(),
      });

      toast.success("KYC identity details updated successfully!");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Failed to update KYC details"));
    }
  };

  const handleUnlockForUser = async () => {
    if (!targetId) return;
    const note = adminNote.trim() || "Unlocked by administrator upon support ticket request to allow document resubmission.";
    try {
      await unlockKyc.mutateAsync({
        id: targetId,
        reason: note,
      });
      toast.success("KYC has been unlocked. User can now edit all details and resubmit documents.");
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      toast.error(apiError(err, "Failed to unlock KYC for user"));
    }
  };

  return (
    <EasyXModal
      open={open}
      onClose={onClose}
      title="Edit User KYC & Identity Details"
      description="Update verified government identity information, modify address, or unlock submission access for this user."
    >
      <form onSubmit={handleSave} className="space-y-4 text-sm" data-testid="admin-edit-kyc-modal-form">
        {/* User Snapshot Header */}
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-ex-muted block text-[11px]">Target Account</span>
            <span className="font-semibold text-white">{user?.name || record?.user_name || "User"}</span>
            <span className="text-ex-muted ml-1.5 font-mono">({user?.email || record?.user_email || "N/A"})</span>
          </div>
          <div className="text-right">
            <span className="text-ex-muted block text-[11px]">Current Status</span>
            <span
              className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
                (record?.status || user?.kyc_status) === "approved"
                  ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  : (record?.status || user?.kyc_status) === "pending"
                  ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  : "bg-rose-500/10 text-rose-300 border border-rose-500/20"
              }`}
            >
              {(record?.status || user?.kyc_status || "none").toUpperCase()}
            </span>
          </div>
        </div>

        {/* 1. Legal Full Name */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted mb-1 flex items-center gap-1.5">
            <User className="h-3.5 w-3.5 text-purple-400" /> Full Legal Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Official government ID name"
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-sm text-ex-text focus:border-purple-400 focus:outline-none"
            data-testid="admin-edit-kyc-name"
            required
          />
        </div>

        {/* 2. Document Type & ID Number */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1 flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5 text-purple-400" /> ID Document Type
            </label>
            <select
              value={idType}
              onChange={(e) => setIdType(e.target.value)}
              className="w-full rounded-ex-ctrl bg-[#181824] border border-white/10 px-3 py-2 text-sm text-ex-text focus:border-purple-400 focus:outline-none"
              data-testid="admin-edit-kyc-id-type"
            >
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value} className="bg-[#181824] text-white">
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ex-muted mb-1 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-purple-400" /> ID Document Number
            </label>
            <input
              type="text"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="e.g. 1234 5678 9012 or Passport #"
              className="w-full font-mono rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-sm text-emerald-400 focus:border-purple-400 focus:outline-none"
              data-testid="admin-edit-kyc-id-number"
              required
            />
          </div>
        </div>

        {/* 3. Permanent Residential Address */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted mb-1 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-purple-400" /> Permanent Residential Address
          </label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Complete street address, apartment/suite, city, state/province, postal code, country"
            rows={3}
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 p-2.5 text-xs text-ex-text focus:border-purple-400 focus:outline-none"
            data-testid="admin-edit-kyc-address"
            required
          />
        </div>

        {/* 4. Verification Status */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted mb-1 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> Target KYC Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full rounded-ex-ctrl bg-[#181824] border border-white/10 px-3 py-2 text-sm text-ex-text focus:border-purple-400 focus:outline-none"
            data-testid="admin-edit-kyc-status"
          >
            <option value="approved" className="bg-[#181824] text-emerald-400 font-medium">
              Approved (Verified & Withdrawals Unlocked)
            </option>
            <option value="pending" className="bg-[#181824] text-amber-400">
              Pending (Queued for Review)
            </option>
            <option value="rejected" className="bg-[#181824] text-rose-400">
              Rejected / Resubmission Required (User Can Edit)
            </option>
            <option value="none" className="bg-[#181824] text-gray-400">
              None / Unsubmitted Reset
            </option>
          </select>
        </div>

        {/* 5. Admin Note / Audit Reason */}
        <div>
          <label className="block text-xs font-semibold text-ex-muted mb-1">
            Admin Note / Reason (Logged to Audit Trail & Notified to User)
          </label>
          <input
            type="text"
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="e.g. Updated permanent address as requested in Support Ticket #1042"
            className="w-full rounded-ex-ctrl bg-white/5 border border-white/10 px-3 py-2 text-xs text-ex-text placeholder:text-ex-muted/50 focus:border-purple-400 focus:outline-none"
            data-testid="admin-edit-kyc-note"
          />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleUnlockForUser}
            disabled={unlockKyc.isPending}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-ex-ctrl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
            data-testid="admin-edit-kyc-unlock-btn"
          >
            <Unlock className="h-3.5 w-3.5" />
            Unlock for User Resubmission
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-ex-ctrl text-xs font-semibold text-ex-muted hover:text-white transition"
            >
              Cancel
            </button>
            <EasyXButton
              type="submit"
              loading={updateKyc.isPending}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 px-4"
              data-testid="admin-edit-kyc-save-btn"
            >
              <Save className="h-3.5 w-3.5 mr-1" /> Save KYC Details
            </EasyXButton>
          </div>
        </div>
      </form>
    </EasyXModal>
  );
}
