"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  Fuel,
  Search,
  AlertTriangle,
  Settings,
  ChevronsLeft,
  ChevronsRight,
  type LucideIcon,
} from "lucide-react";
import { PwaInstallButton } from "@/components/app/PwaInstallButton";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon; minRole?: "MANAGER" | "ADMIN" }[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Matériel", icon: Package },
  { href: "/scan", label: "Scan QR", icon: QrCode, minRole: "MANAGER" },
  { href: "/employees", label: "Employés", icon: Users, minRole: "MANAGER" },
  { href: "/maintenance", label: "Maintenance", icon: Wrench, minRole: "MANAGER" },
  { href: "/fuel-receipts", label: "Carburant", icon: Fuel, minRole: "MANAGER" },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle, minRole: "MANAGER" },
  { href: "/vehicle-lookup", label: "Recherche véhicule", icon: Search, minRole: "MANAGER" },
  { href: "/admin", label: "Administration", icon: Shield, minRole: "ADMIN" },
  { href: "/settings", label: "Parametres", icon: Settings, minRole: "ADMIN" },
];

/* ------------------------------------------------------------------ */
/*  Nav Item                                                           */
/* ------------------------------------------------------------------ */

function NavItem({
  href,
  label,
  icon: Icon,
  collapsed,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={
        "group relative flex items-center rounded-lg text-sm transition-all duration-200 " +
        (collapsed ? "justify-center px-2 py-2.5 " : "gap-3 px-3 py-2.5 ") +
        (active
          ? "bg-white/20 text-white font-medium shadow-sm"
          : "text-white/70 hover:bg-white/10 hover:text-white")
      }
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span>{label}</span>}

      {/* Tooltip on hover when collapsed */}
      {collapsed && (
        <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-lg">
          {label}
          <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
        </div>
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  App Shell                                                          */
/* ------------------------------------------------------------------ */

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, role, logout, isAdmin, canWrite } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem("sidebar-collapsed", String(!prev));
      return !prev;
    });
  };

  const onLogout = () => {
    logout();
    router.push("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div
      className="min-h-screen md:grid transition-all duration-300"
      style={{ gridTemplateColumns: collapsed ? "68px 1fr" : "260px 1fr" }}
    >
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
            <SidebarContent isAdmin={isAdmin} canWrite={canWrite} loading={loading} user={user} role={role} collapsed={false} onNav={closeMenu} />
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
        className={`hidden md:flex md:flex-col gap-4 transition-all duration-300 ${
          collapsed ? "p-3 items-center" : "p-5"
        }`}
        style={{ background: "linear-gradient(180deg, #6C5CE7 0%, #5A4BD1 100%)" }}
      >
        {/* Logo + collapse toggle */}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          <div className={`flex items-center gap-2 text-white ${collapsed ? "" : ""}`}>
            <Box className={collapsed ? "h-6 w-6" : "h-6 w-6"} />
            {!collapsed && <span className="font-bold text-xl">GestMat</span>}
          </div>
          {!collapsed && (
            <button
              onClick={toggleCollapsed}
              className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
              title="Réduire la sidebar"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={toggleCollapsed}
            className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/10 transition-all duration-200"
            title="Ouvrir la sidebar"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}

        <div className="h-px bg-white/15" />

        <SidebarContent isAdmin={isAdmin} canWrite={canWrite} loading={loading} user={user} role={role} collapsed={collapsed} />

        {/* Bottom section */}
        <div className="mt-auto space-y-3">
          <div className="h-px bg-white/15" />

          {!loading && user && !collapsed && (
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

          {/* Collapsed: show role badge as icon */}
          {!loading && user && collapsed && (
            <div className="flex justify-center">
              <span
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-white/15 border border-white/20 text-[10px] font-bold text-white/80"
                title={`${user.email} (${role})`}
              >
                {role === "ADMIN" ? "A" : role === "MANAGER" ? "M" : "E"}
              </span>
            </div>
          )}

          <button
            onClick={onLogout}
            disabled={loading || !user}
            title={collapsed ? "Déconnexion" : undefined}
            className={`group relative flex items-center w-full rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/10 transition-all duration-200 ${
              collapsed ? "justify-center px-2 py-2.5" : "gap-2 px-3 py-2.5"
            }`}
          >
            <LogOut className="h-4 w-4" />
            {!collapsed && "Déconnexion"}

            {collapsed && (
              <div className="absolute left-full ml-2 px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 z-50 shadow-lg">
                Déconnexion
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45" />
              </div>
            )}
          </button>
        </div>
      </aside>

      <main className="p-4 md:p-6 bg-[#F8F7FF] min-h-screen overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sidebar Content                                                    */
/* ------------------------------------------------------------------ */

function SidebarContent({
  isAdmin,
  canWrite,
  loading,
  user,
  role,
  collapsed,
  onNav,
}: {
  isAdmin: boolean;
  canWrite: boolean;
  loading: boolean;
  user: any;
  role: string | null;
  collapsed: boolean;
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
              collapsed={collapsed}
              onClick={onNav}
            />
          );
        })}
      </nav>
      {!collapsed && (
        <>
          <div className="h-px bg-white/15" />
          <PwaInstallButton />
        </>
      )}
    </div>
  );
}
