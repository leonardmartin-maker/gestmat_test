"use client";

import { useEffect, useState } from "react";
import { RequireAuth } from "@/components/app/RequireAuth";
import { createIncident, listMyIncidents, type IncidentOut } from "@/lib/api/incidents";
import { listAssetsWithAssignee, type AssetOutWithAssignee } from "@/lib/api/assets";
import { config } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Wrench,
  Camera,
  MapPin,
  Send,
  CheckCircle,
  Clock,
  Car,
  ChevronLeft,
  X,
  Loader2,
} from "lucide-react";
import Link from "next/link";

export default function IncidentPage() {
  return (
    <RequireAuth>
      <IncidentClient />
    </RequireAuth>
  );
}

function IncidentClient() {
  const [vehicles, setVehicles] = useState<AssetOutWithAssignee[]>([]);
  const [myIncidents, setMyIncidents] = useState<IncidentOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Form
  const [assetId, setAssetId] = useState<number | null>(null);
  const [incidentType, setIncidentType] = useState<"ACCIDENT" | "BREAKDOWN">("ACCIDENT");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  // Third party
  const [hasThirdParty, setHasThirdParty] = useState(false);
  const [tpName, setTpName] = useState("");
  const [tpPlate, setTpPlate] = useState("");
  const [tpInsurance, setTpInsurance] = useState("");
  const [tpPhone, setTpPhone] = useState("");
  const [tpIdPhotos, setTpIdPhotos] = useState<File[]>([]);
  const [tpVehiclePhotos, setTpVehiclePhotos] = useState<File[]>([]);

  useEffect(() => {
    Promise.all([
      listAssetsWithAssignee({ limit: 200 }),
      listMyIncidents(20).catch(() => ({ data: [] })),
    ]).then(([assetsRes, incidentsRes]) => {
      // Show assigned vehicles + all vehicles for the form
      const myVehicles = assetsRes.data.filter(
        (a) => a.status === "ASSIGNED" && a.category === "VEHICLE",
      );
      setVehicles(myVehicles.length > 0 ? myVehicles : assetsRes.data.filter((a) => a.category === "VEHICLE"));
      setMyIncidents(incidentsRes.data);
      setLoading(false);
    });
  }, []);

  const handlePhotoAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!assetId || !description.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("asset_id", String(assetId));
      fd.append("incident_type", incidentType);
      fd.append("description", description.trim());
      if (location.trim()) fd.append("location", location.trim());
      fd.append("has_third_party", String(hasThirdParty));
      if (hasThirdParty) {
        if (tpName.trim()) fd.append("third_party_name", tpName.trim());
        if (tpPlate.trim()) fd.append("third_party_plate", tpPlate.trim());
        if (tpInsurance.trim()) fd.append("third_party_insurance", tpInsurance.trim());
        if (tpPhone.trim()) fd.append("third_party_phone", tpPhone.trim());
        tpIdPhotos.forEach((p) => fd.append("third_party_id_photos", p));
        tpVehiclePhotos.forEach((p) => fd.append("third_party_vehicle_photos", p));
      }
      photos.forEach((p) => fd.append("photos", p));

      await createIncident(fd);
      setSuccess(true);
      setDescription("");
      setLocation("");
      setPhotos([]);
      setAssetId(null);
      setHasThirdParty(false);
      setTpName(""); setTpPlate(""); setTpInsurance(""); setTpPhone("");
      setTpIdPhotos([]); setTpVehiclePhotos([]);

      // Reload incidents
      const res = await listMyIncidents(20).catch(() => ({ data: [] }));
      setMyIncidents(res.data);

      setTimeout(() => setSuccess(false), 3000);
    } catch (e: any) {
      alert(e?.response?.data?.detail || "Erreur lors de la soumission");
    } finally {
      setSubmitting(false);
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

  const typeLabel = (t: string) => (t === "ACCIDENT" ? "Accident" : "Panne");
  const typeIcon = (t: string) =>
    t === "ACCIDENT" ? <AlertTriangle className="h-4 w-4" /> : <Wrench className="h-4 w-4" />;

  const photoUrl = (p: { url: string }) => `${config.apiBaseUrl}${p.url}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/e" className="inline-flex items-center gap-1 text-sm text-[#6C5CE7] hover:underline">
        <ChevronLeft className="h-4 w-4" /> Retour
      </Link>

      <h1 className="text-xl font-bold flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        Declarer un incident
      </h1>

      {/* Success */}
      {success && (
        <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <div className="font-medium text-green-800">Declaration envoyee !</div>
            <div className="text-sm text-green-600">Votre responsable a ete notifie.</div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border bg-white p-5 space-y-4 shadow-sm">
        {/* Type selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type d&apos;incident</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setIncidentType("ACCIDENT")}
              className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-colors ${
                incidentType === "ACCIDENT"
                  ? "border-red-500 bg-red-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <AlertTriangle className={`h-6 w-6 ${incidentType === "ACCIDENT" ? "text-red-500" : "text-gray-400"}`} />
              <span className={`text-sm font-medium ${incidentType === "ACCIDENT" ? "text-red-700" : "text-gray-600"}`}>
                Accident
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIncidentType("BREAKDOWN")}
              className={`rounded-xl border-2 p-4 flex flex-col items-center gap-2 transition-colors ${
                incidentType === "BREAKDOWN"
                  ? "border-amber-500 bg-amber-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Wrench className={`h-6 w-6 ${incidentType === "BREAKDOWN" ? "text-amber-500" : "text-gray-400"}`} />
              <span className={`text-sm font-medium ${incidentType === "BREAKDOWN" ? "text-amber-700" : "text-gray-600"}`}>
                Panne
              </span>
            </button>
          </div>
        </div>

        {/* Vehicle */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Vehicule</label>
          <select
            value={assetId ?? ""}
            onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : null)}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none"
          >
            <option value="">Selectionnez un vehicule</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} {v.plate ? `(${v.plate})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Decrivez l'incident en detail..."
            rows={4}
            className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:border-[#6C5CE7] focus:ring-1 focus:ring-[#6C5CE7] outline-none resize-none"
          />
        </div>

        {/* Location */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-gray-400" />
            Lieu (optionnel)
          </label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Adresse ou lieu de l'incident"
            className="rounded-xl"
          />
        </div>

        {/* Photos */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-1.5">
            <Camera className="h-3.5 w-3.5 text-gray-400" />
            Photos
          </label>
          <div className="flex flex-wrap gap-2">
            {photos.map((p, i) => (
              <div key={i} className="relative w-16 h-16">
                <img
                  src={URL.createObjectURL(p)}
                  alt=""
                  className="w-full h-full object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#6C5CE7] transition-colors">
              <Camera className="h-5 w-5 text-gray-400" />
              <input
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoAdd}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Third party section (accident only) */}
        {incidentType === "ACCIDENT" && (
          <div className="space-y-3 rounded-xl border-2 border-dashed border-gray-200 p-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={hasThirdParty}
                onChange={(e) => setHasThirdParty(e.target.checked)}
                className="rounded border-gray-300 text-[#6C5CE7] focus:ring-[#6C5CE7]"
              />
              <span className="text-sm font-medium">Partie adverse impliquee</span>
            </label>

            {hasThirdParty && (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Nom du conducteur</label>
                    <Input
                      value={tpName}
                      onChange={(e) => setTpName(e.target.value)}
                      placeholder="Jean Dupont"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Plaque</label>
                    <Input
                      value={tpPlate}
                      onChange={(e) => setTpPlate(e.target.value)}
                      placeholder="ZH 123456"
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Assurance</label>
                    <Input
                      value={tpInsurance}
                      onChange={(e) => setTpInsurance(e.target.value)}
                      placeholder="Nom assurance"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-500">Telephone</label>
                    <Input
                      value={tpPhone}
                      onChange={(e) => setTpPhone(e.target.value)}
                      placeholder="+41 79 ..."
                      className="rounded-xl"
                    />
                  </div>
                </div>

                {/* Third party ID photo */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Camera className="h-3 w-3" />
                    Carte d&apos;identite adverse
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tpIdPhotos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16">
                        <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover rounded-lg border border-blue-200" />
                        <button type="button" onClick={() => setTpIdPhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-blue-300 flex items-center justify-center cursor-pointer hover:border-blue-500 transition-colors">
                      <Camera className="h-5 w-5 text-blue-400" />
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => { if (e.target.files) setTpIdPhotos((prev) => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Third party vehicle photo */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                    <Car className="h-3 w-3" />
                    Vehicule adverse + plaque
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tpVehiclePhotos.map((p, i) => (
                      <div key={i} className="relative w-16 h-16">
                        <img src={URL.createObjectURL(p)} alt="" className="w-full h-full object-cover rounded-lg border border-amber-200" />
                        <button type="button" onClick={() => setTpVehiclePhotos((prev) => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-amber-300 flex items-center justify-center cursor-pointer hover:border-amber-500 transition-colors">
                      <Car className="h-5 w-5 text-amber-400" />
                      <input type="file" accept="image/*" capture="environment" multiple onChange={(e) => { if (e.target.files) setTpVehiclePhotos((prev) => [...prev, ...Array.from(e.target.files!)]); }} className="hidden" />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !assetId || !description.trim()}
          className="w-full rounded-xl bg-red-600 hover:bg-red-700 text-white gap-2 h-12"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          {submitting ? "Envoi en cours..." : "Envoyer la declaration"}
        </Button>
      </div>

      {/* My incidents history */}
      {myIncidents.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Mes declarations</h2>
          {myIncidents.map((inc) => (
            <div key={inc.id} className="rounded-2xl border bg-white p-4 space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {typeIcon(inc.incident_type)}
                  <span className="font-medium">{typeLabel(inc.incident_type)}</span>
                  <Badge variant="secondary" className={`text-xs ${statusColor(inc.status)}`}>
                    {statusLabel(inc.status)}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(inc.created_at).toLocaleDateString("fr-CH")}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Car className="h-3.5 w-3.5" />
                {inc.asset_name} {inc.asset_plate ? `(${inc.asset_plate})` : ""}
              </div>

              <p className="text-sm">{inc.description}</p>

              {inc.location && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {inc.location}
                </div>
              )}

              {inc.has_third_party && (
                <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 space-y-1">
                  <div className="text-xs font-semibold text-orange-700">Partie adverse</div>
                  {inc.third_party_name && <div className="text-xs">Nom : <span className="font-medium">{inc.third_party_name}</span></div>}
                  {inc.third_party_plate && <div className="text-xs">Plaque : <span className="font-medium">{inc.third_party_plate}</span></div>}
                  {inc.third_party_insurance && <div className="text-xs">Assurance : {inc.third_party_insurance}</div>}
                  {inc.third_party_phone && <div className="text-xs">Tel : {inc.third_party_phone}</div>}
                </div>
              )}

              {inc.photos.length > 0 && (
                <div className="space-y-2">
                  {inc.photos.filter((p) => p.category === "DAMAGE").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Photos dommages</div>
                      <div className="flex flex-wrap gap-1.5">
                        {inc.photos.filter((p) => p.category === "DAMAGE").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-12 h-12 rounded-lg overflow-hidden border hover:border-red-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {inc.photos.filter((p) => p.category === "THIRD_PARTY_ID").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-blue-600 mb-1">Carte identite adverse</div>
                      <div className="flex flex-wrap gap-1.5">
                        {inc.photos.filter((p) => p.category === "THIRD_PARTY_ID").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-12 h-12 rounded-lg overflow-hidden border border-blue-200 hover:border-blue-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {inc.photos.filter((p) => p.category === "THIRD_PARTY_VEHICLE").length > 0 && (
                    <div>
                      <div className="text-xs font-medium text-amber-600 mb-1">Vehicule adverse</div>
                      <div className="flex flex-wrap gap-1.5">
                        {inc.photos.filter((p) => p.category === "THIRD_PARTY_VEHICLE").map((p) => (
                          <button key={p.id} type="button" onClick={() => setLightbox(photoUrl(p))} className="w-12 h-12 rounded-lg overflow-hidden border border-amber-200 hover:border-amber-400 transition-colors">
                            <img src={photoUrl(p)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inc.resolution_notes && (
                <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-sm">
                  <div className="text-xs font-medium text-green-700 mb-1">Resolution</div>
                  <div className="text-green-800">{inc.resolution_notes}</div>
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
