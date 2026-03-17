"use client";

import { useEffect, useRef } from "react";

function extractPublicId(decoded: string): string {
  try {
    const url = new URL(decoded);
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

  useEffect(() => {
    if (!scanning || !containerRef.current) return;

    scannedRef.current = false;
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
      } catch (err) {
        console.error("Camera error:", err);
      }
    })();

    return () => {
      stopped = true;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {});
        s.clear();
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
