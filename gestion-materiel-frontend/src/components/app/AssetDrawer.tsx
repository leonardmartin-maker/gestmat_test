"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { RefreshCw, Tag, Info, History, Clock, Wrench, Gauge } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

import { getAsset, getAssetHistory, type AssetHistoryOut, type AssetOut } from "@/lib/api/assets";
import { listTasks, generateTasks, updateKm, type MaintenanceTaskOut } from "@/lib/api/maintenance-tasks";
import { getAssetMaintenanceLogs, type MaintenanceLogOut } from "@/lib/api/maintenance-logs";
import { EPI_PREDEFINED_ATTRIBUTES } from "@/lib/constants/epi-attributes";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";
import { CompleteMaintenanceDialog } from "@/components/app/CompleteMaintenanceDialog";
import { useAuth } from "@/lib/auth/auth-context";

const ATTR_LABEL: Record<string, string> = Object.fromEntries(
  EPI_PREDEFINED_ATTRIBUTES.map((a) => [a.key, a.label])
);

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assetId: number | null;
};

export function AssetDrawer({ open, onOpenChange, assetId }: Props) {
  const { canWrite } = useAuth();
  const [asset, setAsset] = useState<AssetOut | null>(null);
  const [history, setHistory] = useState<AssetHistoryOut | null>(null);
  const [mTasks, setMTasks] = useState<MaintenanceTaskOut[]>([]);
  const [mLogs, setMLogs] = useState<MaintenanceLogOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [kmInput, setKmInput] = useState("");
  const [kmUpdating, setKmUpdating] = useState(false);
  const [generating, setGenerating] = useState(false);

  const isVehicle = asset?.category === "VEHICLE";
  const isAvailable = asset?.status === "AVAILABLE";
  const isAssigned = asset?.status === "ASSIGNED";

  const title = useMemo(() => {
    if (!asset) return "Matériel";
    return `${asset.name}`;
  }, [asset]);

  const refresh = async () => {
    if (!assetId) return;
    setLoading(true);
    setErr(null);
    try {
      const [a, h] = await Promise.all([getAsset(assetId), getAssetHistory(assetId)]);
      setAsset(a);
      setHistory(h);
      setKmInput(a.km_current?.toString() || "");
      // Load maintenance data for vehicles
      if (a.category === "VEHICLE") {
        const [tasks, logs] = await Promise.all([
          listTasks({ asset_id: assetId, limit: 100 }).catch(() => ({ data: [] })),
          getAssetMaintenanceLogs(assetId).catch(() => ({ data: [] })),
        ]);
        setMTasks(tasks.data);
        setMLogs(logs.data);
      }
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const handleKmUpdate = async () => {
    if (!asset || !kmInput) return;
    setKmUpdating(true);
    try {
      await updateKm(asset.id, parseInt(kmInput));
      refresh();
    } catch {}
    setKmUpdating(false);
  };

  const handleGenerate = async () => {
    if (!asset) return;
    setGenerating(true);
    try {
      const res = await generateTasks(asset.id);
      alert(`${res.created} tâche(s) créée(s)`);
      refresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
    setGenerating(false);
  };

  useEffect(() => {
    if (!open || !assetId) return;
    setAsset(null);
    setHistory(null);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, assetId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate">{title}</div>
              {asset && (
                <div className="mt-2 flex gap-2 flex-wrap items-center">
                  <StatusBadge status={asset.status} />
                  <span className="text-xs text-muted-foreground">
                    {asset.category} • id {asset.id}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    public_id: {asset.public_id}
                  </span>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" className="rounded-xl gap-1.5" onClick={() => refresh()} disabled={loading || !assetId}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              {loading ? "…" : "Rafraîchir"}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {String(err)}
            </div>
          )}

          {!err && !asset && (
            <div className="text-sm text-muted-foreground">
              {loading ? "Chargement…" : "Sélectionne un matériel"}
            </div>
          )}

          {asset && (
            <>
              {/* Actions */}
              {canWrite && (
                <div className="flex items-center gap-2 flex-wrap">
                  {isAvailable && (
                    <AssignAssetDialog publicId={asset.public_id} isVehicle={!!isVehicle} onDone={refresh} />
                  )}
                  {isAssigned && (
                    <ReturnAssetDialog publicId={asset.public_id} isVehicle={!!isVehicle} onDone={refresh} />
                  )}
                </div>
              )}

              <Separator />

              {/* Infos */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border bg-[#F8F7FF] p-4 space-y-2">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-[#6C5CE7]" />
                    Identifiants
                  </div>
                  <div className="text-sm text-muted-foreground">Ref: {asset.ref ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">Série: {asset.serial_number ?? "—"}</div>
                </div>

                <div className="rounded-xl border bg-[#F8F7FF] p-4 space-y-2">
                  <div className="text-sm font-medium flex items-center gap-1.5">
                    <Info className="h-3.5 w-3.5 text-[#6C5CE7]" />
                    Détails
                  </div>
                  {isVehicle ? (
                    <>
                      {asset.model_name && (
                        <div className="text-sm text-muted-foreground">Modèle: <span className="font-medium text-foreground">{asset.model_name}</span></div>
                      )}
                      <div className="text-sm text-muted-foreground">Plaque: {asset.plate ?? "—"}</div>
                      <div className="text-sm text-muted-foreground">KM: {asset.km_current?.toLocaleString("fr-CH") ?? "—"}</div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-muted-foreground">Type EPI: {asset.epi_type ?? "—"}</div>
                      {asset.epi_attributes && Object.keys(asset.epi_attributes).length > 0 && (
                        <div className="mt-1 space-y-1">
                          {Object.entries(asset.epi_attributes).map(([key, val]) => (
                            <div key={key} className="text-sm text-muted-foreground">
                              {ATTR_LABEL[key] || key}: <span className="font-medium text-foreground">{val}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Maintenance section for vehicles */}
              {isVehicle && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium flex items-center gap-1.5">
                        <Wrench className="h-3.5 w-3.5 text-[#6C5CE7]" />
                        Maintenance
                      </div>
                      {canWrite && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              className="h-8 w-24 rounded-lg text-xs"
                              placeholder="KM"
                              value={kmInput}
                              onChange={(e) => setKmInput(e.target.value)}
                              min={0}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs"
                              onClick={handleKmUpdate}
                              disabled={kmUpdating || !kmInput}
                            >
                              <Gauge className="h-3 w-3 mr-1" />
                              {kmUpdating ? "…" : "MAJ km"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {mTasks.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        {asset.model_name ? (
                          <div className="flex items-center gap-2">
                            <span>Aucune tâche planifiée</span>
                            {canWrite && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 rounded-lg text-xs"
                                onClick={handleGenerate}
                                disabled={generating}
                              >
                                {generating ? "Génération…" : "Générer depuis le plan"}
                              </Button>
                            )}
                          </div>
                        ) : (
                          "Aucun modèle défini — définissez un modèle pour planifier la maintenance"
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {mTasks.map((t) => {
                          const statusColor = t.status === "OVERDUE" ? "bg-red-100 text-red-700" : t.status === "DUE" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
                          const statusLabel = t.status === "OVERDUE" ? "En retard" : t.status === "DUE" ? "Bientôt" : "OK";
                          return (
                            <div key={t.id} className="flex items-center justify-between rounded-lg border p-2.5 text-sm">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{t.task_name}</span>
                                  <Badge variant="secondary" className={`${statusColor} text-xs`}>{statusLabel}</Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {t.due_date && <span>{new Date(t.due_date).toLocaleDateString("fr-CH")}</span>}
                                  {t.due_date && t.due_km && <span> · </span>}
                                  {t.due_km && <span>{t.due_km.toLocaleString("fr-CH")} km</span>}
                                </div>
                              </div>
                              {canWrite && (t.status === "OVERDUE" || t.status === "DUE") && (
                                <CompleteMaintenanceDialog task={t} onCompleted={refresh} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Maintenance logs */}
                    {mLogs.length > 0 && (
                      <div className="mt-2 space-y-1.5">
                        <div className="text-xs font-medium text-muted-foreground">Historique maintenance</div>
                        {mLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="rounded-lg bg-muted/30 px-3 py-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{log.task_name}</span>
                              <span className="text-muted-foreground">{new Date(log.performed_at).toLocaleDateString("fr-CH")}</span>
                            </div>
                            {(log.km_at || log.cost || log.notes) && (
                              <div className="text-muted-foreground mt-0.5">
                                {log.km_at && <span>{log.km_at.toLocaleString("fr-CH")} km</span>}
                                {log.cost && <span> · {log.cost} CHF</span>}
                                {log.notes && <span> · {log.notes}</span>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />

              {/* Historique */}
              <div className="space-y-3">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-[#6C5CE7]" />
                  Historique
                </div>

                {!history?.groups?.length ? (
                  <div className="text-sm text-muted-foreground">Aucun événement</div>
                ) : (
                  <div className="space-y-4">
                    {history.groups.map((g) => (
                      <div key={g.date} className="space-y-2">
                        <div className="text-sm font-semibold flex items-center gap-1.5">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {g.date}
                        </div>
                        <div className="space-y-2">
                          {g.events.map((ev) => (
                            <div key={ev.id} className="rounded-xl border p-3 text-sm hover:bg-purple-50/30 transition-colors">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium">{ev.event_type}</div>
                                <div className="text-muted-foreground text-xs">
                                  {new Date(ev.occurred_at).toLocaleString()}
                                </div>
                              </div>
                              {(ev.km_value != null || ev.notes) && (
                                <div className="mt-2 text-muted-foreground">
                                  {ev.km_value != null ? `KM: ${ev.km_value}` : ""}
                                  {ev.km_value != null && ev.notes ? " • " : ""}
                                  {ev.notes ?? ""}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}