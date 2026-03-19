"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, FileText, Package, Users, UserCog, HardHat, Wrench, Trash2, RotateCcw } from "lucide-react";
import {
  listDeletedAssets,
  listAllEmployees,
  restoreAsset,
  restoreEmployee,
} from "@/lib/api/admin";
import type { AssetOutWithAssignee } from "@/lib/api/assets";
import type { EmployeeOut } from "@/lib/api/employees";

function AdminContent() {
  const [deletedAssets, setDeletedAssets] = useState<AssetOutWithAssignee[]>([]);
  const [deletedEmployees, setDeletedEmployees] = useState<EmployeeOut[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    setLoading(true);
    try {
      const [assets, employees] = await Promise.all([
        listDeletedAssets({ limit: 100 }),
        listAllEmployees({ limit: 100 }),
      ]);
      setDeletedAssets(assets.data.filter((a: any) => a.is_deleted));
      setDeletedEmployees(employees.data.filter((e: any) => e.is_deleted));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch();
  }, []);

  const handleRestoreAsset = async (id: number) => {
    try {
      await restoreAsset(id);
      fetch();
    } catch {}
  };

  const handleRestoreEmployee = async (id: number) => {
    try {
      await restoreEmployee(id);
      fetch();
    } catch {}
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Shield className="h-6 w-6" style={{ color: "#6C5CE7" }} />
        Administration
      </h1>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <Link href="/admin/audit-logs">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Journal d'audit
            </div>
            <div className="text-sm text-muted-foreground">
              Historique des modifications (RGPD)
            </div>
          </div>
        </Link>
        <Link href="/assets">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <Package className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Matériel
            </div>
            <div className="text-sm text-muted-foreground">
              Gestion du parc d'équipements
            </div>
          </div>
        </Link>
        <Link href="/employees">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <Users className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Employés
            </div>
            <div className="text-sm text-muted-foreground">
              Gestion des collaborateurs
            </div>
          </div>
        </Link>
        <Link href="/admin/users">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <UserCog className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Utilisateurs
            </div>
            <div className="text-sm text-muted-foreground">
              Comptes, rôles et permissions
            </div>
          </div>
        </Link>
        <Link href="/admin/epi-categories">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <HardHat className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Catégories EPI
            </div>
            <div className="text-sm text-muted-foreground">
              Types d'équipements de protection
            </div>
          </div>
        </Link>
        <Link href="/admin/maintenance-templates">
          <div className="rounded-2xl shadow-sm border-0 card-hover p-5 cursor-pointer">
            <div className="font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" style={{ color: "#6C5CE7" }} />
              Plans de maintenance
            </div>
            <div className="text-sm text-muted-foreground">
              Intervalles d'entretien par modèle
            </div>
          </div>
        </Link>
      </div>

      {/* Deleted assets recovery */}
      <div className="rounded-2xl shadow-sm border-0 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Matériel supprimé
          </div>
          <Badge variant="secondary">{deletedAssets.length}</Badge>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : deletedAssets.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun matériel supprimé</div>
        ) : (
          <div className="space-y-2">
            {deletedAssets.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-xl hover:bg-purple-50/50 p-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.name}</span>
                  <Badge variant="secondary">{a.category}</Badge>
                </div>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleRestoreAsset(a.id)}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restaurer
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deleted employees recovery */}
      <div className="rounded-2xl shadow-sm border-0 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-medium flex items-center gap-2">
            <Trash2 className="h-4 w-4 text-muted-foreground" />
            Employés supprimés
          </div>
          <Badge variant="secondary">{deletedEmployees.length}</Badge>
        </div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Chargement…</div>
        ) : deletedEmployees.length === 0 ? (
          <div className="text-sm text-muted-foreground">Aucun employé supprimé</div>
        ) : (
          <div className="space-y-2">
            {deletedEmployees.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl hover:bg-purple-50/50 p-2 text-sm">
                <span className="font-medium">{e.first_name} {e.last_name}</span>
                <Button size="sm" variant="outline" className="rounded-xl" onClick={() => handleRestoreEmployee(e.id)}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Restaurer
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN"]}>
        <AdminContent />
      </RequireRole>
    </RequireAuth>
  );
}
