"use client";

import type { ReactNode } from "react";
import { Package, LogOut } from "lucide-react";
import { RequireAuth } from "@/components/app/RequireAuth";
import { useAuth } from "@/lib/auth/auth-context";

function EmployeeHeader() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-gradient-to-r from-[#6C5CE7] to-[#5A4BD1] text-white px-4 py-4 shadow-lg">
      <div className="mx-auto max-w-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-tight">GestMat</h1>
            <p className="text-xs text-white/70">Libre-service employé</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-xs text-white/70 hidden sm:inline">
              {user.full_name || user.email}
            </span>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-dvh bg-gradient-to-br from-[#6C5CE7]/10 via-white to-[#6C5CE7]/5">
        <EmployeeHeader />
        <main className="mx-auto max-w-lg px-4 py-6">{children}</main>
      </div>
    </RequireAuth>
  );
}
