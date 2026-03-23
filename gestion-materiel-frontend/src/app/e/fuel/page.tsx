"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { listAssetsWithAssignee, type AssetOutWithAssignee } from "@/lib/api/assets";
import {
  analyzeFuelReceipt,
  uploadFuelReceipt,
  listMyFuelReceipts,
  getMyFuelSummary,
  type FuelReceiptOut,
  type MyFuelSummary,
  type OcrPreview,
} from "@/lib/api/fuel-receipts";
import { config } from "@/lib/config";
import { PhotoEditor } from "@/components/app/PhotoEditor";
import { DocumentScanner } from "@/components/app/DocumentScanner";
import {
  Fuel,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  X,
  Eye,
  Send,
  RotateCcw,
  Sparkles,
  ScanLine,
  Camera,
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

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDING: { label: "En attente", icon: <Clock className="h-3.5 w-3.5" />, color: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "Approuvé", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "bg-emerald-100 text-emerald-700" },
  REJECTED: { label: "Refusé", icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-100 text-red-700" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

type FormStep = "upload" | "edit" | "preview" | "done";

export default function FuelReceiptPage() {
  const { user } = useAuth();
  const now = new Date();

  // Data
  const [vehicles, setVehicles] = useState<AssetOutWithAssignee[]>([]);
  const [receipts, setReceipts] = useState<FuelReceiptOut[]>([]);
  const [summary, setSummary] = useState<MyFuelSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [step, setStep] = useState<FormStep>("upload");
  const [selectedVehicle, setSelectedVehicle] = useState<number | "">("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [editedPhoto, setEditedPhoto] = useState<File | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // OCR preview state
  const [analyzing, setAnalyzing] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<OcrPreview | null>(null);
  const [ocrAmount, setOcrAmount] = useState("");
  const [ocrLiters, setOcrLiters] = useState("");
  const [ocrTva, setOcrTva] = useState("");
  const [ocrTvaNumber, setOcrTvaNumber] = useState("");
  const [ocrStation, setOcrStation] = useState("");
  const [ocrDate, setOcrDate] = useState("");
  const [notes, setNotes] = useState("");

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assetsRes, receiptsRes, summaryRes] = await Promise.all([
        listAssetsWithAssignee({ limit: 200 }),
        listMyFuelReceipts(30),
        getMyFuelSummary(now.getMonth() + 1, now.getFullYear()).catch(() => null),
      ]);
      const myVehicles = assetsRes.data.filter(
        (a) => a.status === "ASSIGNED" && a.category === "VEHICLE",
      );
      setVehicles(myVehicles);
      setReceipts(receiptsRes.data);
      setSummary(summaryRes);
      if (myVehicles.length === 1) setSelectedVehicle(myVehicles[0].id);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Scanner capture → go to edit
  const handleScanCapture = (file: File) => {
    setPhoto(file);
    setShowScanner(false);
    setStep("edit");
  };

  // Step 1 → Step 2: Go to photo editor
  const handleGoToEdit = () => {
    if (!photo || !selectedVehicle) return;
    setStep("edit");
  };

  // Step 2: Photo edited → analyze with OCR
  const handlePhotoEdited = async (file: File) => {
    setEditedPhoto(file);
    setStep("preview");
    setAnalyzing(true);
    setErrorMsg("");
    try {
      const result = await analyzeFuelReceipt(file);
      setOcrPreview(result);
      setOcrAmount(result.amount != null ? String(result.amount) : "");
      setOcrLiters(result.liters != null ? String(result.liters) : "");
      setOcrTva(result.tva_amount != null ? String(result.tva_amount) : "");
      setOcrTvaNumber(result.tva_number || "");
      setOcrStation(result.station_address || "");
      setOcrDate(result.date || new Date().toISOString().split("T")[0]);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Erreur lors de l'analyse OCR");
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 3: Confirm and submit
  const handleConfirm = async () => {
    if (!selectedVehicle || !ocrPreview) return;
    setSubmitting(true);
    setErrorMsg("");
    try {
      await uploadFuelReceipt({
        asset_id: Number(selectedVehicle),
        receipt_date: ocrDate,
        amount: ocrAmount ? Number(ocrAmount) : null,
        liters: ocrLiters ? Number(ocrLiters) : null,
        tva_amount: ocrTva ? Number(ocrTva) : null,
        tva_number: ocrTvaNumber.trim() || null,
        station_address: ocrStation.trim() || null,
        notes: notes.trim() || null,
        photo_path: ocrPreview.photo_path,
      });
      setSuccessMsg("Ticket soumis avec succès !");
      setStep("done");
      setTimeout(() => {
        resetForm();
        listMyFuelReceipts(30).then((res) => setReceipts(res.data));
        getMyFuelSummary(now.getMonth() + 1, now.getFullYear()).then(setSummary).catch(() => {});
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.detail || "Erreur lors de l'envoi");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setStep("upload");
    setOcrPreview(null);
    setEditedPhoto(null);
    setOcrAmount("");
    setOcrLiters("");
    setOcrTva("");
    setOcrTvaNumber("");
    setOcrStation("");
    setOcrDate("");
    setNotes("");
    setPhoto(null);
    setSuccessMsg("");
    setErrorMsg("");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        <p className="text-sm text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/e"
          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Fuel className="h-5 w-5 text-[#6C5CE7]" />
            Ticket carburant
          </h1>
          <p className="text-xs text-gray-500">Soumettez vos tickets pour remboursement</p>
        </div>
      </div>

      {/* Monthly summary */}
      {summary && (summary.approved_count > 0 || summary.pending_count > 0) && (
        <div className="rounded-2xl bg-gradient-to-r from-[#6C5CE7]/10 to-[#6C5CE7]/5 border border-[#6C5CE7]/20 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Récap {now.toLocaleString("fr-CH", { month: "long", year: "numeric" })}
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-[#6C5CE7]">
                {summary.total_amount.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">CHF approuvé</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-900">
                {summary.total_liters.toFixed(1)}
              </div>
              <div className="text-xs text-gray-500">Litres</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600">
                {summary.pending_count}
              </div>
              <div className="text-xs text-gray-500">En attente</div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 1: Take photo + select vehicle                            */}
      {/* ============================================================= */}
      {/* Document Scanner (full-screen overlay) */}
      {showScanner && (
        <DocumentScanner
          onCapture={handleScanCapture}
          onCancel={() => setShowScanner(false)}
        />
      )}

      {step === "upload" && (
        <div className="rounded-2xl bg-white shadow-sm border p-5 space-y-4">
          <h3 className="font-semibold text-gray-900">Nouveau ticket</h3>

          {/* Vehicle select */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Véhicule *</label>
            {vehicles.length === 0 ? (
              <p className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
                Aucun véhicule assigné. Prenez un véhicule pour soumettre des tickets.
              </p>
            ) : (
              <select
                value={selectedVehicle}
                onChange={(e) => setSelectedVehicle(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
              >
                <option value="">Sélectionner un véhicule</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} {v.plate ? `(${v.plate})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scan ticket button */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Photo du ticket *</label>
            {photo ? (
              <div className="relative rounded-xl border-2 border-[#6C5CE7]/30 bg-[#6C5CE7]/5 p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt="Ticket scanné"
                    className="h-20 w-16 rounded-lg object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{photo.name}</p>
                    <p className="text-xs text-gray-500">{(photo.size / 1024).toFixed(0)} Ko</p>
                  </div>
                  <button
                    onClick={() => setPhoto(null)}
                    className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-red-600" />
                  </button>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="mt-2 w-full rounded-lg bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                >
                  <Camera className="h-3.5 w-3.5" />
                  Rescanner
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowScanner(true)}
                disabled={!selectedVehicle}
                className="w-full rounded-xl border-2 border-dashed border-[#6C5CE7]/40 bg-[#6C5CE7]/5 hover:bg-[#6C5CE7]/10 disabled:bg-gray-50 disabled:border-gray-200 disabled:cursor-not-allowed py-8 text-sm font-medium transition-colors flex flex-col items-center justify-center gap-2"
              >
                <ScanLine className={`h-8 w-8 ${selectedVehicle ? "text-[#6C5CE7]" : "text-gray-300"}`} />
                <span className={selectedVehicle ? "text-[#6C5CE7]" : "text-gray-400"}>
                  Scanner le ticket
                </span>
                {!selectedVehicle && (
                  <span className="text-xs text-gray-400">Sélectionnez d'abord un véhicule</span>
                )}
              </button>
            )}
          </div>

          {/* Error */}
          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Next: edit photo */}
          <button
            onClick={handleGoToEdit}
            disabled={!selectedVehicle || !photo}
            className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Continuer
          </button>
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 2: Edit photo (rotate / crop)                             */}
      {/* ============================================================= */}
      {step === "edit" && photo && (
        <PhotoEditor
          file={photo}
          onConfirm={handlePhotoEdited}
          onCancel={() => setStep("upload")}
        />
      )}

      {/* ============================================================= */}
      {/* STEP 3: OCR Preview — validate / correct values                */}
      {/* ============================================================= */}
      {step === "preview" && (
        <div className="rounded-2xl bg-white shadow-sm border p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#6C5CE7]" />
              Vérifiez les valeurs
            </h3>
            <button
              onClick={resetForm}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Recommencer
            </button>
          </div>

          {/* Loading OCR */}
          {analyzing && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
              <p className="text-sm text-gray-500">Analyse IA en cours...</p>
            </div>
          )}

          {/* OCR Results */}
          {!analyzing && ocrPreview && (
            <>
              {/* Photo preview */}
              <div className="flex justify-center">
                <img
                  src={photoUrl(ocrPreview.photo_url)}
                  alt="Ticket"
                  className="h-40 rounded-xl object-contain border cursor-pointer"
                  onClick={() => setLightboxSrc(photoUrl(ocrPreview.photo_url))}
                />
              </div>

              {/* OCR info banner */}
              {ocrPreview.error ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                  {ocrPreview.error} — Remplissez manuellement.
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-700">
                  Valeurs extraites par IA — Vérifiez et corrigez si nécessaire.
                </div>
              )}

              {/* Editable fields */}
              <div className="space-y-3">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    Date du ticket *
                    {ocrPreview.date && (
                      <span className="ml-2 text-xs text-emerald-600 font-normal">
                        (OCR: {new Date(ocrPreview.date + "T00:00:00").toLocaleDateString("fr-CH")})
                      </span>
                    )}
                  </label>
                  <input
                    type="date"
                    value={ocrDate}
                    onChange={(e) => setOcrDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                  />
                </div>

                {/* Amount & Liters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Montant TTC *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ocrAmount}
                      onChange={(e) => setOcrAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">Litres</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ocrLiters}
                      onChange={(e) => setOcrLiters(e.target.value)}
                      placeholder="0.0"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                    />
                  </div>
                </div>

                {/* TVA */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">TVA CHF</label>
                    <input
                      type="number"
                      step="0.01"
                      value={ocrTva}
                      onChange={(e) => setOcrTva(e.target.value)}
                      placeholder="0.00"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">N° TVA</label>
                    <input
                      type="text"
                      value={ocrTvaNumber}
                      onChange={(e) => setOcrTvaNumber(e.target.value)}
                      placeholder="CHE-xxx.xxx.xxx"
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                    />
                  </div>
                </div>

                {/* Station address */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Station-service</label>
                  <input
                    type="text"
                    value={ocrStation}
                    onChange={(e) => setOcrStation(e.target.value)}
                    placeholder="Adresse de la station"
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">Notes (optionnel)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Remarques..."
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/40 focus:border-[#6C5CE7]"
                  />
                </div>
              </div>

              {/* Error */}
              {errorMsg && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {errorMsg}
                </div>
              )}

              {/* Confirm button */}
              <button
                onClick={handleConfirm}
                disabled={!ocrDate || submitting}
                className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Confirmer et soumettre
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* STEP 4: Success                                                 */}
      {/* ============================================================= */}
      {step === "done" && successMsg && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
          <p className="text-sm font-semibold text-emerald-700">{successMsg}</p>
        </div>
      )}

      {/* My receipts */}
      {receipts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Fuel className="h-4 w-4 text-[#6C5CE7]" />
            Mes tickets ({receipts.length})
          </h2>
          <div className="space-y-2">
            {receipts.map((r) => {
              const s = STATUS_LABELS[r.status] || STATUS_LABELS.PENDING;
              return (
                <div key={r.id} className="rounded-2xl bg-white shadow-sm border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={photoUrl(r.photo_url)}
                        alt=""
                        className="h-12 w-12 rounded-lg object-cover border cursor-pointer flex-shrink-0"
                        onClick={() => setLightboxSrc(photoUrl(r.photo_url))}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {r.amount != null ? `${r.amount.toFixed(2)} CHF` : "Montant à confirmer"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {r.asset_name} — {new Date(r.receipt_date).toLocaleDateString("fr-CH")}
                          {r.liters != null && ` — ${r.liters.toFixed(1)} L`}
                          {r.tva_amount != null && ` — TVA ${r.tva_amount.toFixed(2)}`}
                        </div>
                        {r.station_address && (
                          <div className="text-[10px] text-gray-400 truncate">📍 {r.station_address}</div>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium flex-shrink-0 ${s.color}`}>
                      {s.icon} {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
