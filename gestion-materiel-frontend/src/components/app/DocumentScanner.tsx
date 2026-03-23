"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, X, SwitchCamera, Loader2, Check } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type Point = { x: number; y: number };
type Quad = [Point, Point, Point, Point]; // TL, TR, BR, BL

type Props = {
  onCapture: (file: File) => void;
  onCancel: () => void;
};

/* ------------------------------------------------------------------ */
/*  Image Processing — lightweight edge detection pipeline              */
/* ------------------------------------------------------------------ */

const PROCESS_W = 240; // Low-res for speed

function getGrayscale(data: Uint8ClampedArray, len: number): Uint8Array {
  const g = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const j = i << 2;
    g[i] = (data[j] * 77 + data[j + 1] * 150 + data[j + 2] * 29) >> 8;
  }
  return g;
}

function blur(src: Uint8Array, w: number, h: number): Uint8Array {
  const o = new Uint8Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      o[i] =
        (src[i - w - 1] + (src[i - w] << 1) + src[i - w + 1] +
          (src[i - 1] << 1) + (src[i] << 2) + (src[i + 1] << 1) +
          src[i + w - 1] + (src[i + w] << 1) + src[i + w + 1]) >> 4;
    }
  }
  return o;
}

function otsu(gray: Uint8Array): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
  const total = gray.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, maxVar = 0, th = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const d = sumB / wB - (sum - sumB) / wF;
    const v = wB * wF * d * d;
    if (v > maxVar) { maxVar = v; th = t; }
  }
  return th;
}

function binaryThreshold(gray: Uint8Array, th: number): Uint8Array {
  const b = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) b[i] = gray[i] > th ? 1 : 0;
  return b;
}

// Morphological close (dilate then erode) to fill small gaps in the paper region
function morphClose(bin: Uint8Array, w: number, h: number, iterations = 2): Uint8Array {
  let cur = bin;
  // Dilate
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (cur[i] || cur[i - 1] || cur[i + 1] || cur[i - w] || cur[i + w]) next[i] = 1;
      }
    }
    cur = next;
  }
  // Erode
  for (let it = 0; it < iterations; it++) {
    const next = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        if (cur[i] && cur[i - 1] && cur[i + 1] && cur[i - w] && cur[i + w]) next[i] = 1;
      }
    }
    cur = next;
  }
  return cur;
}

// Connected component labeling — returns largest blob boundary
function largestBlobBoundary(bin: Uint8Array, w: number, h: number): Point[] | null {
  const labels = new Int32Array(w * h);
  let bestLabel = 0, bestArea = 0, nextLabel = 1;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      if (!bin[idx] || labels[idx]) continue;
      const label = nextLabel++;
      const stack = [idx];
      labels[idx] = label;
      let area = 0;
      while (stack.length) {
        const ci = stack.pop()!;
        area++;
        const cy = (ci / w) | 0, cx = ci % w;
        for (const [ny, nx] of [[cy - 1, cx], [cy + 1, cx], [cy, cx - 1], [cy, cx + 1]]) {
          if (ny >= 0 && ny < h && nx >= 0 && nx < w) {
            const ni = ny * w + nx;
            if (bin[ni] && !labels[ni]) { labels[ni] = label; stack.push(ni); }
          }
        }
      }
      if (area > bestArea) { bestArea = area; bestLabel = label; }
    }
  }

  if (bestArea < w * h * 0.06) return null; // Too small

  // Extract boundary pixels
  const boundary: Point[] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (labels[i] !== bestLabel) continue;
      if (labels[i - 1] !== bestLabel || labels[i + 1] !== bestLabel ||
          labels[i - w] !== bestLabel || labels[i + w] !== bestLabel) {
        boundary.push({ x, y });
      }
    }
  }
  return boundary.length >= 20 ? boundary : null;
}

// Convex hull — Andrew's monotone chain
function convexHull(pts: Point[]): Point[] {
  const s = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  if (s.length <= 3) return s;
  const cross = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lo: Point[] = [];
  for (const p of s) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  const up: Point[] = [];
  for (let i = s.length - 1; i >= 0; i--) { const p = s[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  lo.pop(); up.pop();
  return [...lo, ...up];
}

// Find the 4 hull points closest to the extreme corners (TL, TR, BR, BL)
function hullToQuad(hull: Point[]): Quad | null {
  if (hull.length < 4) return null;
  const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
  const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;

  let tl: Point | null = null, tr: Point | null = null, br: Point | null = null, bl: Point | null = null;
  let dTL = -Infinity, dTR = -Infinity, dBR = -Infinity, dBL = -Infinity;

  for (const p of hull) {
    const dx = p.x - cx, dy = p.y - cy;
    // Score each point for each corner position using dot product with corner direction
    const sTL = -dx - dy; if (sTL > dTL) { dTL = sTL; tl = p; }
    const sTR = dx - dy;  if (sTR > dTR) { dTR = sTR; tr = p; }
    const sBR = dx + dy;  if (sBR > dBR) { dBR = sBR; br = p; }
    const sBL = -dx + dy; if (sBL > dBL) { dBL = sBL; bl = p; }
  }

  if (!tl || !tr || !br || !bl) return null;
  // Ensure all 4 points are distinct
  const pts = [tl, tr, br, bl];
  const unique = new Set(pts.map(p => `${p.x},${p.y}`));
  if (unique.size < 4) return null;

  return [tl, tr, br, bl];
}

// Validate quadrilateral: reasonable size + roughly rectangular shape
function isValidQuad(q: Quad, w: number, h: number): boolean {
  const [tl, tr, br, bl] = q;
  // Shoelace area
  const area = 0.5 * Math.abs(
    (tl.x * tr.y - tr.x * tl.y) + (tr.x * br.y - br.x * tr.y) +
    (br.x * bl.y - bl.x * br.y) + (bl.x * tl.y - tl.x * bl.y)
  );
  const imgArea = w * h;
  if (area < imgArea * 0.08 || area > imgArea * 0.92) return false;

  const topW = Math.hypot(tr.x - tl.x, tr.y - tl.y);
  const botW = Math.hypot(br.x - bl.x, br.y - bl.y);
  const leftH = Math.hypot(bl.x - tl.x, bl.y - tl.y);
  const rightH = Math.hypot(br.x - tr.x, br.y - tr.y);
  // Parallel sides shouldn't differ too much
  if (Math.min(topW, botW) / Math.max(topW, botW) < 0.4) return false;
  if (Math.min(leftH, rightH) / Math.max(leftH, rightH) < 0.4) return false;
  // Aspect ratio sanity (receipts can be very tall or wide)
  const avgW = (topW + botW) / 2;
  const avgH = (leftH + rightH) / 2;
  const ratio = avgW / avgH;
  if (ratio < 0.15 || ratio > 5) return false;

  return true;
}

/* ------------------------------------------------------------------ */
/*  Main detection function                                             */
/* ------------------------------------------------------------------ */
function detectDocument(ctx: CanvasRenderingContext2D, w: number, h: number): Quad | null {
  const imgData = ctx.getImageData(0, 0, w, h);
  let gray = getGrayscale(imgData.data, w * h);
  gray = blur(gray, w, h);
  gray = blur(gray, w, h);
  const th = otsu(gray);
  let bin = binaryThreshold(gray, th);
  bin = morphClose(bin, w, h, 3);
  const boundary = largestBlobBoundary(bin, w, h);
  if (!boundary) return null;
  const hull = convexHull(boundary);
  const quad = hullToQuad(hull);
  if (!quad) return null;
  return isValidQuad(quad, w, h) ? quad : null;
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */
export function DocumentScanner({ onCapture, onCancel }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const processCanvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animRef = useRef<number>(0);
  const lastDetectRef = useRef<number>(0);
  const stableCountRef = useRef<number>(0);
  const lastQuadRef = useRef<Quad | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flash, setFlash] = useState(false);
  const [detected, setDetected] = useState(false);
  const [stable, setStable] = useState(false);

  /* ---- Camera ---- */
  const startCamera = useCallback(async (facing: "environment" | "user") => {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
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
    } catch {
      setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      cancelAnimationFrame(animRef.current);
    };
  }, [facingMode, startCamera]);

  /* ---- Detection loop ---- */
  const runDetection = useCallback(() => {
    const video = videoRef.current;
    const pCanvas = processCanvasRef.current;
    const oCanvas = overlayCanvasRef.current;
    if (!video || !pCanvas || !oCanvas || video.readyState < 2) {
      animRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const now = performance.now();
    // Throttle to ~6 fps for detection
    if (now - lastDetectRef.current > 160) {
      lastDetectRef.current = now;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      if (vw === 0 || vh === 0) {
        animRef.current = requestAnimationFrame(runDetection);
        return;
      }

      // Process at low resolution
      const scale = PROCESS_W / vw;
      const pw = PROCESS_W;
      const ph = Math.round(vh * scale);
      pCanvas.width = pw;
      pCanvas.height = ph;
      const pCtx = pCanvas.getContext("2d", { willReadFrequently: true });
      if (pCtx) {
        pCtx.drawImage(video, 0, 0, pw, ph);
        const quad = detectDocument(pCtx, pw, ph);

        // Draw overlay
        const oW = oCanvas.clientWidth;
        const oH = oCanvas.clientHeight;
        if (oCanvas.width !== oW || oCanvas.height !== oH) {
          oCanvas.width = oW;
          oCanvas.height = oH;
        }
        const oCtx = oCanvas.getContext("2d");
        if (oCtx) {
          oCtx.clearRect(0, 0, oW, oH);

          if (quad) {
            // Map processing coords to overlay coords
            // Video is displayed with object-cover, so we need to compute the mapping
            const videoAspect = vw / vh;
            const canvasAspect = oW / oH;
            let drawW: number, drawH: number, offsetX: number, offsetY: number;
            if (videoAspect > canvasAspect) {
              // Video wider than canvas → crop sides
              drawH = oH;
              drawW = oH * videoAspect;
              offsetX = (oW - drawW) / 2;
              offsetY = 0;
            } else {
              // Video taller than canvas → crop top/bottom
              drawW = oW;
              drawH = oW / videoAspect;
              offsetX = 0;
              offsetY = (oH - drawH) / 2;
            }

            const sx = drawW / pw;
            const sy = drawH / ph;

            const mapped: Point[] = quad.map((p) => ({
              x: offsetX + p.x * sx,
              y: offsetY + p.y * sy,
            }));

            // Check stability: are points close to last frame?
            const prevQ = lastQuadRef.current;
            if (prevQ) {
              const prevMapped = prevQ.map((p) => ({ x: offsetX + p.x * sx, y: offsetY + p.y * sy }));
              const maxDrift = prevMapped.reduce((max, pp, i) => {
                const d = Math.hypot(pp.x - mapped[i].x, pp.y - mapped[i].y);
                return Math.max(max, d);
              }, 0);
              if (maxDrift < oW * 0.03) {
                stableCountRef.current++;
              } else {
                stableCountRef.current = 0;
              }
            }
            lastQuadRef.current = quad;

            const isStable = stableCountRef.current >= 8; // ~1.3s of stability
            setDetected(true);
            setStable(isStable);

            // Draw detected quad
            oCtx.beginPath();
            oCtx.moveTo(mapped[0].x, mapped[0].y);
            for (let i = 1; i < 4; i++) oCtx.lineTo(mapped[i].x, mapped[i].y);
            oCtx.closePath();

            // Fill with semi-transparent color
            oCtx.fillStyle = isStable ? "rgba(34,197,94,0.08)" : "rgba(108,92,231,0.06)";
            oCtx.fill();

            // Draw border
            oCtx.strokeStyle = isStable ? "#22c55e" : "#6C5CE7";
            oCtx.lineWidth = 3;
            oCtx.setLineDash(isStable ? [] : [8, 6]);
            oCtx.stroke();
            oCtx.setLineDash([]);

            // Draw corner dots
            const cornerRadius = isStable ? 8 : 6;
            for (const p of mapped) {
              oCtx.beginPath();
              oCtx.arc(p.x, p.y, cornerRadius, 0, Math.PI * 2);
              oCtx.fillStyle = isStable ? "#22c55e" : "#6C5CE7";
              oCtx.fill();
              oCtx.strokeStyle = "white";
              oCtx.lineWidth = 2;
              oCtx.stroke();
            }
          } else {
            setDetected(false);
            setStable(false);
            stableCountRef.current = 0;
            lastQuadRef.current = null;
          }
        }
      }
    }

    animRef.current = requestAnimationFrame(runDetection);
  }, []);

  useEffect(() => {
    if (ready) {
      animRef.current = requestAnimationFrame(runDetection);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [ready, runDetection]);

  /* ---- Actions ---- */
  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const handleCapture = useCallback(() => {
    const video = videoRef.current;
    const canvas = captureCanvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `scan_${Date.now()}.jpg`, { type: "image/jpeg" });
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        cancelAnimationFrame(animRef.current);
        onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }, [onCapture]);

  const handleCancel = () => {
    cancelAnimationFrame(animRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onCancel();
  };

  /* ---- Render ---- */
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
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Detection overlay canvas — matches video display area */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none"
        />

        {/* Loading */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
            <div className="text-center space-y-3">
              <Camera className="h-10 w-10 text-gray-400 mx-auto" />
              <p className="text-white text-sm">{error}</p>
              <button onClick={handleCancel} className="rounded-xl bg-white/20 text-white px-4 py-2 text-sm">
                Retour
              </button>
            </div>
          </div>
        )}

        {/* Guide overlay (fades out when detected) */}
        {ready && !detected && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 bg-black/30" />
            <div
              className="absolute left-[8%] right-[8%] top-[15%] bottom-[25%] bg-transparent"
              style={{ boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)", borderRadius: 16 }}
            />
            <FrameCorners />
          </div>
        )}

        {/* Status badge */}
        {ready && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center pointer-events-none">
            {stable ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-pulse">
                <Check className="h-3.5 w-3.5" />
                Ticket détecté — Prenez la photo !
              </span>
            ) : detected ? (
              <span className="inline-flex items-center gap-1.5 bg-[#6C5CE7]/80 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                Détection en cours…
              </span>
            ) : (
              <span className="bg-black/60 text-white text-xs px-4 py-2 rounded-full backdrop-blur-sm">
                Placez le ticket devant la caméra
              </span>
            )}
          </div>
        )}

        {/* Flash effect */}
        {flash && (
          <div className="absolute inset-0 bg-white animate-pulse pointer-events-none" />
        )}

        {/* Hidden canvases */}
        <canvas ref={captureCanvasRef} className="hidden" />
        <canvas ref={processCanvasRef} className="hidden" />
      </div>

      {/* Capture button */}
      {ready && (
        <div className="relative z-10 flex items-center justify-center py-6 bg-gradient-to-t from-black/70 to-transparent">
          <button
            onClick={handleCapture}
            className={`rounded-full border-4 flex items-center justify-center active:scale-95 transition-all ${
              stable ? "border-emerald-400 shadow-[0_0_20px_rgba(34,197,94,0.5)]" : "border-white"
            }`}
            style={{ width: 72, height: 72 }}
          >
            <div
              className={`rounded-full transition-colors ${stable ? "bg-emerald-400" : "bg-white"}`}
              style={{ width: 56, height: 56 }}
            />
          </button>
        </div>
      )}
    </div>
  );
}

/* Corner frame indicators (shown when no document detected) */
function FrameCorners() {
  const s = "absolute w-6 h-6 border-white/60";
  return (
    <>
      <div className={s} style={{ left: "8%", top: "15%", borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 16 }} />
      <div className={s} style={{ right: "8%", top: "15%", borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 16 }} />
      <div className={s} style={{ left: "8%", bottom: "25%", borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 16 }} />
      <div className={s} style={{ right: "8%", bottom: "25%", borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 16 }} />
    </>
  );
}
