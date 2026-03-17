"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAsset, getAssetHistory, fetchQrCodeBlob } from "@/lib/api/assets";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";
import { EditAssetDialog } from "@/components/app/EditAssetDialog";

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const assetId = useMemo(() => Number(params.id), [params.id]);

  const [asset, setAsset] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setErr(null);
    Promise.all([getAsset(assetId), getAssetHistory(assetId)])
      .then(([a, h]) => {
        setAsset(a);
        setHistory(h);
      })
      .catch((e: any) => setErr(e?.response?.data?.detail || e?.message || "Erreur"));
  }, [assetId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!asset?.public_id) return;
    let revoked = false;
    fetchQrCodeBlob(asset.public_id)
      .then((url) => {
        if (!revoked) setQrUrl(url);
      })
      .catch(() => {});
    return () => {
      revoked = true;
    };
  }, [asset?.public_id]);

  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  if (err) return <div className="text-red-600">{String(err)}</div>;
  if (!asset) return <div>Chargement…</div>;

  const isVehicle = asset.category === "VEHICLE";
  const isAssigned = asset.status === "ASSIGNED";
  const isAvailable = asset.status === "AVAILABLE";

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Matériel #{asset.id}</div>
          <h1 className="text-xl font-semibold">{asset.name}</h1>
          <div className="mt-2 flex gap-2 flex-wrap">
            <Badge variant="secondary">{asset.category}</Badge>
            <Badge variant="secondary">{asset.status}</Badge>
            <Badge variant="outline">public_id: {asset.public_id}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <EditAssetDialog asset={asset} onUpdated={refresh} />
          {isAvailable && (
            <AssignAssetDialog publicId={asset.public_id} isVehicle={isVehicle} onDone={refresh} />
          )}
          {isAssigned && (
            <ReturnAssetDialog publicId={asset.public_id} isVehicle={isVehicle} onDone={refresh} />
          )}
          <Button variant="outline" onClick={() => router.push("/assets")}>
            Retour
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border p-4 space-y-2">
          <div className="text-sm font-medium">Identifiants</div>
          <div className="text-sm text-muted-foreground">Ref: {asset.ref ?? "—"}</div>
          <div className="text-sm text-muted-foreground">Série: {asset.serial_number ?? "—"}</div>
        </div>

        <div className="rounded-md border p-4 space-y-2">
          <div className="text-sm font-medium">Infos</div>
          {isVehicle ? (
            <>
              <div className="text-sm text-muted-foreground">Plaque: {asset.plate ?? "—"}</div>
              <div className="text-sm text-muted-foreground">KM: {asset.km_current ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Assurance: {asset.insurance_date ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Expertise: {asset.inspection_date ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Prochaine expertise: {asset.next_inspection_date ?? "—"}</div>
            </>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">Type EPI: {asset.epi_type ?? "—"}</div>
              <div className="text-sm text-muted-foreground">Prochaine inspection: {asset.next_inspection_date ?? "—"}</div>
            </>
          )}
          {asset.notes && (
            <div className="text-sm text-muted-foreground">Notes: {asset.notes}</div>
          )}
        </div>
      </div>

      {qrUrl && (
        <div className="rounded-md border p-4 space-y-3">
          <div className="text-sm font-medium">QR Code</div>
          <div className="flex items-center gap-4">
            <img src={qrUrl} alt="QR Code" className="h-32 w-32" />
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const a = document.createElement("a");
                  a.href = qrUrl;
                  a.download = `qr-${asset.public_id}.png`;
                  a.click();
                }}
              >
                Télécharger
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const w = window.open("", "_blank");
                  if (w) {
                    w.document.write(
                      `<html><body style="display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0"><img src="${qrUrl}" style="max-width:80vw" onload="window.print()"/></body></html>`
                    );
                  }
                }}
              >
                Imprimer
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-md border p-4 space-y-3">
        <div className="text-sm font-medium">Historique</div>
        {!history?.groups?.length ? (
          <div className="text-sm text-muted-foreground">Aucun événement</div>
        ) : (
          <div className="space-y-4">
            {history.groups.map((g: any) => (
              <div key={g.date} className="space-y-2">
                <div className="text-sm font-semibold">{g.date}</div>
                <div className="space-y-2">
                  {g.events.map((ev: any) => (
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
    </div>
  );
}
