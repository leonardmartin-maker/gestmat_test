"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/auth-context";
import { ChangePasswordDialog } from "@/components/app/ChangePasswordDialog";

function NavItem({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      onClick={onClick}
      className={
        "block rounded-md px-3 py-2 text-sm transition-colors " +
        (active ? "bg-muted font-medium" : "hover:bg-muted")
      }
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { loading, user, role, logout, isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    router.push("/login");
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen md:grid md:grid-cols-[260px_1fr]">
      {/* Mobile header */}
      <div className="flex items-center justify-between border-b p-3 md:hidden">
        <div className="font-semibold">Gestion Matériel</div>
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md p-2 hover:bg-muted"
          aria-label="Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {menuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 md:hidden" onClick={closeMenu}>
          <aside
            className="h-full w-64 border-r bg-background p-4 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-semibold">Gestion Matériel</div>
            <SidebarContent isAdmin={isAdmin} loading={loading} user={user} role={role} onNav={closeMenu} />
            <Button variant="outline" size="sm" className="w-full" onClick={onLogout} disabled={loading || !user}>
              Logout
            </Button>
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:block border-r p-4 space-y-4">
        <div className="font-semibold">Gestion Matériel</div>
        <SidebarContent isAdmin={isAdmin} loading={loading} user={user} role={role} />
      </aside>

      <main className="p-4 md:p-6">
        <div className="mb-6 hidden md:flex items-center justify-end">
          <Button variant="outline" onClick={onLogout} disabled={loading || !user}>
            Logout
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
}

function SidebarContent({
  isAdmin,
  loading,
  user,
  role,
  onNav,
}: {
  isAdmin: boolean;
  loading: boolean;
  user: any;
  role: string | null;
  onNav?: () => void;
}) {
  return (
    <>
      <nav className="space-y-1">
        <NavItem href="/dashboard" label="Dashboard" onClick={onNav} />
        <NavItem href="/assets" label="Matériel" onClick={onNav} />
        <NavItem href="/scan" label="Scan" onClick={onNav} />
        <NavItem href="/employees" label="Employés" onClick={onNav} />
        <NavItem href="/maintenance" label="Maintenance" onClick={onNav} />
        {isAdmin && <NavItem href="/admin" label="Admin" onClick={onNav} />}
      </nav>

      <div className="pt-2 text-xs text-muted-foreground">
        {loading ? (
          "Chargement…"
        ) : user ? (
          <>
            <div className="truncate">{user.email}</div>
            <div className="mt-1 inline-flex items-center rounded-md border px-2 py-1">
              {role}
            </div>
            <div className="mt-2">
              <ChangePasswordDialog />
            </div>
          </>
        ) : (
          "Non connecté"
        )}
      </div>
    </>
  );
}
