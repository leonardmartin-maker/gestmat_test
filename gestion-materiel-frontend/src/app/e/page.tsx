"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QrScanner } from "@/components/app/QrScanner";
import { listAssetsWithAssignee, type AssetOutWithAssignee } from "@/lib/api/assets";
import { listMyEvents, type MyEventOut, getMaintenanceAlerts, type MaintenanceAlert } from "@/lib/api/employee-scan";
import { useAuth } from "@/lib/auth/auth-context";
import { listIncidents } from "@/lib/api/incidents";
import { http } from "@/lib/api/http";
import { config } from "@/lib/config";
import {
  ScanLine,
  Package,
  Truck,
  Shield,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  History,
  Camera,
  Gauge,
  AlertTriangle,
  X,
  Fuel,
  Wrench,
  LayoutDashboard,
  Search,
  CheckCircle,
  ClipboardList,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Lightbox                                                            */
/* ------------------------------------------------------------------ */
function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70">
        <X className="h-5 w-5" />
      </button>
      <img src={src} alt="" className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

function photoUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${config.apiBaseUrl}${url}`;
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */

export default function EmployeeScanPage() {
  const router = useRouter();
  const { canWrite } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [myAssets, setMyAssets] = useState<AssetOutWithAssignee[]>([]);
  const [availableAssets, setAvailableAssets] = useState<AssetOutWithAssignee[]>([]);
  const [loading, setLoading] = useState(true);

  // History
  const [myEvents, setMyEvents] = useState<MyEventOut[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Maintenance alerts
  const [alerts, setAlerts] = useState<MaintenanceAlert[]>([]);

  // Manager/admin counters
  const [pendingIncidents, setPendingIncidents] = useState(0);
  const [pendingFuel, setPendingFuel] = useState(0);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const promises: Promise<any>[] = [
        listAssetsWithAssignee({ limit: 200 }),
        listMyEvents(20).catch(() => []),
        getMaintenanceAlerts().catch(() => []),
      ];

      const [res, events, maintenanceAlerts] = await Promise.all(promises);
      const mine = res.data.filter((a: AssetOutWithAssignee) => a.status === "ASSIGNED");
      const available = res.data.filter((a: AssetOutWithAssignee) => a.status === "AVAILABLE");
      setMyAssets(mine);
      setAvailableAssets(available);
      setMyEvents(events);
      setAlerts(maintenanceAlerts);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // Load manager counters separately
  useEffect(() => {
    if (!canWrite) return;
    const loadCounts = async () => {
      try {
        const [incRes, fuelRes] = await Promise.all([
          listIncidents({ status: "PENDING", limit: 1 }).catch(() => ({ meta: { total: 0 } })),
          http.get("/fuel-receipts", { params: { status: "PENDING", limit: 1 } }).catch(() => ({ data: { meta: { total: 0 } } })),
        ]);
        setPendingIncidents(incRes.meta?.total ?? 0);
        setPendingFuel((fuelRes.data as any)?.meta?.total ?? 0);
      } catch {
        // silent
      }
    };
    loadCounts();
  }, [canWrite]);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  const handleScan = useCallback(
    (publicId: string) => {
      setScanning(false);
      setScannerOpen(false);
      router.push(`/e/${publicId}?scan=1`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Scanner section - collapsible */}
      <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
        <button
          onClick={() => {
            const next = !scannerOpen;
            setScannerOpen(next);
            setScanning(next);
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6C5CE7]/10">
              <ScanLine className="h-5 w-5 text-[#6C5CE7]" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-gray-900">Scanner un QR code</div>
              <div className="text-xs text-gray-500">Dirigez la camera vers le QR code</div>
            </div>
          </div>
          {scannerOpen ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </button>

        {scannerOpen && (
          <div className="px-4 pb-4">
            <QrScanner onScan={handleScan} scanning={scanning} />
          </div>
        )}
      </div>

      {/* Manager/Admin shortcuts */}
      {canWrite && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">Gestion</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/dashboard"
              className="flex flex-col items-center gap-2 rounded-2xl bg-white shadow-sm border p-4 hover:border-[#6C5CE7] hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#6C5CE7]/10">
                <LayoutDashboard className="h-5 w-5 text-[#6C5CE7]" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Dashboard</span>
            </Link>

            <Link
              href="/incidents"
              className="relative flex flex-col items-center gap-2 rounded-2xl bg-white shadow-sm border p-4 hover:border-red-400 hover:shadow-md transition-all"
            >
              {pendingIncidents > 0 && (
                <span className="absolute top-2 right-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
                  {pendingIncidents}
                </span>
              )}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Incidents</span>
            </Link>

            <Link
              href="/fuel-receipts"
              className="relative flex flex-col items-center gap-2 rounded-2xl bg-white shadow-sm border p-4 hover:border-orange-400 hover:shadow-md transition-all"
            >
              {pendingFuel > 0 && (
                <span className="absolute top-2 right-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-orange-500 text-white text-xs font-bold">
                  {pendingFuel}
                </span>
              )}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50">
                <CheckCircle className="h-5 w-5 text-orange-500" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Carburant</span>
            </Link>

            <Link
              href="/vehicle-lookup"
              className="flex flex-col items-center gap-2 rounded-2xl bg-white shadow-sm border p-4 hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50">
                <Search className="h-5 w-5 text-blue-500" />
              </div>
              <span className="text-xs font-semibold text-gray-900">Recherche vehicule</span>
            </Link>
          </div>
        </div>
      )}

      {/* Fuel receipt shortcut */}
      <Link
        href="/e/fuel"
        className="flex items-center gap-3 rounded-2xl bg-white shadow-sm border p-4 hover:border-[#6C5CE7] hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-50">
          <Fuel className="h-5 w-5 text-orange-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Ticket carburant</div>
          <div className="text-xs text-gray-500">Soumettre un justificatif pour remboursement</div>
        </div>
      </Link>

      {/* Incident shortcut */}
      <Link
        href="/e/incident"
        className="flex items-center gap-3 rounded-2xl bg-white shadow-sm border p-4 hover:border-red-400 hover:shadow-md transition-all"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50">
          <AlertTriangle className="h-5 w-5 text-red-500" />
        </div>
        <div>
          <div className="text-sm font-semibold text-gray-900">Declarer un incident</div>
          <div className="text-xs text-gray-500">Accident, panne — avec photos et localisation</div>
        </div>
      </Link>

      {/* Maintenance alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-2xl border p-4 flex items-start gap-3 ${
                a.urgency === "critical"
                  ? "bg-red-50 border-red-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <AlertTriangle
                className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                  a.urgency === "critical" ? "text-red-500" : "text-amber-500"
                }`}
              />
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${
                  a.urgency === "critical" ? "text-red-800" : "text-amber-800"
                }`}>
                  Maintenance requise
                </div>
                <div className={`text-sm ${
                  a.urgency === "critical" ? "text-red-700" : "text-amber-700"
                }`}>
                  {a.asset_name} — {a.task_name} ({a.due_value})
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My assets */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-4 w-4 text-[#6C5CE7]" />
            Mon materiel ({myAssets.length})
          </h2>
          <button
            onClick={loadAssets}
            disabled={loading}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#6C5CE7] transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {loading && myAssets.length === 0 ? (
          <LoadingCard />
        ) : myAssets.length === 0 ? (
          <EmptyCard text="Aucun materiel en votre possession" />
        ) : (
          <div className="space-y-2">
            {myAssets.map((a) => (
              <AssetCard key={a.id} asset={a} variant="mine" />
            ))}
          </div>
        )}
      </div>

      {/* Available assets */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
          <Package className="h-4 w-4 text-emerald-500" />
          Materiel disponible ({availableAssets.length})
        </h2>

        {loading && availableAssets.length === 0 ? (
          <LoadingCard />
        ) : availableAssets.length === 0 ? (
          <EmptyCard text="Aucun materiel disponible" />
        ) : (
          <div className="space-y-2">
            {availableAssets.map((a) => (
              <AssetCard key={a.id} asset={a} variant="available" />
            ))}
          </div>
        )}
      </div>

      {/* My history */}
      {myEvents.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center justify-between w-full"
          >
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="h-4 w-4 text-[#6C5CE7]" />
              Mon historique ({myEvents.length})
            </h2>
            {historyOpen ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {historyOpen && (
            <div className="space-y-2">
              {myEvents.map((ev) => (
                <HistoryCard key={ev.id} event={ev} onPhotoClick={setLightboxSrc} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                      */
/* ------------------------------------------------------------------ */

function LoadingCard() {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 text-center text-sm text-gray-500">
      Chargement...
    </div>
  );
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border p-6 text-center text-sm text-gray-500">
      {text}
    </div>
  );
}

function AssetCard({
  asset,
  onClick,
  variant,
}: {
  asset: AssetOutWithAssignee;
  onClick?: () => void;
  variant: "mine" | "available";
}) {
  const isVehicle = asset.category === "VEHICLE";
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      onClick={onClick}
      className={`w-full text-left rounded-2xl bg-white shadow-sm border p-4 transition-all ${
        onClick ? "hover:border-[#6C5CE7] hover:shadow-md cursor-pointer" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl ${
            isVehicle ? "bg-blue-50" : "bg-green-50"
          }`}
        >
          {isVehicle ? (
            <Truck className="h-5 w-5 text-blue-500" />
          ) : (
            <Shield className="h-5 w-5 text-green-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate">{asset.name}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {isVehicle && asset.plate ? asset.plate : asset.epi_type ?? asset.category}
            {asset.km_current != null && ` | ${asset.km_current.toLocaleString("fr-CH")} km`}
          </div>
        </div>
        <div className="flex-shrink-0">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              variant === "mine"
                ? "bg-blue-100 text-blue-700"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            {variant === "mine" ? "En ma possession" : "Disponible"}
          </span>
        </div>
      </div>
      {variant === "mine" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
          <ScanLine className="h-3 w-3" />
          Scannez le QR pour retourner
        </div>
      )}
      {variant === "available" && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
          <ScanLine className="h-3 w-3" />
          Scannez le QR pour prendre
        </div>
      )}
    </Tag>
  );
}

function HistoryCard({ event, onPhotoClick }: { event: MyEventOut; onPhotoClick: (src: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const isCheckIn = event.event_type === "CHECK_IN";
  const hasPhotos = event.photos.length > 0;

  return (
    <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${
              isCheckIn ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
            }`}>
              {isCheckIn ? "Prise" : "Retour"}
            </span>
            <span className="text-sm font-medium text-gray-900 truncate">{event.asset_name}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {hasPhotos && <Camera className="h-3 w-3 text-gray-400" />}
            <span className="text-xs text-gray-500">
              {new Date(event.occurred_at).toLocaleDateString("fr-CH")}{" "}
              {new Date(event.occurred_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
            </span>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </div>
        </div>
        {event.km_value != null && (
          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            <Gauge className="h-3 w-3" />
            {event.km_value.toLocaleString("fr-CH")} km
          </div>
        )}
      </button>

      {expanded && hasPhotos && (
        <div className="px-4 pb-4 space-y-2 border-t pt-3">
          {event.photos.filter((p) => p.category === "KM").length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-blue-600 flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Compteur KM
              </div>
              <div className="flex gap-2 flex-wrap">
                {event.photos.filter((p) => p.category === "KM").map((p) => (
                  <img key={p.id} src={photoUrl(p.url)} alt="KM" className="h-16 w-16 object-cover rounded-lg cursor-pointer border-2 border-blue-200" onClick={() => onPhotoClick(photoUrl(p.url))} />
                ))}
              </div>
            </div>
          )}

          {event.photos.filter((p) => p.category === "STATE").length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                <Camera className="h-3 w-3" /> Etat
              </div>
              <div className="flex gap-2 flex-wrap">
                {event.photos.filter((p) => p.category === "STATE").map((p) => (
                  <img key={p.id} src={photoUrl(p.url)} alt="Etat" className="h-16 w-16 object-cover rounded-lg cursor-pointer border" onClick={() => onPhotoClick(photoUrl(p.url))} />
                ))}
              </div>
            </div>
          )}

          {(event.photos.filter((p) => p.category === "DAMAGE").length > 0 || event.damage_description) && (
            <div className="space-y-1 bg-red-50 rounded-lg p-2">
              <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Dommage
              </div>
              {event.damage_description && <p className="text-xs text-red-600">{event.damage_description}</p>}
              <div className="flex gap-2 flex-wrap">
                {event.photos.filter((p) => p.category === "DAMAGE").map((p) => (
                  <img key={p.id} src={photoUrl(p.url)} alt="Dommage" className="h-16 w-16 object-cover rounded-lg cursor-pointer border-2 border-red-200" onClick={() => onPhotoClick(photoUrl(p.url))} />
                ))}
              </div>
            </div>
          )}

          {event.notes && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">{event.notes}</div>
          )}
        </div>
      )}
    </div>
  );
}
