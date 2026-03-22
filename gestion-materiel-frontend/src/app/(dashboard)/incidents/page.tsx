"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { listIncidents, updateIncidentStatus, type IncidentOut } from "@/lib/api/incidents";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Wrench,
  Car,
  User,
  MapPin,
  Clock,
  CheckCircle,
  PlayCircle,
  X,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function IncidentsPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN", "MANAGER"]}>
        <IncidentsClient />
      </RequireRole>
    </RequireAuth>
  );
}

function IncidentsClient() {
  const [incidents, setIncidents] = useState<IncidentOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await listIncidents({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        incident_type: typeFilter !== "ALL" ? typeFilter : undefined,
        limit: 100,
      });
      setIncidents(res.data);
      setTotal(res.meta.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter, typeFilter]);

  const handleStatusUpdate = async (id: number, status: string, notes?: string) => {
    try {
      await updateIncidentStatus(id, status, notes);
      setResolvingId(null);
      setResolutionNotes("");
      load();
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur");
    }
  };

  const statusLabel = (s: string) => {
    if (s === "PENDING") return "En attente";
    if (s === "IN_PROGRESS") return "En cours";
    if (s === "RESOLVED") return "Resolu";
    return s;
  };

  const statusColor = (s: string) => {
    if (s === "PENDING") return "bg-amber-100 text-amber-700";
    if (s === "IN_PROGRESS") return "bg-blue-100 text-blue-700";
    if (s === "RESOLVED") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-700";
  };

  const typeIcon = (t: string) =>
    t === "ACCIDENT" ? <AlertTriangle className="h-4 w-4 text-red-500" /> : <Wrench className="h-4 w-4 text-amber-500" />;

  const photoUrl = (p: { url: string }) => `${config.apiBaseUrl}${p.url}`;

  const pendingCount = incidents.filter((i) => i.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <AlertTriangle className="h-6 w-6" style={{ color: "#6C5CE7" }} />
          Incidents
          {pendingCount > 0 && (
            <Badge variant="secondary" className="bg-red-100 text-red-700 text-sm">
              {pendingCount} en attente
            </Badge>
          )}
        </h1>
        <p className="text-sm text-muted-foreground">
          Declarations d&apos;accidents et pannes des employes
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les statuts</SelectItem>
            <SelectItem value="PENDING">En attente</SelectItem>
            <SelectItem value="IN_PROGRESS">En cours</SelectItem>
            <SelectItem value="RESOLVED">Resolu</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px] rounded-xl">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types</SelectItem>
            <SelectItem value="ACCIDENT">Accident</SelectItem>
            <SelectItem value="BREAKDOWN">Panne</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#6C5CE7]" />
        </div>
      ) : incidents.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          Aucun incident{statusFilter !== "ALL" || typeFilter !== "ALL" ? " avec ces filtres" : ""}
        </div>
      ) : (
        <div className="space-y-4">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className={`rounded-2xl border p-5 space-y-3 transition-colors ${
                inc.status === "PENDING"
                  ? "bg-amber-50/30 border-amber-200"
                  : inc.status === "IN_PROGRESS"
                  ? "bg-blue-50/30 border-blue-200"
                  : "bg-white"
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {typeIcon(inc.incident_type)}
                  <span className="font-semibold">
                    {inc.incident_type === "ACCIDENT" ? "Accident" : "Panne"}
                  </span>
                  <Badge variant="secondary" className={`text-xs ${statusColor(inc.status)}`}>
                    {statusLabel(inc.status)}
                  </Badge>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {new Date(inc.created_at).toLocaleString("fr-CH")}
                </div>
              </div>

              {/* Info */}
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="font-medium text-foreground">{inc.employee_name ?? "Inconnu"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Car className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{inc.asset_name} {inc.asset_plate ? `(${inc.asset_plate})` : ""}</span>
                </div>
              </div>

              <p className="text-sm">{inc.description}</p>

              {inc.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {inc.location}
                </div>
              )}

              {/* Third party */}
              {inc.has_third_party && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 space-y-1">
                  <div className="text-xs font-semibold text-orange-700">Partie adverse</div>
                  <div className="grid gap-1 sm:grid-cols-2 text-xs">
                    {inc.third_party_name && <div>Nom : <span className="font-medium">{inc.third_party_name}</span></div>}
                    {inc.third_party_plate && <div>Plaque : <span className="font-medium">{inc.third_party_plate}</span></div>}
                    {inc.third_party_insurance && <div>Assurance : {inc.third_party_insurance}</div>}
                    {inc.third_party_phone && <div>Tel : <a href={`tel:${inc.third_party_phone}`} className="text-blue-600 underline">{inc.third_party_phone}</a></div>}
                  </div>
                </div>
              )}

              {/* Photos by category */}
              {inc.photos.length > 0 && (
                <div className="space-y-2">
                  {inc.photos.filter((p) => p.category === "DAMAGE").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Photos dommages</div>
                      <div className="flex flex-wrap gap-2">
                        {inc.photos.filter((p) => p.category === "DAMAGE").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-16 h-16 rounded-lg overflow-hidden border hover:border-red-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {inc.photos.filter((p) => p.category === "THIRD_PARTY_ID").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-blue-600 mb-1">Carte identite adverse</div>
                      <div className="flex flex-wrap gap-2">
                        {inc.photos.filter((p) => p.category === "THIRD_PARTY_ID").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-16 h-16 rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {inc.photos.filter((p) => p.category === "THIRD_PARTY_VEHICLE").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-amber-600 mb-1">Vehicule adverse</div>
                      <div className="flex flex-wrap gap-2">
                        {inc.photos.filter((p) => p.category === "THIRD_PARTY_VEHICLE").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-16 h-16 rounded-lg overflow-hidden border border-amber-200 hover:border-amber-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution notes */}
              {inc.resolution_notes && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm">
                  <div className="text-xs font-medium text-green-700 mb-1">Resolution</div>
                  <div className="text-green-800">{inc.resolution_notes}</div>
                </div>
              )}

              {/* Actions */}
              {inc.status !== "RESOLVED" && (
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  {inc.status === "PENDING" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => handleStatusUpdate(inc.id, "IN_PROGRESS")}
                    >
                      <PlayCircle className="h-3.5 w-3.5" />
                      Prendre en charge
                    </Button>
                  )}

                  {resolvingId === inc.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Notes de resolution..."
                        className="flex-1 rounded-xl border border-gray-300 px-3 py-1.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none"
                      />
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleStatusUpdate(inc.id, "RESOLVED", resolutionNotes || undefined)}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Valider
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl"
                        onClick={() => { setResolvingId(null); setResolutionNotes(""); }}
                      >
                        Annuler
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl gap-1.5 text-green-600 border-green-300 hover:bg-green-50"
                      onClick={() => setResolvingId(inc.id)}
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                      Marquer resolu
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center"
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={lightbox}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
