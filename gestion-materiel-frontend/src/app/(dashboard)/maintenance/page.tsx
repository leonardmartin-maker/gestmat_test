"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getMaintenanceOverview, type MaintenanceOverview } from "@/lib/api/maintenance";
import { getTasksOverview, type MaintenanceTaskOut, type MaintenanceTasksOverview } from "@/lib/api/maintenance-tasks";
import type { AssetOut } from "@/lib/api/assets";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, AlertCircle, Clock, Calendar, ShieldAlert, RefreshCw, CheckCircle, ChevronDown, ChevronUp, type LucideIcon } from "lucide-react";
import { CompleteMaintenanceDialog } from "@/components/app/CompleteMaintenanceDialog";

// ─── Legacy Section (assurance, inspection_date) ─────────────────

function Section({
  title,
  tone,
  count,
  assets,
  dateKey,
  emptyText,
  icon: Icon,
}: {
  title: string;
  tone: "red" | "amber" | "blue" | "gray";
  count: number;
  assets: AssetOut[];
  dateKey: keyof AssetOut;
  emptyText: string;
  icon?: LucideIcon;
}) {
  const toneMap = {
    red: "border-red-200 bg-red-50/40",
    amber: "border-amber-200 bg-amber-50/40",
    blue: "border-blue-200 bg-blue-50/40",
    gray: "",
  };
  const iconColorMap = { red: "text-red-500", amber: "text-amber-500", blue: "text-blue-500", gray: "text-muted-foreground" };
  const badgeColorMap = { red: "bg-red-100 text-red-700 hover:bg-red-100", amber: "bg-amber-100 text-amber-700 hover:bg-amber-100", blue: "bg-blue-100 text-blue-700 hover:bg-blue-100", gray: "" };

  return (
    <Card className={`rounded-2xl shadow-sm border-0 card-hover ${toneMap[tone]}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${iconColorMap[tone]}`} />}
            {title}
          </CardTitle>
          <Badge variant="secondary" className={badgeColorMap[tone]}>{count}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {assets.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {assets.map((a) => (
              <Link key={a.id} href={`/assets/${a.id}`}>
                <div className="flex items-center justify-between rounded-xl border p-4 hover:shadow-sm transition-all hover:bg-muted cursor-pointer">
                  <div>
                    <div className="text-sm font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.category} {a.ref ? `• ${a.ref}` : ""}{a.plate ? ` • ${a.plate}` : ""}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{(a as any)[dateKey] ?? "—"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Task Section ────────────────────────────────────────────────

function TaskSection({
  title,
  tone,
  tasks,
  emptyText,
  icon: Icon,
  onCompleted,
}: {
  title: string;
  tone: "red" | "amber" | "blue";
  tasks: MaintenanceTaskOut[];
  emptyText: string;
  icon?: LucideIcon;
  onCompleted: () => void;
}) {
  const toneMap = { red: "border-red-200 bg-red-50/40", amber: "border-amber-200 bg-amber-50/40", blue: "border-blue-200 bg-blue-50/40" };
  const iconColorMap = { red: "text-red-500", amber: "text-amber-500", blue: "text-blue-500" };
  const badgeColorMap = { red: "bg-red-100 text-red-700 hover:bg-red-100", amber: "bg-amber-100 text-amber-700 hover:bg-amber-100", blue: "bg-blue-100 text-blue-700 hover:bg-blue-100" };

  return (
    <Card className={`rounded-2xl shadow-sm border-0 card-hover ${toneMap[tone]}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {Icon && <Icon className={`h-4 w-4 ${iconColorMap[tone]}`} />}
            {title}
          </CardTitle>
          <Badge variant="secondary" className={badgeColorMap[tone]}>{tasks.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            {emptyText}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between rounded-xl border bg-white/60 p-3 text-sm"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.task_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.asset_name} {t.asset_plate ? `• ${t.asset_plate}` : ""}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t.due_date && <span>Échéance: {new Date(t.due_date).toLocaleDateString("fr-CH")}</span>}
                    {t.due_date && t.due_km && <span> · </span>}
                    {t.due_km && <span>{t.due_km.toLocaleString("fr-CH")} km</span>}
                    {t.asset_km != null && t.due_km && (
                      <span className="ml-1">
                        ({t.due_km - t.asset_km > 0
                          ? `${(t.due_km - t.asset_km).toLocaleString("fr-CH")} km restants`
                          : `${(t.asset_km - t.due_km).toLocaleString("fr-CH")} km en retard`})
                      </span>
                    )}
                  </div>
                </div>
                <CompleteMaintenanceDialog task={t} onCompleted={onCompleted} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────

function MaintenanceContent() {
  const [tab, setTab] = useState<"tasks" | "legacy">("tasks");
  const [tasksData, setTasksData] = useState<MaintenanceTasksOverview | null>(null);
  const [legacyData, setLegacyData] = useState<MaintenanceOverview | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [tasks, legacy] = await Promise.all([
        getTasksOverview().catch(() => null),
        getMaintenanceOverview().catch(() => null),
      ]);
      setTasksData(tasks);
      setLegacyData(legacy);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  if (loading) return <div className="text-muted-foreground">Chargement...</div>;

  const totalTaskAlerts = tasksData
    ? tasksData.total_overdue + tasksData.total_due + tasksData.due_soon_30d.length
    : 0;
  const totalLegacyAlerts = legacyData
    ? legacyData.overdue.length + legacyData.upcoming_7d.length + legacyData.in_maintenance.length + legacyData.insurance_expiring.length
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wrench className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            Maintenance
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalTaskAlerts + totalLegacyAlerts === 0
              ? "Aucune alerte — tout est en ordre"
              : `${totalTaskAlerts + totalLegacyAlerts} alerte(s) active(s)`}
          </p>
        </div>
        <Button variant="outline" className="rounded-xl" onClick={fetchAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Rafraîchir
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1 w-fit">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "tasks" ? "bg-white shadow-sm text-[#6C5CE7]" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("tasks")}
        >
          Entretien planifié
          {totalTaskAlerts > 0 && (
            <Badge variant="secondary" className="ml-2 bg-red-100 text-red-700 text-xs">
              {totalTaskAlerts}
            </Badge>
          )}
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "legacy" ? "bg-white shadow-sm text-[#6C5CE7]" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setTab("legacy")}
        >
          Inspections & Assurances
          {totalLegacyAlerts > 0 && (
            <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-700 text-xs">
              {totalLegacyAlerts}
            </Badge>
          )}
        </button>
      </div>

      {/* Task-based maintenance */}
      {tab === "tasks" && tasksData && (
        <div className="grid gap-4 lg:grid-cols-2">
          <TaskSection
            title="En retard"
            tone="red"
            tasks={tasksData.overdue}
            emptyText="Aucun entretien en retard"
            icon={AlertCircle}
            onCompleted={fetchAll}
          />
          <TaskSection
            title="À faire bientôt (7 jours / 500 km)"
            tone="amber"
            tasks={tasksData.due_soon_7d}
            emptyText="Rien à signaler"
            icon={Clock}
            onCompleted={fetchAll}
          />
          <TaskSection
            title="Prochains 30 jours / 2 000 km"
            tone="blue"
            tasks={tasksData.due_soon_30d}
            emptyText="Rien dans les 30 prochains jours"
            icon={Calendar}
            onCompleted={fetchAll}
          />
          {tasksData.total_tasks === 0 && (
            <div className="lg:col-span-2 text-center py-8 text-muted-foreground">
              <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucune tâche de maintenance planifiée</p>
              <p className="text-sm">Créez des plans dans Administration → Plans de maintenance,<br />puis générez les tâches sur vos véhicules.</p>
            </div>
          )}
        </div>
      )}

      {/* Legacy inspections/insurance */}
      {tab === "legacy" && legacyData && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section
            title="Inspections en retard"
            tone="red"
            count={legacyData.overdue.length}
            assets={legacyData.overdue}
            dateKey="next_inspection_date"
            emptyText="Aucune inspection en retard"
            icon={AlertCircle}
          />
          <Section
            title="Inspections 7 jours"
            tone="amber"
            count={legacyData.upcoming_7d.length}
            assets={legacyData.upcoming_7d}
            dateKey="next_inspection_date"
            emptyText="Rien dans les 7 prochains jours"
            icon={Clock}
          />
          <Section
            title="Inspections 30 jours"
            tone="blue"
            count={legacyData.upcoming_30d.length}
            assets={legacyData.upcoming_30d}
            dateKey="next_inspection_date"
            emptyText="Rien dans les 30 prochains jours"
            icon={Calendar}
          />
          <Section
            title="En maintenance"
            tone="amber"
            count={legacyData.in_maintenance.length}
            assets={legacyData.in_maintenance}
            dateKey="status"
            emptyText="Aucun matériel en maintenance"
            icon={Wrench}
          />
          <Section
            title="Assurance expirante (30j)"
            tone="red"
            count={legacyData.insurance_expiring.length}
            assets={legacyData.insurance_expiring}
            dateKey="insurance_date"
            emptyText="Aucune assurance expirant bientôt"
            icon={ShieldAlert}
          />
        </div>
      )}
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
