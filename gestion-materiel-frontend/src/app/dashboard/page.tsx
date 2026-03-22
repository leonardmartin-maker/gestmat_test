"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDashboardSummary, type DashboardSummaryOut } from "@/lib/api/dashboard";
import { listEvents, type EventOut } from "@/lib/api/events";
import { listIncidents, type IncidentOut } from "@/lib/api/incidents";
import { getTasksOverview, type MaintenanceTasksOverview } from "@/lib/api/maintenance-tasks";
import { config } from "@/lib/config";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AssetDrawer } from "@/components/app/AssetDrawer";
import {
  Package,
  UserCheck,
  CircleCheck,
  Wrench,
  AlertTriangle,
  Car,
  Fuel,
  Activity,
  Users,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react";
import { http } from "@/lib/api/http";
import { getSubscription, type SubscriptionResponse } from "@/lib/api/subscription";
import { useAuth } from "@/lib/auth/auth-context";

function pct(part: number, total: number) {
  if (!total) return "0";
  return Math.round((part / total) * 100).toString();
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummaryOut | null>(null);
  const [events, setEvents] = useState<EventOut[]>([]);
  const [incidents, setIncidents] = useState<IncidentOut[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceTasksOverview | null>(null);
  const [fuelPending, setFuelPending] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subInfo, setSubInfo] = useState<SubscriptionResponse | null>(null);
  const { isAdmin } = useAuth();

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const openAsset = (id: number) => { setSelectedAssetId(id); setDrawerOpen(true); };

  const refresh = async () => {
    setLoading(true);
    const now = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    weekAgo.setHours(0, 0, 0, 0);

    try {
      const [d, ev, inc, maint, fuelRes] = await Promise.all([
        getDashboardSummary(),
        listEvents({ from: weekAgo.toISOString(), to: now.toISOString(), limit: 10 }),
        listIncidents({ limit: 10 }).catch(() => ({ data: [], meta: { total: 0 } })),
        getTasksOverview().catch(() => null),
        http.get("/fuel-receipts", { params: { status: "PENDING", limit: 1 } }).catch(() => ({ data: { meta: { total: 0 } } })),
      ]);

      setData(d);
      setEvents(ev.data);
      setIncidents(inc.data);
      setMaintenance(maint);
      setFuelPending((fuelRes.data as any)?.meta?.total ?? 0);

      // Load subscription info (non-blocking)
      if (isAdmin) {
        getSubscription().then(setSubInfo).catch(() => {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const [showIncidents, setShowIncidents] = useState(true);
  const [showMovements, setShowMovements] = useState(true);

  const pendingIncidents = incidents.filter((i) => i.status === "PENDING").length;
  const activeIncidents = incidents.filter((i) => i.status !== "RESOLVED").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d&apos;ensemble — parc, incidents, maintenance, carburant
          </p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {loading ? "..." : "Rafraichir"}
        </Button>
      </div>

      {/* Trial banner */}
      {subInfo?.subscription?.status === "TRIAL" && subInfo?.limits?.trial_ends_at && (
        <Link href="/settings">
          <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4 flex items-start gap-3 hover:bg-blue-100 transition-colors">
            <Clock className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="font-semibold text-blue-800 text-sm">Periode d&apos;essai</div>
              <div className="text-sm text-blue-700">
                Votre essai se termine le{" "}
                <strong>{new Date(subInfo.limits.trial_ends_at).toLocaleDateString("fr-CH")}</strong>.
                Cliquez ici pour choisir un plan.
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
          </div>
        </Link>
      )}

      {/* KPI Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[100px] rounded-2xl" />)
        ) : (
          <>
            <KpiCard icon={Package} label="Materiel total" value={data.total_assets} color="#6C5CE7" />
            <KpiCard icon={UserCheck} label="Attribues" value={data.assigned_assets} sub={`${pct(data.assigned_assets, data.total_assets)}%`} color="#74B9FF" />
            <KpiCard icon={CircleCheck} label="Disponibles" value={data.available_assets} sub={`${pct(data.available_assets, data.total_assets)}%`} color="#00B894" />
            <KpiCard icon={Users} label="Employes actifs" value={data.active_employees} color="#6C5CE7" />
          </>
        )}
      </div>

      {/* Urgent Alerts Row */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Incidents pending */}
        <Link href="/incidents" className="group">
          <div className={`rounded-2xl border p-4 transition-all hover:shadow-md ${pendingIncidents > 0 ? "bg-red-50 border-red-200" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className={`h-4 w-4 ${pendingIncidents > 0 ? "text-red-500" : "text-gray-400"}`} />
              <span className="text-xs font-medium text-muted-foreground">Incidents</span>
            </div>
            <div className={`text-2xl font-bold ${pendingIncidents > 0 ? "text-red-600" : "text-gray-900"}`}>
              {activeIncidents}
            </div>
            <div className="text-xs text-muted-foreground">
              {pendingIncidents > 0 ? `${pendingIncidents} en attente` : "Aucun actif"}
            </div>
          </div>
        </Link>

        {/* Maintenance overdue */}
        <Link href="/maintenance" className="group">
          <div className={`rounded-2xl border p-4 transition-all hover:shadow-md ${(maintenance?.total_overdue ?? 0) > 0 ? "bg-amber-50 border-amber-200" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className={`h-4 w-4 ${(maintenance?.total_overdue ?? 0) > 0 ? "text-amber-500" : "text-gray-400"}`} />
              <span className="text-xs font-medium text-muted-foreground">Maintenance</span>
            </div>
            <div className={`text-2xl font-bold ${(maintenance?.total_overdue ?? 0) > 0 ? "text-amber-600" : "text-gray-900"}`}>
              {maintenance?.total_overdue ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              en retard{maintenance?.total_due ? ` \u2022 ${maintenance.total_due} bientot` : ""}
            </div>
          </div>
        </Link>

        {/* Fuel pending */}
        <Link href="/fuel-receipts" className="group">
          <div className={`rounded-2xl border p-4 transition-all hover:shadow-md ${fuelPending > 0 ? "bg-orange-50 border-orange-200" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Fuel className={`h-4 w-4 ${fuelPending > 0 ? "text-orange-500" : "text-gray-400"}`} />
              <span className="text-xs font-medium text-muted-foreground">Carburant</span>
            </div>
            <div className={`text-2xl font-bold ${fuelPending > 0 ? "text-orange-600" : "text-gray-900"}`}>
              {fuelPending}
            </div>
            <div className="text-xs text-muted-foreground">
              tickets en attente
            </div>
          </div>
        </Link>

        {/* In maintenance */}
        <Link href="/assets?status=MAINTENANCE" className="group">
          <div className={`rounded-2xl border p-4 transition-all hover:shadow-md ${(data?.maintenance_assets ?? 0) > 0 ? "bg-purple-50 border-purple-200" : "bg-white"}`}>
            <div className="flex items-center gap-2 mb-2">
              <Car className={`h-4 w-4 ${(data?.maintenance_assets ?? 0) > 0 ? "text-purple-500" : "text-gray-400"}`} />
              <span className="text-xs font-medium text-muted-foreground">En maintenance</span>
            </div>
            <div className={`text-2xl font-bold ${(data?.maintenance_assets ?? 0) > 0 ? "text-purple-600" : "text-gray-900"}`}>
              {data?.maintenance_assets ?? 0}
            </div>
            <div className="text-xs text-muted-foreground">
              vehicule(s) immobilise(s)
            </div>
          </div>
        </Link>
      </div>

      {/* Main content */}
      <div className="space-y-4">
          {/* Recent incidents */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setShowIncidents(!showIncidents)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Derniers incidents
                  </CardTitle>
                  {showIncidents ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
                <Link href="/incidents">
                  <Button size="sm" variant="ghost" className="rounded-xl gap-1 text-xs">
                    Voir tout <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            {showIncidents && <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
                </div>
              ) : incidents.filter((i) => i.status !== "RESOLVED").length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Aucun incident actif
                </div>
              ) : (
                <div className="space-y-2">
                  {incidents.filter((i) => i.status !== "RESOLVED").slice(0, 5).map((inc) => (
                    <Link key={inc.id} href="/incidents" className="block">
                      <div className="rounded-xl border p-3 hover:bg-purple-50/30 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {inc.incident_type === "ACCIDENT" ? (
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            ) : (
                              <Wrench className="h-4 w-4 text-amber-500 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm truncate">
                              {inc.incident_type === "ACCIDENT" ? "Accident" : "Panne"}
                              {inc.asset_name ? ` \u2014 ${inc.asset_name}` : ""}
                            </span>
                            <Badge variant="secondary" className={`text-xs flex-shrink-0 ${
                              inc.status === "PENDING" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {inc.status === "PENDING" ? "En attente" : "En cours"}
                            </Badge>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">
                            {new Date(inc.created_at).toLocaleDateString("fr-CH")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                          <span>{inc.employee_name}</span>
                          {inc.asset_plate && <span>{inc.asset_plate}</span>}
                          {inc.has_third_party && (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">
                              Partie adverse
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>}
          </Card>

          {/* Recent events */}
          <Card className="rounded-2xl shadow-sm border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setShowMovements(!showMovements)} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[#6C5CE7]" />
                    Derniers mouvements
                  </CardTitle>
                  {showMovements ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </div>
            </CardHeader>
            {showMovements && <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
                </div>
              ) : events.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">Aucun mouvement recent</div>
              ) : (
                <div className="space-y-2">
                  {events.slice(0, 8).map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openAsset(ev.asset_id)}
                      className="w-full text-left rounded-xl border p-3 hover:bg-purple-50/30 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Badge variant="secondary" className={`text-xs flex-shrink-0 ${
                            ev.event_type === "CHECK_IN" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"
                          }`}>
                            {ev.event_type === "CHECK_IN" ? "Retour" : "Prise"}
                          </Badge>
                          <span className="text-sm font-medium truncate">
                            {ev.asset_name ?? `#${ev.asset_id}`}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {new Date(ev.occurred_at).toLocaleString("fr-CH", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {ev.employee_name ?? ""}
                        {ev.km_value != null && ` \u2022 ${ev.km_value.toLocaleString("fr-CH")} km`}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>}
          </Card>
      </div>

      <AssetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} assetId={selectedAssetId} />
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold">{value}</span>
        {sub && <span className="text-sm text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}
