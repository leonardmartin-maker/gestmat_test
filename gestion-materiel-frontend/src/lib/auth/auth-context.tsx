"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { tokenStorage } from "@/lib/auth/token";
import { getMe, type MeOut, type Role } from "@/lib/api/me";

type AuthState = {
  loading: boolean;
  token: string | null;
  user: MeOut | null;

  isAuthenticated: boolean;
  role: Role | null;

  loginWithToken: (token: string) => Promise<void>;
  logout: () => void;

  refreshMe: () => Promise<void>;

  isAdmin: boolean;
  isManager: boolean;
  hasRole: (roles: Role[]) => boolean;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<MeOut | null>(null);

  const isAuthenticated = !!token;
  const role: Role | null = user?.role ?? null;

  const logout = () => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  };

  const refreshMe = async () => {
    const t = tokenStorage.get();
    setToken(t);
    if (!t) {
      setUser(null);
      return;
    }
    const me = await getMe();
    setUser(me);
  };

  const loginWithToken = async (newToken: string) => {
    tokenStorage.set(newToken);
    setToken(newToken);
    const me = await getMe();
    setUser(me);
  };

  useEffect(() => {
    // bootstrap au refresh
    (async () => {
      try {
        await refreshMe();
      } catch {
        // token invalide / expiré
        logout();
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const hasRole = (roles: Role[]) => (role ? roles.includes(role) : false);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      token,
      user,
      isAuthenticated,
      role,
      loginWithToken,
      logout,
      refreshMe,
      isAdmin,
      isManager,
      hasRole,
    }),
    [loading, token, user, isAuthenticated, role, isAdmin, isManager]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}