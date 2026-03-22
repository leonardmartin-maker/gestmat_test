"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listFuelReceipts,
  reviewFuelReceipt,
  getFuelSummary,
  type FuelReceiptOut,
  type FuelSummaryEntry,
} from "@/lib/api/fuel-receipts";
import { listEmployees, type EmployeeOut } from "@/lib/api/employees";
import { config } from "@/lib/config";
import {
  Fuel,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Loader2,
  X,
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

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string; bg: string }> = {
  PENDING: { label: "En attente", icon: <Clock className="h-3.5 w-3.5" />, color: "text-amber-700", bg: "bg-amber-100" },
  APPROVED: { label: "Approuvé", icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-emerald-700", bg: "bg-emerald-100" },
  REJECTED: { label: "Refusé", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-700", bg: "bg-red-100" },
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function FuelReceiptsPage() {
  const now = new Date();
  const [receipts, setReceipts] = useState<FuelReceiptOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<number | "">("");
  const [monthFilter, setMonthFilter] = useState(now.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(now.getFullYear());
  const [employees, setEmployees] = useState<EmployeeOut[]>([]);

  // Summary
  const [summary, setSummary] = useState<FuelSummaryEntry[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  // Review action
  const [reviewing, setReviewing] = useState<number | null>(null);

  useEffect(() => {
    listEmployees({ limit: 200 }).then((res) => setEmployees(res.data)).catch(() => {});
  }, []);

  const loadReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { limit: 100 };
      if (statusFilter) params.status = statusFilter;
      if (employeeFilter) params.employee_id = employeeFilter;
      if (monthFilter) params.month = monthFilter;
      if (yearFilter) params.year = yearFilter;

      const [receiptsRes, summaryRes] = await Promise.all([
        listFuelReceipts(params),
        getFuelSummary(monthFilter, yearFilter).catch(() => ({ data: [] })),
      ]);
      setReceipts(receiptsRes.data);
      setTotal(receiptsRes.total);
      setSummary(summaryRes.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [statusFilter, employeeFilter, monthFilter, yearFilter]);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  const handleReview = async (id: number, status: "APPROVED" | "REJECTED") => {
    setReviewing(id);
    try {
      await reviewFuelReceipt(id, status);
      await loadReceipts();
    } catch {
      // silent
    } finally {
      setReviewing(null);
    }
  };

  return (
    <div className="space-y-6">
      {lightboxSrc && <Lightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Fuel className="h-6 w-6 text-[#6C5CE7]" />
          Tickets carburant
        </h1>
        <p className="text-sm text-gray-500 mt-1">Gestion des justificatifs de carburant</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7]/40"
        >
          <option value="">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="APPROVED">Approuvé</option>
          <option value="REJECTED">Refusé</option>
        </select>

        <select
          value={employeeFilter}
          onChange={(e) => setEmployeeFilter(e.target.value ? Number(e.target.value) : "")}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7]/40"
        >
          <option value="">Tous les employés</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name}
            </option>
          ))}
        </select>

        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(Number(e.target.value))}
          className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7]/40"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(2024, i).toLocaleString("fr-CH", { month: "long" })}
            </option>
          ))}
        </select>

        <input
          type="number"
          value={yearFilter}
          onChange={(e) => setYearFilter(Number(e.target.value))}
          min={2024}
          max={2030}
          className="w-20 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-[#6C5CE7]/40"
        />
      </div>

      {/* Summary toggle */}
      <button
        onClick={() => setShowSummary(!showSummary)}
        className="flex items-center gap-2 text-sm font-medium text-[#6C5CE7] hover:text-[#5A4BD1] transition-colors"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${showSummary ? "rotate-180" : ""}`} />
        Résumé mensuel ({summary.length} employé(s))
      </button>

      {showSummary && summary.length > 0 && (
        <div className="rounded-2xl bg-white shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Employé</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Tickets</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total CHF</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Total litres</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.employee_id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.employee_name}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.receipt_count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{s.total_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{s.total_liters.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipts list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="rounded-2xl bg-white shadow-sm border p-8 text-center text-gray-500">
          Aucun ticket pour cette période
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{total} ticket(s)</p>
          {receipts.map((r) => {
            const s = STATUS_CONFIG[r.status] || STATUS_CONFIG.PENDING;
            return (
              <div key={r.id} className="rounded-2xl bg-white shadow-sm border p-4">
                <div className="flex items-start gap-4">
                  <img
                    src={photoUrl(r.photo_url)}
                    alt=""
                    className="h-16 w-16 rounded-xl object-cover border cursor-pointer flex-shrink-0"
                    onClick={() => setLightboxSrc(photoUrl(r.photo_url))}
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-gray-900">
                        {r.amount != null ? `${r.amount.toFixed(2)} CHF` : "Montant à renseigner"}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.color}`}>
                        {s.icon} {s.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {r.employee_name} — {r.asset_name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(r.receipt_date).toLocaleDateString("fr-CH")}
                      {r.liters != null && ` — ${r.liters.toFixed(1)} L`}
                    </div>
                    {r.notes && <div className="text-xs text-gray-500 bg-gray-50 rounded p-1.5">{r.notes}</div>}
                  </div>
                </div>

                {/* Review actions for PENDING receipts */}
                {r.status === "PENDING" && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <button
                      onClick={() => handleReview(r.id, "APPROVED")}
                      disabled={reviewing === r.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-300 text-white py-2 text-sm font-medium transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Approuver
                    </button>
                    <button
                      onClick={() => handleReview(r.id, "REJECTED")}
                      disabled={reviewing === r.id}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-2 text-sm font-medium transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      Refuser
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
