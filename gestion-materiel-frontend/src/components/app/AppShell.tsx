"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { ChangePasswordDialog } from "@/components/app/ChangePasswordDialog";
import {
  LayoutDashboard,
  Package,
  QrCode,
  Users,
  Wrench,
  Shield,
  Box,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { PwaInstallButton } from "@/components/app/PwaInstallButton";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; minRole?: "MANAGER" | "ADMIN" }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Matériel", icon: Package },
  { href: "/scan", label: "Scan QR", icon: QrCode, minRole: "MANAGER" },
  { href: "/employees", label: "Employés", icon: Users, minRole: "MANAGER" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, minRole: "MANAGER" },
  { href: "/admin", label: "Administration", icon: Shield, minRole: "ADMIN" },
];

function NavItem({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 " +
        (active
          ? "bg-white/20 text-white font-medium shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, role, logout, isAdmin, canWrite } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    router.push("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      {/* Mobile header */}
      <div className="flex items-center justify-between p-3 md:hidden" style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #5A4BD1 100%)" }}>
        <div className="flex items-center gap-2 text-white">
          <Box className="h-5 w-5" />
          <span className="font-bold text-lg">GestMat</span>
        </div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Menu"
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden" onClick={closeMenu}>
          <aside
            className="h-full w-64 p-5 flex flex-col gap-6"
            style={{ background: "linear-gradient(180deg, #6C5CE7 0%, #5A4BD1 100%)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-white">
              <Box className="h-5 w-5" />
              <span className="font-bold text-lg">GestMat</span>
            </div>
            <SidebarContent isAdmin={isAdmin} canWrite={canWrite} loading={loading} user={user} role={role} onNav={closeMenu} />
            <div className="mt-auto">
              <button
                onClick={onLogout}
                disabled={loading || !user}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col p-5 gap-6"
        style={{ background: "linear-gradient(180deg, #6C5CE7 0%, #5A4BD1 100%)" }}
      >
        <div className="flex items-center gap-2 text-white">
          <Box className="h-6 w-6" />
          <span className="font-bold text-xl">GestMat</span>
        </div>
        <div className="h-px bg-white/15" />
        <SidebarContent isAdmin={isAdmin} canWrite={canWrite} loading={loading} user={user} role={role} />
        <div className="mt-auto space-y-3">
          <div className="h-px bg-white/15" />
          {!loading && user && (
            <div className="space-y-2">
              <div className="text-xs text-white/50 truncate">{user.email}</div>
              <span className="inline-flex items-center rounded-md bg-white/15 border border-white/20 px-2 py-0.5 text-xs text-white/80">
                {role}
              </span>
              <div className="mt-1">
                <ChangePasswordDialog />
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            disabled={loading || !user}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2.5 text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200"
          >
            <LogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      <main className="p-4 md:p-6 bg-[#F8F7FF] min-h-screen">
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  isAdmin,
  canWrite,
  loading,
  user,
  role,
  onNav,
}: {
  isAdmin: boolean;
  canWrite: boolean;
  loading: boolean;
  user: any;
  role: string | null;
  onNav?: () => void;
}) {
  return (
    <div className="space-y-3">
      <nav className="space-y-1">
        {NAV_ITEMS.map((item) => {
          if (item.minRole === "ADMIN" && !isAdmin) return null;
          if (item.minRole === "MANAGER" && !canWrite) return null;
          return (
            <NavItem
              key={item.href}
              href={item.href}
              label={item.label}
              icon={item.icon}
              onClick={onNav}
            />
          );
        })}
      </nav>
      <div className="h-px bg-white/15" />
      <PwaInstallButton />
    </div>
  );
}
