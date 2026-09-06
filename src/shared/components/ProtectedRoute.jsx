import React, { useEffect, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/shared/context/AuthContext";

function FullScreenLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0b14]">
      <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
    </div>
  );
}

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, authState, isAdmin, refresh } = useAuth();
  const location = useLocation();
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!loading && user && adminOnly && !isAdmin && !warnedRef.current) {
      warnedRef.current = true;
      toast.error("403 Forbidden: Admin privileges required. Redirected to User Dashboard.");
    }
  }, [loading, user, adminOnly, isAdmin]);

  if (loading || authState === "INITIALIZING") {
    return <FullScreenLoader />;
  }

  // If session verification failed due to network error but user has a token, do not bounce to login page
  if (authState === "AUTH_ERROR" && !user && typeof localStorage !== "undefined" && localStorage.getItem("easyx_token")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b14] px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#161424] p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <div className="h-6 w-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">Connecting to EasyX...</h2>
          <p className="mt-2 text-sm text-white/60">
            Unable to verify your session due to a network delay. Your session is safe.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
            <button
              onClick={() => refresh()}
              className="flex-1 rounded-xl bg-[#9680dc] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#856ecf] transition shadow-lg shadow-purple-900/30"
            >
              Retry Connection
            </button>
            <button
              onClick={() => {
                if (typeof localStorage !== "undefined") {
                  localStorage.removeItem("easyx_token");
                  localStorage.removeItem("easyx_user");
                }
                window.location.assign("/login");
              }}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white transition"
            >
              Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user || authState === "UNAUTHENTICATED") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default ProtectedRoute;
