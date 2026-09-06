import React, { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  Save,
  Lock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/shared/context/AuthContext";
import { PageHeading, EasyXCard, EasyXButton } from "@/design/EasyX";
import {
  updateUserProfile,
  changeUserPassword,
} from "@/user/api";
import { notifySuccess, notifyError, notifySettingsUpdated } from "@/shared/lib/toastFeedback";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();

  // Profile Information State
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone || "");
  }, [user]);

  // Security / Password State
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const isKycApproved = user?.kyc_status === "approved";
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

  // Handler: Save Profile Details
  const handleSaveProfile = async (e) => {
    e?.preventDefault();
    if (!isKycApproved && !name.trim()) {
      notifyError("Name is required", "Please enter your full name.");
      return;
    }

    setSavingProfile(true);
    try {
      await updateUserProfile({
        name: isKycApproved ? undefined : name.trim(),
        phone: phone.trim(),
      });
      await refresh?.();
      notifySettingsUpdated("Profile details");
    } catch (err) {
      notifyError(
        "Could not update profile",
        err?.response?.data?.detail || "Please try again later."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Handler: Change Password
  const handleChangePassword = async (e) => {
    e?.preventDefault();
    if (!currentPassword) {
      notifyError("Current password required", "Please enter your current password.");
      return;
    }
    if (newPassword.length < 8) {
      notifyError("Password too short", "New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      notifyError("Passwords do not match", "Please ensure your new password matches the confirmation.");
      return;
    }
    if (currentPassword === newPassword) {
      notifyError("Password unchanged", "New password must be different from your current password.");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await changeUserPassword({
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      notifySuccess(
        "Password updated successfully",
        res?.message || "Your old password has been deleted. Use your new password to sign in next time."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err) {
      notifyError(
        "Could not update password",
        err?.response?.data?.detail || "Please check your current password and try again."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const hasProfileChanges =
    (!isKycApproved && name !== (user?.name || "")) || phone !== (user?.phone || "");

  return (
    <div data-testid="profile-page" className="max-w-4xl mx-auto space-y-6">
      <PageHeading
        title="Profile & Settings"
        subtitle="Manage your identity and security credentials."
        icon={User}
      />

      {/* 1. Profile Identity Header Card */}
      <EasyXCard className="relative overflow-hidden p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-ex-lav-400/30 to-ex-lav-600/30 border border-white/10 text-ex-lav-200 text-xl font-bold font-mono tracking-wider shadow-inner">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {user?.name || "Verified Investor"}
                </h2>
                {isKycApproved ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                    <ShieldCheck className="h-3 w-3" /> KYC Verified
                  </span>
                ) : (
                  <button
                    onClick={() => navigate("/kyc")}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 transition-colors cursor-pointer"
                  >
                    <ShieldAlert className="h-3 w-3" /> KYC Pending • Complete Now →
                  </button>
                )}
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/5 text-ex-muted border border-white/10 capitalize">
                  {user?.kyc_tier ? `${user.kyc_tier} Tier` : "Standard Tier"}
                </span>
              </div>

              <div className="flex items-center gap-4 mt-2 text-xs text-ex-muted flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-ex-muted/70" />
                  {user?.email || "—"}
                </span>
                {user?.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-ex-muted/70" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <EasyXButton
              variant="ghost"
              className="h-9 px-3 text-xs border border-white/10 hover:bg-white/10 flex items-center gap-1.5 text-ex-muted hover:text-white"
              onClick={() => navigate("/kyc")}
            >
              <span>Verification Center</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </EasyXButton>
          </div>
        </div>
      </EasyXCard>

      {/* 2. Personal Information Card */}
      <EasyXCard className="p-6">
        <div className="flex items-center justify-between border-b border-white/8 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-ex-lav-400/20 text-ex-lav-300">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Personal Information</h2>
              <p className="text-xs text-ex-muted">
                {isKycApproved
                  ? "Your legal identity is secured and tied to your verified account."
                  : "Update your contact details and display preferences."}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Legal Full Name */}
            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Legal Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isKycApproved}
                  placeholder="Your Full Name"
                  className={`w-full rounded-xl pl-10 pr-4 py-2.5 text-sm transition-colors ${
                    isKycApproved
                      ? "bg-white/[0.02] border border-white/5 text-white/80 cursor-not-allowed"
                      : "bg-white/5 border border-white/10 text-white placeholder:text-white/30 focus:border-ex-lav-400 focus:outline-none"
                  }`}
                  data-testid="profile-name-input"
                />
              </div>
              <span className="text-[11px] text-ex-muted/60 mt-1 block">
                {isKycApproved
                  ? "Locked to verified government identity compliance."
                  : "Enter your official name matching your ID."}
              </span>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Primary Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
                <input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="w-full rounded-xl bg-white/[0.02] border border-white/5 pl-10 pr-4 py-2.5 text-sm text-ex-muted/80 cursor-not-allowed"
                />
              </div>
              <span className="text-[11px] text-ex-muted/60 mt-1 block">
                Account login identifier and primary security mailbox.
              </span>
            </div>
          </div>

          {/* Contact Phone */}
          <div className="max-w-md">
            <label className="block text-xs font-semibold text-ex-muted mb-1.5">
              Contact Phone Number
            </label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-ex-lav-400 focus:outline-none transition-colors"
                data-testid="profile-phone-input"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-white/5">
            <EasyXButton
              type="submit"
              variant="primary"
              className="h-9 px-5 text-xs font-semibold flex items-center gap-2"
              disabled={savingProfile || !hasProfileChanges}
              data-testid="save-profile-btn"
            >
              <Save className="h-3.5 w-3.5" />
              {savingProfile ? "Saving..." : "Save Changes"}
            </EasyXButton>
          </div>
        </form>
      </EasyXCard>

      {/* 3. Password & Security Card */}
      <EasyXCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Password & Security</h2>
              <p className="text-xs text-ex-muted">
                {showPasswordForm
                  ? "Enter your current password to set a new secure password."
                  : "Password is active and protected by encrypted hash authentication."}
              </p>
            </div>
          </div>

          <EasyXButton
            variant="ghost"
            className="h-8 px-3 text-xs border border-white/10 hover:bg-white/10 flex items-center gap-1.5"
            onClick={() => {
              setShowPasswordForm(!showPasswordForm);
              setCurrentPassword("");
              setNewPassword("");
              setConfirmPassword("");
            }}
          >
            {showPasswordForm ? (
              <>
                <span>Cancel</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Change Password</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
          </EasyXButton>
        </div>

        {showPasswordForm && (
          <form onSubmit={handleChangePassword} className="mt-5 pt-5 border-t border-white/8 space-y-4">
            <div className="p-3 rounded-xl bg-ex-lav-500/10 border border-ex-lav-400/20 text-xs text-ex-lav-200">
              Enter your current password to update to a new secure password. Once updated, your old password is deleted and permanently revoked.
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                Current Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-ex-lav-400 focus:outline-none transition-colors"
                  data-testid="current-password-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ex-muted hover:text-white p-1 rounded transition-colors"
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-ex-lav-400 focus:outline-none transition-colors"
                    data-testid="new-password-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ex-muted hover:text-white p-1 rounded transition-colors"
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ex-muted mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ex-muted" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl bg-white/5 border border-white/10 pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-ex-lav-400 focus:outline-none transition-colors"
                    data-testid="confirm-password-input"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ex-muted hover:text-white p-1 rounded transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <EasyXButton
                type="submit"
                variant="accent"
                className="h-9 px-5 text-xs font-semibold flex items-center gap-2"
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                data-testid="change-password-btn"
              >
                <KeyRound className="h-3.5 w-3.5" />
                {changingPassword ? "Updating Password..." : "Confirm Password Update"}
              </EasyXButton>
            </div>
          </form>
        )}
      </EasyXCard>
    </div>
  );
}
