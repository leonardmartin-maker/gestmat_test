"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthGuard } from "@/lib/auth/guard";
import { CurrentUserProvider } from "@/lib/auth/current-user";
import { AppShell } from "@/components/app/AppShell";
import { DemoBanner } from "@/components/app/DemoBanner";
import { useAuth } from "@/lib/auth/auth-context";

function EmployeeGuard({ children }: { children: React.ReactNode }) {
  const { isEmployee, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isEmployee) {
      router.replace("/e");
    }
  }, [loading, isEmployee, router]);

  if (loading || isEmployee) return null;
  return <>{children}</>;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <EmployeeGuard>
        <CurrentUserProvider>
          <DemoBanner />
          <AppShell>{children}</AppShell>
        </CurrentUserProvider>
      </EmployeeGuard>
    </AuthGuard>
  );
}