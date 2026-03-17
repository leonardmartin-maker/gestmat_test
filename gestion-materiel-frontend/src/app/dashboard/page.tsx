"use client";

import { useEffect, useMemo, useState } from "react";
import { getDashboardSummary, type DashboardSummaryOut } from "@/lib/api/dashboard";

import { KpiCard } from "@/components/app/KpiCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

import { listEvents, type EventOut } from "@/lib/api/events";
import { EventsHeatmap7d } from "@/components/app/EventsHeatmap7d";
import { RecentEvents } from "@/components/app/RecentEvents";
import { AssetDrawer } from "@/components/app/AssetDrawer";
import { listAssetsWithAssignee, getAssetHistory, type AssetOutWithAssignee } from "@/lib/api/assets";
import { AlertsPanel } from "@/components/app/AlertsPanel";

// ✅ mini helper

const MAINT_ALERT_DAYS = 7;

function isMaintenanceEventType(t: string) {
  const s = (t || "").toLowerCase();
  // adapte si tes event_type sont différents (ex: "SET_MAINTENANCE", "MAINTENANCE", etc.)
  return s.includes("maintenance");
}

function isAssignEventType(t: string) {
  const s = (t || "").toLowerCase();
  // adapte si besoin ("assign", "attribution", etc.)
  return s.includes("assign") || s.includes("attrib");
}

function daysBetween(fromISO: string, to: Date) {
  const a = new Date(fromISO);
  const ms = to.getTime() - a.getTime();
  return Math.floor(ms / (24 * 3600 * 1000));
}

function pct(part: number, total: number) {
  if (!total) return "0%";
  const v = Math.round((part / total) * 100);
  return `${v}%`;
}

type Health = {
  score: number; // 0..100
  label: string;
  tone: "good" | "warn" | "bad";
  notes: string[];
};

function computeHealth(d: DashboardSummaryOut, missingCount: number): Health {
  const total = Math.max(1, d.total_assets);

  // pénalités simples (tweakables)
  const maintRate = d.maintenance_assets / total;
  const retiredRate = d.retired_assets / total;
  const missingRate = missingCount / total;

  let score = 100;
  score -= Math.round(maintRate * 45);   // maintenance pèse fort
  score -= Math.round(missingRate * 35); // data quality importante
  score -= Math.round(retiredRate * 15); // retrait léger

  score = Math.max(0, Math.min(100, score));

  let tone: Health["tone"] = "good";
  if (score < 70) tone = "warn";
  if (score < 45) tone = "bad";

  const label =
    tone === "good" ? "Parc sain" : tone === "warn" ? "À surveiller" : "Priorité";

  const notes: string[] = [];
  if (d.maintenance_assets > 0) notes.push(`${d.maintenance_assets} en maintenance`);
  if (missingCount > 0) notes.push(`${missingCount} fiche(s) incomplète(s)`);
  if (d.retired_assets > 0) notes.push(`${d.retired_assets} retiré(s)`);

  if (notes.length === 0) notes.push("Aucune anomalie détectée");

  return { score, label, tone, notes };
}

function toneClass(tone: Health["tone"]) {
  if (tone === "good") return "border-emerald-200 bg-emerald-50/40";
  if (tone === "warn") return "border-amber-200 bg-amber-50/40";
  return "border-red-200 bg-red-50/40";
}

function toneText(tone: Health["tone"]) {
  if (tone === "good") return "text-emerald-700";
  if (tone === "warn") return "text-amber-700";
  return "text-red-700";
}

function by<T>(arr: T[], key: (x: T) => string | number | null | undefined) {
  const m = new Map<string, number>();
  for (const x of arr) {
    const k0 = key(x);
    if (k0 === null || k0 === undefined) continue;
    const k = String(k0);
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}

function topN(map: Map<string, number>, n: number) {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function availabilityRate(available: number, total: number) {
  if (!total) return 0;
  return Math.round((available / total) * 100);
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummaryOut | null>(null);
  const [events, setEvents] = useState<EventOut[]>([]);
  const [maintenanceAssets, setMaintenanceAssets] = useState<AssetOutWithAssignee[]>([]);
  const [retiredAssets, setRetiredAssets] = useState<AssetOutWithAssignee[]>([]);
  const [missingAssets, setMissingAssets] = useState<AssetOutWithAssignee[]>([]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [allAssets, setAllAssets] = useState<AssetOutWithAssignee[]>([]);
  
  const [maintenanceAged, setMaintenanceAged] = useState<
    { asset: AssetOutWithAssignee; enteredAt: string | null; days: number | null }[]
  >([]);

  const [assignedWithoutEmployee, setAssignedWithoutEmployee] = useState<EventOut[]>([]);

  // drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const openAsset = (id: number) => {
    setSelectedAssetId(id);
    setDrawerOpen(true);
  };

  const refresh = async () => {
    setLoading(true);
    setErr(null);

    const now = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 6);
    from.setHours(0, 0, 0, 0);

    try {
      const [d, ev, maint, ret, all] = await Promise.all([
        getDashboardSummary(),
        listEvents({ from: from.toISOString(), to: now.toISOString(), limit: 200, offset: 0 }),
        listAssetsWithAssignee({ status: "MAINTENANCE", limit: 50, offset: 0 }),
        listAssetsWithAssignee({ status: "RETIRED", limit: 50, offset: 0 }),
        listAssetsWithAssignee({ limit: 200, offset: 0 }),
      ]);

      setData(d);

      const sortedEvents = [...ev.data].sort(
        (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
      );
      setEvents(sortedEvents);

      setMaintenanceAssets(maint.data);
      setRetiredAssets(ret.data);
      setAllAssets(all.data);

      const missing = all.data.filter((a) => {
        const missingSerial = !a.serial_number;
        const missingRef = !a.ref;
        const missingEpiType = a.category === "EPI" && !a.epi_type;
        const missingPlate = a.category === "VEHICLE" && !a.plate;
        return missingSerial || missingRef || missingEpiType || missingPlate;
      });
      setMissingAssets(missing);
      setLastRefresh(new Date());
      // ✅ Ops: maintenance 오래 + assigned sans employee
      // 1) Maintenance depuis X jours (via history)
      const maintAged = await Promise.all(
        maint.data.slice(0, 20).map(async (a) => {
          try {
            const hist = await getAssetHistory(a.id);
            // hist.groups: [{date, events:[...]}]
            const flat = hist.groups.flatMap((g) => g.events);
            const maintEvents = flat
              .filter((e) => isMaintenanceEventType(e.event_type))
              .sort((x, y) => new Date(y.occurred_at).getTime() - new Date(x.occurred_at).getTime());
            const enteredAt = maintEvents[0]?.occurred_at ?? null;
            const days = enteredAt ? daysBetween(enteredAt, now) : null;
            return { asset: a, enteredAt, days };
          } catch {
            return { asset: a, enteredAt: null as string | null, days: null as number | null };
          }
        })
      );

      setMaintenanceAged(
        maintAged
          .filter((x) => (x.days ?? 0) >= MAINT_ALERT_DAYS)
          .sort((a, b) => (b.days ?? 0) - (a.days ?? 0))
      );

      // 2) ASSIGNED mais dernier event sans employee_id (sur fenêtre)
      const latestByAsset = new Map<number, typeof sortedEvents[number]>();
      for (const e of sortedEvents) {
        if (!latestByAsset.has(e.asset_id)) latestByAsset.set(e.asset_id, e);
      }

      const assignedNoEmployee = Array.from(latestByAsset.values()).filter(
        (e) => isAssignEventType(e.event_type) && (e.employee_id === null || e.employee_id === undefined)
      );

      setAssignedWithoutEmployee(assignedNoEmployee);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const suspicious = useMemo(() => {
    const now = Date.now();
    const cutoff = now - 48 * 60 * 60 * 1000; // 48h

    const byAsset: Record<number, { assetId: number; count: number; lastAt: number; employees: Set<number> }> = {};

    for (const e of events) {
      const t = new Date(e.occurred_at).getTime();
      if (Number.isNaN(t) || t < cutoff) continue;

      const a = (byAsset[e.asset_id] ??= {
        assetId: e.asset_id,
        count: 0,
        lastAt: 0,
        employees: new Set<number>(),
      });

      a.count += 1;
      if (t > a.lastAt) a.lastAt = t;
      if (e.employee_id) a.employees.add(e.employee_id);
    }

    // Règle simple: >= 3 mouvements / 48h OU >= 2 employés différents / 48h
    const flagged = Object.values(byAsset)
      .filter((x) => x.count >= 3 || x.employees.size >= 2)
      .sort((a, b) => b.lastAt - a.lastAt);

    const assetMap = new Map(allAssets.map((a) => [a.id, a]));

    return flagged.map((x) => ({
      ...x,
      asset: assetMap.get(x.assetId),
      employeesCount: x.employees.size,
      lastAtIso: new Date(x.lastAt).toISOString(),
    }));
  }, [events, allAssets]);

  const health = useMemo(() => {
    if (!data) return null;
    return computeHealth(data, missingAssets.length);
  }, [data, missingAssets.length]);

  const todo = useMemo(() => {
    if (!data) return [];
    const items: { title: string; desc: string; cta?: string; onClick?: () => void }[] = [];

    if (data.maintenance_assets > 0) {
      items.push({
        title: "Vérifier les maintenances en cours",
        desc: `${data.maintenance_assets} matériel(s) bloqué(s)`,
        cta: "Voir",
        onClick: () => {
          const first = maintenanceAssets[0];
          if (first) openAsset(first.id);
        },
      });
    }

    if (missingAssets.length > 0) {
      items.push({
        title: "Compléter les fiches incomplètes",
        desc: `${missingAssets.length} matériel(s) avec données manquantes`,
        cta: "Ouvrir le 1er",
        onClick: () => {
          const first = missingAssets[0];
          if (first) openAsset(first.id);
        },
      });
    }

    if (data.retired_assets > 0) {
      items.push({
        title: "Nettoyer les matériels retirés",
        desc: `${data.retired_assets} retiré(s) (archivage / contrôle)`,
        cta: "Voir",
        onClick: () => {
          const first = retiredAssets[0];
          if (first) openAsset(first.id);
        },
      });
    }

    if (items.length === 0) {
      items.push({
        title: "Aucune action urgente",
        desc: "Le parc est propre. Tu peux te concentrer sur le suivi normal.",
      });
    }

    return items;
  }, [data, missingAssets, maintenanceAssets, retiredAssets]);

  const ops = useMemo(() => {
    // stats simples depuis dashboard summary
    if (!data) {
      return {
        availablePct: 0,
        assignedPct: 0,
        maintPct: 0,
        byCat: { VEHICLE: { total: 0, available: 0 }, EPI: { total: 0, available: 0 } },
        topAssets: [] as { assetId: number; count: number }[],
        topEmployees: [] as { employeeId: number; count: number }[],
      };
    }

    const total = Math.max(1, data.total_assets);
    const availablePct = availabilityRate(data.available_assets, total);
    const assignedPct = availabilityRate(data.assigned_assets, total);
    const maintPct = availabilityRate(data.maintenance_assets, total);

    // par catégorie à partir de "all" (si dispo dans ta réponse listAssetsWithAssignee)
    const byCat = {
      VEHICLE: { total: 0, available: 0 },
      EPI: { total: 0, available: 0 },
    };

    for (const a of missingAssets) {
      // rien ici (juste pour montrer qu'on l'a sous la main)
    }

    // Si tu veux le breakdown par catégorie fiable → il faut la liste "all"
    // Là on le fait via maintenance/retired/missing + total summary: approximatif.
    // Option simple: on récupère all.data dans refresh() et on le stocke aussi.
    // (si tu veux, je te donne le patch complet avec allAssets en state)
  
    // top assets et top employees depuis les events (7j)
    // ⚠️ dépend de ton modèle EventOut: j'assume asset_id et employee_id existent.
    const assetCounts = by(events, (e: any) => e.asset_id);
    const empCounts = by(events, (e: any) => e.employee_id);

    const topAssets = topN(assetCounts, 5)
      .map(([k, v]) => ({ assetId: Number(k), count: v }))
      .filter((x) => Number.isFinite(x.assetId));

    const topEmployees = topN(empCounts, 5)
      .map(([k, v]) => ({ employeeId: Number(k), count: v }))
      .filter((x) => Number.isFinite(x.employeeId));

    return { availablePct, assignedPct, maintPct, byCat, topAssets, topEmployees };
  }, [data, events, missingAssets]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Vue rapide — état du parc, activité et actions prioritaires
          </p>
        </div>
        <Button variant="outline" onClick={refresh} disabled={loading}>
          {loading ? "…" : "Rafraîchir"}
        </Button>
      </div>

      {err && (
        <div className="rounded-md border p-3 text-sm text-red-600">
          {String(err)}
        </div>
      )}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          <>
            <Skeleton className="h-[92px] w-full" />
            <Skeleton className="h-[92px] w-full" />
            <Skeleton className="h-[92px] w-full" />
            <Skeleton className="h-[92px] w-full" />
          </>
        ) : (
          <>
            <KpiCard label="Matériels (total)" value={data.total_assets} />
            <KpiCard
              label="Attribués"
              value={data.assigned_assets}
              hint={`(${pct(data.assigned_assets, data.total_assets)})`}
            />
            <KpiCard
              label="Disponibles"
              value={data.available_assets}
              hint={`(${pct(data.available_assets, data.total_assets)})`}
            />
            <KpiCard label="Événements (7j)" value={data.last_7_days_events} />
          </>
        )}
      </div>

      {/* OPS TERRAIN */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Ops terrain</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3">
            {loading || !data ? (
              <>
                <Skeleton className="h-[84px] w-full" />
                <Skeleton className="h-[84px] w-full" />
                <Skeleton className="h-[84px] w-full" />
              </>
            ) : (
              <>
                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Disponibilité</div>
                  <div className="text-2xl font-semibold">{ops.availablePct}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.available_assets} dispo / {data.total_assets} total
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Attribués</div>
                  <div className="text-2xl font-semibold">{ops.assignedPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.assigned_assets} attribués
                  </div>
                </div>

                <div className="rounded-md border p-3">
                  <div className="text-xs text-muted-foreground">Maintenance</div>
                  <div className="text-2xl font-semibold">{ops.maintPct}%</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {data.maintenance_assets} en maintenance
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Raccourcis</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const first = maintenanceAssets[0];
                if (first) openAsset(first.id);
              }}
              disabled={maintenanceAssets.length === 0}
            >
              Traiter maintenance
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const first = missingAssets[0];
                if (first) openAsset(first.id);
              }}
              disabled={missingAssets.length === 0}
            >
              Corriger données
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const first = retiredAssets[0];
                if (first) openAsset(first.id);
              }}
              disabled={retiredAssets.length === 0}
            >
              Vérifier retirés
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 1: Health + Quick actions */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Card className={`lg:col-span-1 border ${health ? toneClass(health.tone) : ""}`}>
          <CardHeader>
            <CardTitle className="text-base">Santé du parc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading || !data || !health ? (
              <>
                <Skeleton className="h-6 w-[40%]" />
                <Skeleton className="h-4 w-[80%]" />
                <Skeleton className="h-4 w-[70%]" />
              </>
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <div>
                    <div className={`text-sm font-medium ${toneText(health.tone)}`}>{health.label}</div>
                    <div className="text-3xl font-semibold">{health.score}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">/ 100</div>
                </div>

                <div className="space-y-1">
                  {health.notes.map((n, i) => (
                    <div key={i} className="text-sm text-muted-foreground">
                      • {n}
                    </div>
                  ))}
                </div>

                <div className="rounded-md border bg-background p-3">
                  <div className="text-xs text-muted-foreground mb-1">Raccourcis</div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const first = missingAssets[0];
                        if (first) openAsset(first.id);
                      }}
                      disabled={missingAssets.length === 0}
                    >
                      Données manquantes ({missingAssets.length})
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const first = maintenanceAssets[0];
                        if (first) openAsset(first.id);
                      }}
                      disabled={maintenanceAssets.length === 0}
                    >
                      Maintenance ({maintenanceAssets.length})
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Actions prioritaires</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading || !data ? (
              <>
                <Skeleton className="h-[64px] w-full" />
                <Skeleton className="h-[64px] w-full" />
                <Skeleton className="h-[64px] w-full" />
              </>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {todo.map((t, idx) => (
                  <div key={idx} className="rounded-md border p-3">
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-sm text-muted-foreground mt-1">{t.desc}</div>
                    {t.cta && t.onClick && (
                      <div className="mt-3">
                        <Button size="sm" variant="outline" onClick={t.onClick}>
                          {t.cta}
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Alerts (right) + Activity (left) */}
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activité</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <>
                  <Skeleton className="h-5 w-[60%]" />
                  <div className="mt-4 flex items-end gap-2">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-[72px] w-6" />
                    ))}
                  </div>
                </>
              ) : (
                <EventsHeatmap7d events={events} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rotation suspecte (48h)</CardTitle>
            </CardHeader>

            <CardContent className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-[70%]" />
                  <Skeleton className="h-5 w-[60%]" />
                  <Skeleton className="h-5 w-[65%]" />
                </>
              ) : suspicious.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Aucun matériel anormalement sollicité.
                </div>
              ) : (
                <div className="space-y-2">
                  {suspicious.slice(0, 6).map((x) => (
                    <button
                      key={x.assetId}
                      type="button"
                      onClick={() => openAsset(x.assetId)}
                      className="w-full text-left rounded-md border p-3 hover:bg-muted transition"
                      title="Ouvrir le matériel"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">
                          {x.asset?.name ?? `Matériel #${x.assetId}`}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {x.count} evt • {x.employeesCount} employé(s)
                        </div>
                      </div>

                      <div className="mt-1 text-xs text-muted-foreground">
                        Dernière activité: {new Date(x.lastAtIso).toLocaleString("fr-CH")}
                        {x.asset?.assigned_to ? " • actuellement attribué" : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Derniers mouvements</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-[72px] w-full" />
                  <Skeleton className="h-[72px] w-full" />
                  <Skeleton className="h-[72px] w-full" />
                </div>
              ) : (
                <RecentEvents events={events.slice(0, 6)} onOpenAsset={openAsset} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matériels les plus sollicités (7j)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-[70%]" />
                  <Skeleton className="h-5 w-[60%]" />
                  <Skeleton className="h-5 w-[65%]" />
                </>
              ) : ops.topAssets.length === 0 ? (
                <div className="text-sm text-muted-foreground">Pas assez d’événements pour classer.</div>
              ) : (
                <div className="space-y-2">
                  {ops.topAssets.map((x) => (
                    <button
                      key={x.assetId}
                      type="button"
                      className="w-full rounded-md border p-3 text-left hover:bg-muted"
                      onClick={() => openAsset(x.assetId)}
                      title="Ouvrir la fiche"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Asset #{x.assetId}</div>
                        <div className="text-xs text-muted-foreground">{x.count} evt</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        À surveiller (usure, affectations fréquentes)
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Employés les plus actifs (7j)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-5 w-[70%]" />
                  <Skeleton className="h-5 w-[60%]" />
                  <Skeleton className="h-5 w-[65%]" />
                </>
              ) : ops.topEmployees.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Pas assez d’événements.
                </div>
              ) : (
                <div className="space-y-2">
                  {ops.topEmployees.map((x) => (
                    <div
                      key={x.employeeId}
                      className="rounded-md border p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">
                          Employé #{x.employeeId}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {x.count} événements
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Activité élevée sur 7 jours
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AlertsPanel
          maintenance={maintenanceAssets}
          retired={retiredAssets}
          missing={missingAssets}
          maintenanceAged={maintenanceAged}
          assignedWithoutEmployee={assignedWithoutEmployee}
          onOpenAsset={openAsset}
        />
      </div>

      <AssetDrawer open={drawerOpen} onOpenChange={setDrawerOpen} assetId={selectedAssetId} />
    </div>
  );
}