"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getEmployee, getEmployeeAssets, updateEmployee, type EmployeeOut } from "@/lib/api/employees";
import { listEvents, type EventOut, type EventPhotoOut } from "@/lib/api/events";
import type { AssetOut } from "@/lib/api/assets";
import { useAuth } from "@/lib/auth/auth-context";
import { config } from "@/lib/config";

import {
  ArrowLeft,
  User,
  Mail,
  Hash,
  Package,
  History,
  Truck,
  Shield,
  Camera,
  AlertTriangle,
  Gauge,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  RefreshCw,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Photo URL helper                                                    */
/* ------------------------------------------------------------------ */
function photoUrl(url: string) {
  if (url.startsWith("http")) return url;
  return `${config.apiBaseUrl}${url}`;
}

/* ------------------------------------------------------------------ */
/*  Event type helpers                                                  */
/* ------------------------------------------------------------------ */
const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  CHECK_IN: { label: "Prise", color: "bg-blue-100 text-blue-700" },
  CHECK_OUT: { label: "Retour", color: "bg-emerald-100 text-emerald-700" },
  INSPECTION: { label: "Inspection", color: "bg-amber-100 text-amber-700" },
  ISSUE: { label: "Probleme", color: "bg-red-100 text-red-700" },
};

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

/* ------------------------------------------------------------------ */
/*  EventCard                                                           */
/* ------------------------------------------------------------------ */
function EventCard({ event }: { event: EventOut }) {
  const [expanded, setExpanded] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const e = EVENT_LABELS[event.event_type] ?? { label: event.event_type, color: "bg-gray-100 text-gray-700" };

  const statePhotos = event.photos.filter((p) => p.category === "STATE");
  const kmPhotos = event.photos.filter((p) => p.category === "KM");
  const damagePhotos = event.photos.filter((p) => p.category === "DAMAGE");
  const hasPhotos = event.photos.length > 0;

  return (
    <>
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="rounded-xl border bg-white hover:shadow-sm transition-shadow">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0 ${e.color}`}>
                {e.label}
              </span>
              <span className="font-medium text-sm text-gray-900 truncate">
                {event.asset_name ?? `Asset #${event.asset_id}`}
              </span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hasPhotos && <Camera className="h-3.5 w-3.5 text-gray-400" />}
              <span className="text-xs text-gray-500">
                {new Date(event.occurred_at).toLocaleDateString("fr-CH")}{" "}
                {new Date(event.occurred_at).toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
            </div>
          </div>

          {/* Quick info row */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
            {event.km_value != null && (
              <span className="flex items-center gap-1">
                <Gauge className="h-3 w-3" />
                {event.km_value.toLocaleString("fr-CH")} km
              </span>
            )}
            {event.notes && <span className="truncate">{event.notes}</span>}
          </div>
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            {/* KM Photos */}
            {kmPhotos.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-blue-700 flex items-center gap-1">
                  <Gauge className="h-3 w-3" /> Compteur KM
                </div>
                <div className="flex gap-2 flex-wrap">
                  {kmPhotos.map((p) => (
                    <img
                      key={p.id}
                      src={photoUrl(p.url)}
                      alt="Compteur KM"
                      className="h-20 w-20 object-cover rounded-lg cursor-pointer border-2 border-blue-200 hover:border-blue-400 transition-colors"
                      onClick={() => setLightboxSrc(photoUrl(p.url))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* State Photos */}
            {statePhotos.length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-gray-600 flex items-center gap-1">
                  <Camera className="h-3 w-3" /> Etat du materiel ({statePhotos.length})
                </div>
                <div className="flex gap-2 flex-wrap">
                  {statePhotos.map((p) => (
                    <img
                      key={p.id}
                      src={photoUrl(p.url)}
                      alt="Etat"
                      className="h-20 w-20 object-cover rounded-lg cursor-pointer border hover:border-[#6C5CE7] transition-colors"
                      onClick={() => setLightboxSrc(photoUrl(p.url))}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Damage */}
            {(damagePhotos.length > 0 || event.damage_description) && (
              <div className="space-y-1.5 rounded-lg bg-red-50 p-3">
                <div className="text-xs font-medium text-red-700 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Dommage signale
                </div>
                {event.damage_description && (
                  <p className="text-xs text-red-600">{event.damage_description}</p>
                )}
                {damagePhotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {damagePhotos.map((p) => (
                      <img
                        key={p.id}
                        src={photoUrl(p.url)}
                        alt="Dommage"
                        className="h-20 w-20 object-cover rounded-lg cursor-pointer border-2 border-red-200 hover:border-red-400 transition-colors"
                        onClick={() => setLightboxSrc(photoUrl(p.url))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes */}
            {event.notes && (
              <div className="text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                {event.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function EmployeeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { canWrite } = useAuth();
  const employeeId = Number(id);

  const [emp, setEmp] = useState<EmployeeOut | null>(null);
  const [assets, setAssets] = useState<AssetOut[]>([]);
  const [events, setEvents] = useState<EventOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);

  const EVENTS_LIMIT = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const [empData, empAssets, empEvents] = await Promise.all([
        getEmployee(employeeId),
        getEmployeeAssets(employeeId).catch(() => []),
        listEvents({ employee_id: employeeId, limit: EVENTS_LIMIT, offset: 0 }),
      ]);
      setEmp(empData);
      setAssets(empAssets);
      setEvents(empEvents.data);
      setEventsTotal(empEvents.meta.total);
      setEventsOffset(EVENTS_LIMIT);
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!employeeId || isNaN(employeeId)) return;
    load();
  }, [employeeId, load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const more = await listEvents({ employee_id: employeeId, limit: EVENTS_LIMIT, offset: eventsOffset });
      setEvents((prev) => [...prev, ...more.data]);
      setEventsOffset((prev) => prev + EVENTS_LIMIT);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  const toggleActive = async () => {
    if (!emp) return;
    try {
      await updateEmployee(emp.id, { active: !emp.active });
      await load();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || "Erreur");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-6 w-6 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  if (err || !emp) {
    return (
      <div className="space-y-4">
        <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6C5CE7]">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Link>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">{err || "Employe introuvable"}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/employees" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#6C5CE7] mb-2">
            <ArrowLeft className="h-4 w-4" /> Employes
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" style={{ color: "#6C5CE7" }} />
            {emp.first_name} {emp.last_name}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-gray-500">
            {emp.employee_code && (
              <span className="flex items-center gap-1">
                <Hash className="h-3.5 w-3.5" /> {emp.employee_code}
              </span>
            )}
            {emp.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {emp.email}
              </span>
            )}
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${emp.active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-600"}`}>
              {emp.active ? "Actif" : "Inactif"}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canWrite && (
            <button
              onClick={toggleActive}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                emp.active
                  ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                  : "bg-emerald-100 hover:bg-emerald-200 text-emerald-700"
              }`}
            >
              {emp.active ? <><UserX className="h-4 w-4" /> Desactiver</> : <><UserCheck className="h-4 w-4" /> Activer</>}
            </button>
          )}
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#6C5CE7]/10 hover:bg-[#6C5CE7]/20 text-[#6C5CE7] px-4 py-2 text-sm font-medium transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Rafraichir
          </button>
        </div>
      </div>

      {/* Assets in possession */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <h2 className="text-base font-bold flex items-center gap-2">
            <Package className="h-4 w-4 text-[#6C5CE7]" />
            Materiel en possession ({assets.length})
          </h2>
        </div>

        {assets.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">Aucun materiel assigne</div>
        ) : (
          <div className="divide-y">
            {assets.map((a) => (
              <Link
                key={a.id}
                href={`/assets/${a.id}`}
                className="flex items-center gap-3 p-4 hover:bg-purple-50/30 transition-colors"
              >
                <div className="flex-shrink-0">
                  {a.category === "VEHICLE" ? (
                    <Truck className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Shield className="h-5 w-5 text-green-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-gray-500">
                    {a.category === "VEHICLE" && a.plate ? a.plate : a.epi_type ?? a.category}
                    {a.km_current != null && ` | ${a.km_current.toLocaleString("fr-CH")} km`}
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-medium">
                  Assigne
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Event History */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <h2 className="text-base font-bold flex items-center gap-2">
            <History className="h-4 w-4 text-[#6C5CE7]" />
            Historique ({eventsTotal} evenements)
          </h2>
        </div>

        {events.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">Aucun evenement</div>
        ) : (
          <div className="p-4 space-y-2">
            {events.map((ev) => (
              <EventCard key={ev.id} event={ev} />
            ))}

            {eventsOffset < eventsTotal && (
              <div className="text-center pt-2">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {loadingMore ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  Charger plus ({eventsTotal - eventsOffset} restants)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
