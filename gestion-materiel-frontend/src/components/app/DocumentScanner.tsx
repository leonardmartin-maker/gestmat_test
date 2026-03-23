"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, SwitchCamera, Loader2, ZoomIn, ZoomOut } from "lucide-react";

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

export function DocumentScanner({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);

  const startCamera = useCallback(async (facing: "environment" | "user") => {
    // Stop any existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setReady(true);
        };
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, startCamera]);

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Capture at full video resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    // Flash effect
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    // Convert to file
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });

        // Stop camera
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture]);

  const handleCancel = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/70 to-transparent">
        <button
          onClick={handleCancel}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <X className="h-5 w-5 text-white" />
        </button>
        <div className="text-white text-sm font-medium">Scanner le ticket</div>
        <button
          onClick={handleSwitchCamera}
          className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
        >
          <SwitchCamera className="h-5 w-5 text-white" />
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative overflow-hidden">
        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Loading overlay */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center space-y-3">
              <Camera className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="text-white text-sm">{error}</p>
              <button
                onClick={handleCancel}
                className="rounded-xl bg-white/20 text-white px-4 py-2 text-sm"
              >
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Document frame overlay */}
        {ready && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Semi-transparent borders */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Clear center area (receipt shape) */}
            <div
              className="absolute left-[8%] right-[8%] top-[15%] bottom-[25%] bg-transparent"
              style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
                borderRadius: "16px",
              }}
            />
            {/* Corner indicators */}
            <FrameCorners />
            {/* Guide text */}
            <div className="absolute bottom-[18%] left-0 right-0 text-center">
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">
                Placez le ticket dans le cadre
              </span>
            </div>
          </div>
        )}

        {/* Flash effect */}
        {flash && (
          <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Capture button */}
      {ready && (
        <div className="relative z-10 flex items-center justify-center py-6 bg-gradient-to-t from-black/70 to-transparent">
          <button
            onClick={handleCapture}
            className="w-18 h-18 rounded-full border-4 border-white flex items-center justify-center active:scale-95 transition-transform"
            style={{ width: 72, height: 72 }}
          >
            <div className="w-14 h-14 rounded-full bg-white" style={{ width: 56, height: 56 }} />
          </button>
        </div>
      )}
    </div>
  );
}

/* Corner frame indicators */
function FrameCorners() {
  const cornerStyle = "absolute w-6 h-6 border-white";
  return (
    <>
      {/* Top-left */}
      <div
        className={cornerStyle}
        style={{
          left: "8%",
          top: "15%",
          borderTopWidth: 3,
          borderLeftWidth: 3,
          borderTopLeftRadius: 16,
        }}
      />
      {/* Top-right */}
      <div
        className={cornerStyle}
        style={{
          right: "8%",
          top: "15%",
          borderTopWidth: 3,
          borderRightWidth: 3,
          borderTopRightRadius: 16,
        }}
      />
      {/* Bottom-left */}
      <div
        className={cornerStyle}
        style={{
          left: "8%",
          bottom: "25%",
          borderBottomWidth: 3,
          borderLeftWidth: 3,
          borderBottomLeftRadius: 16,
        }}
      />
      {/* Bottom-right */}
      <div
        className={cornerStyle}
        style={{
          right: "8%",
          bottom: "25%",
          borderBottomWidth: 3,
          borderRightWidth: 3,
          borderBottomRightRadius: 16,
        }}
      />
    </>
  );
}
