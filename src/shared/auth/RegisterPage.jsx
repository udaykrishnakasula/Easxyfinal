import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, AlertTriangle, Eye, EyeOff, Check, X, ShieldCheck } from "lucide-react";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { useAuth } from "@/shared/context/AuthContext";
import { apiError } from "@/shared/lib/api";
import { usePublicMaintenance } from "@/admin/adminApi";
import AuthLayout from "./AuthLayout";
import { REGISTER } from "@/constants/testIds/auth";

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email"),
    phone: z
      .string()
      .superRefine((val, ctx) => {
        const trimmed = (val || "").trim();
        if (!trimmed || trimmed.length < 10) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid 10-digit mobile number.",
          });
          return;
        }
        if (trimmed.length > 10 || !/^\d+$/.test(trimmed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid 10-digit mobile number.",
          });
          return;
        }
        if (!/^[6-9]/.test(trimmed)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid Indian mobile number.",
          });
          return;
        }
      }),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters long")
      .regex(/\d/, "Password must contain at least one number (0-9)")
      .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character (!@#$%^&*...)")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter"),
    passwordConfirm: z.string(),
    referral_code: z.string().optional(),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  });

export default function RegisterPage() {
  const { register: registerUser, user, loading } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const { data: maintenance } = usePublicMaintenance();

  React.useEffect(() => {
    if (!loading && user) {
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const isRegistrationBlocked =
    Boolean(maintenance?.is_enabled) || maintenance?.features?.registration === false;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
      passwordConfirm: "",
      referral_code: params.get("ref") || "",
    },
  });

  const passwordValue = watch("password") || "";
  const hasMinLength = passwordValue.length >= 8;
  const hasNumber = /\d/.test(passwordValue);
  const hasSpecial = /[^A-Za-z0-9]/.test(passwordValue);
  const hasMixedCase = /[a-z]/.test(passwordValue) && /[A-Z]/.test(passwordValue);

  const strengthScore = [hasMinLength, hasNumber, hasSpecial, hasMixedCase].filter(Boolean).length;

  const getStrengthMeta = () => {
    if (passwordValue.length === 0) return { label: "None", color: "bg-white/10", textColor: "text-white/40" };
    if (strengthScore <= 1) return { label: "Weak", color: "bg-rose-500", textColor: "text-rose-400" };
    if (strengthScore <= 2) return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-400" };
    if (strengthScore === 3) return { label: "Good", color: "bg-blue-400", textColor: "text-blue-300" };
    return { label: "Strong & Secure", color: "bg-emerald-500", textColor: "text-emerald-400" };
  };

  const onSubmit = async (values) => {
    if (isRegistrationBlocked) {
      toast.error(
        maintenance?.message || "Registration is currently disabled for system maintenance."
      );
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      };
      if (values.referral_code) payload.referral_code = values.referral_code.trim();
      const user = await registerUser(payload);
      toast.success(`Welcome to EasyX, ${user.name}!`);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const errorMsg = apiError(err, "Unable to create account.");
      if (
        errorMsg.toLowerCase().includes("mobile number") ||
        errorMsg.toLowerCase().includes("phone")
      ) {
        setError("phone", {
          type: "server",
          message: "An account with this mobile number already exists.",
        });
      }
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start investing with EasyX in minutes."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-white underline underline-offset-4" data-testid={REGISTER.loginLink}>
            Sign in
          </Link>
        </>
      }
    >
      {isRegistrationBlocked && (
        <div
          className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200 flex items-start gap-2.5"
          data-testid="registration-disabled-notice"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300">Registration Temporarily Paused</div>
            <div className="text-amber-200/80 mt-0.5">
              {maintenance?.message || "New account creation is temporarily disabled during scheduled platform maintenance."}
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="register-form">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-white/80">Full name</Label>
          <Input id="name" placeholder="Jane Doe"
            disabled={isRegistrationBlocked}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 disabled:opacity-50"
            data-testid={REGISTER.nameInput} {...register("name")} />
          {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
            disabled={isRegistrationBlocked}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 disabled:opacity-50"
            data-testid={REGISTER.emailInput} {...register("email")} />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="text-white/80">Phone</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            placeholder="+91XXXXXXXXXX"
            maxLength={10}
            disabled={isRegistrationBlocked}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 disabled:opacity-50"
            data-testid="register-phone-input"
            {...register("phone")}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, "").slice(0, 10);
              setValue("phone", cleaned, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            }}
            onPaste={(e) => {
              e.preventDefault();
              const pasted = e.clipboardData.getData("text") || "";
              let digits = pasted.replace(/\D/g, "");
              if (digits.length === 12 && digits.startsWith("91")) {
                digits = digits.slice(2);
              }
              digits = digits.slice(0, 10);
              setValue("phone", digits, { shouldValidate: true, shouldDirty: true, shouldTouch: true });
            }}
            onKeyDown={(e) => {
              if (
                e.key === "Backspace" ||
                e.key === "Delete" ||
                e.key === "Tab" ||
                e.key === "ArrowLeft" ||
                e.key === "ArrowRight" ||
                e.key === "ArrowUp" ||
                e.key === "ArrowDown" ||
                e.key === "Home" ||
                e.key === "End" ||
                e.key === "Enter" ||
                e.ctrlKey ||
                e.metaKey
              ) {
                return;
              }
              if (!/^\d$/.test(e.key)) {
                e.preventDefault();
              }
            }}
          />
          {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="At least 8 chars"
                disabled={isRegistrationBlocked}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 disabled:opacity-50 pr-10"
                data-testid={REGISTER.passwordInput}
                {...register("password")}
              />
              <button
                type="button"
                disabled={isRegistrationBlocked}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition focus:outline-none p-1 disabled:opacity-30"
                aria-label={showPassword ? "Hide password" : "Show password"}
                data-testid={REGISTER.passwordToggle}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passwordConfirm" className="text-white/80">Confirm</Label>
            <div className="relative">
              <Input
                id="passwordConfirm"
                type={showPasswordConfirm ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Repeat password"
                disabled={isRegistrationBlocked}
                className="bg-white/5 border-white/15 text-white placeholder:text-white/30 disabled:opacity-50 pr-10"
                data-testid={REGISTER.passwordConfirmInput}
                {...register("passwordConfirm")}
              />
              <button
                type="button"
                disabled={isRegistrationBlocked}
                onClick={() => setShowPasswordConfirm((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition focus:outline-none p-1 disabled:opacity-30"
                aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
                data-testid={REGISTER.passwordConfirmToggle}
              >
                {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.passwordConfirm && <p className="text-xs text-red-400">{errors.passwordConfirm.message}</p>}
          </div>
        </div>

        {/* Real-time Password Strength Meter & Security Requirements */}
        {passwordValue.length > 0 && (
          <div
            className="space-y-2 p-3 rounded-xl bg-white/[0.04] border border-white/10 text-xs"
            data-testid={REGISTER.passwordStrength}
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/60 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-white/50" />
                Password Security:
              </span>
              <span
                className={`font-semibold transition-colors duration-200 ${getStrengthMeta().textColor}`}
                data-testid={REGISTER.passwordStrengthLabel}
              >
                {getStrengthMeta().label}
              </span>
            </div>

            {/* 4-Bar Strength Progress */}
            <div className="grid grid-cols-4 gap-1.5 h-1.5">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`rounded-full transition-all duration-300 ${
                    strengthScore >= bar ? getStrengthMeta().color : "bg-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Criteria Checklist */}
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-2 pt-1 text-[11px]">
              <div
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  hasMinLength ? "text-emerald-400 font-medium" : "text-white/50"
                }`}
                data-testid={REGISTER.passwordRuleLength}
              >
                {hasMinLength ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center text-white/30 text-[10px]">•</span>
                )}
                <span>Min 8 characters</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  hasNumber ? "text-emerald-400 font-medium" : "text-white/50"
                }`}
                data-testid={REGISTER.passwordRuleNumber}
              >
                {hasNumber ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center text-white/30 text-[10px]">•</span>
                )}
                <span>At least 1 number (0-9)</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  hasSpecial ? "text-emerald-400 font-medium" : "text-white/50"
                }`}
                data-testid={REGISTER.passwordRuleSpecial}
              >
                {hasSpecial ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center text-white/30 text-[10px]">•</span>
                )}
                <span>Special char (!@#$%)</span>
              </div>

              <div
                className={`flex items-center gap-1.5 transition-colors duration-200 ${
                  hasMixedCase ? "text-emerald-400 font-medium" : "text-white/50"
                }`}
                data-testid={REGISTER.passwordRuleCase}
              >
                {hasMixedCase ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex items-center justify-center text-white/30 text-[10px]">•</span>
                )}
                <span>Upper & lower case</span>
              </div>
            </div>
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="referral_code" className="text-white/80">Referral code <span className="text-white/40">(optional)</span></Label>
          <Input id="referral_code" placeholder="e.g. AB12CD34"
            disabled={isRegistrationBlocked}
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 uppercase disabled:opacity-50"
            data-testid="register-referral-input" {...register("referral_code")} />
        </div>
        <Button type="submit" disabled={submitting || isRegistrationBlocked}
          className="w-full bg-white text-black hover:bg-white/90 rounded-full h-11 font-semibold disabled:opacity-50"
          data-testid={REGISTER.submitButton}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isRegistrationBlocked ? "Registration Unavailable" : "Create account"}
        </Button>
      </form>
    </AuthLayout>
  );
}
