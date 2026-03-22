"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireRole } from "@/components/app/RequireRole";
import { listEvents, type EventOut } from "@/lib/api/events";
import { listAssetsWithAssignee, type AssetOutWithAssignee } from "@/lib/api/assets";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Car, User, Clock, Gauge, Camera, X, AlertTriangle } from "lucide-react";

export default function VehicleLookupPage() {
  return (
    <RequireAuth>
      <RequireRole allow={["ADMIN", "MANAGER"]}>
        <VehicleLookupClient />
      </RequireRole>
    </RequireAuth>
  );
}

function VehicleLookupClient() {
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 10);
  });
  const [time, setTime] = useState("12:00");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [results, setResults] = useState<VehicleResult[]>([]);
  const [vehicles, setVehicles] = useState<AssetOutWithAssignee[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Load all vehicles on mount
  useEffect(() => {
    listAssetsWithAssignee({ category: "VEHICLE", limit: 200 })
      .then((res) => setVehicles(res.data))
      .catch(() => {});
  }, []);

  type VehicleResult = {
    vehicle: AssetOutWithAssignee;
    driver: string | null;
    driverCode: string | null;
    checkInEvent: EventOut | null; // prise
    checkOutEvent: EventOut | null; // retour
    inUse: boolean;
  };

  const handleSearch = async () => {
    if (!date) return;
    setLoading(true);
    setSearched(true);

    try {
      // Build datetime range: from start of day to end of day
      const searchDateTime = new Date(`${date}T${time || "12:00"}:00`);
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59`);

      // Get all CHECK_IN and CHECK_OUT events for that day
      const [checkIns, checkOuts] = await Promise.all([
        listEvents({
          event_type: "CHECK_IN",
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          limit: 200,
        }),
        listEvents({
          event_type: "CHECK_OUT",
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
          limit: 200,
        }),
      ]);

      const allEvents = [...checkIns.data, ...checkOuts.data];

      // For each vehicle, determine who had it at the searched time
      const vehicleResults: VehicleResult[] = [];

      for (const v of vehicles) {
        const vehicleEvents = allEvents
          .filter((e) => e.asset_id === v.id)
          .sort((a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime());

        if (vehicleEvents.length === 0) continue;

        // Find the last CHECK_IN before or at the search time
        const checkInsBefore = vehicleEvents.filter(
          (e) => e.event_type === "CHECK_IN" && new Date(e.occurred_at) <= searchDateTime
        );
        const lastCheckIn = checkInsBefore.length > 0 ? checkInsBefore[checkInsBefore.length - 1] : null;

        // Find the first CHECK_OUT after that CHECK_IN
        const checkOutAfter = lastCheckIn
          ? vehicleEvents.find(
              (e) =>
                e.event_type === "CHECK_OUT" &&
                new Date(e.occurred_at) > new Date(lastCheckIn.occurred_at)
            )
          : null;

        // Vehicle was in use at search time if there's a CHECK_IN without a subsequent CHECK_OUT before search time
        const wasReturned = checkOutAfter && new Date(checkOutAfter.occurred_at) <= searchDateTime;
        const inUse = !!lastCheckIn && !wasReturned;

        if (lastCheckIn || checkOutAfter) {
          vehicleResults.push({
            vehicle: v,
            driver: lastCheckIn?.employee_name ?? null,
            driverCode: lastCheckIn?.employee_code ?? null,
            checkInEvent: lastCheckIn,
            checkOutEvent: checkOutAfter ?? null,
            inUse,
          });
        }
      }

      // Sort: in-use vehicles first, then by time
      vehicleResults.sort((a, b) => {
        if (a.inUse && !b.inUse) return -1;
        if (!a.inUse && b.inUse) return 1;
        return 0;
      });

      setResults(vehicleResults);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const photoUrl = (p: { url: string }) => `${config.apiBaseUrl}${p.url}`;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Search className="h-6 w-6" style={{ color: "#6C5CE7" }} />
          Recherche véhicule
        </h1>
        <p className="text-sm text-muted-foreground">
          Retrouvez quel véhicule était utilisé et par qui, à une date et heure précise
          (contraventions, incidents...)
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Heure (optionnel)</label>
            <Input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={loading || !date}
              className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white gap-2"
            >
              <Search className="h-4 w-4" />
              {loading ? "Recherche..." : "Rechercher"}
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">
            {results.length === 0
              ? "Aucun véhicule utilisé ce jour"
              : `${results.length} véhicule(s) utilisé(s) le ${new Date(date).toLocaleDateString("fr-CH")}`}
          </h2>

          <div className="space-y-3">
            {results.map((r) => (
              <div
                key={r.vehicle.id}
                className={`rounded-2xl border p-4 space-y-3 transition-colors ${
                  r.inUse
                    ? "bg-blue-50/50 border-blue-200"
                    : "bg-white border-gray-200"
                }`}
              >
                {/* Vehicle header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center">
                      <Car className="h-5 w-5 text-[#6C5CE7]" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.vehicle.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {r.vehicle.plate ?? "Pas de plaque"}
                        {r.vehicle.model_name && ` \u2022 ${r.vehicle.model_name}`}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className={`flex-shrink-0 ${
                      r.inUse
                        ? "bg-blue-100 text-blue-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {r.inUse ? `En circulation \u00e0 ${time || "12:00"}` : "Rendu"}
                  </Badge>
                </div>

                {/* Driver info */}
                {r.driver && (
                  <div className="flex items-center gap-2 rounded-xl bg-gray-50 p-3">
                    <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium">{r.driver}</span>
                      {r.driverCode && (
                        <span className="text-muted-foreground ml-1">({r.driverCode})</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="grid gap-2 sm:grid-cols-2">
                  {/* CHECK_IN (prise) */}
                  {r.checkInEvent && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-blue-600" />
                        <span className="font-medium text-blue-700">
                          Prise \u00e0 {formatTime(r.checkInEvent.occurred_at)}
                        </span>
                      </div>
                      {r.checkInEvent.km_value != null && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Gauge className="h-3 w-3" />
                          {r.checkInEvent.km_value.toLocaleString("fr-CH")} km
                        </div>
                      )}
                      {r.checkInEvent.notes && (
                        <div className="text-xs text-muted-foreground">{r.checkInEvent.notes}</div>
                      )}
                      {r.checkInEvent.damage_description && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {r.checkInEvent.damage_description}
                        </div>
                      )}
                      {/* Photos */}
                      {r.checkInEvent.photos?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {r.checkInEvent.photos.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setLightbox(photoUrl(p))}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-colors"
                            >
                              <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* CHECK_OUT (retour) */}
                  {r.checkOutEvent && (
                    <div className="rounded-xl border border-green-200 bg-green-50/50 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-green-600" />
                        <span className="font-medium text-green-700">
                          Retour \u00e0 {formatTime(r.checkOutEvent.occurred_at)}
                        </span>
                      </div>
                      {r.checkOutEvent.km_value != null && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Gauge className="h-3 w-3" />
                          {r.checkOutEvent.km_value.toLocaleString("fr-CH")} km
                        </div>
                      )}
                      {r.checkOutEvent.notes && (
                        <div className="text-xs text-muted-foreground">{r.checkOutEvent.notes}</div>
                      )}
                      {r.checkOutEvent.damage_description && (
                        <div className="flex items-start gap-1.5 text-xs text-red-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          {r.checkOutEvent.damage_description}
                        </div>
                      )}
                      {r.checkOutEvent.photos?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {r.checkOutEvent.photos.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setLightbox(photoUrl(p))}
                              className="w-10 h-10 rounded-lg overflow-hidden border border-green-200 hover:border-green-400 transition-colors"
                            >
                              <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* KM difference */}
                {r.checkInEvent?.km_value != null && r.checkOutEvent?.km_value != null && (
                  <div className="text-xs text-center text-muted-foreground">
                    Distance parcourue : <span className="font-medium text-foreground">{(r.checkOutEvent.km_value - r.checkInEvent.km_value).toLocaleString("fr-CH")} km</span>
                  </div>
                )}
              </div>
            ))}
          </div>
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
    </div>
  );
}
