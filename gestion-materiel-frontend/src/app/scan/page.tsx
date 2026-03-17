"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { scanAsset, type AssetOut } from "@/lib/api/assets";
import { RequireAuth } from "@/components/app/RequireAuth";
import { QrScanner } from "@/components/app/QrScanner";
import { AssignAssetDialog } from "@/components/app/AssignAssetDialog";
import { ReturnAssetDialog } from "@/components/app/ReturnAssetDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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
      <h1 className="text-xl font-semibold text-center">Scanner un QR code</h1>

      {state === "scanning" && <QrScanner onScan={onScan} scanning />}

      {state === "loading" && (
        <div className="text-center text-muted-foreground">Recherche…</div>
      )}

      {state === "error" && (
        <div className="space-y-4 text-center">
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
          <Button onClick={rescan}>Rescanner</Button>
        </div>
      )}

      {state === "loaded" && asset && (
        <div className="space-y-4">
          <div className="rounded-md border p-4 space-y-3">
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
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
                {asset.status === "MAINTENANCE"
                  ? "Cet équipement est en maintenance."
                  : "Cet équipement est retiré."}
              </div>
            )}
            <Button variant="outline" onClick={rescan}>
              Scanner un autre QR
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    AVAILABLE: "bg-green-100 text-green-800",
    ASSIGNED: "bg-blue-100 text-blue-800",
    MAINTENANCE: "bg-amber-100 text-amber-800",
    RETIRED: "bg-gray-100 text-gray-600",
  };
  return (
    <Badge className={colors[status] ?? ""} variant="secondary">
      {status}
    </Badge>
  );
}

export default function ScanPage() {
  return (
    <RequireAuth>
      <ScanContent />
    </RequireAuth>
  );
}
