"use client";

import { useEffect, useRef } from "react";

function extractPublicId(decoded: string): string {
  try {
    const url = new URL(decoded);
    // New format: /e/{publicId}
    const pathMatch = url.pathname.match(/^\/e\/([a-f0-9]+)$/);
    if (pathMatch) return pathMatch[1];
    // Legacy format: /scan?id={publicId}
    const id = url.searchParams.get("id");
    if (id) return id;
  } catch {
    // not a URL — treat raw text as public_id
  }
  return decoded.trim();
}

type Props = {
  onScan: (publicId: string) => void;
  scanning: boolean;
};

export function QrScanner({ onScan, scanning }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);
  const scannedRef = useRef(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!scanning || !containerRef.current) return;

    scannedRef.current = false;
    startedRef.current = false;
    let stopped = false;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");

      if (stopped) return;

      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (scannedRef.current) return;
            scannedRef.current = true;
            const publicId = extractPublicId(decodedText);
            onScan(publicId);
          },
          () => {} // ignore scan failures
        );
        if (!stopped) {
          startedRef.current = true;
        } else {
          // Component unmounted while starting — clean up now
          try { await scanner.stop(); } catch {}
          try { scanner.clear(); } catch {}
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();

    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s && startedRef.current) {
        s.stop()
          .then(() => { try { s.clear(); } catch {} })
          .catch(() => { try { s.clear(); } catch {} });
        scannerRef.current = null;
      } else if (s) {
        // Scanner exists but hasn't fully started — just clear
        try { s.clear(); } catch {}
        scannerRef.current = null;
      }
    };
  }, [scanning, onScan]);

  if (!scanning) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        id="qr-reader"
        ref={containerRef}
        className="w-full max-w-sm overflow-hidden rounded-lg"
      />
      <p className="text-sm text-muted-foreground">
        Placez le QR code devant la caméra
      </p>
    </div>
  );
}
