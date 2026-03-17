"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

import { getAsset, getAssetHistory, type AssetHistoryOut, type AssetOut } from "@/lib/api/assets";
import { StatusBadge } from "@/components/app/StatusBadge";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assetId: number | null;
};

export function AssetDrawer({ open, onOpenChange, assetId }: Props) {
  const [asset, setAsset] = useState<AssetOut | null>(null);
  const [history, setHistory] = useState<AssetHistoryOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
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

            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading || !assetId}>
              {loading ? "…" : "Rafraîchir"}
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {err && (
            <div className="rounded-md border p-3 text-sm text-red-600">
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
              <div className="flex items-center gap-2 flex-wrap">
                {isAvailable && (
                  <AssignAssetDialog publicId={asset.public_id} isVehicle={!!isVehicle} onDone={refresh} />
                )}
                {isAssigned && (
                  <ReturnAssetDialog publicId={asset.public_id} isVehicle={!!isVehicle} onDone={refresh} />
                )}
              </div>

              <Separator />

              {/* Infos */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border p-4 space-y-2">
                  <div className="text-sm font-medium">Identifiants</div>
                  <div className="text-sm text-muted-foreground">Ref: {asset.ref ?? "—"}</div>
                  <div className="text-sm text-muted-foreground">Série: {asset.serial_number ?? "—"}</div>
                </div>

                <div className="rounded-md border p-4 space-y-2">
                  <div className="text-sm font-medium">Détails</div>
                  {isVehicle ? (
                    <>
                      <div className="text-sm text-muted-foreground">Plaque: {asset.plate ?? "—"}</div>
                      <div className="text-sm text-muted-foreground">KM: {asset.km_current ?? "—"}</div>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Type EPI: {asset.epi_type ?? "—"}</div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Historique */}
              <div className="space-y-3">
                <div className="text-sm font-medium">Historique</div>

                {!history?.groups?.length ? (
                  <div className="text-sm text-muted-foreground">Aucun événement</div>
                ) : (
                  <div className="space-y-4">
                    {history.groups.map((g) => (
                      <div key={g.date} className="space-y-2">
                        <div className="text-sm font-semibold">{g.date}</div>
                        <div className="space-y-2">
                          {g.events.map((ev) => (
                            <div key={ev.id} className="rounded-md border p-3 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <div className="font-medium">{ev.event_type}</div>
                                <div className="text-muted-foreground">
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