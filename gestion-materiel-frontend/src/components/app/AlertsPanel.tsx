"use client";

import type { AssetOutWithAssignee } from "@/lib/api/assets";
import type { EventOut } from "@/lib/api/events";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/app/StatusBadge";

function line(label: string, value: string) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

export function AlertsPanel({
  maintenance,
  retired,
  missing,
  maintenanceAged,
  assignedWithoutEmployee,
  onOpenAsset,
}: {
  maintenance: AssetOutWithAssignee[];
  retired: AssetOutWithAssignee[];
  missing: AssetOutWithAssignee[];
  maintenanceAged: { asset: AssetOutWithAssignee; enteredAt: string | null; days: number | null }[];
  assignedWithoutEmployee: EventOut[];
  onOpenAsset: (id: number) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alertes ops</CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Résumé */}
        <div className="space-y-2">
          {line("Maintenance", String(maintenance.length))}
          {line("Retirés", String(retired.length))}
          {line("Données manquantes", String(missing.length))}
        </div>

        {/* Maintenance 오래 */}
        <div className="space-y-2">
          <div className="text-sm font-medium">⚠️ Maintenance &gt; X jours</div>

          {maintenanceAged.length === 0 ? (
            <div className="text-xs text-muted-foreground">Rien à signaler.</div>
          ) : (
            <div className="space-y-2">
              {maintenanceAged.slice(0, 6).map((x) => (
                <button
                  key={x.asset.id}
                  type="button"
                  className="w-full text-left rounded-md border p-2 hover:bg-muted"
                  onClick={() => onOpenAsset(x.asset.id)}
                  title="Ouvrir le matériel"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{x.asset.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {x.asset.category} • {x.asset.ref ?? "ref —"} • {x.asset.serial_number ?? "série —"}
                      </div>
                    </div>
                    <div className="text-xs font-medium whitespace-nowrap">
                      {x.days ?? "?"} j
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ASSIGNED sans employee_id */}
        <div className="space-y-2">
          <div className="text-sm font-medium">🚩 Attribution sans employé</div>

          {assignedWithoutEmployee.length === 0 ? (
            <div className="text-xs text-muted-foreground">Aucun cas détecté.</div>
          ) : (
            <div className="space-y-2">
              {assignedWithoutEmployee.slice(0, 6).map((e) => (
                <button
                  key={e.id}
                  type="button"
                  className="w-full text-left rounded-md border p-2 hover:bg-muted"
                  onClick={() => onOpenAsset(e.asset_id)}
                  title="Ouvrir le matériel"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">Asset #{e.asset_id}</div>
                      <div className="text-xs text-muted-foreground">
                        event: {e.event_type} • {new Date(e.occurred_at).toLocaleString("fr-CH")}
                      </div>
                    </div>
                    <div className="text-xs text-red-600 font-medium">employee_id manquant</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Missing data */}
        <div className="space-y-2">
          <div className="text-sm font-medium">🧾 Données manquantes</div>

          {missing.length === 0 ? (
            <div className="text-xs text-muted-foreground">Tout est clean.</div>
          ) : (
            <div className="space-y-2">
              {missing.slice(0, 6).map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="w-full text-left rounded-md border p-2 hover:bg-muted"
                  onClick={() => onOpenAsset(a.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {a.category} • {a.ref ? "ref ok" : "ref —"} • {a.serial_number ? "série ok" : "série —"} •{" "}
                        {a.category === "VEHICLE" ? (a.plate ? "plaque ok" : "plaque —") : (a.epi_type ? "epi ok" : "epi —")}
                      </div>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button variant="outline" size="sm" onClick={() => { /* option: navigate vers /admin/audit-logs */ }}>
          Voir plus (bientôt)
        </Button>
      </CardContent>
    </Card>
  );
}