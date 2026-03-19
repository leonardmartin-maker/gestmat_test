"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { scanAsset, type AssetOut } from "@/lib/api/assets";
import { RequireAuth } from "@/components/app/RequireAuth";
import { QrScanner } from "@/components/app/QrScanner";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";
import { StatusBadge } from "@/components/app/StatusBadge";
import { Button } from "@/components/ui/button";
import { QrCode, RefreshCw, ArrowRight } from "lucide-react";

type State = "scanning" | "loading" | "loaded" | "error";

function ScanContent() {
  const searchParams = useSearchParams();

  const [state, setState] = useState<State>("scanning");
  const [asset, setAsset] = useState<AssetOut | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (publicId: string) => {
    setState("loading");
    setError(null);
    try {
      const a = await scanAsset(publicId);
      setAsset(a);
      setState("loaded");
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || "Asset introuvable");
      setState("error");
    }
  }, []);

  // If opened via URL with ?id=... (e.g. native camera scan)
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      lookup(id);
    }
  }, [searchParams, lookup]);

  const rescan = () => {
    setAsset(null);
    setError(null);
    setState("scanning");
  };

  const onScan = useCallback(
    (publicId: string) => {
      lookup(publicId);
    },
    [lookup]
  );

  const refresh = () => {
    if (asset) lookup(asset.public_id);
  };

  const isVehicle = asset?.category === "VEHICLE";

  return (
    <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
      {/* Hero header */}
      <div className="flex flex-col items-center space-y-3">
        <div className="rounded-2xl bg-[#6C5CE7]/10 p-4">
          <QrCode className="h-12 w-12 text-[#6C5CE7]" />
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">Scanner un QR code</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scannez le code QR du matériel
          </p>
        </div>
      </div>

      {state === "scanning" && (
        <div className="rounded-2xl shadow-lg overflow-hidden">
          <QrScanner onScan={onScan} scanning />
        </div>
      )}

      {state === "loading" && (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <RefreshCw className="h-8 w-8 text-[#6C5CE7] animate-spin" />
          <span className="text-muted-foreground text-sm">Recherche…</span>
        </div>
      )}

      {state === "error" && (
        <div className="space-y-4 text-center">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
          <Button className="rounded-xl" onClick={rescan}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Rescanner
          </Button>
        </div>
      )}

      {state === "loaded" && asset && (
        <div className="space-y-4">
          <div className="rounded-2xl shadow-sm border-0 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">{asset.name}</div>
              <StatusBadge status={asset.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              <div>Catégorie</div>
              <div className="font-medium text-foreground">{asset.category}</div>
              {asset.ref && (
                <>
                  <div>Ref</div>
                  <div className="font-medium text-foreground">{asset.ref}</div>
                </>
              )}
              {asset.plate && (
                <>
                  <div>Plaque</div>
                  <div className="font-medium text-foreground">{asset.plate}</div>
                </>
              )}
              {asset.km_current != null && (
                <>
                  <div>KM</div>
                  <div className="font-medium text-foreground">
                    {asset.km_current.toLocaleString()}
                  </div>
                </>
              )}
              {asset.serial_number && (
                <>
                  <div>N° série</div>
                  <div className="font-medium text-foreground">
                    {asset.serial_number}
                  </div>
                </>
              )}
              {asset.epi_type && (
                <>
                  <div>Type EPI</div>
                  <div className="font-medium text-foreground">{asset.epi_type}</div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {asset.status === "AVAILABLE" && (
              <AssignAssetDialog
                publicId={asset.public_id}
                isVehicle={isVehicle}
                onDone={refresh}
              />
            )}
            {asset.status === "ASSIGNED" && (
              <ReturnAssetDialog
                publicId={asset.public_id}
                isVehicle={isVehicle}
                onDone={refresh}
              />
            )}
            {(asset.status === "MAINTENANCE" || asset.status === "RETIRED") && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {asset.status === "MAINTENANCE"
                  ? "Cet équipement est en maintenance."
                  : "Cet équipement est retiré."}
              </div>
            )}
            <Button variant="outline" className="rounded-xl" onClick={rescan}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Scanner un autre QR
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScanPage() {
  return (
    <RequireAuth>
      <ScanContent />
    </RequireAuth>
  );
}
