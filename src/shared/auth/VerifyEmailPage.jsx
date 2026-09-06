import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  Loader2,
  Mail,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { api, apiError } from "@/shared/lib/api";
import { useAuth } from "@/shared/context/AuthContext";
import AuthLayout from "./AuthLayout";

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Initialize from search params
  useEffect(() => {
    const paramEmail = searchParams.get("email") || user?.email || "";
    const paramToken = searchParams.get("token") || searchParams.get("verification_token") || "";
    const paramCode = searchParams.get("code") || "";

    if (paramEmail) setEmail(paramEmail);
    if (paramCode) setCode(paramCode);

    // If both email and token/code exist, auto-trigger verification
    if (paramEmail && (paramToken || paramCode)) {
      autoVerify(paramEmail, paramToken, paramCode);
    }
  }, [searchParams, user]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const autoVerify = async (cleanEmail, token, otpCode) => {
    setVerifying(true);
    try {
      const { data } = await api.post("/auth/verify-email", {
        email: cleanEmail,
        token: token || undefined,
        code: otpCode || undefined,
      });
      setVerified(true);
      toast.success(data.message || "Email verified successfully!");
      if (refreshUser) refreshUser();
    } catch (err) {
      toast.error(apiError(err, "Verification link invalid or expired."));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualVerify = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = code.trim();

    if (!cleanEmail) {
      toast.error("Please enter your email address.");
      return;
    }
    if (!cleanCode) {
      toast.error("Please enter the 6-digit verification code.");
      return;
    }

    setVerifying(true);
    try {
      const { data } = await api.post("/auth/verify-email", {
        email: cleanEmail,
        code: cleanCode,
      });
      setVerified(true);
      toast.success(data.message || "Email verified successfully!");
      if (refreshUser) refreshUser();
    } catch (err) {
      toast.error(apiError(err, "Invalid or expired verification code."));
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      toast.error("Please provide your email address to resend code.");
      return;
    }

    setResending(true);
    try {
      const { data } = await api.post("/auth/resend-verification", {
        email: cleanEmail,
      });
      toast.success(data.message || "Verification email resent!");
      setCooldown(60);
    } catch (err) {
      toast.error(apiError(err, "Failed to resend verification email."));
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title={verified ? "Email Verified" : "Verify Your Email"}
      subtitle={
        verified
          ? "Your EasyX account is fully verified and secure."
          : "Enter the 6-digit code sent to your registered email address."
      }
      footer={
        <div className="text-center text-xs text-white/50">
          Need help?{" "}
          <Link to="/support" className="text-purple-400 hover:text-purple-300 underline">
            Contact EasyX Support
          </Link>
        </div>
      }
    >
      {verified ? (
        <div className="space-y-6 text-center py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <CheckCircle2 className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white">Verification Complete</h3>
            <p className="text-xs text-white/70">
              Your email address <span className="font-medium text-white">{email}</span> has been confirmed. You now have full access to all EasyX high-yield staking pools.
            </p>
          </div>

          <Button
            onClick={() => navigate("/dashboard")}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <form onSubmit={handleManualVerify} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-white/80">Account Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/30"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-white/80">6-Digit Verification Code</Label>
            <div className="relative">
              <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <Input
                id="code"
                type="text"
                placeholder="123456"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-white/30 text-center tracking-[0.3em] font-mono text-base font-bold"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={verifying}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-purple-600/20 flex items-center justify-center gap-2"
          >
            {verifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Confirm Verification</span>
            )}
          </Button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5 disabled:opacity-40 transition"
            >
              <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
              <span>
                {cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : resending
                  ? "Sending..."
                  : "Didn't receive the email? Resend"}
              </span>
            </button>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}
