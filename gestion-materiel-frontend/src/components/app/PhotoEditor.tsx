"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCw, Crop, Check, X, ZoomIn, ZoomOut, Move } from "lucide-react";

interface PhotoEditorProps {
  file: File;
  onConfirm: (editedFile: File) => void;
  onCancel: () => void;
}

/**
 * Simple photo editor: rotate 90° + crop with drag handles.
 * Works on mobile (touch) and desktop (mouse).
 */
export function PhotoEditor({ file, onConfirm, onCancel }: PhotoEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270

  // Crop state (in % of displayed image)
  const [cropping, setCropping] = useState(false);
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, w: 80, h: 80 }); // percentages
  const [dragging, setDragging] = useState<string | null>(null); // "move" | "tl" | "tr" | "bl" | "br" | null
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, box: { x: 10, y: 10, w: 80, h: 80 } });

  // Load image
  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = URL.createObjectURL(file);
    return () => URL.revokeObjectURL(image.src);
  }, [file]);

  // Draw rotated image on canvas
  const drawCanvas = useCallback(() => {
    if (!img || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d")!;

    const isRotated = rotation === 90 || rotation === 270;
    const cw = isRotated ? img.height : img.width;
    const ch = isRotated ? img.width : img.height;
    canvas.width = cw;
    canvas.height = ch;

    ctx.clearRect(0, 0, cw, ch);
    ctx.save();
    ctx.translate(cw / 2, ch / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  }, [img, rotation]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // Rotate 90° clockwise
  const rotate90 = () => {
    setRotation((r) => (r + 90) % 360);
    // Reset crop
    setCropBox({ x: 10, y: 10, w: 80, h: 80 });
  };

  // Get pointer position relative to container (%, 0-100)
  const getPointerPos = (e: React.TouchEvent | React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { px: 0, py: 0 };
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      px: ((clientX - rect.left) / rect.width) * 100,
      py: ((clientY - rect.top) / rect.height) * 100,
    };
  };

  // Drag start
  const handlePointerDown = (e: React.TouchEvent | React.MouseEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();
    const { px, py } = getPointerPos(e);
    setDragging(handle);
    setDragStart({ x: px, y: py, box: { ...cropBox } });
  };

  // Drag move
  const handlePointerMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging) return;
    e.preventDefault();
    const { px, py } = getPointerPos(e);
    const dx = px - dragStart.x;
    const dy = py - dragStart.y;
    const b = dragStart.box;
    const MIN = 15; // min crop size %

    if (dragging === "move") {
      const nx = Math.max(0, Math.min(100 - b.w, b.x + dx));
      const ny = Math.max(0, Math.min(100 - b.h, b.y + dy));
      setCropBox({ ...b, x: nx, y: ny });
    } else if (dragging === "br") {
      setCropBox({ ...b, w: Math.max(MIN, Math.min(100 - b.x, b.w + dx)), h: Math.max(MIN, Math.min(100 - b.y, b.h + dy)) });
    } else if (dragging === "bl") {
      const nw = Math.max(MIN, b.w - dx);
      const nx = b.x + b.w - nw;
      if (nx >= 0) setCropBox({ ...b, x: nx, w: nw, h: Math.max(MIN, Math.min(100 - b.y, b.h + dy)) });
    } else if (dragging === "tr") {
      const nh = Math.max(MIN, b.h - dy);
      const ny = b.y + b.h - nh;
      if (ny >= 0) setCropBox({ ...b, y: ny, w: Math.max(MIN, Math.min(100 - b.x, b.w + dx)), h: nh });
    } else if (dragging === "tl") {
      const nw = Math.max(MIN, b.w - dx);
      const nh = Math.max(MIN, b.h - dy);
      const nx = b.x + b.w - nw;
      const ny = b.y + b.h - nh;
      if (nx >= 0 && ny >= 0) setCropBox({ x: nx, y: ny, w: nw, h: nh });
    }
  };

  const handlePointerUp = () => setDragging(null);

  // Confirm: apply crop & rotation → produce File
  const handleConfirm = () => {
    if (!canvasRef.current || !img) return;

    // Source canvas (full rotated image)
    const srcCanvas = canvasRef.current;

    // If cropping, apply crop
    const outCanvas = document.createElement("canvas");
    const outCtx = outCanvas.getContext("2d")!;

    if (cropping) {
      const sx = (cropBox.x / 100) * srcCanvas.width;
      const sy = (cropBox.y / 100) * srcCanvas.height;
      const sw = (cropBox.w / 100) * srcCanvas.width;
      const sh = (cropBox.h / 100) * srcCanvas.height;
      outCanvas.width = sw;
      outCanvas.height = sh;
      outCtx.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
    } else {
      outCanvas.width = srcCanvas.width;
      outCanvas.height = srcCanvas.height;
      outCtx.drawImage(srcCanvas, 0, 0);
    }

    outCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const editedFile = new File([blob], file.name || "receipt.jpg", { type: "image/jpeg" });
        onConfirm(editedFile);
      },
      "image/jpeg",
      0.9,
    );
  };

  if (!img) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border p-8 flex items-center justify-center">
        <div className="animate-spin h-6 w-6 border-2 border-[#6C5CE7] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 text-sm">Ajuster la photo</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Image container with crop overlay */}
      <div
        ref={containerRef}
        className="relative w-full bg-gray-100 rounded-xl overflow-hidden select-none touch-none"
        style={{ maxHeight: "50vh" }}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ maxHeight: "50vh", objectFit: "contain" }}
        />

        {/* Crop overlay */}
        {cropping && (
          <>
            {/* Dark overlay outside crop */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top */}
              <div className="absolute bg-black/50" style={{ top: 0, left: 0, right: 0, height: `${cropBox.y}%` }} />
              {/* Bottom */}
              <div className="absolute bg-black/50" style={{ bottom: 0, left: 0, right: 0, height: `${100 - cropBox.y - cropBox.h}%` }} />
              {/* Left */}
              <div className="absolute bg-black/50" style={{ top: `${cropBox.y}%`, left: 0, width: `${cropBox.x}%`, height: `${cropBox.h}%` }} />
              {/* Right */}
              <div className="absolute bg-black/50" style={{ top: `${cropBox.y}%`, right: 0, width: `${100 - cropBox.x - cropBox.w}%`, height: `${cropBox.h}%` }} />
            </div>

            {/* Crop border */}
            <div
              className="absolute border-2 border-white shadow-lg cursor-move"
              style={{ left: `${cropBox.x}%`, top: `${cropBox.y}%`, width: `${cropBox.w}%`, height: `${cropBox.h}%` }}
              onMouseDown={(e) => handlePointerDown(e, "move")}
              onTouchStart={(e) => handlePointerDown(e, "move")}
            >
              {/* Grid lines */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/40" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/40" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/40" />
              </div>

              {/* Corner handles */}
              {[
                { pos: "tl", style: "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nw-resize" },
                { pos: "tr", style: "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-ne-resize" },
                { pos: "bl", style: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-sw-resize" },
                { pos: "br", style: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-se-resize" },
              ].map(({ pos, style }) => (
                <div
                  key={pos}
                  className={`absolute w-6 h-6 bg-white rounded-full border-2 border-[#6C5CE7] shadow-md ${style}`}
                  onMouseDown={(e) => handlePointerDown(e, pos)}
                  onTouchStart={(e) => handlePointerDown(e, pos)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={rotate90}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-medium text-gray-700 transition-colors"
          >
            <RotateCw className="h-4 w-4" />
            Pivoter
          </button>
          <button
            onClick={() => {
              setCropping(!cropping);
              if (!cropping) setCropBox({ x: 10, y: 10, w: 80, h: 80 });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              cropping
                ? "bg-[#6C5CE7]/10 text-[#6C5CE7] border border-[#6C5CE7]/30"
                : "bg-gray-100 hover:bg-gray-200 text-gray-700"
            }`}
          >
            <Crop className="h-4 w-4" />
            Recadrer
          </button>
        </div>

        <button
          onClick={handleConfirm}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white text-sm font-semibold transition-colors"
        >
          <Check className="h-4 w-4" />
          OK
        </button>
      </div>
    </div>
  );
}
