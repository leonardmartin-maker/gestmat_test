"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  scanAsset,
  takeAsset,
  returnAsset,
  type EmployeeAssetOut,
} from "@/lib/api/employee-scan";
import { useAuth } from "@/lib/auth/auth-context";
import { PhotoCapture } from "@/components/app/PhotoCapture";
import {
  Loader2,
  PackageCheck,
  PackageX,
  Truck,
  ShieldCheck,
  ScanLine,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Status helpers                                                     */
/* ------------------------------------------------------------------ */

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: "Disponible", color: "bg-emerald-100 text-emerald-700" },
  ASSIGNED: { label: "Pris", color: "bg-amber-100 text-amber-700" },
  MAINTENANCE: { label: "En maintenance", color: "bg-blue-100 text-blue-700" },
  RETIRED: { label: "Retiré", color: "bg-gray-200 text-gray-600" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, color: "bg-gray-100 text-gray-600" };
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${s.color}`}>
      {s.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type Phase = "loading" | "loaded" | "submitting" | "success" | "error";

export default function EmployeeAssetPage() {
  const { publicId } = useParams<{ publicId: string }>();
  const { user } = useAuth();

  const [phase, setPhase] = useState<Phase>("loading");
  const [asset, setAsset] = useState<EmployeeAssetOut | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form — pre-fill employee_code from user profile if available
  const [employeeCode, setEmployeeCode] = useState(user?.employee_code ?? "");
  const [kmValue, setKmValue] = useState("");
  const [notes, setNotes] = useState("");

  // Photos état (obligatoire)
  const [statePhotos, setStatePhotos] = useState<File[]>([]);

  // Signalement dommage (optionnel)
  const [reportDamage, setReportDamage] = useState(false);
  const [damageDescription, setDamageDescription] = useState("");
  const [damagePhotos, setDamagePhotos] = useState<File[]>([]);

  // Stable callbacks for PhotoCapture (avoid re-renders resetting previews)
  const onStatePhotosChange = useCallback((files: File[]) => setStatePhotos(files), []);
  const onDamagePhotosChange = useCallback((files: File[]) => setDamagePhotos(files), []);

  // Fetch asset info
  useEffect(() => {
    if (!publicId) return;
    setPhase("loading");
    scanAsset(publicId)
      .then((a) => {
        setAsset(a);
        setPhase("loaded");
      })
      .catch((err) => {
        setErrorMsg(err?.response?.data?.detail || "Matériel introuvable");
        setPhase("error");
      });
  }, [publicId]);

  // Validation
  const isVehicle = asset?.category === "VEHICLE";
  const kmRequired = isVehicle; // KM obligatoire pour véhicules (prise ET retour)
  const photosValid = statePhotos.length >= 1;
  const kmValid = !kmRequired || (kmValue.trim() !== "" && Number(kmValue) >= 0);
  const damageValid = !reportDamage || damageDescription.trim().length > 0;
  const formValid = employeeCode.trim() !== "" && photosValid && kmValid && damageValid;

  // Actions
  const handleTake = async () => {
    if (!asset || !formValid) return;
    setPhase("submitting");
    setErrorMsg("");
    try {
      const result = await takeAsset({
        public_id: asset.public_id,
        employee_code: employeeCode.trim(),
        km_value: kmValue ? Number(kmValue) : null,
        notes: notes.trim() || null,
        damage_description: reportDamage && damageDescription.trim() ? damageDescription.trim() : null,
        state_photos: statePhotos,
        damage_photos: reportDamage ? damagePhotos : [],
      });
      setSuccessMsg(result.message);
      setAsset(result.asset);
      setPhase("success");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Erreur lors de la prise");
      setPhase("loaded");
    }
  };

  const handleReturn = async () => {
    if (!asset || !formValid) return;
    setPhase("submitting");
    setErrorMsg("");
    try {
      const result = await returnAsset({
        public_id: asset.public_id,
        employee_code: employeeCode.trim(),
        km_value: kmValue ? Number(kmValue) : null,
        notes: notes.trim() || null,
        damage_description: reportDamage && damageDescription.trim() ? damageDescription.trim() : null,
        state_photos: statePhotos,
        damage_photos: reportDamage ? damagePhotos : [],
      });
      setSuccessMsg(result.message);
      setAsset(result.asset);
      setPhase("success");
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Erreur lors du retour");
      setPhase("loaded");
    }
  };

  /* ---- Loading ---- */
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        <p className="text-sm text-gray-500">Chargement…</p>
      </div>
    );
  }

  /* ---- Error (asset not found) ---- */
  if (phase === "error" && !asset) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border p-6 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
        <p className="text-gray-700 font-medium">{errorMsg}</p>
        <Link
          href="/e"
          className="inline-block rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white px-6 py-2.5 text-sm font-medium transition-colors"
        >
          Scanner un autre QR
        </Link>
      </div>
    );
  }

  /* ---- Success ---- */
  if (phase === "success") {
    return (
      <div className="rounded-2xl bg-white shadow-sm border p-6 text-center space-y-4">
        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
        <p className="text-lg font-bold text-gray-900">{successMsg}</p>
        {asset && <StatusBadge status={asset.status} />}
        <div className="pt-2">
          <Link
            href="/e"
            className="inline-block rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white px-6 py-2.5 text-sm font-medium transition-colors"
          >
            Scanner un autre QR
          </Link>
        </div>
      </div>
    );
  }

  if (!asset) return null;

  const canTake = asset.status === "AVAILABLE";
  const canReturn = asset.status === "ASSIGNED";
  const locked = asset.status === "MAINTENANCE" || asset.status === "RETIRED";

  return (
    <div className="space-y-4">
      {/* ---- Asset card ---- */}
      <div className="rounded-2xl bg-white shadow-sm border p-5 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#6C5CE7]/10 flex items-center justify-center">
            {isVehicle ? (
              <Truck className="h-5 w-5 text-[#6C5CE7]" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-[#6C5CE7]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{asset.name}</h2>
            <p className="text-sm text-gray-500">
              {isVehicle ? "Véhicule" : "EPI"}
              {isVehicle && asset.plate && ` • ${asset.plate}`}
              {!isVehicle && asset.epi_type && ` • ${asset.epi_type}`}
            </p>
          </div>
          <StatusBadge status={asset.status} />
        </div>

        {isVehicle && asset.km_current != null && (
          <p className="text-sm text-gray-500">
            Compteur actuel : <span className="font-medium text-gray-700">{asset.km_current.toLocaleString()} km</span>
          </p>
        )}
      </div>

      {/* ---- Locked message ---- */}
      {locked && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto" />
          <p className="text-sm text-amber-800 font-medium">
            Ce matériel est {asset.status === "MAINTENANCE" ? "en maintenance" : "retiré du service"}.
            Contactez votre responsable.
          </p>
        </div>
      )}

      {/* ---- Action form ---- */}
      {(canTake || canReturn) && (
        <div className="rounded-2xl bg-white shadow-sm border p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">
            {canTake ? "Prendre ce matériel" : "Retourner ce matériel"}
          </h3>

          {/* Employee code */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Votre code employé *
            </label>
            {user?.employee_code ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <span className="font-medium text-emerald-700">{employeeCode}</span>
                <span className="text-emerald-600/70">— {user.full_name}</span>
              </div>
            ) : (
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="Ex: EMP001"
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                autoComplete="off"
              />
            )}
          </div>

          {/* KM (vehicles — obligatoire) */}
          {isVehicle && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">
                Kilométrage *
              </label>
              <input
                type="number"
                value={kmValue}
                onChange={(e) => setKmValue(e.target.value)}
                placeholder={asset.km_current != null ? String(asset.km_current) : "0"}
                min={0}
                className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7] ${
                  !kmValid && kmValue === "" ? "border-red-300" : "border-gray-300"
                }`}
              />
              {!kmValid && kmValue === "" && (
                <p className="text-xs text-red-500">Le kilométrage est obligatoire pour les véhicules</p>
              )}
            </div>
          )}

          {/* Photos état du matériel (obligatoire) */}
          <div className="space-y-1.5">
            <PhotoCapture
              label="Photos état du matériel"
              maxPhotos={5}
              required
              onChange={onStatePhotosChange}
            />
            {statePhotos.length === 0 && (
              <p className="text-xs text-red-500">Au moins une photo de l&#39;état est obligatoire</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">
              Notes (optionnel)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Remarques éventuelles…"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
            />
          </div>

          {/* ---- Signalement dommage (optionnel) ---- */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setReportDamage(!reportDamage)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                reportDamage
                  ? "bg-red-50 text-red-700 border-b border-red-200"
                  : "bg-gray-50 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <AlertTriangle className={`h-4 w-4 ${reportDamage ? "text-red-500" : "text-gray-400"}`} />
              Signaler un dommage
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
                reportDamage ? "bg-red-100 text-red-600" : "bg-gray-200 text-gray-500"
              }`}>
                {reportDamage ? "Actif" : "Optionnel"}
              </span>
            </button>

            {reportDamage && (
              <div className="p-4 space-y-3 bg-red-50/30">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Description du dommage *
                  </label>
                  <textarea
                    value={damageDescription}
                    onChange={(e) => setDamageDescription(e.target.value)}
                    rows={3}
                    placeholder="Décrivez le dommage constaté…"
                    className={`w-full rounded-xl border bg-white px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7] ${
                      reportDamage && !damageDescription.trim() ? "border-red-300" : "border-gray-300"
                    }`}
                  />
                  {reportDamage && !damageDescription.trim() && (
                    <p className="text-xs text-red-500">La description est obligatoire pour signaler un dommage</p>
                  )}
                </div>

                <PhotoCapture
                  label="Photos du dommage"
                  maxPhotos={5}
                  onChange={onDamagePhotosChange}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Submit */}
          {canTake && (
            <button
              onClick={handleTake}
              disabled={!formValid || phase === "submitting"}
              className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {phase === "submitting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageCheck className="h-4 w-4" />
              )}
              Prendre
            </button>
          )}

          {canReturn && (
            <button
              onClick={handleReturn}
              disabled={!formValid || phase === "submitting"}
              className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {phase === "submitting" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageX className="h-4 w-4" />
              )}
              Retourner
            </button>
          )}
        </div>
      )}

      {/* ---- Scan another ---- */}
      <div className="text-center pt-2">
        <Link
          href="/e"
          className="inline-flex items-center gap-2 text-sm text-[#6C5CE7] hover:text-[#5A4BD1] font-medium transition-colors"
        >
          <ScanLine className="h-4 w-4" />
          Scanner un autre QR
        </Link>
      </div>
    </div>
  );
}
