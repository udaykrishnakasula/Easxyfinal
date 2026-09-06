import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppToaster from "@/shared/components/AppToaster";
import Hero from "@/components/landing/Hero";
import Sections from "@/components/landing/Sections";
import { AuthProvider } from "@/shared/context/AuthContext";
import { BrandingProvider } from "@/shared/context/BrandingContext";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import ErrorBoundary from "@/shared/analytics/ErrorBoundary";
import AnalyticsProvider from "@/shared/analytics/AnalyticsProvider";
import LoginPage from "@/shared/auth/LoginPage";
import RegisterPage from "@/shared/auth/RegisterPage";
import ForgotPasswordPage from "@/shared/auth/ForgotPasswordPage";
import VerifyEmailPage from "@/shared/auth/VerifyEmailPage";
import UserRoutes from "@/user/routes/UserRoutes";
import AdminRoutes from "@/admin/routes/AdminRoutes";
import GlobalKeyboardShortcuts from "@/shared/components/GlobalKeyboardShortcuts";
import NetworkStatusBanner from "@/shared/components/NetworkStatusBanner";
import { useAuth } from "@/shared/context/AuthContext";

const Landing = () => (
  <main data-testid="landing-page">
    <Hero />
    <Sections />
  </main>
);

function RootRoute() {
  const { user, loading, authState, isAdmin, refresh } = useAuth();
  if (loading || authState === "INITIALIZING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b14]">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }
  // If session verification failed due to network error but user has a token, do not bounce to landing page
  if (authState === "AUTH_ERROR" && typeof localStorage !== "undefined" && localStorage.getItem("easyx_token")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b14] px-4">
        <div className="max-w-md w-full rounded-2xl border border-white/10 bg-[#161424] p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <div className="h-6 w-6 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">Reconnecting to EasyX...</h2>
          <p className="mt-2 text-sm text-white/60">
            A temporary connection delay occurred while loading your session. Click below to reconnect.
          </p>
          <button
            onClick={() => refresh()}
            className="mt-6 w-full rounded-xl bg-[#9680dc] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#856ecf] transition shadow-lg shadow-purple-900/30"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }
  return <Landing />;
}

function WildcardRoute() {
  const { user, loading, authState, isAdmin } = useAuth();
  if (loading || authState === "INITIALIZING") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b14]">
        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }
  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
  }
  return <Navigate to="/" replace />;
}

function App() {
  return (
    <div className="App">
      <ErrorBoundary>
        <BrowserRouter>
          <AuthProvider>
            <BrandingProvider>
              <AnalyticsProvider>
                <Routes>
                {/* Public Landing & Authentication */}
                <Route path="/" element={<RootRoute />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/verify-email" element={<VerifyEmailPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ForgotPasswordPage />} />

                {/* Legacy /app paths backwards-compatibility redirect */}
                <Route path="/app" element={<Navigate to="/dashboard" replace />} />
                <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />

                {/* Admin Application Architecture (/admin/*) */}
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute adminOnly>
                      <AdminRoutes />
                    </ProtectedRoute>
                  }
                />

                {/* User Application Architecture (/dashboard, /investments, /wallet, etc.) */}
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <UserRoutes />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<WildcardRoute />} />
              </Routes>
              <GlobalKeyboardShortcuts />
              <NetworkStatusBanner />
              <AppToaster />
            </AnalyticsProvider>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
      </ErrorBoundary>
    </div>
  );
}

export default App;
