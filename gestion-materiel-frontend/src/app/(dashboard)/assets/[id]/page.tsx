"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAsset, getAssetHistory, fetchQrCodeBlob, updateAsset, uploadPurchaseInvoice } from "@/lib/api/assets";
import { listEpiCategories, type EpiCategoryOut } from "@/lib/api/epi-categories";
import { EPI_PREDEFINED_ATTRIBUTES } from "@/lib/constants/epi-attributes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";
import { EditAssetDialog } from "@/components/app/EditAssetDialog";
import { useAuth } from "@/lib/auth/auth-context";
import { config } from "@/lib/config";
import { deleteAsset } from "@/lib/api/admin";
import { AlertTriangle, X, Wrench, FileText, Upload, ExternalLink, HardHat, User, Trash2 } from "lucide-react";

const ATTR_LABEL: Record<string, string> = Object.fromEntries(
  EPI_PREDEFINED_ATTRIBUTES.map((a) => [a.key, a.label])
);

/* ------------------------------------------------------------------ */
/*  Event card with photos                                             */
/* ------------------------------------------------------------------ */

function photoUrl(path: string) {
  // path is like /uploads/... — prefix with API base URL
  return `${config.apiBaseUrl}${path}`;
}

function EventCard({ ev }: { ev: any }) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const statePhotos = (ev.photos ?? []).filter((p: any) => p.category === "STATE");
  const kmPhotos = (ev.photos ?? []).filter((p: any) => p.category === "KM");
  const damagePhotos = (ev.photos ?? []).filter((p: any) => p.category === "DAMAGE");

  return (
    <>
      <div className="rounded-md border p-3 text-sm space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-medium">
              {ev.event_type === "CHECK_IN" ? "Prise" : ev.event_type === "CHECK_OUT" ? "Retour" : ev.event_type}
            </span>
            {ev.employee_name && (
              <span className="ml-2 text-muted-foreground">
                par <span className="font-medium text-foreground">{ev.employee_name}</span>
                {ev.employee_code && (
                  <span className="text-xs text-muted-foreground ml-1">({ev.employee_code})</span>
                )}
              </span>
            )}
          </div>
          <div className="text-muted-foreground text-xs">
            {new Date(ev.occurred_at).toLocaleString()}
          </div>
        </div>

        {(ev.km_value != null || ev.notes) && (
          <div className="text-muted-foreground">
            {ev.km_value != null ? `KM: ${ev.km_value}` : ""}
            {ev.km_value != null && ev.notes ? " • " : ""}
            {ev.notes ?? ""}
          </div>
        )}

        {/* Damage report */}
        {ev.damage_description && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-2">
            <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-red-700">Dommage signalé</div>
              <div className="text-xs text-red-600">{ev.damage_description}</div>
            </div>
          </div>
        )}

        {/* State photos */}
        {statePhotos.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">Photos état</div>
            <div className="flex flex-wrap gap-1.5">
              {statePhotos.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(photoUrl(p.url))}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-gray-200 hover:border-[#6C5CE7] transition-colors"
                >
                  <img src={photoUrl(p.url)} alt="État" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KM photos */}
        {kmPhotos.length > 0 && (
          <div>
            <div className="text-xs font-medium text-blue-600 mb-1">Photo compteur KM</div>
            <div className="flex flex-wrap gap-1.5">
              {kmPhotos.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(photoUrl(p.url))}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-colors"
                >
                  <img src={photoUrl(p.url)} alt="Compteur KM" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Damage photos */}
        {damagePhotos.length > 0 && (
          <div>
            <div className="text-xs font-medium text-red-600 mb-1">Photos dommage</div>
            <div className="flex flex-wrap gap-1.5">
              {damagePhotos.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLightbox(photoUrl(p.url))}
                  className="w-14 h-14 rounded-lg overflow-hidden border border-red-200 hover:border-red-400 transition-colors"
                >
                  <img src={photoUrl(p.url)} alt="Dommage" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt="Photo agrandie"
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = useAuth();
  const assetId = useMemo(() => Number(params.id), [params.id]);

  const [asset, setAsset] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [epiCategories, setEpiCategories] = useState<EpiCategoryOut[]>([]);

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
    listEpiCategories().then((res) => setEpiCategories(res.data)).catch(() => {});
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
  const isMaintenance = asset.status === "MAINTENANCE";

  const handleDelete = async () => {
    if (!confirm(`Supprimer le matériel "${asset.name}" ?\nCette action est réversible (soft delete).`)) return;
    try {
      await deleteAsset(asset.id);
      router.push("/assets");
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur lors de la suppression");
    }
  };

  const handleToggleMaintenance = async () => {
    const newStatus = isMaintenance ? "AVAILABLE" : "MAINTENANCE";
    try {
      await updateAsset(assetId, { status: newStatus });
      refresh();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Matériel #{asset.id}</div>
          <h1 className="text-xl font-semibold">{asset.name}</h1>
          <div className="mt-2 flex gap-2 flex-wrap">
            <Badge variant="secondary">{asset.category}</Badge>
            {asset.status === "DESTROYED" ? (
              <Badge className="bg-red-600 text-white">DESTROYED</Badge>
            ) : asset.status === "STOLEN" ? (
              <Badge className="bg-red-900 text-white">STOLEN</Badge>
            ) : (
              <Badge variant="secondary">{asset.status}</Badge>
            )}
            <Badge variant="outline">public_id: {asset.public_id}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canWrite && <EditAssetDialog asset={asset} onUpdated={refresh} />}
          {canWrite && isAvailable && (
            <AssignAssetDialog publicId={asset.public_id} isVehicle={isVehicle} onDone={refresh} />
          )}
          {canWrite && isAssigned && (
            <ReturnAssetDialog publicId={asset.public_id} isVehicle={isVehicle} onDone={refresh} />
          )}
          {canWrite && (isAvailable || isAssigned) && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-300 hover:bg-amber-50" onClick={handleToggleMaintenance}>
              <Wrench className="h-3.5 w-3.5" />
              Maintenance
            </Button>
          )}
          {canWrite && isMaintenance && (
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50" onClick={handleToggleMaintenance}>
              <Wrench className="h-3.5 w-3.5" />
              Remettre disponible
            </Button>
          )}
          {canWrite && (
            <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-3.5 w-3.5" />
              Supprimer
            </Button>
          )}
          <Button variant="outline" onClick={() => router.push("/assets")}>
            Retour
          </Button>
        </div>
      </div>

      {/* Attribué à */}
      {isAssigned && history?.groups && (() => {
        // Trouver le dernier CHECK_IN dans l'historique
        for (const g of history.groups) {
          for (const ev of g.events) {
            if (ev.event_type === "CHECK_IN" && ev.employee_name) {
              return (
                <div className="rounded-2xl border bg-blue-50/50 p-4 flex items-center gap-3">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="text-sm font-medium text-blue-900">Attribué à</div>
                    <div className="text-sm text-blue-700">
                      {ev.employee_name}
                      {ev.employee_code && <span className="text-xs text-blue-500 ml-1">({ev.employee_code})</span>}
                    </div>
                  </div>
                </div>
              );
            }
          }
        }
        return null;
      })()}

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
              {(() => {
                const epiCat = epiCategories.find((c) => c.id === asset.epi_category_id);
                return (
                  <>
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <HardHat className="h-3.5 w-3.5 text-[#6C5CE7]" />
                      Catégorie: <span className="font-medium text-foreground">{epiCat ? `${epiCat.icon ?? ""} ${epiCat.name}`.trim() : asset.epi_type ?? "—"}</span>
                    </div>
                    {asset.epi_type && epiCat && asset.epi_type !== epiCat.name && (
                      <div className="text-sm text-muted-foreground">Type: {asset.epi_type}</div>
                    )}
                  </>
                );
              })()}
              <div className="text-sm text-muted-foreground">Prochaine inspection: {asset.next_inspection_date ?? "—"}</div>
              {asset.epi_attributes && Object.keys(asset.epi_attributes).length > 0 && (
                <div className="mt-2 rounded-lg bg-[#6C5CE7]/5 border border-[#6C5CE7]/20 p-2.5 space-y-1">
                  <div className="text-xs font-medium text-[#6C5CE7] mb-1">Attributs</div>
                  {Object.entries(asset.epi_attributes).map(([key, val]) => (
                    <div key={key} className="text-sm text-muted-foreground">
                      {ATTR_LABEL[key] || key}: <span className="font-medium text-foreground">{String(val)}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          {asset.notes && (
            <div className="text-sm text-muted-foreground">Notes: {asset.notes}</div>
          )}
        </div>
      </div>

      {/* Facture d'achat */}
      <div className="rounded-2xl border bg-white p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#6C5CE7]" />
          Facture d&apos;achat
        </h3>
        {asset.purchase_invoice_path ? (
          <a
            href={`${config.apiBaseUrl}/uploads/${asset.purchase_invoice_path}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 text-sm text-[#6C5CE7] hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Voir la facture
          </a>
        ) : (
          <p className="text-xs text-gray-400">Aucune facture</p>
        )}
        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 text-xs text-gray-500 hover:text-[#6C5CE7] bg-gray-50 border rounded-xl px-3 py-2">
            <Upload className="h-3.5 w-3.5" />
            {asset.purchase_invoice_path ? "Remplacer" : "Ajouter une facture"}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  await uploadPurchaseInvoice(asset.id, file);
                  refresh();
                } catch {
                  alert("Erreur upload");
                }
              }}
            />
          </label>
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
                    <EventCard key={ev.id} ev={ev} />
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
