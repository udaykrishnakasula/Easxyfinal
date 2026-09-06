import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { apiError } from "@/lib/api";
import AuthLayout from "./AuthLayout";
import { LOGIN } from "@/constants/testIds/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const from = location.state?.from?.pathname || "/app/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === "admin" ? "/app/dashboard" : from, { replace: true });
    } catch (err) {
      toast.error(apiError(err, "Unable to sign in."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in"
      subtitle="Access your EasyX dashboard."
      footer={
        <>
          New to EasyX?{" "}
          <Link to="/register" className="text-white underline underline-offset-4" data-testid={LOGIN.registerLink}>
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" data-testid="login-form">
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/80">Email</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="you@example.com"
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
            data-testid={LOGIN.emailInput} {...register("email")} />
          {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-white/80">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-white/60 hover:text-white hover:underline"
              data-testid={LOGIN.forgotPasswordLink}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-white/5 border-white/15 text-white placeholder:text-white/30 pr-10"
              data-testid={LOGIN.passwordInput}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition focus:outline-none p-1"
              aria-label={showPassword ? "Hide password" : "Show password"}
              data-testid={LOGIN.passwordToggle}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
        </div>
        <Button type="submit" disabled={submitting}
          className="w-full bg-white text-black hover:bg-white/90 rounded-full h-11 font-semibold"
          data-testid={LOGIN.submitButton}>
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>
    </AuthLayout>
  );
}
