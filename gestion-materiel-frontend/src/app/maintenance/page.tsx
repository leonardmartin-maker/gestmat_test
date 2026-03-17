"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMaintenanceOverview, type MaintenanceOverview } from "@/lib/api/maintenance";
import type { AssetOut } from "@/lib/api/assets";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function Section({
  title,
  tone,
  count,
  assets,
  dateKey,
  emptyText,
}: {
  title: string;
  tone: "red" | "amber" | "blue" | "gray";
  count: number;
  assets: AssetOut[];
  dateKey: keyof AssetOut;
  emptyText: string;
}) {
  const toneMap = {
    red: "border-red-200 bg-red-50/40",
    amber: "border-amber-200 bg-amber-50/40",
    blue: "border-blue-200 bg-blue-50/40",
    gray: "",
  };

  return (
    <Card className={`border ${toneMap[tone]}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary">{count}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <div className="text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="space-y-2">
            {assets.map((a) => (
              <Link key={a.id} href={`/assets/${a.id}`}>
                <div className="flex items-center justify-between rounded-md border bg-background p-3 hover:bg-muted transition-colors cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.category} {a.ref ? `• ${a.ref}` : ""}
                      {a.plate ? ` • ${a.plate}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(a as any)[dateKey] ?? "—"}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MaintenanceContent() {
  const [data, setData] = useState<MaintenanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMaintenanceOverview()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-muted-foreground">Chargement...</div>;
  if (!data) return <div className="text-red-600">Erreur de chargement</div>;

  const totalAlerts =
    data.overdue.length +
    data.upcoming_7d.length +
    data.in_maintenance.length +
    data.insurance_expiring.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Maintenance</h1>
          <p className="text-sm text-muted-foreground">
            {totalAlerts === 0
              ? "Aucune alerte — tout est en ordre"
              : `${totalAlerts} alerte(s) active(s)`}
          </p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Rafraîchir
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section
          title="En retard"
          tone="red"
          count={data.overdue.length}
          assets={data.overdue}
          dateKey="next_inspection_date"
          emptyText="Aucune inspection en retard"
        />

        <Section
          title="Prochains 7 jours"
          tone="amber"
          count={data.upcoming_7d.length}
          assets={data.upcoming_7d}
          dateKey="next_inspection_date"
          emptyText="Rien dans les 7 prochains jours"
        />

        <Section
          title="Prochains 30 jours"
          tone="blue"
          count={data.upcoming_30d.length}
          assets={data.upcoming_30d}
          dateKey="next_inspection_date"
          emptyText="Rien dans les 30 prochains jours"
        />

        <Section
          title="En maintenance"
          tone="amber"
          count={data.in_maintenance.length}
          assets={data.in_maintenance}
          dateKey="status"
          emptyText="Aucun matériel en maintenance"
        />

        <Section
          title="Assurance expirante (30j)"
          tone="red"
          count={data.insurance_expiring.length}
          assets={data.insurance_expiring}
          dateKey="insurance_date"
          emptyText="Aucune assurance expirant bientôt"
        />
      </div>
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <RequireAuth>
      <MaintenanceContent />
    </RequireAuth>
  );
}
