"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import type { Role } from "@/lib/api/me";

export function RequireRole({
  allow,
  children,
  redirectTo = "/dashboard",
}: {
  allow: Role[];
  children: React.ReactNode;
  redirectTo?: string;
}) {
  const { loading, isAuthenticated, role } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) return; // RequireAuth gère le redirect login
    if (!role || !allow.includes(role)) {
      router.replace(redirectTo);
    }
  }, [loading, isAuthenticated, role, allow, router, redirectTo]);

  if (loading) return null;
  if (!isAuthenticated) return null;
  if (!role || !allow.includes(role)) return null;

  return <>{children}</>;
}