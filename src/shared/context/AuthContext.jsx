import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { clearToken, getToken, setToken } from "@/shared/lib/api";
import { authDiagnostics, AUTH_TRANSITION } from "@/shared/analytics/authDiagnostics";
import { getSupabaseClient, isSupabaseConfigured, subscribeToUserEvents } from "@/lib/supabaseClient";

const CACHED_USER_KEY = "easyx_user";

export const AUTH_STATE = {
  INITIALIZING: "INITIALIZING",
  AUTHENTICATED: "AUTHENTICATED",
  UNAUTHENTICATED: "UNAUTHENTICATED",
  AUTH_ERROR: "AUTH_ERROR",
};

export function getCachedUser() {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user) {
  if (typeof localStorage === "undefined") return;
  try {
    if (user) {
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {
    // Ignore storage quota errors
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Eagerly restore cached user if a token exists to eliminate initial flash or false unauthenticated state
  const [user, setUser] = useState(() => (getToken() ? getCachedUser() : null));
  const [authState, setAuthState] = useState(() =>
    getToken() ? AUTH_STATE.INITIALIZING : AUTH_STATE.UNAUTHENTICATED
  );

  const hydrate = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setCachedUser(null);
      setAuthState(AUTH_STATE.UNAUTHENTICATED);
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTH_INITIALIZING, { status: "no_token" });
      return;
    }

    authDiagnostics.logTransition(AUTH_TRANSITION.AUTH_INITIALIZING, {
      hasCachedUser: Boolean(getCachedUser()),
    });

    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      setCachedUser(data);
      setAuthState(AUTH_STATE.AUTHENTICATED);
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTHENTICATED, {
        userId: data.id,
        role: data.role,
      });
    } catch (error) {
      const status = error?.response?.status;

      if (status === 401) {
        // Genuine authentication expiration confirmed by server
        authDiagnostics.logTransition(AUTH_TRANSITION.SESSION_EXPIRED, { status: 401 });
        clearToken();
        setCachedUser(null);
        setUser(null);
        setAuthState(AUTH_STATE.UNAUTHENTICATED);
      } else {
        // Network disruption, server restart/502/503, timeout, or offline
        // CRITICAL: DO NOT CLEAR TOKEN OR LOG OUT THE USER. Keep session alive.
        authDiagnostics.logTransition(AUTH_TRANSITION.AUTH_ERROR, {
          status,
          message: error?.message || "Transient session verification failure",
          isOffline: typeof navigator !== "undefined" && !navigator.onLine,
        });

        const cached = getCachedUser();
        if (cached) {
          setUser(cached);
          // Retain authenticated usability using cached credentials
          setAuthState(AUTH_STATE.AUTH_ERROR);
        } else {
          setAuthState(AUTH_STATE.AUTH_ERROR);
        }
      }
    }
  }, []);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Revalidate session automatically when connectivity is restored or tab regains focus
  useEffect(() => {
    const handleOnline = () => {
      if (getToken()) {
        authDiagnostics.logTransition(AUTH_TRANSITION.SESSION_REFRESH, { reason: "connectivity_restored" });
        hydrate();
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && getToken()) {
        // Re-check session quietly without clearing state
        hydrate();
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hydrate]);

  // Realtime Supabase updates for user events (wallets, notifications, KYC)
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;
    const unsubscribe = subscribeToUserEvents(user.id, () => {
      // Quietly refresh user state without reloading page
      hydrate();
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [user?.id, hydrate]);

  const login = useCallback(async (email, password) => {
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setToken(data.access_token);
      setCachedUser(data.user);
      setUser(data.user);
      setAuthState(AUTH_STATE.AUTHENTICATED);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("easyx_recovery_session");
      }
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTHENTICATED, {
        userId: data.user?.id,
        role: data.user?.role,
      });
      return data.user;
    } catch (err) {
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTHENTICATION_FAILED, {
        reason: err?.response?.data?.message || err?.message || "Login failed",
      });
      throw err;
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      const { data } = await api.post("/auth/register", payload);
      setToken(data.access_token);
      setCachedUser(data.user);
      setUser(data.user);
      setAuthState(AUTH_STATE.AUTHENTICATED);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("easyx_recovery_session");
      }
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTHENTICATED, {
        userId: data.user?.id,
        role: data.user?.role,
      });
      return data.user;
    } catch (err) {
      authDiagnostics.logTransition(AUTH_TRANSITION.AUTHENTICATION_FAILED, {
        reason: err?.response?.data?.message || err?.message || "Registration failed",
      });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    authDiagnostics.logTransition(AUTH_TRANSITION.LOGOUT, { userId: user?.id });
    try {
      if (isSupabaseConfigured()) {
        const client = getSupabaseClient();
        if (client) {
          client.auth.signOut().catch(() => {});
        }
      }
      await api.post("/auth/logout");
    } catch {
      // Ignore network errors on explicit sign out
    } finally {
      clearToken();
      setCachedUser(null);
      setUser(null);
      setAuthState(AUTH_STATE.UNAUTHENTICATED);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("easyx_recovery_session");
      }
    }
  }, [user]);

  const loading = authState === AUTH_STATE.INITIALIZING;

  const value = useMemo(
    () => ({
      user,
      loading,
      authState,
      isAuthenticated: Boolean(user),
      isInitializing: authState === AUTH_STATE.INITIALIZING,
      isAuthError: authState === AUTH_STATE.AUTH_ERROR,
      login,
      register,
      logout,
      refresh: hydrate,
      isAdmin: user?.role === "admin",
    }),
    [user, loading, authState, login, register, logout, hydrate]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
