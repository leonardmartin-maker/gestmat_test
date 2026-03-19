"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/app/QrScanner";
import { ScanLine } from "lucide-react";

export default function EmployeeScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(true);

  const handleScan = useCallback(
    (publicId: string) => {
      setScanning(false);
      router.push(`/e/${publicId}`);
    },
    [router],
  );

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#6C5CE7]/10">
          <ScanLine className="h-6 w-6 text-[#6C5CE7]" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Scanner un QR code</h2>
        <p className="text-sm text-gray-500">
          Dirigez la caméra vers le QR code du matériel
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border p-4">
        <QrScanner onScan={handleScan} scanning={scanning} />
      </div>

      {!scanning && (
        <button
          onClick={() => setScanning(true)}
          className="w-full rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white py-3 text-sm font-medium transition-colors"
        >
          Scanner à nouveau
        </button>
      )}
    </div>
  );
}
