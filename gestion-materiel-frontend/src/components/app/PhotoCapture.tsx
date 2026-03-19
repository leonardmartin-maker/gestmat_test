"use client";

import { useRef, useState, useCallback } from "react";
import { Camera, X, ImagePlus } from "lucide-react";

type Props = {
  label: string;
  maxPhotos?: number;
  required?: boolean;
  onChange: (files: File[]) => void;
};

export function PhotoCapture({ label, maxPhotos = 5, required = false, onChange }: Props) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles = Array.from(fileList);
      setPreviews((prev) => {
        const combined = [...prev];
        for (const file of newFiles) {
          if (combined.length >= maxPhotos) break;
          combined.push({ file, url: URL.createObjectURL(file) });
        }
        onChange(combined.map((p) => p.file));
        return combined;
      });
      // Reset input so same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    },
    [maxPhotos, onChange],
  );

  const removePhoto = useCallback(
    (index: number) => {
      setPreviews((prev) => {
        const updated = [...prev];
        URL.revokeObjectURL(updated[index].url);
        updated.splice(index, 1);
        onChange(updated.map((p) => p.file));
        return updated;
      });
    },
    [onChange],
  );

  const canAdd = previews.length < maxPhotos;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          {label} {required && "*"}
        </label>
        <span className="text-xs text-gray-400">
          {previews.length}/{maxPhotos}
        </span>
      </div>

      {/* Thumbnails grid */}
      <div className="flex flex-wrap gap-2">
        {previews.map((p, i) => (
          <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 group">
            <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(i)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ opacity: 1 }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {/* Add button */}
        {canAdd && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#6C5CE7] hover:bg-[#6C5CE7]/5 flex flex-col items-center justify-center gap-1 transition-colors"
          >
            {previews.length === 0 ? (
              <Camera className="h-5 w-5 text-gray-400" />
            ) : (
              <ImagePlus className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-[10px] text-gray-400">
              {previews.length === 0 ? "Photo" : "Ajouter"}
            </span>
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
