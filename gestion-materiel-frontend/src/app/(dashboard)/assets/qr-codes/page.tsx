"use client";

import { useEffect, useState, useRef } from "react";
import { listAssetsWithAssignee, fetchQrCodeBlob, type AssetOutWithAssignee } from "@/lib/api/assets";
import { RequireAuth } from "@/components/app/RequireAuth";
import { Printer, Loader2, ArrowLeft, Filter, CheckSquare, Square, MinusSquare } from "lucide-react";
import Link from "next/link";

type QrItem = {
  asset: AssetOutWithAssignee;
  qrUrl: string | null;
};

function QrCodesPrintPage() {
  const [items, setItems] = useState<QrItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "VEHICLE" | "EPI">("ALL");
  const [loadingQr, setLoadingQr] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  // Load all assets
  useEffect(() => {
    setLoading(true);
    listAssetsWithAssignee({ limit: 200 })
      .then(async (res) => {
        const assets = res.data;
        const initial: QrItem[] = assets.map((a) => ({ asset: a, qrUrl: null }));
        setItems(initial);
        setLoading(false);

        // Load QR codes in parallel (batches of 5)
        setLoadingQr(assets.length);
        const batchSize = 5;
        for (let i = 0; i < assets.length; i += batchSize) {
          const batch = assets.slice(i, i + batchSize);
          const urls = await Promise.allSettled(
            batch.map((a) => fetchQrCodeBlob(a.public_id)),
          );
          setItems((prev) => {
            const next = [...prev];
            batch.forEach((a, j) => {
              const idx = i + j;
              const result = urls[j];
              next[idx] = {
                ...next[idx],
                qrUrl: result.status === "fulfilled" ? result.value : null,
              };
            });
            return next;
          });
          setLoadingQr((prev) => Math.max(0, prev - batch.length));
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = items.filter(
    (item) => filter === "ALL" || item.asset.category === filter,
  );

  const filteredIds = filtered.map((i) => i.asset.id);
  const allFilteredSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someFilteredSelected = filteredIds.some((id) => selected.has(id));
  const hasSelection = selected.size > 0;

  // Items to print: selected only, or all filtered if none selected
  const printItems = hasSelection
    ? filtered.filter((i) => selected.has(i.asset.id))
    : filtered;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allFilteredSelected) {
      // Deselect all filtered
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all filtered
      setSelected((prev) => {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelected(new Set());

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#6C5CE7]" />
        <p className="text-sm text-gray-500">Chargement des matériels…</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden mb-6 space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/assets"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">QR Codes — Impression</h1>
            <p className="text-sm text-gray-500 mt-1">
              {hasSelection ? (
                <>{selected.size} sélectionné{selected.size > 1 ? "s" : ""} sur {filtered.length}</>
              ) : (
                <>{filtered.length} matériel{filtered.length > 1 ? "s" : ""}</>
              )}
              {loadingQr > 0 && ` • ${loadingQr} QR en cours…`}
            </p>
          </div>

          <button
            onClick={handlePrint}
            disabled={loadingQr > 0}
            className="inline-flex items-center gap-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] disabled:bg-gray-300 text-white px-5 py-2.5 text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            Imprimer {hasSelection ? `(${selected.size})` : "tout"}
          </button>
        </div>

        {/* Filter + selection controls */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            {(["ALL", "VEHICLE", "EPI"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f
                    ? "bg-[#6C5CE7] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {f === "ALL" ? "Tout" : f === "VEHICLE" ? "Véhicules" : "EPI"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
            >
              {allFilteredSelected ? (
                <CheckSquare className="h-3.5 w-3.5 text-[#6C5CE7]" />
              ) : someFilteredSelected ? (
                <MinusSquare className="h-3.5 w-3.5 text-[#6C5CE7]" />
              ) : (
                <Square className="h-3.5 w-3.5" />
              )}
              {allFilteredSelected ? "Tout désélectionner" : "Tout sélectionner"}
            </button>

            {hasSelection && (
              <button
                onClick={clearSelection}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Effacer ({selected.size})
              </button>
            )}
          </div>
        </div>
      </div>

      {/* QR Grid — printable */}
      <div
        ref={printRef}
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 print:grid-cols-3 print:gap-2"
      >
        {filtered.map(({ asset, qrUrl }) => {
          const isSelected = selected.has(asset.id);
          // In print mode, CSS hides non-selected items
          return (
            <div
              key={asset.id}
              data-selected={isSelected || !hasSelection ? "true" : "false"}
              onClick={() => toggleSelect(asset.id)}
              className={`relative border rounded-xl p-3 flex flex-col items-center text-center bg-white cursor-pointer transition-all print:rounded-none print:border-gray-300 print:p-2 print:break-inside-avoid print:cursor-default ${
                isSelected
                  ? "border-[#6C5CE7] ring-2 ring-[#6C5CE7]/30 shadow-md"
                  : hasSelection
                    ? "opacity-50 hover:opacity-80"
                    : "hover:border-gray-300 hover:shadow-sm"
              }`}
            >
              {/* Selection indicator */}
              <div className="absolute top-2 left-2 print:hidden">
                {isSelected ? (
                  <CheckSquare className="h-4 w-4 text-[#6C5CE7]" />
                ) : (
                  <Square className="h-4 w-4 text-gray-300" />
                )}
              </div>

              {/* QR Code */}
              <div className="w-28 h-28 flex items-center justify-center print:w-24 print:h-24">
                {qrUrl ? (
                  <img src={qrUrl} alt={`QR ${asset.name}`} className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-gray-100 rounded-lg flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="mt-2 space-y-0.5 w-full">
                <p className="text-xs font-bold text-gray-900 truncate">{asset.name}</p>
                {asset.plate && (
                  <p className="text-[10px] text-gray-500 font-medium">{asset.plate}</p>
                )}
                {asset.ref && (
                  <p className="text-[10px] text-gray-400">Réf: {asset.ref}</p>
                )}
                <p className="text-[10px] text-gray-400">
                  {asset.category === "VEHICLE" ? "🛵" : "🛡️"}{" "}
                  {asset.category === "VEHICLE" ? "Véhicule" : asset.epi_type || "EPI"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:grid-cols-3,
          .print\\:grid-cols-3 * {
            visibility: visible;
          }
          .print\\:grid-cols-3 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          /* Hide non-selected items when there is a selection */
          .print\\:grid-cols-3 [data-selected="false"] {
            display: none !important;
          }
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <RequireAuth>
      <QrCodesPrintPage />
    </RequireAuth>
  );
}
